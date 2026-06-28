import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {audit} from '../src/lib/audit.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {
  buildExperienceSnapshot,
  listExperienceEvents,
} from '../src/services/experience_fabric.ts';
import {recordWorkflowEvent} from '../src/services/workflow_observability.ts';

const owner: AuthUser = {id: 'experience-owner', username: 'experience_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'experience-outsider', username: 'experience_outsider', role: 'godmode'};
const projectId = 'experience-project';
let server: Server;
let base: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insertUser = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(owner.id, owner.username, owner.username, owner.role, now, now);
  insertUser.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
  getDb().prepare(
    `INSERT OR IGNORE INTO projects
       (id, name, status, visibility, owner_id, created_at, updated_at)
     VALUES (?, 'Experience', 'active', 'private', ?, ?, ?)`,
  ).run(projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
     VALUES (?, ?, 'owner', ?)`,
  ).run(projectId, owner.id, now);
  getDb().prepare(
    `INSERT OR IGNORE INTO story_workbenches
       (id, owner_id, project_id, project_scope, title, source_ref, intake_mode,
        source_truth_state, status, created_by, created_at, updated_at)
     VALUES ('experience-wb', ?, ?, 'project', 'Experience story', 'test://experience',
       'draft_workbench', 'USER_PROVIDED', 'draft', ?, ?, ?)`,
  ).run(owner.id, projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO narrative_events
       (id, workbench_id, node_id, owner_id, event_type, title, description,
        payload_json, occurred_at, created_at)
     VALUES ('experience-narrative', 'experience-wb', NULL, ?, 'story_beat',
       'Le projet trouve sa direction', NULL, '{}', ?, ?)`,
  ).run(owner.id, now + 20, now + 20);
  getDb().prepare(
    `INSERT INTO user_progression_events
       (id, user_id, project_id, event_type, ref_type, ref_id, detail_json, created_at)
     VALUES ('experience-progress', ?, ?, 'milestone_reached', 'project', ?, '{}', ?)`,
  ).run(owner.id, projectId, projectId, now + 30);
  recordWorkflowEvent({
    event_id: 'experience-workflow',
    workflow_id: 'experience-flow',
    event_type: 'workflow_blocked',
    workflow_type: 'narrative_da',
    capability_id: 'visual_manifest',
    owner_id: owner.id,
    project_id: projectId,
    room_id: null,
    duration_ms: 10,
    cost_eur: null,
    tokens: null,
    status: 'blocked',
    blocker_category: 'missing_reference',
    created_at: now + 10,
  });
  audit({
    event_type: 'experience.audit',
    user_id: owner.id,
    scope: `project:${projectId}`,
    detail: {safe: true},
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

describe('Experience Event Spine', () => {
  it('projette les flux existants sans exposer leurs payloads bruts', () => {
    const events = listExperienceEvents(owner, {project_id: projectId});
    expect(events.map((event) => event.stream_type)).toEqual(
      expect.arrayContaining(['audit', 'workflow', 'narrative', 'progression']),
    );
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event_id: 'experience-workflow',
        outcome: 'blocked',
        source_refs: ['workflow_event:experience-workflow'],
      }),
      expect.objectContaining({
        event_id: 'experience-narrative',
        summary: 'Le projet trouve sa direction',
      }),
    ]));
    expect(JSON.stringify(events)).not.toContain('payload_json');
    expect(JSON.stringify(events)).not.toContain('detail_json');
  });

  it('reconstruit un snapshot déterministe et signale les blocages', () => {
    const first = buildExperienceSnapshot(owner, {project_id: projectId, to: Number.MAX_SAFE_INTEGER});
    const second = buildExperienceSnapshot(owner, {project_id: projectId, to: Number.MAX_SAFE_INTEGER});
    expect(first.fingerprint).toBe(second.fingerprint);
    expect(first.scope).toBe('project');
    expect(first.stream_counts.narrative).toBeGreaterThan(0);
    expect(first.outcome_counts.blocked).toBeGreaterThan(0);
    expect(first.open_blockers).toContain('workflow_event:experience-workflow');
  });

  it('refuse le scope projet à un godmode extérieur', () => {
    expect(() => listExperienceEvents(outsider, {project_id: projectId})).toThrow(
      'project_not_found',
    );
  });

  it('expose timeline et snapshot derrière authentification', async () => {
    const unauthenticated = await fetch(`${base}/experience/events`);
    expect(unauthenticated.status).toBe(401);
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const timeline = await fetch(
      `${base}/experience/events?project_id=${projectId}&streams=narrative,workflow`,
      {headers},
    );
    expect(timeline.status).toBe(200);
    expect((await timeline.json()) as unknown[]).toHaveLength(2);
    const snapshot = await fetch(`${base}/experience/snapshot?project_id=${projectId}`, {headers});
    expect(snapshot.status).toBe(200);
    expect(await snapshot.json()).toMatchObject({scope: 'project', scope_id: projectId});
  });
});
