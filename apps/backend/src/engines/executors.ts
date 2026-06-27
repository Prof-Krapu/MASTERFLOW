import type {Action} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {executeSetGlobalSetting} from './settings.ts';
import {executeSetUserRole} from './users_admin.ts';
import {executeTransferProjectOwnership} from './project_ownership.ts';
import {createImageGenerationJob} from '../services/jobs.ts';
import {getDb} from '../db/schema.ts';

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
  transfer_project_ownership: executeTransferProjectOwnership,
  generate_scene_visual: executeGenerateSceneVisual,
  create_render_manifest: executeGenerateSceneVisual,
};

function executeGenerateSceneVisual(actor: AuthUser, action: Action): Record<string, unknown> {
  const payload = action.payload as Record<string, unknown> | undefined;
  const manifestId = payload?.manifest_id as string | undefined;
  const prompt = payload?.prompt as string | undefined;
  const workbenchId = payload?.workbench_id as string | undefined;

  if (!manifestId || !prompt || !workbenchId) {
    throw new Error('generate_scene_visual_missing_payload');
  }

  const job = createImageGenerationJob(actor, {
    owner_id: actor.id,
    scope_type: 'owner',
    scope_id: workbenchId,
    prompt: prompt.slice(0, 2000),
    n: 1,
  });

  const db = getDb();
  db.prepare(
    'UPDATE visual_manifests SET status = ?, da_root_ref = ? WHERE id = ?',
  ).run('action_ready_preview', job.job_id, manifestId);

  return {job_id: job.job_id, manifest_id: manifestId};
}
