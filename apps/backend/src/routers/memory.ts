import {Router, type Request, type Response} from 'express';

import {
  CreateMemoryCardLinkSchema,
  CreateMemoryCardSchema,
  DecideMemoryCardLinkSchema,
} from '@masterflow/shared';
import {z} from 'zod';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createMemoryCard,
  createMemoryCardLink,
  decideMemoryCardLink,
  getMemoryCard,
  getMemoryGraphHealth,
  invalidateMemoryCard,
  validateMemoryCard,
  listMemoryCardLinks,
  listMemoryCards,
} from '../services/memory_cards.ts';

const DecisionSchema = z.object({decision: z.enum(['active', 'rejected'])});

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'memory_error';
  const status = [
    'project_not_found',
    'memory_card_not_found',
    'memory_card_link_not_found',
  ].includes(message) ? 404 : 400;
  res.status(status).json({error: message});
}

export function createMemoryRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/memory/cards', (req, res): void => {
    const parsed = z.object({
      project_id: z.string().min(1).optional(),
      scope: z.enum(['user', 'project']).optional(),
      status: z.enum(['candidate', 'active', 'stale', 'archived', 'rejected']).optional(),
    }).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    if (parsed.data.scope === 'project' && !parsed.data.project_id) {
      res.status(400).json({error: 'project_id_required'});
      return;
    }
    try {
      const projectId = parsed.data.scope === 'user'
        ? null
        : parsed.data.project_id;
      res.json(listMemoryCards(actor(req), {
        projectId,
        status: parsed.data.status,
      }));
    } catch (error) {
      fail(res, error);
    }
  });

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

  router.get('/memory/cards/:id/links', (req, res): void => {
    try {
      res.json(listMemoryCardLinks(actor(req), req.params.id ?? ''));
    } catch (error) {
      fail(res, error);
    }
  });

  router.post('/memory/cards/:id/links', (req, res): void => {
    const parsed = CreateMemoryCardLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createMemoryCardLink(actor(req), req.params.id ?? '', parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.post('/memory/links/:id/decide', (req, res): void => {
    const parsed = DecideMemoryCardLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(decideMemoryCardLink(actor(req), req.params.id ?? '', parsed.data.decision));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/memory/health', (req, res): void => {
    const parsed = z.object({project_id: z.string().min(1).optional()}).safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(getMemoryGraphHealth(actor(req), parsed.data.project_id ?? null));
    } catch (error) {
      fail(res, error);
    }
  });

  return router;
}
