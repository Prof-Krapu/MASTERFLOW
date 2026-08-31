import {Router, type Request, type Response} from 'express';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {buildPilotHarvest, getPilotJourneyState} from '../services/pilot_runtime.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthenticated');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'pilot_runtime_failed';
  if (message.includes('not_found')) {
    res.status(404).json({error: message});
    return;
  }
  if (message.includes('not_allowed') || message.includes('denied')) {
    res.status(403).json({error: message});
    return;
  }
  res.status(400).json({error: message});
}

export function createPilotsRouter(): Router {
  const router = Router();
  router.use('/pilots', requireUser);
  router.get('/pilots/:runtimePackId/state', (req, res) => {
    const runtimePackId = req.params.runtimePackId ?? '';
    const roomInstanceId = typeof req.query.room_instance_id === 'string'
      ? req.query.room_instance_id
      : '';
    if (!runtimePackId || !roomInstanceId) {
      res.status(400).json({error: 'runtime_pack_id_and_room_instance_id_required'});
      return;
    }
    try {
      res.json(getPilotJourneyState(actor(req), runtimePackId, roomInstanceId));
    } catch (error) {
      fail(res, error);
    }
  });
  router.post('/pilots/:runtimePackId/harvest/preview', (req, res) => {
    const runtimePackId = req.params.runtimePackId ?? '';
    const roomInstanceId = typeof req.body?.room_instance_id === 'string'
      ? req.body.room_instance_id
      : '';
    if (!runtimePackId || !roomInstanceId) {
      res.status(400).json({error: 'runtime_pack_id_and_room_instance_id_required'});
      return;
    }
    try {
      const state = getPilotJourneyState(actor(req), runtimePackId, roomInstanceId);
      res.json(buildPilotHarvest(state));
    } catch (error) {
      fail(res, error);
    }
  });
  return router;
}
