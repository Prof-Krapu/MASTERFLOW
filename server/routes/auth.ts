import {Router} from 'express';
import rateLimit from 'express-rate-limit';

import {consumeInvite, findActiveUserByUsername, findUserById, hashPassword, verifyPassword} from '../auth.ts';
import {getDb} from '../db.ts';
import {currentUser} from '../session.ts';
import {isCorrectorSlug} from '@/lib/apps.ts';
import {uuid} from '@/lib/utils.ts';

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,40}$/;
const PASSWORD_MIN = 8;
const DISPLAY_NAME_MAX = 60;

/**
 * Nettoie un nom d'affichage libre (prénom, pseudo) : caractères de contrôle retirés,
 * espaces compactés, longueur bornée. Contrairement à `username`, on n'impose aucune
 * restriction sur les caractères — accents, espaces et traits d'union sont légitimes
 * dans un prénom. Renvoie null si rien d'exploitable : l'appelant retombe sur username.
 */
function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length === 0) return null;
  return cleaned.slice(0, DISPLAY_NAME_MAX);
}

/** Routes auth complètes : register (avec invite), login (rate-limité), logout, me. */
export function createAuthRouter(): Router {
  const router = Router();

  // GET /me — qui suis-je ? L'app assignée et le nom affiché sont relus en DB (pas en
  // session) pour qu'une correction admin prenne effet immédiatement.
  router.get('/me', (req, res) => {
    const u = currentUser(req);
    if (!u?.userId) {
      res.status(401).json({error: 'unauthenticated'});
      return;
    }
    const row = findUserById(u.userId);
    res.json({
      id: u.userId,
      username: u.username,
      role: u.role,
      assignedApp: row?.assigned_app ?? null,
      displayName: row?.display_name ?? null,
    });
  });

  // POST /register — création de compte avec code d'invitation.
  // Le choix du correcteur (`app`) est obligatoire et DÉFINITIF côté user :
  // seule la route admin PUT /users/:id/app peut le modifier ensuite.
  router.post('/register', async (req, res) => {
    const {username, password, inviteCode, app, displayName} = req.body ?? {};

    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      res.status(400).json({error: 'invalid_username', hint: '3-40 caractères, alphanumériques + ._-'});
      return;
    }
    if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
      res.status(400).json({error: 'invalid_password', hint: `${PASSWORD_MIN} caractères minimum`});
      return;
    }
    if (typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
      res.status(400).json({error: 'invite_required'});
      return;
    }
    if (!isCorrectorSlug(app)) {
      res.status(400).json({error: 'invalid_app', hint: 'choisissez votre matière (correcteur)'});
      return;
    }

    const db = getDb();
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) {
      res.status(409).json({error: 'username_taken'});
      return;
    }

    const invite = consumeInvite(inviteCode.trim());
    if (!invite.ok) {
      res.status(400).json({error: invite.reason});
      return;
    }

    const hash = await hashPassword(password);
    const id = uuid();
    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, username, password_hash, role, active, created_at, assigned_app) VALUES (?, ?, ?, 'user', 1, ?, ?)`,
    ).run(id, username, hash, now, app);

    // Si l'invitation provient d'une demande d'accès approuvée, on rattache l'email
    // du demandeur au compte (utile pour la liste de diffusion et le suivi bêta) ainsi
    // que son « Nom et prénom » : il a déjà été saisi une fois, inutile de le redemander.
    const accessReq = db
      .prepare(`SELECT email, name FROM access_requests WHERE invite_code = ? AND status = 'approved'`)
      .get(inviteCode.trim()) as {email: string; name: string | null} | undefined;
    if (accessReq) {
      db.prepare('UPDATE users SET email = ? WHERE id = ?').run(accessReq.email, id);
    }

    // Nom affiché : ce que le user a saisi à l'inscription, sinon celui de sa demande d'accès.
    const finalDisplayName = normalizeDisplayName(displayName) ?? normalizeDisplayName(accessReq?.name);
    if (finalDisplayName) {
      db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(finalDisplayName, id);
    }

    // Connecte immédiatement le nouveau user.
    req.session.userId = id;
    req.session.username = username;
    req.session.role = 'user';
    await req.session.save();

    res.status(201).json({id, username, role: 'user', assignedApp: app, displayName: finalDisplayName});
  });

  // POST /login — rate-limité à 10 tentatives / 5 min / IP pour ralentir le bruteforce.
  const loginLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {error: 'too_many_attempts'},
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const {username, password} = req.body ?? {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({error: 'invalid_input'});
      return;
    }

    const user = findActiveUserByUsername(username);
    // Toujours faire une comparaison bcrypt pour ne pas leaker l'existence du compte par timing.
    const dummyHash = '$2a$12$CwTycUXWue0Thq9StjUM0uJ8yI9G1z2fSDuxC0WJq8ZcQpwhJ8H1u';
    const ok = await verifyPassword(password, user?.password_hash ?? dummyHash);
    if (!user || !ok) {
      res.status(401).json({error: 'invalid_credentials'});
      return;
    }

    getDb().prepare('UPDATE users SET last_login = ? WHERE id = ?').run(Date.now(), user.id);

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    await req.session.save();

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      assignedApp: user.assigned_app,
      displayName: user.display_name ?? null,
    });
  });

  // POST /logout — détruit la session.
  router.post('/logout', async (req, res) => {
    req.session.destroy();
    res.json({ok: true});
  });

  return router;
}
