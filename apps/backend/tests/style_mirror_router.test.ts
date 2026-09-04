import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createStyleMirrorRouter} from '../src/routers/style_mirror.ts';
import {
  observeAuthenticatedLanguage,
  proposePersonaRepresentation,
} from '../src/services/style_learning_engine.ts';

const alice: AuthUser = {id: 'style-router-alice', username: 'style_router_alice', role: 'student'};
const bob: AuthUser = {id: 'style-router-bob', username: 'style_router_bob', role: 'student'};
const personaId = 'style-router-persona';
let server: Server;
let base = '';
let aliceToken = '';
let bobToken = '';

const auth = (token: string): Record<string, string> => ({Authorization: `Bearer ${token}`});

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insertUser = getDb().prepare(`
    INSERT OR IGNORE INTO users
      (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, 'x', ?, 1, ?, ?)
  `);
  for (const actor of [alice, bob]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  getDb().prepare(`
    INSERT OR IGNORE INTO personas
      (id, name, owner_type, domain, status, voice_config_json, method_config_json,
       visual_config_json, permissions_json, created_at)
    VALUES (?, 'Persona route style', 'persona', 'test', 'active', '{}', '{}', '{}', '{}', ?)
  `).run(personaId, now);
  aliceToken = signToken(alice);
  bobToken = signToken(bob);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createStyleMirrorRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('style_router_test_address_missing');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe('style mirror router isolation', () => {
  it('retourne toujours le snapshot du token courant, sans message brut de A dans B', async () => {
    const raw = 'Franchement alors cette phrase privée ne doit jamais sortir dans un snapshot.';
    observeAuthenticatedLanguage(alice, raw);
    const aliceResponse = await fetch(`${base}/style-mirror/learning/me`, {headers: auth(aliceToken)});
    const bobResponse = await fetch(`${base}/style-mirror/learning/me`, {headers: auth(bobToken)});
    expect(aliceResponse.status).toBe(200);
    expect(bobResponse.status).toBe(200);
    const aliceSnapshot = await aliceResponse.json() as {preview: {sample_count: number}};
    const bobSnapshot = await bobResponse.json() as {preview: {sample_count: number}};
    expect(aliceSnapshot.preview.sample_count).toBe(1);
    expect(bobSnapshot.preview.sample_count).toBe(0);
    expect(JSON.stringify(aliceSnapshot)).not.toContain(raw);
    expect(JSON.stringify(bobSnapshot)).not.toContain(raw);
  });

  it('refuse une intensité supérieure à 40 pour cent au contrat HTTP', async () => {
    const response = await fetch(`${base}/style-mirror/learning/me`, {
      method: 'PATCH',
      headers: {...auth(aliceToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({overlay_intensity: 0.41}),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({error: 'invalid_body'});
  });

  it('empêche A d’activer ou révoquer la représentation de B', async () => {
    const link = proposePersonaRepresentation(bob, personaId, bob.id);
    const takeover = await fetch(`${base}/style-mirror/personas/${personaId}/representation`, {
      method: 'PUT',
      headers: {...auth(aliceToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({represented_user_id: alice.id}),
    });
    expect(takeover.status).toBe(400);
    expect(await takeover.json()).toEqual({error: 'representation_conflict'});
    const response = await fetch(`${base}/style-mirror/representations/${link.id}/status`, {
      method: 'POST',
      headers: {...auth(aliceToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({status: 'revoked'}),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({error: 'representation_not_found'});
    const row = getDb().prepare('SELECT represented_user_id, status FROM persona_representation_links WHERE id = ?')
      .get(link.id);
    expect(row).toEqual({represented_user_id: bob.id, status: 'active'});
  });
});
