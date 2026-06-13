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

const teacher: AuthUser = {id: 'jobs-teacher', username: 'jobs_teacher', role: 'teacher'};
const otherTeacher: AuthUser = {
  id: 'jobs-other-teacher',
  username: 'jobs_other_teacher',
  role: 'teacher',
};
const student: AuthUser = {id: 'jobs-student', username: 'jobs_student', role: 'student'};
const admin: AuthUser = {id: 'jobs-admin', username: 'jobs_admin', role: 'admin'};

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

  it('isole les jobs par owner mais permet la supervision admin', () => {
    expect(listJobs(otherTeacher)).toEqual([]);
    expect(listJobs(admin).length).toBeGreaterThan(0);
    const teacherJob = listJobs(teacher)[0];
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
