import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import type {AuthUser} from '../src/middleware/auth.ts';
import {signToken} from '../src/middleware/auth.ts';
import {
  createAction,
  executeAction,
  preflightAction,
  validateAction,
} from '../src/engines/action_engine.ts';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {createAdminRouter} from '../src/routers/admin.ts';

/**
 * PR-3 — Administration des comptes : changement de rôle = action sensible `set_user_role`.
 *
 * Invariants couverts :
 *  - `GET /admin/users` gated admin/godmode (403 student/teacher) ;
 *  - cycle complet : draft → pending_validation (validator godmode) → approved → completed ;
 *  - admin NE PEUT PAS valider `set_user_role` (godmode requis) ;
 *  - défense en profondeur : execute par admin même approuvé → failed ;
 *  - garde-fous : pas son propre rôle ; pas de rétrogradation du dernier godmode.
 */

let vincentId: string;
let targetId: string;
let god: AuthUser;
const admin: AuthUser = {id: 'ua-admin', username: 'ua_admin', role: 'admin'};

let server: Server;
let base: string;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const v = db
    .prepare("SELECT id, username, role FROM users WHERE username = 'vincent'")
    .get() as {id: string; username: string; role: 'godmode'};
  vincentId = v.id;
  god = {id: v.id, username: v.username, role: 'godmode'};

  // Cible : un compte student réel.
  targetId = 'ua-target-student';
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
     VALUES (?, 'ua_target', 'Target', NULL, 'x', 'student', 1, ?, ?)`,
  ).run(targetId, Date.now(), Date.now());

  // Acteur godmode-par-jeton mais NON-godmode en base : satisfait la FK `actions.user_id`
  // sans gonfler le compte de godmodes (vincent reste le seul → garde-fou « dernier godmode »).
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
     VALUES ('ua-other-god', 'other_god', 'Other God', NULL, 'x', 'admin', 1, ?, ?)`,
  ).run(Date.now(), Date.now());
  const insertActor = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 'x', ?, 1, ?, ?)`,
  );
  const actorNow = Date.now();
  insertActor.run(admin.id, admin.username, 'Admin', admin.role, actorNow, actorNow);
  insertActor.run('s', 's', 'Student', 'student', actorNow, actorNow);
  insertActor.run('t', 't', 'Teacher', 'teacher', actorNow, actorNow);

  const app = express();
  app.use(express.json());
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

function makeRoleAction(actor: AuthUser, userId: string, role: string) {
  const created = createAction(actor, {
    registry_id: 'set_user_role',
    intent: 'set_user_role',
    object_type: 'user_role',
    payload: {user_id: userId, role},
  });
  return preflightAction(actor, created.id);
}

describe('GET /admin/users — gated admin/godmode', () => {
  const get = (token: string) =>
    fetch(`${base}/admin/users`, {headers: {Authorization: `Bearer ${token}`}});

  it('sans token → 401', async () => {
    expect((await fetch(`${base}/admin/users`)).status).toBe(401);
  });

  it('student/teacher → 403', async () => {
    expect((await get(signToken({id: 's', username: 's', role: 'student'}))).status).toBe(403);
    expect((await get(signToken({id: 't', username: 't', role: 'teacher'}))).status).toBe(403);
  });

  it('admin → 200, liste contenant le compte godmode seedé', async () => {
    const res = await get(signToken({id: admin.id, username: admin.username, role: 'admin'}));
    expect(res.status).toBe(200);
    const users = (await res.json()) as Array<{username: string; role: string; active: boolean}>;
    expect(users.find((u) => u.username === 'vincent')?.role).toBe('godmode');
  });
});

describe('set_user_role — cycle de vie & garde-fous', () => {
  it('draft → pending_validation (validator_role = godmode)', () => {
    const flighted = makeRoleAction(god, targetId, 'teacher');
    expect(flighted.status).toBe('pending_validation');
    expect(flighted.preflight?.validator_role).toBe('godmode');
  });

  it('admin ne peut PAS valider (godmode requis)', () => {
    const flighted = makeRoleAction(god, targetId, 'teacher');
    expect(() => validateAction(admin, flighted.id, {decision: 'approved'})).toThrow();
  });

  it('godmode valide + execute → completed, rôle mis à jour en base', () => {
    const flighted = makeRoleAction(god, targetId, 'teacher');
    const approved = validateAction(god, flighted.id, {decision: 'approved'});
    expect(approved.status).toBe('approved');

    const completed = executeAction(god, flighted.id);
    expect(completed.status).toBe('completed');
    expect(completed.result?.new).toBe('teacher');

    const row = getDb().prepare('SELECT role FROM users WHERE id = ?').get(targetId) as {role: string};
    expect(row.role).toBe('teacher');
  });

  it('execute par admin même approuvé → failed (défense en profondeur)', () => {
    const flighted = makeRoleAction(god, targetId, 'admin');
    validateAction(god, flighted.id, {decision: 'approved'});
    expect(() => executeAction(admin, flighted.id)).toThrow(/action_access_denied/);
  });

  it('changer son propre rôle → failed (garde-fou)', () => {
    const flighted = makeRoleAction(god, vincentId, 'student');
    validateAction(god, flighted.id, {decision: 'approved'});
    const result = executeAction(god, flighted.id);
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/propre rôle/);
  });

  it('rétrograder le dernier godmode → failed (garde-fou)', () => {
    // Le seed crée 2 godmodes (vincent + malex). On rétrograde temporairement malex
    // pour que vincent soit le seul godmode restant et tester le garde-fou.
    const db = getDb();
    db.prepare("UPDATE users SET role = 'admin', auth_version = auth_version + 1, updated_at = ? WHERE username = 'Malex'").run(Date.now());
    try {
      const otherGod: AuthUser = {id: 'ua-other-god', username: 'other_god', role: 'godmode'};
      const flighted = makeRoleAction(otherGod, vincentId, 'student');
      validateAction(otherGod, flighted.id, {decision: 'approved'});
      const result = executeAction(otherGod, flighted.id);
      expect(result.status).toBe('failed');
      expect(result.error).toMatch(/dernier godmode/);
    } finally {
      db.prepare("UPDATE users SET role = 'godmode', auth_version = auth_version + 1, updated_at = ? WHERE username = 'Malex'").run(Date.now());
    }
  });
});
