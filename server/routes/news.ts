import {Router} from 'express';

import {requireAdmin} from '../auth.ts';
import {getDb, type NewsRow} from '../db.ts';
import {currentUser} from '../session.ts';

const ALLOWED_CATEGORIES = new Set(['nouveauté', 'mise à jour', 'information']);

interface NewsPublicItem {
  id: number;
  title: string;
  content: string;
  category: NewsRow['category'];
  created_at: number;
  read_at: number | null;
}

interface NewsAdminItem extends NewsRow {
  read_count: number;
}

/**
 * Routes publiques (tout user loggé) pour les annonces de nouveautés.
 * Monté sur /api/v1/news.
 *
 *  - GET  /                : les 3 dernières annonces publiées + read_at par user
 *  - GET  /?all=1          : toutes les annonces publiées
 *  - POST /:id/read        : marque une annonce comme lue
 *  - GET  /unread-count    : nombre d'annonces non lues
 */
export function createNewsRouter(): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const u = currentUser(req);
    if (!u?.userId) {
      res.status(401).json({error: 'unauthenticated'});
      return;
    }

    const all = String(req.query.all ?? '') === '1';
    const limit = all ? 100 : 3;

    const rows = getDb()
      .prepare<[string, number], NewsPublicItem>(
        `SELECT n.id, n.title, n.content, n.category, n.created_at,
                r.read_at
         FROM news n
         LEFT JOIN news_reads r ON r.news_id = n.id AND r.user_id = ?
         WHERE n.published = 1
         ORDER BY n.created_at DESC
         LIMIT ?`,
      )
      .all(u.userId, limit);

    res.json({items: rows});
  });

  router.post('/:id/read', (req, res) => {
    const u = currentUser(req);
    if (!u?.userId) {
      res.status(401).json({error: 'unauthenticated'});
      return;
    }
    const newsId = Number(req.params.id);
    if (!Number.isFinite(newsId)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }

    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO news_reads (user_id, news_id, read_at) VALUES (?, ?, ?)
         ON CONFLICT (user_id, news_id) DO UPDATE SET read_at = excluded.read_at`,
      )
      .run(u.userId, newsId, now);

    res.json({ok: true});
  });

  router.get('/unread-count', (req, res) => {
    const u = currentUser(req);
    if (!u?.userId) {
      res.status(401).json({error: 'unauthenticated'});
      return;
    }

    const row = getDb()
      .prepare<[string], {count: number}>(
        `SELECT COUNT(*) AS count
         FROM news n
         WHERE n.published = 1
           AND NOT EXISTS (SELECT 1 FROM news_reads r WHERE r.news_id = n.id AND r.user_id = ?)`,
      )
      .get(u.userId);

    res.json({count: row?.count ?? 0});
  });

  return router;
}

/**
 * Routes admin pour la gestion des annonces.
 * Monté sur /api/v1/admin/news.
 *
 *  - GET    /       : toutes les annonces (brouillons inclus) + read_count
 *  - POST   /       : crée une annonce
 *  - PUT    /:id    : modifie une annonce
 *  - DELETE /:id    : supprime une annonce
 */
export function createAdminNewsRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get('/', (_req, res) => {
    const rows = getDb()
      .prepare<[], NewsAdminItem>(
        `SELECT n.*,
                (SELECT COUNT(*) FROM news_reads r WHERE r.news_id = n.id) AS read_count
         FROM news n
         ORDER BY n.created_at DESC`,
      )
      .all();
    res.json({items: rows});
  });

  router.post('/', (req, res) => {
    const u = currentUser(req)!;
    const {title, content, category, published} = req.body ?? {};

    if (!title || !content || !category) {
      res.status(400).json({error: 'missing_fields', hint: 'title, content et category sont requis'});
      return;
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      res.status(400).json({error: 'invalid_category', hint: `Catégories autorisées : ${[...ALLOWED_CATEGORIES].join(', ')}`});
      return;
    }

    const now = Date.now();
    const result = getDb()
      .prepare(
        `INSERT INTO news (title, content, category, published, created_at, updated_at, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(title, content, category, published ? 1 : 0, now, now, u.userId!);

    res.json({ok: true, id: result.lastInsertRowid});
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }

    const existing = getDb().prepare<[number], NewsRow>('SELECT * FROM news WHERE id = ?').get(id);
    if (!existing) {
      res.status(404).json({error: 'not_found'});
      return;
    }

    const {title, content, category, published} = req.body ?? {};
    if (category !== undefined && !ALLOWED_CATEGORIES.has(category)) {
      res.status(400).json({error: 'invalid_category'});
      return;
    }

    const updatedTitle = title ?? existing.title;
    const updatedContent = content ?? existing.content;
    const updatedCategory = category ?? existing.category;
    const updatedPublished = published !== undefined ? (published ? 1 : 0) : existing.published;
    const now = Date.now();

    getDb()
      .prepare(
        `UPDATE news SET title = ?, content = ?, category = ?, published = ?, updated_at = ? WHERE id = ?`,
      )
      .run(updatedTitle, updatedContent, updatedCategory, updatedPublished, now, id);

    res.json({ok: true});
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    const result = getDb().prepare('DELETE FROM news WHERE id = ?').run(id);
    if (result.changes === 0) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true, deleted: result.changes});
  });

  // POST /:id/emailed — mémorise la date du dernier envoi manuel par email (mailto Cci).
  router.post('/:id/emailed', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({error: 'invalid_id'});
      return;
    }
    const result = getDb().prepare('UPDATE news SET emailed_at = ? WHERE id = ?').run(Date.now(), id);
    if (result.changes === 0) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true});
  });

  return router;
}
