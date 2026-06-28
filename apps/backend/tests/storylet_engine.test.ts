import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {evaluateStorylets} from '../src/services/storylet_engine.ts';
import {recordWorkflowEvent} from '../src/services/workflow_observability.ts';

const owner: AuthUser = {id: 'storylet-owner', username: 'storylet_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'storylet-outsider', username: 'storylet_outsider', role: 'teacher'};
const projectId = 'storylet-project';
const workbenchId = 'storylet-workbench';
let server: Server;
let base: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb().exec(`
    DELETE FROM workflow_events WHERE id = 'storylet-workflow-blocked';
    DELETE FROM memory_cards WHERE id = 'storylet-memory';
    DELETE FROM narrative_events WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_nodes WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_workbenches WHERE id = '${workbenchId}';
    DELETE FROM project_members WHERE project_id = '${projectId}';
    DELETE FROM projects WHERE id = '${projectId}';
  `);
  const insertUser = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(owner.id, owner.username, owner.username, owner.role, now, now);
  insertUser.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
  getDb().prepare(
    `INSERT INTO projects (id, name, status, visibility, owner_id, created_at, updated_at)
     VALUES (?, 'Storylets', 'active', 'private', ?, ?, ?)`,
  ).run(projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES (?, ?, 'owner', ?)`,
  ).run(projectId, owner.id, now);
  getDb().prepare(
    `INSERT INTO memory_cards
       (id, type, owner_id, project_id, scope, source_ref, extracted_signal,
        distilled_value, confidence, privacy, affects_json, status, compression_level,
        invalidation_rule, next_action, validated_by, created_at, updated_at)
     VALUES ('storylet-memory', 'opportunity', ?, ?, 'project', 'test://storylet-memory',
       'Un précédent similaire existe.',
       'Comparer avant de proposer un nouveau plan.',
       'high', 'private', '["pedagogy"]', 'active', 'L3',
       'Réviser si le contexte change.', 'Comparer les précédents.', ?, ?, ?)`,
  ).run(owner.id, projectId, owner.id, now + 10, now + 10);
  getDb().prepare(
    `INSERT INTO story_workbenches
       (id, owner_id, project_id, project_scope, title, source_ref, intake_mode,
        source_truth_state, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'project', 'Storylet Workbench', 'test://storylet',
       'draft_workbench', 'USER_PROVIDED', 'workshop_ready', ?, ?, ?)`,
  ).run(workbenchId, owner.id, projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO story_nodes
       (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order,
        spoiler_level, status, metadata_json, created_at, updated_at)
     VALUES
       ('storylet-setup', ?, NULL, ?, 'scene', 'Setup', 'Un indice est posé.',
        1, 'none', 'active', '{}', ?, ?),
       ('storylet-payoff', ?, NULL, ?, 'beat', 'Payoff', 'L’indice révèle le vrai problème.',
        2, 'major', 'locked', '{}', ?, ?)`,
  ).run(workbenchId, owner.id, now + 20, now + 20, workbenchId, owner.id, now + 30, now + 30);
  recordWorkflowEvent({
    event_id: 'storylet-workflow-blocked',
    workflow_id: 'storylet-flow',
    event_type: 'workflow_blocked',
    workflow_type: 'storylet_test',
    capability_id: 'storylet_engine',
    owner_id: owner.id,
    project_id: projectId,
    room_id: null,
    duration_ms: 1,
    cost_eur: null,
    tokens: null,
    status: 'blocked',
    blocker_category: 'validation_required',
    created_at: now + 40,
  });

  const app = express();
  app.use('/api/v1', createExperienceFabricRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('Storylet Engine', () => {
  it('évalue des storylets sans exécution automatique', () => {
    const result = evaluateStorylets(owner, {project_id: projectId, workbench_id: workbenchId});
    expect(result.execution_policy).toBe('suggest_only');
    expect(result.instances.map((item) => item.definition.domain)).toEqual(
      expect.arrayContaining(['narrative', 'precedent', 'notification']),
    );
    expect(result.validation_required_count).toBe(result.instances.length);
    expect(result.blocked_count).toBeGreaterThan(0);
  });

  it('filtre par domaine demandé', () => {
    const result = evaluateStorylets(owner, {
      project_id: projectId,
      workbench_id: workbenchId,
      domains: ['precedent'],
    });
    expect(result.instances).toHaveLength(1);
    expect(result.instances[0]?.definition.domain).toBe('precedent');
  });

  it('protège le scope projet privé', () => {
    expect(() => evaluateStorylets(outsider, {project_id: projectId, workbench_id: workbenchId})).toThrow(
      'workbench_not_found',
    );
  });

  it('expose l’évaluation via HTTP', async () => {
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(
      `${base}/experience/storylets?project_id=${projectId}&workbench_id=${workbenchId}`,
      {headers},
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({execution_policy: 'suggest_only'});
  });
});
