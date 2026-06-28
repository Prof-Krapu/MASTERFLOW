import {
  StoryletEvaluationQuerySchema,
  StoryletEvaluationSchema,
  type StoryletDomain,
  type StoryletEvaluation,
  type StoryletEvaluationQuery,
  type StoryletInstance,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {listExperienceEvents} from './experience_fabric.ts';
import {buildNarrativeCanonGraph} from './narrative_canon_graph.ts';
import {searchPrecedentCases} from './precedent_engine.ts';

function instance(input: Omit<StoryletInstance, 'instance_id'> & {id: string}): StoryletInstance {
  return {
    instance_id: `storylet_instance:${input.id}`,
    definition: input.definition,
    readiness: input.readiness,
    reason: input.reason,
    context_refs: input.context_refs,
    expires_at: input.expires_at,
  };
}

function narrativeStorylets(actor: AuthUser, workbenchId: string): StoryletInstance[] {
  const graph = buildNarrativeCanonGraph(actor, {
    workbench_id: workbenchId,
    presentation_mode: 'workshop',
  });
  const items: StoryletInstance[] = [];
  const setup = graph.setup_payoffs[0];
  if (setup && setup.payoff_refs.length > 0) {
    items.push(instance({
      id: `narrative_setup_payoff:${workbenchId}`,
      definition: {
        storylet_id: 'storylet:narrative:setup_payoff_review',
        domain: 'narrative',
        title: 'Relire le setup/payoff',
        description: 'Un payoff existe déjà : MasterFlow peut proposer une revue de continuité avant écriture ou génération.',
        appearance_conditions: ['setup détecté', 'payoff détecté', 'workbench narratif accessible'],
        proposed_action: 'Ouvrir une revue de continuité narrative avant de produire la scène suivante.',
        expected_effects: ['réduire les contradictions', 'éviter les spoilers involontaires'],
        priority: 0.82,
        validation_required: true,
        scope_ref: `story_workbench:${workbenchId}`,
        permission_ref: 'narrative.workbench.read',
        source_refs: [`story_workbench:${workbenchId}`, ...setup.setup_refs, ...setup.payoff_refs].slice(0, 20),
      },
      readiness: 'pending_validation',
      reason: 'La storylet est pertinente mais demande une décision humaine avant action.',
      context_refs: [setup.thread_id],
      expires_at: null,
    }));
  }
  if (graph.diagnostics.contradictions.length > 0) {
    items.push(instance({
      id: `narrative_contradictions:${workbenchId}`,
      definition: {
        storylet_id: 'storylet:narrative:resolve_contradictions',
        domain: 'narrative',
        title: 'Résoudre une contradiction narrative',
        description: 'Le graph contient un fait contradictoire : il faut arbitrer avant de s’en servir.',
        appearance_conditions: ['contradiction détectée', 'canon graph disponible'],
        proposed_action: 'Créer une carte de validation pour arbitrer le fait contradictoire.',
        expected_effects: ['stabiliser le canon', 'éviter une dérive narrative'],
        priority: 0.95,
        validation_required: true,
        scope_ref: `story_workbench:${workbenchId}`,
        permission_ref: 'narrative.workbench.write',
        source_refs: graph.diagnostics.contradictions.slice(0, 20),
      },
      readiness: 'blocked',
      reason: 'Contradiction détectée : aucune action narrative sûre tant que le fait n’est pas arbitré.',
      context_refs: graph.diagnostics.contradictions,
      expires_at: null,
    }));
  }
  return items;
}

function precedentStorylets(actor: AuthUser, projectId?: string): StoryletInstance[] {
  const precedents = searchPrecedentCases(actor, {project_id: projectId, limit: 3});
  if (precedents.length === 0) return [];
  const refs = precedents.map((result) => result.case.case_id);
  return [instance({
    id: `precedents:${projectId ?? actor.id}`,
    definition: {
      storylet_id: 'storylet:precedent:compare_before_plan',
      domain: 'precedent',
      title: 'Comparer avec un précédent',
      description: 'Des cas comparables existent : MasterFlow peut les afficher avant de proposer un nouveau plan.',
      appearance_conditions: ['au moins un précédent disponible', 'scope accessible'],
      proposed_action: 'Afficher les précédents et demander quelle adaptation semble pertinente.',
      expected_effects: ['moins de redémarrage à zéro', 'meilleure continuité de décision'],
      priority: 0.72,
      validation_required: true,
      scope_ref: projectId ? `project:${projectId}` : `user:${actor.id}`,
      permission_ref: 'experience.precedents.read',
      source_refs: refs,
    },
    readiness: 'pending_validation',
    reason: 'Un précédent aide la décision mais ne doit pas être réappliqué automatiquement.',
    context_refs: refs,
    expires_at: null,
  })];
}

function blockerStorylets(actor: AuthUser, projectId?: string): StoryletInstance[] {
  const blockers = listExperienceEvents(actor, {project_id: projectId, limit: 50})
    .filter((event) => event.outcome === 'blocked' || event.outcome === 'failed')
    .slice(0, 5);
  if (blockers.length === 0) return [];
  return [instance({
    id: `blockers:${projectId ?? actor.id}`,
    definition: {
      storylet_id: 'storylet:notification:resolve_blockers',
      domain: 'notification',
      title: 'Traiter les blocages ouverts',
      description: 'Des événements bloqués ou échoués existent dans la timeline : les ignorer créerait de la dette invisible.',
      appearance_conditions: ['événement bloqué ou échoué', 'timeline accessible'],
      proposed_action: 'Afficher les blocages et demander une décision de résolution ou de report.',
      expected_effects: ['réduire la dette invisible', 'clarifier la prochaine action sûre'],
      priority: 0.9,
      validation_required: true,
      scope_ref: projectId ? `project:${projectId}` : `user:${actor.id}`,
      permission_ref: 'experience.timeline.read',
      source_refs: blockers.flatMap((event) => event.source_refs).slice(0, 20),
    },
    readiness: 'blocked',
    reason: 'Un blocage explicite doit être traité avant de promettre une progression fluide.',
    context_refs: blockers.map((event) => event.event_id),
    expires_at: null,
  })];
}

export function evaluateStorylets(actor: AuthUser, input: StoryletEvaluationQuery = {}): StoryletEvaluation {
  const query = StoryletEvaluationQuerySchema.parse(input);
  const allowedDomains = new Set<StoryletDomain>(query.domains ?? []);
  const scopeRefs = [
    query.project_id ? `project:${query.project_id}` : `user:${actor.id}`,
    ...(query.workbench_id ? [`story_workbench:${query.workbench_id}`] : []),
  ];
  const instances = [
    ...(query.workbench_id ? narrativeStorylets(actor, query.workbench_id) : []),
    ...precedentStorylets(actor, query.project_id),
    ...blockerStorylets(actor, query.project_id),
  ]
    .filter((item) => allowedDomains.size === 0 || allowedDomains.has(item.definition.domain))
    .sort((a, b) => b.definition.priority - a.definition.priority || a.instance_id.localeCompare(b.instance_id))
    .slice(0, query.limit);
  return StoryletEvaluationSchema.parse({
    generated_at: Date.now(),
    scope_refs: scopeRefs,
    instances,
    blocked_count: instances.filter((item) => item.readiness === 'blocked').length,
    validation_required_count: instances.filter((item) => item.definition.validation_required).length,
    execution_policy: 'suggest_only',
  });
}
