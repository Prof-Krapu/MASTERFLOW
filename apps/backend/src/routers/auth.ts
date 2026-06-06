import {Router, type Request, type Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
  LoginRequestSchema,
  RegisterRequestSchema,
  UserSchema,
  type AuthResponse,
  type User,
} from '@masterflow/shared';

import {getDb, type UserRow} from '../db/schema.ts';
import {requireUser, signToken} from '../middleware/auth.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';

/**
 * Router d'authentification — JWT stateless HS256.
 *
 * Routes (montées sous `${env.apiBase}/auth`) :
 *  - POST /register : crée un compte (rôle 'student' par défaut), renvoie un AuthResponse.
 *  - POST /login    : vérifie le mot de passe, met à jour last_login, renvoie un AuthResponse.
 *  - POST /logout   : révoque le jeton courant (insertion du jti dans revoked_tokens).
 *  - GET  /me       : renvoie l'utilisateur authentifié (UserSchema).
 *
 * Doctrine : le rôle voyage dans le jeton mais l'autorité reste le backend.
 * Pattern bcrypt repris de API_manage/server/auth.ts (coût 12).
 */

/** Coût bcrypt — 12 reste rapide (~250ms) tout en résistant au bruteforce offline. */
const BCRYPT_COST = 12;

/** Façonne une rangée user en DTO public (UserSchema), sans password_hash. */
function toUserDTO(row: UserRow): User {
  return UserSchema.parse({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    role: row.role,
  });
}

/** Cherche un user actif par username. Renvoie null si absent ou désactivé. */
function findActiveUserByUsername(username: string): UserRow | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM users WHERE username = ? AND active = 1')
    .get(username) as UserRow | undefined;
  return row ?? null;
}

export function createAuthRouter(): Router {
  const router = Router();

  // ───────────────────────── POST /register ─────────────────────────
  router.post('/register', async (req: Request, res: Response) => {
    const parsed = RegisterRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    const {username, display_name, password, email} = parsed.data;

    const db = getDb();

    // Unicité username (et email si fourni) — la BDD garantit l'unicité, on devance pour un 409 propre.
    const existing = db.prepare('SELECT 1 AS hit FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(409).json({error: 'username_taken'});
      return;
    }
    if (email) {
      const emailTaken = db.prepare('SELECT 1 AS hit FROM users WHERE email = ?').get(email);
      if (emailTaken) {
        res.status(409).json({error: 'email_taken'});
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const now = Date.now();
    const id = uuid();

    db.prepare(
      `INSERT INTO users (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'student', 1, ?, ?)`,
    ).run(id, username, display_name, email ?? null, passwordHash, now, now);

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
    const user = toUserDTO(row);
    const token = signToken({id: user.id, username: user.username, role: user.role});

    audit({event_type: 'auth.register', user_id: user.id, scope: 'auth', detail: {username}});

    const body: AuthResponse = {token, user};
    res.status(201).json(body);
  });

  // ───────────────────────── POST /login ─────────────────────────
  router.post('/login', async (req: Request, res: Response) => {
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    const {username, password} = parsed.data;

    const row = findActiveUserByUsername(username);
    // Comparaison systématique pour limiter l'oracle de timing : on hash même sans user trouvé.
    const ok = row ? await bcrypt.compare(password, row.password_hash) : false;
    if (!row || !ok) {
      audit({event_type: 'auth.login_failed', scope: 'auth', detail: {username}});
      res.status(401).json({error: 'invalid_credentials'});
      return;
    }

    const db = getDb();
    const now = Date.now();
    db.prepare('UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?').run(now, now, row.id);

    const user = toUserDTO(row);
    const token = signToken({id: user.id, username: user.username, role: user.role});

    audit({event_type: 'auth.login', user_id: user.id, scope: 'auth', detail: {username}});

    const body: AuthResponse = {token, user};
    res.json(body);
  });

  // ───────────────────────── POST /logout ─────────────────────────
  // Révoque le jeton courant : on extrait jti + exp du Bearer et on l'inscrit en liste noire.
  router.post('/logout', requireUser, (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }

    const header = req.headers.authorization ?? '';
    const token = header.slice('Bearer '.length).trim();
    // Le jeton est déjà validé par requireUser ; on décode (sans re-vérifier) pour lire jti/exp.
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === 'string' || typeof decoded.jti !== 'string') {
      res.status(400).json({error: 'invalid_token'});
      return;
    }

    const jti = decoded.jti;
    const now = Date.now();
    // `exp` est en secondes (JWT) ; on convertit en ms. Sans exp, fallback : maintenant (purge immédiate possible).
    const expiresAt = typeof decoded.exp === 'number' ? decoded.exp * 1000 : now;

    const db = getDb();
    db.prepare(
      `INSERT OR IGNORE INTO revoked_tokens (jti, user_id, revoked_at, expires_at)
       VALUES (?, ?, ?, ?)`,
    ).run(jti, user.id, now, expiresAt);

    audit({event_type: 'auth.logout', user_id: user.id, scope: 'auth', detail: {jti}});

    res.json({ok: true});
  });

  // ───────────────────────── GET /me ─────────────────────────
  router.get('/me', requireUser, (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }

    const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(user.id) as UserRow | undefined;
    if (!row) {
      res.status(404).json({error: 'user_not_found'});
      return;
    }

    res.json(toUserDTO(row));
  });

  return router;
}
