import {
  CorrectionContextPayloadSchema,
  CorrectionContextSnapshotSchema,
  CreateIdentityMatchCandidateRequestSchema,
  CreateCorrectionContextSnapshotSchema,
  DecideIdentityMatchCandidateRequestSchema,
  IdentityMatchCandidateSchema,
  LinkSubmissionIdentityRequestSchema,
  ROLE_RANK,
  SubmissionIdentityLinkSchema,
  type CorrectionContextPayload,
  type CorrectionContextSnapshot,
  type CreateIdentityMatchCandidateRequest,
  type CreateCorrectionContextSnapshot,
  type DecideIdentityMatchCandidateRequest,
  type IdentityMatchCandidate,
  type LinkSubmissionIdentityRequest,
  type SubmissionIdentityLink,
} from '@masterflow/shared';

import {
  getDb,
  type CohortRow,
  type CorrectionContextSnapshotRow,
  type RosterVersionRow,
  type SubmissionRow,
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

interface IdentityMatchCandidateRow {
  id: string;
  submission_id: string;
  batch_id: string;
  context_snapshot_id: string;
  observed_label: string;
  candidate_identity_ids_json: string;
  status: 'pending' | 'confirmed' | 'rejected';
  selected_identity_id: string | null;
  created_by: string;
  decided_by: string | null;
  created_at: number;
  updated_at: number;
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

/**
 * Compile le contexte privé consommable par un runner sans charger de contenu brut.
 *
 * Les sources restent des références ; le payload conserve exactement la version
 * de roster figée dans le snapshot, même si une version plus récente est active.
 */
export function compileCorrectionContextPayload(
  actor: AuthUser,
  batchId: string,
): CorrectionContextPayload {
  const snapshot = getCorrectionContextSnapshot(actor, batchId);
  const cohort = getDb()
    .prepare('SELECT * FROM cohorts WHERE id = ?')
    .get(snapshot.cohort_id) as CohortRow | undefined;
  const roster = getDb()
    .prepare('SELECT * FROM roster_versions WHERE id = ? AND cohort_id = ?')
    .get(snapshot.roster_version_id, snapshot.cohort_id) as RosterVersionRow | undefined;
  if (!cohort || !roster) throw new Error('correction_context_reference_not_found');

  const members = getDb()
    .prepare(
      `SELECT student_identity_id, display_name, aliases_json
       FROM roster_members
       WHERE roster_version_id = ?
       ORDER BY display_name COLLATE NOCASE, student_identity_id`,
    )
    .all(roster.id) as Array<{
    student_identity_id: string;
    display_name: string;
    aliases_json: string;
  }>;

  return CorrectionContextPayloadSchema.parse({
    snapshot_id: snapshot.snapshot_id,
    batch_id: snapshot.batch_id,
    cohort: {
      cohort_id: cohort.id,
      title: cohort.title,
      period_ref: cohort.period_ref,
    },
    roster: {
      roster_version_id: roster.id,
      version: roster.version,
      source_ref: roster.source_ref,
      members: members.map((member) => ({
        student_identity_id: member.student_identity_id,
        display_name: member.display_name,
        aliases: JSON.parse(member.aliases_json) as unknown,
      })),
    },
    rubric_version_id: snapshot.rubric_version_id,
    subject_version_ref: snapshot.subject_version_ref,
    source_refs: snapshot.source_refs,
    process_context_profile_ref: snapshot.process_context_profile_ref,
    privacy: 'private',
    compiled_at: Date.now(),
  });
}

/**
 * Relie explicitement une preuve/copie à une identité du roster figé.
 *
 * Aucun nom ou alias n'est résolu ici : le caller fournit un identifiant interne
 * déjà visible dans le payload privé, puis le service vérifie son appartenance.
 */
export function linkSubmissionIdentity(
  actor: AuthUser,
  submissionId: string,
  input: LinkSubmissionIdentityRequest,
): SubmissionIdentityLink {
  requireTeacher(actor);
  const request = LinkSubmissionIdentityRequestSchema.parse(input);
  const submission = getDb().prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as
    | SubmissionRow
    | undefined;
  if (!submission) throw new Error('submission_not_found');
  const batch = requireBatch(actor, submission.batch_id);
  if (!['candidate', 'ready', 'review'].includes(submission.status)) {
    throw new Error('submission_identity_locked');
  }

  const snapshot = getDb()
    .prepare('SELECT * FROM correction_context_snapshots WHERE id = ? AND batch_id = ?')
    .get(request.context_snapshot_id, batch.id) as CorrectionContextSnapshotRow | undefined;
  if (!snapshot) throw new Error('correction_context_snapshot_not_found');
  const membership = getDb()
    .prepare(
      `SELECT 1 AS hit FROM roster_members
       WHERE roster_version_id = ? AND student_identity_id = ?`,
    )
    .get(snapshot.roster_version_id, request.student_identity_id) as {hit: number} | undefined;
  if (!membership) throw new Error('student_identity_not_in_snapshot_roster');

  if (submission.identity_status === 'confirmed' && submission.student_identity_id) {
    if (submission.student_identity_id !== request.student_identity_id) {
      throw new Error('submission_identity_locked');
    }
    return SubmissionIdentityLinkSchema.parse({
      submission_id: submission.id,
      batch_id: submission.batch_id,
      context_snapshot_id: snapshot.id,
      roster_version_id: snapshot.roster_version_id,
      student_identity_id: submission.student_identity_id,
      identity_status: 'confirmed',
      linked_by: submission.identity_linked_by,
      linked_at: submission.identity_linked_at,
    });
  }

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE submissions
       SET student_identity_id = ?, identity_status = 'confirmed',
           identity_linked_by = ?, identity_linked_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(request.student_identity_id, actor.id, now, now, submission.id);
  audit({
    event_type: 'correction.submission_identity_linked',
    user_id: actor.id,
    scope: batch.project_id ?? batch.owner_id,
    detail: {
      submission_id: submission.id,
      batch_id: batch.id,
      context_snapshot_id: snapshot.id,
      roster_version_id: snapshot.roster_version_id,
      student_identity_id: request.student_identity_id,
    },
  });
  return SubmissionIdentityLinkSchema.parse({
    submission_id: submission.id,
    batch_id: submission.batch_id,
    context_snapshot_id: snapshot.id,
    roster_version_id: snapshot.roster_version_id,
    student_identity_id: request.student_identity_id,
    identity_status: 'confirmed',
    linked_by: actor.id,
    linked_at: now,
  });
}

function normalizeIdentityLabel(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('fr-FR')
    .replace(/\s+/g, ' ');
}

function toIdentityMatchCandidate(row: IdentityMatchCandidateRow): IdentityMatchCandidate {
  return IdentityMatchCandidateSchema.parse({
    candidate_id: row.id,
    submission_id: row.submission_id,
    batch_id: row.batch_id,
    context_snapshot_id: row.context_snapshot_id,
    observed_label: row.observed_label,
    candidate_identity_ids: JSON.parse(row.candidate_identity_ids_json) as unknown,
    status: row.status,
    selected_identity_id: row.selected_identity_id,
    created_by: row.created_by,
    decided_by: row.decided_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export function createIdentityMatchCandidate(
  actor: AuthUser,
  submissionId: string,
  input: CreateIdentityMatchCandidateRequest,
): IdentityMatchCandidate {
  requireTeacher(actor);
  const request = CreateIdentityMatchCandidateRequestSchema.parse(input);
  const submission = getDb().prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId) as
    | SubmissionRow
    | undefined;
  if (!submission) throw new Error('submission_not_found');
  const batch = requireBatch(actor, submission.batch_id);
  if (submission.identity_status === 'confirmed') throw new Error('submission_identity_locked');
  const snapshot = getDb()
    .prepare('SELECT * FROM correction_context_snapshots WHERE id = ? AND batch_id = ?')
    .get(request.context_snapshot_id, batch.id) as CorrectionContextSnapshotRow | undefined;
  if (!snapshot) throw new Error('correction_context_snapshot_not_found');

  const normalized = normalizeIdentityLabel(request.observed_label);
  const rows = getDb()
    .prepare(
      `SELECT student_identity_id, display_name, aliases_json
       FROM roster_members WHERE roster_version_id = ?`,
    )
    .all(snapshot.roster_version_id) as Array<{
    student_identity_id: string;
    display_name: string;
    aliases_json: string;
  }>;
  const candidateIdentityIds = rows
    .filter((row) => {
      const labels = [row.display_name, ...(JSON.parse(row.aliases_json) as string[])];
      return labels.some((label) => normalizeIdentityLabel(label) === normalized);
    })
    .map((row) => row.student_identity_id);
  if (candidateIdentityIds.length === 0) throw new Error('identity_match_no_candidate');

  const existing = getDb()
    .prepare(
      `SELECT * FROM identity_match_candidates
       WHERE submission_id = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(submission.id) as IdentityMatchCandidateRow | undefined;
  if (existing) return toIdentityMatchCandidate(existing);

  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO identity_match_candidates
         (id, submission_id, batch_id, context_snapshot_id, observed_label,
          candidate_identity_ids_json, status, selected_identity_id, created_by,
          decided_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NULL, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      submission.id,
      batch.id,
      snapshot.id,
      request.observed_label,
      JSON.stringify(candidateIdentityIds),
      actor.id,
      now,
      now,
    );
  getDb()
    .prepare("UPDATE submissions SET identity_status = 'candidate', updated_at = ? WHERE id = ?")
    .run(now, submission.id);
  return toIdentityMatchCandidate(
    getDb().prepare('SELECT * FROM identity_match_candidates WHERE id = ?').get(id) as
      IdentityMatchCandidateRow,
  );
}

export function decideIdentityMatchCandidate(
  actor: AuthUser,
  candidateId: string,
  input: DecideIdentityMatchCandidateRequest,
): IdentityMatchCandidate {
  requireTeacher(actor);
  const request = DecideIdentityMatchCandidateRequestSchema.parse(input);
  const candidate = getDb()
    .prepare('SELECT * FROM identity_match_candidates WHERE id = ?')
    .get(candidateId) as IdentityMatchCandidateRow | undefined;
  if (!candidate) throw new Error('identity_match_candidate_not_found');
  requireBatch(actor, candidate.batch_id);
  if (candidate.status !== 'pending') throw new Error('identity_match_candidate_decided');
  const allowedIds = JSON.parse(candidate.candidate_identity_ids_json) as string[];
  if (
    request.decision === 'confirm' &&
    (!request.selected_identity_id || !allowedIds.includes(request.selected_identity_id))
  ) {
    throw new Error('identity_match_selection_invalid');
  }

  const now = Date.now();
  if (request.decision === 'confirm') {
    linkSubmissionIdentity(actor, candidate.submission_id, {
      context_snapshot_id: candidate.context_snapshot_id,
      student_identity_id: request.selected_identity_id!,
    });
  } else {
    getDb()
      .prepare(
        "UPDATE submissions SET identity_status = 'rejected', updated_at = ? WHERE id = ?",
      )
      .run(now, candidate.submission_id);
  }
  getDb()
    .prepare(
      `UPDATE identity_match_candidates
       SET status = ?, selected_identity_id = ?, decided_by = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      request.decision === 'confirm' ? 'confirmed' : 'rejected',
      request.decision === 'confirm' ? request.selected_identity_id : null,
      actor.id,
      now,
      candidate.id,
    );
  return toIdentityMatchCandidate(
    getDb().prepare('SELECT * FROM identity_match_candidates WHERE id = ?').get(candidate.id) as
      IdentityMatchCandidateRow,
  );
}
