import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createGuidedRuntimeRouter} from '../src/routers/guided_runtime.ts';

const teacher: AuthUser = {id: 'guided-router-teacher', username: 'guided_router_teacher', role: 'teacher'};
const student: AuthUser = {id: 'guided-router-student', username: 'guided_router_student', role: 'student'};

let server: Server;
let base: string;
let teacherToken: string;
let studentToken: string;
let guideId: string;
let sessionId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  teacherToken = signToken(teacher);
  studentToken = signToken(student);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createGuidedRuntimeRouter());
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

function guideBody() {
  return JSON.stringify({
    name: 'Guide router PR-6',
    purpose: 'Atelier CDC prive router.',
    domain: 'cdc',
    target_schema_id: 'cdc-template-candidate-v1',
    question_flow: [
      {question_id: 'q-context', prompt: 'Contexte ?', target_field: 'context', kind: 'text', required: true},
      {question_id: 'q-objectives', prompt: 'Objectifs ?', target_field: 'objectives', kind: 'multi_choice', required: true, options: ['cadrer']},
      {question_id: 'q-audience', prompt: 'Audience ?', target_field: 'audience', kind: 'text', required: true},
      {question_id: 'q-deliverables', prompt: 'Livrables ?', target_field: 'deliverables', kind: 'multi_choice', required: true, options: ['cdc']},
    ],
    completion_rules: {complete_when_required_fields_done: true},
  });
}

async function postAnswer(questionId: string, value: unknown): Promise<Response> {
  return fetch(`${base}/guided-sessions/${sessionId}/answers`, {
    method: 'POST',
    headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
    body: JSON.stringify({question_id: questionId, value}),
  });
}

describe('PR-6 — routes Guided Runtime prive', () => {
  it('exige une authentification', async () => {
    expect((await fetch(`${base}/guides`)).status).toBe(401);
  });

  it('refuse la creation guide student et accepte teacher+', async () => {
    const refused = await fetch(`${base}/guides`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: guideBody(),
    });
    expect(refused.status).toBe(403);

    const created = await fetch(`${base}/guides`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: guideBody(),
    });
    expect(created.status).toBe(201);
    const payload = (await created.json()) as {guide_id: string; status: string};
    guideId = payload.guide_id;
    expect(payload.status).toBe('draft');
  });

  it('cree une session privee et refuse les reponses non participantes', async () => {
    const created = await fetch(`${base}/guided-sessions`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({guide_id: guideId, preview: true, consent: {accepted: true}}),
    });
    expect(created.status).toBe(201);
    const payload = (await created.json()) as {session_id: string; guide_version: number; access_mode: string};
    sessionId = payload.session_id;
    expect(payload.access_mode).toBe('private');
    expect(payload.guide_version).toBe(1);

    const refused = await fetch(`${base}/guided-sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({question_id: 'q-context', value: 'hors session'}),
    });
    expect(refused.status).toBe(404);

    const joined = await fetch(`${base}/guided-sessions/${sessionId}/participants`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({
        user_id: student.id,
        role: 'participant',
        consent: {accepted: true},
      }),
    });
    expect(joined.status).toBe(201);
    const accepted = await fetch(`${base}/guided-sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({question_id: 'q-context', value: 'atelier'}),
    });
    expect(accepted.status).toBe(201);
  });

  it('avance et complete sans effet externe', async () => {
    expect((await postAnswer('q-context', 'atelier')).status).toBe(201);
    expect((await postAnswer('q-objectives', ['cadrer'])).status).toBe(201);
    expect((await postAnswer('q-audience', 'classe')).status).toBe(201);
    expect((await postAnswer('q-deliverables', ['cdc'])).status).toBe(201);

    const advanced = await fetch(`${base}/guided-sessions/${sessionId}/advance`, {
      method: 'POST',
      headers: auth(teacherToken),
    });
    expect(advanced.status).toBe(200);
    expect(await advanced.json()).toMatchObject({current_question_id: null});

    const completed = await fetch(`${base}/guided-sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: auth(teacherToken),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({status: 'completed', current_question_id: null});
  });
});
