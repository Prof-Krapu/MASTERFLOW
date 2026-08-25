import 'dotenv/config';

import {getDb} from '../server/db.ts';

/**
 * Migration ponctuelle (audit 2026-07-11, P1) : remplit les `fallbacks: []` des
 * `corrector_model_routing` déjà en base. Sans repli configuré, chaque tâche est
 * un point de défaillance unique : la mécanique de bascule (shouldFallbackToNextModel)
 * n'a rien vers quoi basculer sur 429/502/503/timeout.
 *
 * Règles (déduites du fournisseur via corrector_base_url) :
 *   - Mistral : tâches chat → mistral-small-latest ; ocr → mistral-medium-2604
 *     (multimodal : le pipeline OCRise via chat-vision quand le modèle n'est pas
 *     mistral-ocr*).
 *   - Albert : tâches chat → Mistral-Small-3.2 (pool de quota distinct de gpt-oss) ;
 *     ocr inchangé (pas d'autre modèle vision).
 *
 * ⚠ HISTORIQUE — déjà appliqué. Sa règle « profile → gpt-oss-120b » était FAUSSE et a été
 * retirée le 2026-07-30 : `profile` et `structure` portent des budgets de sortie de 800 à
 * 3 000 tokens, et le raisonnement de gpt-oss est décompté de `max_tokens`, donc il rend un
 * contenu VIDE (`finish_reason: length`) — mesuré 0/3 sur `roster.ts`, 0/3 sur le profil du
 * chat élève, 2/3 sur l'appréciation de bulletin. Ces deux routes reçoivent maintenant leur
 * repli du préréglage (`lib/model-routing.ts`), via `scripts/seed-albert.ts` ou
 * `scripts/migrate-routing-structure.ts`. Ce script les laisse délibérément tranquilles.
 *
 * Ne touche QUE les fallbacks vides : un choix admin existant n'est jamais écrasé.
 * Backup de la DB avant toute écriture. Idempotent.
 *
 * Usage : npx tsx scripts/patch-routing-fallbacks.ts
 */

type TaskCfg = {primary?: string; fallbacks?: string[]};
type Routing = Record<string, TaskCfg>;

const MISTRAL_CHAT_FALLBACK = 'mistral-small-latest';
const MISTRAL_OCR_FALLBACK = 'mistral-medium-2604';
const ALBERT_CHAT_FALLBACK = 'mistralai/Mistral-Small-3.2-24B-Instruct-2506';

/**
 * `profile` et `structure` en sont ABSENTES : leurs budgets de sortie sont trop petits pour
 * un modèle à raisonnement, et ce script ne sait pas distinguer les deux cas. Leurs replis
 * viennent du préréglage. Cf. l'avertissement en tête de fichier.
 */
const CHAT_TASKS = ['bareme', 'correction', 'studentChat', 'assistant'];

function fallbacksFor(baseUrl: string, task: string, primary: string): string[] | null {
  if (baseUrl.includes('api.mistral.ai')) {
    if (task === 'ocr') return [MISTRAL_OCR_FALLBACK];
    if (CHAT_TASKS.includes(task)) {
      // Si le primaire est déjà mistral-small, replier vers medium plutôt que lui-même.
      return primary.includes('mistral-small') ? [MISTRAL_OCR_FALLBACK] : [MISTRAL_CHAT_FALLBACK];
    }
    return null;
  }
  if (baseUrl.includes('albert.api.etalab.gouv.fr')) {
    if (task === 'ocr') return null; // pas d'autre modèle vision sur Albert
    if (CHAT_TASKS.includes(task)) return [ALBERT_CHAT_FALLBACK];
    return null;
  }
  return null; // fournisseur inconnu (Copilot, custom…) : on ne devine pas
}

async function main() {
  const db = getDb();
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = `data/api-manage.db.bak-${stamp}`;
  await db.backup(backupPath);
  console.log(`[patch-routing] backup : ${backupPath}`);

  const rows = db
    .prepare<[], {app: string; value_json: string}>(
      "SELECT app, value_json FROM global_settings WHERE key = 'corrector_model_routing'",
    )
    .all();
  const baseUrls = new Map(
    db
      .prepare<[], {app: string; value_json: string}>(
        "SELECT app, value_json FROM global_settings WHERE key = 'corrector_base_url'",
      )
      .all()
      .map((r) => [r.app, JSON.parse(r.value_json) as string]),
  );

  const update = db.prepare(
    "UPDATE global_settings SET value_json = ?, updated_at = ? WHERE app = ? AND key = 'corrector_model_routing'",
  );

  const patchAll = db.transaction(() => {
    let patched = 0;
    for (const row of rows) {
      const baseUrl = baseUrls.get(row.app) ?? '';
      const routing = JSON.parse(row.value_json) as Routing;
      let changed = false;
      for (const [task, cfg] of Object.entries(routing)) {
        if (!cfg?.primary || (cfg.fallbacks?.length ?? 0) > 0) continue; // choix admin conservé
        const fb = fallbacksFor(baseUrl, task, cfg.primary);
        if (fb && !fb.includes(cfg.primary)) {
          cfg.fallbacks = fb;
          changed = true;
        }
      }
      if (changed) {
        update.run(JSON.stringify(routing), Date.now(), row.app);
        patched++;
        console.log(
          `  ✓ ${row.app} : ${Object.entries(routing)
            .map(([t, c]) => `${t}→[${(c.fallbacks ?? []).join(',')}]`)
            .join(' ')}`,
        );
      } else {
        console.log(`  = ${row.app} : inchangé`);
      }
    }
    return patched;
  });

  console.log(`[patch-routing] terminé : ${patchAll()} app(s) mises à jour sur ${rows.length}.`);
}

main();
