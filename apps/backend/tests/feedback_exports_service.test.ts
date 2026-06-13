import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  getCorrectionExportPreview,
  getFeedbackDraft,
  recordCorrectionExportPreview,
  recordFeedbackDraft,
  reviewCorrectionExportPreview,
  reviewFeedbackDraft,
} from '../src/services/feedback_exports.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const teacher: AuthUser = {
  id: 'teacher-feedback-export',
  username: 'teacher_feedback_export',
  role: 'teacher',
};
const otherTeacher: AuthUser = {
  id: 'teacher-feedback-export-other',
  username: 'teacher_feedback_export_other',
  role: 'teacher',
};
const admin: AuthUser = {
  id: 'admin-feedback-export',
  username: 'admin_feedback_export',
  role: 'admin',
};
const student: AuthUser = {
  id: 'student-feedback-export',
  username: 'student_feedback_export',
  role: 'student',
};
const now = Date.now();
let feedbackProjectId = '';

const feedbackInput = {
  feedback_id: 'feedback-export-valid',
  run_id: 'run-feedback-export',
  submission_id: 'submission-feedback-export',
  owner_id: teacher.id,
  project_scope: 'course-feedback-export',
  method_version: 'student-safe-feedback-v1',
  model_profile_ref: null,
  observed_strength_ref: 'storage://private/feedback/strength',
  observed_issue_ref: 'storage://private/feedback/issue',
  evidence_refs: ['evidence-feedback-export'],
  impact_on_work_ref: 'storage://private/feedback/impact',
  pedagogical_axis_ref: 'storage://private/feedback/axis',
  next_action_ref: 'storage://private/feedback/action',
  validation_criterion_ref: 'storage://private/feedback/criterion',
  tone_level: 'clear' as const,
  evaluation_alignment: 'aligned' as const,
  teacher_validation_required: true as const,
  status: 'needs_teacher_validation' as const,
  validator_id: null,
  validation_ref: null,
  created_at: now,
  updated_at: now,
};

const exportInput = {
  export_id: 'correction-export-valid',
  batch_id: 'batch-feedback-export',
  owner_id: teacher.id,
  project_scope: 'course-feedback-export',
  format: 'xlsx' as const,
  target: 'teacher_download' as const,
  source_feedback_refs: [feedbackInput.feedback_id],
  source_run_refs: [feedbackInput.run_id],
  preview_ref: 'storage://private/export-previews/correction-export-valid.xlsx',
  schema_version: 'correction-export-v1',
  contains_private_data: true as const,
  publication_allowed: false as const,
  human_validation_required: true as const,
  status: 'needs_teacher_validation' as const,
  validator_id: null,
  validation_ref: null,
  created_at: now,
  updated_at: now,
};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, otherTeacher, admin, student]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(teacher, {name: 'Projet feedback export bridge'});
  feedbackProjectId = project.project_id;
  addProjectMember(teacher, feedbackProjectId, {user_id: otherTeacher.id, role: 'editor'});
  db.prepare(
    `INSERT INTO evidence_events
       (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
        payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
     VALUES ('evidence-feedback-export', 'submission', 'ocr-submission-v1', ?,
             'course-feedback-export', '["submission-feedback-export"]',
             'storage://private/submissions/feedback-export', 0.9, 'private',
             ?, 'candidate', ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_templates
       (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES ('template-feedback-export', ?, 'course-feedback-export',
             'Feedback export', 'active', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES ('rubric-feedback-export-v1', 'template-feedback-export', 1,
             'course-feedback-export', ?, 20, 'validated', ?, ?)`,
  ).run(
    JSON.stringify([
      {
        criterion_id: 'global',
        label: 'Global',
        description: 'Critère global.',
        weight: 1,
        max_points: 20,
        evidence_requirements: [],
        required: true,
      },
    ]),
    teacher.id,
    now,
  );
  db.prepare(
    `INSERT INTO institutional_grading_profiles
       (id, owner_id, project_scope, version, scale_json, expected_band_json,
        anchors_json, calibration_mode, max_global_delta,
        protected_thresholds_json, threshold_crossing_requires_validation,
        status, created_at)
     VALUES ('grading-feedback-export-v1', ?, 'course-feedback-export', 1,
             '[0,20]', '[13,14]', '{}', 'diagnostic_then_teacher_validation',
             1, '[10]', 1, 'validated', ?)`,
  ).run(teacher.id, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-feedback-export', ?, 'course-feedback-export',
             'rubric-feedback-export-v1', 'grading-feedback-export-v1',
             'review', 1, ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO submissions
       (id, batch_id, owner_id, project_scope, source_evidence_ref,
        identity_status, status, privacy_level, created_at, updated_at)
     VALUES ('submission-feedback-export', 'batch-feedback-export', ?,
             'course-feedback-export', 'evidence-feedback-export',
             'confirmed', 'review', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_scope, rubric_version_id, grading_profile_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES ('manifest-feedback-export', 'batch-feedback-export',
             'course-feedback-export', 'rubric-feedback-export-v1',
             'grading-feedback-export-v1', '["submission-feedback-export"]',
             'workflow-v1', 'validated', ?, 'validation-feedback-export', ?)`,
  ).run(teacher.id, now);
  db.prepare(
    `INSERT INTO pre_correction_runs
       (id, manifest_id, batch_id, submission_id, owner_id, project_scope,
        rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
        method_version, criterion_score_refs_json, review_reasons_json,
        status, created_at, updated_at)
     VALUES ('run-feedback-export', 'manifest-feedback-export',
             'batch-feedback-export', 'submission-feedback-export', ?,
             'course-feedback-export', 'rubric-feedback-export-v1',
             'grading-feedback-export-v1', 'rubric_scoring',
             'storage://private/snapshots/feedback-export', 'criterion-analysis-v1',
             '["score-feedback-export"]', '["teacher_validation_required"]',
             'needs_review', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO criterion_score_drafts
       (id, run_id, submission_id, rubric_version_id, criterion_id,
        draft_score, max_points, evidence_refs_json, confidence, status, created_at)
     VALUES ('score-feedback-export', 'run-feedback-export',
             'submission-feedback-export', 'rubric-feedback-export-v1',
             'global', 13, 20, '["evidence-feedback-export"]',
             0.85, 'candidate', ?)`,
  ).run(now);

  db.prepare(
    `INSERT INTO evidence_events
       (id, source_type, adapter_id, owner_id, project_id, project_scope, target_refs_json,
        payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
     VALUES ('evidence-feedback-project', 'teacher_note', 'teacher-note-v1', ?, ?, ?,
             '["submission-feedback-project"]', 'storage://private/project-feedback-evidence',
             0.9, 'private', ?, 'candidate', ?)`,
  ).run(otherTeacher.id, feedbackProjectId, feedbackProjectId, now, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-feedback-project', ?, ?, ?, 'rubric-feedback-export-v1',
             'grading-feedback-export-v1', 'review', 1, ?, ?)`,
  ).run(teacher.id, feedbackProjectId, feedbackProjectId, now, now);
  db.prepare(
    `INSERT INTO submissions
       (id, batch_id, owner_id, project_id, project_scope, source_evidence_ref,
        identity_status, status, privacy_level, created_at, updated_at)
     VALUES ('submission-feedback-project', 'batch-feedback-project', ?, ?, ?,
             'evidence-feedback-project', 'confirmed', 'review', 'private', ?, ?)`,
  ).run(teacher.id, feedbackProjectId, feedbackProjectId, now, now);
  db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_id, project_scope, rubric_version_id, grading_profile_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES ('manifest-feedback-project', 'batch-feedback-project', ?, ?,
             'rubric-feedback-export-v1', 'grading-feedback-export-v1',
             '["submission-feedback-project"]', 'workflow-project-v1', 'validated', ?,
             'validation-feedback-project', ?)`,
  ).run(feedbackProjectId, feedbackProjectId, teacher.id, now);
  db.prepare(
    `INSERT INTO pre_correction_runs
       (id, manifest_id, batch_id, submission_id, owner_id, project_id, project_scope,
        rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
        method_version, criterion_score_refs_json, review_reasons_json,
        status, created_at, updated_at)
     VALUES ('run-feedback-project', 'manifest-feedback-project',
             'batch-feedback-project', 'submission-feedback-project', ?, ?, ?,
             'rubric-feedback-export-v1', 'grading-feedback-export-v1', 'rubric_scoring',
             'storage://private/snapshots/feedback-project', 'criterion-analysis-v1',
             '["score-feedback-project"]', '["teacher_validation_required"]',
             'needs_review', ?, ?)`,
  ).run(teacher.id, feedbackProjectId, feedbackProjectId, now, now);
});

describe('PR-C5 — service feedback et exports supervisés', () => {
  it('refuse student et teacher hors owner', () => {
    expect(() => recordFeedbackDraft(student, feedbackInput)).toThrow('permission_denied');
    expect(() => recordFeedbackDraft(otherTeacher, feedbackInput)).toThrow('scope_denied');
    expect(() => recordFeedbackDraft(admin, feedbackInput)).toThrow('feedback_owner_required');
  });

  it('enregistre un feedback en attente et interdit l export avant approbation', () => {
    const draft = recordFeedbackDraft(teacher, feedbackInput);
    expect(draft.status).toBe('needs_teacher_validation');
    expect(draft.teacher_validation_required).toBe(true);
    expect(() => recordCorrectionExportPreview(teacher, exportInput)).toThrow(
      'feedback_source_not_approved',
    );
    expect(() => recordCorrectionExportPreview(admin, exportInput)).toThrow(
      'export_owner_required',
    );
    expect(() =>
      reviewFeedbackDraft(admin, draft.feedback_id, 'approved', 'admin-validation'),
    ).toThrow('teacher_validation_owner_required');
  });

  it('valide le feedback puis autorise seulement une preview privée', () => {
    const approvedFeedback = reviewFeedbackDraft(
      teacher,
      feedbackInput.feedback_id,
      'approved',
      'feedback-validation-owner',
    );
    expect(approvedFeedback.status).toBe('approved');
    expect(approvedFeedback.validator_id).toBe(teacher.id);

    const preview = recordCorrectionExportPreview(teacher, exportInput);
    expect(preview.status).toBe('needs_teacher_validation');
    expect(preview.publication_allowed).toBe(false);
    expect(preview.contains_private_data).toBe(true);
    expect(() =>
      reviewCorrectionExportPreview(
        admin,
        preview.export_id,
        'approved_for_export',
        'admin-export-validation',
      ),
    ).toThrow('export_validation_owner_required');

    const approvedExport = reviewCorrectionExportPreview(
      teacher,
      preview.export_id,
      'approved_for_export',
      'export-validation-owner',
    );
    expect(approvedExport.status).toBe('approved_for_export');
    expect(approvedExport.publication_allowed).toBe(false);
    expect(getFeedbackDraft(admin, approvedFeedback.feedback_id)).toEqual(approvedFeedback);
    expect(getCorrectionExportPreview(admin, approvedExport.export_id)).toEqual(approvedExport);
  });

  it('permet la préparation projet par un éditeur mais réserve les validations à l owner', () => {
    const projectFeedback = {
      ...feedbackInput,
      feedback_id: 'feedback-project-valid',
      run_id: 'run-feedback-project',
      submission_id: 'submission-feedback-project',
      project_id: feedbackProjectId,
      project_scope: feedbackProjectId,
      evidence_refs: ['evidence-feedback-project'],
    };
    const draft = recordFeedbackDraft(otherTeacher, projectFeedback);
    expect(draft).toMatchObject({
      project_id: feedbackProjectId,
      owner_id: teacher.id,
      status: 'needs_teacher_validation',
    });
    expect(getFeedbackDraft(otherTeacher, draft.feedback_id)).toEqual(draft);
    expect(() =>
      reviewFeedbackDraft(
        otherTeacher,
        draft.feedback_id,
        'approved',
        'feedback-project-editor-validation',
      ),
    ).toThrow('teacher_validation_owner_required');

    const approvedFeedback = reviewFeedbackDraft(
      teacher,
      draft.feedback_id,
      'approved',
      'feedback-project-owner-validation',
    );
    const projectExport = {
      ...exportInput,
      export_id: 'correction-export-project-valid',
      batch_id: 'batch-feedback-project',
      project_id: feedbackProjectId,
      project_scope: feedbackProjectId,
      source_feedback_refs: [approvedFeedback.feedback_id],
      source_run_refs: ['run-feedback-project'],
      preview_ref: 'storage://private/export-previews/correction-export-project-valid.xlsx',
    };
    const preview = recordCorrectionExportPreview(otherTeacher, projectExport);
    expect(preview).toMatchObject({
      project_id: feedbackProjectId,
      status: 'needs_teacher_validation',
      publication_allowed: false,
    });
    expect(() =>
      reviewCorrectionExportPreview(
        otherTeacher,
        preview.export_id,
        'approved_for_export',
        'export-project-editor-validation',
      ),
    ).toThrow('export_validation_owner_required');
    expect(
      reviewCorrectionExportPreview(
        teacher,
        preview.export_id,
        'approved_for_export',
        'export-project-owner-validation',
      ),
    ).toMatchObject({status: 'approved_for_export', project_id: feedbackProjectId});

    expect(() =>
      recordFeedbackDraft(admin, {
        ...projectFeedback,
        feedback_id: 'feedback-project-admin-denied',
      }),
    ).toThrow('feedback_owner_required');
    expect(() =>
      recordFeedbackDraft(otherTeacher, {
        ...projectFeedback,
        feedback_id: 'feedback-project-scope-mismatch',
        project_scope: 'legacy-free-text',
      }),
    ).toThrow('project_scope_mismatch');
  });

  it('ne crée aucun job, fichier final ou publication implicitement', () => {
    const jobs = getDb()
      .prepare("SELECT id FROM jobs WHERE type = 'export_prepare'")
      .all();
    expect(jobs).toHaveLength(0);
    const columns = getDb()
      .prepare("PRAGMA table_info('correction_export_previews')")
      .all() as Array<{name: string}>;
    expect(columns.map((column) => column.name)).not.toContain('published_at');
    expect(columns.map((column) => column.name)).not.toContain('delivery_url');
  });

  it('audite les décisions sans copier le contenu privé', () => {
    const rows = getDb()
      .prepare(
        `SELECT detail_json FROM audit_logs
         WHERE event_type IN (
           'feedback.draft_recorded','feedback.approved',
           'export.preview_recorded','export.approved_for_export'
         )`,
      )
      .all() as Array<{detail_json: string}>;
    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row.detail_json).not.toContain('storage://private');
      expect(row.detail_json).not.toContain('evidence-feedback-export');
      expect(row.detail_json).not.toContain('submission-feedback-export');
    }
  });
});
