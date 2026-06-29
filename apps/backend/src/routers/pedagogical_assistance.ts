import {
  PedagogicalAssistanceRequestSchema,
} from '@masterflow/shared';
import {Router, type Request} from 'express';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {classifyPedagogicalAssistance} from '../services/pedagogical_integrity.ts';

function actor(request: Request): AuthUser {
  if (!request.user) throw new Error('unauthenticated');
  return request.user;
}

/** Surface read-only : le rôle vient toujours du token, jamais du body client. */
export function createPedagogicalAssistanceRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.post('/pedagogical-assistance/classify', (request, response) => {
    const body = PedagogicalAssistanceRequestSchema.safeParse(request.body);
    if (!body.success) {
      response.status(400).json({error: 'invalid_body', detail: body.error.flatten()});
      return;
    }

    response.json(classifyPedagogicalAssistance({
      ...body.data,
      role: actor(request).role,
    }));
  });

  return router;
}
