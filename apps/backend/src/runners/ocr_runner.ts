import {pathToFileURL} from 'node:url';

import {
  InventoryOcrCandidateSchema,
  type InventoryOcrCandidate,
  type Job,
  type JobType,
} from '@masterflow/shared';

import {resolveStorageImage} from '../lib/storage.ts';
import {completeVision, type VisionImage} from '../services/llm.ts';
import {
  claimNextJob,
  extendJobLease,
  failJob,
  markJobNeedsReview,
  updateJobProgress,
} from '../services/jobs.ts';
import {startRunnerLoop} from './runner_loop.ts';

/**
 * Runner OCR réel — `runner_family = ocr_multimodal`.
 *
 * Prend un job `ocr_prepare` (déjà autorisé/créé par `createOcrPrepareJob`),
 * charge la source privée via `storage://`, demande à un LLM multimodal
 * (OpenRouter en prod) d'en extraire des candidats d'inventaire STRUCTURÉS, puis
 * remonte le résultat en `needs_review` — JAMAIS `completed`. Le runner ne crée
 * aucun `inventory_item` : c'est l'owner qui valide et ingère (POST
 * /inventory/ocr-candidates). Aucun SQL direct : tout passe par l'API service.
 */

export const OCR_RUNNER_FAMILY = 'ocr_multimodal';
export const OCR_RUNNER_VERSION = '0.1.0';
const OCR_JOB_TYPES: JobType[] = ['ocr_prepare'];
const DEFAULT_LEASE_MS = 5 * 60 * 1000;
const MAX_CANDIDATES = 50;

const OCR_SYSTEM_PROMPT =
  "Tu es un extracteur d'inventaire pour MasterFlow. Tu observes UNIQUEMENT ce qui est " +
  "réellement visible sur l'image. Tu n'inventes jamais un objet, une marque, une valeur, " +
  "une quantité ni une référence. Si un champ n'est pas lisible, tu l'omets. Tu réponds " +
  'STRICTEMENT par un tableau JSON (aucun texte autour, aucun bloc Markdown).';

const OCR_USER_PROMPT =
  "Extrais les objets d'inventaire visibles sur l'image sous forme d'un tableau JSON. " +
  'Chaque élément est un objet avec les champs :\n' +
  '- "type" parmi : book, comic, manga, artbook, art_supply, tool, gear, software, product, archive, custom (utilise "custom" si incertain) ;\n' +
  '- "label" (texte court, obligatoire) ;\n' +
  '- "creator_or_brand" (optionnel) ;\n' +
  '- "quantity" (entier ≥ 1, optionnel) ;\n' +
  '- "condition" (optionnel) ;\n' +
  '- "confidence" (0 à 1, ta confiance de lecture) ;\n' +
  '- "source_ref" (où l\'élément a été lu, ex. "ocr:zone:haut-gauche").\n' +
  "N'invente aucun champ absent. Si rien n'est lisible, renvoie un tableau vide [].";

/** Lit la `source_ref` `storage://…` du payload d'un job OCR. */
function readSourceRef(job: Job): string {
  const payload = job.payload as {source_ref?: unknown};
  if (typeof payload.source_ref !== 'string' || !payload.source_ref.startsWith('storage://')) {
    throw new Error('ocr_job_missing_source_ref');
  }
  return payload.source_ref;
}

const ERROR_REDACT =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization|bearer\s+\S+)/gi;

/** Message d'erreur sûr (tronqué + secrets caviardés) pour `failJob`. */
function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const safe = raw.replace(ERROR_REDACT, '[redacted]').slice(0, 300).trim();
  return safe || 'ocr_runner_failed';
}

/**
 * Parse la sortie LLM en candidats valides. Tolérant : ignore un bloc Markdown,
 * accepte un tableau ou `{candidates:[…]}`, complète une `source_ref` manquante,
 * et REJETTE silencieusement tout élément non conforme au schéma (jamais de
 * candidat inventé ou malformé propagé).
 */
export function parseOcrCandidates(text: string, jobId: string): InventoryOcrCandidate[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const rawList: unknown[] = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as {candidates?: unknown}).candidates)
      ? ((parsed as {candidates: unknown[]}).candidates)
      : [];

  const out: InventoryOcrCandidate[] = [];
  for (let i = 0; i < rawList.length && out.length < MAX_CANDIDATES; i++) {
    const entry = rawList[i];
    if (!entry || typeof entry !== 'object') continue;
    const raw = entry as Record<string, unknown>;
    const sourceRef =
      typeof raw.source_ref === 'string' && raw.source_ref.trim()
        ? raw.source_ref
        : `ocr:${jobId}:idx:${i}`;
    const validated = InventoryOcrCandidateSchema.safeParse({...raw, source_ref: sourceRef});
    if (validated.success) out.push(validated.data as InventoryOcrCandidate);
  }
  return out;
}

/** Appelle le LLM multimodal et renvoie les candidats validés. */
async function extractCandidates(job: Job, image: VisionImage): Promise<InventoryOcrCandidate[]> {
  const payload = job.payload as {owner_id?: unknown};
  const ownerId = typeof payload.owner_id === 'string' ? payload.owner_id : null;
  const result = await completeVision({
    task: 'ocr',
    system: OCR_SYSTEM_PROMPT,
    userText: OCR_USER_PROMPT,
    images: [image],
    userId: ownerId,
    maxTokens: 2000,
  });
  return parseOcrCandidates(result.text, job.job_id);
}

function defaultLoadImage(ref: string): VisionImage {
  const resolved = resolveStorageImage(ref);
  return {mime: resolved.mime, base64: resolved.base64};
}

export interface ProcessOcrDeps {
  runnerId: string;
  leaseMs?: number;
  /** Injectables pour tests (réseau/disque). */
  claim?: (runnerId: string, types: JobType[], leaseMs?: number) => Job | null;
  loadImage?: (ref: string) => VisionImage;
  extract?: (job: Job, image: VisionImage) => Promise<InventoryOcrCandidate[]>;
}

export type ProcessOcrResult =
  | {status: 'idle'}
  | {status: 'processed'; jobId: string; candidateCount: number}
  | {status: 'failed'; jobId: string; error: string};

/**
 * Traite AU PLUS un job `ocr_prepare`. Retourne `idle` si la file est vide.
 * Toujours terminé en `needs_review` (succès) ou `failed` (erreur), jamais
 * `completed`.
 */
export async function processNextOcrJob(deps: ProcessOcrDeps): Promise<ProcessOcrResult> {
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;
  const claim = deps.claim ?? claimNextJob;
  const loadImage = deps.loadImage ?? defaultLoadImage;
  const extract = deps.extract ?? extractCandidates;

  const job = claim(deps.runnerId, OCR_JOB_TYPES, leaseMs);
  if (!job) return {status: 'idle'};

  try {
    updateJobProgress(job.job_id, 5, deps.runnerId);
    const sourceRef = readSourceRef(job);
    const image = loadImage(sourceRef);

    updateJobProgress(job.job_id, 40, deps.runnerId);
    extendJobLease(job.job_id, deps.runnerId, leaseMs);

    const candidates = await extract(job, image);
    updateJobProgress(job.job_id, 90, deps.runnerId);

    markJobNeedsReview(
      job.job_id,
      {candidate_count: candidates.length, candidates, source_ref: sourceRef},
      'ocr_candidates_require_human_validation',
      deps.runnerId,
    );
    return {status: 'processed', jobId: job.job_id, candidateCount: candidates.length};
  } catch (err) {
    const message = sanitizeError(err);
    try {
      failJob(job.job_id, message, undefined, deps.runnerId);
    } catch (failErr) {
      console.warn(`[runner:ocr] échec failJob ${job.job_id} :`, (failErr as Error).message);
    }
    return {status: 'failed', jobId: job.job_id, error: message};
  }
}

/** Entrypoint : boucle de polling avec heartbeat. */
async function main(): Promise<void> {
  const runnerId = process.env.OCR_RUNNER_ID ?? `ocr-runner-${process.pid}`;
  const leaseMs = Number(process.env.OCR_RUNNER_LEASE_MS) || DEFAULT_LEASE_MS;
  const idleIntervalMs = Number(process.env.OCR_RUNNER_POLL_MS) || 3000;

  await startRunnerLoop(
    {
      runnerId,
      runnerFamily: OCR_RUNNER_FAMILY,
      jobTypes: OCR_JOB_TYPES,
      version: OCR_RUNNER_VERSION,
      leaseMs,
      idleIntervalMs,
      hostRef: null,
    },
    async () => {
      const result = await processNextOcrJob({runnerId, leaseMs});
      if (result.status === 'processed') {
        console.log(
          `[runner:ocr] job ${result.jobId} → needs_review (${result.candidateCount} candidat·s)`,
        );
      } else if (result.status === 'failed') {
        console.warn(`[runner:ocr] job ${result.jobId} → failed : ${result.error}`);
      }
      return {processed: result.status !== 'idle'};
    },
  );
}

// N'exécute la boucle que si le fichier est lancé directement (pas à l'import en test).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[runner:ocr] arrêt sur erreur fatale :', err);
    process.exit(1);
  });
}
