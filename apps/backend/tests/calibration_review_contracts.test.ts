import {
  CohortCalibrationReviewSchema,
  QualityReviewItemSchema,
} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

describe('PR-C4 — contrats calibration et contrôle qualité', () => {
  it('garde le diagnostic en review sans note finale ni delta appliqué', () => {
    const review = {
      review_id: 'calibration-review-contract',
      batch_id: 'batch-contract',
      owner_id: 'teacher-contract',
      project_id: 'project-contract',
      project_scope: 'project-contract',
      grading_profile_id: 'grading-contract',
      method_version: 'cohort-quality-review-v1',
      statistics: {
        sample_count: 4,
        scale: [0, 20],
        expected_band: [13, 14],
        mean_raw_score: 9.675,
        median_raw_score: 9.85,
        min_raw_score: 8,
        max_raw_score: 11,
        standard_deviation: 1.1,
        position: 'below_expected_band' as const,
      },
      diagnostic_delta_candidate: 1,
      protected_threshold_crossing_count: 1,
      alert_codes: [
        'cohort_below_expected_band',
        'protected_threshold_crossing',
      ] as const,
      sample_item_refs: ['quality-item-contract'],
      status: 'review_required' as const,
      created_at: 1,
    };

    expect(CohortCalibrationReviewSchema.safeParse(review).success).toBe(true);
    expect(
      CohortCalibrationReviewSchema.safeParse({...review, status: 'validated'}).success,
    ).toBe(false);
    expect(
      CohortCalibrationReviewSchema.safeParse({...review, final_score: 12}).success,
    ).toBe(false);
    expect(
      CohortCalibrationReviewSchema.safeParse({...review, applied_delta: 1}).success,
    ).toBe(false);
  });

  it('sélectionne un brouillon à relire sans étiquette étudiante persistante', () => {
    const item = {
      item_id: 'quality-item-contract',
      calibration_review_id: 'calibration-review-contract',
      run_id: 'run-contract',
      submission_id: 'submission-contract',
      raw_score: 9.5,
      scale: [0, 20],
      mean_confidence: 0.55,
      selection_reasons: ['low_confidence', 'protected_threshold_boundary'] as const,
      status: 'review_required' as const,
      created_at: 1,
    };

    expect(QualityReviewItemSchema.safeParse(item).success).toBe(true);
    expect(
      QualityReviewItemSchema.safeParse({...item, student_label: 'weak_student'}).success,
    ).toBe(false);
  });
});
