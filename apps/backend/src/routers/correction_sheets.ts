import {
  SyncCorrectionSheetDraftRequestSchema,
  UpdateCorrectionSheetDraftRequestSchema,
  ValidateCorrectionSheetDraftRequestSchema,
} from '@masterflow/shared';
import {Router, type Request, type Response} from 'express';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  listCorrectionSheetDrafts,
  syncCorrectionSheetDraft,
  updateCorrectionSheetDraft,
  validateCorrectionSheetDraft,
} from '../services/correction_sheets.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthenticated');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'internal_error';
  const status = message.includes('not_found') ? 404 : message === 'permission_denied' ? 403 : 409;
  res.status(status).json({error: message});
}

export function createCorrectionSheetsRouter(): Router {
  const router = Router();
  router.use(requireUser, requireRole('teacher'));
  router.get('/subject-assignments/:id/correction-sheets', (req, res) => {
    try { res.json(listCorrectionSheetDrafts(actor(req), req.params.id ?? '')); } catch (error) { fail(res, error); }
  });
  router.patch('/correction-sheets/:id', (req, res) => {
    const body = UpdateCorrectionSheetDraftRequestSchema.safeParse(req.body);
    if (!body.success) return void res.status(400).json({error: 'invalid_body', detail: body.error.flatten()});
    try { res.json(updateCorrectionSheetDraft(actor(req), req.params.id ?? '', body.data)); } catch (error) { fail(res, error); }
  });
  router.post('/correction-sheets/:id/sync', (req, res) => {
    const body = SyncCorrectionSheetDraftRequestSchema.safeParse(req.body);
    if (!body.success) return void res.status(400).json({error: 'invalid_body', detail: body.error.flatten()});
    try { res.status(201).json(syncCorrectionSheetDraft(actor(req), req.params.id ?? '', body.data)); } catch (error) { fail(res, error); }
  });
  router.post('/correction-sheets/:id/validate', (req, res) => {
    const body = ValidateCorrectionSheetDraftRequestSchema.safeParse(req.body);
    if (!body.success) return void res.status(400).json({error: 'invalid_body', detail: body.error.flatten()});
    try { res.json(validateCorrectionSheetDraft(actor(req), req.params.id ?? '', body.data)); } catch (error) { fail(res, error); }
  });
  return router;
}
