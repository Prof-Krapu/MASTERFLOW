import {Router, type Request, type Response} from 'express';

import {CreateVisualManifestRequestSchema} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  createVisualManifest,
  getVisualManifest,
  listVisualManifests,
} from '../services/visual_manifests.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthorized');
  return req.user;
}

function routeError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'visual_manifest_error';
  if (message === 'visual_manifest_scope_denied') {
    res.status(403).json({error: message});
    return;
  }
  if (message === 'visual_manifest_not_found') {
    res.status(404).json({error: message});
    return;
  }
  if (message === 'visual_manifest_project_required') {
    res.status(409).json({error: message});
    return;
  }
  res.status(500).json({error: 'visual_manifest_error'});
}

export function createVisualManifestsRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.get('/visual-manifests', (req: Request, res: Response): void => {
    res.json({results: listVisualManifests(actor(req))});
  });

  router.get('/visual-manifests/:id', (req: Request, res: Response): void => {
    try {
      res.json(getVisualManifest(actor(req), req.params.id ?? ''));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/visual-manifests', (req: Request, res: Response): void => {
    const parsed = CreateVisualManifestRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createVisualManifest(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
