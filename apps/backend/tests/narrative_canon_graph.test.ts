import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createNarrativeRuntimeRouter} from '../src/routers/narrative_runtime.ts';
import {buildNarrativeCanonGraph} from '../src/services/narrative_canon_graph.ts';

const owner: AuthUser = {id: 'canon-graph-owner', username: 'canon_graph_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'canon-graph-outsider', username: 'canon_graph_outsider', role: 'teacher'};
const projectId = 'canon-graph-project';
const workbenchId = 'canon-graph-workbench';
let server: Server;
let base: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb().exec(`
    DELETE FROM narrative_events WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_nodes WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_characters WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_reader_states WHERE workbench_id = '${workbenchId}';
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
     VALUES (?, 'Canon Graph', 'active', 'private', ?, ?, ?)`,
  ).run(projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES (?, ?, 'owner', ?)`,
  ).run(projectId, owner.id, now);
  getDb().prepare(
    `INSERT INTO story_workbenches
       (id, owner_id, project_id, project_scope, title, source_ref, intake_mode,
        source_truth_state, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'project', 'Canon Graph', 'test://canon-graph',
       'draft_workbench', 'USER_PROVIDED', 'workshop_ready', ?, ?, ?)`,
  ).run(workbenchId, owner.id, projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO story_nodes
       (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order,
        spoiler_level, status, metadata_json, created_at, updated_at)
     VALUES
       ('canon-node-setup', ?, NULL, ?, 'scene', 'Le départ', 'Le héros reçoit un indice.',
        1, 'none', 'active', ?, ?, ?),
       ('canon-node-payoff', ?, NULL, ?, 'beat', 'La révélation', 'L’indice révèle le traître.',
        2, 'critical', 'locked', ?, ?, ?)`,
  ).run(
    workbenchId,
    owner.id,
    JSON.stringify({character_ids: ['canon-character'], visual_manifest_ids: ['visual-setup']}),
    now + 10,
    now + 10,
    workbenchId,
    owner.id,
    JSON.stringify({truth_state: 'CANON_LOCKED', confidence: 'canon', character_ids: ['canon-character']}),
    now + 20,
    now + 20,
  );
  getDb().prepare(
    `INSERT INTO story_characters
       (id, workbench_id, owner_id, name, aliases_json, role, archetype, status,
        design_notes, behavior_notes, metadata_json, created_at, updated_at)
     VALUES ('canon-character', ?, ?, 'Surglob', '[]', 'Gardien de l’indice',
       'guardian', 'active', NULL, 'Protège la révélation.', ?, ?, ?)`,
  ).run(workbenchId, owner.id, JSON.stringify({goal: 'Protéger l’indice jusqu’au bon moment.'}), now + 30, now + 30);
  getDb().prepare(
    `INSERT INTO narrative_events
       (id, workbench_id, node_id, owner_id, event_type, title, description,
        payload_json, occurred_at, created_at)
     VALUES ('canon-event-reveal', ?, 'canon-node-payoff', ?, 'reveal',
       'Révélation du traître', 'Le traître est révélé.',
       ?, ?, ?)`,
  ).run(workbenchId, owner.id, JSON.stringify({character_ids: ['canon-character']}), now + 40, now + 40);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createNarrativeRuntimeRouter());
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

describe('Narrative Canon Graph', () => {
  it('sépare faits canons, présentation et setup/payoff', () => {
    const graph = buildNarrativeCanonGraph(owner, {workbench_id: workbenchId, presentation_mode: 'full_spoilers'});
    expect(graph.facts.map((fact) => fact.source_kind)).toEqual(
      expect.arrayContaining(['story_node', 'narrative_event', 'story_character']),
    );
    expect(graph.presentation.hidden_spoiler_refs).toHaveLength(0);
    expect(graph.setup_payoffs[0]).toMatchObject({status: 'payoff_ready'});
    expect(graph.presentation.media_refs).toContain('visual_manifest:visual-setup');
  });

  it('cache les spoilers critiques en mode reader sans supprimer les faits', () => {
    const graph = buildNarrativeCanonGraph(owner, {workbench_id: workbenchId, presentation_mode: 'reader'});
    expect(graph.facts.some((fact) => fact.fact_id === 'fact:story_node:canon-node-payoff')).toBe(true);
    expect(graph.presentation.hidden_spoiler_refs).toContain('fact:story_node:canon-node-payoff');
    expect(graph.presentation.visible_fact_refs).not.toContain('fact:story_node:canon-node-payoff');
    expect(graph.diagnostics.spoiler_leaks).toHaveLength(0);
  });

  it('projette la connaissance et les objectifs personnage', () => {
    const graph = buildNarrativeCanonGraph(owner, {workbench_id: workbenchId});
    expect(graph.character_knowledge).toEqual(expect.arrayContaining([
      expect.objectContaining({
        character_ref: 'story_character:canon-character',
        fact_ref: 'fact:story_character:canon-character',
        knowledge_state: 'knows',
      }),
    ]));
    expect(graph.character_goals[0]?.summary).toBe('Protéger l’indice jusqu’au bon moment.');
  });

  it('refuse un extérieur au projet privé', () => {
    expect(() => buildNarrativeCanonGraph(outsider, {workbench_id: workbenchId})).toThrow(
      'workbench_not_found',
    );
  });

  it('expose le graph via HTTP pour un professeur autorisé', async () => {
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(
      `${base}/narrative/workbench/${workbenchId}/canon-graph?presentation_mode=reader`,
      {headers},
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      workbench_id: workbenchId,
      presentation: {
        mode: 'reader',
      },
    });
  });
});
