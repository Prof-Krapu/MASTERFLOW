import {Router} from 'express';
import {randomBytes} from 'node:crypto';

import {requireAdmin} from '../auth.ts';
import {getDb, type InviteRow} from '../db.ts';
import {currentUser} from '../session.ts';

/** Routes d'administration des codes d'invitation. Toutes admin-only. */
export function createInvitesRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  // GET / — liste les codes actifs/épuisés non révoqués (récents d'abord).
  router.get('/', (_req, res) => {
    const db = getDb();
    const rows = db
      .prepare<[], InviteRow>('SELECT * FROM invites WHERE revoked = 0 ORDER BY created_at DESC LIMIT 200')
      .all();
    res.json({invites: rows});
  });

  // POST / — génère un nouveau code. Body: { maxUses?: number, expiresInDays?: number }
  router.post('/', (req, res) => {
    const maxUses = Math.max(1, Math.min(100, Number(req.body?.maxUses) || 1));
    const days = Number(req.body?.expiresInDays);
    const expiresAt = Number.isFinite(days) && days > 0 ? Date.now() + days * 86400 * 1000 : null;

    const code = generateCode();
    const u = currentUser(req)!;
    getDb()
      .prepare(
        `INSERT INTO invites (code, created_by, created_at, expires_at, max_uses, used_count, revoked) VALUES (?, ?, ?, ?, ?, 0, 0)`,
      )
      .run(code, u.userId!, Date.now(), expiresAt, maxUses);

    res.status(201).json({code, maxUses, expiresAt});
  });

  // POST /:code/revoke — révoque un code (suppression définitive).
  router.post('/:code/revoke', (req, res) => {
    const r = getDb().prepare('DELETE FROM invites WHERE code = ?').run(req.params.code);
    if (r.changes === 0) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true});
  });

  return router;
}

export function generateCode(): string {
  // 12 chars alphanumériques, basés sur crypto.randomBytes.
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans 0/O/I/1 pour lisibilité
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}
