import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {seedAll} from '../src/db/seed.ts';
import {getDb} from '../src/db/schema.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createRoomsRouter} from '../src/routers/rooms.ts';

/**
 * Sécurité du router rooms — via un serveur HTTP éphémère.
 *
 * Invariant produit : le backend est exposé publiquement (Funnel) ; AUCUNE route rooms
 * ne doit répondre sans `Authorization: Bearer` valide. Régression couverte : le router
 * supposait `requireUser` « monté en amont » alors qu'index.ts ne le montait pas →
 * `GET /rooms` fuyait sans auth et `PUT /rooms/:id/instance` répondait 401 avec un
 * token pourtant valide (`req.user` jamais posé).
 *
 * Fixture isolée : une room dédiée `test-auth-room` est créée en beforeAll pour éviter
 * la flakiness due aux mutations parallèles des autres tests sur les rooms partagées.
 */

const TEST_ROOM_ID = 'test-auth-room';
let server: Server;
let base: string;
let token: string;
let roomId: string;

beforeAll(async () => {
  await seedAll();

  const db = getDb();
  const userRow = db.prepare("SELECT id, username, role FROM users WHERE username = 'vincent'").get() as AuthUser & {id: string};
  token = signToken({id: userRow.id, username: userRow.username, role: userRow.role});

  // Fixture dédiée — pas de SELECT LIMIT 1 (évite les collisions parallèles)
  const now = Date.now();
  db.prepare(`
    INSERT OR IGNORE INTO rooms (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
    VALUES (?, 'Test Auth Room', 'home', ?, '{}', 0, ?, ?)
  `).run(TEST_ROOM_ID, userRow.id, now, now);
  roomId = TEST_ROOM_ID;

  const app = express();
  app.use(express.json());
  app.use('/api/v1/rooms', createRoomsRouter());

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1/rooms`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

describe('rooms — auth obligatoire (exposition publique)', () => {
  it('sans token : 401 sur GET /rooms, GET /rooms/:id, GET et PUT /rooms/:id/instance', async () => {
    const probes = [
      fetch(base),
      fetch(`${base}/${roomId}`),
      fetch(`${base}/${roomId}/instance`),
      fetch(`${base}/${roomId}/instance`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({active_surface: 'learning'}),
      }),
    ];
    for (const response of await Promise.all(probes)) {
      expect(response.status).toBe(401);
    }
  });

  it('avec token : GET /rooms répond 200 et liste la Home Room', async () => {
    const response = await fetch(base, {headers: {Authorization: `Bearer ${token}`}});
    expect(response.status).toBe(200);
    const rooms = (await response.json()) as Array<{id: string}>;
    expect(rooms.some((room) => room.id === roomId)).toBe(true);
  });

  it('avec token : PUT /rooms/:id/instance persiste surface/densité/widget_state puis se relit', async () => {
    const put = await fetch(`${base}/${roomId}/instance`, {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      body: JSON.stringify({
        active_surface: 'learning',
        cognitive_density: 'low',
        widget_state: {active_mode: 'learning', entry_profile: {intent: 'learning'}},
      }),
    });
    expect(put.status).toBe(200);

    const read = await fetch(`${base}/${roomId}/instance`, {headers: {Authorization: `Bearer ${token}`}});
    expect(read.status).toBe(200);
    const instance = (await read.json()) as {
      active_surface: string;
      cognitive_density: string;
      widget_state: {active_mode?: string} | null;
    };
    expect(instance.active_surface).toBe('learning');
    expect(instance.cognitive_density).toBe('low');
    expect(instance.widget_state?.active_mode).toBe('learning');
  });
});
