import {beforeAll, describe, expect, it} from 'vitest';

import {seedAll} from '../src/db/seed.ts';
import {signToken, verifyToken, type AuthUser} from '../src/middleware/auth.ts';
import {hasRole} from '../src/engines/permission_runtime.ts';

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
