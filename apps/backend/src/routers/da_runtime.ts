import {Router, type Request, type Response} from 'express';
import {ReviewGeneratedAssetRequestSchema, StoreGeneratedAssetRequestSchema} from '@masterflow/shared';
import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {storeGeneratedAsset, getAsset, listAssets, reviewAsset} from '../services/da_runtime.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'da_runtime_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : m.endsWith('_archived') ? 409 : 400).json({error: m});
};

export function createDaRuntimeRouter(): Router {
  const r = Router();
  r.use(requireUser, requireRole('teacher'));

  r.get('/da/assets', (q, s) => {
    try {
      const manifestId = typeof q.query.manifest_id === 'string' ? q.query.manifest_id : undefined;
      const projectId = typeof q.query.project_id === 'string' ? q.query.project_id : undefined;
      s.json(listAssets(actor(q), manifestId, projectId));
    } catch (e) { fail(s, e); }
  });

  r.get('/da/assets/by-manifest/:manifestId', (q, s) => {
    try {
      s.json(listAssets(actor(q), q.params.manifestId ?? ''));
    } catch (e) { fail(s, e); }
  });

  r.get('/da/assets/:id', (q, s) => {
    try { s.json(getAsset(actor(q), q.params.id ?? '')); } catch (e) { fail(s, e); }
  });

  r.post('/da/assets', (q, s) => {
    const b = StoreGeneratedAssetRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(storeGeneratedAsset(actor(q), b.data)); } catch (e) { fail(s, e); }
  });

  r.post('/da/assets/:id/review', (q, s) => {
    const b = ReviewGeneratedAssetRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(reviewAsset(actor(q), q.params.id ?? '', b.data)); } catch (e) { fail(s, e); }
  });

  return r;
}
