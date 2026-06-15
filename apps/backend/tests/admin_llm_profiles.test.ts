import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import type {TaskModelProfile} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createAdminRouter} from '../src/routers/admin.ts';

/**
 * Panneau admin LLM — lecture des profils de routage.
 *
 * Invariants :
 *  - surface privée admin/godmode, jamais student/teacher ;
 *  - lecture seule : expose les profils validés sans secret ni config provider live ;
 *  - les profils seedés restent inspectables pour relier tâche × rôle × modèle.
 */

let server: Server;
let base: string;
let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES ('llm-admin', 'llm_admin', 'LLM Admin', 'x', 'admin', 1, ?, ?)`,
  ).run(now, now);
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES ('llm-student', 'llm_student', 'LLM Student', 'x', 'student', 1, ?, ?)`,
  ).run(now, now);

  adminToken = signToken({id: 'llm-admin', username: 'llm_admin', role: 'admin'});
  studentToken = signToken({id: 'llm-student', username: 'llm_student', role: 'student'});

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createAdminRouter());

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

const auth = (token: string) => ({headers: {Authorization: `Bearer ${token}`}});

describe('admin/llm/task-model-profiles', () => {
  it('refuse sans token et refuse student', async () => {
    expect((await fetch(`${base}/admin/llm/task-model-profiles`)).status).toBe(401);
    expect((await fetch(`${base}/admin/llm/task-model-profiles`, auth(studentToken))).status).toBe(403);
  });

  it('admin lit les profils seedés sans secret provider', async () => {
    const res = await fetch(`${base}/admin/llm/task-model-profiles`, auth(adminToken));
    expect(res.status).toBe(200);
    const profiles = (await res.json()) as Array<TaskModelProfile & Record<string, unknown>>;

    expect(profiles.length).toBeGreaterThanOrEqual(8);
    const chat = profiles.find((profile) => profile.task === 'chat');
    expect(chat?.status).toBe('validated');
    expect(chat?.allowed_providers).toContain('openrouter');
    expect(chat?.role_models?.teacher).toBeDefined();
    expect(profiles.find((profile) => profile.task === 'image_generation')?.model).toContain('image');

    for (const profile of profiles) {
      expect(profile.api_key).toBeUndefined();
      expect(profile.base_url).toBeUndefined();
    }
  });
});
