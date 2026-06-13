import {Router, type Request, type Response} from 'express';

import {
  CreateInventoryCollectionRequestSchema,
  CreateInventoryItemRequestSchema,
} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  archiveInventoryItem,
  createInventoryCollection,
  createInventoryItem,
  getInventoryItem,
  listInventoryItems,
  validateInventoryItem,
} from '../services/inventory.ts';

function actor(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[inventory] req.user absent malgré requireUser');
  return user;
}

function routeError(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'inventory_error';
  if (message === 'inventory_scope_denied') {
    res.status(403).json({error: message});
    return;
  }
  if (
    message === 'inventory_item_not_found' ||
    message === 'inventory_collection_not_found' ||
    message === 'project_not_found'
  ) {
    res.status(404).json({error: message});
    return;
  }
  if (message === 'inventory_collection_scope_mismatch') {
    res.status(409).json({error: message});
    return;
  }
  res.status(500).json({error: 'inventory_error'});
}

export function createInventoryRouter(): Router {
  const router = Router();

  router.use(requireUser);

  router.get('/inventory/items', (req: Request, res: Response): void => {
    try {
      res.json({
        results: listInventoryItems(actor(req), {
          project_id: typeof req.query.project_id === 'string' ? req.query.project_id : null,
          include_candidates:
            req.query.include_candidates === '1' || req.query.include_candidates === 'true',
        }),
      });
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/items', (req: Request, res: Response): void => {
    const parsed = CreateInventoryItemRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createInventoryItem(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/inventory/items/:id', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'inventory_item_not_found'});
      return;
    }
    try {
      res.json(getInventoryItem(actor(req), id));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/items/:id/validate', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'inventory_item_not_found'});
      return;
    }
    try {
      res.json(validateInventoryItem(actor(req), id));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/items/:id/archive', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'inventory_item_not_found'});
      return;
    }
    try {
      res.json(archiveInventoryItem(actor(req), id));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/collections', (req: Request, res: Response): void => {
    const parsed = CreateInventoryCollectionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createInventoryCollection(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
