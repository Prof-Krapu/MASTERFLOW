import {pathToFileURL} from 'node:url';

import {
  type CorrectionSubmissionScore,
  type Job,
  type JobType,
  type PreCorrectionAnalysisType,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import {chat} from '../services/llm.ts';
import {resolveLLMRoute} from '../services/llm_routing.ts';
import {
  claimNextJob,
  extendJobLease,
  failJob,
  markJobNeedsReview,
  updateJobProgress,
} from '../services/jobs.ts';
import {startRunnerLoop} from './runner_loop.ts';

export const CORRECTION_RUNNER_FAMILY = 'correction';
export const CORRECTION_RUNNER_VERSION = '0.1.0';
const CORRECTION_JOB_TYPES: JobType[] = ['correction_prepare'];
const DEFAULT_LEASE_MS = 10 * 60 * 1000;
const ANALYSIS_TYPE: PreCorrectionAnalysisType = 'rubric_scoring';

interface CorrectionContext {
  batchId: string;
  manifestId: string;
  contextSnapshotId: string;
  ownerId: string;
  projectId: string | null;
  projectScope: string;
  rubricVersionId: string;
  gradingProfileId: string;
  criteria: Array<{
    criterion_id: string;
    label: string;
    description: string;
    weight: number;
    max_points: number;
    evidence_requirements: string[];
    required: boolean;
  }>;
  submissionIds: string[];
  workflowVersion: string;
}

const SCORING_SYSTEM_PROMPT =
  "Tu es un assistant de correction pour MasterFlow. Tu évalues des travaux " +
  "d'étudiants à partir d'une grille critériée. Pour chaque critère, tu donnes " +
  "une note sur le max_points indiqué, une confiance (0-1), des preuves textuelles, " +
  "et les signaux que tu observes.\n\n" +
  "Signaux positifs : insight (pertinence/justesse), mechanic (technique/méthode), " +
  "benchmark (recherche/référencement), activation (mise en pratique), naming " +
  "(vocabulaire/nomenclature), construction (structure/cohérence), coherence (argumentation).\n" +
  "Drapeaux rouges : red_flag_chat (style IA générique), red_flag_help (aide extérieure " +
  "visible), red_flag_generic (contenu vide/générique), red_flag_instagram (format réseau " +
  "social), red_flag_influencer (name-dropping), red_flag_dating (hors-sujet).\n\n" +
  "Après tous les critères, produis un feedback pédagogique : 1 force + 1 axe " +
  "d'amélioration, sur un ton adapté au niveau de l'étudiant.\n\n" +
  "Tu réponds STRICTEMENT par un objet JSON valide, sans texte autour, sans bloc Markdown.";

function buildScoringPrompt(
  criteria: CorrectionContext['criteria'],
  subjectText: string,
  submissionText: string,
): string {
  const criteriaLines = criteria
    .map(
      (c) =>
        `- "${c.label}" (id: ${c.criterion_id}, note max: ${c.max_points}/10, poids: ${c.weight}) : ${c.description}`,
    )
    .join('\n');

  return (
    `Sujet / consigne :\n"""\n${subjectText}\n"""\n\n` +
    `Grille critériée :\n${criteriaLines}\n\n` +
    `Copie de l'étudiant :\n"""\n${submissionText}\n"""\n\n` +
    'Réponds avec cet objet JSON exact :\n' +
    '{\n' +
    '  "criterion_scores": [\n' +
    '    {\n' +
    '      "criterion_id": "...",\n' +
    '      "draft_score": <note sur max_points>,\n' +
    '      "max_points": <max>,\n' +
    '      "confidence": 0.0-1.0,\n' +
    '      "evidence": "citation textuelle à l\'appui",\n' +
    '      "signals": [{"type": "insight", "label": "...", "evidence": "...", "weight": 1}]\n' +
    '    }\n' +
    '  ],\n' +
    '  "feedback": "1 force + 1 axe d\'amélioration",\n' +
    '  "feedback_tone": "supportive|clear|firm",\n' +
    '  "total_score": <somme pondérée>,\n' +
    '  "review_reasons": ["raison si confiance < 0.7 ou signal rouge"]\n' +
    '}'
  );
}

function loadContext(job: Job): CorrectionContext {
  const payload = job.payload as {
    batch_id?: unknown;
    manifest_ref?: unknown;
    workflow_version?: unknown;
  };
  const batchId = typeof payload.batch_id === 'string' ? payload.batch_id : '';
  const manifestId = typeof payload.manifest_ref === 'string' ? payload.manifest_ref : '';
  const workflowVersion = typeof payload.workflow_version === 'string' ? payload.workflow_version : '0.1.0';
  if (!batchId || !manifestId) throw new Error('correction_job_missing_refs');

  const db = getDb();
  const manifest = db
    .prepare(
      `SELECT id, batch_id, project_id, project_scope, rubric_version_id, grading_profile_id,
              submission_refs_json, workflow_version, status, validation_ref, context_snapshot_id
       FROM pre_correction_manifests WHERE id = ?`,
    )
    .get(manifestId) as
    | {
        id: string;
        batch_id: string;
        project_id: string | null;
        project_scope: string;
        rubric_version_id: string;
        grading_profile_id: string;
        submission_refs_json: string;
        workflow_version: string;
        status: string;
        validation_ref: string | null;
        context_snapshot_id: string | null;
      }
    | undefined;
  if (!manifest) throw new Error('manifest_not_found');
  if (manifest.status !== 'validated' || !manifest.validation_ref) {
    throw new Error('manifest_not_validated');
  }
  if (!manifest.context_snapshot_id) throw new Error('context_snapshot_required');
  if (manifest.batch_id !== batchId) throw new Error('manifest_batch_mismatch');

  const batch = db
    .prepare('SELECT id, owner_id, project_id, project_scope FROM correction_batches WHERE id = ?')
    .get(batchId) as {id: string; owner_id: string; project_id: string | null; project_scope: string} | undefined;
  if (!batch) throw new Error('batch_not_found');

  const rubric = db
    .prepare(
      `SELECT id, criteria_json, status FROM rubric_versions WHERE id = ?`,
    )
    .get(manifest.rubric_version_id) as {id: string; criteria_json: string; status: string} | undefined;
  if (!rubric || rubric.status !== 'validated') throw new Error('rubric_not_validated');

  const criteria = JSON.parse(rubric.criteria_json) as CorrectionContext['criteria'];

  const submissionIds = JSON.parse(manifest.submission_refs_json) as string[];
  if (!Array.isArray(submissionIds) || submissionIds.length === 0) {
    throw new Error('manifest_empty_submissions');
  }

  return {
    batchId,
    manifestId: manifest.id,
    contextSnapshotId: manifest.context_snapshot_id,
    ownerId: batch.owner_id,
    projectId: batch.project_id,
    projectScope: batch.project_scope,
    rubricVersionId: manifest.rubric_version_id,
    gradingProfileId: manifest.grading_profile_id,
    criteria,
    submissionIds,
    workflowVersion,
  };
}

interface SubmissionEvidence {
  id: string;
  content: string | null;
}

function loadSubmissionEvidence(submissionId: string): SubmissionEvidence {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT s.id, s.source_evidence_ref, e.payload_ref
       FROM submissions s
       LEFT JOIN evidence_events e ON e.id = s.source_evidence_ref
       WHERE s.id = ?`,
    )
    .get(submissionId) as
    | {id: string; source_evidence_ref: string; payload_ref: string | null}
    | undefined;
  if (!row) throw new Error(`submission_not_found: ${submissionId}`);

  return {id: row.id, content: row.payload_ref};
}

async function scoreSubmission(
  ctx: CorrectionContext,
  evidence: SubmissionEvidence,
  subjectText: string,
): Promise<{score: CorrectionSubmissionScore; output: Record<string, unknown>}> {
  const submissionText = evidence.content ?? '';
  const prompt = buildScoringPrompt(ctx.criteria, subjectText, submissionText);

  const raw = await chat({
    messages: [
      {role: 'system', content: SCORING_SYSTEM_PROMPT},
      {role: 'user', content: prompt},
    ],
    userId: ctx.ownerId,
    task: 'criterion_analysis',
  });

  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('llm_response_not_parsable');
  }

  const score = parsed as CorrectionSubmissionScore;
  if (!Array.isArray(score.criterion_scores) || score.criterion_scores.length !== ctx.criteria.length) {
    throw new Error('llm_response_mismatched_criteria');
  }

  for (const cs of score.criterion_scores) {
    const criterion = ctx.criteria.find((c) => c.criterion_id === cs.criterion_id);
    if (!criterion) throw new Error(`criterion_not_in_rubric: ${cs.criterion_id}`);
    if (cs.max_points !== criterion.max_points) throw new Error(`criterion_max_points_mismatch`);
  }

  const reviewReasons = new Set<string>(score.review_reasons ?? []);
  for (const cs of score.criterion_scores) {
    if (cs.confidence < 0.7) {
      reviewReasons.add(`confiance_faible:${cs.criterion_id}`);
    }
    for (const signal of cs.signals) {
      if (signal.type.startsWith('red_flag_')) {
        reviewReasons.add(`signal_rouge:${signal.type}`);
      }
    }
  }

  score.review_reasons = [...reviewReasons];

  return {
    score,
    output: {
      submission_id: evidence.id,
      criterion_count: score.criterion_scores.length,
      total_score: score.total_score,
      feedback_tone: score.feedback_tone,
      review_reasons: score.review_reasons,
    },
  };
}

function persistScore(
  ctx: CorrectionContext,
  evidence: SubmissionEvidence,
  score: CorrectionSubmissionScore,
  runId: string,
): void {
  const now = Date.now();
  const criterionScoreRefs: string[] = [];

  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO pre_correction_runs
         (id, manifest_id, batch_id, submission_id, owner_id, project_id, project_scope,
          rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
          context_snapshot_id, method_version, model_profile_ref, criterion_score_refs_json,
          review_reasons_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_review', ?, ?)`,
    ).run(
      runId,
      ctx.manifestId,
      ctx.batchId,
      evidence.id,
      ctx.ownerId,
      ctx.projectId,
      ctx.projectScope,
      ctx.rubricVersionId,
      ctx.gradingProfileId,
      ANALYSIS_TYPE,
      evidence.id,
      ctx.contextSnapshotId,
      CORRECTION_RUNNER_VERSION,
      null,
      JSON.stringify(criterionScoreRefs),
      JSON.stringify(score.review_reasons),
      now,
      now,
    );

    const insertDraft = db.prepare(
      `INSERT INTO criterion_score_drafts
         (id, run_id, submission_id, rubric_version_id, criterion_id, draft_score,
          max_points, evidence_refs_json, confidence, comment_ref, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?)`,
    );

    for (const cs of score.criterion_scores) {
      const draftId = uuid();
      criterionScoreRefs.push(draftId);
      insertDraft.run(
        draftId,
        runId,
        evidence.id,
        ctx.rubricVersionId,
        cs.criterion_id,
        cs.draft_score,
        cs.max_points,
        JSON.stringify([cs.evidence]),
        cs.confidence,
        null,
        now,
      );
    }

    db.prepare(
      `UPDATE pre_correction_runs SET criterion_score_refs_json = ? WHERE id = ?`,
    ).run(JSON.stringify(criterionScoreRefs), runId);
  })();
}

const ERROR_REDACT =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization|bearer\s+\S+)/gi;

function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(ERROR_REDACT, '[redacted]').slice(0, 300).trim() || 'correction_runner_failed';
}

function readJobSubjectText(job: Job): string {
  const payload = job.payload as {subject_text?: unknown};
  return typeof payload.subject_text === 'string' ? payload.subject_text : '';
}

export interface ProcessCorrectionDeps {
  runnerId: string;
  leaseMs?: number;
  claim?: (runnerId: string, types: JobType[], leaseMs?: number) => Job | null;
  subjectText?: (job: Job) => string;
}

export type ProcessCorrectionResult =
  | {status: 'idle'}
  | {status: 'processed'; jobId: string; submissionCount: number}
  | {status: 'failed'; jobId: string; error: string};

export async function processNextCorrectionJob(deps: ProcessCorrectionDeps): Promise<ProcessCorrectionResult> {
  const leaseMs = deps.leaseMs ?? DEFAULT_LEASE_MS;
  const claim = deps.claim ?? claimNextJob;
  const getSubjectText = deps.subjectText ?? readJobSubjectText;

  const job = claim(deps.runnerId, CORRECTION_JOB_TYPES, leaseMs);
  if (!job) return {status: 'idle'};

  let processedCount = 0;
  try {
    updateJobProgress(job.job_id, 5, deps.runnerId);

    const ctx = loadContext(job);
    const subjectText = getSubjectText(job);

    updateJobProgress(job.job_id, 15, deps.runnerId);
    extendJobLease(job.job_id, deps.runnerId, leaseMs);

    const results: Array<Record<string, unknown>> = [];

    for (let i = 0; i < ctx.submissionIds.length; i++) {
      const submissionId = ctx.submissionIds[i];
      if (!submissionId) continue;

      const evidence = loadSubmissionEvidence(submissionId);
      const progress = 15 + Math.round((70 * (i + 1)) / ctx.submissionIds.length);
      updateJobProgress(job.job_id, progress, deps.runnerId);

      if (i > 0 && i % 3 === 0) {
        extendJobLease(job.job_id, deps.runnerId, leaseMs);
      }

      const {score, output} = await scoreSubmission(ctx, evidence, subjectText);

      const runId = uuid();
      persistScore(ctx, evidence, score, runId);
      processedCount++;
      results.push(output);
    }

    updateJobProgress(job.job_id, 95, deps.runnerId);

    markJobNeedsReview(
      job.job_id,
      {
        submission_count: processedCount,
        results,
        runner_version: CORRECTION_RUNNER_VERSION,
      },
      'correction_scores_require_human_validation',
      deps.runnerId,
    );

    return {status: 'processed', jobId: job.job_id, submissionCount: processedCount};
  } catch (err) {
    const message = sanitizeError(err);
    try {
      failJob(job.job_id, message, undefined, deps.runnerId);
    } catch (failErr) {
      console.warn(`[runner:correction] échec failJob ${job.job_id} :`, (failErr as Error).message);
    }
    return {status: 'failed', jobId: job.job_id, error: message};
  }
}

async function main(): Promise<void> {
  const runnerId = process.env.CORRECTION_RUNNER_ID ?? `correction-runner-${process.pid}`;
  const leaseMs = Number(process.env.CORRECTION_RUNNER_LEASE_MS) || DEFAULT_LEASE_MS;
  const idleIntervalMs = Number(process.env.CORRECTION_RUNNER_POLL_MS) || 3000;

  await startRunnerLoop(
    {
      runnerId,
      runnerFamily: CORRECTION_RUNNER_FAMILY,
      jobTypes: CORRECTION_JOB_TYPES,
      version: CORRECTION_RUNNER_VERSION,
      leaseMs,
      idleIntervalMs,
      hostRef: null,
    },
    async () => {
      const result = await processNextCorrectionJob({runnerId, leaseMs});
      if (result.status === 'processed') {
        console.log(
          `[runner:correction] job ${result.jobId} → needs_review (${result.submissionCount} copie·s)`,
        );
      } else if (result.status === 'failed') {
        console.warn(`[runner:correction] job ${result.jobId} → failed : ${result.error}`);
      }
      return {processed: result.status !== 'idle'};
    },
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error('[runner:correction] arrêt sur erreur fatale :', err);
    process.exit(1);
  });
}
