import {
  EvidenceEventSchema,
  PedagogicalSignalSchema,
  TaskModelProfileSchema,
  TeacherDecisionDeltaSchema,
} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

const evidence = {
  evidence_id: 'evidence-001',
  source_type: 'submission',
  adapter_id: 'ocr-submission-v1',
  owner_id: 'teacher-001',
  project_scope: 'course-001',
  target_refs: ['submission-001'],
  payload_ref: 'storage://evidence/submission-001',
  extraction_confidence: 0.92,
  privacy_level: 'private',
  occurred_at: 1,
  status: 'candidate',
};

describe('contrats evidence, signaux et deltas professeur', () => {
  it('valide une evidence sourcee et bornee', () => {
    expect(EvidenceEventSchema.parse(evidence)).toEqual(evidence);
    expect(EvidenceEventSchema.safeParse({...evidence, extraction_confidence: 1.2}).success).toBe(false);
  });

  it('refuse un signal sans preuve et une confiance invalide', () => {
    const base = {
      signal_id: 'signal-001',
      signal_type: 'confusion',
      level: 'cohort',
      project_scope: 'course-001',
      evidence_refs: ['evidence-001'],
      recurrence: 2,
      contradiction_refs: [],
      confidence: 0.7,
      sensitivity: 'sensitive',
      status: 'hypothesis',
      created_at: 1,
      updated_at: 1,
    };

    expect(PedagogicalSignalSchema.safeParse(base).success).toBe(true);
    expect(PedagogicalSignalSchema.safeParse({...base, evidence_refs: []}).success).toBe(false);
    expect(PedagogicalSignalSchema.safeParse({...base, confidence: -0.1}).success).toBe(false);
  });

  it('conserve la proposition IA et la décision humaine comme références distinctes', () => {
    const base = {
      delta_id: 'delta-001',
      object_type: 'feedback',
      object_ref: 'feedback-001',
      ai_proposal_ref: 'feedback-version-ai',
      human_decision_ref: 'feedback-version-teacher',
      changed_fields: ['observed_issue'],
      reason_code: 'precision',
      free_note_ref: null,
      teacher_id: 'teacher-001',
      context_refs: ['course-001'],
      created_at: 1,
    };

    expect(TeacherDecisionDeltaSchema.safeParse(base).success).toBe(true);
    expect(
      TeacherDecisionDeltaSchema.safeParse({
        ...base,
        human_decision_ref: base.ai_proposal_ref,
      }).success,
    ).toBe(false);
  });

  it('ne rend routable qu un profil de tâche explicitement validé', () => {
    const profile = TaskModelProfileSchema.parse({
      profile_id: 'task-profile-001',
      task: 'rubric_extraction',
      allowed_providers: ['local-bge', 'provider-approved'],
      fallback_order: ['local-bge', 'provider-approved'],
      privacy_mode: 'hybrid',
      max_cost_eur: 0.2,
      max_latency_ms: 30_000,
      status: 'validated',
    });

    expect(profile.status).toBe('validated');
    expect(TaskModelProfileSchema.safeParse({...profile, allowed_providers: []}).success).toBe(false);
  });
});
