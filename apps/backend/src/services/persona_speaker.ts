import type {Persona} from '@masterflow/shared';

import {getDb, type RoomInstanceRow, type RoomRow} from '../db/schema.ts';
import {getActiveBlend, getPersona, methodAttribution} from '../engines/persona_engine.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {deriveUserRuntimeLoadout} from './runtime_loadout.ts';
import {getOwnedAccessibleRoomInstance} from './room_access.ts';

const DEFAULT_PERSONA_ID = 'masterflow-system-001';

/** Résout l'unique porte-parole autorisé pour une Room accessible. */
export function resolvePersonaSpeaker(
  actor: AuthUser,
  roomInstanceId: string,
): {speaker: Persona; methodAttr: string | null} {
  const instance = getOwnedAccessibleRoomInstance(actor, roomInstanceId);
  if (!instance) throw new Error('room_instance_unavailable');
  const room = getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(instance.room_id) as
    | RoomRow
    | undefined;
  if (!room) throw new Error('room_unavailable');
  const loadout = deriveUserRuntimeLoadout(actor, room, instance);
  const allowed = new Set(loadout.available_persona_ids);
  const blend = getActiveBlend(roomInstanceId);
  if (blend && allowed.has(blend.primary_persona.id)) {
    const methodAttr =
      blend.secondary_persona && allowed.has(blend.secondary_persona.id)
        ? methodAttribution(blend.secondary_persona)
        : null;
    return {speaker: blend.primary_persona, methodAttr};
  }

  const row = getDb()
    .prepare('SELECT * FROM room_instances WHERE id = ?')
    .get(roomInstanceId) as RoomInstanceRow | undefined;
  if (row?.widget_state_json) {
    const state = JSON.parse(row.widget_state_json) as Record<string, unknown>;
    const activeId = typeof state['active_persona'] === 'string' ? state['active_persona'] : null;
    const persona = activeId ? getPersona(activeId) : null;
    if (persona && allowed.has(persona.id)) return {speaker: persona, methodAttr: null};
  }

  const fallback = getPersona(loadout.available_persona_ids[0] ?? DEFAULT_PERSONA_ID);
  if (!fallback) throw new Error('persona_speaker_unavailable');
  return {speaker: fallback, methodAttr: null};
}
