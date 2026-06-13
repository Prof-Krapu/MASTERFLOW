import {Router, type Request, type Response} from 'express';

import {CreateSchemaTemplateRequestSchema} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createSchemaTemplate,
  getSchemaTemplate,
  listSchemaTemplates,
  validateSchemaTemplate,
} from '../services/schema_templates.ts';

function actor(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[schema_templates] req.user absent malgré requireUser');
  return user;
}

function routeError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'schema_template_error';
  if (message === 'permission_denied') {
    res.status(403).json({error: message});
    return;
  }
  if (message === 'schema_template_not_found') {
    res.status(404).json({error: message});
    return;
  }
  if (
    message === 'template_schema_invalid' ||
    message === 'template_required_field_unknown' ||
    message === 'schema_template_version_exists' ||
    message === 'schema_template_archived' ||
    message === 'schema_template_deprecated'
  ) {
    res.status(400).json({error: message});
    return;
  }
  res.status(500).json({error: 'schema_template_error'});
}

function canUseAdminFilters(req: Request): boolean {
  return req.user?.role === 'admin' || req.user?.role === 'godmode';
}

export function createSchemaTemplatesRouter(): Router {
  const router = Router();

  router.use(requireUser);

  router.get('/schema-templates', (req: Request, res: Response): void => {
    const includeAll = req.query.include_all === '1' || req.query.include_all === 'true';
    const includeDeprecated =
      req.query.include_deprecated === '1' || req.query.include_deprecated === 'true';
    if ((includeAll || includeDeprecated) && !canUseAdminFilters(req)) {
      res.status(403).json({error: 'permission_denied'});
      return;
    }
    res.json({
      results: listSchemaTemplates(actor(req), {includeAll, includeDeprecated}),
    });
  });

  router.get('/schema-templates/:id', (req: Request, res: Response): void => {
    const templateId = req.params.id;
    if (!templateId) {
      res.status(404).json({error: 'schema_template_not_found'});
      return;
    }
    try {
      res.json(getSchemaTemplate(actor(req), templateId));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/schema-templates', (req: Request, res: Response): void => {
    const parsed = CreateSchemaTemplateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createSchemaTemplate(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/schema-templates/:id/validate', (req: Request, res: Response): void => {
    const templateId = req.params.id;
    if (!templateId) {
      res.status(404).json({error: 'schema_template_not_found'});
      return;
    }
    try {
      res.json(validateSchemaTemplate(actor(req), templateId));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
