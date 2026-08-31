import {SourceGovernanceOperationSchema, SourceIntakeRequestSchema} from '@masterflow/shared';
import {Router, type Request, type Response} from 'express';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  intakeSource,
  listSourceIntake,
  previewSourceGovernance,
} from '../services/source_intake.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthenticated');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'source_intake_failed';
  if (message.includes('not_found')) {
    res.status(404).json({error: message});
    return;
  }
  if (message.includes('denied') || message.includes('not_visible')) {
    res.status(403).json({error: message});
    return;
  }
  res.status(400).json({error: message});
}

export function createSourceIntakeRouter(): Router {
  const router = Router();
  router.use('/source-intake', requireUser);
  router.post('/source-intake', (req, res) => {
    const parsed = SourceIntakeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      const record = intakeSource(actor(req), parsed.data);
      res.status(record.persisted ? 201 : 200).json(record);
    } catch (error) {
      fail(res, error);
    }
  });
  router.get('/source-intake', (req, res) => {
    const runtimePackId = typeof req.query.runtime_pack_id === 'string'
      ? req.query.runtime_pack_id
      : '';
    const projectId = typeof req.query.project_id === 'string' ? req.query.project_id : '';
    if (!runtimePackId || !projectId) {
      res.status(400).json({error: 'runtime_pack_id_and_project_id_required'});
      return;
    }
    try {
      res.json(listSourceIntake(actor(req), runtimePackId, projectId));
    } catch (error) {
      fail(res, error);
    }
  });
  router.post('/source-intake/:id/governance/preview', (req, res) => {
    const parsed = SourceGovernanceOperationSchema.safeParse(req.body?.operation);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_governance_operation'});
      return;
    }
    try {
      res.json(previewSourceGovernance(actor(req), req.params.id ?? '', parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });
  return router;
}
