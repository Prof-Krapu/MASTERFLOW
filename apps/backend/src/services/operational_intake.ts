import {
  CreateOperationalIntakeRequestSchema,
  OperationalIntakeItemSchema,
  ROLE_RANK,
  SoftArchiveOperationalIntakeSchema,
  type CreateOperationalIntakeRequest,
  type OperationalIntakeItem,
} from '@masterflow/shared';

import {getDb, type OperationalIntakeRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getProject} from './projects.ts';

function toItem(row: OperationalIntakeRow): OperationalIntakeItem {
  return OperationalIntakeItemSchema.parse({
    intake_id: row.id,
    kind: row.kind,
    project_id: row.project_id,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    title: row.title,
    detail_ref: row.detail_ref,
    provenance: row.provenance,
    evidence_refs: JSON.parse(row.evidence_refs_json) as unknown,
    moderation_target_ref: row.moderation_target_ref,
    requested_by: row.requested_by,
    owner_id: row.owner_id,
    status: row.status,
    idempotency_key: row.idempotency_key,
    archived_at: row.archived_at,
    archived_by: row.archived_by,
    archive_reason: row.archive_reason,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}
function assertCreateScope(actor: AuthUser, request: ReturnType<typeof CreateOperationalIntakeRequestSchema.parse>): void {
  if (request.scope_type === 'personal') {
    if (request.scope_id !== actor.id || request.project_id !== null) throw new Error('operational_intake_scope_denied');
  } else if (request.scope_type === 'project') {
    if (!request.project_id || request.scope_id !== request.project_id) throw new Error('operational_intake_scope_mismatch');
    getProject(actor, request.project_id);
  } else if (ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('operational_intake_system_scope_denied');
  }
  if (['announcement', 'news', 'moderation'].includes(request.kind) && ROLE_RANK[actor.role] < ROLE_RANK.teacher) {
    throw new Error('operational_intake_kind_denied');
  }
}

export function createOperationalIntake(
  actor: AuthUser,
  input: CreateOperationalIntakeRequest,
): OperationalIntakeItem {
  const request = CreateOperationalIntakeRequestSchema.parse(input);
  assertCreateScope(actor, request);
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM operational_intake_items WHERE owner_id = ? AND kind = ? AND idempotency_key = ?',
  ).get(actor.id, request.kind, request.idempotency_key) as OperationalIntakeRow | undefined;
  if (existing) return toItem(existing);

  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO operational_intake_items
       (id, kind, project_id, scope_type, scope_id, title, detail_ref, provenance,
        evidence_refs_json, moderation_target_ref, requested_by, owner_id, status,
        idempotency_key, archived_at, archived_by, archive_reason, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, NULL, NULL, NULL, ?, ?)`,
  ).run(
    id,
    request.kind,
    request.project_id,
    request.scope_type,
    request.scope_id,
    request.title,
    request.detail_ref,
    request.provenance,
    JSON.stringify(request.evidence_refs),
    request.moderation_target_ref,
    actor.id,
    actor.id,
    request.idempotency_key,
    now,
    now,
  );
  audit({
    event_type: 'operational_intake.created',
    user_id: actor.id,
    scope: `${request.scope_type}:${request.scope_id}`,
    detail: {intake_id: id, kind: request.kind, status: 'candidate'},
  });
  return getOperationalIntake(actor, id);
}

export function getOperationalIntake(actor: AuthUser, intakeId: string): OperationalIntakeItem {
  const row = getDb().prepare('SELECT * FROM operational_intake_items WHERE id = ?').get(intakeId) as
    | OperationalIntakeRow
    | undefined;
  if (!row) throw new Error('operational_intake_not_found');
  if (row.scope_type === 'personal' && row.owner_id !== actor.id) throw new Error('operational_intake_not_found');
  if (row.scope_type === 'project' && row.project_id) getProject(actor, row.project_id);
  if (row.scope_type === 'system' && ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('operational_intake_not_found');
  }
  return toItem(row);
}

export function listOperationalIntake(
  actor: AuthUser,
  scopeType: 'personal' | 'project' | 'system',
  scopeId: string,
): OperationalIntakeItem[] {
  if (scopeType === 'personal' && scopeId !== actor.id) throw new Error('operational_intake_scope_denied');
  if (scopeType === 'project') getProject(actor, scopeId);
  if (scopeType === 'system' && ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('operational_intake_system_scope_denied');
  }
  return (getDb().prepare(
    `SELECT * FROM operational_intake_items
     WHERE scope_type = ? AND scope_id = ? AND status != 'soft_archived'
     ORDER BY updated_at DESC, id`,
  ).all(scopeType, scopeId) as OperationalIntakeRow[]).map(toItem);
}

/** Exécuteur sensible : appelé uniquement par Action Engine après validation humaine. */
export function executeSoftArchiveOperationalIntake(
  actor: AuthUser,
  action: {payload: unknown},
): Record<string, unknown> {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('operational_intake_archive_role_denied');
  const payload = SoftArchiveOperationalIntakeSchema.parse(action.payload);
  const db = getDb();
  const row = db.prepare('SELECT * FROM operational_intake_items WHERE id = ?').get(payload.intake_id) as
    | OperationalIntakeRow
    | undefined;
  if (!row) throw new Error('operational_intake_not_found');
  if (row.project_id) getProject(actor, row.project_id);
  if (row.scope_type === 'system' && ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('operational_intake_archive_scope_denied');
  }
  if (row.status === 'soft_archived') {
    return {intake_id: row.id, status: row.status, idempotent: true, physically_deleted: false};
  }
  const now = Date.now();
  db.prepare(
    `UPDATE operational_intake_items
     SET status = 'soft_archived', archived_at = ?, archived_by = ?, archive_reason = ?, updated_at = ?
     WHERE id = ?`,
  ).run(now, actor.id, payload.reason, now, row.id);
  audit({
    event_type: 'operational_intake.soft_archived',
    user_id: actor.id,
    scope: `${row.scope_type}:${row.scope_id}`,
    detail: {intake_id: row.id, kind: row.kind, physically_deleted: false},
  });
  return {intake_id: row.id, status: 'soft_archived', idempotent: false, physically_deleted: false};
}
