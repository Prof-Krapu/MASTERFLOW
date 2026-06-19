import {Router} from 'express';
import type {Request, Response} from 'express';

import {
  CreateActionSchema,
  ExpireActionsRequestSchema,
  ExpireSelectedActionsRequestSchema,
  ActivateHardStopRequestSchema,
  ResumeHardStopRequestSchema,
  ValidationDecisionSchema,
} from '@masterflow/shared';

import {requireRole, requireUser} from '../middleware/auth.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listRegistry} from '../engines/action_registry.ts';
import {
  createAction,
  executeAction,
  expireOpenSensitiveActions,
  expireSelectedSensitiveActions,
  getActionFor,
  listPending,
  previewOpenSensitiveActionsExpiry,
  preflightAction,
  validateAction,
} from '../engines/action_engine.ts';
import {activateHardStop, getActiveHardStop, resumeHardStop} from '../services/hard_stop.ts';
import {compareActionContextSnapshot} from '../services/action_context_snapshots.ts';

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
  router.get('/actions/pending', requireRole('teacher'), (req: Request, res: Response): void => {
    res.json(listPending(authUser(req)));
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
    if (!id || !getActionFor(authUser(req), id)) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    const action = preflightAction(authUser(req), id);
    res.json(action);
  });

  // ───────────── Validation humaine (teacher+) ─────────────
  router.post('/actions/:id/validate', requireRole('teacher'), (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
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

  // ───────────── Expiry contrôlée — rend stale les actions sensibles ouvertes ─────────────
  router.post('/actions/expire-context/preview', requireRole('teacher'), (req: Request, res: Response): void => {
    const parsed = ExpireActionsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(previewOpenSensitiveActionsExpiry(authUser(req), parsed.data));
    } catch (e) {
      res.status(409).json({error: 'expiry_preview_failed', message: errMessage(e)});
    }
  });

  router.post('/actions/expire-context', requireRole('teacher'), (req: Request, res: Response): void => {
    const parsed = ExpireActionsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(expireOpenSensitiveActions(authUser(req), parsed.data));
    } catch (e) {
      res.status(409).json({error: 'expiry_failed', message: errMessage(e)});
    }
  });

  router.post('/actions/expire-context/selected', requireRole('teacher'), (req: Request, res: Response): void => {
    const parsed = ExpireSelectedActionsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(expireSelectedSensitiveActions(authUser(req), parsed.data));
    } catch (e) {
      res.status(409).json({error: 'selected_expiry_failed', message: errMessage(e)});
    }
  });

  router.get('/actions/hard-stop', requireRole('teacher'), (req: Request, res: Response): void => {
    const roomId = typeof req.query.room_id === 'string' ? req.query.room_id : '';
    if (!roomId) {
      res.status(400).json({error: 'room_id_required'});
      return;
    }
    try {
      res.json({state: getActiveHardStop(authUser(req), roomId)});
    } catch (e) {
      res.status(403).json({error: 'hard_stop_read_failed', message: errMessage(e)});
    }
  });

  router.post('/actions/hard-stop', requireRole('teacher'), (req: Request, res: Response): void => {
    const parsed = ActivateHardStopRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.status(201).json(activateHardStop(authUser(req), parsed.data));
    } catch (e) {
      res.status(409).json({error: 'hard_stop_activation_failed', message: errMessage(e)});
    }
  });

  router.post('/actions/hard-stop/resume', requireRole('teacher'), (req: Request, res: Response): void => {
    const parsed = ResumeHardStopRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }
    try {
      res.json(resumeHardStop(authUser(req), parsed.data));
    } catch (e) {
      res.status(409).json({error: 'hard_stop_resume_failed', message: errMessage(e)});
    }
  });

  router.get('/actions/:id/context-comparison', (req: Request, res: Response): void => {
    const id = req.params.id;
    const action = id ? getActionFor(authUser(req), id) : null;
    if (!action) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    try {
      res.json(compareActionContextSnapshot(authUser(req), action));
    } catch (e) {
      res.status(409).json({error: 'context_comparison_failed', message: errMessage(e)});
    }
  });

  // ───────────── Exécution — REFUSÉE si status ≠ 'approved' (423 Locked) ─────────────
  router.post('/actions/:id/execute', (req: Request, res: Response): void => {
    const id = req.params.id;
    const existing = id ? getActionFor(authUser(req), id) : null;
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
    const action = id ? getActionFor(authUser(req), id) : null;
    if (!action) {
      res.status(404).json({error: 'action_not_found'});
      return;
    }
    res.json(action);
  });

  return router;
}
