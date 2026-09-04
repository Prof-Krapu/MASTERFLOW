import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createServer, type Server} from 'node:http';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createMasterPlanAdapterRouter} from '../src/routers/masterplan_adapter.ts';

const student: AuthUser = {id: 'masterplan-router-student', username: 'masterplan_student', role: 'student'};
const teacher: AuthUser = {id: 'masterplan-router-teacher', username: 'masterplan_teacher', role: 'teacher'};
const sourceRoot = mkdtempSync(join(tmpdir(), 'masterplan-router-'));
const sourcePath = join(sourceRoot, 'masterplan_UI_CURRENT.json');
const previousSource = process.env.MASTERPLAN_UI_BUNDLE_PATH;

let server: Server;
let base: string;
let studentToken: string;
let teacherToken: string;

beforeAll(async () => {
  writeFileSync(sourcePath, JSON.stringify({
    schema: 'masterplan.ui_bundle.v1',
    engine_version: '1.1.3',
    generated_at: '2026-08-31T00:00:00Z',
    school_year: '2026-2027',
    calendars: {
      iscom: {
        events: [{
          id: 'event-1',
          session_id: 'event-1',
          date: '2026-09-01',
          start: '09:00',
          end: '12:00',
          module: 'Atelier',
          school_name: 'ISCOM',
          class_label: 'B2',
          room: 'Studio',
          source_ref: '/private/calendar.json',
        }],
      },
    },
    classes: {classes: []},
    groups: {groups: []},
    students: {students: [{name: 'Private Student'}]},
    course_context: {modules: []},
    notifications: {notifications: []},
  }));
  process.env.MASTERPLAN_UI_BUNDLE_PATH = sourcePath;
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO users
      (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, 'x', ?, 1, ?, ?)
  `);
  for (const actor of [student, teacher]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  studentToken = signToken(student);
  teacherToken = signToken(teacher);

  const app = express();
  app.use('/api/v1', createMasterPlanAdapterRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  if (previousSource === undefined) delete process.env.MASTERPLAN_UI_BUNDLE_PATH;
  else process.env.MASTERPLAN_UI_BUNDLE_PATH = previousSource;
  rmSync(sourceRoot, {recursive: true, force: true});
});

function auth(token: string): {Authorization: string} {
  return {Authorization: `Bearer ${token}`};
}

describe('route planning MasterPlan', () => {
  it('reste privée et réservée aux rôles teacher+', async () => {
    expect((await fetch(`${base}/planning/masterplan`)).status).toBe(401);
    expect((await fetch(`${base}/planning/masterplan`, {headers: auth(studentToken)})).status).toBe(403);
    expect((await fetch(`${base}/planning/masterplan`, {headers: auth(teacherToken)})).status).toBe(200);
  });

  it('ne retourne que la projection calendrier minimale', async () => {
    const response = await fetch(`${base}/planning/masterplan`, {headers: auth(teacherToken)});
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const payload = await response.json() as Record<string, unknown>;
    expect(payload).toMatchObject({schema: 'masterplan.planning_view.v1', school_year: '2026-2027'});
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain('Private Student');
    expect(serialized).not.toContain('/private/calendar.json');
  });
});
