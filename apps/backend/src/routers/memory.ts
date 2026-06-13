import {Router, type Request, type Response} from 'express';

import {CreateMemoryCardSchema} from '@masterflow/shared';
import {z} from 'zod';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createMemoryCard,
  getMemoryCard,
  invalidateMemoryCard,
  validateMemoryCard,
} from '../services/memory_cards.ts';

const DecisionSchema = z.object({decision: z.enum(['active', 'rejected'])});

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'memory_error';
  const status = message === 'project_not_found' || message === 'memory_card_not_found' ? 404 : 400;
  res.status(status).json({error: message});
}

export function createMemoryRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.post('/memory/cards', (req, res): void => {
    const parsed = CreateMemoryCardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createMemoryCard(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/memory/cards/:id', (req, res): void => {
    try {
      res.json(getMemoryCard(actor(req), req.params.id ?? ''));
    } catch (error) {
      fail(res, error);
    }
  });

  router.post('/memory/cards/:id/validate', (req, res): void => {
    const parsed = DecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(validateMemoryCard(actor(req), req.params.id ?? '', parsed.data.decision));
    } catch (error) {
      fail(res, error);
    }
  });

  router.post('/memory/cards/:id/invalidate', (req, res): void => {
    try {
      res.json(invalidateMemoryCard(actor(req), req.params.id ?? ''));
    } catch (error) {
      fail(res, error);
    }
  });

  return router;
}
