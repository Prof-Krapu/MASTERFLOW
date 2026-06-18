import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {createAction, getAction, preflightAction} from '../src/engines/action_engine.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createProjectsRouter} from '../src/routers/projects.ts';
import {createValidationInboxRouter} from '../src/routers/validation_inbox.ts';
import {
  decideValidationInboxItem,
  listValidationInboxItems,
} from '../src/services/validation_inbox.ts';

const teacher: AuthUser = {id: 'validation-inbox-teacher', username: 'validation_inbox_teacher', role: 'teacher'};
const student: AuthUser = {id: 'validation-inbox-student', username: 'validation_inbox_student', role: 'student'};

let server: Server;
let base = '';
let teacherToken = '';
let studentToken = '';

function insertUser(user: AuthUser): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(user.id, user.username, user.username, user.role, now, now);
}

function createPendingAction(): string {
  const created = createAction(teacher, {
    registry_id: 'approve_validation_item',
    intent: 'approve',
    object_type: 'validation_item',
    payload: {source: 'validation_inbox_test'},
  });
  const flighted = preflightAction(teacher, created.id);
  expect(flighted.status).toBe('pending_validation');
  return flighted.id;
}

beforeAll(async () => {
  await seedAll();
  insertUser(teacher);
  insertUser(student);
  teacherToken = signToken(teacher);
  studentToken = signToken(student);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createValidationInboxRouter());
  app.use('/api/v1', createProjectsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

describe('Validation Inbox MVP — projection action-based', () => {
  it('projette une action pending_validation en item reviewable canon', () => {
    const actionId = createPendingAction();
    const items = listValidationInboxItems(teacher);
    const item = items.find((entry) => entry.source_id === actionId);

    expect(item).toBeTruthy();
    expect(item?.source_kind).toBe('action');
    expect(item?.current_status).toBe('needs_review');
    expect(item?.risk_level).toBe('high');
    expect(item?.blocked_actions).toContain('execute_action');
    expect(item?.decision_options).toEqual(['approve', 'reject']);
  });

  it('décide via la Validation Inbox sans contourner validateAction', () => {
    const actionId = createPendingAction();
    const item = listValidationInboxItems(teacher).find((entry) => entry.source_id === actionId);
    if (!item) throw new Error('item de test introuvable');

    const decided = decideValidationInboxItem(teacher, item.item_id, {
      decision: 'approve',
      note: 'OK test',
    });

    expect(decided.current_status).toBe('approved');
    expect(decided.decision?.value).toBe('approve');
    expect(decided.decision?.decided_by).toBe(teacher.id);
    expect(getAction(actionId)?.status).toBe('approved');
  });

  it('refuse les décisions non supportées pour une action dans cette première tranche', () => {
    const actionId = createPendingAction();
    const item = listValidationInboxItems(teacher).find((entry) => entry.source_id === actionId);
    if (!item) throw new Error('item de test introuvable');

    expect(() => decideValidationInboxItem(teacher, item.item_id, {decision: 'park'})).toThrow(
      'validation_inbox_decision_not_supported_for_action',
    );
  });

  it('expose /validation-inbox sans bloquer les routeurs suivants montés à la racine', async () => {
    createPendingAction();
    const inbox = await fetch(`${base}/validation-inbox`, {
      headers: {Authorization: `Bearer ${teacherToken}`},
    });
    expect(inbox.status).toBe(200);

    const project = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}`},
      body: JSON.stringify({name: 'Projet après validation inbox'}),
    });
    expect(project.status).toBe(201);
  });

  it('refuse la surface partagée aux comptes student', async () => {
    const response = await fetch(`${base}/validation-inbox`, {
      headers: {Authorization: `Bearer ${studentToken}`},
    });

    expect(response.status).toBe(403);
  });
});
