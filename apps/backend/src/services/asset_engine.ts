import type {
  AssetConsumerBinding,
  AssetProviderBoundaryPlan,
  AssetProviderBoundaryRequest,
  CreateAssetConsumerBindingRequest,
  ReviewAssetConsumerBindingRequest,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface AssetBindingRow {
  id: string;
  asset_id: string;
  owner_id: string;
  project_id: string | null;
  consumer_kind: AssetConsumerBinding['consumer_kind'];
  consumer_ref: string;
  state_key: string;
  status: AssetConsumerBinding['status'];
  storage_ref: string | null;
  parent_binding_id: string | null;
  provenance_refs_json: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: number | null;
  created_at: number;
  updated_at: number;
}

interface AssetRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  status: 'candidate' | 'approved' | 'rejected' | 'archived';
  storage_ref: string | null;
}

function canAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function lineageRefs(row: AssetBindingRow): string[] {
  const refs: string[] = [];
  let current = row.parent_binding_id;
  const seen = new Set<string>([row.id]);
  while (current && refs.length < 50) {
    if (seen.has(current)) throw new Error('asset_binding_lineage_cycle');
    seen.add(current);
    refs.push(current);
    const parent = getDb().prepare(
      'SELECT parent_binding_id FROM asset_consumer_bindings WHERE id = ?',
    ).get(current) as {parent_binding_id: string | null} | undefined;
    current = parent?.parent_binding_id ?? null;
  }
  return refs;
}

function toDTO(row: AssetBindingRow): AssetConsumerBinding {
  return {
    id: row.id,
    asset_id: row.asset_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    consumer_kind: row.consumer_kind,
    consumer_ref: row.consumer_ref,
    state_key: row.state_key,
    status: row.status,
    storage_ref: row.storage_ref,
    parent_binding_id: row.parent_binding_id,
    lineage_refs: lineageRefs(row),
    provenance_refs: JSON.parse(row.provenance_refs_json) as string[],
    review_note: row.review_note,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getBindingRow(bindingId: string): AssetBindingRow {
  const row = getDb().prepare('SELECT * FROM asset_consumer_bindings WHERE id = ?').get(bindingId) as AssetBindingRow | undefined;
  if (!row) throw new Error('asset_binding_not_found');
  return row;
}

export function createAssetConsumerBinding(
  actor: AuthUser,
  data: CreateAssetConsumerBindingRequest,
): AssetConsumerBinding {
  const asset = getDb().prepare(
    'SELECT id, owner_id, project_id, status, storage_ref FROM generated_assets WHERE id = ?',
  ).get(data.asset_id) as AssetRow | undefined;
  if (!asset || !canAccess(actor, asset)) throw new Error('asset_not_found');
  if (asset.status === 'rejected' || asset.status === 'archived') throw new Error('asset_not_bindable');

  let parent: AssetBindingRow | undefined;
  if (data.parent_binding_id) {
    parent = getBindingRow(data.parent_binding_id);
    if (!canAccess(actor, parent)) throw new Error('asset_binding_not_found');
    if (parent.consumer_kind !== data.consumer_kind || parent.consumer_ref !== data.consumer_ref) {
      throw new Error('asset_binding_lineage_consumer_mismatch');
    }
  }

  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO asset_consumer_bindings
      (id, asset_id, owner_id, project_id, consumer_kind, consumer_ref, state_key, status,
       storage_ref, parent_binding_id, provenance_refs_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?, ?)
  `).run(
    id,
    asset.id,
    actor.id,
    asset.project_id,
    data.consumer_kind,
    data.consumer_ref,
    data.state_key,
    asset.storage_ref,
    parent?.id ?? null,
    JSON.stringify(data.provenance_refs),
    now,
    now,
  );
  audit({
    event_type: 'asset.consumer_binding_created',
    user_id: actor.id,
    detail: {binding_id: id, asset_id: asset.id, consumer_kind: data.consumer_kind, state_key: data.state_key},
  });
  return toDTO(getBindingRow(id));
}

export function listAssetConsumerBindings(
  actor: AuthUser,
  filters: {consumerKind?: string; consumerRef?: string; stateKey?: string} = {},
): AssetConsumerBinding[] {
  const rows = getDb().prepare(
    'SELECT * FROM asset_consumer_bindings ORDER BY created_at DESC LIMIT 200',
  ).all() as AssetBindingRow[];
  return rows
    .filter((row) => canAccess(actor, row))
    .filter((row) => !filters.consumerKind || row.consumer_kind === filters.consumerKind)
    .filter((row) => !filters.consumerRef || row.consumer_ref === filters.consumerRef)
    .filter((row) => !filters.stateKey || row.state_key === filters.stateKey)
    .map(toDTO);
}

export function reviewAssetConsumerBinding(
  actor: AuthUser,
  bindingId: string,
  review: ReviewAssetConsumerBindingRequest,
): AssetConsumerBinding {
  const row = getBindingRow(bindingId);
  if (!canAccess(actor, row)) throw new Error('asset_binding_not_found');
  const asset = getDb().prepare('SELECT status FROM generated_assets WHERE id = ?').get(row.asset_id) as {status: string} | undefined;
  if (review.status === 'approved' && asset?.status !== 'approved') {
    throw new Error('asset_binding_asset_review_required');
  }
  const now = Date.now();
  getDb().prepare(`
    UPDATE asset_consumer_bindings
    SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
    WHERE id = ?
  `).run(review.status, review.review_note ?? null, actor.id, now, now, bindingId);
  audit({
    event_type: 'asset.consumer_binding_reviewed',
    user_id: actor.id,
    detail: {binding_id: bindingId, status: review.status},
  });
  return toDTO(getBindingRow(bindingId));
}

export function compileAssetProviderBoundary(data: AssetProviderBoundaryRequest): AssetProviderBoundaryPlan {
  return {
    ...data,
    credential_secret_ref: data.credential_secret_ref ?? null,
    execution_policy: 'compile_only',
    provider_call_allowed: false,
    canon_promotion_allowed: false,
    required_gates: [
      'provider_and_budget_validation',
      'candidate_asset_human_review',
      'consumer_mapping_human_review',
      'deployment_validation',
    ],
  };
}
