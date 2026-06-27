import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {storeGeneratedAsset, getAsset, listAssets, reviewAsset} from '../src/services/da_runtime.ts';

const teacher: AuthUser = {id: 'da-test-teacher', username: 'da_test_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'da-test-outsider', username: 'da_test_outsider', role: 'teacher'};
const now = Date.now();

beforeAll(async () => {
  await seedAll();
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
});

describe('da_runtime', () => {
  it('storeGeneratedAsset crée un asset candidate', () => {
    const asset = storeGeneratedAsset(teacher, {
      asset_type: 'image',
      mime_type: 'image/png',
      storage_ref: 's3://bucket/test.png',
      metadata: {prompt: 'A cat', model: 'dall-e-3'},
    });
    expect(asset.asset_type).toBe('image');
    expect(asset.status).toBe('candidate');
    expect(asset.storage_ref).toBe('s3://bucket/test.png');
    expect(asset.metadata).toEqual({prompt: 'A cat', model: 'dall-e-3'});
  });

  it('getAsset récupère par id', () => {
    const created = storeGeneratedAsset(teacher, {asset_type: 'badge', storage_ref: 's3://bucket/badge.svg'});
    const fetched = getAsset(teacher, created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.asset_type).toBe('badge');
    expect(fetched.manifest_id).toBeNull();
  });

  it('getAsset lève pour id inconnu', () => {
    expect(() => getAsset(teacher, 'nonexistent')).toThrow('asset_not_found');
  });

  it('listAssets liste par owner', () => {
    const assets = listAssets(teacher);
    expect(assets.length).toBeGreaterThanOrEqual(2);
  });

  it('listAssets retourne vide pour manifest_id inconnu', () => {
    const assets = listAssets(teacher, 'nonexistent-manifest');
    expect(assets).toHaveLength(0);
  });

  it('reviewAsset approuve un asset', () => {
    const asset = storeGeneratedAsset(teacher, {asset_type: 'render', storage_ref: 's3://bucket/render.png'});
    const reviewed = reviewAsset(teacher, asset.id, {status: 'approved', review_note: 'Conforme à la DA'});
    expect(reviewed.status).toBe('approved');
    expect(reviewed.review_note).toBe('Conforme à la DA');
    expect(reviewed.reviewed_by).toBe(teacher.id);
  });

  it('bloque la lecture et la revue cross-owner', () => {
    const asset = storeGeneratedAsset(teacher, {asset_type: 'image', storage_ref: 's3://bucket/private.png'});
    expect(() => getAsset(outsider, asset.id)).toThrow('asset_not_found');
    expect(listAssets(outsider).map((item) => item.id)).not.toContain(asset.id);
    expect(() => reviewAsset(outsider, asset.id, {status: 'approved'})).toThrow('asset_not_found');
  });

  it('reviewAsset rejette un asset avec note', () => {
    const asset = storeGeneratedAsset(teacher, {asset_type: 'export', storage_ref: 's3://bucket/export.json'});
    const reviewed = reviewAsset(teacher, asset.id, {status: 'rejected', review_note: 'À refaire — couleurs non conformes'});
    expect(reviewed.status).toBe('rejected');
    expect(reviewed.review_note).toBe('À refaire — couleurs non conformes');
  });

  it('reviewAsset lève pour asset archiver', () => {
    expect(() => reviewAsset(teacher, 'nonexistent', {status: 'approved'})).toThrow('asset_not_found');
  });
});
