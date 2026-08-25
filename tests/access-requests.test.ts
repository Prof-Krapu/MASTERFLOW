import assert from 'node:assert/strict';
import {test} from 'node:test';

import {getDb} from '../server/db.ts';

/**
 * Tests pour la feature demandes d'accès bêta + liste de diffusion
 * (tables access_requests + mailing_list, colonnes users.email et news.emailed_at).
 */

test('tables access_requests et mailing_list existent après migration', () => {
  const db = getDb();

  const requestsTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='access_requests'`)
    .get() as {name: string} | undefined;
  assert.ok(requestsTable, 'table access_requests doit exister');

  const mailingTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='mailing_list'`)
    .get() as {name: string} | undefined;
  assert.ok(mailingTable, 'table mailing_list doit exister');
});

test('colonnes de la table access_requests', () => {
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(access_requests)`).all() as Array<{name: string}>;
  const names = columns.map((c) => c.name);

  for (const col of ['id', 'email', 'name', 'message', 'status', 'mailing_opt_in', 'invite_code', 'read', 'created_at', 'processed_at']) {
    assert.ok(names.includes(col), `colonne ${col}`);
  }
});

test('colonnes de la table mailing_list', () => {
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(mailing_list)`).all() as Array<{name: string}>;
  const names = columns.map((c) => c.name);

  for (const col of ['email', 'subscribed_at', 'source', 'active']) {
    assert.ok(names.includes(col), `colonne ${col}`);
  }
});

test('colonnes users.email et news.emailed_at ajoutées par migration', () => {
  const db = getDb();

  const userCols = (db.prepare(`PRAGMA table_info(users)`).all() as Array<{name: string}>).map((c) => c.name);
  assert.ok(userCols.includes('email'), 'colonne users.email');

  const newsCols = (db.prepare(`PRAGMA table_info(news)`).all() as Array<{name: string}>).map((c) => c.name);
  assert.ok(newsCols.includes('emailed_at'), 'colonne news.emailed_at');
});

test('index access_requests existent', () => {
  const db = getDb();
  for (const name of ['idx_access_requests_status', 'idx_access_requests_read']) {
    const idx = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name = ?`)
      .get(name) as {name: string} | undefined;
    assert.ok(idx, `index ${name} doit exister`);
  }
});

test('CHECK sur access_requests.status rejette un statut inconnu', () => {
  const db = getDb();
  assert.throws(
    () =>
      db
        .prepare(
          `INSERT INTO access_requests (email, status, mailing_opt_in, read, created_at)
           VALUES ('bad-status@test.fr', 'nimporte', 0, 0, ?)`,
        )
        .run(Date.now()),
    /CHECK/i,
    'un statut hors pending/approved/rejected doit être rejeté',
  );
});

test('cycle de vie d\'une demande : pending → approved avec invite_code', () => {
  const db = getDb();
  const now = Date.now();

  const result = db
    .prepare(
      `INSERT INTO access_requests (email, name, message, status, mailing_opt_in, read, created_at)
       VALUES ('cycle@test.fr', 'Test Cycle', 'Bonjour', 'pending', 1, 0, ?)`,
    )
    .run(now);
  const id = result.lastInsertRowid as number;
  assert.ok(id > 0, 'INSERT renvoie un id');

  db.prepare(
    `UPDATE access_requests SET status = 'approved', invite_code = 'TESTCODE1234', processed_at = ?, read = 1 WHERE id = ?`,
  ).run(now, id);

  const row = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(id) as Record<string, unknown>;
  assert.equal(row.status, 'approved');
  assert.equal(row.invite_code, 'TESTCODE1234');
  assert.equal(row.read, 1);

  // Dédup applicatif : la requête utilisée par la route publique doit trouver cette demande.
  const dup = db
    .prepare(`SELECT 1 FROM access_requests WHERE email = ? AND status IN ('pending', 'approved')`)
    .get('cycle@test.fr');
  assert.ok(dup, 'une demande approuvée bloque une re-soumission');

  db.prepare('DELETE FROM access_requests WHERE id = ?').run(id);
});

test('mailing_list : upsert ON CONFLICT réactive un désinscrit', () => {
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `INSERT INTO mailing_list (email, subscribed_at, source, active) VALUES ('upsert@test.fr', ?, 'access_request', 1)
     ON CONFLICT(email) DO UPDATE SET active = 1`,
  ).run(now);

  db.prepare(`UPDATE mailing_list SET active = 0 WHERE email = 'upsert@test.fr'`).run();

  // Ré-opt-in : le même upsert doit réactiver sans dupliquer.
  db.prepare(
    `INSERT INTO mailing_list (email, subscribed_at, source, active) VALUES ('upsert@test.fr', ?, 'access_request', 1)
     ON CONFLICT(email) DO UPDATE SET active = 1`,
  ).run(now + 1);

  const rows = db
    .prepare(`SELECT * FROM mailing_list WHERE email = 'upsert@test.fr'`)
    .all() as Array<{active: number; subscribed_at: number}>;
  assert.equal(rows.length, 1, 'pas de doublon');
  assert.equal(rows[0]!.active, 1, 'réactivé');
  assert.equal(rows[0]!.subscribed_at, now, 'la date d\'inscription initiale est conservée');

  db.prepare(`DELETE FROM mailing_list WHERE email = 'upsert@test.fr'`).run();
});

test('mailing_list : CHECK sur source', () => {
  const db = getDb();
  assert.throws(
    () =>
      db
        .prepare(`INSERT INTO mailing_list (email, subscribed_at, source, active) VALUES ('bad-source@test.fr', ?, 'autre', 1)`)
        .run(Date.now()),
    /CHECK/i,
    'une source hors access_request/admin doit être rejetée',
  );
});
