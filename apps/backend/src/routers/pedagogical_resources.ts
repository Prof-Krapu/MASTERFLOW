import {Router, type Request, type Response} from 'express';

import {AddAcademicLevelAliasSchema, AdjustPedagogicalClassificationSchema} from '@masterflow/shared';

import {requireRole, requireUser} from '../middleware/auth.ts';
import {
  addAcademicLevelAlias,
  adjustPedagogicalClassification,
  listAcademicFrameworks,
  listClassificationReview,
  pedagogicalResourceStats,
  searchPedagogicalResources,
} from '../services/pedagogical_resource_registry.ts';

export function createPedagogicalResourcesRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/academic-frameworks', (_req: Request, res: Response): void => {
    res.json(listAcademicFrameworks());
  });

  router.get('/pedagogical-resources/search', (req: Request, res: Response): void => {
    const includeCandidates = req.query.include_candidates === '1' || req.query.include_candidates === 'true';
    if (includeCandidates && !['admin', 'godmode'].includes(req.user?.role ?? '')) {
      res.status(403).json({error: 'forbidden'});
      return;
    }
    try {
      res.json(searchPedagogicalResources({
        query: typeof req.query.q === 'string' ? req.query.q : undefined,
        frameworkCode: typeof req.query.framework === 'string' ? req.query.framework : undefined,
        levelCode: typeof req.query.level === 'string' ? req.query.level : undefined,
        software: typeof req.query.software === 'string' ? req.query.software : undefined,
        includeCandidates,
        limit: typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined,
      }));
    } catch (error) {
      const code = error instanceof Error ? error.message : 'search_failed';
      res.status(code.endsWith('_not_found') ? 404 : 400).json({error: code});
    }
  });

  router.get(
    '/pedagogical-resources/classification-review',
    requireRole('teacher'),
    (_req: Request, res: Response): void => {
      res.json({results: listClassificationReview()});
    },
  );

  router.patch(
    '/pedagogical-resources/:id/classification',
    requireRole('teacher'),
    (req: Request, res: Response): void => {
      const parsed = AdjustPedagogicalClassificationSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', issues: parsed.error.issues});
        return;
      }
      try {
        res.json(adjustPedagogicalClassification(req.user!, req.params.id!, parsed.data));
      } catch (error) {
        const code = error instanceof Error ? error.message : 'classification_update_failed';
        res.status(code.endsWith('_not_found') ? 404 : 400).json({error: code});
      }
    },
  );

  router.post(
    '/academic-frameworks/:framework/levels/:level/aliases',
    requireRole('admin'),
    (req: Request, res: Response): void => {
      const parsed = AddAcademicLevelAliasSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', issues: parsed.error.issues});
        return;
      }
      try {
        res.status(201).json(addAcademicLevelAlias(
          req.user!,
          req.params.framework!,
          req.params.level!,
          parsed.data.alias,
          parsed.data.reason,
        ));
      } catch (error) {
        const code = error instanceof Error ? error.message : 'alias_update_failed';
        res.status(code.endsWith('_not_found') ? 404 : 400).json({error: code});
      }
    },
  );

  router.get(
    '/pedagogical-resources/stats',
    requireRole('teacher'),
    (_req: Request, res: Response): void => {
      res.json(pedagogicalResourceStats());
    },
  );

  return router;
}
