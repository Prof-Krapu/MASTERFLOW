import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

import {
  ExportPrepareRequestSchema,
  type ExportPrepareRequest,
  type Job,
  type JobType,
} from '@masterflow/shared';

import {resolveStorageFile, storeFile} from '../lib/storage.ts';
import {
  getApprovedCorrectionExportSource,
  type ApprovedCorrectionExportSource,
} from '../services/feedback_exports.ts';
import {
  claimNextJob,
  completeJob,
  extendJobLease,
  failJob,
  updateJobProgress,
} from '../services/jobs.ts';
import {startRunnerLoop} from './runner_loop.ts';

/**
 * Runner d'export privé.
 *
 * Il ne régénère pas les notes : il matérialise octet pour octet la preview
 * CSV/XLSX déjà approuvée par le professeur. La sortie reste privée, sans URL
 * publique ni envoi automatique.
 */

export const EXPORT_RUNNER_FAMILY = 'export';
export const EXPORT_RUNNER_VERSION = '0.1.0';
const EXPORT_JOB_TYPES: JobType[] = ['export_prepare'];
const DEFAULT_LEASE_MS = 5 * 60 * 1000;

const ERROR_REDACT =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization|bearer\s+\S+)/gi;

function sanitizeError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(ERROR_REDACT, '[redacted]').slice(0, 300).trim() || 'export_runner_failed';
}

function readExportRequest(job: Job): ExportPrepareRequest {
  if (job.type !== 'export_prepare') throw new Error('export_job_type_mismatch');
  return ExportPrepareRequestSchema.parse(job.payload);
}

function privateOutputKey(source: ApprovedCorrectionExportSource): string {
  const ownerKey = createHash('sha256').update(source.owner_id).digest('hex').slice(0, 16);
  const exportKey = createHash('sha256').update(source.export_id).digest('hex').slice(0, 24);
  return `private/correction-exports/${ownerKey}/${exportKey}.${source.format}`;
}

export interface ProcessExportDeps {
  runnerId: string;
  leaseMs?: number;
  claim?: (runnerId: string, types: JobType[], leaseMs?: number) => Job | null;
  getApprovedSource?: typeof getApprovedCorrectionExportSource;
  readSource?: (ref: string) => Buffer;
  writeOutput?: (key: string, data: Buffer) => string;
}

export type ProcessExportResult =
  | {status: 'idle'}
  | {status: 'processed'; jobId: string; fileRef: string; bytes: number; sha256: string}
  | {status: 'failed'; jobId: string; error: string};

/** Traite au plus un export validé et le clôture sans nouvelle décision éditoriale. */
export async function processNextExportJob(
  deps: ProcessExportDeps,
): Promise<ProcessExportResult> {
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;
  const claim = deps.claim ?? claimNextJob;
  const getApprovedSource = deps.getApprovedSource ?? getApprovedCorrectionExportSource;
  const readSource = deps.readSource ?? ((ref: string) => resolveStorageFile(ref).data);
  const writeOutput = deps.writeOutput ?? storeFile;

  const job = claim(deps.runnerId, EXPORT_JOB_TYPES, leaseMs);
  if (!job) return {status: 'idle'};

  try {
    updateJobProgress(job.job_id, 5, deps.runnerId);
    const request = readExportRequest(job);
    const source = getApprovedSource(request.export_preview_ref, request);

    updateJobProgress(job.job_id, 40, deps.runnerId);
    extendJobLease(job.job_id, deps.runnerId, leaseMs);
    const data = readSource(source.preview_ref);
    if (data.length === 0) throw new Error('export_preview_file_empty');
    const sha256 = createHash('sha256').update(data).digest('hex');
    const fileRef = writeOutput(privateOutputKey(source), data);

    updateJobProgress(job.job_id, 90, deps.runnerId);
    completeJob(
      job.job_id,
      {
        kind: 'correction_export',
        export_preview_ref: source.export_id,
        file_ref: fileRef,
        format: source.format,
        target: source.target,
        schema_version: source.schema_version,
        bytes: data.length,
        sha256,
        contains_private_data: true,
        publication_allowed: false,
      },
      deps.runnerId,
    );
    return {status: 'processed', jobId: job.job_id, fileRef, bytes: data.length, sha256};
  } catch (error) {
    const message = sanitizeError(error);
    try {
      failJob(job.job_id, message, undefined, deps.runnerId);
    } catch (failError) {
      console.warn(`[runner:export] échec failJob ${job.job_id} :`, (failError as Error).message);
    }
    return {status: 'failed', jobId: job.job_id, error: message};
  }
}

async function main(): Promise<void> {
  const runnerId = process.env.EXPORT_RUNNER_ID ?? `export-runner-${process.pid}`;
  const leaseMs = Number(process.env.EXPORT_RUNNER_LEASE_MS) || DEFAULT_LEASE_MS;
  const idleIntervalMs = Number(process.env.EXPORT_RUNNER_POLL_MS) || 3000;

  await startRunnerLoop(
    {
      runnerId,
      runnerFamily: EXPORT_RUNNER_FAMILY,
      jobTypes: EXPORT_JOB_TYPES,
      version: EXPORT_RUNNER_VERSION,
      leaseMs,
      idleIntervalMs,
      hostRef: null,
    },
    async () => {
      const result = await processNextExportJob({runnerId, leaseMs});
      if (result.status === 'processed') {
        console.log(`[runner:export] job ${result.jobId} → completed (${result.bytes} octets)`);
      } else if (result.status === 'failed') {
        console.warn(`[runner:export] job ${result.jobId} → failed : ${result.error}`);
      }
      return {processed: result.status !== 'idle'};
    },
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error('[runner:export] arrêt sur erreur fatale :', error);
    process.exit(1);
  });
}
