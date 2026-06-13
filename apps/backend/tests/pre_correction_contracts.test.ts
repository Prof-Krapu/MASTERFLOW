import {
  CriterionScoreDraftSchema,
  PreCorrectionRunDraftSchema,
} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

const scoreDraft = {
  draft_id: 'score-draft-clarity',
  run_id: 'pre-correction-run',
  submission_id: 'submission-pre-correction',
  rubric_version_id: 'rubric-pre-correction-v1',
  criterion_id: 'clarity',
  draft_score: 6,
  max_points: 8,
  evidence_refs: ['evidence-pre-correction'],
  confidence: 0.82,
  comment_ref: 'storage://private/comments/clarity',
  status: 'candidate' as const,
  created_at: 1,
};

describe('PR-C3 — contrats de pré-correction explicable', () => {
  it('valide un score brouillon borné, prouvé et candidat', () => {
    expect(CriterionScoreDraftSchema.safeParse(scoreDraft).success).toBe(true);
    expect(
      CriterionScoreDraftSchema.safeParse({...scoreDraft, draft_score: 9}).success,
    ).toBe(false);
    expect(
      CriterionScoreDraftSchema.safeParse({...scoreDraft, evidence_refs: []}).success,
    ).toBe(false);
    expect(
      CriterionScoreDraftSchema.safeParse({...scoreDraft, confidence: 1.1}).success,
    ).toBe(false);
    expect(
      CriterionScoreDraftSchema.safeParse({...scoreDraft, status: 'validated'}).success,
    ).toBe(false);
  });

  it('force le run en needs_review sans champ de note finale', () => {
    const run = {
      run_id: 'pre-correction-run',
      manifest_id: 'manifest-pre-correction',
      batch_id: 'batch-pre-correction',
      submission_id: 'submission-pre-correction',
      owner_id: 'teacher-pre-correction',
      project_scope: 'course-pre-correction',
      rubric_version_id: 'rubric-pre-correction-v1',
      grading_profile_id: 'grading-pre-correction-v1',
      analysis_type: 'rubric_scoring' as const,
      evidence_snapshot_ref: 'storage://private/evidence-snapshots/run',
      method_version: 'criterion-analysis-v1',
      model_profile_ref: null,
      criterion_score_refs: [scoreDraft.draft_id],
      review_reasons: [],
      status: 'needs_review' as const,
      created_at: 1,
      updated_at: 1,
    };

    expect(PreCorrectionRunDraftSchema.safeParse(run).success).toBe(true);
    expect(
      PreCorrectionRunDraftSchema.safeParse({...run, status: 'completed'}).success,
    ).toBe(false);
    expect(
      PreCorrectionRunDraftSchema.safeParse({...run, final_score: 14}).success,
    ).toBe(false);
    expect(Object.keys(PreCorrectionRunDraftSchema.parse(run))).not.toContain('final_score');
  });
});
