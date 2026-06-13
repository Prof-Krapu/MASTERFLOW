import type {Action} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {executeSetGlobalSetting} from './settings.ts';
import {executeSetUserRole} from './users_admin.ts';

/**
 * Registre des exécuteurs réels d'actions, indexés par `registry_id`.
 *
 * `action_engine.executeAction` y cherche un exécuteur après validation ; à défaut,
 * il retombe sur le résultat mocké MVP. Centraliser ici évite que chaque moteur
 * connaisse les autres (settings ↔ users_admin restent indépendants).
 *
 * Invariant : un exécuteur n'est appelé que pour une action en status 'approved'
 * (cf. action_engine). Chaque exécuteur applique en plus sa propre défense en profondeur.
 */
export const ACTION_EXECUTORS: Record<
  string,
  (user: AuthUser, action: Action) => Record<string, unknown>
> = {
  set_global_setting: executeSetGlobalSetting,
  set_user_role: executeSetUserRole,
};
