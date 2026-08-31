import {
  ConversationTurnPlanSchema,
  ConversationTurnRequestSchema,
  ROLE_RANK,
  type ConversationTurnPlan,
  type ConversationTurnRequest,
  type ConversationTurnRoute,
  type PedagogicalAssistanceRequestType,
  type PedagogicalSourceState,
  type RuntimePackManifest,
} from '@masterflow/shared';

import {getDb, type RoomRow} from '../db/schema.ts';
import {getRegistryEntry, isSensitive} from '../engines/action_registry.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {compileRuntimeContext} from './context_compiler.ts';
import {classifyPedagogicalAssistance} from './pedagogical_integrity.ts';
import {diagnoseProcessActivation} from './process_activation.ts';
import {getOwnedAccessibleRoomInstance} from './room_access.ts';
import {getRuntimePack} from './runtime_pack_registry.ts';
import {recordWorkflowEvent} from './workflow_observability.ts';

type SourceRole = 'student' | 'teacher' | 'team' | 'shared';

interface ScopedSources {
  accepted: string[];
  rejected: Array<{source_ref: string; reason: string}>;
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function inferRequestType(content: string): PedagogicalAssistanceRequestType {
  const signal = normalize(content);
  if (/\b(ignore|contourne|oublie)\b.{0,30}\b(regle|consigne|interdit|garde-fou)\b/.test(signal)) {
    return 'attempt_circumvention';
  }
  if (
    /\b(livrable final|rendu final|a ma place|pret a rendre|redige tout|fais tout|produis tout)\b/.test(signal)
  ) {
    return 'request_final_deliverable';
  }
  if (/\b(corrige|correction|evalue|evaluation|note|feedback)\b/.test(signal)) {
    return 'correct_or_evaluate';
  }
  if (/\b(ressource|source|video|tutoriel|cours)\b/.test(signal)) {
    return 'request_learning_resource';
  }
  if (/\b(relis|revue|review|voici mon|mon travail|ma proposition)\b/.test(signal)) {
    return 'review_user_work';
  }
  if (/\b(sujet|brief|cadrage)\b/.test(signal)) return 'frame_subject';
  if (/\b(explique|comprendre|definition|pourquoi|comment fonctionne)\b/.test(signal)) {
    return 'understand_concept';
  }
  return 'advance_project';
}

function actorSourceRoles(actor: AuthUser): Set<SourceRole> {
  if (actor.role === 'student') return new Set(['student', 'shared']);
  if (actor.role === 'teacher') return new Set(['student', 'teacher', 'shared']);
  return new Set(['student', 'teacher', 'team', 'shared']);
}

function scopeSourceRefs(
  actor: AuthUser,
  pack: RuntimePackManifest,
  sourceRefs: string[],
  projectId: string | null,
): ScopedSources {
  const pilot = pack.pilot_scope;
  if (!pilot) return {accepted: [...new Set(sourceRefs)], rejected: []};
  const accepted: string[] = [];
  const rejected: ScopedSources['rejected'] = [];
  const actorRoles = actorSourceRoles(actor);
  const packRoles = new Set<SourceRole>(pilot.allowed_source_roles);

  for (const sourceRef of [...new Set(sourceRefs)]) {
    const [namespace, role] = sourceRef.split(':', 3);
    if (namespace !== pilot.source_namespace) {
      rejected.push({source_ref: sourceRef, reason: 'runtime_pack_source_namespace_mismatch'});
      continue;
    }
    if (!role || !packRoles.has(role as SourceRole)) {
      rejected.push({source_ref: sourceRef, reason: 'source_role_not_declared_by_pack'});
      continue;
    }
    if (!actorRoles.has(role as SourceRole)) {
      rejected.push({source_ref: sourceRef, reason: 'source_role_not_visible_to_actor'});
      continue;
    }
    if (!projectId || getDb()
      .prepare(
        `SELECT 1 AS hit FROM source_intake_records
         WHERE runtime_pack_id = ? AND project_id = ? AND source_ref = ?
           AND status IN ('candidate','validated')`,
      )
      .get(pack.pack_id, projectId, sourceRef) === undefined) {
      rejected.push({source_ref: sourceRef, reason: 'source_not_registered'});
      continue;
    }
    accepted.push(sourceRef);
  }
  return {accepted, rejected};
}

function parseRoomPackIds(room: RoomRow): string[] {
  if (!room.context_json) return [];
  try {
    const parsed = JSON.parse(room.context_json) as {runtime_pack_ids?: unknown};
    return Array.isArray(parsed.runtime_pack_ids)
      ? parsed.runtime_pack_ids.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function assertPackAccess(actor: AuthUser, pack: RuntimePackManifest, room: RoomRow): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK[pack.minimum_role]) {
    throw new Error('runtime_pack_role_denied');
  }
  if (pack.status === 'future' || pack.status === 'blocked') {
    throw new Error('runtime_pack_not_runnable');
  }
  if (pack.pilot_scope && !parseRoomPackIds(room).includes(pack.pack_id)) {
    throw new Error('runtime_pack_not_allowed_in_room');
  }
}

function isAmbiguous(content: string): boolean {
  const signal = normalize(content).trim();
  return signal.length < 4 || /^(continue|vas-y|go|fais ca|aide-moi|et maintenant)[.!? ]*$/.test(signal);
}

function responseFor(route: ConversationTurnRoute, pack: RuntimePackManifest): string {
  switch (route) {
    case 'clarify':
      return 'Demander une précision courte sur l’objectif, l’étape ou la source avant de poursuivre.';
    case 'await_approval':
      return 'Expliquer que l’action est préparée mais suspendue jusqu’à validation humaine explicite.';
    case 'escalate':
      return 'Expliquer que le scope ou la permission ne permet pas cette action et orienter vers le responsable humain.';
    case 'guide':
      return pack.pilot_scope?.final_deliverable_policy === 'guide_only'
        ? 'Guider par questions, méthode, checklist et prochaine étape ; ne jamais produire le livrable final à la place de l’étudiant.'
        : 'Proposer une aide bornée, sourcée et réversible.';
    case 'prepare_action':
      return 'Présenter l’action candidate, son effet et son prochain preflight sans l’exécuter.';
    case 'answer':
      return 'Répondre simplement à la question, citer les sources disponibles et signaler toute incertitude.';
    default:
      return 'Rester dans le scope du pack, citer les preuves et ne déclencher aucune action implicite.';
  }
}

/**
 * Compose un tour de conversation gouverné. Cette fonction planifie et trace ; elle ne valide,
 * n'exécute et ne publie jamais une action sensible.
 */
export function orchestrateConversationTurn(
  actor: AuthUser,
  input: ConversationTurnRequest,
): ConversationTurnPlan {
  const request = ConversationTurnRequestSchema.parse(input);
  const instance = getOwnedAccessibleRoomInstance(actor, request.room_instance_id);
  if (!instance) throw new Error('room_instance_not_found');
  const room = getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(instance.room_id) as
    | RoomRow
    | undefined;
  if (!room) throw new Error('room_not_found');

  const pack = getRuntimePack(request.runtime_pack_id);
  if (!pack) throw new Error('runtime_pack_not_found');
  assertPackAccess(actor, pack, room);

  const limits = pack.pilot_scope?.execution_limits ?? {
    max_turns_per_hour: 30,
    max_tool_calls_per_turn: 0,
    max_output_tokens: 800,
    timeout_ms: 30_000,
    max_cost_eur_per_turn: 0.2,
    fallback: 'static_guidance' as const,
  };
  const turnWindowStart = Date.now() - 60 * 60 * 1_000;
  const priorTurns = getDb()
    .prepare(
      `SELECT COUNT(*) AS count FROM workflow_events
       WHERE owner_id = ? AND room_id = ? AND workflow_type = 'conversation_turn'
         AND event_type = 'workflow_started' AND created_at >= ?`,
    )
    .get(actor.id, room.id, turnWindowStart) as {count: number};
  if (priorTurns.count >= limits.max_turns_per_hour) {
    throw new Error('conversation_turn_hourly_limit_reached');
  }

  const workflowId = uuid();
  const turnId = uuid();
  const createdAt = Date.now();
  recordWorkflowEvent({
    event_id: uuid(),
    workflow_id: workflowId,
    event_type: 'workflow_started',
    workflow_type: 'conversation_turn',
    capability_id: 'conversation_turn_orchestrator',
    owner_id: actor.id,
    project_id: room.project_id,
    room_id: room.id,
    duration_ms: null,
    cost_eur: null,
    tokens: null,
    status: 'started',
    blocker_category: null,
    created_at: createdAt,
  });

  const runtime = compileRuntimeContext(actor, {
    purpose: `conversation:${pack.pack_id}`,
    requested_tier: 'T2',
    room_instance_id: request.room_instance_id,
    rag_query: request.content,
  });
  const sources = scopeSourceRefs(actor, pack, request.source_refs, room.project_id);
  const requestType = inferRequestType(request.content);
  const sourceState: PedagogicalSourceState = requestType === 'request_learning_resource'
    ? sources.accepted.length > 0 ? 'candidate' : 'missing'
    : 'not_applicable';
  const assistance = classifyPedagogicalAssistance({
    role: actor.role,
    active_mode: request.active_mode,
    request_type: requestType,
    final_deliverable_requested: requestType === 'request_final_deliverable',
    source_state: sourceState,
    circumvention_count: request.circumvention_count,
  });
  const process = diagnoseProcessActivation({
    signal: request.content,
    source: 'user_intent',
    active_mode: request.active_mode,
    loaded_context_tier: runtime.trace.granted_tier,
  });

  const actionEntry = request.requested_action_id
    ? getRegistryEntry(request.requested_action_id)
    : null;
  const actionAllowed = actionEntry
    ? actionEntry.status === 'live' && runtime.allowed_action_ids.includes(actionEntry.action_id)
    : false;
  const validationRequired = actionEntry
    ? actionEntry.validation_required !== false || actionEntry.preflight_required || isSensitive(actionEntry)
    : false;

  let route: ConversationTurnRoute = 'guide';
  let confidence = 0.86;
  let clarificationQuestion: string | null = null;
  if (sources.rejected.length > 0 && sources.accepted.length === 0) {
    route = 'clarify';
    confidence = 0.99;
    clarificationQuestion = 'Quelle source autorisée de ce pilote veux-tu utiliser ?';
  } else if (request.requested_action_id && (!actionEntry || !actionAllowed)) {
    route = 'escalate';
    confidence = 0.99;
  } else if (request.requested_action_id && validationRequired) {
    route = 'await_approval';
    confidence = 0.98;
  } else if (request.requested_action_id) {
    route = 'prepare_action';
    confidence = 0.96;
  } else if (isAmbiguous(request.content)) {
    route = 'clarify';
    confidence = 0.93;
    clarificationQuestion = 'Tu veux avancer sur quelle étape précise et avec quelle source ?';
  } else if (requestType === 'request_learning_resource' && sourceState === 'missing') {
    route = 'clarify';
    confidence = 0.95;
    clarificationQuestion = 'Quelle source validée ou candidate dois-je examiner pour cette demande ?';
  } else if (assistance.assistance_kind === 'blocked_integrity') {
    route = 'guide';
    confidence = 0.99;
  } else if (assistance.validation_required) {
    route = 'propose';
    confidence = 0.92;
  } else if (requestType === 'understand_concept') {
    route = 'answer';
    confidence = 0.94;
  }

  const responsePolicy = route === 'await_approval'
    ? 'hold_for_approval'
    : route === 'clarify' || route === 'escalate'
      ? 'static_guidance'
      : 'stream_llm';
  const blocked = route === 'await_approval' || route === 'escalate';
  const trace: ConversationTurnPlan['trace'] = [
    {stage: 'authentication_scope', status: 'passed', evidence: [`actor:${actor.id}`, `room:${room.id}`]},
    {stage: 'context_compiler', status: 'passed', evidence: [`tier:${runtime.trace.granted_tier}`, `refs:${runtime.trace.budget.used_refs}`]},
    {stage: 'runtime_pack', status: sources.rejected.length > 0 ? 'limited' : 'passed', evidence: [`pack:${pack.pack_id}`, `namespace:${pack.pilot_scope?.source_namespace ?? 'shared'}`]},
    {stage: 'process_activation', status: process.status === 'missing_context' ? 'limited' : 'passed', evidence: [`status:${process.status}`, `confidence:${process.confidence}`]},
    {stage: 'soft_routing', status: route === 'clarify' ? 'limited' : 'passed', evidence: [`route:${route}`, `confidence:${confidence}`]},
    {stage: 'pedagogical_integrity', status: assistance.assistance_kind === 'blocked_integrity' ? 'limited' : 'passed', evidence: assistance.reason_codes},
    {stage: 'permissions', status: request.requested_action_id && !actionAllowed ? 'blocked' : 'passed', evidence: [`role:${actor.role}`, `action_allowed:${actionAllowed}`]},
    {stage: 'action_registry', status: request.requested_action_id && !actionEntry ? 'blocked' : 'passed', evidence: [actionEntry ? `action:${actionEntry.action_id}` : 'no_action_requested']},
    {stage: 'bounded_capability', status: blocked ? 'blocked' : 'passed', evidence: [`response_policy:${responsePolicy}`]},
    {stage: 'validation', status: route === 'await_approval' ? 'pending' : 'passed', evidence: [`required:${validationRequired || assistance.validation_required}`]},
    {stage: 'workflow_observability', status: 'passed', evidence: [`workflow:${workflowId}`]},
  ];

  const plan = ConversationTurnPlanSchema.parse({
    turn_id: turnId,
    workflow_id: workflowId,
    runtime_pack_id: pack.pack_id,
    pilot_id: pack.pilot_scope?.pilot_id ?? null,
    source_namespace: pack.pilot_scope?.source_namespace ?? null,
    route,
    confidence,
    clarification_question: clarificationQuestion,
    response_policy: responsePolicy,
    response_guidance: responseFor(route, pack),
    action_candidate: actionEntry
      ? {
          action_id: actionEntry.action_id,
          risk_level: actionEntry.risk_level,
          validation_required: validationRequired,
        }
      : null,
    execution_budget: {
      max_turns_per_hour: limits.max_turns_per_hour,
      turns_used_in_window: priorTurns.count + 1,
      max_tool_calls: limits.max_tool_calls_per_turn,
      max_output_tokens: limits.max_output_tokens,
      timeout_ms: limits.timeout_ms,
      max_cost_eur: limits.max_cost_eur_per_turn,
      fallback: limits.fallback,
    },
    assistance,
    scope: {
      user_id: actor.id,
      project_id: runtime.scope.project_id,
      room_id: runtime.scope.room_id,
      room_instance_id: runtime.scope.room_instance_id,
    },
    accepted_source_refs: sources.accepted,
    rejected_source_refs: sources.rejected,
    trace,
    created_at: createdAt,
  });

  recordWorkflowEvent({
    event_id: uuid(),
    workflow_id: workflowId,
    event_type: blocked ? 'workflow_blocked' : 'workflow_completed',
    workflow_type: 'conversation_turn',
    capability_id: 'conversation_turn_orchestrator',
    owner_id: actor.id,
    project_id: room.project_id,
    room_id: room.id,
    duration_ms: Math.max(0, Date.now() - createdAt),
    cost_eur: 0,
    tokens: 0,
    status: blocked ? 'blocked' : 'completed',
    blocker_category: blocked ? route : null,
    created_at: Date.now(),
  });
  return plan;
}
