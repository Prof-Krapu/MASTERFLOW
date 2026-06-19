import {Router, type Request, type Response} from 'express';

import {CreateFactoryBackflowIntakeRequestSchema} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createFactoryBackflowIntake,
  listFactoryBackflowCandidateUpdates,
} from '../services/factory_backflow_intake.ts';

function authUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[factory_backflow] req.user absent malgré requireUser');
  return user;
}

/**
 * Frontière D11 V6C : intake manuel d'un manifeste JSON. Aucun fichier, ZIP, URL
 * ou transfert externe n'est accepté ni dereferencé par ce routeur.
 */
export function createFactoryBackflowRouter(): Router {
  const router = Router();

  router.post('/backflow/intake', requireUser, requireRole('admin'), (req: Request, res: Response): void => {
    const parsed = CreateFactoryBackflowIntakeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_factory_backflow_intake', details: parsed.error.flatten()});
      return;
    }
    res.status(201).json(createFactoryBackflowIntake(authUser(req), parsed.data));
  });

  router.get('/backflow/candidate-updates', requireUser, requireRole('admin'), (_req: Request, res: Response): void => {
    res.json(listFactoryBackflowCandidateUpdates());
  });

  return router;
}
