import {
  CreateFeedbackTicketRequestSchema,
  FeedbackTicketSchema,
  ResolveFeedbackTicketRequestSchema,
  ROLE_RANK,
  type CreateFeedbackTicketRequest,
  type FeedbackTicket,
  type ResolveFeedbackTicketRequest,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

/**
 * Tickets feedback — portage du système d'inbox d'API_manage
 * (server/routes/feedback.ts + admin-feedback.ts), adapté au runtime MasterFlow :
 * gating par rôles (création = tout user, gestion = ≥ admin), UUID, epoch ms.
 *
 * Pas de cycle d'action ici : un ticket est une déclaration libre. La suppression
 * par lot des tickets résolus (API_manage) n'est pas reprise — l'admin supprime
 * individuellement, ce qui laisse une trace plus explicite.
 */

function requireAdmin(a: AuthUser): void {
  if (ROLE_RANK[a.role] < ROLE_RANK.admin) throw new Error('permission_denied');
}

function dto(r: any): FeedbackTicket {
  return FeedbackTicketSchema.parse({
    id: r.id,
    kind: r.kind,
    message: r.message,
    status: r.status,
    resolution_note: r.resolution_note,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
    user_id: r.user_id,
    username: r.username,
    display_name: r.display_name,
  });
}

const SELECT_TICKETS = `
  SELECT t.*, u.username, u.display_name
  FROM feedback_tickets t
  JOIN users u ON u.id = t.user_id
`;

export function createFeedbackTicket(a: AuthUser, input: CreateFeedbackTicketRequest): FeedbackTicket {
  const q = CreateFeedbackTicketRequestSchema.parse(input);
  const db = getDb();
  const now = Date.now();
  const id = uuid();
  db.prepare(
    `INSERT INTO feedback_tickets (id, user_id, kind, message, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
  ).run(id, a.id, q.kind, q.message, now);
  return dto(db.prepare(`${SELECT_TICKETS} WHERE t.id = ?`).get(id));
}

/** Tickets de l'utilisateur courant (sa propre inbox). */
export function listMyFeedbackTickets(a: AuthUser): FeedbackTicket[] {
  return (getDb().prepare(`${SELECT_TICKETS} WHERE t.user_id = ? ORDER BY t.created_at DESC`).all(a.id) as any[]).map(
    dto,
  );
}

/** Tous les tickets — ≥ admin. */
export function listAllFeedbackTickets(a: AuthUser): FeedbackTicket[] {
  requireAdmin(a);
  return (getDb().prepare(`${SELECT_TICKETS} ORDER BY t.created_at DESC`).all() as any[]).map(dto);
}

/** Résolution avec note optionnelle — ≥ admin. */
export function resolveFeedbackTicket(a: AuthUser, id: string, input: ResolveFeedbackTicketRequest): FeedbackTicket {
  requireAdmin(a);
  const q = ResolveFeedbackTicketRequestSchema.parse(input);
  const db = getDb();
  const row = db.prepare('SELECT * FROM feedback_tickets WHERE id = ?').get(id) as any;
  if (!row) throw new Error('feedback_ticket_not_found');
  if (row.status === 'resolved') throw new Error('feedback_ticket_already_resolved');
  db.prepare(`UPDATE feedback_tickets SET status = 'resolved', resolution_note = ?, resolved_at = ? WHERE id = ?`).run(
    q.note ?? null,
    Date.now(),
    id,
  );
  return dto(db.prepare(`${SELECT_TICKETS} WHERE t.id = ?`).get(id));
}

/** Suppression — ≥ admin (ou l'auteur lui-même pour son ticket encore ouvert). */
export function deleteFeedbackTicket(a: AuthUser, id: string): void {
  const db = getDb();
  const row = db.prepare('SELECT * FROM feedback_tickets WHERE id = ?').get(id) as any;
  if (!row) throw new Error('feedback_ticket_not_found');
  if (ROLE_RANK[a.role] < ROLE_RANK.admin && !(row.user_id === a.id && row.status === 'open')) {
    throw new Error('permission_denied');
  }
  db.prepare('DELETE FROM feedback_tickets WHERE id = ?').run(id);
}
