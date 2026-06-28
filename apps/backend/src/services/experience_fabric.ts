import {createHash} from 'node:crypto';

import {
  DomainEventEnvelopeSchema,
  DomainEventOutcomeSchema,
  DomainEventStreamSchema,
  ExperienceStateSnapshotSchema,
  ExperienceTimelineQuerySchema,
  type DomainEventEnvelope,
  type DomainEventOutcome,
  type DomainEventStream,
  type ExperienceStateSnapshot,
  type ExperienceTimelineQuery,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';

interface RawEvent {
  event_id: string;
  stream_type: DomainEventStream;
  stream_id: string;
  event_type: string;
  actor_id: string | null;
  project_id: string | null;
  room_id: string | null;
  object_ref: string | null;
  summary: string;
  source_ref: string;
  cause_ref: string | null;
  outcome: DomainEventOutcome;
  confidence: 'recorded' | 'validated' | 'inferred';
  occurred_at: number;
}

const STREAMS = DomainEventStreamSchema.options;
const OUTCOMES = DomainEventOutcomeSchema.options;

function assertProjectAccess(actor: AuthUser, projectId: string | undefined): void {
  if (!projectId) return;
  const row = getDb()
    .prepare(
      `SELECT 1 AS allowed
       FROM projects p
       LEFT JOIN project_members pm
         ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL)`,
    )
    .get(actor.id, projectId, actor.id) as {allowed: number} | undefined;
  if (!row) {
    throw new Error('project_not_found');
  }
}

function outcomeFor(type: string, status?: string | null): DomainEventOutcome {
  const value = `${type} ${status ?? ''}`.toLowerCase();
  if (value.includes('validation_requested') || value.includes('pending_validation')) return 'pending_validation';
  if (value.includes('approved')) return 'approved';
  if (value.includes('reject')) return 'rejected';
  if (value.includes('cancel')) return 'cancelled';
  if (value.includes('fail')) return 'failed';
  if (value.includes('block') || value.includes('denied') || value.includes('missing')) return 'blocked';
  if (value.includes('complete') || value.includes('awarded') || value.includes('reached')) return 'completed';
  if (value.includes('start') || value.includes('running') || value.includes('progress')) return 'running';
  return 'observed';
}

function envelope(raw: RawEvent): DomainEventEnvelope {
  return DomainEventEnvelopeSchema.parse({
    event_id: raw.event_id,
    stream_type: raw.stream_type,
    stream_id: raw.stream_id,
    event_type: raw.event_type,
    actor_id: raw.actor_id,
    project_id: raw.project_id,
    room_id: raw.room_id,
    object_ref: raw.object_ref,
    summary: raw.summary,
    source_refs: [raw.source_ref],
    cause_ref: raw.cause_ref,
    outcome: raw.outcome,
    confidence: raw.confidence,
    provenance: {
      activity_ref: `${raw.stream_type}:${raw.stream_id}`,
      entity_refs: raw.object_ref ? [raw.object_ref] : [],
      agent_ref: raw.actor_id ? `user:${raw.actor_id}` : null,
    },
    occurred_at: raw.occurred_at,
  });
}

function auditEvents(actor: AuthUser, projectId?: string): RawEvent[] {
  const projectScopes = projectId ? [projectId, `project:${projectId}`] : [];
  const rows = getDb()
    .prepare(
      `SELECT id, user_id, action_id, event_type, scope, created_at
       FROM audit_logs
       WHERE user_id = ?
         AND (? IS NULL OR scope IN (?, ?))
       ORDER BY created_at DESC`,
    )
    .all(actor.id, projectId ?? null, projectScopes[0] ?? '', projectScopes[1] ?? '') as Array<{
      id: string;
      user_id: string | null;
      action_id: string | null;
      event_type: string;
      scope: string | null;
      created_at: number;
    }>;
  return rows.map((row) => ({
    event_id: row.id,
    stream_type: 'audit',
    stream_id: row.action_id ?? row.id,
    event_type: row.event_type,
    actor_id: row.user_id,
    project_id: projectId ?? null,
    room_id: null,
    object_ref: row.action_id ? `action:${row.action_id}` : null,
    summary: `Trace d’audit : ${row.event_type}`,
    source_ref: `audit_log:${row.id}`,
    cause_ref: row.action_id ? `action:${row.action_id}` : null,
    outcome: outcomeFor(row.event_type),
    confidence: 'recorded',
    occurred_at: row.created_at,
  }));
}

function workflowEvents(actor: AuthUser, projectId?: string): RawEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM workflow_events
       WHERE (? IS NULL AND owner_id = ?)
          OR (? IS NOT NULL AND project_id = ?)
       ORDER BY created_at DESC`,
    )
    .all(projectId ?? null, actor.id, projectId ?? null, projectId ?? null) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    event_id: String(row.id),
    stream_type: 'workflow',
    stream_id: String(row.workflow_id),
    event_type: String(row.event_type),
    actor_id: String(row.owner_id),
    project_id: row.project_id ? String(row.project_id) : null,
    room_id: row.room_id ? String(row.room_id) : null,
    object_ref: `capability:${String(row.capability_id)}`,
    summary: `Workflow ${String(row.workflow_type)} : ${String(row.event_type)}`,
    source_ref: `workflow_event:${String(row.id)}`,
    cause_ref: `workflow:${String(row.workflow_id)}`,
    outcome: outcomeFor(String(row.event_type), String(row.status)),
    confidence: 'recorded',
    occurred_at: Number(row.created_at),
  }));
}

function narrativeEvents(actor: AuthUser, projectId?: string): RawEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT ne.*, sw.project_id
       FROM narrative_events ne
       JOIN story_workbenches sw ON sw.id = ne.workbench_id
       WHERE (? IS NULL AND ne.owner_id = ?)
          OR (? IS NOT NULL AND sw.project_id = ?)
       ORDER BY ne.occurred_at DESC`,
    )
    .all(projectId ?? null, actor.id, projectId ?? null, projectId ?? null) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    event_id: String(row.id),
    stream_type: 'narrative',
    stream_id: String(row.workbench_id),
    event_type: String(row.event_type),
    actor_id: String(row.owner_id),
    project_id: row.project_id ? String(row.project_id) : null,
    room_id: null,
    object_ref: row.node_id ? `story_node:${String(row.node_id)}` : `story_workbench:${String(row.workbench_id)}`,
    summary: String(row.title),
    source_ref: `narrative_event:${String(row.id)}`,
    cause_ref: row.node_id ? `story_node:${String(row.node_id)}` : null,
    outcome: outcomeFor(String(row.event_type)),
    confidence: 'recorded',
    occurred_at: Number(row.occurred_at),
  }));
}

function jobEvents(actor: AuthUser, projectId?: string): RawEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT je.*, j.owner_id, j.scope_type, j.scope_id, j.type AS job_type
       FROM job_events je
       JOIN jobs j ON j.id = je.job_id
       WHERE (? IS NULL AND j.owner_id = ?)
          OR (? IS NOT NULL AND j.scope_type = 'project' AND j.scope_id = ?)
       ORDER BY je.created_at DESC`,
    )
    .all(projectId ?? null, actor.id, projectId ?? null, projectId ?? null) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    event_id: String(row.id),
    stream_type: 'job',
    stream_id: String(row.job_id),
    event_type: String(row.event_type),
    actor_id: String(row.owner_id),
    project_id: row.scope_type === 'project' ? String(row.scope_id) : null,
    room_id: null,
    object_ref: `job:${String(row.job_id)}`,
    summary: `Job ${String(row.job_type)} : ${String(row.event_type)}`,
    source_ref: `job_event:${String(row.id)}`,
    cause_ref: `job:${String(row.job_id)}`,
    outcome: outcomeFor(String(row.event_type)),
    confidence: 'recorded',
    occurred_at: Number(row.created_at),
  }));
}

function progressionEvents(actor: AuthUser, projectId?: string): RawEvent[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM user_progression_events
       WHERE user_id = ?
         AND (? IS NULL OR project_id = ?)
       ORDER BY created_at DESC`,
    )
    .all(actor.id, projectId ?? null, projectId ?? null) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    event_id: String(row.id),
    stream_type: 'progression',
    stream_id: String(row.user_id),
    event_type: String(row.event_type),
    actor_id: String(row.user_id),
    project_id: row.project_id ? String(row.project_id) : null,
    room_id: null,
    object_ref: row.ref_type && row.ref_id ? `${String(row.ref_type)}:${String(row.ref_id)}` : null,
    summary: `Progression : ${String(row.event_type)}`,
    source_ref: `progression_event:${String(row.id)}`,
    cause_ref: null,
    outcome: outcomeFor(String(row.event_type)),
    confidence: 'recorded',
    occurred_at: Number(row.created_at),
  }));
}

export function listExperienceEvents(
  actor: AuthUser,
  input: ExperienceTimelineQuery = {},
): DomainEventEnvelope[] {
  const query = ExperienceTimelineQuerySchema.parse(input);
  assertProjectAccess(actor, query.project_id);
  const selected = new Set<DomainEventStream>(query.streams ?? STREAMS);
  const events = [
    ...(selected.has('audit') ? auditEvents(actor, query.project_id) : []),
    ...(selected.has('workflow') ? workflowEvents(actor, query.project_id) : []),
    ...(selected.has('narrative') ? narrativeEvents(actor, query.project_id) : []),
    ...(selected.has('job') ? jobEvents(actor, query.project_id) : []),
    ...(selected.has('progression') ? progressionEvents(actor, query.project_id) : []),
  ]
    .filter((event) => query.from === undefined || event.occurred_at >= query.from)
    .filter((event) => query.to === undefined || event.occurred_at <= query.to)
    .sort((a, b) => b.occurred_at - a.occurred_at || a.event_id.localeCompare(b.event_id))
    .slice(0, query.limit)
    .map(envelope);
  return events;
}

export function buildExperienceSnapshot(
  actor: AuthUser,
  input: ExperienceTimelineQuery = {},
): ExperienceStateSnapshot {
  const query = ExperienceTimelineQuerySchema.parse({...input, limit: input.limit ?? 200});
  const events = listExperienceEvents(actor, query);
  const streamCounts = Object.fromEntries(STREAMS.map((stream) => [stream, 0])) as Record<DomainEventStream, number>;
  const outcomeCounts = Object.fromEntries(OUTCOMES.map((outcome) => [outcome, 0])) as Record<DomainEventOutcome, number>;
  for (const event of events) {
    streamCounts[event.stream_type] += 1;
    outcomeCounts[event.outcome] += 1;
  }
  const fingerprint = createHash('sha256')
    .update(events.map((event) => `${event.event_id}:${event.event_type}:${event.outcome}`).join('|'))
    .digest('hex');
  return ExperienceStateSnapshotSchema.parse({
    scope: query.project_id ? 'project' : 'user',
    scope_id: query.project_id ?? actor.id,
    up_to: query.to ?? Date.now(),
    event_count: events.length,
    stream_counts: streamCounts,
    outcome_counts: outcomeCounts,
    latest_event: events[0] ?? null,
    open_blockers: events
      .filter((event) => event.outcome === 'blocked' || event.outcome === 'failed')
      .slice(0, 20)
      .map((event) => event.source_refs[0] ?? event.event_id),
    fingerprint,
  });
}
