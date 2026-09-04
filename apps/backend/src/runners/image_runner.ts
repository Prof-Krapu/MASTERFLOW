import {pathToFileURL} from 'node:url';

import {
  ComfyUIWorkflowIdSchema,
  GeneratedImageSchema,
  ImageGenerationRequestSchema,
  type GeneratedImage,
  type ImageGenerationRequest,
  type Job,
  type JobType,
} from '@masterflow/shared';

import {env} from '../lib/env.ts';
import {getDb} from '../db/schema.ts';
import {evaluatePostGenerationGates} from '../engines/story_da_bridge.ts';
import {runComfyUIWorkflow, type ComfyUIBinaryImage} from '../services/comfyui_client.ts';
import {createComfyUIJobStaging, purgeComfyUIJobStaging} from '../services/comfyui_staging.ts';
import {acquireComfyUIGpuLock, releaseComfyUIGpuLock} from '../services/comfyui_staging.ts';
import {storeImageJobCandidates} from '../services/da_runtime.ts';
import {
  claimNextJob,
  extendJobLease,
  failJob,
  markJobNeedsReview,
  updateJobProgress,
} from '../services/jobs.ts';
import {resolveLLMRoute, type ResolvedLLMRoute} from '../services/llm_routing.ts';
import {startRunnerLoop} from './runner_loop.ts';

/**
 * Runner de génération d'image — `runner_family = asset`.
 *
 * GATE GO IMAGE : ne traite QUE des jobs `asset_prepare` de `kind=image_generation`
 * (créés via `createImageGenerationJob`, lui-même appelé uniquement par l'action
 * sensible approuvée). La sortie part TOUJOURS en `needs_review` — jamais
 * `completed` : un humain valide et ingère l'asset. Le runner n'invente jamais
 * d'image (mock → aucune image).
 *
 * Dispatch explicite et fermé par défaut via `IMAGE_PROVIDER` :
 *  1. `mock` (défaut) → aucun réseau, même si une URL ComfyUI est renseignée ;
 *  2. `comfyui` → loopback + workflow allowlisté, 1 job GPU à la fois ;
 *  3. `openrouter` → route LLM validée et allowlist egress.
 */

export const IMAGE_RUNNER_FAMILY = 'asset';
export const IMAGE_RUNNER_VERSION = '0.2.0';
const IMAGE_JOB_TYPES: JobType[] = ['asset_prepare'];
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_IMAGES = 4;

export interface GenerateImagesResult {
  images: GeneratedImage[];
  binaryImages?: ComfyUIBinaryImage[];
  model: string;
  provider: string;
  workflowId?: import('@masterflow/shared').ComfyUIWorkflowId;
  templateSha256?: string;
}

const ERROR_REDACT =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization|bearer\s+\S+)/gi;

/** Message d'erreur sûr (tronqué + secrets caviardés) pour `failJob`. */
function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const safe = raw.replace(ERROR_REDACT, '[redacted]').slice(0, 300).trim();
  return safe || 'image_runner_failed';
}

function isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const h = url.hostname;
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]')
    );
  } catch {
    return false;
  }
}

/** Lit et valide le payload `image_generation` d'un job `asset_prepare`. */
function readImageRequest(job: Job): ImageGenerationRequest {
  const payload = job.payload as {kind?: unknown};
  if (payload.kind !== 'image_generation') {
    throw new Error('asset_job_unsupported_kind');
  }
  return ImageGenerationRequestSchema.parse(job.payload);
}

/**
 * Valide la réponse d'un provider en images conformes (jamais d'image inventée :
 * tout élément non conforme à `GeneratedImageSchema` est rejeté silencieusement).
 */
export function parseGeneratedImages(rawList: unknown, max = MAX_IMAGES): GeneratedImage[] {
  if (!Array.isArray(rawList)) return [];
  const out: GeneratedImage[] = [];
  for (let i = 0; i < rawList.length && out.length < max; i++) {
    const parsed = GeneratedImageSchema.safeParse(rawList[i]);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** Génération via provider LLM OpenAI-compatible (ex. OpenRouter), endpoint images. */
async function generateViaOpenRouter(
  route: ResolvedLLMRoute,
  request: ImageGenerationRequest,
): Promise<GenerateImagesResult> {
  const {baseUrl, apiKey, model} = route;
  if (!baseUrl || !apiKey) throw new Error('llm_route_incomplete_provider_config');
  const size =
    request.width && request.height ? `${request.width}x${request.height}` : undefined;

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Title': 'MasterFlow',
    },
    body: JSON.stringify({
      model,
      prompt: request.prompt,
      n: Math.min(request.n, MAX_IMAGES),
      ...(size ? {size} : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`image_provider_error_${res.status}:${detail.slice(0, 300)}`);
  }

  const data = (await res.json()) as {data?: {url?: string; b64_json?: string}[]};
  const images = parseGeneratedImages(
    (data.data ?? []).map((item) =>
      item.b64_json
        ? {mime: 'image/png', base64: item.b64_json}
        : item.url
          ? {mime: 'image/png', url: item.url}
          : null,
    ),
  );
  return {images, model, provider: route.provider};
}

/** ComfyUI local : workflow fermé, récupération binaire et stockage différé par le runner. */
export async function generateViaComfyUI(
  baseUrl: string,
  workflowId: import('@masterflow/shared').ComfyUIWorkflowId,
  request: ImageGenerationRequest,
  jobId: string,
  deps: {runWorkflow?: typeof runComfyUIWorkflow} = {},
  signal?: AbortSignal,
): Promise<GenerateImagesResult> {
  if (!isLoopbackUrl(baseUrl)) throw new Error('comfyui_requires_loopback');
  if (process.env.COMFYUI_EXECUTION_GATE !== 'GO_IMAGE_LOCAL') {
    throw new Error('comfyui_local_execution_gate_required');
  }
  if (process.env.COMFYUI_REFERENCE_OWNER_ID?.trim() !== request.owner_id) {
    throw new Error('comfyui_reference_owner_mismatch');
  }
  if (!/^consent:[a-zA-Z0-9._/-]{1,200}$/.test(process.env.COMFYUI_REFERENCE_CONSENT_REF?.trim() ?? '')) {
    throw new Error('comfyui_reference_consent_required');
  }
  if (
    workflowId === 'masterflow_photomaker_v2_v1' &&
    process.env.COMFYUI_PHOTOMAKER_POLICY !== 'LICENSE_CLEARED'
  ) {
    throw new Error('comfyui_photomaker_license_gate_required');
  }
  const inputRoot = process.env.COMFYUI_INPUT_ROOT?.trim();
  if (!inputRoot) throw new Error('comfyui_input_root_required');
  const outputRoot = process.env.COMFYUI_OUTPUT_ROOT?.trim();
  if (!outputRoot) throw new Error('comfyui_output_root_required');
  acquireComfyUIGpuLock({inputRoot, jobId});
  let staging: ReturnType<typeof createComfyUIJobStaging> | null = null;
  try {
    staging = createComfyUIJobStaging({
      inputRoot,
      jobId,
      workflowId,
      ipAdapterReferenceFile: process.env.COMFYUI_IPADAPTER_REFERENCE_FILE,
      photoMakerReferenceDir: process.env.COMFYUI_PHOTOMAKER_REFERENCE_DIR,
    });
    const output = await (deps.runWorkflow ?? runComfyUIWorkflow)({
      baseUrl,
      workflowId,
      request,
      jobId,
      photoMakerReferenceDir: workflowId === 'masterflow_photomaker_v2_v1' ? staging.directory : undefined,
      ipAdapterReferenceImage: workflowId === 'masterflex_ipadapter_sdxl_v1' ? staging.relativeFiles[0] : undefined,
      timeoutMs: Number(process.env.COMFYUI_TIMEOUT_MS) || undefined,
      pollMs: Number(process.env.COMFYUI_POLL_MS) || undefined,
      maxImageBytes: Number(process.env.COMFYUI_MAX_IMAGE_BYTES) || undefined,
      outputRoot,
      signal,
    });
    return {
      images: [],
      binaryImages: output.images,
      model: workflowId,
      provider: 'comfyui',
      workflowId,
      templateSha256: output.templateSha256,
    };
  } finally {
    // Succès, erreur provider et timeout suivent le même chemin de purge local.
    try {
      if (staging) purgeComfyUIJobStaging({inputRoot, jobId});
    } finally {
      releaseComfyUIGpuLock({inputRoot, jobId});
    }
  }
}

/** Dispatch explicite et fermé par défaut : mock | comfyui | openrouter. */
export async function generateImages(
  request: ImageGenerationRequest,
  job: Job,
  signal?: AbortSignal,
): Promise<GenerateImagesResult> {
  const provider = (process.env.IMAGE_PROVIDER ?? 'mock').trim().toLowerCase();
  if (provider === 'mock') return {images: [], model: 'mock', provider: 'mock'};
  if (provider === 'comfyui') {
    if (process.env.COMFYUI_EXECUTION_GATE !== 'GO_IMAGE_LOCAL') {
      throw new Error('comfyui_local_execution_gate_required');
    }
    const comfy = (process.env.COMFYUI_BASE_URL ?? '').trim();
    if (!comfy) throw new Error('comfyui_base_url_required');
    const workflowId = ComfyUIWorkflowIdSchema.parse(
      request.workflow_id ?? process.env.COMFYUI_WORKFLOW_ID,
    );
    return generateViaComfyUI(comfy, workflowId, request, job.job_id, {}, signal);
  }
  if (provider !== 'openrouter') throw new Error('image_provider_not_supported');
  const route = resolveLLMRoute('image_generation', env.llm);
  if (route.provider === 'mock') throw new Error('image_provider_route_is_mock');
  return generateViaOpenRouter(route, request);
}

export interface ProcessImageDeps {
  runnerId: string;
  leaseMs?: number;
  /** Injectables pour tests (réseau/disque). */
  claim?: (runnerId: string, types: JobType[], leaseMs?: number) => Job | null;
  generate?: (
    request: ImageGenerationRequest,
    job: Job,
    signal?: AbortSignal,
  ) => Promise<GenerateImagesResult>;
}

export type ProcessImageResult =
  | {status: 'idle'}
  | {status: 'processed'; jobId: string; imageCount: number; provider: string}
  | {status: 'failed'; jobId: string; error: string};

interface PostGenerationGateState {
  reports: ReturnType<typeof evaluatePostGenerationGates>;
  blockedGateIds: string[];
  evaluationError: string | null;
}

function postGenerationGateState(request: ImageGenerationRequest): PostGenerationGateState {
  try {
    let activeLayers: string[] = [];
    if (request.manifest_id) {
      const row = getDb().prepare(
        'SELECT active_layers_json FROM visual_manifests WHERE id = ?',
      ).get(request.manifest_id) as {active_layers_json: string} | undefined;
      if (row) {
        const parsed = JSON.parse(row.active_layers_json) as unknown;
        if (Array.isArray(parsed)) activeLayers = parsed.filter((item): item is string => typeof item === 'string');
      }
    }
    const reports = evaluatePostGenerationGates(request.prompt, activeLayers);
    return {
      reports,
      blockedGateIds: reports.filter((report) => report.status === 'blocked').map((report) => report.gate_id),
      evaluationError: null,
    };
  } catch {
    // L'asset reste candidat et passe en revue : une panne de gate ne doit jamais
    // effacer une génération privée ni la faire passer pour validée.
    return {reports: [], blockedGateIds: [], evaluationError: 'post_generation_gate_evaluation_failed'};
  }
}

/**
 * Traite AU PLUS un job image. Toujours terminé en `needs_review` (succès, même
 * sans image en mock/scaffold) ou `failed` (erreur), jamais `completed`.
 */
export async function processNextImageJob(deps: ProcessImageDeps): Promise<ProcessImageResult> {
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;
  const claim = deps.claim ?? claimNextJob;
  const generate = deps.generate ?? generateImages;

  const job = claim(deps.runnerId, IMAGE_JOB_TYPES, leaseMs);
  if (!job) return {status: 'idle'};

  const generationController = new AbortController();
  const cancellationPoll = setInterval(() => {
    const current = getDb().prepare('SELECT status FROM jobs WHERE id = ?')
      .get(job.job_id) as {status: string} | undefined;
    if (!current || current.status === 'cancelled') generationController.abort();
  }, 250);
  cancellationPoll.unref();
  const leaseHeartbeat = setInterval(() => {
    try {
      extendJobLease(job.job_id, deps.runnerId, leaseMs);
    } catch {
      generationController.abort();
    }
  }, Math.max(1_000, Math.floor(leaseMs / 3)));
  leaseHeartbeat.unref();

  try {
    updateJobProgress(job.job_id, 5, deps.runnerId);
    const request = readImageRequest(job);

    updateJobProgress(job.job_id, 40, deps.runnerId);
    extendJobLease(job.job_id, deps.runnerId, leaseMs);

    const out = await generate(request, job, generationController.signal);
    // Refuse toute persistance si le job a été annulé ou repris pendant la génération.
    extendJobLease(job.job_id, deps.runnerId, leaseMs);
    updateJobProgress(job.job_id, 90, deps.runnerId);

    const gateState = out.binaryImages?.length ? postGenerationGateState(request) : {
      reports: [],
      blockedGateIds: [],
      evaluationError: null,
    };
    const candidates = out.binaryImages && out.workflowId && out.templateSha256
      ? storeImageJobCandidates(job, request, out.binaryImages, {
          workflowId: out.workflowId,
          templateSha256: out.templateSha256,
          postGenerationGates: gateState.reports,
          gateEvaluationSource: 'request_prompt_heuristic_v1',
        })
      : [];
    const imageCount = candidates.length > 0 ? candidates.length : out.images.length;

    markJobNeedsReview(
      job.job_id,
      {
        kind: 'image_generation',
        image_count: imageCount,
        ...(candidates.length > 0
          ? {assets: candidates.map((asset) => ({asset_id: asset.id, storage_ref: asset.storage_ref, mime: asset.mime_type}))}
          : {images: out.images}),
        provider: out.provider,
        model: out.model,
        workflow_id: out.workflowId ?? null,
        post_generation_gates: gateState.reports,
        blocked_gate_ids: gateState.blockedGateIds,
        gate_evaluation_source: out.binaryImages?.length ? 'request_prompt_heuristic_v1' : null,
        gate_evaluation_error: gateState.evaluationError,
        prompt: request.prompt,
      },
      imageCount > 0
        ? gateState.blockedGateIds.length > 0
          ? 'generated_images_blocked_by_post_generation_gates'
          : 'generated_images_require_human_validation'
        : 'image_backend_returned_no_image',
      deps.runnerId,
    );
    return {
      status: 'processed',
      jobId: job.job_id,
      imageCount,
      provider: out.provider,
    };
  } catch (err) {
    const message = sanitizeError(err);
    try {
      failJob(job.job_id, message, undefined, deps.runnerId);
    } catch (failErr) {
      console.warn(`[runner:image] échec failJob ${job.job_id} :`, (failErr as Error).message);
    }
    return {status: 'failed', jobId: job.job_id, error: message};
  } finally {
    clearInterval(cancellationPoll);
    clearInterval(leaseHeartbeat);
  }
}

/** Entrypoint : boucle de polling avec heartbeat. */
async function main(): Promise<void> {
  const runnerId = process.env.IMAGE_RUNNER_ID ?? `image-runner-${process.pid}`;
  const leaseMs = Number(process.env.IMAGE_RUNNER_LEASE_MS) || DEFAULT_LEASE_MS;
  const idleIntervalMs = Number(process.env.IMAGE_RUNNER_POLL_MS) || 3000;

  await startRunnerLoop(
    {
      runnerId,
      runnerFamily: IMAGE_RUNNER_FAMILY,
      jobTypes: IMAGE_JOB_TYPES,
      version: IMAGE_RUNNER_VERSION,
      leaseMs,
      idleIntervalMs,
      hostRef: null,
    },
    async () => {
      const result = await processNextImageJob({runnerId, leaseMs});
      if (result.status === 'processed') {
        console.log(
          `[runner:image] job ${result.jobId} → needs_review (${result.imageCount} image·s, ${result.provider})`,
        );
      } else if (result.status === 'failed') {
        console.warn(`[runner:image] job ${result.jobId} → failed : ${result.error}`);
      }
      return {processed: result.status !== 'idle'};
    },
  );
}

// N'exécute la boucle que si le fichier est lancé directement (pas à l'import en test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[runner:image] arrêt sur erreur fatale :', err);
    process.exit(1);
  });
}
