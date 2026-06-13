import {Router, type Request, type Response} from 'express';

import {CreateInvitationSchema} from '@masterflow/shared';

import {requireRole, requireUser, type AuthUser} from '../middleware/auth.ts';
import {
  InvitationError,
  createInvitation,
  listInvitations,
  revokeInvitation,
} from '../engines/invitations.ts';
import {listAdminUsers} from '../engines/users_admin.ts';

/**
 * Router d'administration `API_manage` — gated **admin/godmode** (couvre admin=2 + godmode=3).
 *
 * Routes (auto-préfixées, montées à la racine de l'API) :
 *  - GET    /admin/users                      → liste des comptes (DTO admin).
 *  - GET    /admin/invitations                → liste des codes d'accès.
 *  - POST   /admin/invitations                → crée un code (rôle capé au rang du créateur).
 *  - POST   /admin/invitations/:code/revoke   → révoque un code.
 *
 * Le CHANGEMENT DE RÔLE d'un compte existant n'est PAS ici : c'est une action sensible
 * (`set_user_role`, validator godmode) qui passe par les endpoints `/actions`.
 */

/** Récupère l'utilisateur authentifié (garanti non-null après requireUser). */
function authUser(req: Request): AuthUser {
  return req.user as AuthUser;
}

export function createAdminRouter(): Router {
  const router = Router();
  // Gate scopé à /admin : ce routeur est monté à la racine de l'API ; un router.use SANS
  // path bloquerait tout routeur monté après lui (projects/jobs/…) pour les non-admins.
  router.use('/admin', requireUser, requireRole('admin'));

  // ── Comptes utilisateurs ─────────────────────────────────────────
  router.get('/admin/users', (_req: Request, res: Response): void => {
    res.json(listAdminUsers());
  });

  // ── Invitations (codes d'accès) ──────────────────────────────────
  router.get('/admin/invitations', (_req: Request, res: Response): void => {
    res.json(listInvitations());
  });

  router.post('/admin/invitations', (req: Request, res: Response): void => {
    const parsed = CreateInvitationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      const invitation = createInvitation(authUser(req), parsed.data);
      res.status(201).json(invitation);
    } catch (e) {
      // Garde-fou d'escalade (rôle > créateur) → 403 explicite.
      if (e instanceof InvitationError && e.reason.startsWith('role_above_creator')) {
        res.status(403).json({error: 'forbidden', message: e.message});
        return;
      }
      throw e;
    }
  });

  router.post('/admin/invitations/:code/revoke', (req: Request, res: Response): void => {
    const code = req.params.code;
    if (!code) {
      res.status(400).json({error: 'invalid_code'});
      return;
    }
    try {
      res.json(revokeInvitation(authUser(req), code));
    } catch (e) {
      if (e instanceof InvitationError && e.reason === 'not_found') {
        res.status(404).json({error: 'invitation_not_found'});
        return;
      }
      throw e;
    }
  });

  return router;
}
