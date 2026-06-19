import {
  ProcessActivationReadModelSchema,
  ProcessActivationRequestSchema,
  type ContextTier,
  type ProcessActivationReadModel,
  type ProcessActivationRequest,
} from '@masterflow/shared';

const TIER_RANK: Record<ContextTier, number> = {T0: 0, T1: 1, T2: 2, T3: 3, T4: 4, T5: 5};

type Rule = {
  patterns: RegExp[];
  domains: string[];
  processId: string;
  label: string;
  runtimeStatus: 'implemented' | 'partial' | 'locked' | 'absent';
  outputFamily: string;
  requiredTier: ContextTier;
  gates: string[];
  blocked: string[];
  route: ProcessActivationReadModel['validation_route_candidate'];
  next: ProcessActivationReadModel['next_safe_action'];
  missed?: ProcessActivationReadModel['missed_trigger_candidate'];
  confidence: number;
  status: ProcessActivationReadModel['status'];
};

const RULES: Rule[] = [
  {
    patterns: [/\b(stop|reset|attends|arrete|ne genere pas)\b/],
    domains: ['D12_AUTONOMY_OBSERVABILITY'],
    processId: 'control_state',
    label: 'Hard stop / no-generation',
    runtimeStatus: 'partial',
    outputFamily: 'no_generation_review',
    requiredTier: 'T1',
    gates: ['priority_interruption', 'action_invalidation'],
    blocked: ['queued_risky_actions', 'provider_generation', 'external_send'],
    route: {target: 'owner_cockpit', object_type: 'control_state', decision_authority: 'owner', decider_role: 'owner', reason: 'Une prévisualisation read-only existe ; l’application du hard stop reste explicite et séparée.'},
    next: {kind: 'inspect_context', label: 'Prévisualiser les actions sensibles à geler', reason: 'Le preview est sans mutation ; le scope de reset doit être confirmé avant application.', required_validation: false, forbidden_followups: ['auto_apply_stop', 'auto_cancel', 'auto_reset']},
    missed: {expected_process: 'hard_stop', missing_runtime_piece: 'control_state_apply_runtime', user_impact: 'La consigne stop peut être prévisualisée mais n’invalide pas encore les actions.', suggested_queue_task: 'Définir la granularité puis appliquer le hard stop explicitement.', severity: 'high'},
    confidence: 0.95,
    status: 'missed_trigger_candidate',
  },
  {
    patterns: [/\b(corrige|correction|feedback|appreciation|note)\b/],
    domains: ['D05_PEDAGOGY', 'D06_CORRECTION_FEEDBACK_EVALUATION'],
    processId: 'd05_d06_correction',
    label: 'Correction et feedback professeur',
    runtimeStatus: 'partial',
    outputFamily: 'correction_feedback',
    requiredTier: 'T2',
    gates: ['source_truth', 'teacher_validation', 'output_readiness'],
    blocked: ['student_send', 'public_export', 'final_grade_write'],
    route: {target: 'shared_validation_inbox', object_type: 'feedback_or_private_preview', decision_authority: 'D06 review authority', decider_role: 'teacher_owner', reason: 'Feedback et preview privée disposent d’autorités réelles.'},
    next: {kind: 'inspect_context', label: 'Vérifier sources, soumission et barème', reason: 'La correction exige un contexte T2 sourcé.', required_validation: false, forbidden_followups: ['student_send', 'final_grade_write']},
    confidence: 0.9,
    status: 'candidate_ready_for_review',
  },
  {
    patterns: [/\b(image|visuel|da|retake|genere)\b/],
    domains: ['D08_DA_VISUAL_ASSETS'],
    processId: 'd08_visual_manifest',
    label: 'Manifest visuel D08',
    runtimeStatus: 'locked',
    outputFamily: 'visual_manifest',
    requiredTier: 'T4',
    gates: ['manifest', 'source_truth', 'no_generation_review', 'storage', 'asset_review'],
    blocked: ['provider_generation', 'image_generation', 'public_export'],
    route: {target: 'action_queue', object_type: 'visual_manifest_candidate', decision_authority: 'D08 owner review', decider_role: 'owner', reason: 'Le manifest doit précéder tout provider.'},
    next: {kind: 'create_spec', label: 'Préparer le manifest et les références', reason: 'Storage, provenance et review ne sont pas complets.', required_validation: false, forbidden_followups: ['provider_generation', 'image_generation']},
    confidence: 0.9,
    status: 'blocked_by_gate',
  },
  {
    patterns: [/\b(devis|budget|prix|tarif)\b/],
    domains: ['D10_EVENTS_QUOTES_PUBLIC_INTAKE'],
    processId: 'd10_private_quote',
    label: 'Brouillon de devis privé',
    runtimeStatus: 'absent',
    outputFamily: 'quote_draft',
    requiredTier: 'T4',
    gates: ['price_source', 'quote_validation', 'send_gate'],
    blocked: ['send_quote', 'invoice_issue', 'public_intake'],
    route: {target: 'action_queue', object_type: 'quote_draft', decision_authority: 'owner', decider_role: 'owner', reason: 'Le runtime devis n’est pas encore implémenté.'},
    next: {kind: 'create_spec', label: 'Préparer un brouillon privé sourcé', reason: 'Aucun runtime D10 dédié n’existe.', required_validation: true, forbidden_followups: ['send_quote', 'invoice_issue']},
    confidence: 0.88,
    status: 'blocked_by_gate',
  },
  {
    patterns: [/\b(canon|canonise|canoniser)\b/],
    domains: ['AUTHORITY_KERNEL'],
    processId: 'canon_candidate',
    label: 'Candidat de delta canon',
    runtimeStatus: 'partial',
    outputFamily: 'canon_delta',
    requiredTier: 'T4',
    gates: ['source_truth', 'owner_validation'],
    blocked: ['direct_canon_write', 'auto_merge'],
    route: {target: 'shared_validation_inbox', object_type: 'canon_delta', decision_authority: 'MALEX owner validation', decider_role: 'owner', reason: 'Une proposition canon reste candidate jusqu’à décision.'},
    next: {kind: 'route_to_validation_inbox', label: 'Préparer un delta canon candidat', reason: 'Le Drive ne doit jamais être modifié automatiquement.', required_validation: true, forbidden_followups: ['direct_canon_write']},
    confidence: 0.9,
    status: 'candidate_ready_for_review',
  },
  {
    patterns: [/\b(echec|echoue|rate|regle)\b/],
    domains: ['D12_AUTONOMY_OBSERVABILITY'],
    processId: 'd12_backflow_finding',
    label: 'Finding D12 candidat',
    runtimeStatus: 'absent',
    outputFamily: 'factory_backflow',
    requiredTier: 'T2',
    gates: ['finding_review', 'owner_review', 'no_auto_fix'],
    blocked: ['auto_patch', 'auto_canon'],
    route: {target: 'action_queue', object_type: 'missed_trigger_candidate', decision_authority: 'owner', decider_role: 'owner', reason: 'Les findings D12 restent observation-only.'},
    next: {kind: 'create_spec', label: 'Consigner l’observation sans auto-fix', reason: 'Le runtime finding n’existe pas encore.', required_validation: false, forbidden_followups: ['auto_patch', 'auto_canon']},
    missed: {expected_process: 'd12_finding', missing_runtime_piece: 'autonomy_finding_runtime', user_impact: 'Le raté ne devient pas encore un objet suivi.', suggested_queue_task: 'Créer une finding observation-only.', severity: 'medium'},
    confidence: 0.82,
    status: 'missed_trigger_candidate',
  },
];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function diagnoseProcessActivation(input: ProcessActivationRequest): ProcessActivationReadModel {
  const request = ProcessActivationRequestSchema.parse(input);
  const normalized = normalize(request.signal);
  const rule = RULES.find((candidate) => candidate.patterns.some((pattern) => pattern.test(normalized)));

  if (!rule) {
    return ProcessActivationReadModelSchema.parse({
      generated_at: Date.now(),
      source: request.source,
      raw_signal_summary: request.signal.slice(0, 240),
      active_mode: request.active_mode,
      detected_domains: [],
      process_candidates: [],
      output_family_candidates: [],
      required_context_tier: 'T1',
      loaded_context_status: {granted_tier: request.loaded_context_tier, sufficient: true, missing: []},
      required_gates: [],
      next_safe_action: {kind: 'park', label: 'Ne rien lancer automatiquement', reason: 'Signal insuffisant pour choisir un processus.', required_validation: false, forbidden_followups: ['auto_route', 'auto_execute']},
      blocked_actions: ['auto_route', 'auto_execute'],
      validation_route_candidate: null,
      missed_trigger_candidate: null,
      confidence: 0.2,
      status: 'diagnostic_only',
      audit_trace: ['deterministic_registry_v1', 'no_persistence', 'no_execution'],
    });
  }

  const sufficient = TIER_RANK[request.loaded_context_tier] >= TIER_RANK[rule.requiredTier];
  return ProcessActivationReadModelSchema.parse({
    generated_at: Date.now(),
    source: request.source,
    raw_signal_summary: request.signal.slice(0, 240),
    active_mode: request.active_mode,
    detected_domains: rule.domains,
    process_candidates: [{process_id: rule.processId, label: rule.label, runtime_status: rule.runtimeStatus}],
    output_family_candidates: [rule.outputFamily],
    required_context_tier: rule.requiredTier,
    loaded_context_status: {
      granted_tier: request.loaded_context_tier,
      sufficient,
      missing: sufficient ? [] : [`context_${rule.requiredTier}_required`],
    },
    required_gates: rule.gates,
    next_safe_action: rule.next,
    blocked_actions: rule.blocked,
    validation_route_candidate: rule.route,
    missed_trigger_candidate: rule.missed ?? null,
    confidence: rule.confidence,
    status: !sufficient && rule.status === 'candidate_ready_for_review' ? 'missing_context' : rule.status,
    audit_trace: ['deterministic_registry_v1', `rule:${rule.processId}`, 'no_persistence', 'no_execution'],
  });
}
