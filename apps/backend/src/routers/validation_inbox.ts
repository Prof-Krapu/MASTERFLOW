import {Router} from 'express';
import type {Request, Response} from 'express';

import {DecideValidationInboxItemRequestSchema} from '@masterflow/shared';

import {requireRole, requireUser} from '../middleware/auth.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {
  decideValidationInboxItem,
  getValidationInboxItemFor,
  listValidationInboxItems,
} from '../services/validation_inbox.ts';

function authUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[validation_inbox] req.user absent malgré requireUser');
  return user;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function createValidationInboxRouter(): Router {
  const router = Router();

  router.get('/validation-inbox', requireUser, requireRole('teacher'), (req: Request, res: Response): void => {
    res.json(listValidationInboxItems(authUser(req)));
  });

  router.get('/validation-inbox/:id', requireUser, requireRole('teacher'), (req: Request, res: Response): void => {
    const id = req.params.id;
    const item = id ? getValidationInboxItemFor(authUser(req), id) : null;
    if (!item) {
      res.status(404).json({error: 'validation_inbox_item_not_found'});
      return;
    }
    res.json(item);
  });

  router.post('/validation-inbox/:id/decision', requireUser, requireRole('teacher'), (req: Request, res: Response): void => {
    const id = req.params.id;
    const parsed = DecideValidationInboxItemRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(decideValidationInboxItem(authUser(req), id ?? '', parsed.data));
    } catch (e) {
      const message = errMessage(e);
      const status = message.includes('not_supported') ? 422 : 409;
      res.status(status).json({error: 'validation_inbox_decision_failed', message});
    }
  });

  return router;
}
