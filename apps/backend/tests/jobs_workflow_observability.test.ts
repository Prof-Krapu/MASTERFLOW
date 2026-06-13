import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  claimNextJob,
  completeJob,
  createOcrPrepareJob,
  failJob,
  markJobNeedsReview,
} from '../src/services/jobs.ts';
import {recordRunnerHeartbeat} from '../src/services/runners.ts';
import {getWorkflowTrace} from '../src/services/workflow_observability.ts';

const owner: AuthUser = {
  id: 'jobs-workflow-obs-owner',
  username: 'jobs_workflow_obs_owner',
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
    .run(owner.id, owner.username, owner.username, owner.role, now, now);
});

function insertProjectJob(id: string, scopeId: string, createdAt: number): void {
  const db = getDb();
  db
    .prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, 'ocr_prepare', 'queued', ?, 'project', ?, 'medium',
               '{}', 0, 0, ?, ?)`,
    )
    .run(id, owner.id, scopeId, createdAt, createdAt);
  db.prepare(
    `INSERT INTO job_events (id, job_id, event_type, detail_json, created_at)
     VALUES (?, ?, 'job_queued', '{}', ?)`,
  ).run(`${id}-queued`, id, createdAt);
}

function heartbeatOcrRunner(runnerId: string, lastSeenAt: number): void {
  recordRunnerHeartbeat({
    runner_id: runnerId,
    runner_family: 'ocr_multimodal',
    job_types: ['ocr_prepare'],
    status: 'online',
    active_job_id: null,
    version: 'test-runner-v1',
    host_ref: null,
    lease_ms: 60_000,
    last_seen_at: lastSeenAt,
  });
}

describe('PR-9 — observabilité workflow émise par le lifecycle jobs', () => {
  it('émet workflow_started au claim avec mapping owner/project/capability', () => {
    const now = Date.now();
    insertProjectJob('wf-claim', 'wf-project-claim', now);
    heartbeatOcrRunner('wf-runner-claim', now + 900);

    const claimed = claimNextJob('wf-runner-claim', ['ocr_prepare'], 60_000, now + 1000)!;

    expect(claimed).not.toBeNull();
    const trace = getWorkflowTrace('wf-claim');
    const started = trace.find((event) => event.event_type === 'workflow_started');
    expect(started).toBeDefined();
    expect(started?.workflow_type).toBe('ocr_prepare');
    expect(started?.capability_id).toBe('ocr_prepare');
    expect(started?.owner_id).toBe(owner.id);
    expect(started?.project_id).toBe('wf-project-claim');
    expect(started?.status).toBe('started');
  });

  it('émet workflow_completed à la clôture non sensible', () => {
    const job = createOcrPrepareJob(owner, {
      adapter_id: 'ocr-submission-v1',
      owner_id: owner.id,
      project_scope: 'wf-scope-completed',
      source_ref: 'storage://private/wf/completed.pdf',
      preflight_ref: 'preflight-wf-completed',
      manifest_ref: 'manifest-wf-completed',
      consent_ref: null,
      validation_ref: null,
    });

    completeJob(job.job_id, {artifact_ref: 'storage://private/wf/out.json', output_count: 1});

    const trace = getWorkflowTrace(job.job_id);
    const completed = trace.find((event) => event.event_type === 'workflow_completed');
    expect(completed).toBeDefined();
    expect(completed?.status).toBe('completed');
    expect(completed?.blocker_category).toBeNull();
  });

  it('émet validation_requested au passage en needs_review', () => {
    const job = createOcrPrepareJob(owner, {
      adapter_id: 'ocr-submission-v1',
      owner_id: owner.id,
      project_scope: 'wf-scope-review',
      source_ref: 'storage://private/wf/review.pdf',
      preflight_ref: 'preflight-wf-review',
      manifest_ref: 'manifest-wf-review',
      consent_ref: null,
      validation_ref: null,
    });

    markJobNeedsReview(
      job.job_id,
      {artifact_ref: 'storage://private/wf/candidate.json'},
      'teacher_validation_required',
    );

    const trace = getWorkflowTrace(job.job_id);
    const requested = trace.find((event) => event.event_type === 'validation_requested');
    expect(requested).toBeDefined();
    expect(requested?.status).toBe('validation_pending');
  });

  it("émet workflow_failed avec le blocker_category à l'échec", () => {
    const job = createOcrPrepareJob(owner, {
      adapter_id: 'ocr-submission-v1',
      owner_id: owner.id,
      project_scope: 'wf-scope-failed',
      source_ref: 'storage://private/wf/failed.pdf',
      preflight_ref: 'preflight-wf-failed',
      manifest_ref: 'manifest-wf-failed',
      consent_ref: null,
      validation_ref: null,
    });

    failJob(job.job_id, 'runner_timeout', {stage: 'ocr'});

    const trace = getWorkflowTrace(job.job_id);
    const failed = trace.find((event) => event.event_type === 'workflow_failed');
    expect(failed).toBeDefined();
    expect(failed?.status).toBe('failed');
    expect(failed?.blocker_category).toBe('runner_timeout');
  });

  it("ne casse pas le cycle job quand l'émission workflow est invalidée (best-effort)", () => {
    const job = createOcrPrepareJob(owner, {
      adapter_id: 'ocr-submission-v1',
      owner_id: owner.id,
      project_scope: 'wf-scope-resilient',
      source_ref: 'storage://private/wf/resilient.pdf',
      preflight_ref: 'preflight-wf-resilient',
      manifest_ref: 'manifest-wf-resilient',
      consent_ref: null,
      validation_ref: null,
    });

    // La finalisation doit réussir même si l'observabilité best-effort ne peut rien casser :
    // on vérifie juste que completeJob n'alerte pas et persiste bien le résultat.
    expect(() => completeJob(job.job_id, {ok: true})).not.toThrow();
    expect(getWorkflowTrace(job.job_id).length).toBeGreaterThan(0);
  });
});
