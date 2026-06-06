import {Router, type Request, type Response} from 'express';

import {ProposeResourceSchema} from '@masterflow/shared';

import {audit} from '../lib/audit.ts';
import {requireRole, requireUser} from '../middleware/auth.ts';
import {
  proposeResource,
  searchResources,
  validateResource,
} from '../engines/resource_truth.ts';

/**
 * Router /resources — registre de vérité des ressources (anti-hallucination).
 *
 * Invariant produit : le taux de tolérance à l'hallucination est littéralement 0.
 * - GET /resources ne renvoie par DÉFAUT que les ressources `status = 'validated'`
 *   (le canon servable). `?include_all=1` lève ce filtre, mais ce relâchement est
 *   réservé à admin/godmode (inbox de validation, audit).
 * - POST /resources enregistre une PROPOSITION : elle entre en `'candidate'` et n'est
 *   jamais servie tant qu'elle n'a pas été validée explicitement par un humain.
 * - POST /resources/:id/validate promeut une candidate au canon ; exige le rôle teacher
 *   (PERMISSION > PREFERENCE : valider du canon n'est jamais une commodité utilisateur).
 *
 * Toutes les routes exigent un utilisateur authentifié. La logique de persistance vit
 * dans `resource_truth.ts` ; ce router n'orchestre que permission + validation + audit.
 */
export function createResourcesRouter(): Router {
  const router = Router();

  // Toute la surface /resources est protégée : aucun accès anonyme.
  router.use(requireUser);

  /**
   * GET /resources?q=&include_all=1
   * Par défaut : `status = 'validated'` seulement (anti-hallucination).
   * `include_all=1` lève le filtre, mais seuls admin/godmode y ont droit (sinon 403).
   * L'autorisation dépend d'un query param, on la résout donc DANS le handler
   * plutôt que via un `requireRole` figé sur la route.
   * Réponse : { results, total }.
   */
  router.get('/', (req: Request, res: Response): void => {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const wantsAll = req.query.include_all === '1' || req.query.include_all === 'true';

    if (wantsAll && !canSeeAll(req)) {
      res.status(403).json({error: 'forbidden'});
      return;
    }

    const results = searchResources(q, wantsAll);
    res.json({results, total: results.length});
  });

  /**
   * POST /resources — propose une ressource. Entre en `'candidate'` (jamais servie par défaut).
   */
  router.post('/', (req: Request, res: Response): void => {
    const parsed = ProposeResourceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', issues: parsed.error.issues});
      return;
    }

    const resource = proposeResource(parsed.data);
    audit({
      event_type: 'resource.proposed',
      user_id: req.user?.id ?? null,
      scope: 'resource',
      detail: {resource_id: resource.id, title: resource.title, source: resource.source},
    });

    res.status(201).json(resource);
  });

  /**
   * POST /resources/:id/validate — promeut une candidate au canon (`'validated'`).
   * Exige le rôle teacher : valider du canon est une décision humaine privilégiée.
   */
  router.post('/:id/validate', requireRole('teacher'), (req: Request, res: Response): void => {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({error: 'missing_id'});
      return;
    }

    try {
      const resource = validateResource(id);
      audit({
        event_type: 'resource.validated',
        user_id: req.user?.id ?? null,
        scope: 'resource',
        detail: {resource_id: resource.id, title: resource.title},
      });
      res.json(resource);
    } catch {
      res.status(404).json({error: 'resource_not_found'});
    }
  });

  return router;
}

/** Indique si l'utilisateur courant peut lever le filtre anti-hallucination (admin/godmode). */
function canSeeAll(req: Request): boolean {
  const role = req.user?.role;
  return role === 'admin' || role === 'godmode';
}
