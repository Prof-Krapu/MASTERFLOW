import type {JobType, RunnerStatus} from '@masterflow/shared';

import {recordRunnerHeartbeat} from '../services/runners.ts';

/**
 * Boucle générique d'un runner local MasterFlow.
 *
 * Doctrine PR‑C8/C9/C10 : un runner est un PROCESS séparé qui (1) déclare un
 * heartbeat AVANT de réclamer un job, (2) ne traite qu'UN job à la fois, (3) ne
 * touche jamais les tables directement (il passe par l'API service jobs). Cette
 * boucle ne connaît rien d'OCR : elle gère seulement le heartbeat, la cadence et
 * l'arrêt propre. La logique métier vit dans `processOnce`.
 */

export interface RunnerLoopConfig {
  runnerId: string;
  runnerFamily: string;
  jobTypes: JobType[];
  version: string;
  leaseMs: number;
  idleIntervalMs: number;
  hostRef?: string | null;
}

export interface ProcessOutcome {
  /** `true` si un job a été pris ce tour (→ enchaîner sans attendre). */
  processed: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Émet un heartbeat (online/draining/offline). Best‑effort, jamais bloquant. */
export function sendHeartbeat(
  config: RunnerLoopConfig,
  status: RunnerStatus,
  activeJobId: string | null = null,
): void {
  recordRunnerHeartbeat({
    runner_id: config.runnerId,
    runner_family: config.runnerFamily,
    job_types: config.jobTypes,
    status,
    active_job_id: activeJobId,
    version: config.version,
    host_ref: config.hostRef ?? null,
    lease_ms: config.leaseMs,
    last_seen_at: Date.now(),
  });
}

/**
 * Démarre la boucle : heartbeat `online` → `processOnce` → attente si rien à
 * faire. SIGINT/SIGTERM → `draining` puis `offline` avant de rendre la main.
 */
export async function startRunnerLoop(
  config: RunnerLoopConfig,
  processOnce: () => Promise<ProcessOutcome>,
): Promise<void> {
  let stopping = false;
  const stop = (): void => {
    stopping = true;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  sendHeartbeat(config, 'online');
  console.log(
    `[runner:${config.runnerFamily}] démarré (${config.runnerId}) — types=${config.jobTypes.join(',')}`,
  );

  while (!stopping) {
    sendHeartbeat(config, 'online');
    let outcome: ProcessOutcome = {processed: false};
    try {
      outcome = await processOnce();
    } catch (err) {
      console.warn(
        `[runner:${config.runnerFamily}] erreur de boucle (ignorée) :`,
        (err as Error).message,
      );
    }
    if (!outcome.processed) await sleep(config.idleIntervalMs);
  }

  try {
    sendHeartbeat(config, 'draining');
    sendHeartbeat(config, 'offline');
  } catch {
    /* arrêt best‑effort : ne jamais planter à la fermeture */
  }
  console.log(`[runner:${config.runnerFamily}] arrêté proprement.`);
}
