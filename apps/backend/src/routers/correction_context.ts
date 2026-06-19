import {Router, type Request, type Response} from 'express';

import {
  CreateCorrectionContextSnapshotSchema,
  LinkSubmissionIdentityRequestSchema,
} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  compileCorrectionContextPayload,
  createCorrectionContextSnapshot,
  getCorrectionContextSnapshot,
  linkSubmissionIdentity,
} from '../services/correction_context.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'correction_context_error';
  const status = message.endsWith('_not_found') ? 404 : message === 'permission_denied' ? 403 : 400;
  res.status(status).json({error: message});
}

export function createCorrectionContextRouter(): Router {
  const router = Router();

  router.post(
    '/correction/batches/:id/context-snapshot',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = CreateCorrectionContextSnapshotSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.status(201).json(
          createCorrectionContextSnapshot(actor(req), req.params.id ?? '', parsed.data),
        );
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get(
    '/correction/batches/:id/context-snapshot',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        res.json(getCorrectionContextSnapshot(actor(req), req.params.id ?? ''));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get(
    '/correction/batches/:id/context-payload',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        res.json(compileCorrectionContextPayload(actor(req), req.params.id ?? ''));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.post(
    '/correction/submissions/:id/identity-link',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = LinkSubmissionIdentityRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.json(linkSubmissionIdentity(actor(req), req.params.id ?? '', parsed.data));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  return router;
}
