import {SetGlobalSettingSchema} from '@masterflow/shared';
import type {Action} from '@masterflow/shared';
import type {AuthUser} from '../middleware/auth.ts';
import {getDb} from '../db/schema.ts';
import {hasRole} from './permission_runtime.ts';

/**
 * Clés `app::key` inscriptibles via l'action sensible `set_global_setting`.
 * Jamais de secrets (mots de passe, clés API) : ceux-ci restent dans `.env`.
 */
const ADMIN_CONTROLLED_KEYS = new Set([
  'llm::provider',
  'llm::model',
  'llm::base_url',
  'llm::temperature',
  'app::maintenance_mode',
  'app::max_tokens_per_request',
]);

/**
 * Exécuteur réel pour `set_global_setting`.
 *
 * Défense en profondeur :
 *  1. Assert `role ≥ admin` (même si l'action a été validée par un admin, l'exécutant doit
 *     l'être aussi — guard contre un rejeu par un rôle inférieur).
 *  2. Validation du payload + allowlist des clés inscriptibles.
 *  3. UPSERT `global_settings` + retour du diff (previous / new).
 */
export function executeSetGlobalSetting(
  user: AuthUser,
  action: Action,
): Record<string, unknown> {
  if (!hasRole(user, 'admin')) {
    throw new Error(
      `[settings] Rôle insuffisant pour exécuter set_global_setting : 'admin' requis, rôle actuel '${user.role}'.`,
    );
  }

  const parsed = SetGlobalSettingSchema.safeParse(action.payload);
  if (!parsed.success) {
    throw new Error(`[settings] Payload invalide : ${parsed.error.message}`);
  }

  const {app, key, value} = parsed.data;
  const settingKey = `${app}::${key}`;

  if (!ADMIN_CONTROLLED_KEYS.has(settingKey)) {
    throw new Error(`[settings] Clé '${settingKey}' non inscriptible (hors allowlist).`);
  }

  const db = getDb();

  const existing = db
    .prepare('SELECT value_json FROM global_settings WHERE app = ? AND key = ?')
    .get(app, key) as {value_json: string} | undefined;
  const previous = existing ? JSON.parse(existing.value_json) : null;

  const now = Date.now();
  db.prepare(
    `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (app, key) DO UPDATE SET
       value_json  = excluded.value_json,
       updated_at  = excluded.updated_at,
       updated_by  = excluded.updated_by`,
  ).run(app, key, JSON.stringify(value), now, user.id);

  return {app, key, previous, new: value};
}

/** Map des exécuteurs réels par `registry_id`. Défaut : résultat mocké MVP. */
export const ACTION_EXECUTORS: Record<
  string,
  (user: AuthUser, action: Action) => Record<string, unknown>
> = {
  set_global_setting: executeSetGlobalSetting,
};
