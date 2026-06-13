import {
  RunnerHeartbeatSchema,
  type JobType,
  type RunnerHeartbeat,
} from '@masterflow/shared';

import {getDb, type RunnerHeartbeatRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';

const DEFAULT_STALE_MS = 2 * 60 * 1000;
const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization)/i;

function assertNoSecrets(payload: unknown): void {
  if (SECRET_PATTERN.test(JSON.stringify(payload))) {
    throw new Error('runner_heartbeat_contains_secret');
  }
}

function toHeartbeat(row: RunnerHeartbeatRow): RunnerHeartbeat {
  return RunnerHeartbeatSchema.parse({
    runner_id: row.runner_id,
    runner_family: row.runner_family,
    job_types: JSON.parse(row.job_types_json) as unknown,
    status: row.status,
    active_job_id: row.active_job_id,
    version: row.version,
    host_ref: row.host_ref,
    lease_ms: row.lease_ms,
    last_seen_at: row.last_seen_at,
  });
}

export function recordRunnerHeartbeat(input: RunnerHeartbeat): RunnerHeartbeat {
  const heartbeat = RunnerHeartbeatSchema.parse(input);
  assertNoSecrets(heartbeat);

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO runner_heartbeats
         (runner_id, runner_family, job_types_json, status, active_job_id,
          version, host_ref, lease_ms, last_seen_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(runner_id) DO UPDATE SET
         runner_family = excluded.runner_family,
         job_types_json = excluded.job_types_json,
         status = excluded.status,
         active_job_id = excluded.active_job_id,
         version = excluded.version,
         host_ref = excluded.host_ref,
         lease_ms = excluded.lease_ms,
         last_seen_at = excluded.last_seen_at,
         updated_at = excluded.updated_at`,
    )
    .run(
      heartbeat.runner_id,
      heartbeat.runner_family,
      JSON.stringify(heartbeat.job_types),
      heartbeat.status,
      heartbeat.active_job_id,
      heartbeat.version,
      heartbeat.host_ref,
      heartbeat.lease_ms,
      heartbeat.last_seen_at,
      now,
    );

  audit({
    event_type: 'runner.heartbeat',
    scope: heartbeat.runner_family,
    detail: {
      runner_id: heartbeat.runner_id,
      status: heartbeat.status,
      active_job_id: heartbeat.active_job_id,
      job_types: heartbeat.job_types,
    },
  });
  return getRunnerHeartbeat(heartbeat.runner_id);
}

export function getRunnerHeartbeat(runnerId: string): RunnerHeartbeat {
  const row = getDb()
    .prepare('SELECT * FROM runner_heartbeats WHERE runner_id = ?')
    .get(runnerId) as RunnerHeartbeatRow | undefined;
  if (!row) throw new Error('runner_not_found');
  return toHeartbeat(row);
}

export function listRunnerHeartbeats(): RunnerHeartbeat[] {
  const rows = getDb()
    .prepare('SELECT * FROM runner_heartbeats ORDER BY last_seen_at DESC, runner_id ASC')
    .all() as RunnerHeartbeatRow[];
  return rows.map(toHeartbeat);
}

export function listClaimableRunnerHeartbeats(
  jobType: JobType,
  now = Date.now(),
  staleMs = DEFAULT_STALE_MS,
): RunnerHeartbeat[] {
  if (!Number.isInteger(staleMs) || staleMs <= 0) throw new Error('invalid_runner_stale_ms');
  return listRunnerHeartbeats().filter(
    (heartbeat) =>
      heartbeat.status === 'online' &&
      heartbeat.last_seen_at >= now - staleMs &&
      heartbeat.job_types.includes(jobType),
  );
}
