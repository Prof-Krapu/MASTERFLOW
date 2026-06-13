import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildSystemPrompt, resolveSpeaker} from '../src/routers/ws/chat.ts';
import {compileRuntimeContext} from '../src/services/context_compiler.ts';

const actor: AuthUser = {id: 'chat-context-user', username: 'chat_context_user', role: 'student'};
let instanceId: string;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', 'student', 1, ?, ?)`,
  ).run(actor.id, actor.username, actor.username, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
     VALUES ('chat-context-room', 'Chat context', 'workspace', ?,
             '{"allowed_persona_ids":["masterflow-system-001"],"allowed_action_ids":["get_current_context"]}',
             0, ?, ?)`,
  ).run(actor.id, now, now);
  instanceId = 'chat-context-instance';
  db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES (?, 'chat-context-room', ?, 'workspace', 'workspace', 'medium',
             '{"active_persona":"profkrapu-001"}', ?, ?)`,
  ).run(instanceId, actor.id, now, now);
});

describe('WS bounded context', () => {
  it('ignore un persona actif absent du loadout', () => {
    const resolved = resolveSpeaker(actor, instanceId);
    expect(resolved.speaker.id).toBe('masterflow-system-001');
  });

  it('injecte un contexte borne sans accorder de nouveaux pouvoirs', () => {
    const runtime = compileRuntimeContext(actor, {
      purpose: 'ws_chat',
      requested_tier: 'T1',
      room_instance_id: instanceId,
    });
    const prompt = buildSystemPrompt(resolveSpeaker(actor, instanceId).speaker, null, runtime, []);
    expect(prompt.length).toBeLessThanOrEqual(8_000);
    expect(prompt).toContain('Actions UI autorisees: get_current_context');
    expect(prompt).toContain('Aucune source citee disponible');
    expect(prompt).toContain('ne t accorde aucun pouvoir supplementaire');
    expect(prompt).not.toContain('view_users');
  });
});
