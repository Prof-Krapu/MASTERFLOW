import assert from 'node:assert/strict';
import {test} from 'node:test';

import {getDb} from '../server/db.ts';

/**
 * Tests pour la feature nouveautés (tables news + news_reads).
 * Vérifie la migration et les opérations CRUD basiques.
 */

test('tables news et news_reads existent après migration', () => {
  const db = getDb();

  const newsTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='news'`)
    .get() as {name: string} | undefined;
  assert.ok(newsTable, 'table news doit exister');

  const readsTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='news_reads'`)
    .get() as {name: string} | undefined;
  assert.ok(readsTable, 'table news_reads doit exister');
});

test('colonnes de la table news', () => {
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(news)`).all() as Array<{name: string}>;
  const names = columns.map((c) => c.name);

  assert.ok(names.includes('id'), 'colonne id');
  assert.ok(names.includes('title'), 'colonne title');
  assert.ok(names.includes('content'), 'colonne content');
  assert.ok(names.includes('category'), 'colonne category');
  assert.ok(names.includes('published'), 'colonne published');
  assert.ok(names.includes('created_at'), 'colonne created_at');
  assert.ok(names.includes('updated_at'), 'colonne updated_at');
  assert.ok(names.includes('created_by'), 'colonne created_by');
});

test('colonnes de la table news_reads', () => {
  const db = getDb();
  const columns = db.prepare(`PRAGMA table_info(news_reads)`).all() as Array<{name: string}>;
  const names = columns.map((c) => c.name);

  assert.ok(names.includes('user_id'), 'colonne user_id');
  assert.ok(names.includes('news_id'), 'colonne news_id');
  assert.ok(names.includes('read_at'), 'colonne read_at');
});

test('index idx_news_published existe', () => {
  const db = getDb();
  const idx = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='idx_news_published'`)
    .get() as {name: string} | undefined;
  assert.ok(idx, 'index idx_news_published doit exister');
});

test('CRUD basique sur news', () => {
  const db = getDb();

  // On a besoin d'un user pour la FK created_by — on en crée un temporaire
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, password_hash, role, active, created_at)
     VALUES ('test-news-user', 'test-news-user', 'x', 'admin', 1, ?)`,
  ).run(Date.now());

  const now = Date.now();

  // INSERT
  const result = db
    .prepare(
      `INSERT INTO news (title, content, category, published, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run('Test titre', 'Test contenu', 'nouveauté', 1, now, now, 'test-news-user');
  const newsId = result.lastInsertRowid as number;
  assert.ok(newsId > 0, 'INSERT renvoie un id');

  // SELECT
  const row = db.prepare('SELECT * FROM news WHERE id = ?').get(newsId) as Record<string, unknown> | undefined;
  assert.ok(row, 'la ligne existe');
  assert.equal(row!.title, 'Test titre');
  assert.equal(row!.category, 'nouveauté');
  assert.equal(row!.published, 1);

  // UPDATE
  db.prepare('UPDATE news SET title = ?, published = ? WHERE id = ?').run('Titre modifié', 0, newsId);
  const updated = db.prepare('SELECT title, published FROM news WHERE id = ?').get(newsId) as {
    title: string;
    published: number;
  };
  assert.equal(updated.title, 'Titre modifié');
  assert.equal(updated.published, 0);

  // DELETE
  db.prepare('DELETE FROM news WHERE id = ?').run(newsId);
  const deleted = db.prepare('SELECT * FROM news WHERE id = ?').get(newsId);
  assert.equal(deleted, undefined, 'la ligne est supprimée');
});

test('CRUD basique sur news_reads', () => {
  const db = getDb();

  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, password_hash, role, active, created_at)
     VALUES ('test-reads-user', 'test-reads-user', 'x', 'user', 1, ?)`,
  ).run(Date.now());

  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, password_hash, role, active, created_at)
     VALUES ('test-news-user', 'test-news-user', 'x', 'admin', 1, ?)`,
  ).run(Date.now());

  const now = Date.now();

  // Créer une annonce
  const result = db
    .prepare(
      `INSERT INTO news (title, content, category, published, created_at, updated_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run('Lire test', 'Contenu', 'information', 1, now, now, 'test-news-user');
  const newsId = result.lastInsertRowid as number;

  // Marquer comme lu
  db.prepare('INSERT INTO news_reads (user_id, news_id, read_at) VALUES (?, ?, ?)').run(
    'test-reads-user',
    newsId,
    now,
  );

  const readRow = db
    .prepare('SELECT * FROM news_reads WHERE user_id = ? AND news_id = ?')
    .get('test-reads-user', newsId) as {user_id: string; news_id: number} | undefined;
  assert.ok(readRow, 'news_reads row existe');
  assert.equal(readRow!.user_id, 'test-reads-user');
  assert.equal(readRow!.news_id, newsId);

  // Vérifier la requête de comptage non-lus (pour un autre user)
  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS count FROM news n
       WHERE n.published = 1
         AND NOT EXISTS (SELECT 1 FROM news_reads r WHERE r.news_id = n.id AND r.user_id = ?)`,
    )
    .get('autre-user-inexistant') as {count: number};
  assert.ok(countRow.count >= 1, 'au moins 1 non-lu pour un user sans lectures');

  // Nettoyage
  db.prepare('DELETE FROM news_reads WHERE news_id = ?').run(newsId);
  db.prepare('DELETE FROM news WHERE id = ?').run(newsId);
});
