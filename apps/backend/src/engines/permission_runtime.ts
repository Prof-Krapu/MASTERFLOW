import {ROLE_RANK, type ActionRegistryEntry, type Role} from '@masterflow/shared';
import type {AuthUser} from '../middleware/auth.ts';
import {isSensitive} from './action_registry.ts';

/**
 * Runtime de permissions — MVP.
 *
 * Invariants produit (non négociables) :
 *  - PERMISSION > PREFERENCE : les permissions ne se blendent jamais et ne se
 *    déduisent d'aucune préférence.
 *  - Aucune action sensible n'est exécutée sans validation humaine explicite.
 *    Ce module N'EXÉCUTE PAS la validation : il autorise la CRÉATION d'une action
 *    sensible mais signale `requires_validation`. La validation effective (passage
 *    en 'approved'/'rejected') reste le rôle de `validateAction`.
 *
 * Une action absente du registre ou non `live` n'existe pas pour l'utilisateur.
 */

/** Vrai si le rôle de l'utilisateur atteint au moins le rang `min`. */
export function hasRole(user: AuthUser, min: Role): boolean {
  return ROLE_RANK[user.role] >= ROLE_RANK[min];
}

/**
 * Rôle requis pour valider une action.
 * Lit `validator_role` du registre si présent ; sinon 'teacher' par défaut pour
 * toute action sensible. Retourne `null` si l'action n'est pas sensible.
 */
export function validatorRoleFor(entry: ActionRegistryEntry | null): Role | null {
  if (!entry || !isSensitive(entry)) return null;
  return entry.validator_role ?? 'teacher';
}

/**
 * Vérifie le droit de CRÉER l'action décrite par `entry`.
 *
 * MVP : tout utilisateur authentifié est autorisé. Pour une action sensible, la
 * création est permise mais la réponse signale que la validation sera requise
 * (la décision elle-même passe par `validateAction`, jamais ici).
 */
export function checkPermission(
  _user: AuthUser,
  entry: ActionRegistryEntry | null,
): {allowed: boolean; reason?: string} {
  if (!entry) return {allowed: false, reason: 'action_not_registered'};
  if (entry.status !== 'live') return {allowed: false, reason: `action_not_live:${entry.status}`};
  if (!isSensitive(entry)) return {allowed: true};
  // Action sensible : création autorisée, validation humaine requise ensuite.
  return {
    allowed: true,
    reason: `Action sensible : validation requise par ${validatorRoleFor(entry)}.`,
  };
}
