import {ConversationTurnRequestSchema} from '@masterflow/shared';
import {Router, type Request, type Response} from 'express';

import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {orchestrateConversationTurn} from '../services/conversation_turn_orchestrator.ts';

function actor(req: Request): AuthUser {
  if (!req.user) throw new Error('unauthenticated');
  return req.user;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : 'conversation_turn_failed';
  if (message.includes('not_found')) {
    res.status(404).json({error: message});
    return;
  }
  if (message.includes('denied') || message.includes('not_allowed')) {
    res.status(403).json({error: message});
    return;
  }
  res.status(400).json({error: message});
}

/** Route candidate du Conversation Turn Orchestrator ; elle planifie sans exécuter d'action. */
export function createConversationRouter(): Router {
  const router = Router();
  router.use('/conversation', requireUser);
  router.post('/conversation/turns/plan', (req, res) => {
    const parsed = ConversationTurnRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.status(200).json(orchestrateConversationTurn(actor(req), parsed.data));
    } catch (error) {
      fail(res, error);
    }
  });
  return router;
}
