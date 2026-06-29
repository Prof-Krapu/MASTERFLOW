import {createHash} from 'node:crypto';

import {
  AutonomyCycleQuerySchema,
  AutonomyCycleSchema,
  type AutonomyCycle,
  type AutonomyCycleQuery,
  type AutonomyPlanCandidate,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {
  buildExperienceSnapshot,
  listExperienceEvents,
} from './experience_fabric.ts';
import {searchPrecedentCases} from './precedent_engine.ts';
import {evaluateStorylets} from './storylet_engine.ts';

function planCandidate(
  storylet: ReturnType<typeof evaluateStorylets>['instances'][number],
): AutonomyPlanCandidate {
  return {
    candidate_id: `autonomy_candidate:${storylet.instance_id}`,
    title: storylet.definition.title,
    proposed_action: storylet.definition.proposed_action,
    priority: storylet.definition.priority,
    readiness: storylet.readiness,
    validation_required: storylet.definition.validation_required,
    source_storylet_ref: storylet.instance_id,
    source_refs: [
      ...storylet.definition.source_refs,
      ...storylet.context_refs,
    ].slice(0, 30),
    action_registry_ref: null,
    status: 'proposed',
  };
}

export function buildAutonomyCycle(
  actor: AuthUser,
  input: AutonomyCycleQuery = {},
): AutonomyCycle {
  const query = AutonomyCycleQuerySchema.parse(input);
  const events = listExperienceEvents(actor, {
    project_id: query.project_id,
    limit: 50,
  });
  const snapshot = buildExperienceSnapshot(actor, {
    project_id: query.project_id,
    limit: 200,
  });
  const precedents = searchPrecedentCases(actor, {
    project_id: query.project_id,
    limit: query.limit,
  });
  const storylets = evaluateStorylets(actor, {
    project_id: query.project_id,
    workbench_id: query.workbench_id,
    guided_session_id: query.guided_session_id,
    limit: query.limit,
  });
  const candidates = storylets.instances.map(planCandidate);
  const findings = [
    ...(storylets.blocked_count > 0
      ? [`${storylets.blocked_count} proposition(s) bloquée(s) à résoudre avant exécution.`]
      : []),
    ...(storylets.validation_required_count > 0
      ? [`${storylets.validation_required_count} proposition(s) exigent une validation humaine.`]
      : []),
    ...(precedents.length > 0
      ? [`${precedents.length} précédent(s) comparable(s) sont disponibles pour éclairer le choix.`]
      : []),
    ...(candidates.length === 0
      ? ['Aucune action candidate sûre n’émerge du contexte actuel.']
      : []),
  ];
  const scopeRefs = [
    query.project_id ? `project:${query.project_id}` : `user:${actor.id}`,
    ...(query.workbench_id ? [`story_workbench:${query.workbench_id}`] : []),
    ...(query.guided_session_id ? [`guided_session:${query.guided_session_id}`] : []),
  ];
  const cycleFingerprint = createHash('sha256')
    .update([
      snapshot.fingerprint,
      ...candidates.map((candidate) => candidate.candidate_id),
    ].join('|'))
    .digest('hex');

  return AutonomyCycleSchema.parse({
    cycle_id: `autonomy_cycle:${cycleFingerprint}`,
    generated_at: Date.now(),
    scope_refs: scopeRefs,
    monitor: {
      snapshot,
      event_refs: events.map((event) => event.event_id),
      source_refs: [
        `experience_snapshot:${snapshot.fingerprint}`,
        ...events.flatMap((event) => event.source_refs),
      ].slice(0, 50),
    },
    analyze: {
      blocker_count: storylets.blocked_count,
      validation_required_count: storylets.validation_required_count,
      precedent_count: precedents.length,
      storylet_count: storylets.instances.length,
      findings,
    },
    plan: {
      candidates,
      selected_candidate_id: null,
      selection_policy: 'human_selects',
    },
    execute: {
      status: 'not_executed',
      action_ids: [],
      reason: 'MAPE-K prépare un choix ; seule une décision humaine peut ensuite créer et preflight une Action.',
    },
    knowledge: {
      precedent_refs: precedents.map((precedent) => precedent.case.case_id),
      retention_policy: 'no_automatic_retention',
      result_refs: [],
    },
    human_validation_required: candidates.length > 0,
    execution_policy: 'plan_only',
  });
}
