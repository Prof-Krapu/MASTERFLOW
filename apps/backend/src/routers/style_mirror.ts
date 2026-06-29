import {Router, type Request, type Response} from 'express';
import {UpsertStyleMirrorRequestSchema} from '@masterflow/shared';
import {z} from 'zod';
import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  getProfile, upsertProfile, updateProfileStatus,
} from '../services/style_mirror_engine.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'style_mirror_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : 400).json({error: m});
};

export function createStyleMirrorRouter(): Router {
  const r = Router();
  r.use(requireUser);

  r.get('/style-mirror/profiles/:userId', (q, s) => {
    try {
      const personaId = typeof q.query.persona_id === 'string' ? q.query.persona_id : null;
      const projectId = typeof q.query.project_id === 'string' ? q.query.project_id : null;
      s.json(getProfile(actor(q), q.params.userId ?? '', personaId, projectId));
    } catch (e) { fail(s, e); }
  });

  r.post('/style-mirror/profiles', (q, s) => {
    const b = UpsertStyleMirrorRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(upsertProfile(actor(q), b.data)); } catch (e) { fail(s, e); }
  });

  r.post('/style-mirror/profiles/:id/status', (q, s) => {
    const b = z.object({status: z.enum(['draft', 'active', 'archived'])}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(updateProfileStatus(actor(q), q.params.id ?? '', b.data.status)); } catch (e) { fail(s, e); }
  });

  return r;
}
