import {Router, type Request, type Response} from 'express';

import {CreateCohortSchema, CreateRosterVersionSchema} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createCohort,
  createRosterVersion,
  getCohort,
  getRosterVersion,
  listRosterVersions,
} from '../services/cohorts.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'cohort_error';
  const status = message.endsWith('_not_found') ? 404 : message === 'permission_denied' ? 403 : 400;
  res.status(status).json({error: message});
}

export function createCohortsRouter(): Router {
  const router = Router();

  router.post('/cohorts', requireUser, requireRole('teacher'), (req, res): void => {
    const parsed = CreateCohortSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createCohort(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });

  router.get('/cohorts/:id', requireUser, requireRole('teacher'), (req, res): void => {
    try {
      res.json(getCohort(actor(req), req.params.id ?? ''));
    } catch (error) {
      fail(res, error);
    }
  });

  router.post(
    '/cohorts/:id/roster-versions',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      const parsed = CreateRosterVersionSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
        return;
      }
      try {
        res.status(201).json(createRosterVersion(actor(req), req.params.id ?? '', parsed.data));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get(
    '/cohorts/:id/roster-versions',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        res.json(listRosterVersions(actor(req), req.params.id ?? ''));
      } catch (error) {
        fail(res, error);
      }
    },
  );

  router.get(
    '/cohorts/:id/roster-versions/:versionId',
    requireUser,
    requireRole('teacher'),
    (req, res): void => {
      try {
        res.json(
          getRosterVersion(actor(req), req.params.id ?? '', req.params.versionId ?? ''),
        );
      } catch (error) {
        fail(res, error);
      }
    },
  );

  return router;
}
