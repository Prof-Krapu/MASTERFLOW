import {
  JobEventSchema,
  JobSchema,
  OcrPrepareRequestSchema,
  ROLE_RANK,
  type Job,
  type JobEvent,
  type JobStatus,
  type OcrPrepareRequest,
} from '@masterflow/shared';

import {getAdapterForRole} from '../engines/adapter_registry.ts';
import {getDb, type JobEventRow, type JobRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

const CANCELLABLE = new Set<JobStatus>(['queued', 'running', 'needs_review']);
const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization)/i;

function toJob(row: JobRow): Job {
  return JobSchema.parse({
    job_id: row.id,
    type: row.type,
    status: row.status,
    owner_id: row.owner_id,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    risk_level: row.risk_level,
    payload: JSON.parse(row.payload_json) as unknown,
    result: JSON.parse(row.result_json ?? 'null') as unknown,
    error: row.error,
    progress: row.progress,
    retry_count: row.retry_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    started_at: row.started_at,
    completed_at: row.completed_at,
    cancelled_at: row.cancelled_at,
  });
}

function toEvent(row: JobEventRow): JobEvent {
  return JobEventSchema.parse({
    event_id: row.id,
    job_id: row.job_id,
    event_type: row.event_type,
    detail: JSON.parse(row.detail_json ?? 'null') as unknown,
    created_at: row.created_at,
  });
}

function assertCanRead(actor: AuthUser, ownerId: string): void {
  if (actor.id !== ownerId && ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('job_not_found');
  }
}

function assertNoSecrets(payload: unknown): void {
  if (SECRET_PATTERN.test(JSON.stringify(payload))) throw new Error('job_payload_contains_secret');
}

function insertEvent(jobId: string, eventType: JobEvent['event_type'], detail?: Record<string, unknown>): void {
  getDb()
    .prepare(
      `INSERT INTO job_events (id, job_id, event_type, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(uuid(), jobId, eventType, detail ? JSON.stringify(detail) : null, Date.now());
}

export function createOcrPrepareJob(actor: AuthUser, input: OcrPrepareRequest): Job {
  const request = OcrPrepareRequestSchema.parse(input);
  if (actor.id !== request.owner_id && ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('scope_denied');
  }

  const adapter = getAdapterForRole(request.adapter_id, actor.role);
  if (!adapter || adapter.runner_family !== 'ocr_multimodal') {
    throw new Error('ocr_adapter_not_allowed');
  }
  assertNoSecrets(request);

  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, 'ocr_prepare', 'queued', ?, 'project', ?, ?, ?, 0, 0, ?, ?)`,
    )
    .run(
      id,
      request.owner_id,
      request.project_scope,
      adapter.risk_level,
      JSON.stringify(request),
      now,
      now,
    );
  insertEvent(id, 'job_queued', {adapter_id: request.adapter_id});
  audit({
    event_type: 'job.ocr_prepare.queued',
    user_id: actor.id,
    scope: request.project_scope,
    detail: {job_id: id, adapter_id: request.adapter_id},
  });
  return getJob(actor, id);
}

export function listJobs(actor: AuthUser): Job[] {
  const rows =
    ROLE_RANK[actor.role] >= ROLE_RANK.admin
      ? (getDb().prepare('SELECT * FROM jobs ORDER BY updated_at DESC').all() as JobRow[])
      : (getDb()
          .prepare('SELECT * FROM jobs WHERE owner_id = ? ORDER BY updated_at DESC')
          .all(actor.id) as JobRow[]);
  return rows.map(toJob);
}

export function getJob(actor: AuthUser, jobId: string): Job {
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  assertCanRead(actor, row.owner_id);
  return toJob(row);
}

export function listJobEvents(actor: AuthUser, jobId: string): JobEvent[] {
  getJob(actor, jobId);
  const rows = getDb()
    .prepare('SELECT * FROM job_events WHERE job_id = ? ORDER BY created_at, rowid')
    .all(jobId) as JobEventRow[];
  return rows.map(toEvent);
}

export function cancelJob(actor: AuthUser, jobId: string): Job {
  const job = getJob(actor, jobId);
  if (!CANCELLABLE.has(job.status)) throw new Error('job_not_cancellable');
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs SET status = 'cancelled', cancelled_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(now, now, jobId);
  insertEvent(jobId, 'job_cancelled', {previous_status: job.status});
  audit({
    event_type: 'job.cancelled',
    user_id: actor.id,
    scope: job.scope_id,
    detail: {job_id: jobId},
  });
  return getJob(actor, jobId);
}

export function retryJob(actor: AuthUser, jobId: string): Job {
  const job = getJob(actor, jobId);
  if (job.status !== 'failed') throw new Error('job_not_retryable');
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs
       SET status = 'queued', progress = 0, error = NULL, result_json = NULL,
           retry_count = retry_count + 1, started_at = NULL, completed_at = NULL,
           cancelled_at = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .run(now, jobId);
  insertEvent(jobId, 'job_retried', {retry_count: job.retry_count + 1});
  audit({
    event_type: 'job.retried',
    user_id: actor.id,
    scope: job.scope_id,
    detail: {job_id: jobId, retry_count: job.retry_count + 1},
  });
  return getJob(actor, jobId);
}

/** API interne runner-only : aucune route HTTP ne permet d'écrire la progression. */
export function updateJobProgress(jobId: string, progress: number): void {
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new Error('invalid_job_progress');
  }
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  if (progress < row.progress) throw new Error('job_progress_must_be_monotone');
  if (row.status !== 'queued' && row.status !== 'running') throw new Error('job_not_progressable');

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs
       SET status = 'running', progress = ?, started_at = COALESCE(started_at, ?), updated_at = ?
       WHERE id = ?`,
    )
    .run(progress, now, now, jobId);
  if (row.status === 'queued') {
    insertEvent(jobId, 'job_started', {progress});
  }
  if (progress > 0) {
    insertEvent(jobId, 'job_progress', {progress});
  }
}
