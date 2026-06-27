import {createServer, type Server} from 'node:http';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {resolveStorageImage} from '../src/lib/storage.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createAssetsRouter} from '../src/routers/assets.ts';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
let server: Server;
let base = '';
let teacherToken = '';
let studentToken = '';
let previousRoot: string | undefined;

beforeAll(async () => {
  previousRoot = process.env.MASTERFLOW_STORAGE_ROOT;
  process.env.MASTERFLOW_STORAGE_ROOT = mkdtempSync(join(tmpdir(), 'mf-assets-router-'));
  await seedAll();
  const now = Date.now();
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run('assets-teacher', 'assets_teacher', 'Assets Teacher', 'teacher', now, now);
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run('assets-student', 'assets_student', 'Assets Student', 'student', now, now);
  teacherToken = signToken({id: 'assets-teacher', username: 'assets_teacher', role: 'teacher'});
  studentToken = signToken({id: 'assets-student', username: 'assets_student', role: 'student'});

  const app = express();
  app.use(express.json({limit: '5mb'}));
  app.use('/api/v1', createAssetsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (previousRoot === undefined) delete process.env.MASTERFLOW_STORAGE_ROOT;
  else process.env.MASTERFLOW_STORAGE_ROOT = previousRoot;
});

const auth = (token: string): Record<string, string> => ({Authorization: `Bearer ${token}`});

describe('assets router', () => {
  it('stocke un upload multipart sur disque puis en BDD', async () => {
    const form = new FormData();
    form.set('asset_type', 'image');
    form.set('file', new Blob([PNG], {type: 'image/png'}), 'reference.png');
    const response = await fetch(`${base}/assets/upload`, {
      method: 'POST',
      headers: auth(teacherToken),
      body: form,
    });
    expect(response.status).toBe(201);
    const asset = await response.json() as {
      id: string;
      storage_ref: string;
      metadata: {original_name: string; sha256: string};
    };
    expect(asset.metadata.original_name).toBe('reference.png');
    expect(asset.metadata.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(resolveStorageImage(asset.storage_ref).bytes).toBe(PNG.length);

    const getResponse = await fetch(`${base}/assets/${asset.id}`, {headers: auth(teacherToken)});
    expect(getResponse.status).toBe(200);
  });

  it('stocke un upload base64 et le retrouve dans la liste owner', async () => {
    const response = await fetch(`${base}/assets/upload-base64`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...auth(teacherToken)},
      body: JSON.stringify({asset_type: 'render', mime: 'image/png', data: PNG.toString('base64')}),
    });
    expect(response.status).toBe(201);
    const asset = await response.json() as {id: string; storage_ref: string};
    expect(resolveStorageImage(asset.storage_ref).mime).toBe('image/png');

    const listResponse = await fetch(`${base}/assets`, {headers: auth(teacherToken)});
    expect(listResponse.status).toBe(200);
    const assets = await listResponse.json() as {id: string}[];
    expect(assets.map((item) => item.id)).toContain(asset.id);
  });

  it('refuse un type, un base64 ou un rôle invalides', async () => {
    const invalidType = await fetch(`${base}/assets/upload-base64`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...auth(teacherToken)},
      body: JSON.stringify({asset_type: 'executable', mime: 'image/png', data: PNG.toString('base64')}),
    });
    expect(invalidType.status).toBe(400);

    const invalidData = await fetch(`${base}/assets/upload-base64`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...auth(teacherToken)},
      body: JSON.stringify({asset_type: 'image', mime: 'image/png', data: '%%%'}),
    });
    expect(invalidData.status).toBe(400);

    const forbidden = await fetch(`${base}/assets`, {headers: auth(studentToken)});
    expect(forbidden.status).toBe(403);
  });
});
