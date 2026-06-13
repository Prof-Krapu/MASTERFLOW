import {
  RoomCheckpointSchema,
  type CreateRoomCheckpoint,
  type RoomCheckpoint,
} from '@masterflow/shared';

import {
  getDb,
  type RoomCheckpointRow,
  type RoomInstanceRow,
  type RoomRow,
} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getOwnedAccessibleRoomInstance} from './room_access.ts';

const MAX_CHECKPOINTS_PER_INSTANCE = 20;

function parseList(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
}

function toDTO(row: RoomCheckpointRow): RoomCheckpoint {
  return RoomCheckpointSchema.parse({
    checkpoint_id: row.id,
    room_id: row.room_id,
    room_instance_id: row.room_instance_id,
    user_id: row.user_id,
    project_id: row.project_id,
    reason: row.reason,
    summary: row.summary,
    active_widgets: parseList(row.active_widgets_json),
    active_mode: row.active_mode,
    decisions: parseList(row.decisions_json),
    open_loops: parseList(row.open_loops_json),
    media_queue_refs: parseList(row.media_queue_refs_json),
    asset_queue_refs: parseList(row.asset_queue_refs_json),
    resource_refs: parseList(row.resource_refs_json),
    next_recommended_action: row.next_recommended_action,
    rollback_light_possible: row.rollback_light_possible === 1,
    privacy_scope: row.privacy_scope,
    created_at: row.created_at,
  });
}

function pruneOldCheckpoints(instanceId: string): void {
  getDb()
    .prepare(
      `DELETE FROM room_checkpoints
        WHERE room_instance_id = ?
          AND id NOT IN (
            SELECT id FROM room_checkpoints
             WHERE room_instance_id = ?
             ORDER BY created_at DESC
             LIMIT ?
          )`,
    )
    .run(instanceId, instanceId, MAX_CHECKPOINTS_PER_INSTANCE);
}

export function createRoomCheckpoint(
  actor: AuthUser,
  instanceId: string,
  input: CreateRoomCheckpoint,
): RoomCheckpoint {
  const instance = getOwnedAccessibleRoomInstance(actor, instanceId);
  if (!instance) throw new Error('room_instance_not_found');
  const room = getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(instance.room_id) as
    | RoomRow
    | undefined;
  if (!room) throw new Error('room_not_found');

  const id = uuid();
  const createdAt = Date.now();
  getDb()
    .prepare(
      `INSERT INTO room_checkpoints
         (id, room_id, room_instance_id, user_id, project_id, reason, summary,
          active_widgets_json, active_mode, decisions_json, open_loops_json,
          media_queue_refs_json, asset_queue_refs_json, resource_refs_json,
          next_recommended_action, rollback_light_possible, privacy_scope, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'private', ?)`,
    )
    .run(
      id,
      room.id,
      instance.id,
      actor.id,
      room.project_id,
      input.reason,
      input.summary,
      JSON.stringify(input.active_widgets),
      input.active_mode,
      JSON.stringify(input.decisions),
      JSON.stringify(input.open_loops),
      JSON.stringify(input.media_queue_refs),
      JSON.stringify(input.asset_queue_refs),
      JSON.stringify(input.resource_refs),
      input.next_recommended_action,
      input.rollback_light_possible ? 1 : 0,
      createdAt,
    );
  pruneOldCheckpoints(instance.id);
  return getLatestRoomCheckpoint(actor, instance.id)!;
}

export function getLatestRoomCheckpoint(
  actor: AuthUser,
  instanceId: string,
): RoomCheckpoint | null {
  const instance = getOwnedAccessibleRoomInstance(actor, instanceId);
  if (!instance) return null;
  const row = getDb()
    .prepare(
      `SELECT * FROM room_checkpoints
        WHERE room_instance_id = ? AND user_id = ?
        ORDER BY created_at DESC LIMIT 1`,
    )
    .get(instance.id, actor.id) as RoomCheckpointRow | undefined;
  return row ? toDTO(row) : null;
}

function widgetMode(instance: RoomInstanceRow): string | null {
  try {
    const state = JSON.parse(instance.widget_state_json ?? '{}') as Record<string, unknown>;
    return typeof state['active_mode'] === 'string' ? state['active_mode'] : null;
  } catch {
    return null;
  }
}

export function checkpointMeaningfulRoomMutation(
  actor: AuthUser,
  previous: RoomInstanceRow,
  next: RoomInstanceRow,
): RoomCheckpoint | null {
  const previousMode = widgetMode(previous) ?? previous.active_surface;
  const nextMode = widgetMode(next) ?? next.active_surface;
  if (previousMode === nextMode) return null;

  return createRoomCheckpoint(actor, next.id, {
    reason: 'mode_change',
    summary: `Mode changed from ${previousMode} to ${nextMode}.`,
    active_widgets: [],
    active_mode: nextMode,
    decisions: [],
    open_loops: [],
    media_queue_refs: [],
    asset_queue_refs: [],
    resource_refs: [],
    next_recommended_action: null,
    rollback_light_possible: true,
  });
}
