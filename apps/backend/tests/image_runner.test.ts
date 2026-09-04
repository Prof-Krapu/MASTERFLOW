import {existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

import type {GeneratedImage, Job} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {cancelJob, createImageGenerationJob, getJob} from '../src/services/jobs.ts';
import {recordRunnerHeartbeat} from '../src/services/runners.ts';
import {generateImages, generateViaComfyUI, parseGeneratedImages, processNextImageJob} from '../src/runners/image_runner.ts';

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

function queueImageJob(prompt = 'un renard zerg organique, style concept art'): Job {
  return createImageGenerationJob(owner, {
    owner_id: owner.id,
    scope_type: 'owner',
    scope_id: owner.id,
    prompt,
    n: 1,
  });
}

const fakeImages: GeneratedImage[] = [{mime: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUg=='}];

function imageJobStub(payload: Job['payload']): Job {
  return {
    job_id: 'image-job-stub', type: 'asset_prepare', status: 'running', owner_id: owner.id,
    scope_type: 'owner', scope_id: owner.id, risk_level: 'high', payload, result: null,
    error: null, progress: 0, retry_count: 0, created_at: 0, updated_at: 0,
    started_at: null, completed_at: null, cancelled_at: null, runner_id: null,
    claimed_at: null, lease_expires_at: null,
  };
}

beforeAll(async () => {
  process.env.MASTERFLOW_STORAGE_ROOT = mkdtempSync(join(tmpdir(), 'masterflow-image-runner-'));
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

describe('dispatch provider image', () => {
  it('reste mock et ne contacte pas ComfyUI tant que IMAGE_PROVIDER est fermé', async () => {
    const previousProvider = process.env.IMAGE_PROVIDER;
    const previousBaseUrl = process.env.COMFYUI_BASE_URL;
    process.env.IMAGE_PROVIDER = 'mock';
    process.env.COMFYUI_BASE_URL = 'http://127.0.0.1:1';
    try {
      const result = await generateImages({
        owner_id: owner.id,
        scope_type: 'owner',
        scope_id: owner.id,
        prompt: 'aucun appel réseau',
        n: 1,
      }, {
        job_id: 'dispatch-mock-job',
        type: 'asset_prepare',
        status: 'running',
        owner_id: owner.id,
        scope_type: 'owner',
        scope_id: owner.id,
        risk_level: 'high',
        payload: {},
        result: null,
        error: null,
        progress: 0,
        retry_count: 0,
        created_at: 0,
        updated_at: 0,
        started_at: null,
        completed_at: null,
        cancelled_at: null,
        runner_id: null,
        claimed_at: null,
        lease_expires_at: null,
      });
      expect(result).toEqual({images: [], model: 'mock', provider: 'mock'});
    } finally {
      if (previousProvider === undefined) delete process.env.IMAGE_PROVIDER;
      else process.env.IMAGE_PROVIDER = previousProvider;
      if (previousBaseUrl === undefined) delete process.env.COMFYUI_BASE_URL;
      else process.env.COMFYUI_BASE_URL = previousBaseUrl;
    }
  });

  it('refuse ComfyUI sans le gate local explicite avant tout accès disque ou réseau', async () => {
    const previousProvider = process.env.IMAGE_PROVIDER;
    const previousBaseUrl = process.env.COMFYUI_BASE_URL;
    const previousGate = process.env.COMFYUI_EXECUTION_GATE;
    process.env.IMAGE_PROVIDER = 'comfyui';
    process.env.COMFYUI_BASE_URL = 'http://127.0.0.1:8188';
    delete process.env.COMFYUI_EXECUTION_GATE;
    try {
      const payload: Parameters<typeof generateImages>[0] = {
        owner_id: owner.id,
        scope_type: 'owner',
        scope_id: owner.id,
        prompt: 'gate local obligatoire',
        n: 1,
      };
      await expect(generateImages(payload, imageJobStub(payload)))
        .rejects.toThrow('comfyui_local_execution_gate_required');
    } finally {
      if (previousProvider === undefined) delete process.env.IMAGE_PROVIDER;
      else process.env.IMAGE_PROVIDER = previousProvider;
      if (previousBaseUrl === undefined) delete process.env.COMFYUI_BASE_URL;
      else process.env.COMFYUI_BASE_URL = previousBaseUrl;
      if (previousGate === undefined) delete process.env.COMFYUI_EXECUTION_GATE;
      else process.env.COMFYUI_EXECUTION_GATE = previousGate;
    }
  });

  it('purge le staging après succès et après timeout client', async () => {
    const inputRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-runner-input-'));
    const sourceRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-runner-source-'));
    const source = join(sourceRoot, 'masterflex.png');
    writeFileSync(source, Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIACo0C/QAAAABJRU5ErkJggg==',
      'base64',
    ));
    const previousInput = process.env.COMFYUI_INPUT_ROOT;
    const previousOutput = process.env.COMFYUI_OUTPUT_ROOT;
    const previousReference = process.env.COMFYUI_IPADAPTER_REFERENCE_FILE;
    const previousGate = process.env.COMFYUI_EXECUTION_GATE;
    const previousReferenceOwner = process.env.COMFYUI_REFERENCE_OWNER_ID;
    const previousConsent = process.env.COMFYUI_REFERENCE_CONSENT_REF;
    process.env.COMFYUI_INPUT_ROOT = inputRoot;
    process.env.COMFYUI_OUTPUT_ROOT = mkdtempSync(join(tmpdir(), 'masterflow-comfy-runner-output-'));
    process.env.COMFYUI_IPADAPTER_REFERENCE_FILE = source;
    process.env.COMFYUI_EXECUTION_GATE = 'GO_IMAGE_LOCAL';
    process.env.COMFYUI_REFERENCE_OWNER_ID = owner.id;
    process.env.COMFYUI_REFERENCE_CONSENT_REF = 'consent:image-runner-test';
    try {
      await generateViaComfyUI(
        'http://127.0.0.1:8188',
        'masterflex_ipadapter_sdxl_v1',
        {owner_id: owner.id, scope_type: 'owner', scope_id: owner.id, prompt: 'test', n: 1},
        'job-stage-success',
        {runWorkflow: async () => ({
          images: [],
          workflowId: 'masterflex_ipadapter_sdxl_v1',
          templateSha256: 'c'.repeat(64),
        })},
      );
      expect(existsSync(join(inputRoot, '.masterflow-staging', 'job-stage-success'))).toBe(false);

      await expect(generateViaComfyUI(
        'http://127.0.0.1:8188',
        'masterflex_ipadapter_sdxl_v1',
        {owner_id: owner.id, scope_type: 'owner', scope_id: owner.id, prompt: 'test', n: 1},
        'job-stage-timeout',
        {runWorkflow: async () => { throw new Error('comfyui_generation_timeout'); }},
      )).rejects.toThrow('comfyui_generation_timeout');
      expect(existsSync(join(inputRoot, '.masterflow-staging', 'job-stage-timeout'))).toBe(false);
    } finally {
      if (previousInput === undefined) delete process.env.COMFYUI_INPUT_ROOT;
      else process.env.COMFYUI_INPUT_ROOT = previousInput;
      if (previousOutput === undefined) delete process.env.COMFYUI_OUTPUT_ROOT;
      else process.env.COMFYUI_OUTPUT_ROOT = previousOutput;
      if (previousReference === undefined) delete process.env.COMFYUI_IPADAPTER_REFERENCE_FILE;
      else process.env.COMFYUI_IPADAPTER_REFERENCE_FILE = previousReference;
      if (previousGate === undefined) delete process.env.COMFYUI_EXECUTION_GATE;
      else process.env.COMFYUI_EXECUTION_GATE = previousGate;
      if (previousReferenceOwner === undefined) delete process.env.COMFYUI_REFERENCE_OWNER_ID;
      else process.env.COMFYUI_REFERENCE_OWNER_ID = previousReferenceOwner;
      if (previousConsent === undefined) delete process.env.COMFYUI_REFERENCE_CONSENT_REF;
      else process.env.COMFYUI_REFERENCE_CONSENT_REF = previousConsent;
    }
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

  it('propage une annulation BDD et ne persiste aucun candidat après celle-ci', async () => {
    const job = queueImageJob('annulation locale');
    const processing = processNextImageJob({
      runnerId: RUNNER_ID,
      generate: (_request, _job, signal) => new Promise((_resolve, reject) => {
        const onAbort = (): void => reject(new Error('comfyui_request_cancelled'));
        if (signal?.aborted) onAbort();
        else signal?.addEventListener('abort', onAbort, {once: true});
      }),
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    cancelJob(owner, job.job_id);
    const result = await processing;
    expect(result).toMatchObject({status: 'failed', jobId: job.job_id});
    expect(getJob(owner, job.job_id).status).toBe('cancelled');
    const count = getDb().prepare('SELECT COUNT(*) AS count FROM generated_assets WHERE job_id = ?')
      .get(job.job_id) as {count: number};
    expect(count.count).toBe(0);
  });

  it('ComfyUI persiste un asset candidat sans base64 dans le résultat du job', async () => {
    const job = queueImageJob();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIACo0C/QAAAABJRU5ErkJggg==',
      'base64',
    );
    const result = await processNextImageJob({
      runnerId: RUNNER_ID,
      generate: async () => ({
        images: [],
        binaryImages: [{mime: 'image/png', bytes: png, filename: 'candidate.png'}],
        model: 'masterflex_ipadapter_sdxl_v1',
        provider: 'comfyui',
        workflowId: 'masterflex_ipadapter_sdxl_v1',
        templateSha256: 'a'.repeat(64),
      }),
    });
    expect(result).toMatchObject({status: 'processed', jobId: job.job_id, imageCount: 1, provider: 'comfyui'});

    const reviewed = getJob(owner, job.job_id);
    const stored = reviewed.result as {assets?: Array<{asset_id?: string}>; images?: unknown; workflow_id?: string};
    expect(stored.assets).toHaveLength(1);
    expect(stored.images).toBeUndefined();
    expect(JSON.stringify(stored)).not.toContain('iVBOR');
    expect(stored.workflow_id).toBe('masterflex_ipadapter_sdxl_v1');

    const row = getDb().prepare(
      'SELECT status, owner_id, project_id, job_id, storage_ref FROM generated_assets WHERE id = ?',
    ).get(stored.assets?.[0]?.asset_id) as Record<string, unknown> | undefined;
    expect(row).toMatchObject({status: 'candidate', owner_id: owner.id, project_id: null, job_id: job.job_id});
    expect(row?.storage_ref).toMatch(/^storage:\/\/assets\//);
  });

  it('branche les gates post-generation avant la revue et conserve le candidat bloqué', async () => {
    const job = queueImageJob('cute mascot chibi, silhouette expressive');
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIACo0C/QAAAABJRU5ErkJggg==',
      'base64',
    );
    const result = await processNextImageJob({
      runnerId: RUNNER_ID,
      generate: async () => ({
        images: [],
        binaryImages: [{mime: 'image/png', bytes: png, filename: 'blocked-candidate.png'}],
        model: 'masterflex_ipadapter_sdxl_v1',
        provider: 'comfyui',
        workflowId: 'masterflex_ipadapter_sdxl_v1',
        templateSha256: 'b'.repeat(64),
      }),
    });
    expect(result.status).toBe('processed');
    const reviewed = getJob(owner, job.job_id);
    expect(reviewed.status).toBe('needs_review');
    const output = reviewed.result as {
      assets?: Array<{asset_id: string}>;
      blocked_gate_ids?: string[];
      post_generation_gates?: Array<{gate_id: string; status: string}>;
    };
    expect(output.blocked_gate_ids).toContain('adult_cartoon_not_layette');
    expect(output.post_generation_gates).toEqual(expect.arrayContaining([
      expect.objectContaining({gate_id: 'adult_cartoon_not_layette', status: 'blocked'}),
    ]));
    const asset = getDb().prepare(
      'SELECT status, metadata_json FROM generated_assets WHERE id = ?',
    ).get(output.assets?.[0]?.asset_id) as {status: string; metadata_json: string} | undefined;
    expect(asset?.status).toBe('candidate');
    expect(JSON.parse(asset?.metadata_json ?? '{}')).toMatchObject({
      gate_evaluation_source: 'request_prompt_heuristic_v1',
      post_generation_gates: expect.arrayContaining([
        expect.objectContaining({gate_id: 'adult_cartoon_not_layette', status: 'blocked'}),
      ]),
    });
  });

  it('job asset_prepare d’un autre kind → failed (jamais completed)', async () => {
    const db = getDb();
    const now = Date.now();
    const wrongKindJobId = `img-wrong-kind-job-${now}`;
    db.prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, 'asset_prepare', 'queued', ?, 'owner', ?, 'high', ?, 0, 0, ?, ?)`,
    ).run(wrongKindJobId, owner.id, owner.id, JSON.stringify({kind: 'export'}), now, now);

    const result = await processNextImageJob({runnerId: RUNNER_ID, generate: async () => ({images: fakeImages, model: 'm', provider: 'p'})});
    expect(result.status).toBe('failed');
    expect(getJob(owner, wrongKindJobId).status).toBe('failed');
  });
});
