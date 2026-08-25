import {Router} from 'express';
import type {Request, Response} from 'express';

import {CreateFeedbackTicketRequestSchema, ResolveFeedbackTicketRequestSchema} from '@masterflow/shared';

import {requireUser} from '../middleware/auth.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {
  createFeedbackTicket,
  deleteFeedbackTicket,
  listAllFeedbackTickets,
  listMyFeedbackTickets,
  resolveFeedbackTicket,
} from '../services/feedback_tickets.ts';

function authUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[feedback_tickets] req.user absent malgré requireUser');
  return user;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Router tickets feedback (portage API_manage). Monté à la racine de l'API avec des
 * chemins explicites (`/feedback-tickets`, `/admin/feedback-tickets`) — pas de
 * `router.use(middleware)` sans path ici (piège du blocage des routers suivants).
 */
export function createFeedbackTicketsRouter(): Router {
  const router = Router();

  // Création — tout utilisateur authentifié.
  router.post('/feedback-tickets', requireUser, (req: Request, res: Response): void => {
    const parsed = CreateFeedbackTicketRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(createFeedbackTicket(authUser(req), parsed.data));
    } catch (e) {
      res.status(500).json({error: 'feedback_ticket_create_failed', message: errMessage(e)});
    }
  });

  // Inbox personnelle.
  router.get('/feedback-tickets', requireUser, (req: Request, res: Response): void => {
    res.json(listMyFeedbackTickets(authUser(req)));
  });

  // Suppression par l'auteur (ticket ouvert uniquement).
  router.delete('/feedback-tickets/:id', requireUser, (req: Request, res: Response): void => {
    try {
      deleteFeedbackTicket(authUser(req), req.params.id ?? '');
      res.json({ok: true});
    } catch (e) {
      const message = errMessage(e);
      const status = message === 'permission_denied' ? 403 : message === 'feedback_ticket_not_found' ? 404 : 409;
      res.status(status).json({error: 'feedback_ticket_delete_failed', message});
    }
  });

  // ── Gestion admin ─────────────────────────────────────────────────────────
  router.get('/admin/feedback-tickets', requireUser, (req: Request, res: Response): void => {
    try {
      res.json(listAllFeedbackTickets(authUser(req)));
    } catch (e) {
      res.status(errMessage(e) === 'permission_denied' ? 403 : 500).json({
        error: 'feedback_ticket_list_failed',
        message: errMessage(e),
      });
    }
  });

  router.post('/admin/feedback-tickets/:id/resolve', requireUser, (req: Request, res: Response): void => {
    const parsed = ResolveFeedbackTicketRequestSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(resolveFeedbackTicket(authUser(req), req.params.id ?? '', parsed.data));
    } catch (e) {
      const message = errMessage(e);
      const status =
        message === 'permission_denied'
          ? 403
          : message === 'feedback_ticket_not_found'
            ? 404
            : message === 'feedback_ticket_already_resolved'
              ? 409
              : 500;
      res.status(status).json({error: 'feedback_ticket_resolve_failed', message});
    }
  });

  router.delete('/admin/feedback-tickets/:id', requireUser, (req: Request, res: Response): void => {
    try {
      deleteFeedbackTicket(authUser(req), req.params.id ?? '');
      res.json({ok: true});
    } catch (e) {
      const message = errMessage(e);
      const status = message === 'permission_denied' ? 403 : message === 'feedback_ticket_not_found' ? 404 : 409;
      res.status(status).json({error: 'feedback_ticket_delete_failed', message});
    }
  });

  return router;
}
