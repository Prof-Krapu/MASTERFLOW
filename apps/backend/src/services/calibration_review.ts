import {
  CohortCalibrationReviewSchema,
  QualityReviewItemSchema,
  ROLE_RANK,
  type CalibrationPosition,
  type CohortCalibrationReview,
  type QualityReviewItem,
  type QualitySelectionReason,
} from '@masterflow/shared';
import {z} from 'zod';

import {
  getDb,
  type CohortCalibrationReviewRow,
  type QualityReviewItemRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

interface BatchRow {
  id: string;
  owner_id: string;
  project_scope: string;
  grading_profile_id: string;
}

interface GradingProfileRow {
  id: string;
  owner_id: string;
  project_scope: string;
  scale_json: string;
  expected_band_json: string;
  max_global_delta: number;
  protected_thresholds_json: string;
  threshold_crossing_requires_validation: number;
  status: string;
}

interface RunMetricRow {
  run_id: string;
  submission_id: string;
  draft_score: number;
  max_points: number;
  mean_confidence: number;
}

interface RunMetric {
  run_id: string;
  submission_id: string;
  raw_score: number;
  mean_confidence: number;
}

export interface CalibrationReviewBundle {
  review: CohortCalibrationReview;
  sample_items: QualityReviewItem[];
}

export interface CreateCalibrationReviewInput {
  review_id: string;
  batch_id: string;
  max_sample_size: number;
  created_at: number;
}

const GradeBandSchema = z.tuple([z.number(), z.number()]);

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function assertTeacherOwnership(actor: AuthUser, ownerId: string): void {
  if (actor.role === 'teacher' && actor.id !== ownerId) throw new Error('scope_denied');
}

function toReviewDTO(row: CohortCalibrationReviewRow): CohortCalibrationReview {
  return CohortCalibrationReviewSchema.parse({
    review_id: row.id,
    batch_id: row.batch_id,
    owner_id: row.owner_id,
    project_scope: row.project_scope,
    grading_profile_id: row.grading_profile_id,
    method_version: row.method_version,
    statistics: JSON.parse(row.statistics_json) as unknown,
    diagnostic_delta_candidate: row.diagnostic_delta_candidate,
    protected_threshold_crossing_count: row.protected_threshold_crossing_count,
    alert_codes: JSON.parse(row.alert_codes_json) as unknown,
    sample_item_refs: JSON.parse(row.sample_item_refs_json) as unknown,
    status: row.status,
    created_at: row.created_at,
  });
}

function toSampleDTO(row: QualityReviewItemRow): QualityReviewItem {
  return QualityReviewItemSchema.parse({
    item_id: row.id,
    calibration_review_id: row.calibration_review_id,
    run_id: row.run_id,
    submission_id: row.submission_id,
    raw_score: row.raw_score,
    scale: JSON.parse(row.scale_json) as unknown,
    mean_confidence: row.mean_confidence,
    selection_reasons: JSON.parse(row.selection_reasons_json) as unknown,
    status: row.status,
    created_at: row.created_at,
  });
}

/**
 * Produit un diagnostic de cohorte et une file de relecture ciblée.
 *
 * Le delta candidat n'est jamais appliqué. Il représente uniquement la distance
 * bornée vers le bord le plus proche de la bande institutionnelle attendue.
 */
export function createCalibrationReview(
  actor: AuthUser,
  input: CreateCalibrationReviewInput,
): CalibrationReviewBundle {
  requireTeacher(actor);
  if (!input.review_id || !input.batch_id) throw new Error('invalid_calibration_review_input');
  if (!Number.isInteger(input.max_sample_size) || input.max_sample_size < 3 || input.max_sample_size > 20) {
    throw new Error('invalid_sample_size');
  }

  const db = getDb();
  const batch = db
    .prepare('SELECT id, owner_id, project_scope, grading_profile_id FROM correction_batches WHERE id = ?')
    .get(input.batch_id) as BatchRow | undefined;
  if (!batch) throw new Error('correction_batch_not_found');
  assertTeacherOwnership(actor, batch.owner_id);

  const profile = db
    .prepare(
      `SELECT id, owner_id, project_scope, scale_json, expected_band_json,
              max_global_delta, protected_thresholds_json,
              threshold_crossing_requires_validation, status
       FROM institutional_grading_profiles WHERE id = ?`,
    )
    .get(batch.grading_profile_id) as GradingProfileRow | undefined;
  if (!profile || profile.status !== 'validated') throw new Error('grading_profile_not_validated');
  if (profile.owner_id !== batch.owner_id || profile.project_scope !== batch.project_scope) {
    throw new Error('calibration_scope_mismatch');
  }

  const scale = GradeBandSchema.parse(JSON.parse(profile.scale_json));
  const expectedBand = GradeBandSchema.parse(JSON.parse(profile.expected_band_json));
  assertBand(scale, 'invalid_grading_scale');
  assertBand(expectedBand, 'invalid_expected_band');
  if (expectedBand[0] < scale[0] || expectedBand[1] > scale[1]) {
    throw new Error('expected_band_outside_scale');
  }
  const protectedThresholds = z.array(z.number()).parse(
    JSON.parse(profile.protected_thresholds_json),
  );
  const rows = db
    .prepare(
      `SELECT r.id AS run_id, r.submission_id,
              SUM(s.draft_score) AS draft_score,
              SUM(s.max_points) AS max_points,
              AVG(s.confidence) AS mean_confidence
       FROM pre_correction_runs r
       JOIN criterion_score_drafts s ON s.run_id = r.id
       WHERE r.batch_id = ? AND r.status = 'needs_review' AND s.status = 'candidate'
       GROUP BY r.id, r.submission_id
       ORDER BY r.id`,
    )
    .all(batch.id) as RunMetricRow[];
  if (rows.length === 0) throw new Error('no_pre_correction_runs');

  const metrics = rows.map((row) => ({
    run_id: row.run_id,
    submission_id: row.submission_id,
    raw_score: scaleScore(row.draft_score, row.max_points, scale),
    mean_confidence: row.mean_confidence,
  }));
  const scores = metrics.map((metric) => metric.raw_score);
  const mean = average(scores);
  const medianScore = median(scores);
  const standardDeviation = populationStandardDeviation(scores, mean);
  const position = resolvePosition(mean, expectedBand, metrics.length);
  const diagnosticDelta = resolveDiagnosticDelta(
    mean,
    expectedBand,
    profile.max_global_delta,
    position,
  );
  const thresholdCrossingCount =
    diagnosticDelta === null
      ? 0
      : metrics.filter((metric) =>
          protectedThresholds.some((threshold) =>
            crossesThreshold(metric.raw_score, metric.raw_score + diagnosticDelta, threshold),
          ),
        ).length;
  const alertCodes = resolveAlertCodes(
    position,
    thresholdCrossingCount,
    profile.threshold_crossing_requires_validation === 1,
  );
  const selected = selectQualitySample(
    metrics,
    protectedThresholds,
    standardDeviation,
    input.max_sample_size,
  );
  const itemRefs = selected.map(() => uuid());

  const review = CohortCalibrationReviewSchema.parse({
    review_id: input.review_id,
    batch_id: batch.id,
    owner_id: batch.owner_id,
    project_scope: batch.project_scope,
    grading_profile_id: profile.id,
    method_version: 'cohort-quality-review-v1',
    statistics: {
      sample_count: metrics.length,
      scale,
      expected_band: expectedBand,
      mean_raw_score: mean,
      median_raw_score: medianScore,
      min_raw_score: Math.min(...scores),
      max_raw_score: Math.max(...scores),
      standard_deviation: standardDeviation,
      position,
    },
    diagnostic_delta_candidate: diagnosticDelta,
    protected_threshold_crossing_count: thresholdCrossingCount,
    alert_codes: alertCodes,
    sample_item_refs: itemRefs,
    status: 'review_required',
    created_at: input.created_at,
  });
  const sampleItems = selected.map(({metric, reasons}, index) =>
    QualityReviewItemSchema.parse({
      item_id: itemRefs[index],
      calibration_review_id: review.review_id,
      run_id: metric.run_id,
      submission_id: metric.submission_id,
      raw_score: metric.raw_score,
      scale,
      mean_confidence: metric.mean_confidence,
      selection_reasons: reasons,
      status: 'review_required',
      created_at: input.created_at,
    }),
  );

  const save = db.transaction(() => {
    db.prepare(
      `INSERT INTO cohort_calibration_reviews
         (id, batch_id, owner_id, project_scope, grading_profile_id, method_version,
          statistics_json,
          diagnostic_delta_candidate, protected_threshold_crossing_count,
          alert_codes_json, sample_item_refs_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'review_required', ?)`,
    ).run(
      review.review_id,
      review.batch_id,
      review.owner_id,
      review.project_scope,
      review.grading_profile_id,
      review.method_version,
      JSON.stringify(review.statistics),
      review.diagnostic_delta_candidate,
      review.protected_threshold_crossing_count,
      JSON.stringify(review.alert_codes),
      JSON.stringify(review.sample_item_refs),
      review.created_at,
    );
    const insertItem = db.prepare(
      `INSERT INTO quality_review_items
         (id, calibration_review_id, run_id, submission_id, raw_score, scale_json,
          mean_confidence, selection_reasons_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'review_required', ?)`,
    );
    for (const item of sampleItems) {
      insertItem.run(
        item.item_id,
        item.calibration_review_id,
        item.run_id,
        item.submission_id,
        item.raw_score,
        JSON.stringify(item.scale),
        item.mean_confidence,
        JSON.stringify(item.selection_reasons),
        item.created_at,
      );
    }
  });
  save();

  audit({
    event_type: 'calibration.review_created',
    user_id: actor.id,
    scope: batch.project_scope,
    detail: {
      review_id: review.review_id,
      batch_id: batch.id,
      sample_count: metrics.length,
      position,
      alert_codes: alertCodes,
      status: 'review_required',
    },
  });
  return getCalibrationReview(actor, review.review_id);
}

export function getCalibrationReview(
  actor: AuthUser,
  reviewId: string,
): CalibrationReviewBundle {
  requireTeacher(actor);
  const row = getDb()
    .prepare('SELECT * FROM cohort_calibration_reviews WHERE id = ?')
    .get(reviewId) as CohortCalibrationReviewRow | undefined;
  if (!row) throw new Error('calibration_review_not_found');
  assertTeacherOwnership(actor, row.owner_id);
  const items = getDb()
    .prepare('SELECT * FROM quality_review_items WHERE calibration_review_id = ? ORDER BY id')
    .all(reviewId) as QualityReviewItemRow[];
  return {review: toReviewDTO(row), sample_items: items.map(toSampleDTO)};
}

function scaleScore(score: number, maxPoints: number, scale: [number, number]): number {
  if (maxPoints <= 0) throw new Error('invalid_run_score_total');
  const [min, max] = scale;
  return min + (score / maxPoints) * (max - min);
}

function assertBand(band: [number, number], error: string): void {
  if (band[0] >= band[1]) throw new Error(error);
}

function average(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) throw new Error('empty_score_set');
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[middle - 1];
  if (lower === undefined) throw new Error('empty_score_set');
  return (lower + upper) / 2;
}

function populationStandardDeviation(values: number[], mean: number): number {
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

function resolvePosition(
  mean: number,
  expectedBand: [number, number],
  sampleCount: number,
): CalibrationPosition {
  if (sampleCount < 3) return 'insufficient_data';
  if (mean < expectedBand[0]) return 'below_expected_band';
  if (mean > expectedBand[1]) return 'above_expected_band';
  return 'within_expected_band';
}

function resolveDiagnosticDelta(
  mean: number,
  expectedBand: [number, number],
  maxGlobalDelta: number,
  position: CalibrationPosition,
): number | null {
  if (position === 'insufficient_data' || position === 'within_expected_band') return null;
  const distance =
    position === 'below_expected_band' ? expectedBand[0] - mean : expectedBand[1] - mean;
  return Math.max(-maxGlobalDelta, Math.min(maxGlobalDelta, distance));
}

function crossesThreshold(before: number, after: number, threshold: number): boolean {
  return (before < threshold && after >= threshold) || (before >= threshold && after < threshold);
}

function resolveAlertCodes(
  position: CalibrationPosition,
  thresholdCrossingCount: number,
  thresholdCrossingRequiresValidation: boolean,
): CohortCalibrationReview['alert_codes'] {
  const alerts: CohortCalibrationReview['alert_codes'] = [];
  if (position === 'insufficient_data') alerts.push('insufficient_sample');
  if (position === 'below_expected_band') alerts.push('cohort_below_expected_band');
  if (position === 'above_expected_band') alerts.push('cohort_above_expected_band');
  if (thresholdCrossingRequiresValidation && thresholdCrossingCount > 0) {
    alerts.push('protected_threshold_crossing');
  }
  return alerts;
}

function selectQualitySample(
  metrics: RunMetric[],
  protectedThresholds: number[],
  standardDeviation: number,
  maxSampleSize: number,
): Array<{metric: RunMetric; reasons: QualitySelectionReason[]}> {
  const reasonsByRun = new Map<string, Set<QualitySelectionReason>>();
  const addReason = (metric: RunMetric, reason: QualitySelectionReason): void => {
    const reasons = reasonsByRun.get(metric.run_id) ?? new Set<QualitySelectionReason>();
    reasons.add(reason);
    reasonsByRun.set(metric.run_id, reasons);
  };
  const sorted = [...metrics].sort((a, b) => a.raw_score - b.raw_score);
  const weakest = sorted[0];
  const strongest = sorted.at(-1);
  if (weakest) addReason(weakest, 'weakest_draft');
  if (strongest) addReason(strongest, 'strongest_draft');

  for (const threshold of protectedThresholds) {
    const closest = [...metrics].sort(
      (a, b) => Math.abs(a.raw_score - threshold) - Math.abs(b.raw_score - threshold),
    )[0];
    if (closest) addReason(closest, 'protected_threshold_boundary');
  }
  const mean = average(metrics.map((metric) => metric.raw_score));
  for (const metric of metrics) {
    if (standardDeviation > 0 && Math.abs(metric.raw_score - mean) >= standardDeviation) {
      addReason(metric, 'statistical_outlier');
    }
    if (metric.mean_confidence < 0.6) addReason(metric, 'low_confidence');
  }

  return metrics
    .filter((metric) => reasonsByRun.has(metric.run_id))
    .sort((a, b) => {
      const reasonDelta =
        (reasonsByRun.get(b.run_id)?.size ?? 0) - (reasonsByRun.get(a.run_id)?.size ?? 0);
      return reasonDelta || a.raw_score - b.raw_score || a.run_id.localeCompare(b.run_id);
    })
    .slice(0, maxSampleSize)
    .map((metric) => ({
      metric,
      reasons: [...(reasonsByRun.get(metric.run_id) ?? [])],
    }));
}
