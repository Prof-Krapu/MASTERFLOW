import {
  CorrectionContextSnapshotSchema,
  CreateCorrectionContextSnapshotSchema,
  ROLE_RANK,
  type CorrectionContextSnapshot,
  type CreateCorrectionContextSnapshot,
} from '@masterflow/shared';

import {
  getDb,
  type CohortRow,
  type CorrectionContextSnapshotRow,
  type RosterVersionRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface BatchRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  rubric_version_id: string;
  status: string;
}

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function batchRow(batchId: string): BatchRow | undefined {
  return getDb().prepare('SELECT * FROM correction_batches WHERE id = ?').get(batchId) as
    | BatchRow
    | undefined;
}

function assertBatchAccess(actor: AuthUser, batch: BatchRow): void {
  if (batch.project_id) {
    if (
      !decideScopedPermission({
        actor,
        projectId: batch.project_id,
        minimumProjectRole: 'editor',
      }).allowed
    ) {
      throw new Error('correction_batch_not_found');
    }
    return;
  }
  if (batch.owner_id !== actor.id) throw new Error('correction_batch_not_found');
}

function requireBatch(actor: AuthUser, batchId: string): BatchRow {
  const batch = batchRow(batchId);
  if (!batch) throw new Error('correction_batch_not_found');
  assertBatchAccess(actor, batch);
  return batch;
}

function toDTO(row: CorrectionContextSnapshotRow): CorrectionContextSnapshot {
  return CorrectionContextSnapshotSchema.parse({
    snapshot_id: row.id,
    batch_id: row.batch_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    cohort_id: row.cohort_id,
    roster_version_id: row.roster_version_id,
    rubric_version_id: row.rubric_version_id,
    subject_version_ref: row.subject_version_ref,
    source_refs: JSON.parse(row.source_refs_json) as unknown,
    process_context_profile_ref: row.process_context_profile_ref,
    created_by: row.created_by,
    created_at: row.created_at,
  });
}

export function createCorrectionContextSnapshot(
  actor: AuthUser,
  batchId: string,
  input: CreateCorrectionContextSnapshot,
): CorrectionContextSnapshot {
  requireTeacher(actor);
  const request = CreateCorrectionContextSnapshotSchema.parse(input);
  const batch = requireBatch(actor, batchId);
  if (!['draft', 'ready'].includes(batch.status)) {
    throw new Error('correction_batch_context_locked');
  }
  const existing = getDb()
    .prepare('SELECT id FROM correction_context_snapshots WHERE batch_id = ?')
    .get(batchId) as {id: string} | undefined;
  if (existing) throw new Error('correction_context_snapshot_exists');

  const cohort = getDb().prepare('SELECT * FROM cohorts WHERE id = ?').get(request.cohort_id) as
    | CohortRow
    | undefined;
  if (
    !cohort ||
    cohort.status !== 'active' ||
    cohort.owner_id !== batch.owner_id ||
    cohort.project_id !== batch.project_id
  ) {
    throw new Error('correction_context_cohort_not_found');
  }
  const roster = getDb()
    .prepare('SELECT * FROM roster_versions WHERE id = ? AND cohort_id = ?')
    .get(request.roster_version_id, request.cohort_id) as RosterVersionRow | undefined;
  if (!roster || roster.status !== 'active' || roster.owner_id !== batch.owner_id) {
    throw new Error('correction_context_roster_not_found');
  }

  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO correction_context_snapshots
         (id, batch_id, owner_id, project_id, cohort_id, roster_version_id,
          rubric_version_id, subject_version_ref, source_refs_json,
          process_context_profile_ref, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      batch.id,
      batch.owner_id,
      batch.project_id,
      cohort.id,
      roster.id,
      batch.rubric_version_id,
      request.subject_version_ref,
      JSON.stringify(request.source_refs),
      request.process_context_profile_ref,
      actor.id,
      now,
    );
  audit({
    event_type: 'correction.context_snapshot_created',
    user_id: actor.id,
    scope: batch.project_id ?? batch.owner_id,
    detail: {
      batch_id: batch.id,
      snapshot_id: id,
      cohort_id: cohort.id,
      roster_version_id: roster.id,
      rubric_version_id: batch.rubric_version_id,
      source_ref_count: request.source_refs.length,
    },
  });
  return getCorrectionContextSnapshot(actor, batchId);
}

export function getCorrectionContextSnapshot(
  actor: AuthUser,
  batchId: string,
): CorrectionContextSnapshot {
  requireTeacher(actor);
  requireBatch(actor, batchId);
  const row = getDb()
    .prepare('SELECT * FROM correction_context_snapshots WHERE batch_id = ?')
    .get(batchId) as CorrectionContextSnapshotRow | undefined;
  if (!row) throw new Error('correction_context_snapshot_not_found');
  return toDTO(row);
}
