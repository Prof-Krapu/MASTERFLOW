import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createPedagogicalSignalsRouter} from '../src/routers/pedagogical_signals.ts';
import {createTeachingRouter} from '../src/routers/teaching.ts';
import {createWeatherRouter} from '../src/routers/weather.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const teacher: AuthUser = {id: 'teaching-router-teacher', username: 'teaching_router_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'teaching-router-outsider', username: 'teaching_router_outsider', role: 'teacher'};
const student: AuthUser = {id: 'teaching-router-student', username: 'teaching_router_student', role: 'student'};
let server: Server;
let base = '';
let projectId = '';
let teacherToken = '';
let outsiderToken = '';
let studentToken = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, outsider, student]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  projectId = createProject(teacher, {name: 'Projet sécurité Teaching'}).project_id;
  addProjectMember(teacher, projectId, {user_id: student.id, role: 'participant'});
  teacherToken = signToken(teacher);
  outsiderToken = signToken(outsider);
  studentToken = signToken(student);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPedagogicalSignalsRouter());
  app.use('/api/v1', createWeatherRouter());
  app.use('/api/v1', createTeachingRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test_server_address_unavailable');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

const auth = (token: string) => ({headers: {Authorization: `Bearer ${token}`}});

describe('permissions HTTP Teaching et météo', () => {
  it('refuse la lecture des signaux d’un projet étranger', async () => {
    expect((await fetch(`${base}/pedagogical-signals?project_scope=${projectId}`, auth(outsiderToken))).status).toBe(403);
  });

  it('autorise le professeur du projet et refuse un étudiant sur la liste globale', async () => {
    expect((await fetch(`${base}/pedagogical-signals?project_scope=${projectId}`, auth(teacherToken))).status).toBe(200);
    expect((await fetch(`${base}/pedagogical-signals?project_scope=${projectId}`, auth(studentToken))).status).toBe(403);
  });

  it('borne la météo individuelle au compte ou au professeur du projet', async () => {
    expect((await fetch(`${base}/weather/${student.id}?project_scope=${projectId}`, auth(studentToken))).status).toBe(200);
    expect((await fetch(`${base}/weather/${student.id}?project_scope=${projectId}`, auth(teacherToken))).status).toBe(200);
    expect((await fetch(`${base}/weather/${student.id}?project_scope=${projectId}`, auth(outsiderToken))).status).toBe(403);
  });

  it('réserve la projection Teaching à teacher+', async () => {
    expect((await fetch(`${base}/teaching/overview`, auth(teacherToken))).status).toBe(200);
    expect((await fetch(`${base}/teaching/overview`, auth(studentToken))).status).toBe(403);
  });
});
