import {
  DecisionTraceSchema,
  PrecedentCaseSchema,
  PrecedentSearchQuerySchema,
  PrecedentSearchResultSchema,
  type DecisionTrace,
  type DomainEventEnvelope,
  type PrecedentCase,
  type PrecedentCaseSource,
  type PrecedentSearchQuery,
  type PrecedentSearchResult,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listMemoryCards} from './memory_cards.ts';
import {
  assertExperienceScopeAccess,
  listExperienceEvents,
} from './experience_fabric.ts';

interface RoomCheckpointRow {
  id: string;
  room_id: string;
  room_instance_id: string;
  user_id: string;
  project_id: string | null;
  reason: string;
  summary: string;
  active_widgets_json: string;
  active_mode: string;
  decisions_json: string;
  open_loops_json: string;
  resource_refs_json: string;
  next_recommended_action: string | null;
  created_at: number;
}

const CONFIDENCE_WEIGHT = {
  low: 0.05,
  medium: 0.12,
  high: 0.2,
  validated: 0.28,
} as const;

function stableCaseId(sourceKind: PrecedentCaseSource, sourceRef: string): string {
  return `precedent:${sourceKind}:${sourceRef}`;
}

function parseJsonArray(value: string): unknown[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function compactTags(values: Array<string | null | undefined>): string[] {
  return [...new Set(values
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.trim().toLowerCase().replaceAll(/\s+/g, '_'))
    .slice(0, 12))];
}

function eventLesson(event: DomainEventEnvelope): string {
  if (event.outcome === 'completed') return 'Réutilisable comme exemple de séquence aboutie, après validation humaine.';
  if (event.outcome === 'blocked' || event.outcome === 'failed') return 'Utile comme précédent d’alerte : vérifier la cause avant de reproduire la démarche.';
  if (event.outcome === 'rejected') return 'Utile comme précédent de refus : ne pas réappliquer sans nouvelle justification.';
  return 'Utile comme trace de contexte, à adapter avant usage.';
}

function casesFromMemory(actor: AuthUser, projectId?: string): PrecedentCase[] {
  return listMemoryCards(actor, {projectId: projectId ?? null, status: 'active'}).map((card) =>
    PrecedentCaseSchema.parse({
      case_id: stableCaseId('memory_card', card.memory_card_id),
      source_kind: 'memory_card',
      scope: card.scope,
      scope_id: card.project_id ?? card.owner_id,
      project_id: card.project_id ?? null,
      title: `Mémoire ${card.type}`,
      context_summary: card.extracted_signal,
      decision_summary: card.next_action ?? 'Aucune action décidée : utiliser comme signal contextualisé.',
      outcome_summary: card.distilled_value,
      lesson: card.invalidation_rule,
      tags: compactTags([card.type, ...card.affects]),
      confidence: card.confidence,
      status: 'usable',
      source_refs: [`memory_card:${card.memory_card_id}`, card.source_ref],
      event_refs: [],
      requires_human_validation: true,
      created_at: card.created_at,
      updated_at: card.updated_at,
    }),
  );
}

function checkpointRows(actor: AuthUser, projectId?: string): RoomCheckpointRow[] {
  return getDb()
    .prepare(
      `SELECT id, room_id, room_instance_id, user_id, project_id, reason, summary,
              active_widgets_json, active_mode, decisions_json, open_loops_json,
              resource_refs_json, next_recommended_action, created_at
         FROM room_checkpoints
        WHERE user_id = ?
          AND ((? IS NULL AND project_id IS NULL) OR (? IS NOT NULL AND project_id = ?))
        ORDER BY created_at DESC
        LIMIT 80`,
    )
    .all(actor.id, projectId ?? null, projectId ?? null, projectId ?? null) as RoomCheckpointRow[];
}

function casesFromCheckpoint(row: RoomCheckpointRow): PrecedentCase[] {
  const sourceRef = `room_checkpoint:${row.id}`;
  const openLoops = parseJsonArray(row.open_loops_json).slice(0, 3).map(String);
  const resourceRefs = parseJsonArray(row.resource_refs_json).slice(0, 6).map(String);
  const checkpointCase = PrecedentCaseSchema.parse({
    case_id: stableCaseId('room_checkpoint', row.id),
    source_kind: 'room_checkpoint',
    scope: row.project_id ? 'project' : 'user',
    scope_id: row.project_id ?? row.user_id,
    project_id: row.project_id,
    title: `Checkpoint ${row.active_mode}`,
    context_summary: row.summary,
    decision_summary: row.next_recommended_action ?? 'Reprise de contexte sans décision immédiate enregistrée.',
    outcome_summary: openLoops.length > 0 ? `Boucles ouvertes : ${openLoops.join(' · ')}` : 'Aucun blocage ouvert dans ce checkpoint.',
    lesson: 'Reprendre depuis ce checkpoint demande de vérifier les boucles ouvertes et les ressources citées.',
    tags: compactTags(['checkpoint', row.reason, row.active_mode]),
    confidence: 'validated',
    status: 'usable',
    source_refs: [sourceRef, ...resourceRefs],
    event_refs: [],
    requires_human_validation: true,
    created_at: row.created_at,
    updated_at: row.created_at,
  });

  const decisionCases = parseJsonArray(row.decisions_json)
    .map((candidate) => DecisionTraceSchema.safeParse(candidate))
    .filter((parsed): parsed is {success: true; data: DecisionTrace} => parsed.success)
    .map(({data}) => PrecedentCaseSchema.parse({
      case_id: stableCaseId('decision_trace', `${row.id}:${data.decision_id}`),
      source_kind: 'decision_trace',
      scope: row.project_id ? 'project' : 'user',
      scope_id: row.project_id ?? row.user_id,
      project_id: row.project_id,
      title: data.subject,
      context_summary: `Décision ${data.category} extraite du checkpoint ${row.active_mode}.`,
      decision_summary: data.reason,
      outcome_summary: data.selected_option_id
        ? `Option retenue : ${data.selected_option_id}.`
        : `Aucune option retenue ; approbation humaine : ${data.human_approval}.`,
      lesson: 'Ce précédent sert à retrouver une décision comparable, pas à la réappliquer automatiquement.',
      tags: compactTags(['decision', data.category, row.active_mode]),
      confidence: data.confidence >= 0.8 ? 'high' : data.confidence >= 0.5 ? 'medium' : 'low',
      status: data.human_approval === 'approved' || data.human_approval === 'not_required' ? 'usable' : 'candidate',
      source_refs: [sourceRef, ...data.source_refs],
      event_refs: [],
      requires_human_validation: true,
      created_at: row.created_at,
      updated_at: row.created_at,
    }));

  return [checkpointCase, ...decisionCases];
}

function casesFromEvents(actor: AuthUser, projectId?: string): PrecedentCase[] {
  const events = listExperienceEvents(actor, {project_id: projectId, limit: 120});
  return events
    .filter((event) =>
      ['completed', 'blocked', 'failed', 'rejected', 'pending_validation'].includes(event.outcome),
    )
    .map((event) => PrecedentCaseSchema.parse({
      case_id: stableCaseId('domain_event', event.event_id),
      source_kind: 'domain_event',
      scope: event.project_id ? 'project' : 'user',
      scope_id: event.project_id ?? actor.id,
      project_id: event.project_id,
      title: `${event.stream_type} · ${event.event_type}`,
      context_summary: event.summary,
      decision_summary: event.cause_ref ? `Cause enregistrée : ${event.cause_ref}.` : 'Cause non explicite dans l’événement.',
      outcome_summary: `Résultat : ${event.outcome}.`,
      lesson: eventLesson(event),
      tags: compactTags([event.stream_type, event.event_type, event.outcome]),
      confidence: event.confidence === 'validated' ? 'validated' : event.confidence === 'recorded' ? 'high' : 'medium',
      status: event.outcome === 'pending_validation' ? 'candidate' : 'usable',
      source_refs: event.source_refs,
      event_refs: [event.event_id],
      requires_human_validation: true,
      created_at: event.occurred_at,
      updated_at: event.occurred_at,
    }));
}

function allCases(actor: AuthUser, projectId?: string): PrecedentCase[] {
  assertExperienceScopeAccess(actor, projectId);
  return [
    ...casesFromMemory(actor, projectId),
    ...checkpointRows(actor, projectId).flatMap(casesFromCheckpoint),
    ...casesFromEvents(actor, projectId),
  ].sort((a, b) => b.updated_at - a.updated_at || a.case_id.localeCompare(b.case_id));
}

function scoreCase(item: PrecedentCase, query: ReturnType<typeof PrecedentSearchQuerySchema.parse>): PrecedentSearchResult | null {
  const haystack = [
    item.title,
    item.context_summary,
    item.decision_summary,
    item.outcome_summary,
    item.lesson,
    ...item.tags,
  ].join(' ').toLowerCase();
  const reasons: string[] = [];
  let score = 0.16 + CONFIDENCE_WEIGHT[item.confidence];

  if (item.status === 'usable') score += 0.08;
  if (item.source_kind === 'decision_trace') score += 0.04;

  const tokens = query.q?.toLowerCase().split(/\s+/).filter((token) => token.length > 2).slice(0, 8) ?? [];
  const tokenHits = tokens.filter((token) => haystack.includes(token));
  if (tokens.length > 0) {
    if (tokenHits.length === 0) return null;
    score += Math.min(0.4, tokenHits.length * 0.08);
    reasons.push(`mots-clés : ${tokenHits.join(', ')}`);
  }

  const wantedTags = query.tags?.map((tag) => tag.toLowerCase().replaceAll(/\s+/g, '_')) ?? [];
  const tagHits = wantedTags.filter((tag) => item.tags.includes(tag));
  if (wantedTags.length > 0) {
    if (tagHits.length === 0) return null;
    score += Math.min(0.24, tagHits.length * 0.08);
    reasons.push(`tags : ${tagHits.join(', ')}`);
  }

  if (reasons.length === 0) reasons.push('cas disponible dans le scope demandé');
  if (item.status === 'candidate') reasons.push('validation humaine requise avant réutilisation');

  return PrecedentSearchResultSchema.parse({
    case: item,
    relevance_score: Math.min(1, Number(score.toFixed(3))),
    match_reasons: reasons.slice(0, 6),
    adaptation_note: 'Retrouver, adapter, faire valider, puis seulement retenir : aucune réutilisation automatique.',
  });
}

export function searchPrecedentCases(
  actor: AuthUser,
  input: PrecedentSearchQuery = {},
): PrecedentSearchResult[] {
  const query = PrecedentSearchQuerySchema.parse(input);
  const sourceKinds = new Set(query.source_kinds ?? []);
  return allCases(actor, query.project_id)
    .filter((item) => query.include_candidates || item.status !== 'candidate')
    .filter((item) => sourceKinds.size === 0 || sourceKinds.has(item.source_kind))
    .map((item) => scoreCase(item, query))
    .filter((item): item is PrecedentSearchResult => item !== null)
    .sort((a, b) => b.relevance_score - a.relevance_score || b.case.updated_at - a.case.updated_at)
    .slice(0, query.limit);
}

export function getPrecedentCase(actor: AuthUser, caseId: string, projectId?: string): PrecedentCase {
  const item = allCases(actor, projectId).find((candidate) => candidate.case_id === caseId);
  if (!item) throw new Error('precedent_not_found');
  return item;
}
