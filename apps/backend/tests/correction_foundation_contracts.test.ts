import {
  CorrectionBatchSchema,
  InstitutionalGradingProfileSchema,
  PreCorrectionManifestSchema,
  RubricTemplateSchema,
  RubricVersionSchema,
  SubmissionRecordSchema,
} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

const criterionA = {
  criterion_id: 'clarity',
  label: 'Clarté',
  description: 'La proposition est compréhensible et structurée.',
  weight: 0.4,
  max_points: 8,
  evidence_requirements: ['passage_source'],
  required: true,
};
const criterionB = {
  criterion_id: 'quality',
  label: 'Qualité',
  description: 'La réponse satisfait le niveau attendu.',
  weight: 0.6,
  max_points: 12,
  evidence_requirements: ['passage_source'],
  required: true,
};

describe('PR-C1 — contrats de correction versionnée', () => {
  it('valide une rubrique cohérente et refuse poids ou points incohérents', () => {
    const rubric = {
      version_id: 'rubric-v1',
      template_id: 'rubric-template',
      version: 1,
      project_scope: 'course-001',
      criteria: [criterionA, criterionB],
      total_points: 20,
      status: 'draft' as const,
      created_by: 'teacher-001',
      created_at: 1,
    };

    expect(RubricVersionSchema.safeParse(rubric).success).toBe(true);
    expect(
      RubricVersionSchema.safeParse({
        ...rubric,
        criteria: [criterionA, {...criterionB, weight: 0.5}],
      }).success,
    ).toBe(false);
    expect(RubricVersionSchema.safeParse({...rubric, total_points: 18}).success).toBe(false);
  });

  it('borne le profil institutionnel sans imposer une moyenne', () => {
    const profile = {
      profile_id: 'grading-v1',
      owner_id: 'teacher-001',
      project_scope: 'course-001',
      version: 1,
      scale: [0, 20],
      expected_cohort_band: [13, 14],
      anchors: {
        insufficient: [0, 9.99],
        minimum_met: [10, 11.99],
        expected: [12, 14.49],
        strong: [14.5, 16.49],
        exceptional: [16.5, 20],
      },
      calibration_mode: 'diagnostic_then_teacher_validation' as const,
      max_global_delta: 1,
      protected_thresholds: [10],
      threshold_crossing_requires_validation: true,
      status: 'draft' as const,
      created_at: 1,
    };

    expect(InstitutionalGradingProfileSchema.safeParse(profile).success).toBe(true);
    expect(
      InstitutionalGradingProfileSchema.safeParse({
        ...profile,
        anchors: {...profile.anchors, exceptional: [16.5, 21]},
      }).success,
    ).toBe(false);
  });

  it('garde templates, lots et copies privés et versionnés', () => {
    expect(
      RubricTemplateSchema.safeParse({
        template_id: 'rubric-template',
        owner_id: 'teacher-001',
        project_scope: 'course-001',
        title: 'Projet final',
        subject_ref: 'subject-v1',
        current_version_ref: null,
        status: 'draft',
        created_at: 1,
        updated_at: 1,
      }).success,
    ).toBe(true);
    expect(
      CorrectionBatchSchema.safeParse({
        batch_id: 'batch-001',
        owner_id: 'teacher-001',
        project_scope: 'course-001',
        rubric_version_id: 'rubric-v1',
        grading_profile_id: 'grading-v1',
        status: 'draft',
        submission_count: 0,
        created_at: 1,
        updated_at: 1,
      }).success,
    ).toBe(true);
    expect(
      SubmissionRecordSchema.safeParse({
        submission_id: 'submission-001',
        batch_id: 'batch-001',
        owner_id: 'teacher-001',
        project_scope: 'course-001',
        student_ref: null,
        source_evidence_ref: 'evidence-001',
        identity_status: 'unknown',
        status: 'candidate',
        privacy_level: 'private',
        created_at: 1,
        updated_at: 1,
      }).success,
    ).toBe(true);
  });

  it('interdit un manifest utilisable sans validation humaine', () => {
    const manifest = {
      manifest_id: 'manifest-001',
      batch_id: 'batch-001',
      project_scope: 'course-001',
      rubric_version_id: 'rubric-v1',
      grading_profile_id: 'grading-v1',
      submission_refs: ['submission-001'],
      workflow_version: 'corrector-workflow-v1',
      status: 'draft' as const,
      created_by: 'teacher-001',
      validation_ref: null,
      created_at: 1,
    };

    expect(PreCorrectionManifestSchema.safeParse(manifest).success).toBe(true);
    expect(
      PreCorrectionManifestSchema.safeParse({...manifest, status: 'validated'}).success,
    ).toBe(false);
    expect(
      PreCorrectionManifestSchema.safeParse({
        ...manifest,
        status: 'validated',
        validation_ref: 'teacher-validation-001',
      }).success,
    ).toBe(true);
  });
});
