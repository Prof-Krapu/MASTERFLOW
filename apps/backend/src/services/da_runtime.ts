import type {GeneratedAsset, ReviewGeneratedAssetRequest, StoreGeneratedAssetRequest} from '@masterflow/shared';
import {createHash} from 'node:crypto';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {deleteFile, storeFile} from '../lib/storage.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface GeneratedAssetRow {
  id: string;
  manifest_id: string | null;
  job_id: string | null;
  owner_id: string;
  project_id: string | null;
  asset_type: 'image' | 'visual_manifest' | 'badge' | 'render' | 'export';
  status: 'candidate' | 'approved' | 'rejected' | 'archived';
  mime_type: string | null;
  storage_ref: string | null;
  thumbnail_ref: string | null;
  metadata_json: string;
  review_note: string | null;
  reviewed_by: string | null;
  reviewed_at: number | null;
  created_at: number;
  updated_at: number;
}

function toDTO(row: GeneratedAssetRow): GeneratedAsset {
  return {
    id: row.id,
    manifest_id: row.manifest_id,
    job_id: row.job_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    asset_type: row.asset_type,
    status: row.status,
    mime_type: row.mime_type,
    storage_ref: row.storage_ref,
    thumbnail_ref: row.thumbnail_ref,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    review_note: row.review_note,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function canAccessAsset(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function assertAssetAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}): void {
  if (!canAccessAsset(actor, row)) throw new Error('asset_not_found');
}

export function storeGeneratedAsset(actor: AuthUser, data: StoreGeneratedAssetRequest): GeneratedAsset {
  if (data.manifest_id) {
    const manifest = getDb().prepare('SELECT id FROM visual_manifests WHERE id = ?').get(data.manifest_id);
    if (!manifest) throw new Error('visual_manifest_not_found');
  }
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
      INSERT INTO generated_assets
        (id, manifest_id, job_id, owner_id, project_id, asset_type, status, mime_type, storage_ref, thumbnail_ref, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?, ?, ?)
    `).run(
      id, data.manifest_id ?? null, data.job_id ?? null, actor.id,
      null, // project_id — set below via ensureColumn if needed
      data.asset_type,
      data.mime_type ?? null, data.storage_ref ?? null, data.thumbnail_ref ?? null,
      JSON.stringify(data.metadata ?? {}), now, now,
    );

  audit({event_type: 'da.asset_stored', user_id: actor.id, detail: {asset_id: id, asset_type: data.asset_type, manifest_id: data.manifest_id}});
  return toDTO(getDb().prepare('SELECT * FROM generated_assets WHERE id = ?').get(id) as GeneratedAssetRow);
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/json': 'json',
  'text/plain': 'txt',
};

/**
 * Écrit les octets puis crée l'asset candidat. Si l'insertion BDD échoue,
 * le fichier est retiré afin de ne pas laisser d'orphelin sur disque.
 */
export function storeGeneratedAssetFile(
  actor: AuthUser,
  data: Omit<StoreGeneratedAssetRequest, 'storage_ref'>,
  content: Buffer,
): GeneratedAsset {
  const ext = data.mime_type ? MIME_EXTENSIONS[data.mime_type] : undefined;
  if (!ext) throw new Error('asset_mime_unsupported');
  const storageRef = storeFile(`assets/${actor.id}/${uuid()}.${ext}`, content);
  try {
    return storeGeneratedAsset(actor, {
      ...data,
      storage_ref: storageRef,
      metadata: {
        ...(data.metadata ?? {}),
        size_bytes: content.length,
        sha256: createHash('sha256').update(content).digest('hex'),
      },
    });
  } catch (error) {
    deleteFile(storageRef);
    throw error;
  }
}

export function getAsset(actor: AuthUser, assetId: string): GeneratedAsset {
  const row = getDb().prepare('SELECT * FROM generated_assets WHERE id = ?').get(assetId) as GeneratedAssetRow | undefined;
  if (!row) throw new Error('asset_not_found');
  assertAssetAccess(actor, row);
  return toDTO(row);
}

export function listAssets(actor: AuthUser, manifestId?: string, projectId?: string, limit = 50): GeneratedAsset[] {
  if (manifestId) {
    return (getDb().prepare(
      'SELECT * FROM generated_assets WHERE manifest_id = ? ORDER BY created_at DESC LIMIT ?',
    ).all(manifestId, limit) as GeneratedAssetRow[]).filter((row) => canAccessAsset(actor, row)).map(toDTO);
  }
  if (projectId) {
    return (getDb().prepare(
      'SELECT * FROM generated_assets WHERE project_id = ? ORDER BY created_at DESC LIMIT ?',
    ).all(projectId, limit) as GeneratedAssetRow[]).filter((row) => canAccessAsset(actor, row)).map(toDTO);
  }
  return (getDb().prepare(
    'SELECT * FROM generated_assets WHERE owner_id = ? ORDER BY created_at DESC LIMIT ?',
  ).all(actor.id, limit) as GeneratedAssetRow[]).map(toDTO);
}

export function reviewAsset(actor: AuthUser, assetId: string, review: ReviewGeneratedAssetRequest): GeneratedAsset {
  const row = getDb().prepare('SELECT * FROM generated_assets WHERE id = ?').get(assetId) as GeneratedAssetRow | undefined;
  if (!row) throw new Error('asset_not_found');
  assertAssetAccess(actor, row);
  if (row.status === 'archived') throw new Error('asset_archived');

  const now = Date.now();
  getDb().prepare(`
    UPDATE generated_assets SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?
  `).run(review.status, review.review_note ?? null, actor.id, now, now, assetId);

  audit({event_type: 'da.asset_reviewed', user_id: actor.id, detail: {asset_id: assetId, status: review.status}});
  return toDTO(getDb().prepare('SELECT * FROM generated_assets WHERE id = ?').get(assetId) as GeneratedAssetRow);
}
