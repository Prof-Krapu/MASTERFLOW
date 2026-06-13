import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createAdminRouter} from '../src/routers/admin.ts';
import {createAuthRouter} from '../src/routers/auth.ts';

/**
 * PR-3 — Invitations (codes d'accès) + inscription sur invitation.
 *
 * Invariants couverts :
 *  - création gated admin/godmode ; rôle capé au rang du créateur (admin ≠ godmode-code → 403) ;
 *  - `POST /register` exige un code valide (403 sans code) ;
 *  - redemption : code valide → compte au rôle du code ; épuisé/révoqué → 400 ;
 *  - usage unique : un code `max_uses=1` ne sert qu'une fois.
 */

let server: Server;
let base: string;
let godmodeToken: string;
let adminToken: string;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const v = db
    .prepare("SELECT id, username, role FROM users WHERE username = 'vincent'")
    .get() as {id: string; username: string; role: 'godmode'};
  godmodeToken = signToken({id: v.id, username: v.username, role: v.role});
  // admin réel en base (created_by → FK users.id).
  const adminId = 'inv-admin-1';
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
     VALUES (?, 'inv_admin', 'Inv Admin', NULL, 'x', 'admin', 1, ?, ?)`,
  ).run(adminId, Date.now(), Date.now());
  adminToken = signToken({id: adminId, username: 'inv_admin', role: 'admin'});
  db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES ('s', 's', 'Student', 'x', 'student', 1, ?, ?)`,
  ).run(Date.now(), Date.now());

  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1', createAdminRouter());

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

const auth = (token: string) => ({Authorization: `Bearer ${token}`});

/** Parse typé du corps JSON — `res.json()` est `unknown` en strict TS. */
async function readJson<T = Record<string, unknown>>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

interface InviteResp {
  code: string;
  role: string;
  active: boolean;
  used_count: number;
}
interface ErrResp {
  error?: string;
  reason?: string;
}
interface RegisterResp {
  user?: {role: string};
}

async function createInvite(token: string, body: Record<string, unknown>) {
  const res = await fetch(`${base}/admin/invitations`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', ...auth(token)},
    body: JSON.stringify(body),
  });
  return res;
}

describe('invitations — création gated + cap de rang', () => {
  it('student/teacher → 403 (gated admin)', async () => {
    const studentToken = signToken({id: 's', username: 's', role: 'student'});
    const res = await createInvite(studentToken, {role: 'student'});
    expect(res.status).toBe(403);
  });

  it('admin ne peut PAS émettre un code godmode (cap de rang) → 403', async () => {
    const res = await createInvite(adminToken, {role: 'godmode'});
    expect(res.status).toBe(403);
    expect((await readJson<ErrResp>(res)).error).toBe('forbidden');
  });

  it('admin émet un code teacher → 201, actif', async () => {
    const res = await createInvite(adminToken, {role: 'teacher', max_uses: 1});
    expect(res.status).toBe(201);
    const inv = await readJson<InviteResp>(res);
    expect(inv.role).toBe('teacher');
    expect(inv.active).toBe(true);
    expect(inv.used_count).toBe(0);
    expect(typeof inv.code).toBe('string');
  });

  it('godmode peut émettre un code admin → 201', async () => {
    const res = await createInvite(godmodeToken, {role: 'admin'});
    expect(res.status).toBe(201);
    expect((await readJson<InviteResp>(res)).role).toBe('admin');
  });
});

describe('register — sur invitation uniquement', () => {
  async function register(body: Record<string, unknown>) {
    return fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
    });
  }

  it('sans invite_code → 403 invite_required', async () => {
    const res = await register({username: 'no_code_user', display_name: 'X', password: 'password123'});
    expect(res.status).toBe(403);
    expect((await readJson<ErrResp>(res)).error).toBe('invite_required');
  });

  it('code valide → compte créé au rôle du code', async () => {
    const created = await readJson<InviteResp>(await createInvite(adminToken, {role: 'teacher', max_uses: 1}));
    const res = await register({
      username: 'redeem_teacher',
      display_name: 'Prof Test',
      password: 'password123',
      invite_code: created.code,
    });
    expect(res.status).toBe(201);
    const body = await readJson<RegisterResp>(res);
    expect(body.user?.role).toBe('teacher');
  });

  it('code max_uses=1 déjà consommé → 400 invalid_invite (exhausted)', async () => {
    const created = await readJson<InviteResp>(await createInvite(adminToken, {role: 'student', max_uses: 1}));
    const first = await register({username: 'u_one', display_name: 'U1', password: 'password123', invite_code: created.code});
    expect(first.status).toBe(201);
    const second = await register({username: 'u_two', display_name: 'U2', password: 'password123', invite_code: created.code});
    expect(second.status).toBe(400);
    const body = await readJson<ErrResp>(second);
    expect(body.error).toBe('invalid_invite');
    expect(body.reason).toBe('exhausted');
  });

  it('code révoqué → 400 invalid_invite (revoked)', async () => {
    const created = await readJson<InviteResp>(await createInvite(adminToken, {role: 'student'}));
    const rev = await fetch(`${base}/admin/invitations/${encodeURIComponent(created.code)}/revoke`, {
      method: 'POST',
      headers: auth(adminToken),
    });
    expect(rev.status).toBe(200);
    expect((await readJson<InviteResp>(rev)).active).toBe(false);

    const res = await register({username: 'u_revoked', display_name: 'UR', password: 'password123', invite_code: created.code});
    expect(res.status).toBe(400);
    expect((await readJson<ErrResp>(res)).reason).toBe('revoked');
  });

  it('code inconnu → 400 invalid_invite (not_found)', async () => {
    const res = await register({username: 'u_unknown', display_name: 'UU', password: 'password123', invite_code: 'ZZZZ-ZZZZ-ZZZZ'});
    expect(res.status).toBe(400);
    expect((await readJson<ErrResp>(res)).reason).toBe('not_found');
  });
});
