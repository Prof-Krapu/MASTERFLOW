import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

import type {GeneratedImage, Job} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createImageGenerationJob, getJob} from '../src/services/jobs.ts';
import {recordRunnerHeartbeat} from '../src/services/runners.ts';
import {parseGeneratedImages, processNextImageJob} from '../src/runners/image_runner.ts';

const owner: AuthUser = {id: 'img-run-owner', username: 'img_run_owner', role: 'teacher'};
const RUNNER_ID = 'image-test-runner';

function heartbeatOnline(): void {
  recordRunnerHeartbeat({
    runner_id: RUNNER_ID,
    runner_family: 'asset',
    job_types: ['asset_prepare'],
    status: 'online',
    active_job_id: null,
    version: 'test',
    host_ref: null,
    lease_ms: 5 * 60 * 1000,
    last_seen_at: Date.now(),
  });
}

function queueImageJob(): Job {
  return createImageGenerationJob(owner, {
    owner_id: owner.id,
    scope_type: 'owner',
    scope_id: owner.id,
    prompt: 'un renard zerg organique, style concept art',
    n: 1,
  });
}

const fakeImages: GeneratedImage[] = [{mime: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUg=='}];

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(owner.id, owner.username, owner.username, owner.role, now, now);
});

beforeEach(() => {
  heartbeatOnline();
});

describe('parseGeneratedImages', () => {
  it('garde les images conformes et rejette le reste (jamais d’image inventée)', () => {
    const out = parseGeneratedImages([
      {mime: 'image/png', base64: 'abc'},
      {mime: 'image/png'}, // ni url ni base64 → rejeté
      {mime: 'image/tiff', url: 'https://x/y.tiff'}, // mime hors enum → rejeté
      {mime: 'image/webp', url: 'https://cdn.example/test.webp'},
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]?.base64).toBe('abc');
    expect(out[1]?.url).toBe('https://cdn.example/test.webp');
  });

  it('cape le nombre d’images et tolère une entrée non-array', () => {
    const many = Array.from({length: 10}, (_, i) => ({mime: 'image/png', base64: `b${i}`}));
    expect(parseGeneratedImages(many, 2)).toHaveLength(2);
    expect(parseGeneratedImages('pas un tableau')).toEqual([]);
  });
});

describe('processNextImageJob', () => {
  it('file vide → idle', async () => {
    const result = await processNextImageJob({runnerId: RUNNER_ID, generate: async () => ({images: [], model: 'm', provider: 'p'})});
    expect(result).toEqual({status: 'idle'});
  });

  it('claim → needs_review avec images (jamais completed)', async () => {
    const job = queueImageJob();
    const result = await processNextImageJob({
      runnerId: RUNNER_ID,
      generate: async () => ({images: fakeImages, model: 'test-image-model', provider: 'openrouter'}),
    });
    expect(result).toEqual({status: 'processed', jobId: job.job_id, imageCount: 1, provider: 'openrouter'});

    const reviewed = getJob(owner, job.job_id);
    expect(reviewed.status).toBe('needs_review');
    expect(reviewed.progress).toBe(100);
    const stored = (reviewed.result as {images?: unknown[]}).images ?? [];
    expect(stored).toHaveLength(1);
  });

  it('backend sans image (mock/scaffold) → needs_review, 0 image, rien d’inventé', async () => {
    const job = queueImageJob();
    const result = await processNextImageJob({
      runnerId: RUNNER_ID,
      generate: async () => ({images: [], model: 'mock', provider: 'mock'}),
    });
    expect(result).toEqual({status: 'processed', jobId: job.job_id, imageCount: 0, provider: 'mock'});
    expect(getJob(owner, job.job_id).status).toBe('needs_review');
  });

  it('job asset_prepare d’un autre kind → failed (jamais completed)', async () => {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, 'asset_prepare', 'queued', ?, 'owner', ?, 'high', ?, 0, 0, ?, ?)`,
    ).run('img-wrong-kind-job', owner.id, owner.id, JSON.stringify({kind: 'export'}), now, now);

    const result = await processNextImageJob({runnerId: RUNNER_ID, generate: async () => ({images: fakeImages, model: 'm', provider: 'p'})});
    expect(result.status).toBe('failed');
    expect(getJob(owner, 'img-wrong-kind-job').status).toBe('failed');
  });
});
