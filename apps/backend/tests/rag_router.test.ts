import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createRagRouter} from '../src/routers/rag.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const teacher: AuthUser = {id: 'rag-router-teacher', username: 'rag_router_teacher', role: 'teacher'};
const student: AuthUser = {id: 'rag-router-student', username: 'rag_router_student', role: 'student'};
const admin: AuthUser = {id: 'rag-router-admin', username: 'rag_router_admin', role: 'admin'};

let server: Server;
let base: string;
let teacherToken: string;
let studentToken: string;
let adminToken: string;
let projectId: string;
let ragResourceId: string;
let packId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(teacher, {name: 'Projet RAG Router PR-7'});
  projectId = project.project_id;
  addProjectMember(teacher, projectId, {user_id: student.id, role: 'participant'});
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO resources
         (id, type, title, url, source, status, subjects_json, created_at)
       VALUES ('resource-rag-router', 'document', 'Source RAG Router',
               'storage://verified/router.md', 'rag-router', 'validated', '[]', ?)`,
    )
    .run(now);

  teacherToken = signToken(teacher);
  studentToken = signToken(student);
  adminToken = signToken(admin);
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createRagRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function auth(token: string): {Authorization: string} {
  return {Authorization: `Bearer ${token}`};
}

describe('PR-7 — routes RAG permissionne', () => {
  it('exige une authentification', async () => {
    expect((await fetch(`${base}/rag/resources`)).status).toBe(401);
  });

  it('refuse ingestion student et accepte teacher+', async () => {
    const payload = {
      resource_id: 'resource-rag-router',
      project_id: projectId,
      source_type: 'markdown',
      source_uri: 'storage://verified/router.md',
      chunks: ['Le RAG Router construit un context pack cite.'],
    };
    const refused = await fetch(`${base}/rag/resources`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    expect(refused.status).toBe(403);

    const created = await fetch(`${base}/rag/resources`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify(payload),
    });
    expect(created.status).toBe(201);
    const resource = (await created.json()) as {rag_resource_id: string; status: string};
    ragResourceId = resource.rag_resource_id;
    expect(resource.status).toBe('validated');
  });

  it('retourne un context pack cite et relisible seulement par son user/admin', async () => {
    const query = await fetch(`${base}/rag/query`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({query: 'context pack cite', project_id: projectId}),
    });
    expect(query.status).toBe(200);
    const payload = (await query.json()) as {
      context_pack: {pack_id: string; citations: Array<{resource_id: string}>};
      refusal_reason: string | null;
    };
    packId = payload.context_pack.pack_id;
    expect(payload.refusal_reason).toBeNull();
    expect(payload.context_pack.citations).toContainEqual(
      expect.objectContaining({resource_id: ragResourceId}),
    );

    const ownerRead = await fetch(`${base}/rag/context-packs/${packId}`, {
      headers: auth(studentToken),
    });
    expect(ownerRead.status).toBe(200);
    const adminRead = await fetch(`${base}/rag/context-packs/${packId}`, {
      headers: auth(adminToken),
    });
    expect(adminRead.status).toBe(200);
    const hidden = await fetch(`${base}/rag/context-packs/${packId}`, {
      headers: auth(teacherToken),
    });
    expect(hidden.status).toBe(404);
  });

  it('reserve revoke a admin/godmode et rend le pack stale', async () => {
    const refused = await fetch(`${base}/rag/resources/${ragResourceId}/revoke`, {
      method: 'POST',
      headers: auth(teacherToken),
    });
    expect(refused.status).toBe(403);

    const revoked = await fetch(`${base}/rag/resources/${ragResourceId}/revoke`, {
      method: 'POST',
      headers: auth(adminToken),
    });
    expect(revoked.status).toBe(200);
    expect(await revoked.json()).toMatchObject({rag_resource_id: ragResourceId, status: 'revoked'});

    const stalePack = await fetch(`${base}/rag/context-packs/${packId}`, {
      headers: auth(studentToken),
    });
    expect(await stalePack.json()).toMatchObject({pack_id: packId, status: 'stale'});
  });

  it('reserve la synchronisation RAG coordination aux admin/godmode', async () => {
    const refused = await fetch(`${base}/rag/coordination/sync`, {
      method: 'POST',
      headers: auth(studentToken),
    });
    expect(refused.status).toBe(403);

    const synced = await fetch(`${base}/rag/coordination/sync`, {
      method: 'POST',
      headers: auth(adminToken),
    });
    expect(synced.status).toBe(200);
    const payload = (await synced.json()) as {results: Array<{title: string; scope_type: string}>};
    expect(payload.results).toContainEqual(
      expect.objectContaining({title: 'SUIVI MasterFlow', scope_type: 'owner'}),
    );
  });
});
