import {
  PedagogicalAssistanceDecisionSchema,
  PedagogicalAssistanceInputSchema,
  type PedagogicalAllowedHelp,
  type PedagogicalAssistanceDecision,
  type PedagogicalAssistanceInput,
  type PedagogicalForbiddenOutput,
} from '@masterflow/shared';

const BASE_FORBIDDEN: PedagogicalForbiddenOutput[] = [
  'final_grade',
  'direct_publication',
  'automatic_sanction',
  'permission_bypass',
];

function storylet(mode: string, intent: string): string {
  return `storylet:${mode}:pedagogical_integrity:${intent}`;
}

/**
 * Classe une demande pédagogique sans modifier les permissions ni exécuter d'action.
 * La décision est consommable par Learn, Teaching, Project, Story et les compagnons.
 */
export function classifyPedagogicalAssistance(
  input: PedagogicalAssistanceInput,
): PedagogicalAssistanceDecision {
  const request = PedagogicalAssistanceInputSchema.parse(input);
  const forbidden = new Set<PedagogicalForbiddenOutput>(BASE_FORBIDDEN);
  const allowed = new Set<PedagogicalAllowedHelp>();
  const finalDeliverableRequested =
    request.final_deliverable_requested ||
    request.request_type === 'request_final_deliverable';
  let assistanceKind: PedagogicalAssistanceDecision['assistance_kind'] = 'guide';
  let validationRequired = false;
  let validationReason: string | null = null;
  let safetyStateHint: PedagogicalAssistanceDecision['safety_state_hint'] = 'normal';
  let recommendedStorylet: string | null = null;
  const reasonCodes: string[] = [];

  if (finalDeliverableRequested || request.request_type === 'attempt_circumvention') {
    assistanceKind = 'blocked_integrity';
    allowed.add('explain_method');
    allowed.add('ask_guiding_questions');
    allowed.add('provide_checklist');
    forbidden.add('ready_to_submit_deliverable');
    safetyStateHint = request.circumvention_count >= 2 ? 'suspicious' : 'recadrage';
    recommendedStorylet = storylet(request.active_mode, 'reframe_final_deliverable');
    reasonCodes.push(
      finalDeliverableRequested ? 'final_deliverable_requested' : 'circumvention_detected',
    );
    if (request.circumvention_count >= 2) reasonCodes.push('repeated_circumvention');
  } else if (request.request_type === 'understand_concept') {
    assistanceKind = 'explain';
    allowed.add('explain_concept');
    allowed.add('provide_example');
    allowed.add('ask_guiding_questions');
    recommendedStorylet = storylet(request.active_mode, 'check_understanding');
    reasonCodes.push('concept_explanation_allowed');
  } else if (request.request_type === 'advance_project') {
    assistanceKind = 'coach';
    allowed.add('ask_guiding_questions');
    allowed.add('provide_checklist');
    allowed.add('propose_next_step');
    forbidden.add('ready_to_submit_deliverable');
    recommendedStorylet = storylet(request.active_mode, 'guided_next_step');
    reasonCodes.push('project_coaching_without_substitution');
  } else if (request.request_type === 'review_user_work') {
    assistanceKind = 'review';
    allowed.add('review_user_work');
    allowed.add('explain_method');
    allowed.add('ask_guiding_questions');
    forbidden.add('ready_to_submit_deliverable');
    recommendedStorylet = storylet(request.active_mode, 'review_user_work');
    reasonCodes.push('review_without_substitution');
  } else if (request.request_type === 'correct_or_evaluate') {
    assistanceKind = 'candidate_output';
    allowed.add('review_user_work');
    allowed.add('propose_candidate_feedback');
    allowed.add('explain_method');
    validationRequired = true;
    validationReason = 'La correction reste candidate jusqu’à validation pédagogique humaine.';
    recommendedStorylet = storylet(request.active_mode, 'review_candidate_feedback');
    reasonCodes.push('teacher_validation_required');
  } else if (request.request_type === 'frame_subject') {
    const canProposeSubject = request.role !== 'student';
    assistanceKind = canProposeSubject ? 'candidate_output' : 'guide';
    allowed.add('ask_guiding_questions');
    allowed.add('provide_checklist');
    allowed.add('propose_next_step');
    forbidden.add('ready_to_submit_deliverable');
    validationRequired = canProposeSubject;
    validationReason = canProposeSubject
      ? 'Le cadrage du sujet reste candidat jusqu’à validation explicite.'
      : null;
    recommendedStorylet = storylet(request.active_mode, 'frame_subject_safely');
    reasonCodes.push(
      canProposeSubject ? 'subject_candidate_requires_validation' : 'student_guidance_only',
    );
  } else {
    assistanceKind = 'guide';
    forbidden.add('invented_source');
    forbidden.add('forced_autoplay');
    if (request.source_state === 'validated') {
      allowed.add('recommend_validated_resource');
      if (request.resource_timecode_requested) allowed.add('include_video_timecode');
      reasonCodes.push('validated_resource_only');
    } else {
      allowed.add('propose_resource_candidate');
      validationRequired = true;
      validationReason =
        'La ressource doit être vérifiée avant d’être présentée comme fiable.';
      reasonCodes.push(
        request.source_state === 'missing' ? 'resource_source_missing' : 'resource_candidate',
      );
    }
    recommendedStorylet = storylet(request.active_mode, 'review_learning_resource');
  }

  const sourcePolicy =
    request.request_type !== 'request_learning_resource'
      ? 'not_applicable'
      : request.source_state === 'validated'
        ? 'validated_only'
        : 'candidate_needs_validation';

  return PedagogicalAssistanceDecisionSchema.parse({
    assistance_kind: assistanceKind,
    allowed_help: [...allowed],
    forbidden_outputs: [...forbidden],
    validation_required: validationRequired,
    validation_reason: validationReason,
    safety_state_hint: safetyStateHint,
    recommended_storylet: recommendedStorylet,
    reason_codes: reasonCodes,
    source_policy: sourcePolicy,
    permissions_unchanged: true,
    automatic_sanction: false,
    final_publication_allowed: false,
  });
}
