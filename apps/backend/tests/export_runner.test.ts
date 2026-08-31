import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {processNextExportJob} from '../src/runners/export_runner.ts';
import {getJob} from '../src/services/jobs.ts';
import {recordRunnerHeartbeat} from '../src/services/runners.ts';

const owner: AuthUser = {
  id: 'export-runner-owner',
  username: 'export_runner_owner',
  role: 'teacher',
};
const RUNNER_ID = 'export-test-runner';

function heartbeatOnline(): void {
  recordRunnerHeartbeat({
    runner_id: RUNNER_ID,
    runner_family: 'export',
    job_types: ['export_prepare'],
    status: 'online',
    active_job_id: null,
    version: 'test',
    host_ref: null,
    lease_ms: 5 * 60 * 1000,
    last_seen_at: Date.now(),
  });
}

function queueExportJob(id: string): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, 'export_prepare', 'queued', ?, 'export_preview', ?, 'high', ?, 0, 0, ?, ?)`,
    )
    .run(
      id,
      owner.id,
      `preview-${id}`,
      JSON.stringify({
        owner_id: owner.id,
        project_scope: 'course-export-runner',
        batch_id: 'batch-export-runner',
        export_preview_ref: `preview-${id}`,
        preflight_ref: `preflight-${id}`,
        validation_ref: `validation-${id}`,
        source_kind: 'approved_correction_export_preview',
        format: 'xlsx',
        target: 'teacher_download',
      }),
      now,
      now,
    );
}

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

beforeEach(() => heartbeatOnline());

describe('export runner', () => {
  it('reste idle lorsque la file export est vide', async () => {
    await expect(processNextExportJob({runnerId: RUNNER_ID})).resolves.toEqual({status: 'idle'});
  });

  it('copie exactement la preview approuvée vers un fichier privé hashé', async () => {
    const jobId = 'export-runner-success';
    const data = Buffer.from('identite;note;feedback\nstudent-1;13;Solide\n', 'utf8');
    let writtenKey = '';
    let writtenData = Buffer.alloc(0);
    queueExportJob(jobId);

    const result = await processNextExportJob({
      runnerId: RUNNER_ID,
      getApprovedSource: (exportId, expected) => ({
        export_id: exportId,
        batch_id: expected.batch_id,
        owner_id: expected.owner_id,
        project_id: null,
        project_scope: expected.project_scope,
        format: 'xlsx',
        target: 'teacher_download',
        preview_ref: 'storage://private/export-previews/approved.xlsx',
        schema_version: 'correction-export-v1',
        validation_ref: expected.validation_ref,
      }),
      readSource: () => data,
      writeOutput: (key, content) => {
        writtenKey = key;
        writtenData = content;
        return `storage://${key}`;
      },
    });

    expect(result.status).toBe('processed');
    expect(writtenKey).toMatch(/^private\/correction-exports\/[a-f0-9]+\/[a-f0-9]+\.xlsx$/);
    expect(writtenData.equals(data)).toBe(true);
    const stored = getJob(owner, jobId);
    expect(stored.status).toBe('completed');
    expect(stored.result).toMatchObject({
      format: 'xlsx',
      contains_private_data: true,
      publication_allowed: false,
      bytes: data.length,
    });
  });

  it('échoue proprement si la preview validée n est plus exploitable', async () => {
    const jobId = 'export-runner-failure';
    queueExportJob(jobId);
    const result = await processNextExportJob({
      runnerId: RUNNER_ID,
      getApprovedSource: () => {
        throw new Error('export_preview_not_approved');
      },
    });
    expect(result).toEqual({
      status: 'failed',
      jobId,
      error: 'export_preview_not_approved',
    });
    expect(getJob(owner, jobId).status).toBe('failed');
  });
});
