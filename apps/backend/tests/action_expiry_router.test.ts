import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import type {Action} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createActionsRouter} from '../src/routers/actions.ts';

let server: Server;
let base = '';
let godToken = '';
let studentToken = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run('expiry-god', 'expiry-god', 'Expiry God', 'godmode', now, now);
  insert.run('expiry-student', 'expiry-student', 'Expiry Student', 'student', now, now);
  godToken = signToken({id: 'expiry-god', username: 'expiry-god', role: 'godmode'});
  studentToken = signToken({id: 'expiry-student', username: 'expiry-student', role: 'student'});

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createActionsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const auth = (token: string) => ({Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'});

async function createSensitiveAction(): Promise<Action> {
  const created = await fetch(`${base}/actions`, {
    method: 'POST',
    headers: auth(godToken),
    body: JSON.stringify({
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    }),
  });
  expect(created.status).toBe(201);
  const action = await created.json() as Action;
  const preflight = await fetch(`${base}/actions/${action.id}/preflight`, {method: 'POST', headers: auth(godToken)});
  expect(preflight.status).toBe(200);
  return await preflight.json() as Action;
}

describe('Action expiry router', () => {
  it('refuse le stale aux étudiants', async () => {
    const response = await fetch(`${base}/actions/expire-context`, {
      method: 'POST',
      headers: auth(studentToken),
      body: JSON.stringify({scope: 'mine', reason: 'hard_stop'}),
    });
    expect(response.status).toBe(403);
  });

  it('rend stale les actions sensibles ouvertes sans les exécuter', async () => {
    const action = await createSensitiveAction();
    expect(action.status).toBe('pending_validation');

    const response = await fetch(`${base}/actions/expire-context`, {
      method: 'POST',
      headers: auth(godToken),
      body: JSON.stringify({scope: 'mine', reason: 'hard_stop', note: 'router test'}),
    });
    expect(response.status).toBe(200);
    const body = await response.json() as {expired_action_ids: string[]; audit_trace: string[]};
    expect(body.expired_action_ids).toContain(action.id);
    expect(body.audit_trace).toContain('no_execute');

    const stale = await fetch(`${base}/actions/${action.id}`, {headers: auth(godToken)});
    expect(await stale.json()).toMatchObject({id: action.id, status: 'stale'});
  });
});
