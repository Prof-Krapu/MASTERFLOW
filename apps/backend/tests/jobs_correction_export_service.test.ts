import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createCorrectionPrepareJob,
  createExportPrepareJob,
  listJobEvents,
} from '../src/services/jobs.ts';

const teacher: AuthUser = {
  id: 'jobs-correction-export-teacher',
  username: 'jobs_correction_export_teacher',
  role: 'teacher',
};
const otherTeacher: AuthUser = {
  id: 'jobs-correction-export-other',
  username: 'jobs_correction_export_other',
  role: 'teacher',
};
const admin: AuthUser = {
  id: 'jobs-correction-export-admin',
  username: 'jobs_correction_export_admin',
  role: 'admin',
};
const student: AuthUser = {
  id: 'jobs-correction-export-student',
  username: 'jobs_correction_export_student',
  role: 'student',
};

const now = Date.now();

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

  db.prepare(
    `INSERT INTO rubric_templates
       (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES ('template-job-correction-export', ?, 'course-job-correction-export',
             'Jobs correction export', 'active', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES ('rubric-job-correction-export-v1', 'template-job-correction-export', 1,
             'course-job-correction-export', ?, 20, 'validated', ?, ?)`,
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
     VALUES ('grading-job-correction-export-v1', ?, 'course-job-correction-export', 1,
             '[0,20]', '[13,14]', '{}', 'diagnostic_then_teacher_validation',
             1, '[10]', 1, 'validated', ?)`,
  ).run(teacher.id, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-job-correction-export', ?, 'course-job-correction-export',
             'rubric-job-correction-export-v1', 'grading-job-correction-export-v1',
             'review', 1, ?, ?)`,
  ).run(teacher.id, now, now);
  const insertManifest = db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_scope, rubric_version_id, grading_profile_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES (?, 'batch-job-correction-export', 'course-job-correction-export',
             'rubric-job-correction-export-v1', 'grading-job-correction-export-v1',
             '[]', 'workflow-job-v1', ?, ?, ?, ?)`,
  );
  insertManifest.run(
    'manifest-job-correction-export-valid',
    'validated',
    teacher.id,
    'validation-job-correction-export',
    now,
  );
  insertManifest.run(
    'manifest-job-correction-export-draft',
    'draft',
    teacher.id,
    null,
    now,
  );
  db.prepare(
    `INSERT INTO correction_export_previews
       (id, batch_id, owner_id, project_scope, format, target,
        source_feedback_refs_json, source_run_refs_json, preview_ref,
        schema_version, contains_private_data, publication_allowed,
        human_validation_required, status, validator_id, validation_ref,
        created_at, updated_at)
     VALUES ('export-preview-job-approved', 'batch-job-correction-export', ?,
             'course-job-correction-export', 'xlsx', 'teacher_download',
             '["feedback-job-approved"]', '["run-job-approved"]',
             'storage://private/export-previews/job-approved.xlsx',
             'correction-export-v1', 1, 0, 1, 'approved_for_export', ?,
             'validation-export-job-approved', ?, ?)`,
  ).run(teacher.id, teacher.id, now, now);
  db.prepare(
    `INSERT INTO correction_export_previews
       (id, batch_id, owner_id, project_scope, format, target,
        source_feedback_refs_json, source_run_refs_json, preview_ref,
        schema_version, contains_private_data, publication_allowed,
        human_validation_required, status, validator_id, validation_ref,
        created_at, updated_at)
     VALUES ('export-preview-job-pending', 'batch-job-correction-export', ?,
             'course-job-correction-export', 'xlsx', 'teacher_download',
             '["feedback-job-pending"]', '["run-job-pending"]',
             'storage://private/export-previews/job-pending.xlsx',
             'correction-export-v1', 1, 0, 1, 'needs_teacher_validation',
             NULL, NULL, ?, ?)`,
  ).run(teacher.id, now, now);
});

describe('PR-C6 — handoffs jobs correction/export', () => {
  it('crée un correction_prepare seulement depuis un manifest validé', () => {
    const job = createCorrectionPrepareJob(teacher, {
      owner_id: teacher.id,
      project_scope: 'course-job-correction-export',
      batch_id: 'batch-job-correction-export',
      manifest_ref: 'manifest-job-correction-export-valid',
      preflight_ref: 'preflight-correction-job',
      validation_ref: 'validation-job-correction-export',
      workflow_version: 'workflow-job-v1',
      source_kind: 'validated_pre_correction_manifest',
    });

    expect(job.type).toBe('correction_prepare');
    expect(job.status).toBe('queued');
    expect(job.risk_level).toBe('high');
    expect(job.scope_type).toBe('batch');
    expect(job.payload).toMatchObject({
      manifest_ref: 'manifest-job-correction-export-valid',
      preflight_ref: 'preflight-correction-job',
      validation_ref: 'validation-job-correction-export',
    });
    expect(JSON.stringify(job.payload)).not.toContain('storage://private');
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
    ]);

    expect(() =>
      createCorrectionPrepareJob(teacher, {
        owner_id: teacher.id,
        project_scope: 'course-job-correction-export',
        batch_id: 'batch-job-correction-export',
        manifest_ref: 'manifest-job-correction-export-draft',
        preflight_ref: 'preflight-correction-draft',
        validation_ref: 'validation-job-correction-export',
        workflow_version: 'workflow-job-v1',
        source_kind: 'validated_pre_correction_manifest',
      }),
    ).toThrow('correction_manifest_not_validated');
  });

  it('garde la création correction/export owner-only', () => {
    const request = {
      owner_id: teacher.id,
      project_scope: 'course-job-correction-export',
      batch_id: 'batch-job-correction-export',
      manifest_ref: 'manifest-job-correction-export-valid',
      preflight_ref: 'preflight-correction-owner',
      validation_ref: 'validation-job-correction-export',
      workflow_version: 'workflow-job-v1',
      source_kind: 'validated_pre_correction_manifest' as const,
    };

    expect(() => createCorrectionPrepareJob(student, request)).toThrow('permission_denied');
    expect(() => createCorrectionPrepareJob(otherTeacher, request)).toThrow('job_owner_required');
    expect(() => createCorrectionPrepareJob(admin, request)).toThrow('job_owner_required');
  });

  it('crée un export_prepare seulement depuis une preview approuvée', () => {
    const job = createExportPrepareJob(teacher, {
      owner_id: teacher.id,
      project_scope: 'course-job-correction-export',
      batch_id: 'batch-job-correction-export',
      export_preview_ref: 'export-preview-job-approved',
      preflight_ref: 'preflight-export-job',
      validation_ref: 'validation-export-job-approved',
      source_kind: 'approved_correction_export_preview',
    });

    expect(job.type).toBe('export_prepare');
    expect(job.status).toBe('queued');
    expect(job.scope_type).toBe('export_preview');
    expect(job.payload).toMatchObject({
      export_preview_ref: 'export-preview-job-approved',
      format: 'xlsx',
      target: 'teacher_download',
      preflight_ref: 'preflight-export-job',
      validation_ref: 'validation-export-job-approved',
    });
    expect(JSON.stringify(job.payload)).not.toContain('storage://private');

    expect(() =>
      createExportPrepareJob(teacher, {
        owner_id: teacher.id,
        project_scope: 'course-job-correction-export',
        batch_id: 'batch-job-correction-export',
        export_preview_ref: 'export-preview-job-pending',
        preflight_ref: 'preflight-export-pending',
        validation_ref: 'validation-export-job-approved',
        source_kind: 'approved_correction_export_preview',
      }),
    ).toThrow('export_preview_not_approved');
  });

  it('refuse les refs de validation incohérentes', () => {
    expect(() =>
      createCorrectionPrepareJob(teacher, {
        owner_id: teacher.id,
        project_scope: 'course-job-correction-export',
        batch_id: 'batch-job-correction-export',
        manifest_ref: 'manifest-job-correction-export-valid',
        preflight_ref: 'preflight-correction-wrong-validation',
        validation_ref: 'wrong-validation',
        workflow_version: 'workflow-job-v1',
        source_kind: 'validated_pre_correction_manifest',
      }),
    ).toThrow('correction_prepare_context_mismatch');

    expect(() =>
      createExportPrepareJob(teacher, {
        owner_id: teacher.id,
        project_scope: 'course-job-correction-export',
        batch_id: 'batch-job-correction-export',
        export_preview_ref: 'export-preview-job-approved',
        preflight_ref: 'preflight-export-wrong-validation',
        validation_ref: 'wrong-validation',
        source_kind: 'approved_correction_export_preview',
      }),
    ).toThrow('export_prepare_context_mismatch');
  });
});
