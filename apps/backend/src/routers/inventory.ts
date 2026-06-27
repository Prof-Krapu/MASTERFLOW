import {Router, type Request, type Response} from 'express';

import {
  CreateCollectionMatchRequestSchema,
  CreateInventoryProjectNeedRequestSchema,
  CreateInventoryCollectionRequestSchema,
  CreateInventoryItemRequestSchema,
  IngestInventoryOcrCandidatesRequestSchema,
  InventorySearchRequestSchema,
  MatchInventoryProjectNeedRequestSchema,
  ResolveCollectionMatchRequestSchema,
  ScanInventoryPhotoRequestSchema,
  SetCollectionCompletionRequestSchema,
} from '@masterflow/shared';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  archiveInventoryItem,
  createCollectionMatch,
  createInventoryCollection,
  createInventoryItem,
  createInventoryProjectNeed,
  getInventoryItem,
  findInventoryDuplicateCandidates,
  ingestInventoryOcrCandidates,
  indexInventoryItem,
  listInventoryItems,
  matchInventoryProjectNeed,
  listInventoryCollections,
  listCollectionMatches,
  resolveCollectionMatch,
  scanInventoryPhoto,
  setInventoryCollectionCompletion,
  searchInventory,
  validateInventoryCollection,
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
    message === 'inventory_match_not_found' ||
    message === 'inventory_need_not_found' ||
    message === 'project_not_found'
  ) {
    res.status(404).json({error: message});
    return;
  }
  if (message === 'inventory_collection_scope_mismatch') {
    res.status(409).json({error: message});
    return;
  }
  if (
    message === 'inventory_ocr_job_required' ||
    message === 'inventory_ocr_job_not_ready' ||
    message === 'inventory_ocr_adapter_not_supported'
  ) {
    res.status(409).json({error: message});
    return;
  }
  if (
    message === 'inventory_item_not_validated' ||
    message === 'inventory_item_not_shareable'
  ) {
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

  router.get('/inventory/search', (req: Request, res: Response): void => {
    const parsed = InventorySearchRequestSchema.safeParse({
      query: req.query.q,
      project_id: typeof req.query.project_id === 'string' ? req.query.project_id : null,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_query', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json({results: searchInventory(actor(req), parsed.data)});
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

  router.post('/inventory/items/:id/rag-index', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(404).json({error: 'inventory_item_not_found'});
      return;
    }
    try {
      res.status(201).json(indexInventoryItem(actor(req), id));
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

  router.get('/inventory/collections', (req: Request, res: Response): void => {
    try {
      res.json({
        results: listInventoryCollections(actor(req), {
          project_id: typeof req.query.project_id === 'string' ? req.query.project_id : null,
          include_candidates:
            req.query.include_candidates === '1' || req.query.include_candidates === 'true',
        }),
      });
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/collections/:id/validate', (req: Request, res: Response): void => {
    try {
      res.json(validateInventoryCollection(actor(req), req.params.id ?? ''));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/collections/:id/completion', (req: Request, res: Response): void => {
    const parsed = SetCollectionCompletionRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(setInventoryCollectionCompletion(actor(req), req.params.id ?? '', parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/inventory/collections/:id/matches', (req: Request, res: Response): void => {
    try {
      res.json({results: listCollectionMatches(actor(req), req.params.id ?? '')});
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/collections/:id/matches', (req: Request, res: Response): void => {
    const parsed = CreateCollectionMatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createCollectionMatch(actor(req), req.params.id ?? '', parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/matches/:id/resolve', (req: Request, res: Response): void => {
    const parsed = ResolveCollectionMatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(resolveCollectionMatch(actor(req), req.params.id ?? '', parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.get('/inventory/items/:id/duplicate-candidates', (req: Request, res: Response): void => {
    try {
      res.json({results: findInventoryDuplicateCandidates(actor(req), req.params.id ?? '')});
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/ocr-candidates', (req: Request, res: Response): void => {
    const parsed = IngestInventoryOcrCandidatesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json({results: ingestInventoryOcrCandidates(actor(req), parsed.data)});
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/photo-scan', (req: Request, res: Response): void => {
    const parsed = ScanInventoryPhotoRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json({results: scanInventoryPhoto(actor(req), parsed.data)});
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/project-needs', (req: Request, res: Response): void => {
    const parsed = CreateInventoryProjectNeedRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createInventoryProjectNeed(actor(req), parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  router.post('/inventory/project-needs/:id/match', (req: Request, res: Response): void => {
    const parsed = MatchInventoryProjectNeedRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(matchInventoryProjectNeed(actor(req), req.params.id ?? '', parsed.data));
    } catch (error) {
      routeError(res, error);
    }
  });

  return router;
}
