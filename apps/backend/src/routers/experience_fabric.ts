import {Router, type Request, type Response} from 'express';

import {
  ExperienceTimelineQuerySchema,
  PrecedentSearchQuerySchema,
} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  buildExperienceSnapshot,
  listExperienceEvents,
} from '../services/experience_fabric.ts';
import {
  getPrecedentCase,
  searchPrecedentCases,
} from '../services/precedent_engine.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function query(req: Request) {
  const streams = typeof req.query.streams === 'string'
    ? req.query.streams.split(',').filter(Boolean)
    : undefined;
  return ExperienceTimelineQuerySchema.safeParse({
    project_id: req.query.project_id,
    streams,
    from: typeof req.query.from === 'string' ? Number(req.query.from) : undefined,
    to: typeof req.query.to === 'string' ? Number(req.query.to) : undefined,
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
  });
}

function precedentQuery(req: Request) {
  const sourceKinds = typeof req.query.source_kinds === 'string'
    ? req.query.source_kinds.split(',').filter(Boolean)
    : undefined;
  const tags = typeof req.query.tags === 'string'
    ? req.query.tags.split(',').filter(Boolean)
    : undefined;
  return PrecedentSearchQuerySchema.safeParse({
    project_id: req.query.project_id,
    q: req.query.q,
    tags,
    source_kinds: sourceKinds,
    include_candidates: req.query.include_candidates === 'true',
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
  });
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'experience_fabric_error';
  res.status(message === 'project_not_found' || message === 'precedent_not_found' ? 404 : 400).json({error: message});
}

export function createExperienceFabricRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/experience/events', (req, res): void => {
    const parsed = query(req);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(listExperienceEvents(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/experience/snapshot', (req, res): void => {
    const parsed = query(req);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(buildExperienceSnapshot(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/experience/precedents', (req, res): void => {
    const parsed = precedentQuery(req);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(searchPrecedentCases(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/experience/precedents/:caseId', (req, res): void => {
    if (!req.params.caseId) {
      res.status(400).json({error: 'missing_case_id'});
      return;
    }
    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : undefined;
    try {
      res.json(getPrecedentCase(actor(req), req.params.caseId, projectId));
    } catch (error) {
      fail(res, error);
    }
  });

  return router;
}
