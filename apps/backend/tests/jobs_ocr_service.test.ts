import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  cancelJob,
  createOcrPrepareJob,
  getJob,
  listJobEvents,
  listJobs,
  retryJob,
  updateJobProgress,
} from '../src/services/jobs.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const teacher: AuthUser = {id: 'jobs-teacher', username: 'jobs_teacher', role: 'teacher'};
const otherTeacher: AuthUser = {
  id: 'jobs-other-teacher',
  username: 'jobs_other_teacher',
  role: 'teacher',
};
const student: AuthUser = {id: 'jobs-student', username: 'jobs_student', role: 'student'};
const admin: AuthUser = {id: 'jobs-admin', username: 'jobs_admin', role: 'admin'};
let ocrProjectId = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, otherTeacher, student, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(teacher, {name: 'Projet OCR bridge'});
  ocrProjectId = project.project_id;
  addProjectMember(teacher, ocrProjectId, {user_id: otherTeacher.id, role: 'editor'});
  addProjectMember(teacher, ocrProjectId, {user_id: student.id, role: 'participant'});

  getDb()
    .prepare(
      `INSERT INTO rubric_templates
         (id, owner_id, project_id, project_scope, title, status, created_at, updated_at)
       VALUES ('template-ocr-project', ?, ?, ?, 'OCR projet', 'active', ?, ?)`,
    )
    .run(teacher.id, ocrProjectId, ocrProjectId, now, now);
  getDb()
    .prepare(
      `INSERT INTO rubric_versions
         (id, template_id, version, project_id, project_scope, criteria_json, total_points,
          status, created_by, created_at)
       VALUES ('rubric-ocr-project-v1', 'template-ocr-project', 1, ?, ?, ?, 20,
               'validated', ?, ?)`,
    )
    .run(
      ocrProjectId,
      ocrProjectId,
      JSON.stringify([
        {
          criterion_id: 'global',
          label: 'Global',
          description: 'OCR projet.',
          weight: 1,
          max_points: 20,
          evidence_requirements: [],
          required: true,
        },
      ]),
      teacher.id,
      now,
    );
  getDb()
    .prepare(
      `INSERT INTO institutional_grading_profiles
         (id, owner_id, project_id, project_scope, version, scale_json, expected_band_json,
          anchors_json, calibration_mode, max_global_delta,
          protected_thresholds_json, threshold_crossing_requires_validation,
          status, created_at)
       VALUES ('grading-ocr-project-v1', ?, ?, ?, 1, '[0,20]', '[13,14]', '{}',
               'diagnostic_then_teacher_validation', 1, '[10]', 1, 'validated', ?)`,
    )
    .run(teacher.id, ocrProjectId, ocrProjectId, now);
  getDb()
    .prepare(
      `INSERT INTO correction_batches
         (id, owner_id, project_id, project_scope, rubric_version_id, grading_profile_id,
          status, submission_count, created_at, updated_at)
       VALUES ('batch-ocr-project', ?, ?, ?, 'rubric-ocr-project-v1',
               'grading-ocr-project-v1', 'draft', 0, ?, ?)`,
    )
    .run(teacher.id, ocrProjectId, ocrProjectId, now, now);
  getDb()
    .prepare(
      `INSERT INTO pre_correction_manifests
         (id, batch_id, project_id, project_scope, rubric_version_id, grading_profile_id,
          submission_refs_json, workflow_version, status, created_by,
          validation_ref, created_at)
       VALUES ('manifest-ocr-project', 'batch-ocr-project', ?, ?,
               'rubric-ocr-project-v1', 'grading-ocr-project-v1', '[]',
               'workflow-ocr-v1', 'validated', ?, 'validation-ocr-project', ?)`,
    )
    .run(ocrProjectId, ocrProjectId, teacher.id, now);
});

describe('PR-C2 — service jobs OCR', () => {
  it('crée un ocr_prepare de copie avec références seulement', () => {
    const job = createOcrPrepareJob(teacher, {
      adapter_id: 'ocr-submission-v1',
      owner_id: teacher.id,
      project_scope: 'course-jobs',
      source_ref: 'storage://private/copy-001.pdf',
      preflight_ref: 'preflight-copy-001',
      manifest_ref: 'manifest-copy-001',
      consent_ref: null,
      validation_ref: null,
    });

    expect(job.status).toBe('queued');
    expect(job.type).toBe('ocr_prepare');
    expect(job.progress).toBe(0);
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
    ]);
  });

  it('exige consentement morphologique et interdit les secrets dans le payload', () => {
    expect(() =>
      createOcrPrepareJob(student, {
        adapter_id: 'morphological-reference-v1',
        owner_id: student.id,
        project_scope: 'user-canon-jobs',
        source_ref: 'storage://private/photo-001.jpg',
        preflight_ref: 'preflight-photo-001',
        manifest_ref: null,
        consent_ref: null,
        validation_ref: null,
      }),
    ).toThrow();

    expect(() =>
      createOcrPrepareJob(student, {
        adapter_id: 'morphological-reference-v1',
        owner_id: student.id,
        project_scope: 'user-canon-jobs',
        source_ref: 'storage://private/password-photo.jpg',
        preflight_ref: 'preflight-photo-002',
        manifest_ref: null,
        consent_ref: 'consent-photo-001',
        validation_ref: null,
      }),
    ).toThrow('job_payload_contains_secret');
  });

  it('relie l OCR de copie au manifest validé et aux éditeurs du projet', () => {
    const job = createOcrPrepareJob(otherTeacher, {
      adapter_id: 'ocr-submission-v1',
      owner_id: teacher.id,
      project_id: ocrProjectId,
      project_scope: ocrProjectId,
      source_ref: 'storage://private/project-copy-001.pdf',
      preflight_ref: 'preflight-project-copy-001',
      manifest_ref: 'manifest-ocr-project',
      consent_ref: null,
      validation_ref: 'validation-ocr-project',
    });

    expect(job.payload).toMatchObject({
      adapter_id: 'ocr-submission-v1',
      project_id: ocrProjectId,
      manifest_ref: 'manifest-ocr-project',
    });
    expect(listJobs(otherTeacher).map((item) => item.job_id)).toContain(job.job_id);
    expect(listJobs(student).map((item) => item.job_id)).not.toContain(job.job_id);
    expect(() =>
      createOcrPrepareJob(otherTeacher, {
        adapter_id: 'ocr-submission-v1',
        owner_id: teacher.id,
        project_id: ocrProjectId,
        project_scope: 'legacy-free-text',
        source_ref: 'storage://private/project-copy-mismatch.pdf',
        preflight_ref: 'preflight-project-copy-mismatch',
        manifest_ref: 'manifest-ocr-project',
        consent_ref: null,
        validation_ref: 'validation-ocr-project',
      }),
    ).toThrow('project_scope_mismatch');
    expect(() =>
      createOcrPrepareJob(otherTeacher, {
        adapter_id: 'ocr-submission-v1',
        owner_id: teacher.id,
        project_id: ocrProjectId,
        project_scope: ocrProjectId,
        source_ref: 'storage://private/project-copy-wrong-validation.pdf',
        preflight_ref: 'preflight-project-copy-wrong-validation',
        manifest_ref: 'manifest-ocr-project',
        consent_ref: null,
        validation_ref: 'wrong-validation',
      }),
    ).toThrow('ocr_prepare_context_mismatch');
    expect(() =>
      createOcrPrepareJob(admin, {
        adapter_id: 'ocr-submission-v1',
        owner_id: teacher.id,
        project_id: ocrProjectId,
        project_scope: ocrProjectId,
        source_ref: 'storage://private/project-copy-admin.pdf',
        preflight_ref: 'preflight-project-copy-admin',
        manifest_ref: 'manifest-ocr-project',
        consent_ref: null,
        validation_ref: 'validation-ocr-project',
      }),
    ).toThrow('ocr_teacher_required');
  });

  it('garde l OCR morphologique personnel même dans un projet', () => {
    const job = createOcrPrepareJob(student, {
      adapter_id: 'morphological-reference-v1',
      owner_id: student.id,
      project_id: ocrProjectId,
      project_scope: ocrProjectId,
      source_ref: 'storage://private/morphology-project-photo.jpg',
      preflight_ref: 'preflight-morphology-project',
      manifest_ref: null,
      consent_ref: 'consent-morphology-project',
      validation_ref: null,
    });

    expect(getJob(student, job.job_id).job_id).toBe(job.job_id);
    expect(() => getJob(otherTeacher, job.job_id)).toThrow('job_not_found');
    expect(listJobs(otherTeacher).map((item) => item.job_id)).not.toContain(job.job_id);
    expect(getJob(admin, job.job_id).job_id).toBe(job.job_id);
  });

  it('isole les jobs par owner mais permet la supervision admin', () => {
    expect(listJobs(otherTeacher)).toEqual([
      expect.objectContaining({
        type: 'ocr_prepare',
        payload: expect.objectContaining({
          adapter_id: 'ocr-submission-v1',
          project_id: ocrProjectId,
        }),
      }),
    ]);
    expect(listJobs(admin).length).toBeGreaterThan(0);
    const teacherJob = listJobs(teacher).find(
      (job) =>
        job.type === 'ocr_prepare' &&
        !(job.payload as {project_id?: string}).project_id,
    );
    expect(teacherJob).toBeDefined();
    expect(() => getJob(otherTeacher, teacherJob!.job_id)).toThrow('job_not_found');
  });

  it('impose une progression monotone et trace cancel', () => {
    const job = listJobs(teacher)[0]!;
    updateJobProgress(job.job_id, 25);
    updateJobProgress(job.job_id, 60);
    expect(() => updateJobProgress(job.job_id, 40)).toThrow('job_progress_must_be_monotone');
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toContain(
      'job_started',
    );

    const cancelled = cancelJob(teacher, job.job_id);
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelled_at).not.toBeNull();
    expect(listJobEvents(teacher, job.job_id).at(-1)?.event_type).toBe('job_cancelled');
    expect(() => cancelJob(teacher, job.job_id)).toThrow('job_not_cancellable');
  });

  it('retry un job failed sans effacer son historique', () => {
    const job = createOcrPrepareJob(teacher, {
      adapter_id: 'ocr-submission-v1',
      owner_id: teacher.id,
      project_scope: 'course-retry',
      source_ref: 'storage://private/copy-retry.pdf',
      preflight_ref: 'preflight-retry',
      manifest_ref: 'manifest-retry',
      consent_ref: null,
      validation_ref: null,
    });
    getDb()
      .prepare("UPDATE jobs SET status = 'failed', error = 'runner_unavailable', progress = 20 WHERE id = ?")
      .run(job.job_id);

    const retried = retryJob(teacher, job.job_id);
    expect(retried.status).toBe('queued');
    expect(retried.progress).toBe(0);
    expect(retried.retry_count).toBe(1);
    expect(retried.error).toBeNull();
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
      'job_retried',
    ]);
  });
});
