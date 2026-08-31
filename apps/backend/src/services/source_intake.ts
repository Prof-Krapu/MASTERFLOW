import {
  ROLE_RANK,
  SourceGovernancePreviewSchema,
  SourceIntakeRecordSchema,
  SourceIntakeRequestSchema,
  type SourceIntakeRecord,
  type SourceIntakeRequest,
  type SourceIntakeRole,
  type SourceGovernanceOperation,
  type SourceGovernancePreview,
} from '@masterflow/shared';

import {getDb, type SourceIntakeRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getProject} from './projects.ts';
import {getRuntimePack} from './runtime_pack_registry.ts';

function visibleSourceRoles(actor: AuthUser): Set<SourceIntakeRole> {
  if (actor.role === 'student') return new Set(['student', 'shared']);
  if (actor.role === 'teacher') return new Set(['student', 'teacher', 'shared']);
  return new Set(['student', 'teacher', 'team', 'shared']);
}

function assertSourceRef(
  sourceRef: string,
  namespace: string,
  sourceRole: SourceIntakeRole,
): void {
  const [refNamespace, refRole] = sourceRef.split(':', 3);
  if (refNamespace !== namespace) throw new Error('source_namespace_mismatch');
  if (refRole !== sourceRole) throw new Error('source_role_mismatch');
}

function toRecord(row: SourceIntakeRow): SourceIntakeRecord {
  return SourceIntakeRecordSchema.parse({
    intake_id: row.id,
    runtime_pack_id: row.runtime_pack_id,
    pilot_id: row.pilot_id,
    project_id: row.project_id,
    owner_id: row.owner_id,
    source_ref: row.source_ref,
    label: row.label,
    source_role: row.source_role,
    content_sha256: row.content_sha256,
    provenance: row.provenance,
    rights: row.rights,
    freshness_at: row.freshness_at,
    retention_until: row.retention_until,
    consent_status: row.consent_status,
    legal_hold: row.legal_hold === 1,
    export_allowed: row.export_allowed === 1,
    purge_state: row.purge_state,
    rollback_ref: row.rollback_ref,
    evidence_refs: JSON.parse(row.evidence_refs_json) as unknown,
    original_immutable: true,
    status: row.status,
    persisted: true,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

/** Simule ou enregistre uniquement le manifeste d'une source ; aucun contenu original n'est copié. */
export function intakeSource(
  actor: AuthUser,
  input: SourceIntakeRequest,
): SourceIntakeRecord {
  const request = SourceIntakeRequestSchema.parse(input);
  getProject(actor, request.project_id);
  const pack = getRuntimePack(request.runtime_pack_id);
  if (!pack?.pilot_scope) throw new Error('pilot_runtime_pack_required');
  if (!pack.pilot_scope.allowed_source_roles.includes(request.source_role)) {
    throw new Error('source_role_not_allowed_by_pack');
  }
  if (!visibleSourceRoles(actor).has(request.source_role)) {
    throw new Error('source_role_not_visible_to_actor');
  }
  assertSourceRef(request.source_ref, pack.pilot_scope.source_namespace, request.source_role);

  const now = Date.now();
  const candidate = SourceIntakeRecordSchema.parse({
    intake_id: uuid(),
    runtime_pack_id: pack.pack_id,
    pilot_id: pack.pilot_scope.pilot_id,
    project_id: request.project_id,
    owner_id: actor.id,
    source_ref: request.source_ref,
    label: request.label,
    source_role: request.source_role,
    content_sha256: request.content_sha256,
    provenance: request.provenance,
    rights: request.rights,
    freshness_at: request.freshness_at,
    retention_until: request.retention_until,
    consent_status: request.consent_status,
    legal_hold: request.legal_hold,
    export_allowed: request.export_allowed,
    purge_state: 'active',
    rollback_ref: null,
    evidence_refs: request.evidence_refs,
    original_immutable: true,
    status: request.mode === 'simulate' ? 'simulated' : 'candidate',
    persisted: request.mode === 'register_candidate',
    created_at: now,
    updated_at: now,
  });
  if (request.mode === 'simulate') return candidate;
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('source_registration_role_denied');

  getDb()
    .prepare(
      `INSERT OR IGNORE INTO source_intake_records
         (id, runtime_pack_id, pilot_id, project_id, owner_id, source_ref, label, source_role,
          content_sha256, provenance, rights, freshness_at, retention_until, consent_status,
          legal_hold, export_allowed, purge_state, rollback_ref, evidence_refs_json,
          original_immutable, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NULL, ?, 1, 'candidate', ?, ?)`,
    )
    .run(
      candidate.intake_id,
      candidate.runtime_pack_id,
      candidate.pilot_id,
      candidate.project_id,
      candidate.owner_id,
      candidate.source_ref,
      candidate.label,
      candidate.source_role,
      candidate.content_sha256,
      candidate.provenance,
      candidate.rights,
      candidate.freshness_at,
      candidate.retention_until,
      candidate.consent_status,
      candidate.legal_hold ? 1 : 0,
      candidate.export_allowed ? 1 : 0,
      JSON.stringify(candidate.evidence_refs),
      now,
      now,
    );
  const row = getDb()
    .prepare(
      `SELECT * FROM source_intake_records
       WHERE runtime_pack_id = ? AND project_id = ? AND source_ref = ? AND content_sha256 = ?`,
    )
    .get(pack.pack_id, request.project_id, request.source_ref, request.content_sha256) as
    | SourceIntakeRow
    | undefined;
  if (!row) throw new Error('source_intake_write_failed');
  audit({
    event_type: 'source_intake.candidate_registered',
    user_id: actor.id,
    scope: request.project_id,
    detail: {
      intake_id: row.id,
      runtime_pack_id: pack.pack_id,
      source_ref: request.source_ref,
      content_sha256: request.content_sha256,
      original_immutable: true,
    },
  });
  return toRecord(row);
}

/** Liste uniquement les manifests visibles par le rôle effectif dans un projet accessible. */
export function listSourceIntake(
  actor: AuthUser,
  runtimePackId: string,
  projectId: string,
): SourceIntakeRecord[] {
  getProject(actor, projectId);
  const pack = getRuntimePack(runtimePackId);
  if (!pack?.pilot_scope) throw new Error('pilot_runtime_pack_required');
  const visibleRoles = [...visibleSourceRoles(actor)];
  const placeholders = visibleRoles.map(() => '?').join(', ');
  const rows = getDb()
    .prepare(
      `SELECT * FROM source_intake_records
       WHERE runtime_pack_id = ? AND project_id = ? AND status != 'soft_archived'
         AND source_role IN (${placeholders})
       ORDER BY updated_at DESC, id`,
    )
    .all(runtimePackId, projectId, ...visibleRoles) as SourceIntakeRow[];
  return rows.map(toRecord);
}

/**
 * Prépare une opération de gouvernance sans la réaliser. Toute mutation reste soumise
 * à une action sensible validée ; ce preview n'exporte, ne purge et n'archive rien.
 */
export function previewSourceGovernance(
  actor: AuthUser,
  intakeId: string,
  operation: SourceGovernanceOperation,
): SourceGovernancePreview {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('source_governance_role_denied');
  const row = getDb()
    .prepare('SELECT * FROM source_intake_records WHERE id = ?')
    .get(intakeId) as SourceIntakeRow | undefined;
  if (!row) throw new Error('source_intake_not_found');
  getProject(actor, row.project_id);

  const blockedReasons: string[] = [];
  const plannedPatch: Record<string, unknown> = {};
  if (operation === 'export_preview') {
    if (!row.export_allowed) blockedReasons.push('export_not_authorized');
    if (row.rights === 'restricted' || row.rights === 'unknown') blockedReasons.push('rights_not_exportable');
    if (!['not_required', 'granted'].includes(row.consent_status)) blockedReasons.push('consent_not_exportable');
    if (row.status === 'soft_archived') blockedReasons.push('source_soft_archived');
    plannedPatch.export_manifest_only = true;
  } else if (operation === 'request_purge' || operation === 'soft_archive') {
    if (row.legal_hold) blockedReasons.push('legal_hold_active');
    if (row.retention_until !== null && row.retention_until > Date.now()) {
      blockedReasons.push('retention_period_active');
    }
    if (row.status === 'soft_archived') blockedReasons.push('source_already_soft_archived');
    plannedPatch.status = 'soft_archived';
    plannedPatch.purge_state = 'soft_purged';
    plannedPatch.rollback_ref = `source-intake:${row.id}:pre-soft-archive`;
  } else if (operation === 'restore') {
    if (row.status !== 'soft_archived') blockedReasons.push('source_not_soft_archived');
    if (!row.rollback_ref) blockedReasons.push('rollback_ref_missing');
    plannedPatch.status = 'candidate';
    plannedPatch.purge_state = 'active';
  } else if (operation === 'set_legal_hold') {
    if (row.legal_hold) blockedReasons.push('legal_hold_already_active');
    plannedPatch.legal_hold = true;
    plannedPatch.purge_state = 'blocked';
  } else if (operation === 'release_legal_hold') {
    if (!row.legal_hold) blockedReasons.push('legal_hold_not_active');
    plannedPatch.legal_hold = false;
    plannedPatch.purge_state = 'active';
  }

  const preview = SourceGovernancePreviewSchema.parse({
    intake_id: row.id,
    operation,
    allowed_to_request: blockedReasons.length === 0,
    validation_required: true,
    execution_allowed_by_preview: false,
    source_unchanged: true,
    blocked_reasons: blockedReasons,
    planned_patch: plannedPatch,
    rollback_available: Boolean(row.rollback_ref) || ['request_purge', 'soft_archive'].includes(operation),
    generated_at: Date.now(),
  });
  audit({
    event_type: 'source_intake.governance_previewed',
    user_id: actor.id,
    scope: row.project_id,
    detail: {intake_id: row.id, operation, allowed_to_request: preview.allowed_to_request},
  });
  return preview;
}
