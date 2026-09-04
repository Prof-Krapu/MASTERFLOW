import {Router, type Request, type Response} from 'express';

import {RuntimeUserProfileSchema} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {getRuntimeUserProfile} from '../services/runtime_user_profile.ts';

const actor = (request: Request): AuthUser => {
  if (!request.user) throw new Error('unauthorized');
  return request.user;
};

export function createRuntimeUserProfileRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/profile/runtime', (request, response: Response) => {
    try {
      response.json(RuntimeUserProfileSchema.parse(getRuntimeUserProfile(actor(request))));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'runtime_profile_error';
      response.status(message.endsWith('_not_found') ? 404 : 400).json({error: message});
    }
  });

  return router;
}
