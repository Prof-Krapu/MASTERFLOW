import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {UsageLearningCandidateSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';
import {
  listUsageLearningCandidates,
} from '../src/services/usage_harvester.ts';
import {scanForMissedTriggers} from '../src/services/d12_auto_detector.ts';
import {recordWorkflowEvent} from '../src/services/workflow_observability.ts';

let server: Server;
let base = '';
let adminToken = '';
let teacherToken = '';
const adminId = 'd12-ul-admin';
const teacherId = 'd12-ul-teacher';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(adminId, 'd12-ul-admin', 'D12 UL Admin', 'admin', now, now);
  insert.run(teacherId, 'd12-ul-teacher', 'D12 UL Teacher', 'teacher', now, now);
  adminToken = signToken({id: adminId, username: 'd12-ul-admin', role: 'admin'});
  teacherToken = signToken({id: teacherId, username: 'd12-ul-teacher', role: 'teacher'});

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createDiagnosticsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;

  recordWorkflowEvent({
    event_id: 'ul-route-event-1',
    workflow_id: 'ul-wf-1',
    event_type: 'workflow_failed',
    workflow_type: 'test_pipeline',
    capability_id: 'feedback_draft',
    owner_id: adminId,
    project_id: null,
    room_id: null,
    duration_ms: null,
    cost_eur: null,
    tokens: null,
    status: 'failed',
    blocker_category: 'model_error',
    created_at: Date.now() - 50_000,
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const auth = (token: string) => ({Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'});

describe('D12 usage learning candidates routes', () => {
  it('GET /diagnostics/d12/usage-learning reste privé admin/godmode', async () => {
    expect((await fetch(`${base}/diagnostics/d12/usage-learning`)).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/d12/usage-learning`, {
      headers: auth(teacherToken),
    })).status).toBe(403);
  });

  it('liste les candidats d\'apprentissage avec filtre review_status', async () => {
    const response = await fetch(`${base}/diagnostics/d12/usage-learning`, {
      headers: auth(adminToken),
    });
    expect(response.status).toBe(200);
    const items = await response.json() as unknown[];
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const item of items) {
      expect(() => UsageLearningCandidateSchema.parse(item)).not.toThrow();
    }

    const filtered = await fetch(`${base}/diagnostics/d12/usage-learning?review_status=pending`, {
      headers: auth(adminToken),
    });
    expect(filtered.status).toBe(200);
    const filteredItems = await filtered.json() as unknown[];
    expect(filteredItems.length).toBe(items.length);

    const empty = await fetch(`${base}/diagnostics/d12/usage-learning?review_status=approved`, {
      headers: auth(adminToken),
    });
    expect(empty.status).toBe(200);
    expect((await empty.json() as unknown[]).length).toBe(0);
  });

  it('rejette un review_status invalide', async () => {
    const response = await fetch(`${base}/diagnostics/d12/usage-learning?review_status=invalid`, {
      headers: auth(adminToken),
    });
    expect(response.status).toBe(400);
  });

  it('décide un candidat sans créer action ni job', async () => {
    const candidates = listUsageLearningCandidates({reviewStatus: 'pending'});
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const candidate = candidates[0];
    if (!candidate) throw new Error('aucun candidat pending');

    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };

    const decided = await fetch(`${base}/diagnostics/d12/usage-learning/${candidate.candidate_id}/decision`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({decision: 'approve', note: 'Approuvé par test'}),
    });
    expect(decided.status).toBe(200);

    const body = UsageLearningCandidateSchema.parse(await decided.json());
    expect(body).toMatchObject({
      review_status: 'approved',
      status: 'user_confirmed_rule',
      reviewer_id: adminId,
      review_note: 'Approuvé par test',
      canon_status: 'candidate_only',
    });

    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    expect(after).toEqual(before);
  });

  it('POST /diagnostics/d12/usage-learning/:id/decision reste privé admin/godmode', async () => {
    const response = await fetch(`${base}/diagnostics/d12/usage-learning/fake-id/decision`, {
      method: 'POST',
      headers: auth(teacherToken),
      body: JSON.stringify({decision: 'approve'}),
    });
    expect(response.status).toBe(403);
  });

  it('renvoie 404 pour un candidat inexistant', async () => {
    const response = await fetch(`${base}/diagnostics/d12/usage-learning/nonexistent-id/decision`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({decision: 'approve'}),
    });
    expect(response.status).toBe(404);
  });

  it('POST /diagnostics/d12/scan déclenche la détection sans créer action/job', async () => {
    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };

    const response = await fetch(`${base}/diagnostics/d12/scan`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({window_minutes: 5}),
    });
    expect(response.status).toBe(200);
    const result = await response.json() as {scanned_events: number; findings_created: number; finding_ids: string[]};
    expect(result).toMatchObject({
      scanned_events: expect.any(Number),
      findings_created: expect.any(Number),
      finding_ids: expect.any(Array),
    });

    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    expect(after).toEqual(before);
  });

  it('POST /diagnostics/d12/scan reste privé admin/godmode', async () => {
    expect((await fetch(`${base}/diagnostics/d12/scan`, {method: 'POST'})).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/d12/scan`, {
      method: 'POST',
      headers: auth(teacherToken),
    })).status).toBe(403);
  });
});
