import {
  CorrectionPrepareRequestSchema,
  ExportPrepareRequestSchema,
  JobEventSchema,
  JobSchema,
  JobTypeSchema,
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
import {
  getDb,
  type JobEventRow,
  type JobRow,
  type RunnerHeartbeatRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

const CANCELLABLE = new Set<JobStatus>(['queued', 'running', 'needs_review']);
const FINALIZABLE = new Set<JobStatus>(['queued', 'running']);
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_LEASE_MS = 60 * 60 * 1000;
const RUNNER_STALE_MS = 2 * 60 * 1000;
const JOB_RUNNER_FAMILIES: Record<JobType, string> = {
  rag_reindex: 'rag',
  resource_revoke: 'resource',
  export_prepare: 'export',
  asset_prepare: 'asset',
  ocr_prepare: 'ocr_multimodal',
  correction_prepare: 'correction',
};
const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization)/i;

interface ManifestRow {
  id: string;
  batch_id: string;
  project_id: string | null;
  project_scope: string;
  workflow_version: string;
  status: string;
  validation_ref: string | null;
}

interface BatchRow {
  id: string;
  owner_id: string;
  project_id: string | null;
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
    runner_id: row.runner_id,
    claimed_at: row.claimed_at,
    lease_expires_at: row.lease_expires_at,
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

function canReadJob(actor: AuthUser, row: JobRow): boolean {
  if (actor.id === row.owner_id || ROLE_RANK[actor.role] >= ROLE_RANK.admin) return true;
  if (row.type !== 'correction_prepare') return false;
  const payload = JSON.parse(row.payload_json) as {project_id?: unknown};
  if (typeof payload.project_id !== 'string') return false;
  return decideScopedPermission({
    actor,
    projectId: payload.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function assertCanRead(actor: AuthUser, row: JobRow): void {
  if (!canReadJob(actor, row)) throw new Error('job_not_found');
}

function assertNoSecrets(payload: unknown): void {
  if (SECRET_PATTERN.test(JSON.stringify(payload))) throw new Error('job_payload_contains_secret');
}

function assertFinalizable(row: JobRow): void {
  if (!FINALIZABLE.has(row.status as JobStatus)) throw new Error('job_not_finalizable');
}

function assertRunnerId(runnerId: string): void {
  if (!runnerId.trim()) throw new Error('runner_id_required');
}

function assertLeaseMs(leaseMs: number): void {
  if (!Number.isInteger(leaseMs) || leaseMs <= 0 || leaseMs > MAX_LEASE_MS) {
    throw new Error('invalid_job_lease');
  }
}

function assertRunnerLease(row: JobRow, runnerId: string | undefined, now = Date.now()): void {
  if (!runnerId) return;
  assertRunnerId(runnerId);
  if (row.runner_id !== runnerId) throw new Error('job_lease_mismatch');
  if (row.lease_expires_at !== null && row.lease_expires_at <= now) {
    throw new Error('job_lease_expired');
  }
}

function assertRunnerCanClaim(runnerId: string, jobTypes: JobType[], now: number): void {
  const row = getDb()
    .prepare('SELECT * FROM runner_heartbeats WHERE runner_id = ?')
    .get(runnerId) as RunnerHeartbeatRow | undefined;
  if (!row) throw new Error('runner_not_registered');
  if (row.status !== 'online') throw new Error('runner_not_online');
  if (row.last_seen_at < now - RUNNER_STALE_MS) throw new Error('runner_heartbeat_stale');

  const declaredTypes = JSON.parse(row.job_types_json) as unknown;
  if (!Array.isArray(declaredTypes)) throw new Error('runner_job_types_invalid');
  if (jobTypes.some((type) => !declaredTypes.includes(type))) {
    throw new Error('runner_job_type_not_allowed');
  }
  const expectedFamilies = new Set(jobTypes.map((type) => JOB_RUNNER_FAMILIES[type]));
  if (expectedFamilies.size !== 1 || !expectedFamilies.has(row.runner_family)) {
    throw new Error('runner_family_not_allowed');
  }
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

export function createRagReindexJob(
  actor: AuthUser,
  input: {
    rag_resource_id: string;
    owner_id: string;
    scope_type: 'owner' | 'project';
    scope_id: string;
    content_hash: string;
  },
): Job {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
  if (actor.id !== input.owner_id && ROLE_RANK[actor.role] < ROLE_RANK.admin) {
    throw new Error('job_owner_required');
  }
  return insertQueuedJob(
    actor,
    'rag_reindex',
    input.owner_id,
    input.scope_type,
    input.scope_id,
    'medium',
    {
      rag_resource_id: input.rag_resource_id,
      content_hash: input.content_hash,
    },
    {rag_resource_id: input.rag_resource_id},
    'job.rag_reindex.queued',
    input.scope_id,
  );
}

export function createCorrectionPrepareJob(actor: AuthUser, input: CorrectionPrepareRequest): Job {
  const request = CorrectionPrepareRequestSchema.parse(input);
  if (request.project_id) {
    if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
    if (request.project_scope !== request.project_id) throw new Error('project_scope_mismatch');
    const decision = decideScopedPermission({
      actor,
      projectId: request.project_id,
      minimumProjectRole: 'editor',
    });
    if (!decision.allowed) throw new Error('scope_denied');
  } else {
    assertTeacherOwner(actor, request.owner_id);
  }

  const db = getDb();
  const manifest = db
    .prepare(
      `SELECT id, batch_id, project_id, project_scope, workflow_version, status, validation_ref
       FROM pre_correction_manifests WHERE id = ?`,
    )
    .get(request.manifest_ref) as ManifestRow | undefined;
  const batch = db
    .prepare('SELECT id, owner_id, project_id, project_scope FROM correction_batches WHERE id = ?')
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
  if (request.project_id) {
    alignedRefs.push(
      manifest.project_id === request.project_id,
      batch.project_id === request.project_id,
    );
  } else {
    alignedRefs.push(manifest.project_id === null, batch.project_id === null);
  }
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
  const rows = getDb().prepare('SELECT * FROM jobs ORDER BY updated_at DESC').all() as JobRow[];
  return rows.filter((row) => canReadJob(actor, row)).map(toJob);
}

export function getJob(actor: AuthUser, jobId: string): Job {
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  assertCanRead(actor, row);
  return toJob(row);
}

export function listJobEvents(actor: AuthUser, jobId: string): JobEvent[] {
  getJob(actor, jobId);
  const rows = getDb()
    .prepare('SELECT * FROM job_events WHERE job_id = ? ORDER BY created_at, rowid')
    .all(jobId) as JobEventRow[];
  return rows.map(toEvent);
}

export function claimNextJob(
  runnerId: string,
  types: JobType[],
  leaseMs = DEFAULT_LEASE_MS,
  now = Date.now(),
): Job | null {
  assertRunnerId(runnerId);
  assertLeaseMs(leaseMs);
  const jobTypes = [...new Set(types.map((type) => JobTypeSchema.parse(type)))];
  if (jobTypes.length === 0) throw new Error('job_type_required');
  assertRunnerCanClaim(runnerId, jobTypes, now);

  const placeholders = jobTypes.map(() => '?').join(', ');
  const db = getDb();
  const claimed = db.transaction(() => {
    const row = db
      .prepare(
        `SELECT * FROM jobs
         WHERE type IN (${placeholders})
           AND (
             status = 'queued'
             OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
           )
         ORDER BY updated_at ASC, created_at ASC, rowid ASC
         LIMIT 1`,
      )
      .get(...jobTypes, now) as JobRow | undefined;
    if (!row) return null;

    const leaseExpiresAt = now + leaseMs;
    const result = db
      .prepare(
        `UPDATE jobs
         SET status = 'running',
             runner_id = ?,
             claimed_at = ?,
             lease_expires_at = ?,
             started_at = COALESCE(started_at, ?),
             updated_at = ?
         WHERE id = ?
           AND (
             status = 'queued'
             OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
           )`,
      )
      .run(runnerId, now, leaseExpiresAt, now, now, row.id, now);
    if (result.changes !== 1) return null;

    insertEvent(row.id, 'job_started', {
      claim: true,
      runner_id: runnerId,
      lease_expires_at: leaseExpiresAt,
      reclaimed: row.status === 'running',
    });
    audit({
      event_type: 'job.claimed',
      scope: row.scope_id,
      detail: {
        job_id: row.id,
        type: row.type,
        runner_id: runnerId,
        reclaimed: row.status === 'running',
      },
    });
    return db.prepare('SELECT * FROM jobs WHERE id = ?').get(row.id) as JobRow;
  })();

  return claimed ? toJob(claimed) : null;
}

export function extendJobLease(
  jobId: string,
  runnerId: string,
  leaseMs = DEFAULT_LEASE_MS,
  now = Date.now(),
): Job {
  assertRunnerId(runnerId);
  assertLeaseMs(leaseMs);
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  if (row.status !== 'running') throw new Error('job_not_leased');
  assertRunnerLease(row, runnerId, now);

  const leaseExpiresAt = now + leaseMs;
  getDb()
    .prepare(
      `UPDATE jobs SET lease_expires_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(leaseExpiresAt, now, jobId);
  insertEvent(jobId, 'job_progress', {
    lease_extended: true,
    runner_id: runnerId,
    lease_expires_at: leaseExpiresAt,
  });
  audit({
    event_type: 'job.lease_extended',
    scope: row.scope_id,
    detail: {job_id: jobId, type: row.type, runner_id: runnerId},
  });
  const updated = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow;
  return toJob(updated);
}

export function cancelJob(actor: AuthUser, jobId: string): Job {
  const job = getJob(actor, jobId);
  if (!CANCELLABLE.has(job.status)) throw new Error('job_not_cancellable');
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs
       SET status = 'cancelled', cancelled_at = ?, lease_expires_at = NULL, updated_at = ?
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
           cancelled_at = NULL, runner_id = NULL, claimed_at = NULL,
           lease_expires_at = NULL, updated_at = ?
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
export function updateJobProgress(jobId: string, progress: number, runnerId?: string): void {
  if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
    throw new Error('invalid_job_progress');
  }
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  assertRunnerLease(row, runnerId);
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

/** API interne runner-only : termine un traitement avec un résultat à valider humainement. */
export function markJobNeedsReview(
  jobId: string,
  result: Record<string, unknown>,
  reviewReason: string,
  runnerId?: string,
): void {
  if (!reviewReason.trim()) throw new Error('review_reason_required');
  assertNoSecrets(result);
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  assertRunnerLease(row, runnerId);
  assertFinalizable(row);

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs
       SET status = 'needs_review',
           progress = 100,
           result_json = ?,
           error = NULL,
           started_at = COALESCE(started_at, ?),
           completed_at = ?,
           lease_expires_at = NULL,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(JSON.stringify(result), now, now, now, jobId);
  if (row.status === 'queued') {
    insertEvent(jobId, 'job_started', {progress: row.progress});
  }
  insertEvent(jobId, 'job_needs_review', {review_reason: reviewReason});
  audit({
    event_type: 'job.needs_review',
    scope: row.scope_id,
    detail: {job_id: jobId, type: row.type, review_reason: reviewReason},
  });
}

/** API interne runner-only : clôture seulement les jobs sans revue humaine supplémentaire. */
export function completeJob(
  jobId: string,
  result: Record<string, unknown>,
  runnerId?: string,
): void {
  assertNoSecrets(result);
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  assertRunnerLease(row, runnerId);
  assertFinalizable(row);

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs
       SET status = 'completed',
           progress = 100,
           result_json = ?,
           error = NULL,
           started_at = COALESCE(started_at, ?),
           completed_at = ?,
           lease_expires_at = NULL,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(JSON.stringify(result), now, now, now, jobId);
  if (row.status === 'queued') {
    insertEvent(jobId, 'job_started', {progress: row.progress});
  }
  insertEvent(jobId, 'job_completed');
  audit({
    event_type: 'job.completed',
    scope: row.scope_id,
    detail: {job_id: jobId, type: row.type},
  });
}

/** API interne runner-only : clôture en erreur exploitable, sans exposer de secret. */
export function failJob(
  jobId: string,
  error: string,
  detail?: Record<string, unknown>,
  runnerId?: string,
): void {
  if (!error.trim()) throw new Error('job_error_required');
  assertNoSecrets({error, detail});
  const row = getDb().prepare('SELECT * FROM jobs WHERE id = ?').get(jobId) as JobRow | undefined;
  if (!row) throw new Error('job_not_found');
  assertRunnerLease(row, runnerId);
  assertFinalizable(row);

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE jobs
       SET status = 'failed',
           error = ?,
           started_at = COALESCE(started_at, ?),
           completed_at = ?,
           lease_expires_at = NULL,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(error, now, now, now, jobId);
  if (row.status === 'queued') {
    insertEvent(jobId, 'job_started', {progress: row.progress});
  }
  insertEvent(jobId, 'job_failed', detail);
  audit({
    event_type: 'job.failed',
    scope: row.scope_id,
    detail: {job_id: jobId, type: row.type, error},
  });
}
