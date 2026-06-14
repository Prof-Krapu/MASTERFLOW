import {pathToFileURL} from 'node:url';

import {
  GeneratedImageSchema,
  ImageGenerationRequestSchema,
  type GeneratedImage,
  type ImageGenerationRequest,
  type Job,
  type JobType,
} from '@masterflow/shared';

import {env} from '../lib/env.ts';
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
 * Dispatch des backends (économie d'abord) :
 *  1. ComfyUI local si `COMFYUI_BASE_URL` est posé (loopback only, 1 job GPU à la
 *     fois assuré par la boucle runner + le lease) — gratuit, local ;
 *  2. sinon le provider LLM validé (ex. OpenRouter) via `resolveLLMRoute`
 *     (fail-closed : profil `image_generation` validé + allowlist egress) ;
 *  3. sinon mock → aucune image (needs_review avec note, rien d'inventé).
 */

export const IMAGE_RUNNER_FAMILY = 'asset';
export const IMAGE_RUNNER_VERSION = '0.1.0';
const IMAGE_JOB_TYPES: JobType[] = ['asset_prepare'];
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_IMAGES = 4;

export interface GenerateImagesResult {
  images: GeneratedImage[];
  model: string;
  provider: string;
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

/**
 * Scaffold ComfyUI local (local-only, 1 job GPU à la fois via le lease).
 * La soumission de workflow ComfyUI (`/prompt`) + récupération de l'image est la
 * dernière étape, à câbler contre un ComfyUI lancé localement. Ici on valide le
 * garde-fou local-only et on remonte un résultat vide (jamais d'image inventée).
 */
async function generateViaComfyUI(
  baseUrl: string,
  _request: ImageGenerationRequest,
): Promise<GenerateImagesResult> {
  if (!isLoopbackUrl(baseUrl)) throw new Error('comfyui_requires_loopback');
  // TODO(local) : POST {baseUrl}/prompt avec un workflow, poll /history, lire l'image.
  return {images: [], model: 'comfyui-local', provider: 'comfyui'};
}

/** Dispatch des backends image (ComfyUI local → provider LLM validé → mock). */
async function generateImages(request: ImageGenerationRequest): Promise<GenerateImagesResult> {
  const comfy = (process.env.COMFYUI_BASE_URL ?? '').trim();
  if (comfy) return generateViaComfyUI(comfy, request);

  const route = resolveLLMRoute('image_generation', env.llm);
  if (route.provider === 'mock') {
    return {images: [], model: 'mock', provider: 'mock'};
  }
  return generateViaOpenRouter(route, request);
}

export interface ProcessImageDeps {
  runnerId: string;
  leaseMs?: number;
  /** Injectables pour tests (réseau/disque). */
  claim?: (runnerId: string, types: JobType[], leaseMs?: number) => Job | null;
  generate?: (request: ImageGenerationRequest) => Promise<GenerateImagesResult>;
}

export type ProcessImageResult =
  | {status: 'idle'}
  | {status: 'processed'; jobId: string; imageCount: number; provider: string}
  | {status: 'failed'; jobId: string; error: string};

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

  try {
    updateJobProgress(job.job_id, 5, deps.runnerId);
    const request = readImageRequest(job);

    updateJobProgress(job.job_id, 40, deps.runnerId);
    extendJobLease(job.job_id, deps.runnerId, leaseMs);

    const out = await generate(request);
    updateJobProgress(job.job_id, 90, deps.runnerId);

    markJobNeedsReview(
      job.job_id,
      {
        kind: 'image_generation',
        image_count: out.images.length,
        images: out.images,
        provider: out.provider,
        model: out.model,
        prompt: request.prompt,
      },
      out.images.length > 0
        ? 'generated_images_require_human_validation'
        : 'image_backend_returned_no_image',
      deps.runnerId,
    );
    return {
      status: 'processed',
      jobId: job.job_id,
      imageCount: out.images.length,
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
