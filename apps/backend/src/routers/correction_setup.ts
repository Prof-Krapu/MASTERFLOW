import {Router, type Request, type Response} from 'express';

import {
  CreateInstitutionalGradingProfileRequestSchema,
  CreateRubricTemplateRequestSchema,
  CreateRubricVersionRequestSchema,
} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createInstitutionalGradingProfile,
  createRubricTemplate,
  createRubricVersion,
  listInstitutionalGradingProfiles,
  listRubricTemplates,
  listRubricVersions,
  validateInstitutionalGradingProfile,
  validateRubricVersion,
} from '../services/correction_setup.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function projectId(req: Request): string | undefined {
  if (req.query.project_id === undefined) return undefined;
  return typeof req.query.project_id === 'string' && req.query.project_id.length > 0
    ? req.query.project_id
    : '';
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'correction_setup_error';
  if (message.endsWith('_not_found') || message === 'project_not_found') {
    res.status(404).json({error: message});
    return;
  }
  if (message === 'permission_denied' || message === 'scope_denied') {
    res.status(403).json({error: message});
    return;
  }
  res.status(400).json({error: message});
}

export function createCorrectionSetupRouter(): Router {
  const router = Router();
  router.use(requireUser, requireRole('teacher'));

  router.get('/correction/rubric-templates', (req, res): void => {
    try {
      const scope = projectId(req);
      if (scope === '') throw new Error('invalid_project_id');
      res.json(listRubricTemplates(actor(req), scope));
    } catch (error) { fail(res, error); }
  });

  router.post('/correction/rubric-templates', (req, res): void => {
    const parsed = CreateRubricTemplateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try { res.status(201).json(createRubricTemplate(actor(req), parsed.data)); } catch (error) { fail(res, error); }
  });

  router.get('/correction/rubric-templates/:id/versions', (req, res): void => {
    try { res.json(listRubricVersions(actor(req), req.params.id ?? '')); } catch (error) { fail(res, error); }
  });

  router.post('/correction/rubric-templates/:id/versions', (req, res): void => {
    const parsed = CreateRubricVersionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try { res.status(201).json(createRubricVersion(actor(req), req.params.id ?? '', parsed.data)); } catch (error) { fail(res, error); }
  });

  router.post('/correction/rubric-versions/:id/validate', (req, res): void => {
    try { res.json(validateRubricVersion(actor(req), req.params.id ?? '')); } catch (error) { fail(res, error); }
  });

  router.get('/correction/grading-profiles', (req, res): void => {
    try {
      const scope = projectId(req);
      if (scope === '') throw new Error('invalid_project_id');
      res.json(listInstitutionalGradingProfiles(actor(req), scope));
    } catch (error) { fail(res, error); }
  });

  router.post('/correction/grading-profiles', (req, res): void => {
    const parsed = CreateInstitutionalGradingProfileRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try { res.status(201).json(createInstitutionalGradingProfile(actor(req), parsed.data)); } catch (error) { fail(res, error); }
  });

  router.post('/correction/grading-profiles/:id/validate', (req, res): void => {
    try { res.json(validateInstitutionalGradingProfile(actor(req), req.params.id ?? '')); } catch (error) { fail(res, error); }
  });

  return router;
}
