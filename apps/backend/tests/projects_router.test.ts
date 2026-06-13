import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createProjectsRouter} from '../src/routers/projects.ts';

const teacher: AuthUser = {id: 'projects-router-teacher', username: 'projects_router_teacher', role: 'teacher'};
const student: AuthUser = {id: 'projects-router-student', username: 'projects_router_student', role: 'student'};
const outsider: AuthUser = {id: 'projects-router-outsider', username: 'projects_router_outsider', role: 'student'};

let server: Server;
let base: string;
let teacherToken: string;
let studentToken: string;
let outsiderToken: string;
let projectId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  teacherToken = signToken(teacher);
  studentToken = signToken(student);
  outsiderToken = signToken(outsider);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createProjectsRouter());
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

describe('PR-4 — routes Project/Scope', () => {
  it('exige une authentification', async () => {
    expect((await fetch(`${base}/projects`)).status).toBe(401);
  });

  it('refuse la création aux students et accepte un teacher+', async () => {
    const refused = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({name: 'Projet refusé'}),
    });
    expect(refused.status).toBe(403);

    const created = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({name: 'Projet PR-4 Router'}),
    });
    expect(created.status).toBe(201);
    const payload = (await created.json()) as {project_id: string; visibility: string};
    projectId = payload.project_id;
    expect(payload.visibility).toBe('private');
  });

  it('masque le détail aux non-membres puis expose le projet au membre ajouté', async () => {
    const hidden = await fetch(`${base}/projects/${projectId}`, {headers: auth(outsiderToken)});
    expect(hidden.status).toBe(404);
    expect(await hidden.json()).toEqual({error: 'project_not_found'});

    const member = await fetch(`${base}/projects/${projectId}/members`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({user_id: student.id, role: 'participant'}),
    });
    expect(member.status).toBe(201);
    expect(await member.json()).toMatchObject({project_id: projectId, user_id: student.id, role: 'participant'});

    const visible = await fetch(`${base}/projects/${projectId}`, {headers: auth(studentToken)});
    expect(visible.status).toBe(200);
    expect(await visible.json()).toMatchObject({project_id: projectId});
  });

  it('empêche un participant de gérer les membres', async () => {
    const response = await fetch(`${base}/projects/${projectId}/members`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({user_id: outsider.id, role: 'viewer'}),
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({error: 'project_membership_denied'});
  });

  it('liste les projets visibles par utilisateur', async () => {
    const teacherList = await fetch(`${base}/projects`, {headers: auth(teacherToken)});
    expect(teacherList.status).toBe(200);
    expect((await teacherList.json()) as Array<{project_id: string}>).toContainEqual(
      expect.objectContaining({project_id: projectId}),
    );

    const outsiderList = await fetch(`${base}/projects`, {headers: auth(outsiderToken)});
    expect(outsiderList.status).toBe(200);
    expect((await outsiderList.json()) as Array<{project_id: string}>).not.toContainEqual(
      expect.objectContaining({project_id: projectId}),
    );
  });
});
