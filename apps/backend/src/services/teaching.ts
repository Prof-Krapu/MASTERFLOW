import {
  SubjectAssignmentSchema,
  SubjectTemplateSchema,
  TeachingOverviewSchema,
  ROLE_RANK,
  type SubjectAssignment,
  type SubjectTemplate,
  type TeachingCandidateScore,
  type TeachingOverview,
  type TeachingStudentSubjectProjection,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listCohorts, listRosterVersions} from './cohorts.ts';
import {decideScopedPermission} from './projects.ts';

interface SubjectRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  title: string;
  current_version_ref: string | null;
  status: 'draft' | 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

interface AssignmentRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  cohort_id: string;
  source_subject_version_id: string;
  title: string;
  subject_snapshot_json: string;
  status: 'draft' | 'active' | 'archived';
  created_by: string;
  created_at: number;
  activated_at: number | null;
  template_id: string;
}

interface SubmissionProjectionRow {
  submission_id: string;
  submission_status: 'candidate' | 'ready' | 'processing' | 'review' | 'completed' | 'rejected';
  source_evidence_ref: string;
  updated_at: number;
  run_id: string | null;
}

interface CriterionProjectionRow {
  draft_score: number;
  max_points: number;
  confidence: number;
  evidence_refs_json: string;
}

function canRead(actor: AuthUser, ownerId: string, projectId: string | null): boolean {
  if (!projectId) return ownerId === actor.id;
  return decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed;
}

function subjectDto(row: SubjectRow): SubjectTemplate {
  return SubjectTemplateSchema.parse({
    template_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    title: row.title,
    current_version_ref: row.current_version_ref,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function assignmentDto(row: AssignmentRow): SubjectAssignment {
  return SubjectAssignmentSchema.parse({
    assignment_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    cohort_id: row.cohort_id,
    source_subject_version_id: row.source_subject_version_id,
    title: row.title,
    subject_snapshot: JSON.parse(row.subject_snapshot_json),
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    activated_at: row.activated_at,
  });
}

function correctionSheetStatus(assignmentId: string): 'none' | 'draft' | 'needs_teacher_review' | 'validated' {
  const row = getDb().prepare(
    `SELECT status, sync_status FROM correction_sheet_drafts
     WHERE assignment_id = ? ORDER BY version DESC LIMIT 1`,
  ).get(assignmentId) as {status: 'draft' | 'validated' | 'archived'; sync_status: 'synced' | 'needs_teacher_review'} | undefined;
  if (!row || row.status === 'archived') return 'none';
  if (row.sync_status === 'needs_teacher_review') return 'needs_teacher_review';
  return row.status === 'validated' ? 'validated' : 'draft';
}

function submissionStage(status: SubmissionProjectionRow['submission_status']): TeachingStudentSubjectProjection['stage'] {
  if (status === 'completed') return 'completed';
  if (status === 'review' || status === 'processing') return 'in_review';
  if (status === 'ready') return 'submitted';
  return 'submission_candidate';
}

function candidateScore(runId: string | null): TeachingCandidateScore | null {
  if (!runId) return null;
  const rows = getDb().prepare(
    `SELECT draft_score, max_points, confidence, evidence_refs_json
     FROM criterion_score_drafts WHERE run_id = ? AND status = 'candidate'`,
  ).all(runId) as CriterionProjectionRow[];
  if (rows.length === 0) return null;
  const sourceRefs = [...new Set(rows.flatMap((row) => JSON.parse(row.evidence_refs_json) as string[]))];
  if (sourceRefs.length === 0) return null;
  return {
    value: rows.reduce((total, row) => total + row.draft_score, 0),
    max: rows.reduce((total, row) => total + row.max_points, 0),
    confidence: rows.reduce((total, row) => total + row.confidence, 0) / rows.length,
    status: 'needs_review',
    source_refs: sourceRefs,
  };
}

function studentSubjectState(
  studentIdentityId: string,
  assignmentRow: AssignmentRow,
): TeachingStudentSubjectProjection {
  const assignment = assignmentDto(assignmentRow);
  const submission = getDb().prepare(
    `SELECT s.id AS submission_id, s.status AS submission_status,
            s.source_evidence_ref, s.updated_at, r.id AS run_id
       FROM correction_context_snapshots c
       JOIN submissions s ON s.batch_id = c.batch_id
       LEFT JOIN pre_correction_runs r ON r.submission_id = s.id
      WHERE c.cohort_id = ? AND c.subject_version_ref = ?
        AND s.student_identity_id = ? AND s.identity_status = 'confirmed'
      ORDER BY s.updated_at DESC, r.updated_at DESC LIMIT 1`,
  ).get(
    assignment.cohort_id,
    assignment.source_subject_version_id,
    studentIdentityId,
  ) as SubmissionProjectionRow | undefined;
  const score = candidateScore(submission?.run_id ?? null);
  const evidenceRefs = submission
    ? [...new Set([submission.source_evidence_ref, ...(score?.source_refs ?? [])])]
    : [];
  return {
    assignment_id: assignment.assignment_id,
    subject_template_id: assignmentRow.template_id,
    source_subject_version_id: assignment.source_subject_version_id,
    stage: submission ? submissionStage(submission.submission_status) : 'no_signal',
    signal_status: score ? 'attributed' : submission ? 'partial' : 'unavailable',
    assigned_notions: assignment.subject_snapshot.competencies,
    evidence_refs: evidenceRefs,
    candidate_score: score,
    confidence: score?.confidence ?? null,
    source_freshness_at: submission?.updated_at ?? null,
  };
}

/** Projection Teaching consolidée : aucune météo ni maîtrise n'est inférée. */
export function getTeachingOverview(actor: AuthUser): TeachingOverview {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
  const subjectRows = (getDb().prepare(
    `SELECT * FROM subject_templates WHERE status != 'archived' ORDER BY updated_at DESC`,
  ).all() as SubjectRow[]).filter((row) => canRead(actor, row.owner_id, row.project_id));
  const subjectIds = new Set(subjectRows.map((row) => row.id));
  const assignmentRows = (getDb().prepare(
    `SELECT a.*, v.template_id FROM subject_assignments a
     JOIN subject_versions v ON v.id = a.source_subject_version_id
     WHERE a.status != 'archived' ORDER BY a.created_at DESC`,
  ).all() as AssignmentRow[]).filter((row) => subjectIds.has(row.template_id) && canRead(actor, row.owner_id, row.project_id));
  const cohorts = listCohorts(actor);

  return TeachingOverviewSchema.parse({
    subjects: subjectRows.map(subjectDto),
    assignments: assignmentRows.map((row) => ({
      assignment: assignmentDto(row),
      subject_template_id: row.template_id,
      correction_sheet_status: correctionSheetStatus(row.id),
    })),
    cohorts: cohorts.map((cohort) => {
      const activeRoster = listRosterVersions(actor, cohort.cohort_id)
        .find((version) => version.status === 'active') ?? null;
      const cohortAssignments = assignmentRows.filter((row) => row.cohort_id === cohort.cohort_id && row.status === 'active');
      return {
        cohort,
        active_roster: activeRoster,
        students: (activeRoster?.members ?? []).map((member) => ({
          student_identity_id: member.student_identity_id,
          display_name: member.display_name,
          subject_states: cohortAssignments.map((assignment) => studentSubjectState(member.student_identity_id, assignment)),
        })),
      };
    }),
    generated_at: Date.now(),
  });
}
