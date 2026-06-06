import {Router} from 'express';
import type {Request, Response} from 'express';

import {CreateActionSchema, ValidationDecisionSchema} from '@masterflow/shared';

import {requireRole, requireUser} from '../middleware/auth.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listRegistry} from '../engines/action_registry.ts';
import {
  createAction,
  executeAction,
  getAction,
  listPending,
  preflightAction,
  validateAction,
} from '../engines/action_engine.ts';

/**
 * Router des actions — cycle de vie complet du contrat d'action.
 *
 * Expose la chaîne `draft → preflight → pending_validation → approved → executing → completed`
 * (ou `rejected` / `failed`). Toutes les routes exigent un utilisateur authentifié
 * (`requireUser`) ; l'inbox de validation et la décision exigent en plus le rôle `teacher`.
 *
 * Invariant produit appliqué côté transport : `execute` ne peut aboutir que sur une action
 * 'approved'. Le moteur lève sinon ; on le traduit en 423 (Locked) — la validation humaine
 * reste un passage obligé. Le router ne décide rien : il valide les bodies (Zod) et délègue
 * au moteur, qui est la seule autorité.
 */

/** L'utilisateur est garanti par `requireUser` ; ce helper en assure le typage strict. */
function authUser(req: Request): AuthUser {
  const user = req.user;
  if (!user) throw new Error('[actions] req.user absent malgré requireUser');
  return user;
}

/** Renvoie un message lisible depuis une erreur inconnue. */
function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function createActionsRouter(): Router {
  const router = Router();

  // Toutes les routes d'action exigent un utilisateur authentifié.
  router.use(requireUser);

  // ───────────── Registre — actions disponibles (déclaratif, statique) ─────────────
  router.get('/actions/available', (_req: Request, res: Response): void => {
    res.json(listRegistry());
  });

  // ───────────── Inbox de validation (avant /:id pour ne pas capter 'pending') ─────────────
  router.get('/actions/pending', requireRole('teacher'), (_req: Request, res: Response): void => {
    res.json(listPending());
  });

  // ───────────── Création (status 'draft') ─────────────
  router.post('/actions', (req: Request, res: Response): void => {
    const parsed = CreateActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    const action = createAction(authUser(req), parsed.data);
    res.status(201).json(action);
  });

  // ───────────── Preflight — calcule PreflightResult et avance le status ─────────────
  router.post('/actions/:id/preflight', (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id || !getAction(id)) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    const action = preflightAction(authUser(req), id);
    res.json(action);
  });

  // ───────────── Validation humaine (teacher+) ─────────────
  router.post('/actions/:id/validate', requireRole('teacher'), (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id || !getAction(id)) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    const parsed = ValidationDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      const action = validateAction(authUser(req), id, parsed.data);
      res.json(action);
    } catch (e) {
      // Rôle insuffisant ou status non 'pending_validation' → conflit de cycle de vie.
      res.status(409).json({error: 'validation_failed', message: errMessage(e)});
    }
  });

  // ───────────── Exécution — REFUSÉE si status ≠ 'approved' (423 Locked) ─────────────
  router.post('/actions/:id/execute', (req: Request, res: Response): void => {
    const id = req.params.id;
    const existing = id ? getAction(id) : null;
    if (!existing) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    if (existing.status !== 'approved') {
      // Invariant : aucune action non validée ne s'exécute.
      res.status(423).json({error: 'not_approved', status: existing.status});
      return;
    }
    const action = executeAction(authUser(req), id as string);
    res.json(action);
  });

  // ───────────── Lecture d'une action (catch-all paramétré, en dernier) ─────────────
  router.get('/actions/:id', (req: Request, res: Response): void => {
    const id = req.params.id;
    const action = id ? getAction(id) : null;
    if (!action) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    res.json(action);
  });

  return router;
}
