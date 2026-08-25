import assert from 'node:assert/strict';
import {test} from 'node:test';

import {canAccessApp, getUserAccess} from '../server/app-access.ts';
import {getDb} from '../server/db.ts';
import {CORRECTOR_SLUGS, isCorrectorSlug} from '../lib/apps.ts';

/**
 * Tests du verrou « un compte = un correcteur » (users.assigned_app) :
 * migration, validation du slug, logique d'accès pure et lecture DB fraîche.
 */

test('colonne users.assigned_app ajoutée par migration', () => {
  const db = getDb();
  const cols = (db.prepare(`PRAGMA table_info(users)`).all() as Array<{name: string}>).map((c) => c.name);
  assert.ok(cols.includes('assigned_app'), 'colonne users.assigned_app');
});

test('isCorrectorSlug : les 11 slugs passent, le reste est rejeté', () => {
  assert.equal(CORRECTOR_SLUGS.length, 11);
  for (const slug of CORRECTOR_SLUGS) {
    assert.ok(isCorrectorSlug(slug), `slug ${slug}`);
  }
  for (const bad of ['', 'francais', 'FR', 'admin', null, undefined, 42, {}]) {
    assert.equal(isCorrectorSlug(bad), false, `rejette ${String(bad)}`);
  }
});

test('canAccessApp : admin et comptes historiques (null) accèdent à tout', () => {
  for (const app of CORRECTOR_SLUGS) {
    assert.ok(canAccessApp('admin', null, app), `admin sans restriction → ${app}`);
    assert.ok(canAccessApp('admin', 'fr', app), `admin même restreint → ${app}`);
    assert.ok(canAccessApp('user', null, app), `user héritage (null) → ${app}`);
  }
});

test('canAccessApp : user restreint limité à son seul correcteur', () => {
  assert.ok(canAccessApp('user', 'fr', 'fr'), 'fr → fr autorisé');
  for (const app of CORRECTOR_SLUGS.filter((s) => s !== 'fr')) {
    assert.equal(canAccessApp('user', 'fr', app), false, `fr → ${app} refusé`);
  }
});

test('getUserAccess : lit active/role/assigned_app frais depuis la DB', () => {
  const db = getDb();
  const id = `test-assigned-app-${Date.now()}`;
  db.prepare(
    `INSERT INTO users (id, username, password_hash, role, active, created_at, assigned_app)
     VALUES (?, ?, 'x', 'user', 1, ?, 'fr')`,
  ).run(id, `u-${id}`, Date.now());

  try {
    const access = getUserAccess(id);
    assert.ok(access, 'user trouvé');
    assert.equal(access.role, 'user');
    assert.equal(access.active, 1);
    assert.equal(access.assigned_app, 'fr');

    // Réassignation admin → visible immédiatement (aucun cache de session).
    db.prepare('UPDATE users SET assigned_app = ? WHERE id = ?').run('maths', id);
    assert.equal(getUserAccess(id)?.assigned_app, 'maths');

    // Levée de restriction (null) → accès à tout.
    db.prepare('UPDATE users SET assigned_app = NULL WHERE id = ?').run(id);
    assert.equal(getUserAccess(id)?.assigned_app, null);

    assert.equal(getUserAccess('id-inexistant'), null);
  } finally {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }
});
