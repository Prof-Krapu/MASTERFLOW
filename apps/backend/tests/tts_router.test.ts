import {createServer, type Server} from 'node:http';
import {access, writeFile} from 'node:fs/promises';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {uuid} from '../src/lib/uuid.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createTtsRouter} from '../src/routers/tts.ts';
import {consumeTtsQuota, type TtsGenerator} from '../src/services/tts.ts';

let actor: AuthUser;
let server: Server;
let base: string;
let token: string;
let roomInstanceId: string;
const calls: Parameters<TtsGenerator>[0][] = [];

beforeAll(async () => {
  await seedAll();
  actor = getDb()
    .prepare("SELECT id, username, role FROM users WHERE role = 'godmode' LIMIT 1")
    .get() as AuthUser;
  const room = getDb().prepare("SELECT id FROM rooms WHERE owner_id = ? AND type = 'home' LIMIT 1").get(actor.id) as
    | {id: string}
    | undefined;
  if (!room) throw new Error('tts_test_room_missing');
  roomInstanceId = uuid();
  getDb().prepare(
    `INSERT INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES (?, ?, ?, 'workspace', 'workspace', 'medium', NULL, ?, ?)`,
  ).run(roomInstanceId, room.id, actor.id, Date.now(), Date.now());
  token = signToken(actor);
  const generator: TtsGenerator = async (input) => {
    calls.push(input);
    await writeFile(input.outputPath, Buffer.from('fake-mp3'));
  };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/tts', createTtsRouter(generator));
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('tts_test_server');
  base = `http://127.0.0.1:${address.port}/api/v1/tts`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

describe('Voice Persona TTS contrôlé', () => {
  it('exige auth, Room et body strict', async () => {
    expect((await fetch(base, {method: 'POST'})).status).toBe(401);
    const response = await fetch(base, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: 'Bonjour', room_instance_id: roomInstanceId, voice: 'evil'}),
    });
    expect(response.status).toBe(400);
  });

  it('résout le speaker et impose la voix serveur', async () => {
    const response = await fetch(base, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: 'Bonjour MasterFlow', room_instance_id: roomInstanceId}),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('audio/mpeg');
    expect(await response.text()).toBe('fake-mp3');
    expect(calls.at(-1)).toMatchObject({voice: 'fr-FR-HenriNeural', text: 'Bonjour MasterFlow'});
    await expect(access(calls.at(-1)?.outputPath ?? '')).rejects.toThrow();

    const auditEvent = getDb()
      .prepare("SELECT detail_json FROM audit_logs WHERE event_type = 'tts.generated' ORDER BY created_at DESC")
      .get() as {detail_json: string};
    expect(auditEvent.detail_json).toContain('"text_length":18');
    expect(auditEvent.detail_json).not.toContain('Bonjour MasterFlow');
  });

  it('refuse texte trop long et persona attendu incohérent', async () => {
    const tooLong = await fetch(base, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({text: 'x'.repeat(1201), room_instance_id: roomInstanceId}),
    });
    expect(tooLong.status).toBe(400);
    const mismatch = await fetch(base, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        text: 'Bonjour',
        room_instance_id: roomInstanceId,
        expected_persona_id: 'persona-interdit',
      }),
    });
    expect(mismatch.status).toBe(403);
  });

  it('borne le débit par utilisateur sans persistance', () => {
    const userId = 'tts-quota-test';
    for (let index = 0; index < 10; index += 1) {
      expect(consumeTtsQuota(userId, 1_000 + index)).toBe(true);
    }
    expect(consumeTtsQuota(userId, 2_000)).toBe(false);
    expect(consumeTtsQuota(userId, 62_000)).toBe(true);
  });
});
