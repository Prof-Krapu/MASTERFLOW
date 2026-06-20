import {CreateSubmissionIntakeRequestSchema, ROLE_RANK, SubmissionRecordSchema, type CreateSubmissionIntakeRequest, type SubmissionRecord} from '@masterflow/shared';
import {getDb, type SubmissionRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface Batch {id: string; owner_id: string; project_id: string | null; project_scope: string; status: string; submission_count: number;}
function teacher(actor: AuthUser): void { if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied'); }
function batch(actor: AuthUser, id: string): Batch {
  const row = getDb().prepare('SELECT * FROM correction_batches WHERE id = ?').get(id) as Batch | undefined;
  if (!row) throw new Error('correction_batch_not_found');
  if (row.project_id ? !decideScopedPermission({actor, projectId: row.project_id, minimumProjectRole: 'editor'}).allowed : row.owner_id !== actor.id) throw new Error('correction_batch_not_found');
  return row;
}
function dto(row: SubmissionRow): SubmissionRecord { return SubmissionRecordSchema.parse({submission_id: row.id, batch_id: row.batch_id, owner_id: row.owner_id, project_id: row.project_id, project_scope: row.project_scope, student_ref: row.student_ref, student_identity_id: row.student_identity_id, identity_linked_by: row.identity_linked_by, identity_linked_at: row.identity_linked_at, source_evidence_ref: row.source_evidence_ref, identity_status: row.identity_status, status: row.status, privacy_level: row.privacy_level, created_at: row.created_at, updated_at: row.updated_at}); }
export function intakeSubmission(actor: AuthUser, batchId: string, input: CreateSubmissionIntakeRequest): SubmissionRecord {
  teacher(actor); const request = CreateSubmissionIntakeRequestSchema.parse(input); const target = batch(actor, batchId);
  if (target.status !== 'draft') throw new Error('correction_batch_intake_locked');
  const now = Date.now(), evidenceId = uuid(), submissionId = uuid(), db = getDb();
  db.transaction(() => {
    db.prepare(`INSERT INTO evidence_events (id, source_type, adapter_id, owner_id, project_id, project_scope, target_refs_json, payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at) VALUES (?, 'submission', 'manual-intake-v1', ?, ?, ?, ?, ?, NULL, 'private', ?, 'candidate', ?)`)
      .run(evidenceId, actor.id, target.project_id, target.project_scope, JSON.stringify([batchId]), request.source_ref, now, now);
    db.prepare(`INSERT INTO submissions (id, batch_id, owner_id, project_id, project_scope, student_ref, source_evidence_ref, identity_status, status, privacy_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'unknown', 'candidate', 'private', ?, ?)`)
      .run(submissionId, batchId, actor.id, target.project_id, target.project_scope, request.observed_label ?? null, evidenceId, now, now);
    db.prepare('UPDATE correction_batches SET submission_count = submission_count + 1, updated_at = ? WHERE id = ?').run(now, batchId);
  })();
  audit({event_type: 'correction.submission_intaked_candidate', user_id: actor.id, scope: target.project_scope, detail: {batch_id: batchId, submission_id: submissionId, evidence_id: evidenceId, observed_label: request.observed_label ?? null}});
  return dto(db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as SubmissionRow);
}

export function listSubmissions(actor: AuthUser, batchId: string): SubmissionRecord[] {
  teacher(actor); batch(actor, batchId);
  return (getDb().prepare('SELECT * FROM submissions WHERE batch_id = ? ORDER BY created_at, id').all(batchId) as SubmissionRow[]).map(dto);
}
