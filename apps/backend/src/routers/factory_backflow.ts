import {Router, type Request, type Response} from 'express';

import {CreateFactoryBackflowIntakeRequestSchema, RouteFactoryBackflowCandidateUpdateRequestSchema} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createFactoryBackflowIntake,
  listFactoryBackflowCandidateUpdates,
  routeFactoryBackflowCandidateUpdate,
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
  router.post('/backflow/candidate-updates/:id/route', requireUser, requireRole('admin'), (req: Request, res: Response): void => {
    const parsed = RouteFactoryBackflowCandidateUpdateRequestSchema.safeParse(req.body);
    if (!parsed.success || !req.params.id) return void res.status(400).json({error: 'invalid_factory_backflow_route'});
    try { res.json(routeFactoryBackflowCandidateUpdate(authUser(req), req.params.id, parsed.data.target_domain, parsed.data.note)); } catch (error) { res.status(409).json({error: error instanceof Error ? error.message : 'factory_backflow_route_failed'}); }
  });

  return router;
}
