import {createHash} from 'node:crypto';

import {
  AutonomyCycleQuerySchema,
  BlackboardReportSchema,
  type AutonomyCycle,
  type AutonomyCycleQuery,
  type AutonomyPlanCandidate,
  type BlackboardContribution,
  type BlackboardReport,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {buildAutonomyCycle} from './autonomy_cycle.ts';
import {buildGuidedLivingCompanion} from './living_companion.ts';

function stableId(prefix: string, parts: string[]): string {
  return `${prefix}:${createHash('sha256').update(parts.join('|')).digest('hex')}`;
}

function boundedSourceRefs(...refs: string[][]): string[] {
  return [...new Set(refs.flat().filter(Boolean))].slice(0, 30);
}

function monitorContribution(cycle: AutonomyCycle): BlackboardContribution {
  return {
    contribution_id: stableId('blackboard_contribution:monitor', [cycle.cycle_id]),
    cycle_ref: cycle.cycle_id,
    contributor_ref: 'experience_fabric:monitor',
    contributor_type: 'monitor',
    visibility: 'cycle_private',
    facts: [
      `${cycle.monitor.event_refs.length} événement(s) permissionné(s) lus.`,
      `${cycle.monitor.snapshot.open_blockers.length} blocage(s) ouvert(s) dans le snapshot.`,
      `${cycle.monitor.snapshot.outcome_counts.pending_validation ?? 0} événement(s) en attente de validation.`,
    ],
    proposal: 'Utiliser le snapshot comme état de situation, sans reconstruire le contexte hors permissions.',
    confidence: 0.9,
    risk_notes: [],
    source_refs: boundedSourceRefs(cycle.monitor.source_refs, [`experience_snapshot:${cycle.monitor.snapshot.fingerprint}`]),
    status: 'candidate',
  };
}

function storyletContribution(cycle: AutonomyCycle, candidate: AutonomyPlanCandidate): BlackboardContribution {
  return {
    contribution_id: stableId('blackboard_contribution:storylet', [
      cycle.cycle_id,
      candidate.candidate_id,
    ]),
    cycle_ref: cycle.cycle_id,
    contributor_ref: `storylet:${candidate.source_storylet_ref}`,
    contributor_type: 'storylet',
    visibility: 'cycle_private',
    facts: [
      `Storylet candidate : ${candidate.title}.`,
      `Readiness : ${candidate.readiness}.`,
      `Priorité : ${candidate.priority.toFixed(2)}.`,
    ],
    proposal: candidate.proposed_action,
    confidence: Math.max(0.1, Math.min(0.95, candidate.priority)),
    risk_notes: [
      ...(candidate.validation_required ? ['Validation humaine obligatoire avant toute transformation en Action.'] : []),
      ...(candidate.readiness === 'blocked' ? ['Contribution bloquée : résoudre la cause avant exécution.'] : []),
    ],
    source_refs: boundedSourceRefs(candidate.source_refs, [candidate.source_storylet_ref]),
    status: 'candidate',
  };
}

function precedentContribution(cycle: AutonomyCycle): BlackboardContribution | null {
  if (cycle.knowledge.precedent_refs.length === 0) return null;
  return {
    contribution_id: stableId('blackboard_contribution:precedent', [
      cycle.cycle_id,
      ...cycle.knowledge.precedent_refs,
    ]),
    cycle_ref: cycle.cycle_id,
    contributor_ref: 'experience_fabric:precedent_engine',
    contributor_type: 'precedent',
    visibility: 'cycle_private',
    facts: [
      `${cycle.knowledge.precedent_refs.length} précédent(s) comparable(s) disponible(s).`,
      'Les précédents éclairent le choix mais ne sont jamais réappliqués automatiquement.',
    ],
    proposal: 'Comparer les cas proches avant de sélectionner une action candidate.',
    confidence: 0.75,
    risk_notes: ['Un précédent n’est pas une preuve de bonne décision dans le contexte actuel.'],
    source_refs: boundedSourceRefs(cycle.knowledge.precedent_refs),
    status: 'candidate',
  };
}

function guardrailContribution(cycle: AutonomyCycle): BlackboardContribution | null {
  if (cycle.analyze.findings.length === 0) return null;
  return {
    contribution_id: stableId('blackboard_contribution:guardrail', [
      cycle.cycle_id,
      ...cycle.analyze.findings,
    ]),
    cycle_ref: cycle.cycle_id,
    contributor_ref: 'experience_fabric:guardrail',
    contributor_type: 'guardrail',
    visibility: 'cycle_private',
    facts: cycle.analyze.findings.slice(0, 8),
    proposal: 'Conserver ces alertes comme garde-fous avant toute sélection humaine.',
    confidence: 0.85,
    risk_notes: [
      ...(cycle.analyze.blocker_count > 0 ? ['Au moins un blocage empêche une exécution sûre.'] : []),
      ...(cycle.analyze.validation_required_count > 0 ? ['Une validation humaine est requise.'] : []),
    ],
    source_refs: boundedSourceRefs(cycle.monitor.source_refs, cycle.knowledge.precedent_refs),
    status: 'candidate',
  };
}

function companionContribution(
  actor: AuthUser,
  cycle: AutonomyCycle,
  query: AutonomyCycleQuery,
): BlackboardContribution | null {
  if (!query.guided_session_id) return null;
  const companion = buildGuidedLivingCompanion(actor, query.guided_session_id);
  return {
    contribution_id: stableId('blackboard_contribution:companion', [
      cycle.cycle_id,
      companion.companion_id,
    ]),
    cycle_ref: cycle.cycle_id,
    contributor_ref: companion.companion_id,
    contributor_type: 'companion',
    visibility: 'cycle_private',
    facts: [
      `Compagnon : ${companion.display_name}.`,
      `Readiness : ${companion.readiness}.`,
      `Progression : ${Math.round(companion.progress.completion_ratio * 100)} %.`,
    ],
    proposal: companion.dialogue_bubble,
    confidence: companion.readiness === 'ready' ? 0.8 : companion.readiness === 'limited' ? 0.6 : 0.45,
    risk_notes: [
      ...companion.diagnostics.contradictions.slice(0, 3),
      ...companion.diagnostics.configuration_warnings.slice(0, 3),
    ],
    source_refs: boundedSourceRefs(companion.source_refs),
    status: 'candidate',
  };
}

function summarize(cycle: AutonomyCycle, contributions: BlackboardContribution[]): string {
  if (cycle.plan.candidates.length === 0) {
    return 'Le blackboard confirme qu’aucune action candidate sûre ne ressort du contexte actuel.';
  }
  if (cycle.analyze.blocker_count > 0) {
    return 'Le blackboard recommande de traiter les blocages avant de transformer une proposition en Action.';
  }
  return `Le blackboard consolide ${contributions.length} contribution(s) privée(s) et propose une sélection humaine parmi ${cycle.plan.candidates.length} candidat(s).`;
}

export function buildBlackboardReport(
  actor: AuthUser,
  input: AutonomyCycleQuery = {},
): BlackboardReport {
  const query = AutonomyCycleQuerySchema.parse(input);
  const cycle = buildAutonomyCycle(actor, query);
  const optional = [
    precedentContribution(cycle),
    guardrailContribution(cycle),
    companionContribution(actor, cycle, query),
  ].filter((item): item is BlackboardContribution => item !== null);
  const contributions = [
    monitorContribution(cycle),
    ...cycle.plan.candidates.map((candidate) => storyletContribution(cycle, candidate)),
    ...optional,
  ].slice(0, 40);
  const recommended = cycle.plan.candidates
    .filter((candidate) => candidate.readiness === 'available' || candidate.readiness === 'pending_validation')
    .sort((a, b) => b.priority - a.priority)
    .map((candidate) => candidate.candidate_id)
    .slice(0, 10);

  return BlackboardReportSchema.parse({
    blackboard_id: stableId('blackboard', [
      cycle.cycle_id,
      ...contributions.map((contribution) => contribution.contribution_id),
    ]),
    generated_at: Date.now(),
    cycle_ref: cycle.cycle_id,
    scope_refs: cycle.scope_refs,
    contributions,
    synthesis: {
      speaker_policy: 'single_semantic_spokesperson',
      spokesperson_ref: 'runtime:primary_persona_or_owner_selected_spokesperson',
      summary: summarize(cycle, contributions),
      recommended_candidate_refs: recommended,
      human_validation_required: cycle.human_validation_required,
      execution_policy: 'synthesize_only',
    },
    guardrails: {
      private_contributions: true,
      permissions_unchanged: true,
      no_action_created: true,
      no_multi_spokesperson: true,
      no_automatic_memory_retention: true,
    },
    execution_policy: 'synthesize_only',
  });
}
