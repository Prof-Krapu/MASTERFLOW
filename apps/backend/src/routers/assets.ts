import {Router, type Request, type Response} from 'express';
import multer from 'multer';
import {GeneratedAssetTypeSchema, UploadBase64AssetRequestSchema} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {getAsset, listAssets, storeGeneratedAssetFile} from '../services/da_runtime.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'assets_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : 400).json({error: m});
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 20 * 1024 * 1024},
});
function assetType(value: unknown): 'image' | 'visual_manifest' | 'badge' | 'render' | 'export' {
  const parsed = GeneratedAssetTypeSchema.safeParse(value);
  if (!parsed.success) throw new Error('asset_type_invalid');
  return parsed.data;
}

function base64Buffer(value: string): Buffer {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 === 1) {
    throw new Error('asset_base64_invalid');
  }
  return Buffer.from(value, 'base64');
}

export function createAssetsRouter(): Router {
  const r = Router();
  r.use('/assets', requireUser, requireRole('teacher'));

  r.post('/assets/upload', upload.single('file'), (q: Request, s: Response): void => {
    try {
      if (!q.file) { s.status(400).json({error: 'file_required'}); return; }
      const type = assetType(typeof q.body.asset_type === 'string' ? q.body.asset_type : 'image');
      const asset = storeGeneratedAssetFile(actor(q), {
        asset_type: type,
        mime_type: q.file.mimetype,
        metadata: {
          original_name: q.file.originalname,
          size_bytes: q.file.size,
        },
      }, q.file.buffer);
      s.status(201).json(asset);
    } catch (e) { fail(s, e); }
  });

  r.post('/assets/upload-base64', (q: Request, s: Response): void => {
    try {
      const parsed = UploadBase64AssetRequestSchema.safeParse(q.body);
      if (!parsed.success) { s.status(400).json({error: 'asset_payload_invalid'}); return; }
      const {data, mime: mimeType, asset_type: type} = parsed.data;
      const buf = base64Buffer(data);
      const asset = storeGeneratedAssetFile(actor(q), {
        asset_type: type,
        mime_type: mimeType,
        metadata: {size_bytes: buf.length},
      }, buf);
      s.status(201).json(asset);
    } catch (e) { fail(s, e); }
  });

  r.get('/assets', (q: Request, s: Response): void => {
    try {
      const manifestId = typeof q.query.manifest_id === 'string' ? q.query.manifest_id : undefined;
      const projectId = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listAssets(actor(q), manifestId, projectId));
    } catch (e) { fail(s, e); }
  });

  r.get('/assets/:id', (q: Request, s: Response): void => {
    try { s.json(getAsset(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });

  return r;
}
