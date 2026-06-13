import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createPersonasRouter} from '../src/routers/personas.ts';

let server: Server;
let base: string;
let token: string;
let roomInstanceId: string;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const user = db
    .prepare("SELECT id, username, role FROM users WHERE username = 'vincent'")
    .get() as {id: string; username: string; role: 'godmode'};
  token = signToken(user);

  const room = db.prepare("SELECT id FROM rooms WHERE owner_id = ? AND type = 'home'").get(user.id) as {
    id: string;
  };
  roomInstanceId = 'persona-deprecation-room-instance';
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES (?, ?, ?, 'workspace', 'workspace', 'medium', NULL, ?, ?)`,
  ).run(roomInstanceId, room.id, user.id, now, now);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPersonasRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const auth = {
  Authorization: '',
  'Content-Type': 'application/json',
};

function headers(): Record<string, string> {
  return {...auth, Authorization: `Bearer ${token}`};
}

describe('PR-C0 — dépréciation non destructive de Corrector', () => {
  it('masque Corrector de la liste mais conserve son détail historique', async () => {
    const listResponse = await fetch(`${base}/personas`, {headers: headers()});
    expect(listResponse.status).toBe(200);
    const personas = (await listResponse.json()) as Array<{id: string}>;
    expect(personas.some((persona) => persona.id === 'corrector-001')).toBe(false);

    const detailResponse = await fetch(`${base}/personas/corrector-001`, {headers: headers()});
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toMatchObject({
      id: 'corrector-001',
      status: 'deprecated',
      permissions: {
        can_be_primary: false,
        can_blend: false,
        grants_permissions: false,
        scoring_authority: false,
      },
    });
  });

  it('refuse l activation et la création d un nouveau blend Corrector', async () => {
    const activation = await fetch(`${base}/personas/corrector-001/activate`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({room_instance_id: roomInstanceId}),
    });
    expect(activation.status).toBe(409);
    expect(await activation.json()).toEqual({error: 'persona_deprecated'});

    const blend = await fetch(`${base}/personas/blend`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        room_instance_id: roomInstanceId,
        primary_persona_id: 'profkrapu-001',
        secondary_persona_id: 'corrector-001',
        blend_weights: {voice: 0.7, method: 0.3},
        active_layers: ['voice', 'method_signature'],
      }),
    });
    expect(blend.status).toBe(400);
    expect(await blend.json()).toMatchObject({error: 'blend_failed'});
  });
});
