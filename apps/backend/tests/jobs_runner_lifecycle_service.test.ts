import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  cancelJob,
  completeJob,
  createOcrPrepareJob,
  failJob,
  getJob,
  listJobEvents,
  markJobNeedsReview,
  retryJob,
  updateJobProgress,
} from '../src/services/jobs.ts';

const teacher: AuthUser = {
  id: 'jobs-runner-teacher',
  username: 'jobs_runner_teacher',
  role: 'teacher',
};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
});

function createCopyJob(scope: string) {
  return createOcrPrepareJob(teacher, {
    adapter_id: 'ocr-submission-v1',
    owner_id: teacher.id,
    project_scope: scope,
    source_ref: `storage://private/${scope}/copy.pdf`,
    preflight_ref: `preflight-${scope}`,
    manifest_ref: `manifest-${scope}`,
    consent_ref: null,
    validation_ref: null,
  });
}

describe('PR-C7 — lifecycle interne des runners jobs', () => {
  it('termine un runner sensible en needs_review avec résultat tracé par refs', () => {
    const job = createCopyJob('runner-needs-review');

    updateJobProgress(job.job_id, 30);
    markJobNeedsReview(
      job.job_id,
      {
        artifact_ref: 'storage://private/runner-needs-review/candidate.json',
        summary_ref: 'storage://private/runner-needs-review/summary.md',
      },
      'teacher_validation_required',
    );

    const reviewed = getJob(teacher, job.job_id);
    expect(reviewed.status).toBe('needs_review');
    expect(reviewed.progress).toBe(100);
    expect(reviewed.error).toBeNull();
    expect(reviewed.completed_at).not.toBeNull();
    expect(reviewed.result).toMatchObject({
      artifact_ref: 'storage://private/runner-needs-review/candidate.json',
    });
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
      'job_started',
      'job_progress',
      'job_needs_review',
    ]);
  });

  it('clôture un job non sensible en completed sans route publique', () => {
    const job = createCopyJob('runner-completed');

    completeJob(job.job_id, {
      manifest_ref: 'manifest-runner-completed',
      output_count: 2,
    });

    const completed = getJob(teacher, job.job_id);
    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
    expect(completed.result).toMatchObject({output_count: 2});
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
      'job_started',
      'job_completed',
    ]);
  });

  it('clôture en failed puis autorise retry sans effacer les events', () => {
    const job = createCopyJob('runner-failed');

    failJob(job.job_id, 'runner_timeout', {stage: 'ocr'});

    const failed = getJob(teacher, job.job_id);
    expect(failed.status).toBe('failed');
    expect(failed.error).toBe('runner_timeout');
    expect(failed.completed_at).not.toBeNull();

    const retried = retryJob(teacher, job.job_id);
    expect(retried.status).toBe('queued');
    expect(retried.retry_count).toBe(1);
    expect(listJobEvents(teacher, job.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
      'job_started',
      'job_failed',
      'job_retried',
    ]);
  });

  it('refuse finalisation après cancel et payloads contenant des secrets', () => {
    const cancelled = createCopyJob('runner-cancelled');
    cancelJob(teacher, cancelled.job_id);

    expect(() =>
      markJobNeedsReview(cancelled.job_id, {artifact_ref: 'storage://private/cancelled'}, 'review'),
    ).toThrow('job_not_finalizable');

    const secretResult = createCopyJob('runner-secret-result');
    expect(() =>
      completeJob(secretResult.job_id, {
        api_key: 'secret-key',
      }),
    ).toThrow('job_payload_contains_secret');

    const secretError = createCopyJob('runner-secret-error');
    expect(() => failJob(secretError.job_id, 'password leaked')).toThrow(
      'job_payload_contains_secret',
    );
  });
});
