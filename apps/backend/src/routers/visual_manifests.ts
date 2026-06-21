import {CreateVisualManifestRequestSchema, CreateVisualReferenceRequestSchema, UpdateVisualReferenceRequestSchema} from '@masterflow/shared';
import {Router, type Request, type Response} from 'express';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {createVisualManifest, createVisualReference, listVisualManifests, listVisualReferences, updateVisualReference} from '../services/visual_manifests.ts';

function actor(req: Request): AuthUser { if (!req.user) throw new Error('unauthenticated'); return req.user; }
function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'visual_manifest_error';
  const status = message === 'permission_denied' ? 403 : message.includes('not_found') ? 404 : 400;
  res.status(status).json({error: message});
}
export function createVisualManifestsRouter(): Router {
  const router = Router();
  router.use(requireUser, requireRole('teacher'));
  router.get('/visual-references', (req, res) => { try { res.json(listVisualReferences(actor(req), typeof req.query.project_id === 'string' ? req.query.project_id : undefined)); } catch (error) { fail(res, error); } });
  router.post('/visual-references', (req, res) => { const body = CreateVisualReferenceRequestSchema.safeParse(req.body); if (!body.success) return void res.status(400).json({error: 'invalid_body', detail: body.error.flatten()}); try { res.status(201).json(createVisualReference(actor(req), body.data)); } catch (error) { fail(res, error); } });
  router.patch('/visual-references/:id', (req, res) => { const body = UpdateVisualReferenceRequestSchema.safeParse(req.body); if (!body.success) return void res.status(400).json({error: 'invalid_body', detail: body.error.flatten()}); try { res.json(updateVisualReference(actor(req), req.params.id ?? '', body.data)); } catch (error) { fail(res, error); } });
  router.get('/visual-manifests', (req, res) => { try { res.json(listVisualManifests(actor(req), typeof req.query.project_id === 'string' ? req.query.project_id : undefined)); } catch (error) { fail(res, error); } });
  router.post('/visual-manifests', (req, res) => { const body = CreateVisualManifestRequestSchema.safeParse(req.body); if (!body.success) return void res.status(400).json({error: 'invalid_body', detail: body.error.flatten()}); try { res.status(201).json(createVisualManifest(actor(req), body.data)); } catch (error) { fail(res, error); } });
  return router;
}
