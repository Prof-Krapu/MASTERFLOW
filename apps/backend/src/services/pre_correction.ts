import {
  CriterionScoreDraftSchema,
  PreCorrectionRunDraftSchema,
  ROLE_RANK,
  RubricCriterionSchema,
  type CriterionScoreDraft,
  type PreCorrectionRunDraft,
  type RubricCriterion,
} from '@masterflow/shared';
import {z} from 'zod';

import {
  getDb,
  type CriterionScoreDraftRow,
  type PreCorrectionRunRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface ManifestRow {
  id: string;
  batch_id: string;
  project_id: string | null;
  project_scope: string;
  rubric_version_id: string;
  grading_profile_id: string;
  submission_refs_json: string;
  status: string;
  validation_ref: string | null;
}

interface BatchRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  rubric_version_id: string;
  grading_profile_id: string;
}

interface SubmissionRow {
  id: string;
  batch_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
}

interface RubricRow {
  id: string;
  project_id: string | null;
  project_scope: string;
  criteria_json: string;
  status: string;
}

interface GradingProfileRow {
  id: string;
  project_id: string | null;
  project_scope: string;
  status: string;
}

export interface PreCorrectionDraftBundle {
  run: PreCorrectionRunDraft;
  criterion_scores: CriterionScoreDraft[];
}

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function assertTeacherOwnership(actor: AuthUser, ownerId: string): void {
  if (actor.role === 'teacher' && actor.id !== ownerId) throw new Error('scope_denied');
}

function assertProjectBridge(projectScope: string, projectId: string | null | undefined): void {
  if (projectId && projectScope !== projectId) throw new Error('project_scope_mismatch');
}

function assertProjectEditor(actor: AuthUser, projectId: string): void {
  const decision = decideScopedPermission({
    actor,
    projectId,
    minimumProjectRole: 'editor',
  });
  if (!decision.allowed) throw new Error('scope_denied');
}

function assertCorrectionAccess(
  actor: AuthUser,
  ownerId: string,
  projectId: string | null | undefined,
): void {
  if (projectId) {
    assertProjectEditor(actor, projectId);
    return;
  }
  assertTeacherOwnership(actor, ownerId);
}

function toRunDTO(row: PreCorrectionRunRow): PreCorrectionRunDraft {
  return PreCorrectionRunDraftSchema.parse({
    run_id: row.id,
    manifest_id: row.manifest_id,
    batch_id: row.batch_id,
    submission_id: row.submission_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    rubric_version_id: row.rubric_version_id,
    grading_profile_id: row.grading_profile_id,
    analysis_type: row.analysis_type,
    evidence_snapshot_ref: row.evidence_snapshot_ref,
    method_version: row.method_version,
    model_profile_ref: row.model_profile_ref,
    criterion_score_refs: JSON.parse(row.criterion_score_refs_json) as unknown,
    review_reasons: JSON.parse(row.review_reasons_json) as unknown,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toCriterionScoreDTO(row: CriterionScoreDraftRow): CriterionScoreDraft {
  return CriterionScoreDraftSchema.parse({
    draft_id: row.id,
    run_id: row.run_id,
    submission_id: row.submission_id,
    rubric_version_id: row.rubric_version_id,
    criterion_id: row.criterion_id,
    draft_score: row.draft_score,
    max_points: row.max_points,
    evidence_refs: JSON.parse(row.evidence_refs_json) as unknown,
    confidence: row.confidence,
    comment_ref: row.comment_ref,
    status: row.status,
    created_at: row.created_at,
  });
}

/**
 * Persiste une sortie de pré-correction déjà produite par un futur runner.
 *
 * Ce dépôt interne ne lance aucun modèle et n'est exposé par aucune route. Il
 * vérifie les références validées puis force la sortie en review professeur.
 */
export function recordPreCorrectionDraft(
  actor: AuthUser,
  input: PreCorrectionDraftBundle,
): PreCorrectionDraftBundle {
  requireTeacher(actor);
  const run = PreCorrectionRunDraftSchema.parse(input.run);
  const criterionScores = input.criterion_scores.map((draft) =>
    CriterionScoreDraftSchema.parse(draft),
  );
  assertProjectBridge(run.project_scope, run.project_id);
  assertCorrectionAccess(actor, run.owner_id, run.project_id);
  if (criterionScores.some((draft) => draft.status !== 'candidate')) {
    throw new Error('criterion_score_must_be_candidate');
  }

  const refs = new Set(run.criterion_score_refs);
  if (
    refs.size !== criterionScores.length ||
    criterionScores.some((draft) => !refs.has(draft.draft_id))
  ) {
    throw new Error('criterion_score_refs_mismatch');
  }
  if (
    criterionScores.some(
      (draft) =>
        draft.run_id !== run.run_id ||
        draft.submission_id !== run.submission_id ||
        draft.rubric_version_id !== run.rubric_version_id,
    )
  ) {
    throw new Error('criterion_score_context_mismatch');
  }

  const db = getDb();
  const manifest = db
    .prepare('SELECT * FROM pre_correction_manifests WHERE id = ?')
    .get(run.manifest_id) as ManifestRow | undefined;
  if (!manifest) throw new Error('pre_correction_manifest_not_found');
  if (manifest.status !== 'validated' || !manifest.validation_ref) {
    throw new Error('pre_correction_manifest_not_validated');
  }

  const batch = db
    .prepare('SELECT * FROM correction_batches WHERE id = ?')
    .get(run.batch_id) as BatchRow | undefined;
  const submission = db
    .prepare('SELECT * FROM submissions WHERE id = ?')
    .get(run.submission_id) as SubmissionRow | undefined;
  const rubric = db
    .prepare(
      `SELECT id, project_id, project_scope, criteria_json, status
       FROM rubric_versions WHERE id = ?`,
    )
    .get(run.rubric_version_id) as RubricRow | undefined;
  const gradingProfile = db
    .prepare(
      `SELECT id, project_id, project_scope, status
       FROM institutional_grading_profiles WHERE id = ?`,
    )
    .get(run.grading_profile_id) as GradingProfileRow | undefined;
  if (!batch || !submission || !rubric || !gradingProfile) {
    throw new Error('pre_correction_reference_not_found');
  }
  if (rubric.status !== 'validated') throw new Error('rubric_not_validated');
  if (gradingProfile.status !== 'validated') throw new Error('grading_profile_not_validated');

  const manifestSubmissionRefs = JSON.parse(manifest.submission_refs_json) as unknown;
  if (
    !Array.isArray(manifestSubmissionRefs) ||
    !manifestSubmissionRefs.includes(run.submission_id)
  ) {
    throw new Error('submission_not_in_manifest');
  }

  const alignedRefs = [
    manifest.batch_id === run.batch_id,
    manifest.project_scope === run.project_scope,
    manifest.rubric_version_id === run.rubric_version_id,
    manifest.grading_profile_id === run.grading_profile_id,
    batch.owner_id === run.owner_id,
    batch.project_scope === run.project_scope,
    batch.rubric_version_id === run.rubric_version_id,
    batch.grading_profile_id === run.grading_profile_id,
    submission.batch_id === run.batch_id,
    submission.owner_id === run.owner_id,
    submission.project_scope === run.project_scope,
    rubric.project_scope === run.project_scope,
    gradingProfile.project_scope === run.project_scope,
  ];
  if (run.project_id) {
    alignedRefs.push(
      manifest.project_id === run.project_id,
      batch.project_id === run.project_id,
      submission.project_id === run.project_id,
      rubric.project_id === run.project_id,
      gradingProfile.project_id === run.project_id,
    );
  } else {
    alignedRefs.push(
      manifest.project_id === null,
      batch.project_id === null,
      submission.project_id === null,
      rubric.project_id === null,
      gradingProfile.project_id === null,
    );
  }
  if (alignedRefs.some((isAligned) => !isAligned)) throw new Error('pre_correction_scope_mismatch');

  const criteria = z.array(RubricCriterionSchema).parse(JSON.parse(rubric.criteria_json));
  assertCriterionCoverage(criteria, criterionScores);
  assertEvidence(actor, run.project_scope, criterionScores, run.project_id);
  assertModelProfile(run.model_profile_ref);

  const save = db.transaction(() => {
    db.prepare(
      `INSERT INTO pre_correction_runs
         (id, manifest_id, batch_id, submission_id, owner_id, project_id, project_scope,
          rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
          method_version, model_profile_ref, criterion_score_refs_json,
          review_reasons_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review', ?, ?)`,
    ).run(
      run.run_id,
      run.manifest_id,
      run.batch_id,
      run.submission_id,
      run.owner_id,
      run.project_id ?? null,
      run.project_scope,
      run.rubric_version_id,
      run.grading_profile_id,
      run.analysis_type,
      run.evidence_snapshot_ref,
      run.method_version,
      run.model_profile_ref,
      JSON.stringify(run.criterion_score_refs),
      JSON.stringify(run.review_reasons),
      run.created_at,
      run.updated_at,
    );

    const insertDraft = db.prepare(
      `INSERT INTO criterion_score_drafts
         (id, run_id, submission_id, rubric_version_id, criterion_id, draft_score,
          max_points, evidence_refs_json, confidence, comment_ref, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?)`,
    );
    for (const draft of criterionScores) {
      insertDraft.run(
        draft.draft_id,
        draft.run_id,
        draft.submission_id,
        draft.rubric_version_id,
        draft.criterion_id,
        draft.draft_score,
        draft.max_points,
        JSON.stringify(draft.evidence_refs),
        draft.confidence,
        draft.comment_ref,
        draft.created_at,
      );
    }
  });
  save();

  audit({
    event_type: 'pre_correction.draft_recorded',
    user_id: actor.id,
    scope: run.project_scope,
    detail: {
      run_id: run.run_id,
      manifest_id: run.manifest_id,
      submission_id: run.submission_id,
      criterion_count: criterionScores.length,
      status: 'needs_review',
    },
  });
  return getPreCorrectionDraft(actor, run.run_id);
}

export function getPreCorrectionDraft(
  actor: AuthUser,
  runId: string,
): PreCorrectionDraftBundle {
  requireTeacher(actor);
  const runRow = getDb().prepare('SELECT * FROM pre_correction_runs WHERE id = ?').get(runId) as
    | PreCorrectionRunRow
    | undefined;
  if (!runRow) throw new Error('pre_correction_run_not_found');
  assertCorrectionAccess(actor, runRow.owner_id, runRow.project_id);

  const scoreRows = getDb()
    .prepare('SELECT * FROM criterion_score_drafts WHERE run_id = ? ORDER BY criterion_id')
    .all(runId) as CriterionScoreDraftRow[];
  return {
    run: toRunDTO(runRow),
    criterion_scores: scoreRows.map(toCriterionScoreDTO),
  };
}

function assertCriterionCoverage(
  criteria: RubricCriterion[],
  criterionScores: CriterionScoreDraft[],
): void {
  const criteriaById = new Map(criteria.map((criterion) => [criterion.criterion_id, criterion]));
  const scoreIds = new Set(criterionScores.map((draft) => draft.criterion_id));
  if (scoreIds.size !== criterionScores.length || scoreIds.size !== criteria.length) {
    throw new Error('criterion_coverage_mismatch');
  }
  for (const draft of criterionScores) {
    const criterion = criteriaById.get(draft.criterion_id);
    if (!criterion) throw new Error('criterion_not_in_rubric');
    if (Math.abs(criterion.max_points - draft.max_points) > 0.0001) {
      throw new Error('criterion_max_points_mismatch');
    }
  }
}

function assertEvidence(
  actor: AuthUser,
  projectScope: string,
  criterionScores: CriterionScoreDraft[],
  projectId?: string | null,
): void {
  const evidenceRefs = [...new Set(criterionScores.flatMap((draft) => draft.evidence_refs))];
  const placeholders = evidenceRefs.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT id, owner_id, project_id, project_scope, status FROM evidence_events
       WHERE id IN (${placeholders})`,
    )
    .all(...evidenceRefs) as Array<{
    id: string;
    owner_id: string;
    project_id: string | null;
    project_scope: string;
    status: string;
  }>;
  if (rows.length !== evidenceRefs.length) throw new Error('evidence_not_found');
  if (
    rows.some(
      (row) =>
        row.project_scope !== projectScope ||
        row.status === 'rejected' ||
        row.status === 'archived',
    )
  ) {
    throw new Error('evidence_not_usable');
  }
  if (projectId && rows.some((row) => row.project_id !== projectId)) {
    throw new Error('evidence_not_usable');
  }
  if (!projectId && actor.role === 'teacher' && rows.some((row) => row.owner_id !== actor.id)) {
    throw new Error('scope_denied');
  }
}

function assertModelProfile(modelProfileRef: string | null): void {
  if (!modelProfileRef) return;
  const profile = getDb()
    .prepare('SELECT task, status FROM task_model_profiles WHERE id = ?')
    .get(modelProfileRef) as {task: string; status: string} | undefined;
  if (!profile || profile.task !== 'criterion_analysis' || profile.status !== 'validated') {
    throw new Error('criterion_model_profile_not_routable');
  }
}
