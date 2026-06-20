import {
  CreatePreCorrectionManifestRequestSchema,
  PreCorrectionManifestSchema,
  ROLE_RANK,
  ValidatePreCorrectionManifestRequestSchema,
  type CreatePreCorrectionManifestRequest,
  type PreCorrectionManifest,
  type ValidatePreCorrectionManifestRequest,
} from '@masterflow/shared';

import {getDb, type SubmissionRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface BatchRow {id: string; owner_id: string; project_id: string | null; project_scope: string; rubric_version_id: string; grading_profile_id: string; status: string;}
interface ManifestRow {id: string; batch_id: string; project_id: string | null; project_scope: string; rubric_version_id: string; grading_profile_id: string; context_snapshot_id: string | null; submission_refs_json: string; workflow_version: string; status: 'draft'|'validated'|'executing'|'completed'|'rejected'; created_by: string; validation_ref: string | null; created_at: number;}

function requireTeacher(actor: AuthUser): void { if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied'); }
function requireBatch(actor: AuthUser, id: string): BatchRow {
  const row = getDb().prepare('SELECT * FROM correction_batches WHERE id = ?').get(id) as BatchRow | undefined;
  if (!row) throw new Error('correction_batch_not_found');
  const allowed = row.project_id
    ? decideScopedPermission({actor, projectId: row.project_id, minimumProjectRole: 'editor'}).allowed
    : row.owner_id === actor.id;
  if (!allowed) throw new Error('correction_batch_not_found');
  return row;
}
function toDTO(row: ManifestRow): PreCorrectionManifest {
  return PreCorrectionManifestSchema.parse({manifest_id: row.id, batch_id: row.batch_id, project_id: row.project_id, project_scope: row.project_scope, rubric_version_id: row.rubric_version_id, grading_profile_id: row.grading_profile_id, context_snapshot_id: row.context_snapshot_id, submission_refs: JSON.parse(row.submission_refs_json), workflow_version: row.workflow_version, status: row.status, created_by: row.created_by, validation_ref: row.validation_ref, created_at: row.created_at});
}
export function createPreCorrectionManifest(actor: AuthUser, batchId: string, input: CreatePreCorrectionManifestRequest): PreCorrectionManifest {
  requireTeacher(actor); const request = CreatePreCorrectionManifestRequestSchema.parse(input); const batch = requireBatch(actor, batchId); const db = getDb();
  if (!['draft', 'ready', 'review'].includes(batch.status)) throw new Error('correction_batch_manifest_locked');
  const snapshot = db.prepare('SELECT id FROM correction_context_snapshots WHERE batch_id = ?').get(batchId) as {id: string} | undefined;
  if (!snapshot) throw new Error('correction_context_snapshot_not_found');
  const unique = [...new Set(request.submission_refs)];
  const rows = unique.map((id) => db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as SubmissionRow | undefined);
  if (rows.some((row) => !row || row.batch_id !== batchId)) throw new Error('submission_not_in_batch');
  if (rows.some((row) => row!.identity_status !== 'confirmed')) throw new Error('submission_identity_not_confirmed');
  const id = uuid(), now = Date.now();
  db.prepare(`INSERT INTO pre_correction_manifests (id, batch_id, project_id, project_scope, rubric_version_id, grading_profile_id, context_snapshot_id, submission_refs_json, workflow_version, status, created_by, validation_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NULL, ?)`)
    .run(id, batch.id, batch.project_id, batch.project_scope, batch.rubric_version_id, batch.grading_profile_id, snapshot.id, JSON.stringify(unique), request.workflow_version, actor.id, now);
  audit({event_type: 'correction.pre_manifest_created', user_id: actor.id, scope: batch.project_scope, detail: {manifest_id: id, batch_id: batch.id, submission_count: unique.length}});
  return toDTO(db.prepare('SELECT * FROM pre_correction_manifests WHERE id = ?').get(id) as ManifestRow);
}
export function validatePreCorrectionManifest(actor: AuthUser, manifestId: string, input: ValidatePreCorrectionManifestRequest): PreCorrectionManifest {
  requireTeacher(actor); const request = ValidatePreCorrectionManifestRequestSchema.parse(input); const db = getDb();
  const row = db.prepare('SELECT * FROM pre_correction_manifests WHERE id = ?').get(manifestId) as ManifestRow | undefined;
  if (!row) throw new Error('pre_correction_manifest_not_found'); requireBatch(actor, row.batch_id);
  if (row.status !== 'draft') throw new Error('pre_correction_manifest_not_draft');
  db.prepare("UPDATE pre_correction_manifests SET status = 'validated', validation_ref = ? WHERE id = ?").run(request.validation_ref, manifestId);
  audit({event_type: 'correction.pre_manifest_validated', user_id: actor.id, scope: row.project_scope, detail: {manifest_id: manifestId, validation_ref: request.validation_ref, runner_started: false}});
  return toDTO(db.prepare('SELECT * FROM pre_correction_manifests WHERE id = ?').get(manifestId) as ManifestRow);
}

export function listPreCorrectionManifests(actor: AuthUser, batchId: string): PreCorrectionManifest[] {
  requireTeacher(actor); requireBatch(actor, batchId);
  return (getDb().prepare('SELECT * FROM pre_correction_manifests WHERE batch_id = ? ORDER BY created_at DESC, id').all(batchId) as ManifestRow[]).map(toDTO);
}
