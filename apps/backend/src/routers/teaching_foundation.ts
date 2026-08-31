import {Router, type Request, type Response} from 'express';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {getTeachingWorkspaceFoundation} from '../services/teaching_foundation.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthenticated');
  return req.user;
}
export function createTeachingFoundationRouter(): Router {
  const router = Router();
  router.get('/teaching/foundation', requireUser, requireRole('teacher'), (req, res: Response) => {
    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : undefined;
    try {
      res.json(getTeachingWorkspaceFoundation(actor(req), projectId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'teaching_foundation_failed';
      res.status(message.includes('not_found') ? 404 : 400).json({error: message});
    }
  });
  return router;
}
