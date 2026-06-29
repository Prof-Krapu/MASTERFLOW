import {Router, type Request, type Response} from 'express';
import {RecordHelpContextRequestSchema, UpsertProfileRequestSchema} from '@masterflow/shared';
import {z} from 'zod';
import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  getProfile, upsertProfile, updateProfileStatus,
  recordHelpContext, listHelpContext,
} from '../services/learning_mirror_engine.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'learning_mirror_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : 400).json({error: m});
};

export function createLearningMirrorRouter(): Router {
  const r = Router();
  r.use(requireUser);

  // Personal learning profiles
  r.get('/learning-mirror/profiles/:userId', (q, s) => {
    try {
      const p = typeof q.query.project_id === 'string' ? q.query.project_id : null;
      s.json(getProfile(actor(q), q.params.userId ?? '', p));
    } catch (e) { fail(s, e); }
  });
  r.post('/learning-mirror/profiles', requireRole('teacher'), (q, s) => {
    const b = UpsertProfileRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(upsertProfile(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.post('/learning-mirror/profiles/:id/status', requireRole('teacher'), (q, s) => {
    const b = z.object({status: z.enum(['draft', 'proposed', 'user_validated', 'teacher_validated', 'archived'])}).safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body'});
    try { s.json(updateProfileStatus(actor(q), q.params.id ?? '', b.data.status)); } catch (e) { fail(s, e); }
  });

  // Help context snapshots
  r.post('/learning-mirror/help-context', requireRole('teacher'), (q, s) => {
    const b = RecordHelpContextRequestSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(recordHelpContext(actor(q), b.data)); } catch (e) { fail(s, e); }
  });
  r.get('/learning-mirror/help-context/:userId', (q, s) => {
    try { s.json(listHelpContext(actor(q), q.params.userId ?? '')); } catch (e) { fail(s, e); }
  });

  return r;
}
