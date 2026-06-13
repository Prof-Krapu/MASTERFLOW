import {
  CreateInventoryCollectionRequestSchema,
  CreateInventoryItemRequestSchema,
  IngestInventoryOcrCandidatesRequestSchema,
  InventoryCollectionSchema,
  InventoryItemSchema,
  ListInventoryItemsRequestSchema,
  ROLE_RANK,
  type CreateInventoryCollectionRequest,
  type CreateInventoryItemRequest,
  type InventoryCollection,
  type InventoryItem,
  type IngestInventoryOcrCandidatesRequest,
  type ListInventoryItemsRequest,
  type ProjectMemberRole,
} from '@masterflow/shared';

import {
  getDb,
  type InventoryCollectionRow,
  type InventoryItemRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
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
          validation_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)`,
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
