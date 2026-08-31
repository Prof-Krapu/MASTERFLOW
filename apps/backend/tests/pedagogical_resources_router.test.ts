import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createPedagogicalResourcesRouter} from '../src/routers/pedagogical_resources.ts';

const student: AuthUser = {id: 'ped-router-student', username: 'ped_router_student', role: 'student'};
const teacher: AuthUser = {id: 'ped-router-teacher', username: 'ped_router_teacher', role: 'teacher'};
const admin: AuthUser = {id: 'ped-router-admin', username: 'ped_router_admin', role: 'admin'};

let server: Server;
let base: string;
let studentToken: string;
let teacherToken: string;
let adminToken: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO users
      (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, 'x', ?, 1, ?, ?)
  `);
  for (const actor of [student, teacher, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  studentToken = signToken(student);
  teacherToken = signToken(teacher);
  adminToken = signToken(admin);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPedagogicalResourcesRouter());
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

describe('routes Link Engine pedagogique', () => {
  it('reste prive et ne sert que les ressources validees aux etudiants', async () => {
    expect((await fetch(`${base}/academic-frameworks`)).status).toBe(401);
    const response = await fetch(`${base}/pedagogical-resources/search?q=storyboard`, {headers: auth(studentToken)});
    expect(response.status).toBe(200);
    const payload = await response.json() as {results: Array<{status: string}>};
    expect(payload.results.length).toBeGreaterThan(0);
    expect(payload.results.every((item) => item.status === 'validated')).toBe(true);
  });

  it('refuse les candidates aux etudiants et les expose au godmode admin', async () => {
    expect((await fetch(`${base}/pedagogical-resources/search?q=Brainrot&include_candidates=1`, {
      headers: auth(studentToken),
    })).status).toBe(403);
    const allowed = await fetch(`${base}/pedagogical-resources/search?q=Brainrot&include_candidates=1`, {
      headers: auth(adminToken),
    });
    expect(allowed.status).toBe(200);
    expect((await allowed.json() as {results: unknown[]}).results).toHaveLength(1);
  });

  it('permet au professeur de corriger un niveau sans modifier les alias globaux', async () => {
    const search = await fetch(`${base}/pedagogical-resources/search?q=Brainrot&include_candidates=1`, {
      headers: auth(adminToken),
    });
    const resource = (await search.json() as {results: Array<{resource_id: string}>}).results[0]!;
    const response = await fetch(`${base}/pedagogical-resources/${resource.resource_id}/classification`, {
      method: 'PATCH',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({framework_code: 'higher_education_fr', level_code: 'B3', reason: 'Choix enseignant', lock: true}),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({effective_level_code: 'B3', teacher_locked: true});
  });

  it('reserve les alias systeme aux admin/godmode', async () => {
    const body = JSON.stringify({alias: 'niveau terminal creation', reason: 'Vocabulaire etablissement'});
    expect((await fetch(`${base}/academic-frameworks/higher_education_fr/levels/B5/aliases`, {
      method: 'POST', headers: {...auth(teacherToken), 'Content-Type': 'application/json'}, body,
    })).status).toBe(403);
    expect((await fetch(`${base}/academic-frameworks/higher_education_fr/levels/B5/aliases`, {
      method: 'POST', headers: {...auth(adminToken), 'Content-Type': 'application/json'}, body,
    })).status).toBe(201);
  });
});
