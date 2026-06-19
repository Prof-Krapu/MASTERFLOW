import {
  ActivateHardStopRequestSchema,
  HardStopControlStateSchema,
  ResumeHardStopRequestSchema,
  type ActivateHardStopRequest,
  type HardStopControlState,
  type ResumeHardStopRequest,
} from '@masterflow/shared';

import {getDb, type HardStopControlStateRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getAccessibleRoom} from './room_access.ts';

function toDto(row: HardStopControlStateRow): HardStopControlState {
  return HardStopControlStateSchema.parse(row);
}

export function getActiveHardStopForOwnerRoom(ownerId: string, roomId: string): HardStopControlState | null {
  const row = getDb().prepare(
    `SELECT * FROM hard_stop_control_states
      WHERE owner_id = ? AND room_id = ? AND status = 'active'`,
  ).get(ownerId, roomId) as HardStopControlStateRow | undefined;
  return row ? toDto(row) : null;
}

export function getActiveHardStop(actor: AuthUser, roomId: string): HardStopControlState | null {
  if (!getAccessibleRoom(actor, roomId)) throw new Error('[hard_stop] room_access_denied');
  return getActiveHardStopForOwnerRoom(actor.id, roomId);
}

export function activateHardStop(actor: AuthUser, input: ActivateHardStopRequest): HardStopControlState {
  const request = ActivateHardStopRequestSchema.parse(input);
  if (!getAccessibleRoom(actor, request.room_id)) throw new Error('[hard_stop] room_access_denied');
  const existing = getActiveHardStopForOwnerRoom(actor.id, request.room_id);
  if (existing) return existing;

  const now = Date.now();
  const id = uuid();
  getDb().prepare(
    `INSERT INTO hard_stop_control_states
       (id, owner_id, room_id, status, reason, note, activated_by, released_by,
        created_at, updated_at, released_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?, NULL, ?, ?, NULL)`,
  ).run(id, actor.id, request.room_id, request.reason, request.note ?? null, actor.id, now, now);

  audit({
    event_type: 'hard_stop_activated',
    user_id: actor.id,
    scope: `room:${request.room_id}`,
    detail: {owner_id: actor.id, room_id: request.room_id, reason: request.reason},
  });
  return getActiveHardStopForOwnerRoom(actor.id, request.room_id) as HardStopControlState;
}

export function resumeHardStop(actor: AuthUser, input: ResumeHardStopRequest): HardStopControlState {
  const request = ResumeHardStopRequestSchema.parse(input);
  if (!getAccessibleRoom(actor, request.room_id)) throw new Error('[hard_stop] room_access_denied');
  const existing = getActiveHardStopForOwnerRoom(actor.id, request.room_id);
  if (!existing) throw new Error('[hard_stop] no_active_hard_stop');

  const now = Date.now();
  getDb().prepare(
    `UPDATE hard_stop_control_states
        SET status = 'released', released_by = ?, released_at = ?, updated_at = ?,
            note = COALESCE(?, note)
      WHERE id = ? AND status = 'active'`,
  ).run(actor.id, now, now, request.note ?? null, existing.id);

  audit({
    event_type: 'hard_stop_released',
    user_id: actor.id,
    scope: `room:${request.room_id}`,
    detail: {owner_id: actor.id, room_id: request.room_id, stale_actions_reactivated: false},
  });
  const row = getDb().prepare('SELECT * FROM hard_stop_control_states WHERE id = ?').get(existing.id) as HardStopControlStateRow;
  return toDto(row);
}
