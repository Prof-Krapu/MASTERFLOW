import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createFeedbackTicketsRouter} from '../src/routers/feedback_tickets.ts';
import {
  createFeedbackTicket,
  deleteFeedbackTicket,
  listAllFeedbackTickets,
  listMyFeedbackTickets,
  resolveFeedbackTicket,
} from '../src/services/feedback_tickets.ts';

const student: AuthUser = {id: 'fbt-student', username: 'fbt_student', role: 'student'};
const teacher: AuthUser = {id: 'fbt-teacher', username: 'fbt_teacher', role: 'teacher'};
const admin: AuthUser = {id: 'fbt-admin', username: 'fbt_admin', role: 'admin'};

let server: Server;
let base = '';
let studentToken = '';
let adminToken = '';

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

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{status: number; json: any}> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : {'content-type': 'application/json'}),
    },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  return {status: res.status, json: (await res.json()) as any};
}

beforeAll(async () => {
  await seedAll();
  insertUser(student);
  insertUser(teacher);
  insertUser(admin);
  studentToken = signToken(student);
  adminToken = signToken(admin);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createFeedbackTicketsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

describe('Tickets feedback (portage API_manage)', () => {
  it('un utilisateur crée un ticket et ne voit que les siens', async () => {
    const created = await api('POST', '/feedback-tickets', studentToken, {
      kind: 'bug',
      message: 'Le bouton corriger reste bloqué.',
    });
    expect(created.status).toBe(201);
    expect(created.json.status).toBe('open');
    expect(created.json.username).toBe('fbt_student');

    const mine = await api('GET', '/feedback-tickets', studentToken);
    expect(mine.json.some((t: any) => t.id === created.json.id)).toBe(true);

    // Un autre utilisateur (le prof) ne voit pas le ticket de l'étudiant.
    createFeedbackTicket(teacher, {kind: 'autre', message: 'ticket prof'});
    const teacherList = listMyFeedbackTickets(teacher);
    expect(teacherList.some((t) => t.id === created.json.id)).toBe(false);
  });

  it('la liste complète est refusée à un non-admin et ouverte à un admin', async () => {
    const denied = await api('GET', '/admin/feedback-tickets', studentToken);
    expect(denied.status).toBe(403);

    const allowed = await api('GET', '/admin/feedback-tickets', adminToken);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.json)).toBe(true);
    expect(allowed.json.length).toBeGreaterThanOrEqual(2);
  });

  it('seul un admin résout un ticket ; double résolution refusée', async () => {
    const ticket = createFeedbackTicket(student, {kind: 'retour', message: 'Idée de amélioration'});
    const id = ticket.id;

    const denied = await api('POST', `/admin/feedback-tickets/${id}/resolve`, studentToken, {note: 'x'});
    expect(denied.status).toBe(403);

    const resolved = await api('POST', `/admin/feedback-tickets/${id}/resolve`, adminToken, {
      note: 'pris en compte',
    });
    expect(resolved.status).toBe(200);
    expect(resolved.json.status).toBe('resolved');
    expect(resolved.json.resolution_note).toBe('pris en compte');
    expect(resolved.json.resolved_at).not.toBeNull();

    const again = await api('POST', `/admin/feedback-tickets/${id}/resolve`, adminToken, {});
    expect(again.status).toBe(409);
  });

  it("l'auteur peut supprimer son ticket ouvert, pas un résolu ni celui d'un autre", () => {
    const open = createFeedbackTicket(student, {kind: 'bug', message: 'à supprimer'});
    deleteFeedbackTicket(student, open.id);

    const resolved = createFeedbackTicket(student, {kind: 'bug', message: 'résolu puis tentative'});
    resolveFeedbackTicket(admin, resolved.id, {});
    expect(() => deleteFeedbackTicket(student, resolved.id)).toThrow('permission_denied');

    const other = createFeedbackTicket(teacher, {kind: 'bug', message: 'pas le mien'});
    expect(() => deleteFeedbackTicket(student, other.id)).toThrow('permission_denied');

    // L'admin supprime n'importe lequel.
    deleteFeedbackTicket(admin, resolved.id);
    deleteFeedbackTicket(admin, other.id);
    expect(listAllFeedbackTickets(admin).some((t) => t.id === other.id)).toBe(false);
  });
});
