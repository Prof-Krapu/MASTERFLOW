import {SetUserRoleSchema, type AdminUser} from '@masterflow/shared';
import type {Action} from '@masterflow/shared';

import {getDb, type UserRow} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {hasRole} from './permission_runtime.ts';

/**
 * Moteur d'administration des comptes — feature admin `API_manage`.
 *
 * Le changement de rôle touche aux PERMISSIONS (classe la plus sensible) : il passe
 * donc par le cycle d'action sensible `set_user_role` (validator_role = godmode), pas
 * par un endpoint direct. Cet exécuteur est appelé par `action_engine.executeAction`
 * UNIQUEMENT après validation godmode.
 *
 * Garde-fous non négociables, codés ici (défense en profondeur) :
 *  - assert `role ≥ godmode` à l'exécution (même après validation) ;
 *  - interdit de changer SON PROPRE rôle (anti auto-lockout / auto-promo) ;
 *  - interdit de rétrograder le DERNIER godmode (on ne se coupe jamais l'accès owner).
 */

/** Liste des utilisateurs pour la console admin (DTO enrichi : actif, dates). */
export function listAdminUsers(): AdminUser[] {
  const rows = getDb()
    .prepare('SELECT * FROM users ORDER BY created_at ASC')
    .all() as UserRow[];
  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    created_at: row.created_at,
    last_login: row.last_login,
  }));
}

/** Nombre de comptes godmode actifs — sert au garde-fou « dernier godmode ». */
function godmodeCount(): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'godmode' AND active = 1")
    .get() as {n: number};
  return row.n;
}

/**
 * Exécuteur réel de `set_user_role`. Renvoie le diff `{user_id, previous, new}`.
 * Lève en cas de garde-fou violé → l'action passe `failed` (try/catch de l'action_engine).
 */
export function executeSetUserRole(user: AuthUser, action: Action): Record<string, unknown> {
  if (!hasRole(user, 'godmode')) {
    throw new Error(
      `[users_admin] Rôle insuffisant pour exécuter set_user_role : 'godmode' requis, rôle actuel '${user.role}'.`,
    );
  }

  const parsed = SetUserRoleSchema.safeParse(action.payload);
  if (!parsed.success) {
    throw new Error(`[users_admin] Payload invalide : ${parsed.error.message}`);
  }
  const {user_id, role} = parsed.data;

  if (user_id === user.id) {
    throw new Error('[users_admin] Interdit : on ne change pas son propre rôle.');
  }

  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id) as UserRow | undefined;
  if (!target) {
    throw new Error(`[users_admin] Utilisateur introuvable : ${user_id}.`);
  }

  const previous = target.role;
  if (previous === role) {
    // No-op explicite : on renvoie le diff sans écriture inutile.
    return {user_id, previous, new: role, changed: false};
  }

  // Garde-fou : ne jamais rétrograder le dernier godmode actif.
  if (previous === 'godmode' && role !== 'godmode' && godmodeCount() <= 1) {
    throw new Error('[users_admin] Interdit : impossible de rétrograder le dernier godmode actif.');
  }

  const now = Date.now();
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now, user_id);

  return {user_id, previous, new: role, changed: true};
}
