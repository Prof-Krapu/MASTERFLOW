import {Router} from 'express';
import rateLimit from 'express-rate-limit';

import {requireAdmin} from '../auth.ts';
import {getDb, type AccessRequestRow, type MailingListRow} from '../db.ts';
import {currentUser} from '../session.ts';
import {generateCode} from './invites.ts';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

/** Tronque une chaîne libre pour éviter qu'un message géant ne gonfle la DB. */
function clampStr(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Route publique (anonyme) de demande d'accès bêta, monté sur /api/v1/access-requests.
 *
 * Anti-abus : rate-limit 5/15min/IP, honeypot `website`, clamps de taille.
 * Anti-énumération : la réponse est toujours {ok:true} (dupliqué ou pas) ; seule
 * une adresse mal formée renvoie 400.
 */
export function createAccessRequestsRouter(): Router {
  const router = Router();

  const requestLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {error: 'too_many_requests'},
  });

  // POST / — body {email, name?, message?, mailingOptIn?, website?}
  router.post('/', requestLimiter, (req, res) => {
    const b = req.body ?? {};

    // Honeypot : un humain ne voit pas ce champ ; s'il est rempli, on piège le bot
    // en répondant succès sans rien enregistrer.
    if (typeof b.website === 'string' && b.website.trim().length > 0) {
      res.json({ok: true});
      return;
    }

    const email = String(b.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      res.status(400).json({error: 'invalid_email'});
      return;
    }

    const name = clampStr(b.name, 120);
    const message = clampStr(b.message, 2000);
    const mailingOptIn = b.mailingOptIn === true;
    const now = Date.now();

    const db = getDb();
    db.transaction(() => {
      // Dédup applicatif : une demande encore en attente ou déjà approuvée pour cet
      // email n'est pas re-créée (mais une demande refusée peut être re-soumise).
      const existing = db
        .prepare(`SELECT 1 FROM access_requests WHERE email = ? AND status IN ('pending', 'approved')`)
        .get(email);
      if (!existing) {
        db.prepare(
          `INSERT INTO access_requests (email, name, message, status, mailing_opt_in, read, created_at)
           VALUES (?, ?, ?, 'pending', ?, 0, ?)`,
        ).run(email, name, message, mailingOptIn ? 1 : 0, now);
      }
      if (mailingOptIn) {
        db.prepare(
          `INSERT INTO mailing_list (email, subscribed_at, source, active) VALUES (?, ?, 'access_request', 1)
           ON CONFLICT(email) DO UPDATE SET active = 1`,
        ).run(email, now);
      }
    })();

    res.json({ok: true});
  });

  return router;
}

/**
 * Routes admin des demandes d'accès + liste de diffusion.
 * Monté sur /api/v1/admin (comme admin-feedback).
 *
 *  - GET    /access-requests?status=&unread=1 : liste filtrable.
 *  - GET    /access-requests/count            : demandes en attente non-lues (badge).
 *  - PATCH  /access-requests/:id              : maj read.
 *  - POST   /access-requests/:id/approve      : génère l'invitation (idempotent).
 *  - POST   /access-requests/:id/reject       : refuse la demande.
 *  - DELETE /access-requests/:id              : suppression (RGPD).
 *  - GET/POST /mailing-list, PATCH/DELETE /mailing-list/:email : gestion des abonnés.
 */
export function createAdminAccessRequestsRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get('/access-requests', (req, res) => {
    const where: string[] = [];
    const params: (string | number)[] = [];

    const status = String(req.query.status ?? '');
    if (ALLOWED_STATUSES.has(status)) {
      where.push('status = ?');
      params.push(status);
    }
    if (String(req.query.unread ?? '') === '1') {
      where.push('read = 0');
    }

    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = getDb()
      .prepare<(string | number)[], AccessRequestRow>(
        `SELECT * FROM access_requests ${clause} ORDER BY created_at DESC LIMIT 500`,
      )
      .all(...params);

    res.json({requests: rows});
  });

  router.get('/access-requests/count', (_req, res) => {
    const row = getDb()
      .prepare<[], {unread: number}>(
        `SELECT COUNT(*) AS unread FROM access_requests WHERE read = 0 AND status = 'pending'`,
      )
      .get();
    res.json({unread: row?.unread ?? 0});
  });

  router.patch('/access-requests/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    if (typeof req.body?.read !== 'boolean') {
      res.status(400).json({error: 'nothing_to_update'});
      return;
    }
    const result = getDb()
      .prepare('UPDATE access_requests SET read = ? WHERE id = ?')
      .run(req.body.read ? 1 : 0, id);
    res.json({ok: true, updated: result.changes});
  });

  // Approve : génère une invitation et la rattache à la demande. Idempotent — si un
  // code est déjà rattaché (re-clic), on le renvoie sans en créer un second.
  router.post('/access-requests/:id/approve', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }

    const db = getDb();
    const request = db
      .prepare<[number], AccessRequestRow>('SELECT * FROM access_requests WHERE id = ?')
      .get(id);
    if (!request) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    if (request.invite_code) {
      res.json({ok: true, inviteCode: request.invite_code});
      return;
    }

    const maxUses = Math.max(1, Math.min(100, Number(req.body?.maxUses) || 1));
    const days = Number(req.body?.expiresInDays ?? 30);
    const expiresAt = Number.isFinite(days) && days > 0 ? Date.now() + days * 86400 * 1000 : null;

    const code = generateCode();
    const u = currentUser(req)!;
    const now = Date.now();
    db.transaction(() => {
      db.prepare(
        `INSERT INTO invites (code, created_by, created_at, expires_at, max_uses, used_count, revoked) VALUES (?, ?, ?, ?, ?, 0, 0)`,
      ).run(code, u.userId!, now, expiresAt, maxUses);
      db.prepare(
        `UPDATE access_requests SET status = 'approved', invite_code = ?, processed_at = ?, read = 1 WHERE id = ?`,
      ).run(code, now, id);
    })();

    res.json({ok: true, inviteCode: code});
  });

  router.post('/access-requests/:id/reject', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    const result = getDb()
      .prepare(`UPDATE access_requests SET status = 'rejected', processed_at = ?, read = 1 WHERE id = ?`)
      .run(Date.now(), id);
    if (result.changes === 0) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true});
  });

  router.delete('/access-requests/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    const result = getDb().prepare('DELETE FROM access_requests WHERE id = ?').run(id);
    res.json({ok: true, deleted: result.changes});
  });

  router.get('/mailing-list', (_req, res) => {
    const rows = getDb()
      .prepare<[], MailingListRow>('SELECT * FROM mailing_list ORDER BY subscribed_at DESC')
      .all();
    res.json({subscribers: rows});
  });

  router.post('/mailing-list', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      res.status(400).json({error: 'invalid_email'});
      return;
    }
    getDb()
      .prepare(
        `INSERT INTO mailing_list (email, subscribed_at, source, active) VALUES (?, ?, 'admin', 1)
         ON CONFLICT(email) DO UPDATE SET active = 1`,
      )
      .run(email, Date.now());
    res.status(201).json({ok: true});
  });

  router.patch('/mailing-list/:email', (req, res) => {
    if (typeof req.body?.active !== 'boolean') {
      res.status(400).json({error: 'nothing_to_update'});
      return;
    }
    const result = getDb()
      .prepare('UPDATE mailing_list SET active = ? WHERE email = ?')
      .run(req.body.active ? 1 : 0, req.params.email);
    if (result.changes === 0) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true});
  });

  router.delete('/mailing-list/:email', (req, res) => {
    const result = getDb().prepare('DELETE FROM mailing_list WHERE email = ?').run(req.params.email);
    res.json({ok: true, deleted: result.changes});
  });

  return router;
}
