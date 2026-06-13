import {Router, type Request, type Response} from 'express';

import {
  cancelJob,
  getJob,
  listJobEvents,
  listJobs,
  retryJob,
} from '../services/jobs.ts';
import {requireUser} from '../middleware/auth.ts';
import type {AuthUser} from '../middleware/auth.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createJobsRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/jobs', (req: Request, res: Response) => {
    res.json(listJobs(actor(req)));
  });

  router.get('/jobs/:id', (req: Request, res: Response) => {
    try {
      res.json(getJob(actor(req), req.params.id ?? ''));
    } catch {
      res.status(404).json({error: 'job_not_found'});
    }
  });

  router.get('/jobs/:id/events', (req: Request, res: Response) => {
    try {
      res.json(listJobEvents(actor(req), req.params.id ?? ''));
    } catch {
      res.status(404).json({error: 'job_not_found'});
    }
  });

  router.post('/jobs/:id/cancel', (req: Request, res: Response) => {
    try {
      res.json(cancelJob(actor(req), req.params.id ?? ''));
    } catch (error) {
      const reason = message(error);
      const status = reason === 'job_not_found' ? 404 : reason === 'job_manage_denied' ? 403 : 409;
      res.status(status).json({error: reason});
    }
  });

  router.post('/jobs/:id/retry', (req: Request, res: Response) => {
    try {
      res.json(retryJob(actor(req), req.params.id ?? ''));
    } catch (error) {
      const reason = message(error);
      const status = reason === 'job_not_found' ? 404 : reason === 'job_manage_denied' ? 403 : 409;
      res.status(status).json({error: reason});
    }
  });

  return router;
}
