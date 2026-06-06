import {getDb} from '../db/schema.ts';
import {uuid} from './uuid.ts';

/**
 * Trace d'audit — écriture d'une ligne immuable dans `audit_logs`.
 *
 * Doctrine MasterFlow : toute décision (permission, validation, exécution)
 * laisse une trace. Cette fonction est volontairement « best-effort » :
 * un échec d'audit ne doit JAMAIS faire tomber le flux métier appelant.
 * D'où le try/catch qui se contente de logguer l'erreur.
 *
 * - `id` : uuid().
 * - `created_at` : horodatage courant en ms (epoch).
 * - `detail` : sérialisé en JSON dans la colonne `detail_json`.
 */
export function audit(input: {
  event_type: string;
  user_id?: string | null;
  action_id?: string | null;
  scope?: string | null;
  detail?: unknown;
}): void {
  try {
    const db = getDb();
    // Sérialisation défensive du détail : undefined → null en colonne.
    const detailJson =
      input.detail === undefined ? null : JSON.stringify(input.detail);

    db.prepare(
      `INSERT INTO audit_logs (id, user_id, action_id, event_type, scope, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      uuid(),
      input.user_id ?? null,
      input.action_id ?? null,
      input.event_type,
      input.scope ?? null,
      detailJson,
      Date.now(),
    );
  } catch (err) {
    // Best-effort : on ne propage jamais une panne d'audit au flux appelant.
    console.error('[audit] échec d\'écriture du log d\'audit:', err);
  }
}
