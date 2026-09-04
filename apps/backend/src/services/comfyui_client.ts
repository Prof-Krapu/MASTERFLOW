import type {ComfyUIWorkflowId, ImageGenerationRequest} from '@masterflow/shared';
import {lstatSync, realpathSync, unlinkSync} from 'node:fs';
import {resolve, sep} from 'node:path';

import {compileComfyUIWorkflow} from './comfyui_workflow_registry.ts';

const DEFAULT_TIMEOUT_MS = 4 * 60 * 1000;
const DEFAULT_POLL_MS = 750;
const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUTS = 4;

export interface ComfyUIBinaryImage {
  mime: 'image/png';
  bytes: Buffer;
  filename: string;
}

export interface RunComfyUIOptions {
  baseUrl: string;
  workflowId: ComfyUIWorkflowId;
  request: ImageGenerationRequest;
  jobId: string;
  photoMakerReferenceDir?: string;
  ipAdapterReferenceImage?: string;
  timeoutMs?: number;
  pollMs?: number;
  maxImageBytes?: number;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  cancellationTimeoutMs?: number;
  outputRoot?: string;
}

function normalizedLoopbackOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('comfyui_base_url_invalid');
  }
  const allowedHost = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.protocol !== 'http:' || !allowedHost || url.username || url.password || url.search || url.hash || (url.pathname !== '/' && url.pathname !== '')) {
    throw new Error('comfyui_requires_plain_http_loopback_origin');
  }
  return url.origin;
}

async function request(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const abortFromParent = (): void => controller.abort();
  if (parentSignal?.aborted) controller.abort();
  else parentSignal?.addEventListener('abort', abortFromParent, {once: true});
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {...init, redirect: 'error', signal: controller.signal});
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error(parentSignal?.aborted ? 'comfyui_request_cancelled' : 'comfyui_request_timeout');
    }
    throw new Error('comfyui_unreachable');
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', abortFromParent);
  }
}

async function readResponseBytes(
  response: Response,
  options: {maxBytes: number; timeoutMs: number; signal?: AbortSignal; tooLargeError: string},
): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  let timedOut = false;
  const abort = (): void => { void reader.cancel(); };
  if (options.signal?.aborted) throw new Error('comfyui_request_cancelled');
  options.signal?.addEventListener('abort', abort, {once: true});
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, Math.max(1, options.timeoutMs));
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > options.maxBytes) {
        void reader.cancel();
        throw new Error(options.tooLargeError);
      }
      chunks.push(chunk);
    }
    if (options.signal?.aborted) throw new Error('comfyui_request_cancelled');
    if (timedOut) throw new Error('comfyui_response_timeout');
    return Buffer.concat(chunks, total);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

async function readJsonBody(response: Response, timeoutMs: number, signal?: AbortSignal): Promise<unknown> {
  const bytes = await readResponseBytes(response, {
    maxBytes: 2 * 1024 * 1024,
    timeoutMs,
    signal,
    tooLargeError: 'comfyui_json_too_large',
  });
  try {
    return JSON.parse(bytes.toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

function readOutputImages(raw: unknown): Array<{filename: string; subfolder: string; type: 'output'}> {
  if (!raw || typeof raw !== 'object') return [];
  const entry = raw as {outputs?: Record<string, {images?: unknown[]}>};
  const found: Array<{filename: string; subfolder: string; type: 'output'}> = [];
  for (const output of Object.values(entry.outputs ?? {})) {
    for (const item of output.images ?? []) {
      if (!item || typeof item !== 'object') continue;
      const image = item as {filename?: unknown; subfolder?: unknown; type?: unknown};
      if (typeof image.filename !== 'string' || image.filename.length > 500 || image.type !== 'output') continue;
      if (typeof image.subfolder !== 'string' || image.subfolder.length > 500) continue;
      found.push({filename: image.filename, subfolder: image.subfolder, type: 'output'});
      if (found.length >= MAX_OUTPUTS) return found;
    }
  }
  return found;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PRIVATE_PNG_CHUNKS = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf']);

function assertBoundedPngDimensions(bytes: Buffer): void {
  if (bytes.length < 24 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error('comfyui_png_invalid');
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width < 1 || height < 1 || width > 4096 || height > 4096) {
    throw new Error('comfyui_png_dimensions_invalid');
  }
}

/** Retire les chunks où ComfyUI peut embarquer prompt/workflow/EXIF. */
function stripPngPrivateMetadata(bytes: Buffer): Buffer {
  if (bytes.length < 20 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('comfyui_png_invalid');
  }
  const kept = [bytes.subarray(0, 8)];
  let offset = 8;
  let ended = false;
  while (offset + 12 <= bytes.length) {
    const size = bytes.readUInt32BE(offset);
    const end = offset + 12 + size;
    if (end > bytes.length) throw new Error('comfyui_png_invalid');
    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
    if (!PRIVATE_PNG_CHUNKS.has(type)) kept.push(bytes.subarray(offset, end));
    offset = end;
    if (type === 'IEND') {
      ended = true;
      break;
    }
  }
  if (!ended) throw new Error('comfyui_png_invalid');
  return Buffer.concat(kept);
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(new Error('comfyui_request_cancelled'));
    return;
  }
  const timer = setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, ms);
  const onAbort = (): void => {
    clearTimeout(timer);
    reject(new Error('comfyui_request_cancelled'));
  };
  signal?.addEventListener('abort', onAbort, {once: true});
});

async function cancelSubmittedPrompt(
  fetchImpl: typeof fetch,
  origin: string,
  promptId: string,
  timeoutMs: number,
): Promise<void> {
  const bounded = Math.max(50, Math.min(timeoutMs, 2_000));
  await Promise.allSettled([
    request(fetchImpl, `${origin}/queue`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({delete: [promptId]}),
    }, bounded),
    request(fetchImpl, `${origin}/interrupt`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({prompt_id: promptId}),
    }, bounded),
  ]);
}

async function purgePromptHistory(
  fetchImpl: typeof fetch,
  origin: string,
  promptId: string,
  timeoutMs: number,
): Promise<void> {
  await request(fetchImpl, `${origin}/history`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({delete: [promptId]}),
  }, Math.max(50, Math.min(timeoutMs, 2_000))).catch(() => undefined);
}

function purgeLocalOutputFiles(
  outputRootValue: string | undefined,
  refs: Array<{filename: string; subfolder: string; type: 'output'}>,
): void {
  if (!outputRootValue) return;
  let outputRoot: string;
  try {
    outputRoot = realpathSync(outputRootValue);
  } catch {
    throw new Error('comfyui_output_root_invalid');
  }
  for (const ref of refs) {
    if (!/^MASTERFLOW(?:\/|$)/.test(ref.subfolder) || ref.filename.includes('/') || ref.filename.includes('\\')) {
      throw new Error('comfyui_output_cleanup_ref_invalid');
    }
    const target = resolve(outputRoot, ref.subfolder, ref.filename);
    if (target === outputRoot || !target.startsWith(outputRoot + sep)) {
      throw new Error('comfyui_output_cleanup_ref_invalid');
    }
    try {
      const stat = lstatSync(target);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('invalid');
      unlinkSync(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error('comfyui_output_cleanup_failed');
      }
    }
  }
}

export async function runComfyUIWorkflow(options: RunComfyUIOptions): Promise<{
  images: ComfyUIBinaryImage[];
  workflowId: ComfyUIWorkflowId;
  templateSha256: string;
}> {
  const origin = normalizedLoopbackOrigin(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;
  const compiled = compileComfyUIWorkflow(options.workflowId, options.request, options.jobId, {
    photoMakerReferenceDir: options.photoMakerReferenceDir,
    ipAdapterReferenceImage: options.ipAdapterReferenceImage,
  });

  for (const node of compiled.descriptor.requiredNodes) {
    const objectInfoResponse = await request(
      fetchImpl,
      `${origin}/object_info/${encodeURIComponent(node)}`,
      {method: 'GET'},
      Math.min(timeoutMs, 15_000),
      options.signal,
    );
    if (!objectInfoResponse.ok) throw new Error(`comfyui_object_info_error_${objectInfoResponse.status}`);
    const objectInfo = await readJsonBody(objectInfoResponse, Math.min(timeoutMs, 15_000), options.signal) as Record<string, unknown> | null;
    if (!objectInfo || !objectInfo[node]) throw new Error('comfyui_required_node_unavailable');
  }

  const submitted = await request(fetchImpl, `${origin}/prompt`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({prompt: compiled.workflow, client_id: `masterflow-${options.jobId}`}),
  }, Math.min(timeoutMs, 15_000), options.signal);
  if (!submitted.ok) throw new Error(`comfyui_prompt_rejected_${submitted.status}`);
  const submitBody = await readJsonBody(submitted, Math.min(timeoutMs, 15_000), options.signal) as {prompt_id?: unknown} | null;
  const promptId = submitBody?.prompt_id;
  if (typeof promptId !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(promptId)) {
    throw new Error('comfyui_prompt_id_invalid');
  }

  const deadline = Date.now() + timeoutMs;
  let refs: ReturnType<typeof readOutputImages> = [];
  let completed = false;
  try {
    while (Date.now() < deadline) {
      let historyBody: Record<string, unknown> | null;
      try {
        const history = await request(fetchImpl, `${origin}/history/${encodeURIComponent(promptId)}`, {method: 'GET'}, Math.min(15_000, Math.max(1, deadline - Date.now())), options.signal);
        if (!history.ok) throw new Error(`comfyui_history_error_${history.status}`);
        historyBody = await readJsonBody(history, Math.min(15_000, Math.max(1, deadline - Date.now())), options.signal) as Record<string, unknown> | null;
      } catch (error) {
        const message = (error as Error).message;
        if (Date.now() >= deadline && (message === 'comfyui_request_timeout' || message === 'comfyui_response_timeout')) {
          throw new Error('comfyui_generation_timeout');
        }
        throw error;
      }
      const entry = historyBody?.[promptId];
      if (entry && typeof entry === 'object') {
        const status = (entry as {status?: {status_str?: unknown; completed?: unknown}}).status;
        if (status?.status_str === 'error') throw new Error('comfyui_execution_failed');
        refs = readOutputImages(entry);
        if (refs.length > 0 || status?.completed === true) {
          completed = true;
          break;
        }
      }
      await sleep(Math.max(1, pollMs), options.signal);
    }
    if (refs.length === 0) {
      if (Date.now() >= deadline) throw new Error('comfyui_generation_timeout');
      return {images: [], workflowId: options.workflowId, templateSha256: compiled.templateSha256};
    }

    const images: ComfyUIBinaryImage[] = [];
    for (const ref of refs.slice(0, Math.min(options.request.n, MAX_OUTPUTS))) {
      const params = new URLSearchParams({filename: ref.filename, subfolder: ref.subfolder, type: 'output'});
      const response = await request(fetchImpl, `${origin}/view?${params.toString()}`, {method: 'GET'}, 30_000, options.signal);
      if (!response.ok) throw new Error(`comfyui_view_error_${response.status}`);
      const declaredSize = Number(response.headers.get('content-length'));
      if (Number.isFinite(declaredSize) && declaredSize > maxImageBytes) throw new Error('comfyui_image_too_large');
      const bytes = await readResponseBytes(response, {
        maxBytes: maxImageBytes,
        timeoutMs: 30_000,
        signal: options.signal,
        tooLargeError: 'comfyui_image_too_large',
      });
      if (bytes.length === 0 || bytes.length > maxImageBytes) throw new Error('comfyui_image_too_large');
      if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('comfyui_png_only');
      assertBoundedPngDimensions(bytes);
      const sanitized = stripPngPrivateMetadata(bytes);
      images.push({mime: 'image/png', bytes: sanitized, filename: ref.filename});
    }
    return {images, workflowId: options.workflowId, templateSha256: compiled.templateSha256};
  } catch (error) {
    if (!completed) {
      await cancelSubmittedPrompt(
        fetchImpl,
        origin,
        promptId,
        options.cancellationTimeoutMs ?? 1_000,
      );
    }
    throw error;
  } finally {
    try {
      purgeLocalOutputFiles(options.outputRoot, refs);
    } finally {
      await purgePromptHistory(
        fetchImpl,
        origin,
        promptId,
        options.cancellationTimeoutMs ?? 1_000,
      );
    }
  }
}
