import {
  CreateOperationalIntakeRequestSchema,
} from '@masterflow/shared';
import {Router, type Request, type Response} from 'express';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {createOperationalIntake, listOperationalIntake} from '../services/operational_intake.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthenticated');
  return req.user;
}
function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'operational_intake_failed';
  const status = message.includes('not_found') ? 404 : message.includes('denied') ? 403 : 400;
  res.status(status).json({error: message});
}

export function createOperationalIntakeRouter(): Router {
  const router = Router();
  router.use('/operations/intake', requireUser);
  router.post('/operations/intake', (req, res) => {
    const parsed = CreateOperationalIntakeRequestSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
    try { res.status(201).json(createOperationalIntake(actor(req), parsed.data)); } catch (error) { fail(res, error); }
  });
  router.get('/operations/intake', (req, res) => {
    const scopeType = req.query.scope_type;
    const scopeId = req.query.scope_id;
    if (!['personal', 'project', 'system'].includes(String(scopeType)) || typeof scopeId !== 'string') {
      return void res.status(400).json({error: 'scope_type_and_scope_id_required'});
    }
    try {
      res.json(listOperationalIntake(actor(req), scopeType as 'personal' | 'project' | 'system', scopeId));
    } catch (error) { fail(res, error); }
  });
  return router;
}
