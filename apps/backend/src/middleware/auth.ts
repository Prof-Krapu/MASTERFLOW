import type {NextFunction, Request, RequestHandler, Response} from 'express';
import jwt from 'jsonwebtoken';

import {ROLE_RANK, type Role} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {env} from '../lib/env.ts';
import {uuid} from '../lib/uuid.ts';

/**
 * Middleware d'authentification — JWT stateless HS256 + liste de révocation.
 *
 * Doctrine : les jetons ne sont pas stockés ; on ne persiste que les `jti` révoqués
 * (logout) jusqu'à expiration (table `revoked_tokens`). Le rôle voyage DANS le jeton,
 * mais l'autorité reste le backend : `requireRole` compare ROLE_RANK avant toute action.
 *
 * Invariant produit : PERMISSION > PREFERENCE. Les permissions ne se blendent jamais.
 */

/** Utilisateur authentifié, posé sur `req.user` par `requireUser`. */
export interface AuthUser {
  id: string;
  username: string;
  role: Role;
}

/** Charge utile signée dans le JWT. `sub` = id utilisateur. `jti` = identifiant révocable. */
interface TokenPayload {
  sub: string;
  username: string;
  role: Role;
  jti: string;
}

/** Réponse d'erreur uniforme JSON. */
function deny(res: Response, status: number, error: string): void {
  res.status(status).json({error});
}

/**
 * Signe un JWT HS256 pour un utilisateur.
 * Génère un `jti` (uuid) révocable au logout, expire après `env.jwtExpiresIn`.
 */
export function signToken(u: {id: string; username: string; role: Role}): string {
  const payload = {sub: u.id, username: u.username, role: u.role, jti: uuid()};
  // `expiresIn` typé large par jsonwebtoken (ms.StringValue) ; env.jwtExpiresIn est une string ('30d').
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Vérifie un JWT (signature + expiration). Retourne la charge utile, ou `null` si invalide.
 * Ne consulte PAS la liste de révocation — c'est le rôle de `requireUser`.
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret, {algorithms: ['HS256']});
    if (typeof decoded === 'string') return null;
    const {sub, username, role, jti} = decoded as Record<string, unknown>;
    if (
      typeof sub !== 'string' ||
      typeof username !== 'string' ||
      typeof jti !== 'string' ||
      typeof role !== 'string' ||
      !(role in ROLE_RANK)
    ) {
      return null;
    }
    return {sub, username, role: role as Role, jti};
  } catch {
    return null;
  }
}

/** Indique si un `jti` figure dans la liste de révocation (logout). */
function isRevoked(jti: string): boolean {
  const row = getDb().prepare('SELECT 1 AS hit FROM revoked_tokens WHERE jti = ?').get(jti) as
    | {hit: number}
    | undefined;
  return row !== undefined;
}

/**
 * Exige un utilisateur authentifié.
 * Lit `Authorization: Bearer <token>`, vérifie le JWT, refuse les jetons révoqués,
 * puis pose `req.user`. Répond 401 JSON sinon.
 */
export const requireUser: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    deny(res, 401, 'unauthorized');
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  if (!payload) {
    deny(res, 401, 'invalid_token');
    return;
  }

  if (isRevoked(payload.jti)) {
    deny(res, 401, 'token_revoked');
    return;
  }

  req.user = {id: payload.sub, username: payload.username, role: payload.role};
  next();
};

/**
 * Exige un rôle minimal (≥ `min` selon ROLE_RANK). À monter APRÈS `requireUser`.
 * Répond 401 si non authentifié, 403 si le rôle est insuffisant.
 */
export function requireRole(min: Role): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      deny(res, 401, 'unauthorized');
      return;
    }
    if (ROLE_RANK[user.role] < ROLE_RANK[min]) {
      deny(res, 403, 'forbidden');
      return;
    }
    next();
  };
}
