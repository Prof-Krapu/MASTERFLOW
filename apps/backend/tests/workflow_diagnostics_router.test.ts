import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';
import {recordWorkflowEvent} from '../src/services/workflow_observability.ts';

let server: Server;
let base: string;
let adminToken: string;
let teacherToken: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES ('workflow-router-owner', 'workflow_router_owner',
               'workflow_router_owner', 'x', 'teacher', 1, ?, ?)`,
    )
    .run(now, now);
  const insertActor = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertActor.run(
    'workflow-router-admin',
    'workflow-router-admin',
    'Workflow Router Admin',
    'admin',
    now,
    now,
  );
  insertActor.run(
    'workflow-router-teacher',
    'workflow-router-teacher',
    'Workflow Router Teacher',
    'teacher',
    now,
    now,
  );

  adminToken = signToken({id: 'workflow-router-admin', username: 'workflow-router-admin', role: 'admin'});
  teacherToken = signToken({
    id: 'workflow-router-teacher',
    username: 'workflow-router-teacher',
    role: 'teacher',
  });

  recordWorkflowEvent({
    event_id: 'workflow-router-start',
    workflow_id: 'workflow-router-main',
    event_type: 'workflow_started',
    workflow_type: 'guided_runtime',
    capability_id: 'workflow_router_capability',
    owner_id: 'workflow-router-owner',
    project_id: null,
    room_id: null,
    duration_ms: null,
    cost_eur: null,
    tokens: null,
    status: 'started',
    blocker_category: null,
    created_at: 20_000,
  });
  recordWorkflowEvent({
    event_id: 'workflow-router-completed',
    workflow_id: 'workflow-router-main',
    event_type: 'workflow_completed',
    workflow_type: 'guided_runtime',
    capability_id: 'workflow_router_capability',
    owner_id: 'workflow-router-owner',
    project_id: null,
    room_id: null,
    duration_ms: 300,
    cost_eur: null,
    tokens: null,
    status: 'completed',
    blocker_category: null,
    created_at: 20_300,
  });

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createDiagnosticsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function auth(token: string): {headers: {Authorization: string}} {
  return {headers: {Authorization: `Bearer ${token}`}};
}

describe('PR-9 — diagnostics workflows admin+', () => {
  it('exige admin/godmode', async () => {
    expect((await fetch(`${base}/diagnostics/workflows`)).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/workflows`, auth(teacherToken))).status).toBe(403);
  });

  it('retourne des agrégats filtrés sans contenu brut', async () => {
    const res = await fetch(
      `${base}/diagnostics/workflows?from=19000&to=21000&capability_id=workflow_router_capability`,
      auth(adminToken),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totals: {workflows: number; completed: number; cost_eur: number | null};
      by_capability: Array<{key: string; duration_p50_ms: number | null}>;
    };

    expect(body.totals.workflows).toBe(1);
    expect(body.totals.completed).toBe(1);
    expect(body.totals.cost_eur).toBeNull();
    expect(body.by_capability[0]).toMatchObject({
      key: 'workflow_router_capability',
      duration_p50_ms: 300,
    });
    expect(JSON.stringify(body)).not.toContain('workflow_router_owner');
  });

  it('retourne une trace par workflow et refuse les filtres invalides', async () => {
    const trace = await fetch(`${base}/diagnostics/workflows/workflow-router-main`, auth(adminToken));
    expect(trace.status).toBe(200);
    expect(((await trace.json()) as {events: Array<{event_id: string}>}).events).toHaveLength(2);

    const invalid = await fetch(
      `${base}/diagnostics/workflows?capability_id=DROP TABLE`,
      auth(adminToken),
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({error: 'invalid_workflow_filter'});
  });
});
