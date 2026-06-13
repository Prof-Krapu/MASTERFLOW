import {beforeAll, describe, expect, it} from 'vitest';

import {getDb, type RoomInstanceRow} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  checkpointMeaningfulRoomMutation,
  createRoomCheckpoint,
  getLatestRoomCheckpoint,
} from '../src/services/room_checkpoints.ts';

const owner: AuthUser = {id: 'checkpoint-owner', username: 'checkpoint_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'checkpoint-outsider', username: 'checkpoint_outsider', role: 'godmode'};
let instance: RoomInstanceRow;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(owner.id, owner.username, owner.username, owner.role, now, now);
  insertUser.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
     VALUES ('checkpoint-room', 'Checkpoint', 'workspace', ?, NULL, 0, ?, ?)`,
  ).run(owner.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES ('checkpoint-instance', 'checkpoint-room', ?, 'workspace', 'workspace',
             'medium', '{"active_mode":"learning"}', ?, ?)`,
  ).run(owner.id, now, now);
  instance = db
    .prepare("SELECT * FROM room_instances WHERE id = 'checkpoint-instance'")
    .get() as RoomInstanceRow;
});

describe('room checkpoints', () => {
  it('sauvegarde un resume prive et des references bornees', () => {
    const checkpoint = createRoomCheckpoint(owner, instance.id, {
      reason: 'manual_save',
      summary: 'Le cadrage est stable.',
      active_widgets: ['context_card'],
      active_mode: 'learning',
      decisions: ['Garder le format court'],
      open_loops: ['Choisir la ressource finale'],
      media_queue_refs: [],
      asset_queue_refs: [],
      resource_refs: ['resource-1'],
      next_recommended_action: 'Valider la ressource',
      rollback_light_possible: false,
    });
    expect(checkpoint).toMatchObject({
      user_id: owner.id,
      privacy_scope: 'private',
      summary: 'Le cadrage est stable.',
      resource_refs: ['resource-1'],
    });
  });

  it('ne revele jamais le checkpoint prive a un autre compte', () => {
    expect(getLatestRoomCheckpoint(outsider, instance.id)).toBeNull();
  });

  it('ignore une micro-mutation de densite', () => {
    const next = {...instance, cognitive_density: 'low', updated_at: Date.now()};
    expect(checkpointMeaningfulRoomMutation(owner, instance, next)).toBeNull();
  });

  it('cree un checkpoint lors d un vrai changement de mode', () => {
    const next = {
      ...instance,
      active_surface: 'review',
      widget_state_json: '{"active_mode":"review"}',
      updated_at: Date.now(),
    };
    const checkpoint = checkpointMeaningfulRoomMutation(owner, instance, next);
    expect(checkpoint).toMatchObject({
      reason: 'mode_change',
      active_mode: 'review',
      rollback_light_possible: true,
    });
  });
});
