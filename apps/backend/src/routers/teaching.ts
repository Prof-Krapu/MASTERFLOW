import {Router, type Request, type Response} from 'express';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {getTeachingOverview} from '../services/teaching.ts';

function actor(request: Request): AuthUser {
  if (!request.user) throw new Error('unauthorized');
  return request.user;
}

export function createTeachingRouter(): Router {
  const router = Router();
  router.get('/teaching/overview', requireUser, requireRole('teacher'), (request, response: Response): void => {
    try {
      response.json(getTeachingOverview(actor(request)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'teaching_overview_error';
      response.status(message.endsWith('_denied') ? 403 : 400).json({error: message});
    }
  });
  return router;
}
