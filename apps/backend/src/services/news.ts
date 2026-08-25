import {
  CreateNewsPostRequestSchema,
  NewsPostSchema,
  ROLE_RANK,
  UpdateNewsPostRequestSchema,
  type CreateNewsPostRequest,
  type NewsPost,
  type UpdateNewsPostRequest,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

/**
 * Annonces / nouveautés — portage du fil news d'API_manage (server/routes/news.ts),
 * adapté au runtime MasterFlow : publication et édition ≥ admin, lecture pour tous.
 *
 * Le flag `emailed` conserve la sémantique « newsletter » d'API_manage : marque qu'une
 * annonce a été diffusée par email hors-bande (aucun envoi automatique ici).
 * L'état de lecture est par utilisateur (table news_post_reads).
 */

function requireAdmin(a: AuthUser): void {
  if (ROLE_RANK[a.role] < ROLE_RANK.admin) throw new Error('permission_denied');
}

function dto(r: any, readAt: number | null): NewsPost {
  return NewsPostSchema.parse({
    id: r.id,
    title: r.title,
    body: r.body,
    author_id: r.author_id,
    author_username: r.author_username,
    emailed: r.emailed === 1,
    created_at: r.created_at,
    updated_at: r.updated_at,
    read_at: readAt,
  });
}

const SELECT_POSTS = `
  SELECT p.*, u.username AS author_username
  FROM news_posts p
  JOIN users u ON u.id = p.author_id
`;

function withReadFlag(a: AuthUser, rows: any[]): NewsPost[] {
  const db = getDb();
  const reads = new Map(
    (
      db.prepare('SELECT post_id, read_at FROM news_post_reads WHERE user_id = ?').all(a.id) as any[]
    ).map((r) => [r.post_id, r.read_at]),
  );
  return rows.map((r) => dto(r, reads.get(r.id) ?? null));
}

function getPostFor(a: AuthUser, id: string): NewsPost {
  const row = getDb().prepare(`${SELECT_POSTS} WHERE p.id = ?`).get(id) as any;
  if (!row) throw new Error('news_post_not_found');
  const post = withReadFlag(a, [row])[0];
  if (!post) throw new Error('news_post_not_found');
  return post;
}

// ── Lecture (tout utilisateur) ──────────────────────────────────────────────

export function listNewsPosts(a: AuthUser): NewsPost[] {
  return withReadFlag(a, getDb().prepare(`${SELECT_POSTS} ORDER BY p.created_at DESC`).all() as any[]);
}

export function unreadNewsCount(a: AuthUser): number {
  return listNewsPosts(a).filter((p) => p.read_at === null).length;
}

export function markNewsPostRead(a: AuthUser, id: string): NewsPost {
  const db = getDb();
  const row = db.prepare('SELECT * FROM news_posts WHERE id = ?').get(id) as any;
  if (!row) throw new Error('news_post_not_found');
  db.prepare('INSERT OR IGNORE INTO news_post_reads (post_id, user_id, read_at) VALUES (?, ?, ?)').run(
    id,
    a.id,
    Date.now(),
  );
  const readAt = (
    db.prepare('SELECT read_at FROM news_post_reads WHERE post_id = ? AND user_id = ?').get(id, a.id) as any
  ).read_at;
  return dto(db.prepare(`${SELECT_POSTS} WHERE p.id = ?`).get(id), readAt);
}

// ── Gestion (≥ admin) ───────────────────────────────────────────────────────

export function createNewsPost(a: AuthUser, input: CreateNewsPostRequest): NewsPost {
  requireAdmin(a);
  const q = CreateNewsPostRequestSchema.parse(input);
  const db = getDb();
  const now = Date.now();
  const id = uuid();
  db.prepare(
    'INSERT INTO news_posts (id, title, body, author_id, emailed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, q.title, q.body, a.id, q.emailed ? 1 : 0, now, now);
  return getPostFor(a, id);
}

export function updateNewsPost(a: AuthUser, id: string, input: UpdateNewsPostRequest): NewsPost {
  requireAdmin(a);
  const q = UpdateNewsPostRequestSchema.parse(input);
  const db = getDb();
  const row = db.prepare('SELECT * FROM news_posts WHERE id = ?').get(id) as any;
  if (!row) throw new Error('news_post_not_found');
  db.prepare('UPDATE news_posts SET title = ?, body = ?, emailed = ?, updated_at = ? WHERE id = ?').run(
    q.title ?? row.title,
    q.body ?? row.body,
    (q.emailed ?? row.emailed === 1) ? 1 : 0,
    Date.now(),
    id,
  );
  return getPostFor(a, id);
}

export function markNewsPostEmailed(a: AuthUser, id: string): NewsPost {
  return updateNewsPost(a, id, {emailed: true});
}

export function deleteNewsPost(a: AuthUser, id: string): void {
  requireAdmin(a);
  const db = getDb();
  const result = db.prepare('DELETE FROM news_posts WHERE id = ?').run(id);
  if (result.changes === 0) throw new Error('news_post_not_found');
}
