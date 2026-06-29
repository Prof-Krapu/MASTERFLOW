import {createServer, type Server} from 'node:http';

import {
  PedagogicalAssistanceDecisionSchema,
} from '@masterflow/shared';
import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createPedagogicalAssistanceRouter} from '../src/routers/pedagogical_assistance.ts';

let server: Server;
let base = '';
let studentToken = '';
let teacherToken = '';

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(
    'integrity-student',
    'integrity-student',
    'Integrity Student',
    'student',
    now,
    now,
  );
  insert.run(
    'integrity-teacher',
    'integrity-teacher',
    'Integrity Teacher',
    'teacher',
    now,
    now,
  );
  studentToken = signToken({
    id: 'integrity-student',
    username: 'integrity-student',
    role: 'student',
  });
  teacherToken = signToken({
    id: 'integrity-teacher',
    username: 'integrity-teacher',
    role: 'teacher',
  });

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPedagogicalAssistanceRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('integrity_test_server');
  base = `http://127.0.0.1:${address.port}/api/v1/pedagogical-assistance/classify`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
});

describe('API assistance pédagogique', () => {
  it('exige une authentification et un body valide', async () => {
    expect((await fetch(base, {method: 'POST'})).status).toBe(401);
    expect((await fetch(base, {
      method: 'POST',
      headers: headers(studentToken),
      body: JSON.stringify({active_mode: 'unknown'}),
    })).status).toBe(400);
  });

  it('dérive le rôle depuis le token et ignore toute tentative de surclassement', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: headers(studentToken),
      body: JSON.stringify({
        role: 'godmode',
        active_mode: 'learn',
        request_type: 'frame_subject',
      }),
    });
    expect(response.status).toBe(200);
    const decision = PedagogicalAssistanceDecisionSchema.parse(await response.json());
    expect(decision.assistance_kind).toBe('guide');
    expect(decision.validation_required).toBe(false);
    expect(decision.permissions_unchanged).toBe(true);
  });

  it('rend une correction professeur candidate et non publiable', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: headers(teacherToken),
      body: JSON.stringify({
        active_mode: 'teaching',
        request_type: 'correct_or_evaluate',
      }),
    });
    expect(response.status).toBe(200);
    const decision = PedagogicalAssistanceDecisionSchema.parse(await response.json());
    expect(decision).toMatchObject({
      assistance_kind: 'candidate_output',
      validation_required: true,
      final_publication_allowed: false,
      automatic_sanction: false,
    });
  });

  it('surface une tentative répétée comme état suspicious sans sanction ni permission', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: headers(studentToken),
      body: JSON.stringify({
        active_mode: 'learn',
        request_type: 'attempt_circumvention',
        circumvention_count: 3,
      }),
    });
    expect(response.status).toBe(200);
    const decision = PedagogicalAssistanceDecisionSchema.parse(await response.json());
    expect(decision).toMatchObject({
      assistance_kind: 'blocked_integrity',
      safety_state_hint: 'suspicious',
      permissions_unchanged: true,
      automatic_sanction: false,
      final_publication_allowed: false,
    });
    expect(decision.allowed_help).toEqual(expect.arrayContaining([
      'explain_method',
      'ask_guiding_questions',
    ]));
    expect(decision.forbidden_outputs).toContain('ready_to_submit_deliverable');
  });
});
