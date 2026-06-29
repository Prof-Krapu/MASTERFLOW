import {createServer, type Server} from 'node:http';

import {PersonalLearningProfileSchema} from '@masterflow/shared';
import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createLearningMirrorRouter} from '../src/routers/learning_mirror.ts';
import {upsertProfile} from '../src/services/learning_mirror_engine.ts';

const teacher: AuthUser = {
  id: 'learning-access-teacher',
  username: 'learning_access_teacher',
  role: 'teacher',
};
const student: AuthUser = {
  id: 'learning-access-student',
  username: 'learning_access_student',
  role: 'student',
};
const outsider: AuthUser = {
  id: 'learning-access-outsider',
  username: 'learning_access_outsider',
  role: 'student',
};
let server: Server;
let base = '';
let teacherToken = '';
let studentToken = '';
let outsiderToken = '';

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
  for (const actor of [teacher, student, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  upsertProfile(teacher, {
    user_id: student.id,
    help_style: 'guided',
    help_format: 'example',
    guidance_mode: 'structured',
  });
  teacherToken = signToken(teacher);
  studentToken = signToken(student);
  outsiderToken = signToken(outsider);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createLearningMirrorRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('learning_access_test_server');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
});

describe('Learning Mirror — accès progressif', () => {
  it('autorise un étudiant à lire son propre profil', async () => {
    const response = await fetch(`${base}/learning-mirror/profiles/${student.id}`, {
      headers: headers(studentToken),
    });
    expect(response.status).toBe(200);
    expect(PersonalLearningProfileSchema.parse(await response.json())).toMatchObject({
      user_id: student.id,
      guidance_mode: 'structured',
    });
  });

  it('masque le profil à un autre étudiant', async () => {
    const response = await fetch(`${base}/learning-mirror/profiles/${student.id}`, {
      headers: headers(outsiderToken),
    });
    expect(response.status).toBe(404);
  });

  it('conserve les écritures sous rôle teacher', async () => {
    const body = JSON.stringify({user_id: student.id, guidance_mode: 'challenge'});
    expect((await fetch(`${base}/learning-mirror/profiles`, {
      method: 'POST',
      headers: headers(studentToken),
      body,
    })).status).toBe(403);
    expect((await fetch(`${base}/learning-mirror/profiles`, {
      method: 'POST',
      headers: headers(teacherToken),
      body,
    })).status).toBe(201);
  });
});
