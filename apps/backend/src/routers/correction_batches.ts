import {Router, type Request, type Response} from 'express';
import {CreateCorrectionBatchRequestSchema} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {createCorrectionBatch, listCorrectionBatches} from '../services/correction_batches.ts';

function actor(req: Request): AuthUser { if (!req.user) throw new Error('unauthorized'); return req.user; }
function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'correction_batch_error';
  if (message.endsWith('_not_found') || message === 'project_not_found') { res.status(404).json({error: message}); return; }
  if (message === 'permission_denied' || message === 'scope_denied') { res.status(403).json({error: message}); return; }
  res.status(400).json({error: message});
}

export function createCorrectionBatchesRouter(): Router {
  const router = Router();
  router.use(requireUser, requireRole('teacher'));
  router.get('/correction/batches', (req: Request, res: Response): void => {
    const projectId = req.query.project_id === undefined ? undefined : typeof req.query.project_id === 'string' && req.query.project_id ? req.query.project_id : '';
    if (projectId === '') { res.status(400).json({error: 'invalid_project_id'}); return; }
    try { res.json(listCorrectionBatches(actor(req), projectId)); } catch (error) { fail(res, error); }
  });
  router.post('/correction/batches', (req: Request, res: Response): void => {
    const parsed = CreateCorrectionBatchRequestSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()}); return; }
    try { res.status(201).json(createCorrectionBatch(actor(req), parsed.data)); } catch (error) { fail(res, error); }
  });
  return router;
}
