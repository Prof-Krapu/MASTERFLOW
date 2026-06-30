import {
  CreateInventoryCollectionRequestSchema,
  CreateInventoryItemRequestSchema,
  CreateCollectionMatchRequestSchema,
  CollectionMatchSchema,
  CreateInventoryProjectNeedRequestSchema,
  IngestInventoryOcrCandidatesRequestSchema,
  InventoryCapabilityMapSchema,
  InventoryCollectionSchema,
  InventoryItemSchema,
  InventoryNeedMatchResultSchema,
  InventoryProjectNeedSchema,
  InventorySearchRequestSchema,
  InventorySearchResultSchema,
  ListInventoryItemsRequestSchema,
  ResolveCollectionMatchRequestSchema,
  MatchInventoryProjectNeedRequestSchema,
  ScanInventoryPhotoRequestSchema,
  SetCollectionCompletionRequestSchema,
  ROLE_RANK,
  type CreateInventoryCollectionRequest,
  type CreateInventoryItemRequest,
  type CreateCollectionMatchRequest,
  type CollectionMatch,
  type CreateInventoryProjectNeedRequest,
  type InventoryCollection,
  type InventoryCapabilityMap,
  type InventoryItem,
  type InventoryNeedMatchResult,
  type InventoryProjectNeed,
  type InventorySearchRequest,
  type InventorySearchResult,
  type IngestInventoryOcrCandidatesRequest,
  type ListInventoryItemsRequest,
  type ProjectMemberRole,
  type ResolveCollectionMatchRequest,
  type MatchInventoryProjectNeedRequest,
  type ScanInventoryPhotoRequest,
  type SetCollectionCompletionRequest,
} from '@masterflow/shared';

import {
  getDb,
  type CollectionMatchRow,
  type InventoryCollectionRow,
  type InventoryItemRow,
  type InventoryProjectNeedRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {deleteFile, resolveStorageImage, storeFile} from '../lib/storage.ts';
import {decideScopedPermission} from './projects.ts';
import {getJob} from './jobs.ts';
import {
  indexInventoryItemRagResource,
  invalidateInventoryItemRagResource,
} from './rag.ts';

const PROJECT_EDITOR: ProjectMemberRole = 'editor';

function isGlobalAdmin(actor: AuthUser): boolean {
  return ROLE_RANK[actor.role] >= ROLE_RANK.admin;
}

function toCollection(row: InventoryCollectionRow): InventoryCollection {
  return InventoryCollectionSchema.parse({
    collection_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    scope_type: row.scope_type,
    label: row.label,
    description: row.description,
    visibility_scope: row.visibility_scope,
    validation_status: row.validation_status,
    completion_state: row.completion_state,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toCollectionMatch(row: CollectionMatchRow): CollectionMatch {
  return CollectionMatchSchema.parse({
    match_id: row.id,
    item_id: row.item_id,
    collection_id: row.collection_id,
    match_status: row.match_status,
    confidence: row.confidence,
    source_ref: row.source_ref,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toProjectNeed(row: InventoryProjectNeedRow): InventoryProjectNeed {
  return InventoryProjectNeedSchema.parse({
    need_id: row.id,
    project_id: row.project_id,
    owner_id: row.owner_id,
    label: row.label,
    quantity: row.quantity,
    required_tags: JSON.parse(row.required_tags_json) as unknown,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toItem(row: InventoryItemRow): InventoryItem {
  return InventoryItemSchema.parse({
    item_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    collection_id: row.collection_id,
    scope_type: row.scope_type,
    type: row.type,
    label: row.label,
    creator_or_brand: row.creator_or_brand,
    item_status: row.item_status,
    validation_status: row.validation_status,
    intent: row.intent,
    quantity: row.quantity,
    condition: row.condition,
    estimated_value: row.estimated_value,
    replacement_cost: row.replacement_cost,
    usage_tags: JSON.parse(row.usage_tags_json) as unknown,
    source_refs: JSON.parse(row.source_refs_json) as unknown,
    visibility_scope: row.visibility_scope,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
  });
}

function canReadProject(actor: AuthUser, projectId: string): boolean {
  return decideScopedPermission({actor, projectId}).allowed;
}

function canEditProject(actor: AuthUser, projectId: string): boolean {
  return decideScopedPermission({
    actor,
    projectId,
    minimumProjectRole: PROJECT_EDITOR,
  }).allowed;
}

function assertCanWriteScope(actor: AuthUser, projectId: string | null): void {
  if (!projectId) return;
  if (!canEditProject(actor, projectId)) throw new Error('inventory_scope_denied');
}

function assertCanReadItem(actor: AuthUser, row: InventoryItemRow): void {
  if (isGlobalAdmin(actor) || row.owner_id === actor.id) return;
  if (
    row.project_id &&
    row.visibility_scope === 'project' &&
    row.validation_status === 'validated' &&
    canReadProject(actor, row.project_id)
  ) {
    return;
  }
  throw new Error('inventory_item_not_found');
}

function assertCanValidateItem(actor: AuthUser, row: InventoryItemRow): void {
  if (isGlobalAdmin(actor) || row.owner_id === actor.id) return;
  if (row.project_id && canEditProject(actor, row.project_id)) return;
  throw new Error('inventory_scope_denied');
}

function getCollectionRow(id: string): InventoryCollectionRow | undefined {
  return getDb().prepare('SELECT * FROM inventory_collections WHERE id = ?').get(id) as
    | InventoryCollectionRow
    | undefined;
}

function getItemRow(id: string): InventoryItemRow | undefined {
  return getDb().prepare('SELECT * FROM inventory_items WHERE id = ?').get(id) as
    | InventoryItemRow
    | undefined;
}

function assertCanManageCollection(actor: AuthUser, row: InventoryCollectionRow): void {
  if (isGlobalAdmin(actor) || row.owner_id === actor.id) return;
  if (row.project_id && canEditProject(actor, row.project_id)) return;
  throw new Error('inventory_collection_not_found');
}

function assertCanReadCollection(actor: AuthUser, row: InventoryCollectionRow): void {
  if (isGlobalAdmin(actor) || row.owner_id === actor.id) return;
  if (
    row.project_id &&
    row.visibility_scope === 'project' &&
    row.validation_status === 'validated' &&
    canReadProject(actor, row.project_id)
  ) {
    return;
  }
  throw new Error('inventory_collection_not_found');
}

function assertCollectionCompatible(
  actor: AuthUser,
  collectionId: string | null | undefined,
  projectId: string | null,
): string | null {
  if (!collectionId) return null;
  const collection = getCollectionRow(collectionId);
  if (!collection) throw new Error('inventory_collection_not_found');
  if (collection.project_id !== projectId) throw new Error('inventory_collection_scope_mismatch');
  if (collection.owner_id !== actor.id && !isGlobalAdmin(actor) && !(projectId && canReadProject(actor, projectId))) {
    throw new Error('inventory_collection_not_found');
  }
  return collection.id;
}

export function createInventoryCollection(
  actor: AuthUser,
  input: CreateInventoryCollectionRequest,
): InventoryCollection {
  const request = CreateInventoryCollectionRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  assertCanWriteScope(actor, projectId);
  const now = Date.now();
  const id = uuid();
  const visibility = request.visibility_scope ?? (projectId ? 'project' : 'private');
  getDb()
    .prepare(
      `INSERT INTO inventory_collections
         (id, owner_id, project_id, scope_type, label, description, visibility_scope,
          validation_status, completion_state, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', 'unknown', ?, ?)`,
    )
    .run(
      id,
      actor.id,
      projectId,
      projectId ? 'project' : 'user',
      request.label,
      request.description ?? null,
      visibility,
      now,
      now,
    );
  audit({
    event_type: 'inventory.collection_created',
    user_id: actor.id,
    scope: projectId ?? actor.id,
    detail: {collection_id: id, project_id: projectId, validation_status: 'candidate'},
  });
  return toCollection(getCollectionRow(id)!);
}

export function listInventoryCollections(
  actor: AuthUser,
  input: Partial<ListInventoryItemsRequest> = {},
): InventoryCollection[] {
  const request = ListInventoryItemsRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  let rows: InventoryCollectionRow[];
  if (projectId) {
    if (!canReadProject(actor, projectId)) throw new Error('inventory_scope_denied');
    const includeCandidates = request.include_candidates && canEditProject(actor, projectId);
    rows = getDb()
      .prepare(
        `SELECT * FROM inventory_collections
         WHERE project_id = ? AND visibility_scope = 'project'
           AND validation_status IN (${includeCandidates ? "'candidate','validated'" : "'validated'"})
         ORDER BY updated_at DESC`,
      )
      .all(projectId) as InventoryCollectionRow[];
  } else {
    rows = getDb()
      .prepare(
        `SELECT * FROM inventory_collections
         WHERE owner_id = ? AND scope_type = 'user'
           AND validation_status IN (${request.include_candidates ? "'candidate','validated'" : "'validated'"})
         ORDER BY updated_at DESC`,
      )
      .all(actor.id) as InventoryCollectionRow[];
  }
  return rows.map(toCollection);
}

export function validateInventoryCollection(actor: AuthUser, id: string): InventoryCollection {
  const row = getCollectionRow(id);
  if (!row) throw new Error('inventory_collection_not_found');
  assertCanManageCollection(actor, row);
  getDb()
    .prepare(
      `UPDATE inventory_collections
       SET validation_status = 'validated', updated_at = ?
       WHERE id = ?`,
    )
    .run(Date.now(), id);
  audit({
    event_type: 'inventory.collection_validated',
    user_id: actor.id,
    scope: row.project_id ?? row.owner_id,
    detail: {collection_id: id, project_id: row.project_id},
  });
  return toCollection(getCollectionRow(id)!);
}

export function setInventoryCollectionCompletion(
  actor: AuthUser,
  id: string,
  input: SetCollectionCompletionRequest,
): InventoryCollection {
  const request = SetCollectionCompletionRequestSchema.parse(input);
  const row = getCollectionRow(id);
  if (!row) throw new Error('inventory_collection_not_found');
  assertCanManageCollection(actor, row);
  getDb()
    .prepare('UPDATE inventory_collections SET completion_state = ?, updated_at = ? WHERE id = ?')
    .run(request.completion_state, Date.now(), id);
  audit({
    event_type: 'inventory.collection_completion_declared',
    user_id: actor.id,
    scope: row.project_id ?? row.owner_id,
    detail: {collection_id: id, completion_state: request.completion_state},
  });
  return toCollection(getCollectionRow(id)!);
}

export function createCollectionMatch(
  actor: AuthUser,
  collectionId: string,
  input: CreateCollectionMatchRequest,
): CollectionMatch {
  const request = CreateCollectionMatchRequestSchema.parse(input);
  const collection = getCollectionRow(collectionId);
  const item = getItemRow(request.item_id);
  if (!collection) throw new Error('inventory_collection_not_found');
  if (!item) throw new Error('inventory_item_not_found');
  assertCanManageCollection(actor, collection);
  assertCanValidateItem(actor, item);
  if (collection.project_id !== item.project_id) {
    throw new Error('inventory_collection_scope_mismatch');
  }
  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO collection_matches
         (id, item_id, collection_id, match_status, confidence, source_ref, created_at, updated_at)
       VALUES (?, ?, ?, 'candidate', ?, ?, ?, ?)
       ON CONFLICT(item_id, collection_id) DO UPDATE SET
         match_status = 'candidate',
         confidence = excluded.confidence,
         source_ref = excluded.source_ref,
         updated_at = excluded.updated_at`,
    )
    .run(
      id,
      item.id,
      collection.id,
      request.confidence ?? null,
      request.source_ref ?? null,
      now,
      now,
    );
  const row = getDb()
    .prepare('SELECT * FROM collection_matches WHERE item_id = ? AND collection_id = ?')
    .get(item.id, collection.id) as CollectionMatchRow;
  return toCollectionMatch(row);
}

export function resolveCollectionMatch(
  actor: AuthUser,
  matchId: string,
  input: ResolveCollectionMatchRequest,
): CollectionMatch {
  const request = ResolveCollectionMatchRequestSchema.parse(input);
  const row = getDb().prepare('SELECT * FROM collection_matches WHERE id = ?').get(matchId) as
    | CollectionMatchRow
    | undefined;
  if (!row) throw new Error('inventory_match_not_found');
  const collection = getCollectionRow(row.collection_id);
  const item = getItemRow(row.item_id);
  if (!collection || !item) throw new Error('inventory_match_not_found');
  assertCanManageCollection(actor, collection);
  const now = Date.now();
  getDb()
    .prepare('UPDATE collection_matches SET match_status = ?, updated_at = ? WHERE id = ?')
    .run(request.decision, now, matchId);
  if (request.decision === 'confirmed') {
    getDb()
      .prepare('UPDATE inventory_items SET collection_id = ?, updated_at = ? WHERE id = ?')
      .run(collection.id, now, item.id);
  }
  audit({
    event_type: 'inventory.collection_match_resolved',
    user_id: actor.id,
    scope: collection.project_id ?? collection.owner_id,
    detail: {match_id: matchId, decision: request.decision},
  });
  const updated = getDb()
    .prepare('SELECT * FROM collection_matches WHERE id = ?')
    .get(matchId) as CollectionMatchRow;
  return toCollectionMatch(updated);
}

export function listCollectionMatches(actor: AuthUser, collectionId: string): CollectionMatch[] {
  const collection = getCollectionRow(collectionId);
  if (!collection) throw new Error('inventory_collection_not_found');
  assertCanReadCollection(actor, collection);
  return (
    getDb()
      .prepare('SELECT * FROM collection_matches WHERE collection_id = ? ORDER BY updated_at DESC')
      .all(collectionId) as CollectionMatchRow[]
  ).map(toCollectionMatch);
}

function normalizedDuplicateKey(row: InventoryItemRow): string {
  return `${row.type}|${row.label.trim().toLocaleLowerCase('fr')}|${(row.creator_or_brand ?? '')
    .trim()
    .toLocaleLowerCase('fr')}`;
}

function searchTerms(value: string): string[] {
  return [
    ...new Set(
      value
        .toLocaleLowerCase('fr')
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 2),
    ),
  ];
}

function itemSearchScore(row: InventoryItemRow, terms: string[]): number {
  if (terms.length === 0) return 0;
  const haystack = [
    row.label,
    row.creator_or_brand ?? '',
    row.type,
    row.intent ?? '',
    ...(JSON.parse(row.usage_tags_json) as string[]),
  ]
    .join(' ')
    .toLocaleLowerCase('fr');
  return terms.filter((term) => haystack.includes(term)).length / terms.length;
}

function availabilityState(row: InventoryItemRow): 'candidate_available' | 'unknown' {
  return ['owned_confirmed', 'owned_declared', 'complete_declared'].includes(row.item_status)
    ? 'candidate_available'
    : 'unknown';
}

export function searchInventory(
  actor: AuthUser,
  input: InventorySearchRequest,
): InventorySearchResult[] {
  const request = InventorySearchRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  let rows: InventoryItemRow[];
  if (projectId) {
    if (!canReadProject(actor, projectId)) throw new Error('inventory_scope_denied');
    rows = getDb()
      .prepare(
        `SELECT * FROM inventory_items
         WHERE project_id = ? AND visibility_scope = 'project'
           AND validation_status = 'validated'`,
      )
      .all(projectId) as InventoryItemRow[];
  } else {
    rows = getDb()
      .prepare(
        `SELECT * FROM inventory_items
         WHERE owner_id = ? AND scope_type = 'user' AND validation_status = 'validated'`,
      )
      .all(actor.id) as InventoryItemRow[];
  }
  const terms = searchTerms(request.query);
  return rows
    .map((row) => ({row, score: itemSearchScore(row, terms)}))
    .filter(({score}) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, request.limit)
    .map(({row, score}) =>
      InventorySearchResultSchema.parse({
        item: toItem(row),
        score,
        availability_state: availabilityState(row),
        availability_guaranteed: false,
      }),
    );
}

export function createInventoryProjectNeed(
  actor: AuthUser,
  input: CreateInventoryProjectNeedRequest,
): InventoryProjectNeed {
  const request = CreateInventoryProjectNeedRequestSchema.parse(input);
  if (!canEditProject(actor, request.project_id)) throw new Error('inventory_scope_denied');
  const id = uuid();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO inventory_project_needs
         (id, project_id, owner_id, label, quantity, required_tags_json, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
    )
    .run(
      id,
      request.project_id,
      actor.id,
      request.label,
      request.quantity,
      JSON.stringify(request.required_tags),
      now,
      now,
    );
  audit({
    event_type: 'inventory.project_need_created',
    user_id: actor.id,
    scope: request.project_id,
    detail: {need_id: id, quantity: request.quantity},
  });
  return toProjectNeed(
    getDb().prepare('SELECT * FROM inventory_project_needs WHERE id = ?').get(id) as InventoryProjectNeedRow,
  );
}

export function matchInventoryProjectNeed(
  actor: AuthUser,
  needId: string,
  input: MatchInventoryProjectNeedRequest,
): InventoryNeedMatchResult {
  const request = MatchInventoryProjectNeedRequestSchema.parse(input);
  const row = getDb().prepare('SELECT * FROM inventory_project_needs WHERE id = ?').get(needId) as
    | InventoryProjectNeedRow
    | undefined;
  if (!row || !canReadProject(actor, row.project_id)) {
    throw new Error('inventory_need_not_found');
  }
  const need = toProjectNeed(row);
  const query = [need.label, ...need.required_tags].join(' ');
  const matches = searchInventory(actor, {
    query,
    project_id: need.project_id,
    limit: request.limit,
  });
  const coverageState =
    matches.some((match) => match.availability_state === 'candidate_available')
      ? 'candidate_available'
      : request.inventory_complete_declared
        ? 'missing'
        : 'unknown';
  audit({
    event_type: 'inventory.project_need_matched',
    user_id: actor.id,
    scope: need.project_id,
    detail: {
      need_id: need.need_id,
      coverage_state: coverageState,
      match_count: matches.length,
      inventory_complete_declared: request.inventory_complete_declared,
    },
  });
  return InventoryNeedMatchResultSchema.parse({
    need,
    coverage_state: coverageState,
    availability_guaranteed: false,
    matches,
  });
}

export function findInventoryDuplicateCandidates(
  actor: AuthUser,
  itemId: string,
): InventoryItem[] {
  const item = getItemRow(itemId);
  if (!item) throw new Error('inventory_item_not_found');
  assertCanReadItem(actor, item);
  const rows = item.project_id
    ? (getDb()
        .prepare(
          `SELECT * FROM inventory_items
           WHERE project_id = ? AND id <> ? AND validation_status <> 'archived'`,
        )
        .all(item.project_id, item.id) as InventoryItemRow[])
    : (getDb()
        .prepare(
          `SELECT * FROM inventory_items
           WHERE owner_id = ? AND scope_type = 'user' AND id <> ?
             AND validation_status <> 'archived'`,
        )
        .all(item.owner_id, item.id) as InventoryItemRow[]);
  const key = normalizedDuplicateKey(item);
  return rows.filter((candidate) => normalizedDuplicateKey(candidate) === key).map(toItem);
}

export function createInventoryItem(actor: AuthUser, input: CreateInventoryItemRequest): InventoryItem {
  const request = CreateInventoryItemRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  assertCanWriteScope(actor, projectId);
  const collectionId = assertCollectionCompatible(actor, request.collection_id, projectId);
  const now = Date.now();
  const id = uuid();
  const visibility = request.visibility_scope ?? (projectId ? 'project' : 'private');
  getDb()
    .prepare(
      `INSERT INTO inventory_items
         (id, owner_id, project_id, collection_id, scope_type, type, label, creator_or_brand,
          item_status, validation_status, intent, quantity, condition, estimated_value,
          replacement_cost, usage_tags_json, source_refs_json, visibility_scope,
          created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .run(
      id,
      actor.id,
      projectId,
      collectionId,
      projectId ? 'project' : 'user',
      request.type,
      request.label,
      request.creator_or_brand ?? null,
      request.item_status,
      request.intent ?? null,
      request.quantity,
      request.condition ?? null,
      request.estimated_value ?? null,
      request.replacement_cost ?? null,
      JSON.stringify(request.usage_tags),
      JSON.stringify(request.source_refs),
      visibility,
      now,
      now,
    );
  getDb()
    .prepare(
      `INSERT INTO inventory_visibility (object_type, object_id, scope_type, scope_id, access_level, created_at)
       VALUES ('item', ?, ?, ?, 'read', ?)`,
    )
    .run(id, projectId ? 'project' : 'user', projectId ?? actor.id, now);
  audit({
    event_type: 'inventory.item_created',
    user_id: actor.id,
    scope: projectId ?? actor.id,
    detail: {item_id: id, project_id: projectId, validation_status: 'candidate'},
  });
  return toItem(getItemRow(id)!);
}

export function listInventoryItems(
  actor: AuthUser,
  input: Partial<ListInventoryItemsRequest> = {},
): InventoryItem[] {
  const request = ListInventoryItemsRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  const includeCandidates = request.include_candidates;
  let rows: InventoryItemRow[];

  if (projectId) {
    if (!canReadProject(actor, projectId)) throw new Error('inventory_scope_denied');
    const canSeeCandidates = includeCandidates && canEditProject(actor, projectId);
    rows = getDb()
      .prepare(
        `SELECT * FROM inventory_items
         WHERE project_id = ?
           AND visibility_scope = 'project'
           AND validation_status IN (${canSeeCandidates ? "'candidate','validated'" : "'validated'"})
         ORDER BY updated_at DESC`,
      )
      .all(projectId) as InventoryItemRow[];
  } else {
    rows = getDb()
      .prepare(
        `SELECT * FROM inventory_items
         WHERE owner_id = ?
           AND scope_type = 'user'
           AND validation_status IN (${includeCandidates ? "'candidate','validated'" : "'validated'"})
         ORDER BY updated_at DESC`,
      )
      .all(actor.id) as InventoryItemRow[];
  }

  return rows.map(toItem);
}

export function getInventoryItem(actor: AuthUser, id: string): InventoryItem {
  const row = getItemRow(id);
  if (!row) throw new Error('inventory_item_not_found');
  assertCanReadItem(actor, row);
  return toItem(row);
}

export function validateInventoryItem(actor: AuthUser, id: string): InventoryItem {
  const row = getItemRow(id);
  if (!row) throw new Error('inventory_item_not_found');
  assertCanValidateItem(actor, row);
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE inventory_items
       SET validation_status = 'validated', updated_at = ?, archived_at = NULL
       WHERE id = ?`,
    )
    .run(now, id);
  audit({
    event_type: 'inventory.item_validated',
    user_id: actor.id,
    scope: row.project_id ?? row.owner_id,
    detail: {item_id: id, project_id: row.project_id},
  });
  return toItem(getItemRow(id)!);
}

export function archiveInventoryItem(actor: AuthUser, id: string): InventoryItem {
  const row = getItemRow(id);
  if (!row) throw new Error('inventory_item_not_found');
  assertCanValidateItem(actor, row);
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE inventory_items
       SET validation_status = 'archived', updated_at = ?, archived_at = ?
       WHERE id = ?`,
    )
    .run(now, now, id);
  invalidateInventoryItemRagResource(actor, id, 'archived');
  audit({
    event_type: 'inventory.item_archived',
    user_id: actor.id,
    scope: row.project_id ?? row.owner_id,
    detail: {item_id: id, project_id: row.project_id},
  });
  return toItem(getItemRow(id)!);
}

export function indexInventoryItem(actor: AuthUser, id: string) {
  getInventoryItem(actor, id);
  return indexInventoryItemRagResource(actor, id);
}

export function ingestInventoryOcrCandidates(
  actor: AuthUser,
  input: IngestInventoryOcrCandidatesRequest,
): InventoryItem[] {
  const request = IngestInventoryOcrCandidatesRequestSchema.parse(input);
  const job = getJob(actor, request.job_id);
  if (job.type !== 'ocr_prepare') throw new Error('inventory_ocr_job_required');
  if (job.status !== 'needs_review' && job.status !== 'completed') {
    throw new Error('inventory_ocr_job_not_ready');
  }
  const payload = job.payload as {
    adapter_id?: unknown;
    project_id?: unknown;
    owner_id?: unknown;
  };
  if (
    payload.adapter_id !== 'morphological-reference-v1' &&
    payload.adapter_id !== 'ocr-submission-v1'
  ) {
    throw new Error('inventory_ocr_adapter_not_supported');
  }
  const projectId = typeof payload.project_id === 'string' ? payload.project_id : null;
  const items = request.candidates.map((candidate) =>
    createInventoryItem(actor, {
      project_id: projectId,
      collection_id: request.collection_id ?? null,
      type: candidate.type,
      label: candidate.label,
      creator_or_brand: candidate.creator_or_brand ?? null,
      item_status: candidate.item_status ?? 'detected',
      intent: candidate.intent ?? null,
      quantity: candidate.quantity ?? 1,
      condition: candidate.condition ?? null,
      estimated_value: candidate.estimated_value ?? null,
      replacement_cost: candidate.replacement_cost ?? null,
      usage_tags: [...(candidate.usage_tags ?? []), 'ocr_candidate'],
      source_refs: [`job:${job.job_id}`, candidate.source_ref],
      visibility_scope: projectId ? 'project' : 'private',
    }),
  );
  audit({
    event_type: 'inventory.ocr_candidates_ingested',
    user_id: actor.id,
    scope: projectId ?? actor.id,
    detail: {job_id: job.job_id, item_count: items.length, project_id: projectId},
  });
  return items;
}

export function scanInventoryPhoto(
  actor: AuthUser,
  input: ScanInventoryPhotoRequest,
): InventoryItem[] {
  const request = ScanInventoryPhotoRequestSchema.parse(input);
  const projectId = request.project_id ?? null;
  if (projectId) {
    const decision = decideScopedPermission({
      actor,
      projectId,
      minimumProjectRole: 'editor',
    });
    if (!decision.allowed) throw new Error('scope_denied');
  }

  const ext = request.image_mime === 'image/jpeg' ? 'jpg' : request.image_mime === 'image/webp' ? 'webp' : request.image_mime === 'image/gif' ? 'gif' : 'png';
  const buf = Buffer.from(request.image_data, 'base64');
  const key = `scans/${actor.id}/${Date.now()}.${ext}`;
  const storageRef = storeFile(key, buf);
  try {
    const stored = resolveStorageImage(storageRef);
    if (stored.mime !== request.image_mime) throw new Error('inventory_scan_mime_mismatch');
  } catch (error) {
    deleteFile(storageRef);
    throw error;
  }

  const item = createInventoryItem(actor, {
    project_id: projectId,
    collection_id: request.collection_id ?? null,
    type: 'custom',
    label: `Scan photo (${new Date().toISOString().slice(0, 10)})`,
    item_status: 'detected',
    quantity: 1,
    usage_tags: ['ocr_candidate', 'photo_scan'],
    source_refs: [storageRef],
    visibility_scope: projectId ? 'project' : 'private',
  });

  audit({
    event_type: 'inventory.photo_scanned',
    user_id: actor.id,
    scope: projectId ?? actor.id,
    detail: {item_id: item.item_id, project_id: projectId, bytes: buf.length, notes: request.notes ?? null},
  });
  return [item];
}

/** Carte lisible des primitives Inventory réellement disponibles pour l’acteur. */
export function buildInventoryCapabilityMap(
  actor: AuthUser,
  projectId: string | null = null,
): InventoryCapabilityMap {
  const items = listInventoryItems(actor, {project_id: projectId, include_candidates: true});
  const collections = listInventoryCollections(actor, {project_id: projectId, include_candidates: true});
  return InventoryCapabilityMapSchema.parse({
    generated_at: Date.now(),
    project_id: projectId,
    counts: {
      readable_items: items.length,
      candidate_items: items.filter((item) => item.validation_status === 'candidate').length,
      validated_items: items.filter((item) => item.validation_status === 'validated').length,
      readable_collections: collections.length,
    },
    primitives: [
      {
        primitive_id: 'inventory_items',
        label: 'Objets inventaire',
        status: 'implemented',
        endpoint_refs: ['/api/v1/inventory/items', '/api/v1/inventory/search'],
        gate: 'lecture scope + validation owner/admin pour canoniser',
        gap: null,
      },
      {
        primitive_id: 'inventory_collections',
        label: 'Collections inventaire',
        status: 'implemented',
        endpoint_refs: ['/api/v1/inventory/collections'],
        gate: 'scope projet ou privé ; validation explicite',
        gap: null,
      },
      {
        primitive_id: 'inventory_project_needs',
        label: 'Besoins projet',
        status: 'partial',
        endpoint_refs: ['/api/v1/inventory/project-needs'],
        gate: 'matching consultatif ; disponibilité jamais garantie',
        gap: 'Il manque une vue registry complète besoin → preuve → décision → output.',
      },
      {
        primitive_id: 'inventory_ocr_candidates',
        label: 'Candidats OCR / photo',
        status: 'partial',
        endpoint_refs: ['/api/v1/inventory/ocr-candidates', '/api/v1/inventory/photo-scan'],
        gate: 'candidate_only jusqu’à revue humaine',
        gap: 'OCR/vision réel et scoring de confiance restent hors de cette carte.',
      },
      {
        primitive_id: 'inventory_output_recipes',
        label: 'Outputs Inventory',
        status: 'future',
        endpoint_refs: [],
        gate: 'aucun export final sans recette et validation',
        gap: 'Les outputs doivent rejoindre l’Output Registry transversal.',
      },
    ],
    source_truth_policy: {
      candidate_is_not_validated: true,
      availability_guaranteed: false,
      project_need_match_is_advisory: true,
      ocr_candidate_requires_review: true,
    },
    forbidden_shortcuts: [
      'candidate_as_canon',
      'availability_guaranteed',
      'ocr_auto_validate',
      'rag_index_without_validated_item',
      'project_need_as_purchase_order',
    ],
    execution_policy: 'diagnostic_only',
  });
}
