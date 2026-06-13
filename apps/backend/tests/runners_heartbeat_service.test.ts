import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {
  getRunnerHeartbeat,
  listClaimableRunnerHeartbeats,
  listRunnerHeartbeats,
  recordRunnerHeartbeat,
} from '../src/services/runners.ts';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES ('runner-heartbeat-owner', 'runner_heartbeat_owner',
               'runner_heartbeat_owner', 'x', 'teacher', 1, ?, ?)`,
    )
    .run(now, now);
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES ('job-running-ref', 'ocr_prepare', 'running', 'runner-heartbeat-owner',
               'project', 'runner-heartbeat-scope', 'medium', '{}', 10, 0, ?, ?)`,
    )
    .run(now, now);
});

describe('PR-C9 — heartbeats internes des runners', () => {
  it('enregistre et met à jour un runner sans créer de route publique', () => {
    const heartbeat = recordRunnerHeartbeat({
      runner_id: 'runner-heartbeat-ocr',
      runner_family: 'ocr_multimodal',
      job_types: ['ocr_prepare'],
      status: 'online',
      active_job_id: null,
      version: 'ocr-runner-v1',
      host_ref: 'tailscale://runner-ocr',
      lease_ms: 300000,
      last_seen_at: 10_000,
    });

    expect(heartbeat.runner_id).toBe('runner-heartbeat-ocr');
    expect(heartbeat.job_types).toEqual(['ocr_prepare']);
    expect(heartbeat.status).toBe('online');

    const updated = recordRunnerHeartbeat({
      ...heartbeat,
      job_types: ['ocr_prepare', 'asset_prepare'],
      active_job_id: 'job-running-ref',
      last_seen_at: 11_000,
    });

    expect(updated.job_types).toEqual(['ocr_prepare', 'asset_prepare']);
    expect(updated.active_job_id).toBe('job-running-ref');
    expect(getRunnerHeartbeat('runner-heartbeat-ocr')).toEqual(updated);
  });

  it('liste uniquement les runners online, frais et compatibles pour claim', () => {
    recordRunnerHeartbeat({
      runner_id: 'runner-claim-online',
      runner_family: 'export',
      job_types: ['export_prepare'],
      status: 'online',
      active_job_id: null,
      version: 'export-runner-v1',
      host_ref: 'tailscale://runner-export',
      lease_ms: 300000,
      last_seen_at: 20_000,
    });
    recordRunnerHeartbeat({
      runner_id: 'runner-claim-stale',
      runner_family: 'export',
      job_types: ['export_prepare'],
      status: 'online',
      active_job_id: null,
      version: 'export-runner-v1',
      host_ref: null,
      lease_ms: 300000,
      last_seen_at: 1_000,
    });
    recordRunnerHeartbeat({
      runner_id: 'runner-claim-draining',
      runner_family: 'export',
      job_types: ['export_prepare'],
      status: 'draining',
      active_job_id: null,
      version: 'export-runner-v1',
      host_ref: null,
      lease_ms: 300000,
      last_seen_at: 20_000,
    });
    recordRunnerHeartbeat({
      runner_id: 'runner-claim-wrong-type',
      runner_family: 'correction',
      job_types: ['correction_prepare'],
      status: 'online',
      active_job_id: null,
      version: 'correction-runner-v1',
      host_ref: null,
      lease_ms: 300000,
      last_seen_at: 20_000,
    });

    expect(
      listClaimableRunnerHeartbeats('export_prepare', 21_000, 5_000).map(
        (runner) => runner.runner_id,
      ),
    ).toEqual(['runner-claim-online']);
  });

  it('refuse les heartbeats qui contiennent des secrets évidents', () => {
    expect(() =>
      recordRunnerHeartbeat({
        runner_id: 'runner-secret',
        runner_family: 'ocr_multimodal',
        job_types: ['ocr_prepare'],
        status: 'online',
        active_job_id: null,
        version: 'password-runner',
        host_ref: null,
        lease_ms: 300000,
        last_seen_at: 30_000,
      }),
    ).toThrow('runner_heartbeat_contains_secret');
  });

  it('expose les colonnes heartbeat et conserve un audit sobre', () => {
    const columns = getDb()
      .prepare("PRAGMA table_info('runner_heartbeats')")
      .all() as Array<{name: string}>;
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        'runner_id',
        'runner_family',
        'job_types_json',
        'status',
        'active_job_id',
        'version',
        'host_ref',
        'lease_ms',
        'last_seen_at',
      ]),
    );

    expect(listRunnerHeartbeats().length).toBeGreaterThan(0);
    const auditRows = getDb()
      .prepare("SELECT detail_json FROM audit_logs WHERE event_type = 'runner.heartbeat'")
      .all() as Array<{detail_json: string}>;
    expect(auditRows.length).toBeGreaterThan(0);
    for (const row of auditRows) {
      expect(row.detail_json).not.toContain('tailscale://runner-export');
    }
  });
});
