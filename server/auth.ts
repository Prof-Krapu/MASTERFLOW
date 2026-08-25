import bcrypt from 'bcryptjs';
import type {NextFunction, Request, Response} from 'express';

import {getDb, type InviteRow, type UserRow} from './db.ts';
import {currentUser} from './session.ts';

/** Coût bcrypt — 12 reste rapide (~250ms) tout en étant suffisamment lourd pour bruteforce offline. */
const BCRYPT_COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Cherche un user actif par username. Renvoie null si absent ou désactivé. */
export function findActiveUserByUsername(username: string): UserRow | null {
  const db = getDb();
  const row = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE username = ? AND active = 1')
    .get(username);
  return row ?? null;
}

export function findUserById(id: string): UserRow | null {
  const db = getDb();
  const row = db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id);
  return row ?? null;
}

/**
 * Tente de consommer un code d'invitation.
 * Atomique : SELECT FOR UPDATE équivalent via transaction immédiate.
 * Renvoie { ok: true } si consommé, { ok: false, reason } sinon.
 */
export function consumeInvite(code: string): {ok: true} | {ok: false; reason: string} {
  const db = getDb();
  return db.transaction(() => {
    const row = db.prepare<[string], InviteRow>('SELECT * FROM invites WHERE code = ?').get(code);
    if (!row) return {ok: false, reason: 'invite_not_found'};
    if (row.revoked) return {ok: false, reason: 'invite_revoked'};
    if (row.expires_at && row.expires_at < Date.now()) return {ok: false, reason: 'invite_expired'};
    if (row.used_count >= row.max_uses) return {ok: false, reason: 'invite_exhausted'};
    db.prepare('UPDATE invites SET used_count = used_count + 1 WHERE code = ?').run(code);
    return {ok: true} as const;
  })();
}

/** Middleware : exige une session active. 401 sinon. */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  const u = currentUser(req);
  if (!u?.userId) {
    res.status(401).json({error: 'unauthenticated'});
    return;
  }
  next();
}

/** Middleware : exige une session admin. 401 si pas loggé, 403 si pas admin. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const u = currentUser(req);
  if (!u?.userId) {
    res.status(401).json({error: 'unauthenticated'});
    return;
  }
  if (u.role !== 'admin') {
    res.status(403).json({error: 'forbidden'});
    return;
  }
  next();
}
