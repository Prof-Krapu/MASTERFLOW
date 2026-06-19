import {createHash} from 'node:crypto';

import {
  ActionContextComparisonSchema,
  ActionContextSnapshotSchema,
  type Action,
  type ActionContextComparison,
  type ActionContextSnapshot,
  type ActionContextSnapshotRef,
  type ContextReference,
} from '@masterflow/shared';

import {getDb, type ActionContextSnapshotRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getActiveHardStopForOwnerRoom} from './hard_stop.ts';
import {compileRuntimeContext} from './context_compiler.ts';

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(',')}}`;
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(canonicalize(value)).digest('hex');
}

function revisionFor(ref: ContextReference): string | null {
  const db = getDb();
  const tableByRef: Record<string, {table: string; column: 'updated_at' | 'created_at'}> = {
    user: {table: 'users', column: 'updated_at'},
    project: {table: 'projects', column: 'updated_at'},
    room: {table: 'rooms', column: 'updated_at'},
    room_instance: {table: 'room_instances', column: 'updated_at'},
    room_checkpoint: {table: 'room_checkpoints', column: 'created_at'},
    memory_card: {table: 'memory_cards', column: 'updated_at'},
  };
  const target = tableByRef[ref.ref_type];
  if (!target) return null;
  const row = db.prepare(`SELECT ${target.column} AS revision FROM ${target.table} WHERE id = ?`).get(ref.ref_id) as
    | {revision: number}
    | undefined;
  return row ? `${target.column}:${row.revision}` : null;
}

function normalizeRefs(refs: ContextReference[]): ActionContextSnapshotRef[] {
  const byKey = new Map<string, ActionContextSnapshotRef>();
  for (const ref of refs) {
    const key = `${ref.ref_type}:${ref.ref_id}`;
    if (!byKey.has(key)) {
      byKey.set(key, {ref_type: ref.ref_type, ref_id: ref.ref_id, revision_ref: revisionFor(ref)});
    }
  }
  return [...byKey.values()].sort((left, right) => `${left.ref_type}:${left.ref_id}`.localeCompare(`${right.ref_type}:${right.ref_id}`));
}

function toDto(row: ActionContextSnapshotRow): ActionContextSnapshot {
  return ActionContextSnapshotSchema.parse({
    snapshot_id: row.id,
    action_id: row.action_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    room_id: row.room_id,
    room_instance_id: row.room_instance_id,
    action_intent: row.action_intent,
    action_payload_fingerprint: row.action_payload_fingerprint,
    authoritative_refs: JSON.parse(row.authoritative_refs_json) as unknown,
    checkpoint_ref: row.checkpoint_ref_json ? JSON.parse(row.checkpoint_ref_json) as unknown : null,
    hard_stop_state_ref: row.hard_stop_state_ref,
    context_fingerprint: row.context_fingerprint,
    created_at: row.created_at,
  });
}

export function getActionContextSnapshot(actionId: string): ActionContextSnapshot | null {
  const row = getDb().prepare('SELECT * FROM action_context_snapshots WHERE action_id = ?').get(actionId) as
    | ActionContextSnapshotRow
    | undefined;
  return row ? toDto(row) : null;
}

/** Capture privée et immuable après un preflight sensible avec une vraie Room. */
export function captureActionContextSnapshot(actor: AuthUser, action: Action): ActionContextSnapshot | null {
  if (!action.room_id || getActionContextSnapshot(action.id)) return getActionContextSnapshot(action.id);
  const runtime = compileRuntimeContext(actor, {
    room_id: action.room_id,
    requested_tier: 'T2',
    purpose: `action_preflight:${action.intent}`,
  });
  const refs = normalizeRefs(runtime.authoritative_facts);
  const checkpointRef = runtime.checkpoint_ref
    ? refs.find((ref) => ref.ref_type === runtime.checkpoint_ref?.ref_type && ref.ref_id === runtime.checkpoint_ref.ref_id) ?? null
    : null;
  const hardStop = getActiveHardStopForOwnerRoom(actor.id, action.room_id);
  const createdAt = Date.now();
  const snapshot = {
    snapshot_id: uuid(),
    action_id: action.id,
    owner_id: actor.id,
    project_id: action.project_id,
    room_id: action.room_id,
    room_instance_id: runtime.scope.room_instance_id,
    action_intent: action.intent,
    action_payload_fingerprint: fingerprint(action.payload),
    authoritative_refs: refs,
    checkpoint_ref: checkpointRef,
    hard_stop_state_ref: hardStop?.id ?? null,
    context_fingerprint: fingerprint({schema_version: 1, refs}),
    created_at: createdAt,
  } satisfies ActionContextSnapshot;

  getDb().prepare(
    `INSERT INTO action_context_snapshots
       (id, action_id, owner_id, project_id, room_id, room_instance_id, action_intent,
        action_payload_fingerprint, authoritative_refs_json, checkpoint_ref_json,
        hard_stop_state_ref, context_fingerprint, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    snapshot.snapshot_id, snapshot.action_id, snapshot.owner_id, snapshot.project_id, snapshot.room_id,
    snapshot.room_instance_id, snapshot.action_intent, snapshot.action_payload_fingerprint,
    JSON.stringify(snapshot.authoritative_refs), JSON.stringify(snapshot.checkpoint_ref),
    snapshot.hard_stop_state_ref, snapshot.context_fingerprint, snapshot.created_at,
  );
  audit({
    event_type: 'action_context_snapshot_captured',
    user_id: actor.id,
    action_id: action.id,
    scope: `room:${action.room_id}`,
    detail: {ref_count: refs.length, context_fingerprint: snapshot.context_fingerprint},
  });
  return snapshot;
}

/** Compare le contexte courant sans modifier l'action, le snapshot ni aucun job. */
export function compareActionContextSnapshot(actor: AuthUser, action: Action): ActionContextComparison {
  const snapshot = getActionContextSnapshot(action.id);
  if (!snapshot || !action.room_id) {
    return ActionContextComparisonSchema.parse({
      action_id: action.id, snapshot_status: 'absent', comparison: 'inconclusive',
      changed_refs: [], missing_revision_refs: ['action_context_snapshot'],
      recommended_next_step: 'owner_review', mutation: false,
    });
  }
  const runtime = compileRuntimeContext(actor, {
    room_id: action.room_id,
    requested_tier: 'T2',
    purpose: `action_context_compare:${action.intent}`,
  });
  const currentRefs = normalizeRefs(runtime.authoritative_facts);
  const missing = [...snapshot.authoritative_refs, ...currentRefs]
    .filter((ref) => ref.revision_ref === null)
    .map((ref) => `${ref.ref_type}:${ref.ref_id}`);
  if (missing.length > 0) {
    return ActionContextComparisonSchema.parse({
      action_id: action.id, snapshot_status: 'found', comparison: 'inconclusive',
      changed_refs: [], missing_revision_refs: [...new Set(missing)].sort(),
      recommended_next_step: 'owner_review', mutation: false,
    });
  }
  const currentFingerprint = fingerprint({schema_version: 1, refs: currentRefs});
  if (currentFingerprint === snapshot.context_fingerprint) {
    return ActionContextComparisonSchema.parse({
      action_id: action.id, snapshot_status: 'found', comparison: 'unchanged',
      changed_refs: [], missing_revision_refs: [], recommended_next_step: 'none', mutation: false,
    });
  }
  const before = new Map(snapshot.authoritative_refs.map((ref) => [`${ref.ref_type}:${ref.ref_id}`, ref.revision_ref]));
  const after = new Map(currentRefs.map((ref) => [`${ref.ref_type}:${ref.ref_id}`, ref.revision_ref]));
  const changed = new Set<string>();
  for (const [key, revision] of before) if (after.get(key) !== revision) changed.add(key);
  for (const [key, revision] of after) if (before.get(key) !== revision) changed.add(key);
  return ActionContextComparisonSchema.parse({
    action_id: action.id, snapshot_status: 'found', comparison: 'requires_review',
    changed_refs: [...changed].sort(), missing_revision_refs: [],
    recommended_next_step: 're_preflight', mutation: false,
  });
}
