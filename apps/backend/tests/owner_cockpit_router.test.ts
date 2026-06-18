import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {OwnerCockpitStatusSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';

let server: Server;
let base: string;
let adminToken: string;
let teacherToken: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run('cockpit-admin', 'cockpit-admin', 'Cockpit Admin', 'admin', now, now);
  insert.run('cockpit-teacher', 'cockpit-teacher', 'Cockpit Teacher', 'teacher', now, now);
  adminToken = signToken({id: 'cockpit-admin', username: 'cockpit-admin', role: 'admin'});
  teacherToken = signToken({id: 'cockpit-teacher', username: 'cockpit-teacher', role: 'teacher'});

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

const auth = (token: string) => ({headers: {Authorization: `Bearer ${token}`}});

describe('D12 Owner Cockpit read-only', () => {
  it('reste privé admin/godmode', async () => {
    expect((await fetch(`${base}/diagnostics/owner-cockpit`)).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/owner-cockpit`, auth(teacherToken))).status).toBe(403);
  });

  it('retourne des décisions agrégées sans prétendre vérifier GitHub ou le Drive', async () => {
    const response = await fetch(`${base}/diagnostics/owner-cockpit`, auth(adminToken));
    expect(response.status).toBe(200);
    const body = OwnerCockpitStatusSchema.parse(await response.json());

    expect(body.runtime_truth.source).toBe('runtime_database');
    expect(body.runtime_truth.canon_sync).toBe('manual_check_required');
    expect(body.next_safe_action.forbidden_followups.length).toBeGreaterThan(0);
    expect(body.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({id: 'process_activation', status: 'partial'}),
      expect.objectContaining({id: 'd08_generation', status: 'locked'}),
    ]));
    expect(JSON.stringify(body)).not.toContain('password');
    expect(JSON.stringify(body)).not.toContain('api_key');
  });
});
