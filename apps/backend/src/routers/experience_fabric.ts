import {Router, type Request, type Response} from 'express';

import {
  ExperienceTimelineQuerySchema,
  PrecedentSearchQuerySchema,
  StoryletEvaluationQuerySchema,
  VisualNarrativeGrammarQuerySchema,
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
import {evaluateStorylets} from '../services/storylet_engine.ts';
import {buildGuidedLivingCompanion} from '../services/living_companion.ts';
import {buildVisualNarrativeGrammarReport} from '../services/visual_narrative_grammar.ts';

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

function storyletQuery(req: Request) {
  const domains = typeof req.query.domains === 'string'
    ? req.query.domains.split(',').filter(Boolean)
    : undefined;
  return StoryletEvaluationQuerySchema.safeParse({
    project_id: req.query.project_id,
    workbench_id: req.query.workbench_id,
    guided_session_id: req.query.guided_session_id,
    domains,
    limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
  });
}

function visualGrammarQuery(req: Request) {
  return VisualNarrativeGrammarQuerySchema.safeParse({
    workbench_id: req.query.workbench_id,
    manifest_id: req.query.manifest_id,
    project_id: req.query.project_id,
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

  router.get('/experience/storylets', (req, res): void => {
    const parsed = storyletQuery(req);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(evaluateStorylets(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/experience/visual-grammar', (req, res): void => {
    const parsed = visualGrammarQuery(req);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(buildVisualNarrativeGrammarReport(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/experience/companions/guided-sessions/:sessionId', (req, res): void => {
    if (!req.params.sessionId) {
      res.status(400).json({error: 'missing_session_id'});
      return;
    }
    try {
      res.json(buildGuidedLivingCompanion(actor(req), req.params.sessionId));
    } catch (error) {
      fail(res, error);
    }
  });

  return router;
}
