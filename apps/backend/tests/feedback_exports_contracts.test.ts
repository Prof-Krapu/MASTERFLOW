import {
  CorrectionExportPreviewSchema,
  FeedbackDraftSchema,
} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

const feedback = {
  feedback_id: 'feedback-contract',
  run_id: 'run-contract',
  submission_id: 'submission-contract',
  owner_id: 'teacher-contract',
  project_scope: 'course-contract',
  method_version: 'student-safe-feedback-v1',
  model_profile_ref: null,
  observed_strength_ref: 'storage://private/feedback/strength',
  observed_issue_ref: 'storage://private/feedback/issue',
  evidence_refs: ['evidence-contract'],
  impact_on_work_ref: 'storage://private/feedback/impact',
  pedagogical_axis_ref: 'storage://private/feedback/axis',
  next_action_ref: 'storage://private/feedback/action',
  validation_criterion_ref: 'storage://private/feedback/criterion',
  tone_level: 'clear' as const,
  evaluation_alignment: 'aligned' as const,
  teacher_validation_required: true as const,
  status: 'needs_teacher_validation' as const,
  validator_id: null,
  validation_ref: null,
  created_at: 1,
  updated_at: 1,
};

describe('PR-C5 — contrats feedback et export', () => {
  it('exige un feedback structuré et une décision humaine cohérente', () => {
    expect(FeedbackDraftSchema.safeParse(feedback).success).toBe(true);
    expect(
      FeedbackDraftSchema.safeParse({...feedback, next_action_ref: ''}).success,
    ).toBe(false);
    expect(
      FeedbackDraftSchema.safeParse({...feedback, teacher_validation_required: false}).success,
    ).toBe(false);
    expect(
      FeedbackDraftSchema.safeParse({...feedback, status: 'approved'}).success,
    ).toBe(false);
    expect(
      FeedbackDraftSchema.safeParse({
        ...feedback,
        status: 'approved',
        validator_id: 'teacher-contract',
        validation_ref: 'feedback-validation-contract',
      }).success,
    ).toBe(true);
  });

  it('interdit qu une preview approuvée devienne une publication', () => {
    const preview = {
      export_id: 'export-contract',
      batch_id: 'batch-contract',
      owner_id: 'teacher-contract',
      project_scope: 'course-contract',
      format: 'xlsx' as const,
      target: 'teacher_download' as const,
      source_feedback_refs: ['feedback-contract'],
      source_run_refs: ['run-contract'],
      preview_ref: 'storage://private/export-previews/export-contract.xlsx',
      schema_version: 'correction-export-v1',
      contains_private_data: true as const,
      publication_allowed: false as const,
      human_validation_required: true as const,
      status: 'needs_teacher_validation' as const,
      validator_id: null,
      validation_ref: null,
      created_at: 1,
      updated_at: 1,
    };

    expect(CorrectionExportPreviewSchema.safeParse(preview).success).toBe(true);
    expect(
      CorrectionExportPreviewSchema.safeParse({...preview, publication_allowed: true}).success,
    ).toBe(false);
    expect(
      CorrectionExportPreviewSchema.safeParse({...preview, status: 'approved_for_export'}).success,
    ).toBe(false);
    expect(
      CorrectionExportPreviewSchema.safeParse({
        ...preview,
        status: 'approved_for_export',
        validator_id: 'teacher-contract',
        validation_ref: 'export-validation-contract',
      }).success,
    ).toBe(true);
  });
});
