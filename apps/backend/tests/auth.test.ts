import {beforeAll, describe, expect, it} from 'vitest';
import bcrypt from 'bcryptjs';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {authenticateToken, signToken, verifyToken, type AuthUser} from '../src/middleware/auth.ts';
import {hasRole} from '../src/engines/permission_runtime.ts';
import {env} from '../src/lib/env.ts';

/**
 * Tests AUTH & RÔLES du backend — sans serveur HTTP, via les modules.
 *
 * Invariant produit vérifié : PERMISSION est portée par le runtime, pas par
 * la préférence. `hasRole` compare ROLE_RANK (student 0 < teacher 1 < admin 2
 * < godmode 3) : un rôle supérieur couvre les rôles inférieurs, jamais l'inverse.
 */

beforeAll(async () => {
  // Seed idempotent sur la base ':memory:' (fixée par vitest.config.ts -> env).
  await seedAll();
});

describe('JWT — signToken / verifyToken', () => {
  it('roundtrip : un jeton godmode redonne sub/username/role corrects', () => {
    const user: AuthUser = {id: 'u-god', username: 'vincent', role: 'godmode'};

    const token = signToken(user);
    expect(typeof token).toBe('string');

    const payload = verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe(user.id);
    expect(payload?.username).toBe(user.username);
    expect(payload?.role).toBe(user.role);
  });

  it('jeton invalide : verifyToken("garbage") === null', () => {
    expect(verifyToken('garbage')).toBeNull();
  });
});

describe('JWT — identité effective et révocable', () => {
  it('relit le rôle courant en BDD et invalide les sessions après changement de version', () => {
    const db = getDb();
    const row = db
      .prepare("SELECT id, username, role, auth_version FROM users WHERE username = 'vincent'")
      .get() as AuthUser & {auth_version: number};
    const token = signToken(row);

    db.prepare(
      "UPDATE users SET role = 'admin', auth_version = auth_version + 1 WHERE id = ?",
    ).run(row.id);

    expect(authenticateToken(token)).toEqual({ok: false, error: 'session_invalidated'});

    db.prepare(
      "UPDATE users SET role = 'godmode', auth_version = auth_version + 1 WHERE id = ?",
    ).run(row.id);
  });

  it('refuse immédiatement un compte désactivé', () => {
    const db = getDb();
    const row = db
      .prepare("SELECT id, username, role, auth_version FROM users WHERE username = 'vincent'")
      .get() as AuthUser & {auth_version: number};
    const token = signToken(row);

    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(row.id);
    expect(authenticateToken(token)).toEqual({ok: false, error: 'user_inactive'});
    db.prepare('UPDATE users SET active = 1 WHERE id = ?').run(row.id);
  });
});

describe('Seed — synchronisation des comptes opérateurs', () => {
  it('rehash le mot de passe MALEX existant depuis la configuration et révoque ses sessions', async () => {
    const db = getDb();
    const before = db
      .prepare('SELECT id, auth_version FROM users WHERE username = ?')
      .get(env.malex.username) as {id: string; auth_version: number};
    const obsoleteHash = await bcrypt.hash('obsolete-password', 4);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(obsoleteHash, before.id);

    const previousPassword = process.env.MALEX_PASSWORD;
    process.env.MALEX_PASSWORD = env.malex.password;
    try {
      await seedAll();
    } finally {
      if (previousPassword === undefined) delete process.env.MALEX_PASSWORD;
      else process.env.MALEX_PASSWORD = previousPassword;
    }

    const after = db
      .prepare('SELECT password_hash, auth_version FROM users WHERE id = ?')
      .get(before.id) as {password_hash: string; auth_version: number};
    expect(await bcrypt.compare(env.malex.password, after.password_hash)).toBe(true);
    expect(after.auth_version).toBe(before.auth_version + 1);
  });
});

describe('Rôles — hasRole (ROLE_RANK)', () => {
  it("un 'godmode' atteint le rang 'teacher' (true)", () => {
    const god: AuthUser = {id: 'u1', username: 'god', role: 'godmode'};
    expect(hasRole(god, 'teacher')).toBe(true);
  });

  it("un 'student' n'atteint pas le rang 'teacher' (false)", () => {
    const student: AuthUser = {id: 'u2', username: 'eleve', role: 'student'};
    expect(hasRole(student, 'teacher')).toBe(false);
  });
});
