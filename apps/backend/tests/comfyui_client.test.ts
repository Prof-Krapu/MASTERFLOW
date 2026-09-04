import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {createServer, type Server} from 'node:http';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import type {ImageGenerationRequest} from '@masterflow/shared';

import {runComfyUIWorkflow} from '../src/services/comfyui_client.ts';
import {
  acquireComfyUIGpuLock,
  createComfyUIJobStaging,
  purgeComfyUIJobStaging,
  releaseComfyUIGpuLock,
} from '../src/services/comfyui_staging.ts';
import {compileComfyUIWorkflow} from '../src/services/comfyui_workflow_registry.ts';
import runtimePins from '../src/workflows/comfyui/runtime-pins.v1.json' with {type: 'json'};

const request: ImageGenerationRequest = {
  owner_id: 'owner-1',
  scope_type: 'owner',
  scope_id: 'owner-1',
  prompt: 'portrait canon contrôlé',
  negative_prompt: 'watermark',
  width: 768,
  height: 768,
  n: 1,
  seed: 42,
};
const privatePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIACo0C/QAAAABJRU5ErkJggg==',
  'base64',
);

describe('registre ComfyUI fermé', () => {
  it('verrouille les hashes des deux templates API versionnés', () => {
    const workflowRoot = fileURLToPath(new URL('../src/workflows/comfyui/', import.meta.url));
    for (const pin of runtimePins.workflows) {
      const bytes = readFileSync(join(workflowRoot, pin.template_file));
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(pin.template_file_sha256);
    }
  });

  it('compile le workflow MasterFlex avec seulement les paramètres bornés', () => {
    const compiled = compileComfyUIWorkflow('masterflex_ipadapter_sdxl_v1', request, 'job-1', {
      ipAdapterReferenceImage: '.masterflow-staging/job-1/reference-01.png',
    });
    expect(compiled.workflow['4']?.inputs.text).toBe(request.prompt);
    expect(compiled.workflow['7']?.inputs).toMatchObject({width: 768, height: 768, batch_size: 1});
    expect(compiled.workflow['8']?.inputs.seed).toBe(42);
    expect(JSON.stringify(compiled.workflow)).not.toContain('__PROMPT__');
  });

  it('compile PhotoMaker sans exposer son chemin dans le contrat partagé', () => {
    const referenceDir = mkdtempSync(join(tmpdir(), 'masterflow-photomaker-test-'));
    writeFileSync(join(referenceDir, 'reference.png'), privatePng);
    const compiled = compileComfyUIWorkflow(
      'masterflow_photomaker_v2_v1',
      request,
      'job-2',
      {photoMakerReferenceDir: referenceDir},
    );
    expect(compiled.workflow['11']?.inputs.text).toContain('img');
    expect(compiled.workflow['14']?.inputs.path).toBe(referenceDir);
  });

  it('le hash du template ne varie pas avec le prompt ou le seed', () => {
    const first = compileComfyUIWorkflow('masterflex_ipadapter_sdxl_v1', request, 'job-a', {
      ipAdapterReferenceImage: '.masterflow-staging/job-a/reference-01.png',
    });
    const second = compileComfyUIWorkflow(
      'masterflex_ipadapter_sdxl_v1',
      {...request, prompt: 'autre prompt', seed: 999},
      'job-b',
      {ipAdapterReferenceImage: '.masterflow-staging/job-b/reference-01.png'},
    );
    expect(first.templateSha256).toBe(second.templateSha256);
  });

  it('refuse dimensions hors profil et PhotoMaker sans références internes', () => {
    expect(() => compileComfyUIWorkflow(
      'masterflex_ipadapter_sdxl_v1',
      {...request, width: 700},
      'job-3',
      {ipAdapterReferenceImage: '.masterflow-staging/job-3/reference-01.png'},
    )).toThrow('comfyui_dimensions_require_512_1024_multiple_of_64');
    expect(() => compileComfyUIWorkflow('masterflow_photomaker_v2_v1', request, 'job-4'))
      .toThrow('comfyui_photomaker_reference_dir_required');
  });
});

describe('staging privé ComfyUI', () => {
  it('isole les références par job puis les purge sans toucher aux sources', () => {
    const inputRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-input-'));
    const sourceRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-source-'));
    const source = join(sourceRoot, 'private-reference.png');
    writeFileSync(source, privatePng);

    const staging = createComfyUIJobStaging({
      inputRoot,
      jobId: 'job-staging-1',
      workflowId: 'masterflex_ipadapter_sdxl_v1',
      ipAdapterReferenceFile: source,
    });
    expect(staging.relativeFiles).toEqual(['.masterflow-staging/job-staging-1/reference-01.png']);
    expect(existsSync(staging.absoluteFiles[0]!)).toBe(true);
    expect(existsSync(source)).toBe(true);

    purgeComfyUIJobStaging({inputRoot, jobId: 'job-staging-1'});
    expect(existsSync(staging.directory)).toBe(false);
    expect(existsSync(source)).toBe(true);
  });

  it('refuse les liens symboliques et les job ids pouvant sortir du staging', () => {
    const inputRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-input-'));
    const sourceRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-source-'));
    mkdirSync(join(sourceRoot, 'nested'));
    const realReference = join(sourceRoot, 'real.png');
    writeFileSync(realReference, privatePng);
    symlinkSync(realReference, join(sourceRoot, 'linked.png'));
    expect(() => createComfyUIJobStaging({
      inputRoot,
      jobId: '../escape',
      workflowId: 'masterflow_photomaker_v2_v1',
      photoMakerReferenceDir: sourceRoot,
    })).toThrow('comfyui_staging_job_id_invalid');
    expect(() => createComfyUIJobStaging({
      inputRoot,
      jobId: 'job-symlink',
      workflowId: 'masterflow_photomaker_v2_v1',
      photoMakerReferenceDir: sourceRoot,
    })).toThrow('comfyui_staging_reference_invalid');
  });

  it('impose un verrou GPU inter-jobs et le libère seulement pour son propriétaire', () => {
    const inputRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-lock-'));
    acquireComfyUIGpuLock({inputRoot, jobId: 'job-lock-a'});
    expect(() => acquireComfyUIGpuLock({inputRoot, jobId: 'job-lock-b'}))
      .toThrow('comfyui_gpu_busy_or_stale_lock');
    expect(() => releaseComfyUIGpuLock({inputRoot, jobId: 'job-lock-b'}))
      .toThrow('comfyui_gpu_lock_owner_mismatch');
    releaseComfyUIGpuLock({inputRoot, jobId: 'job-lock-a'});
    acquireComfyUIGpuLock({inputRoot, jobId: 'job-lock-b'});
    releaseComfyUIGpuLock({inputRoot, jobId: 'job-lock-b'});
  });
});

describe('client ComfyUI local', () => {
  let server: Server;
  let origin = '';
  let submitted: unknown = null;
  let historyReads = 0;
  let queueDeletes = 0;
  let interrupts = 0;
  let historyDeletes = 0;
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgIACo0C/QAAAABJRU5ErkJggg==',
    'base64',
  );

  beforeAll(async () => {
    server = createServer((req, res) => {
      if (req.method === 'GET' && req.url?.startsWith('/object_info/')) {
        const node = decodeURIComponent(req.url.slice('/object_info/'.length));
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({[node]: {input: {}}}));
        return;
      }
      if (req.method === 'POST' && req.url === '/prompt') {
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          submitted = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
          res.setHeader('content-type', 'application/json');
          const body = submitted as {client_id?: string};
          res.end(JSON.stringify({prompt_id: body.client_id?.includes('timeout') ? 'prompt-timeout' : 'prompt-test-1'}));
        });
        return;
      }
      if (req.method === 'GET' && req.url === '/history/prompt-test-1') {
        historyReads += 1;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(historyReads === 1
          ? {}
          : {
              'prompt-test-1': {
                status: {status_str: 'success', completed: true},
                outputs: {'10': {images: [{filename: 'result.png', subfolder: 'MASTERFLOW', type: 'output'}]}},
              },
            }));
        return;
      }
      if (req.method === 'GET' && req.url === '/history/prompt-timeout') {
        res.setHeader('content-type', 'application/json');
        res.end('{}');
        return;
      }
      if (req.method === 'POST' && req.url === '/queue') {
        queueDeletes += 1;
        res.statusCode = 200;
        res.end('{}');
        return;
      }
      if (req.method === 'POST' && req.url === '/interrupt') {
        interrupts += 1;
        res.statusCode = 200;
        res.end('{}');
        return;
      }
      if (req.method === 'POST' && req.url === '/history') {
        historyDeletes += 1;
        res.statusCode = 200;
        res.end('{}');
        return;
      }
      if (req.method === 'GET' && req.url?.startsWith('/view?')) {
        res.setHeader('content-type', 'image/png');
        res.setHeader('content-length', String(png.length));
        res.end(png);
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('fake_server_address_missing');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it('soumet, attend, récupère et valide une sortie PNG sans vraie génération', async () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'masterflow-comfy-output-'));
    mkdirSync(join(outputRoot, 'MASTERFLOW'));
    writeFileSync(join(outputRoot, 'MASTERFLOW', 'result.png'), png);
    const result = await runComfyUIWorkflow({
      baseUrl: origin,
      workflowId: 'masterflex_ipadapter_sdxl_v1',
      request,
      jobId: 'job-fake-server',
      ipAdapterReferenceImage: '.masterflow-staging/job-fake-server/reference-01.png',
      pollMs: 1,
      timeoutMs: 2_000,
      outputRoot,
    });
    expect(result.images).toHaveLength(1);
    expect(result.images[0]?.mime).toBe('image/png');
    expect((submitted as {prompt?: unknown}).prompt).toBeTruthy();
    expect(historyReads).toBeGreaterThanOrEqual(2);
    expect(historyDeletes).toBeGreaterThan(0);
    expect(existsSync(join(outputRoot, 'MASTERFLOW', 'result.png'))).toBe(false);
  });

  it('annule de façon bornée le prompt soumis quand le polling expire', async () => {
    await expect(runComfyUIWorkflow({
      baseUrl: origin,
      workflowId: 'masterflex_ipadapter_sdxl_v1',
      request,
      jobId: 'job-timeout',
      ipAdapterReferenceImage: '.masterflow-staging/job-timeout/reference-01.png',
      pollMs: 1,
      timeoutMs: 100,
      cancellationTimeoutMs: 100,
    })).rejects.toThrow('comfyui_generation_timeout');
    expect(queueDeletes).toBeGreaterThan(0);
    expect(interrupts).toBeGreaterThan(0);
  });

  it('refuse toute origine non loopback avant le premier appel réseau', async () => {
    let calls = 0;
    await expect(runComfyUIWorkflow({
      baseUrl: 'https://example.com',
      workflowId: 'masterflex_ipadapter_sdxl_v1',
      request,
      jobId: 'job-refused',
      ipAdapterReferenceImage: '.masterflow-staging/job-refused/reference-01.png',
      fetchImpl: (async () => {
        calls += 1;
        throw new Error('must_not_call');
      }) as typeof fetch,
    })).rejects.toThrow('comfyui_requires_plain_http_loopback_origin');
    expect(calls).toBe(0);
  });
});
