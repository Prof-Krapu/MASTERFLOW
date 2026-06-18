import {
  CorrectionExportPreviewSchema,
  FeedbackDraftSchema,
  ROLE_RANK,
  type CorrectionExportPreview,
  type FeedbackDraft,
} from '@masterflow/shared';

import {
  getDb,
  type CorrectionExportPreviewRow,
  type FeedbackDraftRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface RunRow {
  id: string;
  batch_id: string;
  submission_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  status: string;
}

interface BatchRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
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

function assertDraftAccess(
  actor: AuthUser,
  ownerId: string,
  projectId: string | null | undefined,
  ownerError: 'feedback_owner_required' | 'export_owner_required',
): void {
  if (!projectId) {
    assertTeacherOwnership(actor, ownerId);
    if (actor.id !== ownerId) throw new Error(ownerError);
    return;
  }
  if (actor.id !== ownerId && ROLE_RANK[actor.role] >= ROLE_RANK.admin) {
    throw new Error(ownerError);
  }
  assertProjectEditor(actor, projectId);
}

function assertSensitiveRead(
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

function toFeedbackDTO(row: FeedbackDraftRow): FeedbackDraft {
  return FeedbackDraftSchema.parse({
    feedback_id: row.id,
    run_id: row.run_id,
    submission_id: row.submission_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    method_version: row.method_version,
    model_profile_ref: row.model_profile_ref,
    observed_strength_ref: row.observed_strength_ref,
    observed_issue_ref: row.observed_issue_ref,
    evidence_refs: JSON.parse(row.evidence_refs_json) as unknown,
    impact_on_work_ref: row.impact_on_work_ref,
    pedagogical_axis_ref: row.pedagogical_axis_ref,
    next_action_ref: row.next_action_ref,
    validation_criterion_ref: row.validation_criterion_ref,
    tone_level: row.tone_level,
    evaluation_alignment: row.evaluation_alignment,
    teacher_validation_required: row.teacher_validation_required === 1,
    status: row.status,
    validator_id: row.validator_id,
    validation_ref: row.validation_ref,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toExportDTO(row: CorrectionExportPreviewRow): CorrectionExportPreview {
  return CorrectionExportPreviewSchema.parse({
    export_id: row.id,
    batch_id: row.batch_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    format: row.format,
    target: row.target,
    source_feedback_refs: JSON.parse(row.source_feedback_refs_json) as unknown,
    source_run_refs: JSON.parse(row.source_run_refs_json) as unknown,
    preview_ref: row.preview_ref,
    schema_version: row.schema_version,
    contains_private_data: row.contains_private_data === 1,
    publication_allowed: row.publication_allowed === 1,
    human_validation_required: row.human_validation_required === 1,
    status: row.status,
    validator_id: row.validator_id,
    validation_ref: row.validation_ref,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export function recordFeedbackDraft(actor: AuthUser, input: FeedbackDraft): FeedbackDraft {
  requireTeacher(actor);
  const feedback = FeedbackDraftSchema.parse(input);
  assertProjectBridge(feedback.project_scope, feedback.project_id);
  assertDraftAccess(actor, feedback.owner_id, feedback.project_id, 'feedback_owner_required');
  if (feedback.status !== 'needs_teacher_validation') {
    throw new Error('feedback_draft_must_need_validation');
  }

  const run = getDb()
    .prepare(
      `SELECT id, batch_id, submission_id, owner_id, project_id, project_scope, status
       FROM pre_correction_runs WHERE id = ?`,
    )
    .get(feedback.run_id) as RunRow | undefined;
  if (!run) throw new Error('pre_correction_run_not_found');
  if (
    run.submission_id !== feedback.submission_id ||
    run.owner_id !== feedback.owner_id ||
    run.project_scope !== feedback.project_scope ||
    (feedback.project_id ? run.project_id !== feedback.project_id : run.project_id !== null) ||
    run.status !== 'needs_review'
  ) {
    throw new Error('feedback_context_mismatch');
  }
  assertEvidenceRefs(actor, feedback.project_scope, feedback.evidence_refs, feedback.project_id);
  assertFeedbackModelProfile(feedback.model_profile_ref);

  getDb()
    .prepare(
      `INSERT INTO feedback_drafts
         (id, run_id, submission_id, owner_id, project_id, project_scope, method_version,
          model_profile_ref, observed_strength_ref, observed_issue_ref,
          evidence_refs_json, impact_on_work_ref,
          pedagogical_axis_ref, next_action_ref, validation_criterion_ref,
          tone_level, evaluation_alignment, teacher_validation_required, status,
          validator_id, validation_ref, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1,
               'needs_teacher_validation', NULL, NULL, ?, ?)`,
    )
    .run(
      feedback.feedback_id,
      feedback.run_id,
      feedback.submission_id,
      feedback.owner_id,
      feedback.project_id ?? null,
      feedback.project_scope,
      feedback.method_version,
      feedback.model_profile_ref,
      feedback.observed_strength_ref,
      feedback.observed_issue_ref,
      JSON.stringify(feedback.evidence_refs),
      feedback.impact_on_work_ref,
      feedback.pedagogical_axis_ref,
      feedback.next_action_ref,
      feedback.validation_criterion_ref,
      feedback.tone_level,
      feedback.evaluation_alignment,
      feedback.created_at,
      feedback.updated_at,
    );
  audit({
    event_type: 'feedback.draft_recorded',
    user_id: actor.id,
    scope: feedback.project_scope,
    detail: {
      feedback_id: feedback.feedback_id,
      run_id: feedback.run_id,
      status: 'needs_teacher_validation',
    },
  });
  return getFeedbackDraft(actor, feedback.feedback_id);
}

export function reviewFeedbackDraft(
  actor: AuthUser,
  feedbackId: string,
  decision: 'approved' | 'rejected',
  validationRef: string,
): FeedbackDraft {
  requireTeacher(actor);
  if (!validationRef) throw new Error('validation_ref_required');
  const current = getFeedbackDraft(actor, feedbackId);
  if (actor.id !== current.owner_id) throw new Error('teacher_validation_owner_required');
  if (current.status !== 'needs_teacher_validation') {
    throw new Error('feedback_already_decided');
  }
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE feedback_drafts
       SET status = ?, validator_id = ?, validation_ref = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(decision, actor.id, validationRef, now, feedbackId);
  audit({
    event_type: `feedback.${decision}`,
    user_id: actor.id,
    scope: current.project_scope,
    detail: {feedback_id: feedbackId, status: decision},
  });
  return getFeedbackDraft(actor, feedbackId);
}

export function getFeedbackDraft(actor: AuthUser, feedbackId: string): FeedbackDraft {
  requireTeacher(actor);
  const row = getDb().prepare('SELECT * FROM feedback_drafts WHERE id = ?').get(feedbackId) as
    | FeedbackDraftRow
    | undefined;
  if (!row) throw new Error('feedback_draft_not_found');
  assertSensitiveRead(actor, row.owner_id, row.project_id);
  return toFeedbackDTO(row);
}

/**
 * Liste courte destinée à la Validation Inbox commune.
 *
 * Première tranche D06 volontairement stricte : seul l'owner professeur voit ses
 * brouillons en attente, même lorsqu'un éditeur projet pourrait lire certains
 * objets D06 ailleurs. La décision reste ensuite déléguée à `reviewFeedbackDraft`.
 */
export function listPendingFeedbackDraftsForValidation(actor: AuthUser): FeedbackDraft[] {
  requireTeacher(actor);
  const rows = getDb()
    .prepare(
      `SELECT * FROM feedback_drafts
       WHERE owner_id = ? AND status = 'needs_teacher_validation'
       ORDER BY updated_at ASC`,
    )
    .all(actor.id) as FeedbackDraftRow[];
  return rows.map(toFeedbackDTO);
}

/**
 * Projections owner-only des previews privées en attente pour l'inbox commune.
 * Aucun contenu storage ni fichier final n'est lu ici.
 */
export function listPendingCorrectionExportPreviewsForValidation(
  actor: AuthUser,
): CorrectionExportPreview[] {
  requireTeacher(actor);
  const rows = getDb()
    .prepare(
      `SELECT * FROM correction_export_previews
       WHERE owner_id = ? AND status = 'needs_teacher_validation'
       ORDER BY updated_at ASC`,
    )
    .all(actor.id) as CorrectionExportPreviewRow[];
  return rows.map(toExportDTO);
}

export function recordCorrectionExportPreview(
  actor: AuthUser,
  input: CorrectionExportPreview,
): CorrectionExportPreview {
  requireTeacher(actor);
  const preview = CorrectionExportPreviewSchema.parse(input);
  assertProjectBridge(preview.project_scope, preview.project_id);
  assertDraftAccess(actor, preview.owner_id, preview.project_id, 'export_owner_required');
  if (preview.status !== 'needs_teacher_validation') {
    throw new Error('export_preview_must_need_validation');
  }

  const batch = getDb()
    .prepare('SELECT id, owner_id, project_id, project_scope FROM correction_batches WHERE id = ?')
    .get(preview.batch_id) as BatchRow | undefined;
  if (!batch) throw new Error('correction_batch_not_found');
  if (
    batch.owner_id !== preview.owner_id ||
    batch.project_scope !== preview.project_scope ||
    (preview.project_id ? batch.project_id !== preview.project_id : batch.project_id !== null)
  ) {
    throw new Error('export_scope_mismatch');
  }
  assertApprovedFeedbackSources(preview);

  getDb()
    .prepare(
      `INSERT INTO correction_export_previews
         (id, batch_id, owner_id, project_id, project_scope, format, target,
          source_feedback_refs_json, source_run_refs_json, preview_ref,
          schema_version, contains_private_data, publication_allowed,
          human_validation_required, status, validator_id, validation_ref,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 1,
               'needs_teacher_validation', NULL, NULL, ?, ?)`,
    )
    .run(
      preview.export_id,
      preview.batch_id,
      preview.owner_id,
      preview.project_id ?? null,
      preview.project_scope,
      preview.format,
      preview.target,
      JSON.stringify(preview.source_feedback_refs),
      JSON.stringify(preview.source_run_refs),
      preview.preview_ref,
      preview.schema_version,
      preview.created_at,
      preview.updated_at,
    );
  audit({
    event_type: 'export.preview_recorded',
    user_id: actor.id,
    scope: preview.project_scope,
    detail: {
      export_id: preview.export_id,
      batch_id: preview.batch_id,
      format: preview.format,
      target: preview.target,
      status: 'needs_teacher_validation',
    },
  });
  return getCorrectionExportPreview(actor, preview.export_id);
}

export function reviewCorrectionExportPreview(
  actor: AuthUser,
  exportId: string,
  decision: 'approved_for_export' | 'rejected',
  validationRef: string,
): CorrectionExportPreview {
  requireTeacher(actor);
  if (!validationRef) throw new Error('validation_ref_required');
  const current = getCorrectionExportPreview(actor, exportId);
  if (actor.id !== current.owner_id) throw new Error('export_validation_owner_required');
  if (current.status !== 'needs_teacher_validation') {
    throw new Error('export_preview_already_decided');
  }
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE correction_export_previews
       SET status = ?, validator_id = ?, validation_ref = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(decision, actor.id, validationRef, now, exportId);
  audit({
    event_type: `export.${decision}`,
    user_id: actor.id,
    scope: current.project_scope,
    detail: {export_id: exportId, status: decision, publication_allowed: false},
  });
  return getCorrectionExportPreview(actor, exportId);
}

export function getCorrectionExportPreview(
  actor: AuthUser,
  exportId: string,
): CorrectionExportPreview {
  requireTeacher(actor);
  const row = getDb()
    .prepare('SELECT * FROM correction_export_previews WHERE id = ?')
    .get(exportId) as CorrectionExportPreviewRow | undefined;
  if (!row) throw new Error('export_preview_not_found');
  assertSensitiveRead(actor, row.owner_id, row.project_id);
  return toExportDTO(row);
}

function assertEvidenceRefs(
  actor: AuthUser,
  projectScope: string,
  evidenceRefs: string[],
  projectId?: string | null,
): void {
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

function assertApprovedFeedbackSources(preview: CorrectionExportPreview): void {
  const placeholders = preview.source_feedback_refs.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT id, run_id, owner_id, project_id, project_scope, status FROM feedback_drafts
       WHERE id IN (${placeholders})`,
    )
    .all(...preview.source_feedback_refs) as Array<{
    id: string;
    run_id: string;
    owner_id: string;
    project_id: string | null;
    project_scope: string;
    status: string;
  }>;
  if (rows.length !== preview.source_feedback_refs.length) {
    throw new Error('feedback_source_not_found');
  }
  if (
    rows.some(
      (row) =>
        row.owner_id !== preview.owner_id ||
        row.project_scope !== preview.project_scope ||
        (preview.project_id ? row.project_id !== preview.project_id : row.project_id !== null) ||
        row.status !== 'approved',
    )
  ) {
    throw new Error('feedback_source_not_approved');
  }
  const sourceRuns = new Set(preview.source_run_refs);
  const feedbackRuns = new Set(rows.map((row) => row.run_id));
  if (
    sourceRuns.size !== preview.source_run_refs.length ||
    feedbackRuns.size !== sourceRuns.size ||
    [...feedbackRuns].some((runId) => !sourceRuns.has(runId))
  ) {
    throw new Error('export_run_refs_mismatch');
  }

  const runPlaceholders = preview.source_run_refs.map(() => '?').join(',');
  const runs = getDb()
    .prepare(
      `SELECT id, batch_id, owner_id, project_id, project_scope FROM pre_correction_runs
       WHERE id IN (${runPlaceholders})`,
    )
    .all(...preview.source_run_refs) as Array<{
    id: string;
    batch_id: string;
    owner_id: string;
    project_id: string | null;
    project_scope: string;
  }>;
  if (
    runs.length !== preview.source_run_refs.length ||
    runs.some(
      (run) =>
        run.batch_id !== preview.batch_id ||
        run.owner_id !== preview.owner_id ||
        run.project_scope !== preview.project_scope ||
        (preview.project_id ? run.project_id !== preview.project_id : run.project_id !== null),
    )
  ) {
    throw new Error('export_run_scope_mismatch');
  }
}

function assertFeedbackModelProfile(modelProfileRef: string | null): void {
  if (!modelProfileRef) return;
  const profile = getDb()
    .prepare('SELECT task, status FROM task_model_profiles WHERE id = ?')
    .get(modelProfileRef) as {task: string; status: string} | undefined;
  if (!profile || profile.task !== 'feedback_draft' || profile.status !== 'validated') {
    throw new Error('feedback_model_profile_not_routable');
  }
}
