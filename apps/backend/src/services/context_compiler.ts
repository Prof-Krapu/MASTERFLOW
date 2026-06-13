import {
  RuntimeContextEnvelopeSchema,
  type CompileRuntimeContextRequest,
  type ContextReference,
  type ContextTier,
  type RejectedContextReference,
  type RuntimeContextEnvelope,
} from '@masterflow/shared';

import {getDb, type RoomInstanceRow, type RoomRow} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {
  getAccessibleRoom,
  getOwnedAccessibleRoomInstance,
  listAccessibleRooms,
} from './room_access.ts';
import {deriveUserRuntimeLoadout} from './runtime_loadout.ts';
import {getLatestRoomCheckpoint} from './room_checkpoints.ts';
import {queryRag} from './rag.ts';
import {listActiveMemoryCardRefs} from './memory_cards.ts';

const MAX_REFS = 24;
const MAX_CHARS = 4_000;
const MAX_RUNTIME_TIER: ContextTier = 'T2';
const TIER_RANK: Record<ContextTier, number> = {
  T0: 0,
  T1: 1,
  T2: 2,
  T3: 3,
  T4: 4,
  T5: 5,
};

export class ContextCompilationError extends Error {
  constructor(public readonly code: 'room_not_found' | 'room_access_denied' | 'instance_access_denied') {
    super(code);
  }
}

function resolveAnchorRoom(actor: AuthUser): RoomRow | null {
  const rooms = listAccessibleRooms(actor);
  return (
    rooms.find((room) => room.owner_id === actor.id && room.type === 'home') ??
    rooms.find((room) => room.owner_id === actor.id) ??
    rooms[0] ??
    null
  );
}

function ensureInstance(actor: AuthUser, room: RoomRow): RoomInstanceRow {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM room_instances WHERE room_id = ? AND user_id = ?')
    .get(room.id, actor.id) as RoomInstanceRow | undefined;
  if (existing) return existing;

  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES (?, ?, ?, 'workspace', 'workspace', 'medium', NULL, ?, ?)`,
  ).run(id, room.id, actor.id, now, now);
  return db.prepare('SELECT * FROM room_instances WHERE id = ?').get(id) as RoomInstanceRow;
}

function refChars(ref: ContextReference): number {
  return JSON.stringify(ref).length;
}

export function compileRuntimeContext(
  actor: AuthUser,
  input: CompileRuntimeContextRequest,
): RuntimeContextEnvelope {
  let room: RoomRow | null = null;
  let instance: RoomInstanceRow | null = null;

  if (input.room_instance_id) {
    instance = getOwnedAccessibleRoomInstance(actor, input.room_instance_id);
    if (!instance) throw new ContextCompilationError('instance_access_denied');
    room = getAccessibleRoom(actor, instance.room_id);
  } else if (input.room_id) {
    room = getAccessibleRoom(actor, input.room_id);
    if (!room) {
      const exists = getDb().prepare('SELECT 1 AS hit FROM rooms WHERE id = ?').get(input.room_id);
      throw new ContextCompilationError(exists ? 'room_access_denied' : 'room_not_found');
    }
  } else {
    room = resolveAnchorRoom(actor);
  }

  if (!room) throw new ContextCompilationError('room_not_found');
  instance ??= ensureInstance(actor, room);

  const requestedTier = input.requested_tier;
  const grantedTier =
    TIER_RANK[requestedTier] > TIER_RANK[MAX_RUNTIME_TIER] ? MAX_RUNTIME_TIER : requestedTier;
  const rejected: RejectedContextReference[] = [];
  if (grantedTier !== requestedTier) {
    rejected.push({
      ref_type: 'context_tier',
      ref_id: requestedTier,
      reason: `runtime_tier_capped_at_${MAX_RUNTIME_TIER}`,
    });
  }

  const candidates: ContextReference[] = [
    {
      ref_type: 'user',
      ref_id: actor.id,
      authority: 'authoritative',
      source: 'users',
      scope_type: 'user',
      scope_id: actor.id,
    },
    ...(room.project_id
      ? [{
          ref_type: 'project',
          ref_id: room.project_id,
          authority: 'authoritative' as const,
          source: 'projects',
          scope_type: 'project' as const,
          scope_id: room.project_id,
        }]
      : []),
    {
      ref_type: 'room',
      ref_id: room.id,
      authority: 'authoritative',
      source: 'rooms',
      scope_type: 'room',
      scope_id: room.id,
    },
    {
      ref_type: 'room_instance',
      ref_id: instance.id,
      authority: 'authoritative',
      source: 'room_instances',
      scope_type: 'room_instance',
      scope_id: instance.id,
    },
  ];
  const checkpoint = getLatestRoomCheckpoint(actor, instance.id);
  const checkpointRef: ContextReference | null = checkpoint
    ? {
        ref_type: 'room_checkpoint',
        ref_id: checkpoint.checkpoint_id,
        authority: 'authoritative',
        source: 'room_checkpoints',
        scope_type: 'room_instance',
        scope_id: instance.id,
      }
    : null;
  if (checkpointRef) candidates.push(checkpointRef);

  if (room.project_id && TIER_RANK[grantedTier] >= TIER_RANK.T2) {
    const resources = getDb()
      .prepare(
        `SELECT r.id, r.status
           FROM resources r
           INNER JOIN resource_scopes rs ON rs.resource_id = r.id
          WHERE rs.scope_type = 'project' AND rs.scope_id = ?
          ORDER BY r.created_at DESC`,
      )
      .all(room.project_id) as Array<{id: string; status: string}>;
    for (const resource of resources) {
      if (resource.status !== 'validated') {
        rejected.push({
          ref_type: 'resource',
          ref_id: resource.id,
          reason: 'resource_not_validated',
        });
        continue;
      }
      candidates.push({
        ref_type: 'resource',
        ref_id: resource.id,
        authority: 'authoritative',
        source: 'resource_registry',
        scope_type: 'project',
        scope_id: room.project_id,
      });
    }
  }
  if (TIER_RANK[grantedTier] >= TIER_RANK.T2) {
    for (const card of listActiveMemoryCardRefs(actor, room.project_id)) {
      candidates.push({
        ref_type: 'memory_card',
        ref_id: card.id,
        authority: 'derived',
        source: 'memory_cards',
        scope_type: card.scope === 'project' ? 'project' : 'user',
        scope_id: card.scopeId,
      });
    }
  }

  const loaded: ContextReference[] = [];
  let usedChars = 0;
  for (const candidate of candidates) {
    const chars = refChars(candidate);
    if (loaded.length >= MAX_REFS || usedChars + chars > MAX_CHARS) {
      rejected.push({
        ref_type: candidate.ref_type,
        ref_id: candidate.ref_id,
        reason: 'context_budget_exceeded',
      });
      continue;
    }
    loaded.push(candidate);
    usedChars += chars;
  }

  const loadout = deriveUserRuntimeLoadout(actor, room, instance);
  const ragResponse =
    input.rag_query && TIER_RANK[grantedTier] >= TIER_RANK.T2
      ? queryRag(actor, {
          query: input.rag_query,
          project_id: room.project_id,
          room_instance_id: instance.id,
          purpose: input.purpose,
          context_tier: grantedTier,
          limit: 5,
        })
      : null;
  const ragPackRef: ContextReference | null = ragResponse
    ? {
        ref_type: 'rag_context_pack',
        ref_id: ragResponse.context_pack.pack_id,
        authority: 'derived',
        source: `rag_${ragResponse.context_pack.retrieval_strategy}`,
        scope_type: room.project_id ? 'project' : 'user',
        scope_id: room.project_id ?? actor.id,
      }
    : null;
  const uncertainty =
    ragResponse?.refusal_reason !== null && ragResponse?.refusal_reason !== undefined
      ? [`rag:${ragResponse.refusal_reason}`]
      : [];
  const authoritativeRefs = loaded.filter((ref) => ref.authority === 'authoritative');
  const derivedRefs = loaded.filter((ref) => ref.authority === 'derived');
  const envelope: RuntimeContextEnvelope = {
    actor: {user_id: actor.id, role: actor.role},
    scope: {
      project_id: room.project_id,
      room_id: room.id,
      room_instance_id: instance.id,
    },
    room_runtime: {
      room_type: room.type,
      zoom_level: instance.zoom_level as RuntimeContextEnvelope['room_runtime']['zoom_level'],
      active_surface: instance.active_surface,
      cognitive_density:
        instance.cognitive_density as RuntimeContextEnvelope['room_runtime']['cognitive_density'],
    },
    authoritative_facts: authoritativeRefs,
    derived_context:
      ragPackRef && ragResponse?.context_pack.status === 'active'
        ? [...derivedRefs, ragPackRef]
        : derivedRefs,
    allowed_action_ids: loadout.available_action_ids,
    allowed_persona_ids: loadout.available_persona_ids,
    checkpoint_ref: checkpointRef,
    rag_context_pack_ref: ragPackRef,
    trace: {
      purpose: input.purpose,
      requested_tier: requestedTier,
      granted_tier: grantedTier,
      loaded_refs: loaded,
      rejected_refs: rejected,
      missing_context: [],
      uncertainty,
      budget: {
        max_refs: MAX_REFS,
        max_chars: MAX_CHARS,
        used_refs: loaded.length,
        used_chars: usedChars,
      },
    },
    compiled_at: Date.now(),
  };

  getDb()
    .prepare(
      `INSERT INTO audit_logs
         (id, user_id, action_id, event_type, scope, detail_json, created_at)
       VALUES (?, ?, NULL, 'context_compiled', ?, ?, ?)`,
    )
    .run(
      uuid(),
      actor.id,
      room.project_id ? `project:${room.project_id}` : `room:${room.id}`,
      JSON.stringify({
        room_id: room.id,
        room_instance_id: instance.id,
        purpose: input.purpose,
        requested_tier: requestedTier,
        granted_tier: grantedTier,
        loaded_ref_count: loaded.length,
        rejected_ref_count: rejected.length,
      }),
      envelope.compiled_at,
    );

  return RuntimeContextEnvelopeSchema.parse(envelope);
}
