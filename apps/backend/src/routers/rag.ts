import {Router, type Request, type Response} from 'express';

import {RagQueryRequestSchema, RegisterRagResourceRequestSchema} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  getRagContextPack,
  listRagResources,
  queryRag,
  registerRagResource,
  requestRagReindex,
  revokeRagResource,
  syncCoordinationRagResources,
} from '../services/rag.ts';

function actor(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[rag] req.user absent malgré requireUser');
  return user;
}

function routeError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'rag_error';
  if (message === 'permission_denied' || message === 'job_owner_required') {
    res.status(403).json({error: message});
    return;
  }
  if (
    message === 'rag_resource_not_found' ||
    message === 'rag_context_pack_not_found' ||
    message === 'resource_not_found' ||
    message === 'project_not_found'
  ) {
    res.status(404).json({error: message});
    return;
  }
  if (
    message === 'rag_secret_detected' ||
    message === 'rag_resource_exists' ||
    message === 'rag_resource_not_reindexable' ||
    message === 'resource_not_validated' ||
    message === 'resource_scope_not_found'
  ) {
    res.status(400).json({error: message});
    return;
  }
  res.status(500).json({error: 'rag_error'});
}

export function createRagRouter(): Router {
  const router = Router();

  router.use(requireUser);

  router.post('/rag/query', (req: Request, res: Response): void => {
    const parsed = RagQueryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(queryRag(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/rag/resources', (req: Request, res: Response): void => {
    res.json({results: listRagResources(actor(req))});
  });

  router.post('/rag/coordination/sync', (req: Request, res: Response): void => {
    try {
      res.json({results: syncCoordinationRagResources(actor(req)), synced_at: Date.now()});
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/rag/resources', (req: Request, res: Response): void => {
    const parsed = RegisterRagResourceRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(registerRagResource(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/rag/resources/:id/reindex', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'rag_resource_not_found'});
      return;
    }
    try {
      res.status(202).json(requestRagReindex(actor(req), id));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/rag/resources/:id/revoke', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'rag_resource_not_found'});
      return;
    }
    try {
      res.json(revokeRagResource(actor(req), id));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/rag/context-packs/:id', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'rag_context_pack_not_found'});
      return;
    }
    try {
      res.json(getRagContextPack(actor(req), id));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
