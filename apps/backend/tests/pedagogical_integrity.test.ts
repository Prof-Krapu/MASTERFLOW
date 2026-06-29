import {PedagogicalAssistanceInputSchema} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

import {classifyPedagogicalAssistance} from '../src/services/pedagogical_integrity.ts';

const base = {
  role: 'student' as const,
  active_mode: 'learn' as const,
  request_type: 'understand_concept' as const,
};

describe('Learning / Teaching — décision d’intégrité pédagogique', () => {
  it('autorise l’explication d’une notion', () => {
    const decision = classifyPedagogicalAssistance(base);

    expect(decision).toMatchObject({
      assistance_kind: 'explain',
      validation_required: false,
      safety_state_hint: 'normal',
      permissions_unchanged: true,
      automatic_sanction: false,
      final_publication_allowed: false,
    });
    expect(decision.allowed_help).toContain('provide_example');
  });

  it('bloque un rendu complet mais conserve une aide méthodologique', () => {
    const decision = classifyPedagogicalAssistance({
      ...base,
      active_mode: 'project',
      request_type: 'advance_project',
      final_deliverable_requested: true,
    });

    expect(decision.assistance_kind).toBe('blocked_integrity');
    expect(decision.allowed_help).toContain('explain_method');
    expect(decision.forbidden_outputs).toContain('ready_to_submit_deliverable');
    expect(decision.safety_state_hint).toBe('recadrage');
  });

  it('produit une correction candidate sans note ni publication finale', () => {
    const decision = classifyPedagogicalAssistance({
      ...base,
      role: 'teacher',
      active_mode: 'teaching',
      request_type: 'correct_or_evaluate',
    });

    expect(decision.assistance_kind).toBe('candidate_output');
    expect(decision.validation_required).toBe(true);
    expect(decision.allowed_help).toContain('propose_candidate_feedback');
    expect(decision.forbidden_outputs).toEqual(
      expect.arrayContaining(['final_grade', 'direct_publication']),
    );
  });

  it('relit un travail existant sans le remplacer', () => {
    const decision = classifyPedagogicalAssistance({
      ...base,
      active_mode: 'project',
      request_type: 'review_user_work',
    });

    expect(decision.assistance_kind).toBe('review');
    expect(decision.allowed_help).toContain('review_user_work');
    expect(decision.forbidden_outputs).toContain('ready_to_submit_deliverable');
    expect(decision.validation_required).toBe(false);
  });

  it('propose une vidéo validée au bon timecode sans autoplay', () => {
    const decision = classifyPedagogicalAssistance({
      ...base,
      request_type: 'request_learning_resource',
      source_state: 'validated',
      resource_timecode_requested: true,
    });

    expect(decision.allowed_help).toEqual(
      expect.arrayContaining(['recommend_validated_resource', 'include_video_timecode']),
    );
    expect(decision.forbidden_outputs).toContain('forced_autoplay');
    expect(decision.validation_required).toBe(false);
    expect(decision.source_policy).toBe('validated_only');
  });

  it('route une ressource non validée comme candidate à vérifier', () => {
    const decision = classifyPedagogicalAssistance({
      ...base,
      request_type: 'request_learning_resource',
      source_state: 'candidate',
    });

    expect(decision.allowed_help).toContain('propose_resource_candidate');
    expect(decision.validation_required).toBe(true);
    expect(decision.forbidden_outputs).toContain('invented_source');
    expect(decision.source_policy).toBe('candidate_needs_validation');
  });

  it('suggère un état suspicieux après contournements répétés sans sanction', () => {
    const decision = classifyPedagogicalAssistance({
      ...base,
      request_type: 'attempt_circumvention',
      circumvention_count: 2,
    });

    expect(decision.assistance_kind).toBe('blocked_integrity');
    expect(decision.safety_state_hint).toBe('suspicious');
    expect(decision.reason_codes).toContain('repeated_circumvention');
    expect(decision.automatic_sanction).toBe(false);
  });

  it('applique la même politique en Learn et Teaching sans modifier les permissions', () => {
    const learn = classifyPedagogicalAssistance({
      ...base,
      request_type: 'advance_project',
      active_mode: 'learn',
    });
    const teaching = classifyPedagogicalAssistance({
      ...base,
      role: 'teacher',
      request_type: 'advance_project',
      active_mode: 'teaching',
    });

    expect(teaching.assistance_kind).toBe(learn.assistance_kind);
    expect(teaching.allowed_help).toEqual(learn.allowed_help);
    expect(teaching.permissions_unchanged).toBe(true);
  });

  it('refuse les compteurs de contournement invalides', () => {
    expect(PedagogicalAssistanceInputSchema.safeParse({
      ...base,
      circumvention_count: -1,
    }).success).toBe(false);
  });
});
