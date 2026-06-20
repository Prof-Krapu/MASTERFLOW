import {
  CorrectionBatchSchema,
  CorrectionContextSnapshotSchema,
  CreateCorrectionBatchRequestSchema,
  ROLE_RANK,
  type CorrectionBatch,
  type CorrectionContextSnapshot,
  type CreateCorrectionBatchRequest,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
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
  grading_profile_id: string;
  status: 'draft' | 'ready' | 'running' | 'review' | 'completed' | 'failed' | 'archived';
  submission_count: number;
  created_at: number;
  updated_at: number;
}

interface RubricRow { id: string; owner_id: string; project_id: string | null; project_scope: string; status: string; }
interface ProfileRow { id: string; owner_id: string; project_id: string | null; project_scope: string; status: string; }
interface CohortRow { id: string; owner_id: string; project_id: string | null; status: string; }
interface RosterRow { id: string; cohort_id: string; owner_id: string; status: string; }

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function assertScope(actor: AuthUser, ownerId: string, projectId: string | null): void {
  if (projectId) {
    if (!decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed) {
      throw new Error('project_not_found');
    }
    return;
  }
  if (ownerId !== actor.id) throw new Error('scope_denied');
}

function toBatch(row: BatchRow): CorrectionBatch {
  return CorrectionBatchSchema.parse({
    batch_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    rubric_version_id: row.rubric_version_id,
    grading_profile_id: row.grading_profile_id,
    status: row.status,
    submission_count: row.submission_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export function listCorrectionBatches(actor: AuthUser, projectId?: string | null): CorrectionBatch[] {
  requireTeacher(actor);
  if (projectId) {
    if (!decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed) {
      throw new Error('project_not_found');
    }
    return (getDb().prepare('SELECT * FROM correction_batches WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as BatchRow[]).map(toBatch);
  }
  return (getDb().prepare('SELECT * FROM correction_batches WHERE owner_id = ? AND project_id IS NULL ORDER BY created_at DESC').all(actor.id) as BatchRow[]).map(toBatch);
}

/**
 * Fige le contexte au moment même de la création du lot : le lot ne peut donc
 * pas ensuite être préparé avec un roster ou un sujet implicite.
 */
export function createCorrectionBatch(
  actor: AuthUser,
  input: CreateCorrectionBatchRequest,
): {batch: CorrectionBatch; context_snapshot: CorrectionContextSnapshot} {
  requireTeacher(actor);
  const request = CreateCorrectionBatchRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  const projectScope = projectId ?? actor.id;
  if (projectId && !decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed) {
    throw new Error('project_not_found');
  }
  const db = getDb();
  const rubric = db.prepare(
    `SELECT rv.id, rt.owner_id, rv.project_id, rv.project_scope, rv.status
     FROM rubric_versions rv INNER JOIN rubric_templates rt ON rt.id = rv.template_id WHERE rv.id = ?`,
  ).get(request.rubric_version_id) as RubricRow | undefined;
  const profile = db.prepare('SELECT id, owner_id, project_id, project_scope, status FROM institutional_grading_profiles WHERE id = ?')
    .get(request.grading_profile_id) as ProfileRow | undefined;
  if (!rubric) throw new Error('rubric_version_not_found');
  if (!profile) throw new Error('grading_profile_not_found');
  assertScope(actor, rubric.owner_id, rubric.project_id);
  assertScope(actor, profile.owner_id, profile.project_id);
  if (rubric.status !== 'validated') throw new Error('rubric_not_validated');
  if (profile.status !== 'validated') throw new Error('grading_profile_not_validated');
  if (rubric.project_id !== projectId || profile.project_id !== projectId || rubric.project_scope !== projectScope || profile.project_scope !== projectScope) {
    throw new Error('correction_scope_mismatch');
  }
  const cohort = db.prepare('SELECT id, owner_id, project_id, status FROM cohorts WHERE id = ?').get(request.cohort_id) as CohortRow | undefined;
  const roster = db.prepare('SELECT id, cohort_id, owner_id, status FROM roster_versions WHERE id = ?').get(request.roster_version_id) as RosterRow | undefined;
  if (!cohort || cohort.status !== 'active' || cohort.owner_id !== actor.id || cohort.project_id !== projectId) {
    throw new Error('correction_context_cohort_not_found');
  }
  if (!roster || roster.cohort_id !== cohort.id || roster.owner_id !== actor.id || roster.status !== 'active') {
    throw new Error('correction_context_roster_not_found');
  }
  const now = Date.now();
  const batchId = uuid();
  const snapshotId = uuid();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO correction_batches
         (id, owner_id, project_id, project_scope, rubric_version_id, grading_profile_id, status, submission_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', 0, ?, ?)`,
    ).run(batchId, actor.id, projectId, projectScope, rubric.id, profile.id, now, now);
    db.prepare(
      `INSERT INTO correction_context_snapshots
         (id, batch_id, owner_id, project_id, cohort_id, roster_version_id, rubric_version_id, subject_version_ref, source_refs_json, process_context_profile_ref, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(snapshotId, batchId, actor.id, projectId, cohort.id, roster.id, rubric.id, request.subject_version_ref, JSON.stringify(request.source_refs), request.process_context_profile_ref, actor.id, now);
  })();
  audit({
    event_type: 'correction.batch_contextualized_created', user_id: actor.id, scope: projectScope,
    detail: {batch_id: batchId, snapshot_id: snapshotId, cohort_id: cohort.id, roster_version_id: roster.id, rubric_version_id: rubric.id, grading_profile_id: profile.id},
  });
  const batch = toBatch(db.prepare('SELECT * FROM correction_batches WHERE id = ?').get(batchId) as BatchRow);
  const context_snapshot = CorrectionContextSnapshotSchema.parse({
    snapshot_id: snapshotId, batch_id: batchId, owner_id: actor.id, project_id: projectId,
    cohort_id: cohort.id, roster_version_id: roster.id, rubric_version_id: rubric.id,
    subject_version_ref: request.subject_version_ref, source_refs: request.source_refs,
    process_context_profile_ref: request.process_context_profile_ref, created_by: actor.id, created_at: now,
  });
  return {batch, context_snapshot};
}
