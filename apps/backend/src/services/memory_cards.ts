import {
  MemoryCardLinkSchema,
  MemoryCardSchema,
  MemoryGraphHealthSchema,
  type CreateMemoryCardLink,
  type CreateMemoryCard,
  type MemoryCard,
  type MemoryCardLink,
  type MemoryCardRelationFamily,
  type MemoryCardRelationType,
  type MemoryGraphHealth,
} from '@masterflow/shared';

import {getDb, type MemoryCardLinkRow, type MemoryCardRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

const SECRET_PATTERN =
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|credential|authorization)/i;

function toDTO(row: MemoryCardRow): MemoryCard {
  return MemoryCardSchema.parse({
    memory_card_id: row.id,
    type: row.type,
    owner_id: row.owner_id,
    project_id: row.project_id,
    scope: row.scope,
    source_ref: row.source_ref,
    extracted_signal: row.extracted_signal,
    distilled_value: row.distilled_value,
    confidence: row.confidence,
    privacy: row.privacy,
    affects: JSON.parse(row.affects_json) as unknown,
    status: row.status,
    compression_level: row.compression_level,
    invalidation_rule: row.invalidation_rule,
    next_action: row.next_action,
    validated_by: row.validated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function canManage(actor: AuthUser, row: MemoryCardRow): boolean {
  if (row.owner_id === actor.id) return true;
  if (row.scope === 'user') return false;
  return Boolean(
    row.project_id &&
      decideScopedPermission({
        actor,
        projectId: row.project_id,
        minimumProjectRole: 'editor',
      }).allowed,
  );
}

function canRead(actor: AuthUser, row: MemoryCardRow): boolean {
  if (row.owner_id === actor.id) return true;
  if (row.scope === 'user') return false;
  return Boolean(
    row.project_id &&
      decideScopedPermission({
        actor,
        projectId: row.project_id,
        minimumProjectRole: 'viewer',
      }).allowed,
  );
}

function relationFamily(relationType: MemoryCardRelationType): MemoryCardRelationFamily {
  if (['derived_from', 'references'].includes(relationType)) return 'provenance';
  if (
    [
      'requires_validation',
      'triggers_action',
      'used_in',
      'blocks',
      'unlocks',
    ].includes(relationType)
  ) {
    return 'operational';
  }
  return 'semantic';
}

function toLinkDTO(row: MemoryCardLinkRow): MemoryCardLink {
  return MemoryCardLinkSchema.parse({
    link_id: row.id,
    source_card_id: row.source_card_id,
    target_card_id: row.target_card_id,
    relation_type: row.relation_type,
    relation_family: row.relation_family,
    directionality: ['contradicts', 'related_to'].includes(row.relation_type)
      ? 'symmetric'
      : 'directed',
    rationale: row.rationale,
    source_ref: row.source_ref,
    confidence: row.confidence,
    created_by: row.created_by,
    status: row.status,
    validated_by: row.validated_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function getCardRow(id: string): MemoryCardRow | undefined {
  return getDb().prepare('SELECT * FROM memory_cards WHERE id = ?').get(id) as
    | MemoryCardRow
    | undefined;
}

function sameKnowledgeScope(source: MemoryCardRow, target: MemoryCardRow): boolean {
  if (source.scope !== target.scope) return false;
  if (source.scope === 'user') return source.owner_id === target.owner_id;
  return Boolean(source.project_id && source.project_id === target.project_id);
}

export function createMemoryCard(actor: AuthUser, input: CreateMemoryCard): MemoryCard {
  if (SECRET_PATTERN.test(JSON.stringify(input))) throw new Error('memory_secret_detected');
  if (
    input.project_id &&
    !decideScopedPermission({
      actor,
      projectId: input.project_id,
      minimumProjectRole: 'editor',
    }).allowed
  ) {
    throw new Error('project_not_found');
  }
  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO memory_cards
         (id, type, owner_id, project_id, scope, source_ref, extracted_signal,
          distilled_value, confidence, privacy, affects_json, status, compression_level,
          invalidation_rule, next_action, validated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', 'L2', ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      input.type,
      actor.id,
      input.project_id ?? null,
      input.project_id ? 'project' : 'user',
      input.source_ref,
      input.extracted_signal,
      input.distilled_value,
      input.confidence,
      input.privacy,
      JSON.stringify(input.affects),
      input.invalidation_rule,
      input.next_action,
      now,
      now,
    );
  return getMemoryCard(actor, id);
}

export function getMemoryCard(actor: AuthUser, id: string): MemoryCard {
  const row = getCardRow(id);
  if (!row || !canRead(actor, row)) throw new Error('memory_card_not_found');
  return toDTO(row);
}

export function listMemoryCards(
  actor: AuthUser,
  options: {projectId?: string | null; status?: MemoryCard['status']} = {},
): MemoryCard[] {
  const rows = getDb()
    .prepare('SELECT * FROM memory_cards ORDER BY updated_at DESC')
    .all() as MemoryCardRow[];
  return rows
    .filter((row) => {
      if (!canRead(actor, row)) return false;
      if (options.projectId === null && row.scope !== 'user') return false;
      if (typeof options.projectId === 'string' && row.project_id !== options.projectId) return false;
      if (options.status && row.status !== options.status) return false;
      return true;
    })
    .map(toDTO);
}

export function validateMemoryCard(
  actor: AuthUser,
  id: string,
  decision: 'active' | 'rejected',
): MemoryCard {
  const row = getDb().prepare('SELECT * FROM memory_cards WHERE id = ?').get(id) as
    | MemoryCardRow
    | undefined;
  if (!row || !canManage(actor, row)) throw new Error('memory_card_not_found');
  if (row.status !== 'candidate') throw new Error('memory_card_not_candidate');
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE memory_cards
          SET status = ?, compression_level = ?, confidence = ?, validated_by = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(
      decision,
      decision === 'active' ? 'L3' : 'L2',
      decision === 'active' ? 'validated' : row.confidence,
      actor.id,
      now,
      id,
    );
  return getMemoryCard(actor, id);
}

export function invalidateMemoryCard(actor: AuthUser, id: string): MemoryCard {
  const row = getDb().prepare('SELECT * FROM memory_cards WHERE id = ?').get(id) as
    | MemoryCardRow
    | undefined;
  if (!row || !canManage(actor, row)) throw new Error('memory_card_not_found');
  getDb()
    .prepare("UPDATE memory_cards SET status = 'stale', updated_at = ? WHERE id = ?")
    .run(Date.now(), id);
  return getMemoryCard(actor, id);
}

export function listActiveMemoryCardRefs(
  actor: AuthUser,
  projectId: string | null,
  limit = 8,
): Array<{id: string; scope: 'user' | 'project'; scopeId: string}> {
  const rows = getDb()
    .prepare(
      `SELECT * FROM memory_cards
        WHERE status = 'active'
          AND (
            (scope = 'user' AND owner_id = ?)
            OR (scope = 'project' AND project_id = ?)
          )
        ORDER BY updated_at DESC
        LIMIT ?`,
    )
    .all(actor.id, projectId, limit) as MemoryCardRow[];
  return rows.map((row) => ({
    id: row.id,
    scope: row.scope,
    scopeId: row.project_id ?? row.owner_id,
  }));
}

export function createMemoryCardLink(
  actor: AuthUser,
  sourceCardId: string,
  input: CreateMemoryCardLink,
): MemoryCardLink {
  if (SECRET_PATTERN.test(JSON.stringify(input))) throw new Error('memory_secret_detected');
  const source = getCardRow(sourceCardId);
  const target = getCardRow(input.target_card_id);
  if (!source || !target || !canManage(actor, source) || !canManage(actor, target)) {
    throw new Error('memory_card_not_found');
  }
  if (source.id === target.id) throw new Error('memory_card_self_link');
  if (!sameKnowledgeScope(source, target)) throw new Error('memory_card_scope_mismatch');

  const db = getDb();
  const existing = db
    .prepare(
      `SELECT * FROM memory_card_links
        WHERE source_card_id = ? AND target_card_id = ? AND relation_type = ?`,
    )
    .get(source.id, target.id, input.relation_type) as MemoryCardLinkRow | undefined;
  const now = Date.now();
  const family = relationFamily(input.relation_type);

  if (existing && ['candidate', 'active'].includes(existing.status)) {
    throw new Error('memory_card_link_exists');
  }
  if (existing) {
    db.prepare(
      `UPDATE memory_card_links
          SET relation_family = ?, rationale = ?, source_ref = ?, confidence = ?,
              status = 'candidate', created_by = ?, validated_by = NULL, updated_at = ?
        WHERE id = ?`,
    ).run(
      family,
      input.rationale,
      input.source_ref,
      input.confidence,
      actor.id,
      now,
      existing.id,
    );
    return getMemoryCardLink(actor, existing.id);
  }

  const id = uuid();
  db.prepare(
    `INSERT INTO memory_card_links
       (id, source_card_id, target_card_id, relation_type, relation_family, rationale,
        source_ref, confidence, status, created_by, validated_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, NULL, ?, ?)`,
  ).run(
    id,
    source.id,
    target.id,
    input.relation_type,
    family,
    input.rationale,
    input.source_ref,
    input.confidence,
    actor.id,
    now,
    now,
  );
  audit({
    event_type: 'memory_card_link.created_candidate',
    user_id: actor.id,
    scope: source.scope === 'project' ? `project:${source.project_id}` : `user:${source.owner_id}`,
    detail: {
      link_id: id,
      source_card_id: source.id,
      target_card_id: target.id,
      relation_type: input.relation_type,
    },
  });
  return getMemoryCardLink(actor, id);
}

export function getMemoryCardLink(actor: AuthUser, id: string): MemoryCardLink {
  const row = getDb().prepare('SELECT * FROM memory_card_links WHERE id = ?').get(id) as
    | MemoryCardLinkRow
    | undefined;
  if (!row) throw new Error('memory_card_link_not_found');
  const source = getCardRow(row.source_card_id);
  const target = getCardRow(row.target_card_id);
  if (!source || !target || !canRead(actor, source) || !canRead(actor, target)) {
    throw new Error('memory_card_link_not_found');
  }
  return toLinkDTO(row);
}

export function listMemoryCardLinks(actor: AuthUser, cardId: string): MemoryCardLink[] {
  const card = getCardRow(cardId);
  if (!card || !canRead(actor, card)) throw new Error('memory_card_not_found');
  const rows = getDb()
    .prepare(
      `SELECT * FROM memory_card_links
        WHERE source_card_id = ? OR target_card_id = ?
        ORDER BY updated_at DESC`,
    )
    .all(cardId, cardId) as MemoryCardLinkRow[];
  return rows.filter((row) => {
    const source = getCardRow(row.source_card_id);
    const target = getCardRow(row.target_card_id);
    return Boolean(source && target && canRead(actor, source) && canRead(actor, target));
  }).map(toLinkDTO);
}

export function decideMemoryCardLink(
  actor: AuthUser,
  linkId: string,
  decision: 'active' | 'rejected' | 'archived',
): MemoryCardLink {
  const row = getDb().prepare('SELECT * FROM memory_card_links WHERE id = ?').get(linkId) as
    | MemoryCardLinkRow
    | undefined;
  if (!row) throw new Error('memory_card_link_not_found');
  const source = getCardRow(row.source_card_id);
  const target = getCardRow(row.target_card_id);
  if (!source || !target || !canManage(actor, source) || !canManage(actor, target)) {
    throw new Error('memory_card_link_not_found');
  }
  if (decision !== 'archived' && row.status !== 'candidate') {
    throw new Error('memory_card_link_not_candidate');
  }
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE memory_card_links
          SET status = ?, confidence = ?, validated_by = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(
      decision,
      decision === 'active' ? 'validated' : row.confidence,
      actor.id,
      now,
      linkId,
    );
  audit({
    event_type: 'memory_card_link.decided',
    user_id: actor.id,
    scope: source.scope === 'project' ? `project:${source.project_id}` : `user:${source.owner_id}`,
    detail: {link_id: linkId, decision},
  });
  return getMemoryCardLink(actor, linkId);
}

export function getMemoryGraphHealth(
  actor: AuthUser,
  projectId: string | null = null,
): MemoryGraphHealth {
  if (
    projectId &&
    !decideScopedPermission({
      actor,
      projectId,
      minimumProjectRole: 'viewer',
    }).allowed
  ) {
    throw new Error('project_not_found');
  }
  const cards = listMemoryCards(actor, {projectId});
  const cardIds = new Set(cards.map((card) => card.memory_card_id));
  const links = (getDb()
    .prepare('SELECT * FROM memory_card_links ORDER BY updated_at DESC')
    .all() as MemoryCardLinkRow[]).filter(
    (link) => cardIds.has(link.source_card_id) && cardIds.has(link.target_card_id),
  );
  const activeLinks = links.filter((link) => link.status === 'active');
  const linkedActiveCardIds = new Set(
    activeLinks.flatMap((link) => [link.source_card_id, link.target_card_id]),
  );
  const activeCards = cards.filter((card) => card.status === 'active');
  const activeValues = cards
    .filter((card) => ['candidate', 'active'].includes(card.status))
    .map((card) => card.distilled_value.trim().toLocaleLowerCase())
    .filter(Boolean);
  const duplicateCounts = new Map<string, number>();
  activeValues.forEach((value) => duplicateCounts.set(value, (duplicateCounts.get(value) ?? 0) + 1));
  const byId = new Map(cards.map((card) => [card.memory_card_id, card]));

  return MemoryGraphHealthSchema.parse({
    scope: projectId ? 'project' : 'user',
    scope_id: projectId ?? actor.id,
    cards: {
      total: cards.length,
      candidate: cards.filter((card) => card.status === 'candidate').length,
      active: activeCards.length,
      stale: cards.filter((card) => card.status === 'stale').length,
      archived: cards.filter((card) => card.status === 'archived').length,
      rejected: cards.filter((card) => card.status === 'rejected').length,
    },
    active_links: activeLinks.length,
    candidate_links: links.filter((link) => link.status === 'candidate').length,
    orphan_active_cards: activeCards.filter(
      (card) => !linkedActiveCardIds.has(card.memory_card_id),
    ).length,
    contradiction_links: activeLinks.filter(
      (link) => link.relation_type === 'contradicts',
    ).length,
    duplicate_distilled_values: [...duplicateCounts.values()].filter((count) => count > 1).length,
    stale_links: activeLinks.filter((link) => {
      const sourceStatus = byId.get(link.source_card_id)?.status;
      const targetStatus = byId.get(link.target_card_id)?.status;
      return [sourceStatus, targetStatus].some((status) =>
        status ? ['stale', 'archived', 'rejected'].includes(status) : true,
      );
    }).length,
  });
}
