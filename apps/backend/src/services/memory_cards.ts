import {
  MemoryCardSchema,
  type CreateMemoryCard,
  type MemoryCard,
} from '@masterflow/shared';

import {getDb, type MemoryCardRow} from '../db/schema.ts';
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
  const row = getDb().prepare('SELECT * FROM memory_cards WHERE id = ?').get(id) as
    | MemoryCardRow
    | undefined;
  if (!row || !canManage(actor, row)) throw new Error('memory_card_not_found');
  return toDTO(row);
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
