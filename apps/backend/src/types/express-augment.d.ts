import type {AuthUser} from '../middleware/auth.ts';

/**
 * Augmentation Express — expose `req.user` une fois `requireUser` passé.
 *
 * `requireUser` pose l'utilisateur authentifié sur la requête ; tout handler/middleware
 * en aval lit `req.user` avec le type `AuthUser`. Optionnel : absent sur les routes publiques.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
