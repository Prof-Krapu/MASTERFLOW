import {Router} from 'express';

import {requireAdmin} from '../auth.ts';
import {getDb, type FeedbackTicketRow} from '../db.ts';

const ALLOWED_APPS = new Set(['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg']);
const ALLOWED_KINDS = new Set(['error', 'feedback']);

interface FeedbackListItem extends FeedbackTicketRow {
  username: string | null;
}

/**
 * Admin-only : boîte de réception des tickets feedback / erreurs.
 * Monté sur /api/v1/admin (comme admin-users / admin-storage).
 *
 *  - GET /feedback?kind=&app=&unread=1 : liste filtrable, jointe au username.
 *  - GET /feedback/count               : nombre de tickets non-lus (badge).
 *  - PATCH /feedback/:id               : maj read / resolved.
 */
export function createAdminFeedbackRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get('/feedback', (req, res) => {
    const where: string[] = [];
    const params: (string | number)[] = [];

    const kind = String(req.query.kind ?? '');
    if (ALLOWED_KINDS.has(kind)) {
      where.push('f.kind = ?');
      params.push(kind);
    }
    const app = String(req.query.app ?? '');
    if (ALLOWED_APPS.has(app)) {
      where.push('f.app = ?');
      params.push(app);
    }
    if (String(req.query.unread ?? '') === '1') {
      where.push('f.read = 0');
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = getDb()
      .prepare<(string | number)[], FeedbackListItem>(
        `SELECT f.*, u.username AS username
           FROM feedback_tickets f
           LEFT JOIN users u ON u.id = f.user_id
           ${clause}
           ORDER BY f.ts DESC
           LIMIT 500`,
      )
      .all(...params);

    res.json({tickets: rows});
  });

  router.get('/feedback/count', (_req, res) => {
    const row = getDb()
      .prepare<[], {unread: number}>('SELECT COUNT(*) AS unread FROM feedback_tickets WHERE read = 0')
      .get();
    res.json({unread: row?.unread ?? 0});
  });

  router.patch('/feedback/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    const sets: string[] = [];
    const params: (string | number)[] = [];
    if (typeof req.body?.read === 'boolean') {
      sets.push('read = ?');
      params.push(req.body.read ? 1 : 0);
    }
    if (typeof req.body?.resolved === 'boolean') {
      sets.push('resolved = ?');
      params.push(req.body.resolved ? 1 : 0);
    }
    if (sets.length === 0) {
      res.status(400).json({error: 'nothing_to_update'});
      return;
    }
    params.push(id);
    const result = getDb()
      .prepare(`UPDATE feedback_tickets SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    res.json({ok: true, updated: result.changes});
  });

  // DELETE /feedback/resolved — purge des tickets marqués résolus.
  // Les filtres kind/app optionnels permettent de restreindre à la vue filtrée active.
  router.delete('/feedback/resolved', (req, res) => {
    const where: string[] = ['resolved = 1'];
    const params: (string | number)[] = [];

    const kind = String(req.query.kind ?? '');
    if (ALLOWED_KINDS.has(kind)) {
      where.push('kind = ?');
      params.push(kind);
    }
    const app = String(req.query.app ?? '');
    if (ALLOWED_APPS.has(app)) {
      where.push('app = ?');
      params.push(app);
    }

    const result = getDb()
      .prepare(`DELETE FROM feedback_tickets WHERE ${where.join(' AND ')}`)
      .run(...params);
    res.json({ok: true, deleted: result.changes});
  });

  // DELETE /feedback/:id — suppression d'un seul ticket.
  router.delete('/feedback/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    const result = getDb().prepare('DELETE FROM feedback_tickets WHERE id = ?').run(id);
    res.json({ok: true, deleted: result.changes});
  });

  return router;
}
