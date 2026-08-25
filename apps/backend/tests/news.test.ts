import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createNewsRouter} from '../src/routers/news.ts';
import {
  createNewsPost,
  deleteNewsPost,
  markNewsPostEmailed,
  unreadNewsCount,
} from '../src/services/news.ts';

const student: AuthUser = {id: 'news-student', username: 'news_student', role: 'student'};
const admin: AuthUser = {id: 'news-admin', username: 'news_admin', role: 'admin'};

let server: Server;
let base = '';
let studentToken = '';
let adminToken = '';

function insertUser(user: AuthUser): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(user.id, user.username, user.username, user.role, now, now);
}

async function api(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<{status: number; json: any}> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : {'content-type': 'application/json'}),
    },
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  return {status: res.status, json: (await res.json()) as any};
}

beforeAll(async () => {
  await seedAll();
  insertUser(student);
  insertUser(admin);
  studentToken = signToken(student);
  adminToken = signToken(admin);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createNewsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

describe('Annonces / newsletter (portage API_manage)', () => {
  it('un non-admin ne peut pas publier ; un admin publie', async () => {
    const denied = await api('POST', '/admin/news', studentToken, {title: 'x', body: 'y'});
    expect(denied.status).toBe(403);

    const created = await api('POST', '/admin/news', adminToken, {
      title: 'Nouveauté MasterFlow',
      body: 'La validation inbox arrive.',
    });
    expect(created.status).toBe(201);
    expect(created.json.emailed).toBe(false);
    expect(created.json.author_username).toBe('news_admin');

    const post = createNewsPost(admin, {
      title: 'Newsletter de rentrée',
      body: 'Diffusée par email.',
      emailed: true,
    });
    expect(post.emailed).toBe(true);
  });

  it("lecture, compteur non-lus et marquage lu sont par utilisateur", async () => {
    const post = createNewsPost(admin, {title: "À lire", body: "Contenu", emailed: false});
    const before = unreadNewsCount(student);
    expect(before).toBeGreaterThanOrEqual(1);

    const list = await api('GET', '/news', studentToken);
    const found = list.json.find((p: any) => p.id === post.id);
    expect(found.read_at).toBeNull();

    const read = await api('POST', `/news/${post.id}/read`, studentToken);
    expect(read.status).toBe(200);
    expect(read.json.read_at).not.toBeNull();

    // Le compteur baisse pour l'étudiant mais l'annonce reste non lue côté admin.
    expect(unreadNewsCount(student)).toBe(before - 1);
    expect(unreadNewsCount(admin)).toBeGreaterThanOrEqual(1);

    // Idempotent : relire ne casse rien.
    await api('POST', `/news/${post.id}/read`, studentToken);
    expect(unreadNewsCount(student)).toBe(before - 1);
  });

  it("édition, flag emailed et suppression sont réservés à l'admin", async () => {
    const post = createNewsPost(admin, {title: "Brouillon", body: "v1", emailed: false});

    const denied = await api('PUT', `/admin/news/${post.id}`, studentToken, {title: 'pirate'});
    expect(denied.status).toBe(403);

    const updated = await api('PUT', `/admin/news/${post.id}`, adminToken, {title: 'Publié', emailed: true});
    expect(updated.status).toBe(200);
    expect(updated.json.title).toBe('Publié');
    expect(updated.json.emailed).toBe(true);

    const flagged = markNewsPostEmailed(admin, post.id);
    expect(flagged.emailed).toBe(true);

    const deniedDelete = await api('DELETE', `/admin/news/${post.id}`, studentToken);
    expect(deniedDelete.status).toBe(403);

    deleteNewsPost(admin, post.id);
    const gone = await api('DELETE', `/admin/news/${post.id}`, adminToken);
    expect(gone.status).toBe(404);
  });
});
