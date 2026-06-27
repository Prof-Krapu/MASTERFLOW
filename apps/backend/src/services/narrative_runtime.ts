import type {CreateNarrativeEventRequest, CreateStoryNodeRequest, NarrativeEvent, StoryNode, UpdateStoryNodeRequest} from '@masterflow/shared';
import {StoryNodeMetadataSchema} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface StoryNodeRow {
  id: string;
  workbench_id: string;
  parent_id: string | null;
  owner_id: string;
  node_type: string;
  title: string;
  summary: string | null;
  sort_order: number;
  spoiler_level: string;
  status: string;
  metadata_json: string;
  created_at: number;
  updated_at: number;
}

interface NarrativeEventRow {
  id: string;
  workbench_id: string;
  node_id: string | null;
  owner_id: string;
  event_type: string;
  title: string;
  description: string | null;
  payload_json: string;
  occurred_at: number;
  created_at: number;
}

interface WorkbenchScopeRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  canon_locked: number;
}

function nodeToDTO(row: StoryNodeRow): StoryNode {
  const raw = JSON.parse(row.metadata_json) as Record<string, unknown>;
  const metadata = StoryNodeMetadataSchema.parse(raw);
  return {
    id: row.id, workbench_id: row.workbench_id, parent_id: row.parent_id, owner_id: row.owner_id,
    node_type: row.node_type as StoryNode['node_type'], title: row.title, summary: row.summary,
    sort_order: row.sort_order, spoiler_level: row.spoiler_level as StoryNode['spoiler_level'],
    status: row.status as StoryNode['status'], metadata,
    created_at: row.created_at, updated_at: row.updated_at,
  };
}

function eventToDTO(row: NarrativeEventRow): NarrativeEvent {
  return {
    id: row.id, workbench_id: row.workbench_id, node_id: row.node_id, owner_id: row.owner_id,
    event_type: row.event_type as NarrativeEvent['event_type'], title: row.title, description: row.description,
    payload: JSON.parse(row.payload_json) as Record<string, unknown>,
    occurred_at: row.occurred_at, created_at: row.created_at,
  };
}

function canAccessScope(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function hasReaderState(actor: AuthUser, workbenchId: string): boolean {
  return getDb().prepare('SELECT 1 AS hit FROM story_reader_states WHERE workbench_id = ? AND owner_id = ?').get(workbenchId, actor.id) !== undefined;
}

function requireWorkbench(actor: AuthUser, workbenchId: string, mode: 'read' | 'write' = 'write'): WorkbenchScopeRow {
  const row = getDb().prepare('SELECT id, owner_id, project_id, canon_locked FROM story_workbenches WHERE id = ?').get(workbenchId) as WorkbenchScopeRow | undefined;
  if (!row) throw new Error('workbench_not_found');
  if (!canAccessScope(actor, row) && !(mode === 'read' && hasReaderState(actor, workbenchId))) throw new Error('workbench_not_found');
  return row;
}

function assertNodeAccess(actor: AuthUser, row: StoryNodeRow): void {
  requireWorkbench(actor, row.workbench_id);
}

function assertEventAccess(actor: AuthUser, row: NarrativeEventRow): void {
  requireWorkbench(actor, row.workbench_id);
}

// ─── Workbench status lifecycle ───────────────────────────────────

export function updateWorkbenchStatus(actor: AuthUser, workbenchId: string, status: string): {id: string; status: string} {
  requireWorkbench(actor, workbenchId);
  const valid = ['draft', 'reader_ready', 'workshop_ready', 'parked'] as const;
  if (!(valid as readonly string[]).includes(status)) throw new Error('invalid_status');
  const now = Date.now();
  getDb().prepare('UPDATE story_workbenches SET status = ?, updated_at = ? WHERE id = ?').run(status, now, workbenchId);
  audit({event_type: 'narrative.workbench_status', user_id: actor.id, detail: {workbench_id: workbenchId, status}});
  return {id: workbenchId, status};
}

// ─── Story nodes ──────────────────────────────────────────────────

export function getNextSortOrder(workbenchId: string, parentId?: string | null): number {
  if (parentId) {
    const row = getDb().prepare('SELECT MAX(sort_order) as mx FROM story_nodes WHERE workbench_id = ? AND parent_id = ?').get(workbenchId, parentId) as {mx: number | null};
    return (row.mx ?? 0) + 1;
  }
  const row = getDb().prepare('SELECT MAX(sort_order) as mx FROM story_nodes WHERE workbench_id = ? AND parent_id IS NULL').get(workbenchId) as {mx: number | null};
  return (row.mx ?? 0) + 1;
}

function checkCanonLock(actor: AuthUser, workbenchId: string): void {
  const wb = requireWorkbench(actor, workbenchId);
  if (wb.canon_locked) throw new Error('canon_locked');
}

export function createNode(actor: AuthUser, data: CreateStoryNodeRequest): StoryNode {
  checkCanonLock(actor, data.workbench_id);
  const id = uuid();
  const now = Date.now();
  const sortOrder = data.sort_order ?? getNextSortOrder(data.workbench_id, data.parent_id);
  const metadata = StoryNodeMetadataSchema.parse(data.metadata ?? {});
  getDb().prepare(`
    INSERT INTO story_nodes (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
  `).run(
    id, data.workbench_id, data.parent_id ?? null, actor.id,
    data.node_type, data.title, data.summary ?? null, sortOrder,
    data.spoiler_level ?? 'none', JSON.stringify(metadata), now, now,
  );
  audit({event_type: 'narrative.node_created', user_id: actor.id, detail: {node_id: id, workbench_id: data.workbench_id, node_type: data.node_type}});
  return nodeToDTO(getDb().prepare('SELECT * FROM story_nodes WHERE id = ?').get(id) as StoryNodeRow);
}

export function getNode(actor: AuthUser, nodeId: string): StoryNode {
  const row = getDb().prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId) as StoryNodeRow | undefined;
  if (!row) throw new Error('node_not_found');
  assertNodeAccess(actor, row);
  return nodeToDTO(row);
}

export function listAllNodes(actor: AuthUser): StoryNode[] {
  return (getDb().prepare(
    `SELECT sn.* FROM story_nodes sn
     JOIN story_workbenches sw ON sw.id = sn.workbench_id
     WHERE sw.owner_id = ?
     ORDER BY sn.sort_order ASC`,
  ).all(actor.id) as StoryNodeRow[]).map(nodeToDTO);
}

export function listNodesByWorkbench(actor: AuthUser, workbenchId: string): StoryNode[] {
  requireWorkbench(actor, workbenchId, 'read');
  const readerState = getDb().prepare(
    'SELECT mode FROM story_reader_states WHERE workbench_id = ? AND owner_id = ?',
  ).get(workbenchId, actor.id) as {mode: string} | undefined;

  const modes = ['MODE_LECTURE', 'MODE_ATELIER', 'FULL_SPOILERS', 'MODE_EXPORT'] as const;
  const mode = readerState?.mode ?? 'FULL_SPOILERS';

  const rows = getDb().prepare(
    'SELECT * FROM story_nodes WHERE workbench_id = ? ORDER BY sort_order ASC',
  ).all(workbenchId) as StoryNodeRow[];

  if (mode === 'MODE_LECTURE') {
    return rows
      .filter((row) => row.spoiler_level !== 'major' && row.spoiler_level !== 'critical')
      .map(nodeToDTO);
  }

  return rows.map(nodeToDTO);
}

export function updateNode(actor: AuthUser, nodeId: string, data: UpdateStoryNodeRequest): StoryNode {
  const row = getDb().prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId) as StoryNodeRow | undefined;
  if (!row) throw new Error('node_not_found');
  assertNodeAccess(actor, row);
  checkCanonLock(actor, row.workbench_id);
  const now = Date.now();
  const metadata = data.metadata !== undefined ? StoryNodeMetadataSchema.parse(data.metadata) : undefined;
  if (metadata !== undefined) {
    const merged = {...JSON.parse(row.metadata_json) as Record<string, unknown>, ...metadata};
    getDb().prepare('UPDATE story_nodes SET metadata_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(merged), now, nodeId);
  }
  if (data.title !== undefined) getDb().prepare('UPDATE story_nodes SET title = ?, updated_at = ? WHERE id = ?').run(data.title, now, nodeId);
  if (data.summary !== undefined) getDb().prepare('UPDATE story_nodes SET summary = ?, updated_at = ? WHERE id = ?').run(data.summary, now, nodeId);
  if (data.sort_order !== undefined) getDb().prepare('UPDATE story_nodes SET sort_order = ?, updated_at = ? WHERE id = ?').run(data.sort_order, now, nodeId);
  if (data.spoiler_level !== undefined) getDb().prepare('UPDATE story_nodes SET spoiler_level = ?, updated_at = ? WHERE id = ?').run(data.spoiler_level, now, nodeId);
  if (data.status !== undefined) getDb().prepare('UPDATE story_nodes SET status = ?, updated_at = ? WHERE id = ?').run(data.status, now, nodeId);
  audit({event_type: 'narrative.node_updated', user_id: actor.id, detail: {node_id: nodeId}});
  return nodeToDTO(getDb().prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId) as StoryNodeRow);
}

export function reorderNodes(actor: AuthUser, workbenchId: string, items: {id: string; sort_order: number}[]): void {
  checkCanonLock(actor, workbenchId);
  const db = getDb();
  const tx = db.transaction(() => {
    for (const item of items) {
      const row = db.prepare('SELECT * FROM story_nodes WHERE id = ? AND workbench_id = ?').get(item.id, workbenchId) as StoryNodeRow | undefined;
      if (!row) throw new Error(`node_not_found: ${item.id}`);
      db.prepare('UPDATE story_nodes SET sort_order = ?, updated_at = ? WHERE id = ?').run(item.sort_order, Date.now(), item.id);
    }
  });
  tx();
  audit({event_type: 'narrative.nodes_reordered', user_id: actor.id, detail: {workbench_id: workbenchId, count: items.length}});
}

export function deleteNode(actor: AuthUser, nodeId: string): void {
  const row = getDb().prepare('SELECT * FROM story_nodes WHERE id = ?').get(nodeId) as StoryNodeRow | undefined;
  if (!row) throw new Error('node_not_found');
  assertNodeAccess(actor, row);
  checkCanonLock(actor, row.workbench_id);
  getDb().prepare('DELETE FROM story_nodes WHERE id = ?').run(nodeId);
  audit({event_type: 'narrative.node_deleted', user_id: actor.id, detail: {node_id: nodeId, workbench_id: row.workbench_id}});
}

// ─── Narrative events ─────────────────────────────────────────────

export function createEvent(actor: AuthUser, data: CreateNarrativeEventRequest): NarrativeEvent {
  checkCanonLock(actor, data.workbench_id);
  const id = uuid();
  const now = Date.now();
  const occurredAt = data.occurred_at ?? now;
  getDb().prepare(`
    INSERT INTO narrative_events (id, workbench_id, node_id, owner_id, event_type, title, description, payload_json, occurred_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.workbench_id, data.node_id ?? null, actor.id,
    data.event_type, data.title, data.description ?? null,
    JSON.stringify(data.payload ?? {}), occurredAt, now,
  );
  audit({event_type: 'narrative.event_created', user_id: actor.id, detail: {event_id: id, workbench_id: data.workbench_id, event_type: data.event_type}});
  return eventToDTO(getDb().prepare('SELECT * FROM narrative_events WHERE id = ?').get(id) as NarrativeEventRow);
}

export function listEventsByWorkbench(actor: AuthUser, workbenchId: string): NarrativeEvent[] {
  requireWorkbench(actor, workbenchId);
  return (getDb().prepare(
    'SELECT * FROM narrative_events WHERE workbench_id = ? ORDER BY occurred_at ASC',
  ).all(workbenchId) as NarrativeEventRow[]).map(eventToDTO);
}

export function listAllEvents(actor: AuthUser, limit = 50): NarrativeEvent[] {
  return (getDb().prepare(
    `SELECT ne.* FROM narrative_events ne
     JOIN story_workbenches sw ON sw.id = ne.workbench_id
     WHERE sw.owner_id = ?
     ORDER BY ne.occurred_at DESC LIMIT ?`,
  ).all(actor.id, limit) as NarrativeEventRow[]).map(eventToDTO);
}

export function deleteEvent(actor: AuthUser, eventId: string): void {
  const row = getDb().prepare('SELECT * FROM narrative_events WHERE id = ?').get(eventId) as NarrativeEventRow | undefined;
  if (!row) throw new Error('event_not_found');
  assertEventAccess(actor, row);
  getDb().prepare('DELETE FROM narrative_events WHERE id = ?').run(eventId);
  audit({event_type: 'narrative.event_deleted', user_id: actor.id, detail: {event_id: eventId, workbench_id: row.workbench_id}});
}
