import {
  WorkflowEventSchema,
  type WorkflowEvent,
  type WorkflowEventType,
} from '@masterflow/shared';

import {getDb, type WorkflowEventRow} from '../db/schema.ts';
import {harvestUsageFromWorkflowEvent} from './usage_harvester.ts';

const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization)/i;

interface WorkflowFilters {
  from: number;
  to: number;
  capabilityId?: string;
  workflowType?: string;
}

interface WorkflowAggregateBucket {
  key: string;
  workflows: number;
  events: number;
  completed: number;
  failed: number;
  blocked: number;
  validation_requested: number;
  validation_rejected: number;
  completion_rate: number;
  duration_p50_ms: number | null;
  duration_p95_ms: number | null;
  cost_eur: number | null;
  tokens: number | null;
}

export interface WorkflowDiagnosticsSummary {
  from: number;
  to: number;
  filters: {
    capability_id: string | null;
    workflow_type: string | null;
  };
  totals: WorkflowAggregateBucket;
  by_capability: WorkflowAggregateBucket[];
  by_workflow_type: WorkflowAggregateBucket[];
  friction: Array<{
    blocker_category: string;
    events: number;
  }>;
}

function assertNoSecrets(event: WorkflowEvent): void {
  if (SECRET_PATTERN.test(JSON.stringify(event))) {
    throw new Error('workflow_event_contains_secret');
  }
}

function toEvent(row: WorkflowEventRow): WorkflowEvent {
  return WorkflowEventSchema.parse({
    event_id: row.id,
    workflow_id: row.workflow_id,
    event_type: row.event_type,
    workflow_type: row.workflow_type,
    capability_id: row.capability_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    room_id: row.room_id,
    duration_ms: row.duration_ms,
    cost_eur: row.cost_eur,
    tokens: row.tokens,
    status: row.status,
    blocker_category: row.blocker_category,
    created_at: row.created_at,
  });
}

export function recordWorkflowEvent(input: WorkflowEvent): WorkflowEvent {
  const event = WorkflowEventSchema.parse(input);
  assertNoSecrets(event);
  getDb()
    .prepare(
      `INSERT INTO workflow_events
         (id, workflow_id, event_type, workflow_type, capability_id, owner_id,
          project_id, room_id, duration_ms, cost_eur, tokens, status,
          blocker_category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      event.event_id,
      event.workflow_id,
      event.event_type,
      event.workflow_type,
      event.capability_id,
      event.owner_id,
      event.project_id,
      event.room_id,
      event.duration_ms,
      event.cost_eur,
      event.tokens,
      event.status,
      event.blocker_category,
      event.created_at,
    );
  const recorded = getWorkflowEvent(event.event_id);
  harvestUsageFromWorkflowEvent(recorded);
  return recorded;
}

export function getWorkflowEvent(eventId: string): WorkflowEvent {
  const row = getDb()
    .prepare('SELECT * FROM workflow_events WHERE id = ?')
    .get(eventId) as WorkflowEventRow | undefined;
  if (!row) throw new Error('workflow_event_not_found');
  return toEvent(row);
}

export function getWorkflowTrace(workflowId: string): WorkflowEvent[] {
  const rows = getDb()
    .prepare('SELECT * FROM workflow_events WHERE workflow_id = ? ORDER BY created_at, rowid')
    .all(workflowId) as WorkflowEventRow[];
  if (rows.length === 0) throw new Error('workflow_not_found');
  return rows.map(toEvent);
}

export function getWorkflowDiagnostics(filters: WorkflowFilters): WorkflowDiagnosticsSummary {
  const events = listFilteredEvents(filters);
  return {
    from: filters.from,
    to: filters.to,
    filters: {
      capability_id: filters.capabilityId ?? null,
      workflow_type: filters.workflowType ?? null,
    },
    totals: aggregateBucket('all', events),
    by_capability: aggregateBy(events, (event) => event.capability_id),
    by_workflow_type: aggregateBy(events, (event) => event.workflow_type),
    friction: frictionBuckets(events),
  };
}

function listFilteredEvents(filters: WorkflowFilters): WorkflowEvent[] {
  const clauses = ['created_at BETWEEN ? AND ?'];
  const params: Array<string | number> = [filters.from, filters.to];
  if (filters.capabilityId) {
    clauses.push('capability_id = ?');
    params.push(filters.capabilityId);
  }
  if (filters.workflowType) {
    clauses.push('workflow_type = ?');
    params.push(filters.workflowType);
  }
  const rows = getDb()
    .prepare(
      `SELECT * FROM workflow_events
       WHERE ${clauses.join(' AND ')}
       ORDER BY created_at, rowid`,
    )
    .all(...params) as WorkflowEventRow[];
  return rows.map(toEvent);
}

function aggregateBy(
  events: WorkflowEvent[],
  keyFor: (event: WorkflowEvent) => string,
): WorkflowAggregateBucket[] {
  const grouped = new Map<string, WorkflowEvent[]>();
  for (const event of events) {
    const key = keyFor(event);
    grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return [...grouped.entries()]
    .map(([key, bucketEvents]) => aggregateBucket(key, bucketEvents))
    .sort((a, b) => b.events - a.events || a.key.localeCompare(b.key));
}

function aggregateBucket(key: string, events: WorkflowEvent[]): WorkflowAggregateBucket {
  const workflowIds = new Set(events.map((event) => event.workflow_id));
  const countType = (type: WorkflowEventType) =>
    events.filter((event) => event.event_type === type).length;
  const completed = countType('workflow_completed');
  const durations = events
    .map((event) => event.duration_ms)
    .filter((duration): duration is number => duration !== null)
    .sort((a, b) => a - b);
  const costs = events
    .map((event) => event.cost_eur)
    .filter((cost): cost is number => cost !== null);
  const tokens = events
    .map((event) => event.tokens)
    .filter((tokenCount): tokenCount is number => tokenCount !== null);

  return {
    key,
    workflows: workflowIds.size,
    events: events.length,
    completed,
    failed: countType('workflow_failed'),
    blocked: countType('workflow_blocked'),
    validation_requested: countType('validation_requested'),
    validation_rejected: countType('validation_rejected'),
    completion_rate: workflowIds.size === 0 ? 0 : completed / workflowIds.size,
    duration_p50_ms: percentile(durations, 0.5),
    duration_p95_ms: percentile(durations, 0.95),
    cost_eur: costs.length === 0 ? null : sum(costs),
    tokens: tokens.length === 0 ? null : sum(tokens),
  };
}

function percentile(sortedValues: number[], p: number): number | null {
  if (sortedValues.length === 0) return null;
  const index = Math.ceil(sortedValues.length * p) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] ?? null;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function frictionBuckets(events: WorkflowEvent[]): Array<{blocker_category: string; events: number}> {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (!event.blocker_category) continue;
    counts.set(event.blocker_category, (counts.get(event.blocker_category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([blocker_category, count]) => ({blocker_category, events: count}))
    .sort((a, b) => b.events - a.events || a.blocker_category.localeCompare(b.blocker_category));
}
