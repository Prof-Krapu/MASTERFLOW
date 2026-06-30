import {
  LivingEntityCodexEntrySchema,
  LivingEntityEvolutionCandidateSchema,
  LivingEntityEvolutionPolicySchema,
  LivingEntityInstanceSchema,
  type LivingEntityCodexEntry,
  type LivingEntityDefinition,
  type LivingEntityEvolutionCandidate,
  type LivingEntityEvolutionPolicy,
  type LivingEntityEvolutionSignal,
  type LivingEntityInstance,
} from '@masterflow/shared';

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function currentOrder(policy: LivingEntityEvolutionPolicy, stageId: string): number {
  return policy.stages.find((stage) => stage.stage_id === stageId)?.order ?? -1;
}

/**
 * Évalue une évolution sans modifier l'instance, générer d'asset ou promouvoir
 * un nouveau canon. Le créateur reste l'unique validateur de la proposition.
 */
export function evaluateLivingEntityEvolution(input: {
  definition: LivingEntityDefinition;
  instance: LivingEntityInstance;
  policy: LivingEntityEvolutionPolicy;
  completion_ratio: number;
  signals: LivingEntityEvolutionSignal[];
  contradiction_refs?: string[];
}): LivingEntityEvolutionCandidate {
  const instance = LivingEntityInstanceSchema.parse(input.instance);
  const policy = LivingEntityEvolutionPolicySchema.parse(input.policy);
  if (instance.definition_ref !== input.definition.definition_id) {
    throw new Error('living_entity_definition_mismatch');
  }
  if (input.definition.evolution_policy_ref !== policy.policy_id) {
    throw new Error('living_entity_policy_mismatch');
  }

  const contradictions = unique(input.contradiction_refs ?? []);
  const signalByMetric = new Map<string, LivingEntityEvolutionSignal>();
  for (const signal of input.signals) {
    const previous = signalByMetric.get(signal.metric_ref);
    if (!previous || signal.observed_at >= previous.observed_at) {
      signalByMetric.set(signal.metric_ref, signal);
    }
  }
  const signalRefs = new Set(input.signals.map((signal) => signal.signal_ref));
  const sortedStages = [...policy.stages].sort((left, right) => left.order - right.order);
  const eligible = sortedStages.filter((stage) =>
    input.completion_ratio >= stage.completion_min &&
    stage.required_signal_refs.every((ref) => signalRefs.has(ref)) &&
    Object.entries(stage.indicator_minimums).every(
      ([metricRef, minimum]) => (signalByMetric.get(metricRef)?.value ?? Number.NEGATIVE_INFINITY) >= minimum,
    ),
  );
  const proposed = eligible.at(-1) ?? sortedStages[0]!;
  const current = policy.stages.find((stage) => stage.stage_id === instance.current_stage_id);
  if (!current) throw new Error('living_entity_current_stage_unknown');

  const missingRequirements = [
    ...(input.completion_ratio < proposed.completion_min
      ? [`completion_ratio>=${proposed.completion_min}`]
      : []),
    ...proposed.required_signal_refs.filter((ref) => !signalRefs.has(ref)).map((ref) => `signal:${ref}`),
    ...Object.entries(proposed.indicator_minimums).flatMap(([metricRef, minimum]) =>
      (signalByMetric.get(metricRef)?.value ?? Number.NEGATIVE_INFINITY) < minimum
        ? [`indicator:${metricRef}>=${minimum}`]
        : [],
    ),
  ];
  const regression = proposed.order < currentOrder(policy, current.stage_id);
  const blocked = contradictions.length > 0 || (regression && !policy.allow_regression);
  const changed = proposed.stage_id !== current.stage_id;
  const readiness = blocked ? 'blocked' : changed ? 'candidate' : 'unchanged';
  const evidenceRefs = unique([
    ...input.signals.map((signal) => signal.source_ref),
    ...contradictions,
    ...proposed.source_refs,
  ]);

  return LivingEntityEvolutionCandidateSchema.parse({
    evaluated_at: Date.now(),
    instance_ref: instance.instance_id,
    current_stage_id: current.stage_id,
    proposed_stage_id: proposed.stage_id,
    readiness,
    reason: blocked
      ? 'Une contradiction ou une régression interdite bloque la proposition ; le moteur conserve le palier actuel.'
      : changed
        ? `Les indicateurs rendent le palier « ${proposed.label} » candidat, sous validation du créateur.`
        : `Le palier « ${current.label} » reste cohérent avec les preuves disponibles.`,
    evidence_refs: evidenceRefs,
    missing_requirements: missingRequirements,
    continuity_locks: policy.immutable_trait_refs,
    visual_layer_refs: proposed.visual_layer_refs,
    dialogue_bubble: blocked
      ? 'Quelque chose ne colle pas encore. Je reste comme je suis tant que le projet ne s’est pas clarifié.'
      : proposed.dialogue_intent,
    creator_validation_required: true,
    generation_allowed: false,
    canon_promotion_allowed: false,
  });
}

export function buildLivingEntityCodexEntry(input: {
  definition: LivingEntityDefinition;
  instance: LivingEntityInstance;
  visibility?: LivingEntityCodexEntry['visibility'];
}): LivingEntityCodexEntry {
  const instance = LivingEntityInstanceSchema.parse(input.instance);
  if (instance.definition_ref !== input.definition.definition_id) {
    throw new Error('living_entity_definition_mismatch');
  }
  return LivingEntityCodexEntrySchema.parse({
    instance_ref: instance.instance_id,
    definition_ref: input.definition.definition_id,
    display_name: instance.display_name,
    kind: input.definition.kind,
    current_stage_id: instance.current_stage_id,
    assignment_scope_refs: instance.assignment_scope_refs,
    lore_summary: input.definition.lore_summary,
    stage_history: instance.stage_history,
    visual_asset_refs: instance.visual_asset_refs,
    visibility: input.visibility ?? 'assigned_scope',
    source_refs: unique([...input.definition.source_refs, ...instance.source_refs]),
  });
}
