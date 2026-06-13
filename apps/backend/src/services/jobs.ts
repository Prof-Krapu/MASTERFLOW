import {
  CorrectionPrepareRequestSchema,
  ExportPrepareRequestSchema,
  JobEventSchema,
  JobSchema,
  OcrPrepareRequestSchema,
  ROLE_RANK,
  type CorrectionPrepareRequest,
  type ExportPrepareRequest,
  type Job,
  type JobEvent,
  type JobStatus,
  type JobType,
  type OcrPrepareRequest,
  type RiskLevel,
} from '@masterflow/shared';

import {getAdapterForRole} from '../engines/adapter_registry.ts';
import {getDb, type JobEventRow, type JobRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

const CANCELLABLE = new Set<JobStatus>(['queued', 'running', 'needs_review']);
const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization)/i;

interface ManifestRow {
  id: string;
  batch_id: string;
  project_scope: string;
  workflow_version: string;
  status: string;
  validation_ref: string | null;
}

interface BatchRow {
  id: string;
  owner_id: string;
  project_scope: string;
}

interface ExportPreviewRow {
  id: string;
  batch_id: string;
  owner_id: string;
  project_scope: string;
  format: string;
  target: string;
  status: string;
  validation_ref: string | null;
}

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

function assertTeacherOwner(actor: AuthUser, ownerId: string): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
  if (actor.id !== ownerId) throw new Error('job_owner_required');
}

function insertEvent(jobId: string, eventType: JobEvent['event_type'], detail?: Record<string, unknown>): void {
  getDb()
    .prepare(
      `INSERT INTO job_events (id, job_id, event_type, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(uuid(), jobId, eventType, detail ? JSON.stringify(detail) : null, Date.now());
}

function insertQueuedJob(
  actor: AuthUser,
  type: JobType,
  ownerId: string,
  scopeType: string,
  scopeId: string,
  riskLevel: RiskLevel,
  payload: unknown,
  eventDetail: Record<string, unknown>,
  auditEventType: string,
  auditScope: string,
): Job {
  assertNoSecrets(payload);
  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    )
    .run(
      id,
      type,
      ownerId,
      scopeType,
      scopeId,
      riskLevel,
      JSON.stringify(payload),
      now,
      now,
    );
  insertEvent(id, 'job_queued', eventDetail);
  audit({
    event_type: auditEventType,
    user_id: actor.id,
    scope: auditScope,
    detail: {job_id: id, ...eventDetail},
  });
  return getJob(actor, id);
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
  return insertQueuedJob(
    actor,
    'ocr_prepare',
    request.owner_id,
    'project',
    request.project_scope,
    adapter.risk_level,
    request,
    {adapter_id: request.adapter_id},
    'job.ocr_prepare.queued',
    request.project_scope,
  );
}

export function createCorrectionPrepareJob(actor: AuthUser, input: CorrectionPrepareRequest): Job {
  const request = CorrectionPrepareRequestSchema.parse(input);
  assertTeacherOwner(actor, request.owner_id);

  const db = getDb();
  const manifest = db
    .prepare(
      `SELECT id, batch_id, project_scope, workflow_version, status, validation_ref
       FROM pre_correction_manifests WHERE id = ?`,
    )
    .get(request.manifest_ref) as ManifestRow | undefined;
  const batch = db
    .prepare('SELECT id, owner_id, project_scope FROM correction_batches WHERE id = ?')
    .get(request.batch_id) as BatchRow | undefined;
  if (!manifest || !batch) throw new Error('correction_prepare_reference_not_found');
  if (manifest.status !== 'validated' || !manifest.validation_ref) {
    throw new Error('correction_manifest_not_validated');
  }

  const alignedRefs = [
    manifest.batch_id === request.batch_id,
    manifest.project_scope === request.project_scope,
    manifest.workflow_version === request.workflow_version,
    manifest.validation_ref === request.validation_ref,
    batch.owner_id === request.owner_id,
    batch.project_scope === request.project_scope,
  ];
  if (alignedRefs.some((isAligned) => !isAligned)) {
    throw new Error('correction_prepare_context_mismatch');
  }

  return insertQueuedJob(
    actor,
    'correction_prepare',
    request.owner_id,
    'batch',
    request.batch_id,
    'high',
    request,
    {source_kind: request.source_kind, manifest_ref: request.manifest_ref},
    'job.correction_prepare.queued',
    request.project_scope,
  );
}

export function createExportPrepareJob(actor: AuthUser, input: ExportPrepareRequest): Job {
  const request = ExportPrepareRequestSchema.parse(input);
  assertTeacherOwner(actor, request.owner_id);

  const db = getDb();
  const preview = db
    .prepare(
      `SELECT id, batch_id, owner_id, project_scope, format, target, status, validation_ref
       FROM correction_export_previews WHERE id = ?`,
    )
    .get(request.export_preview_ref) as ExportPreviewRow | undefined;
  const batch = db
    .prepare('SELECT id, owner_id, project_scope FROM correction_batches WHERE id = ?')
    .get(request.batch_id) as BatchRow | undefined;
  if (!preview || !batch) throw new Error('export_prepare_reference_not_found');
  if (preview.status !== 'approved_for_export' || !preview.validation_ref) {
    throw new Error('export_preview_not_approved');
  }

  const alignedRefs = [
    preview.batch_id === request.batch_id,
    preview.owner_id === request.owner_id,
    preview.project_scope === request.project_scope,
    preview.validation_ref === request.validation_ref,
    batch.owner_id === request.owner_id,
    batch.project_scope === request.project_scope,
  ];
  if (alignedRefs.some((isAligned) => !isAligned)) {
    throw new Error('export_prepare_context_mismatch');
  }

  const payload = {
    ...request,
    format: preview.format,
    target: preview.target,
  };
  return insertQueuedJob(
    actor,
    'export_prepare',
    request.owner_id,
    'export_preview',
    request.export_preview_ref,
    'high',
    payload,
    {
      source_kind: request.source_kind,
      export_preview_ref: request.export_preview_ref,
      format: preview.format,
      target: preview.target,
    },
    'job.export_prepare.queued',
    request.project_scope,
  );
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
