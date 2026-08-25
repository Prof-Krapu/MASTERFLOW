import 'dotenv/config';

import {getDb} from '../server/db.ts';

/**
 * Migration ponctuelle (2026-07-25) : ajoute la tâche `assistant` aux
 * `corrector_model_routing` déjà en base.
 *
 * `ModelRoutingTask` des sous-apps compte six tâches, mais le miroir de la console admin
 * n'en écrivait que cinq — la clé `assistant` a été ajoutée aux correcteurs sans être
 * répercutée ici. Rien ne cassait visiblement : `normalizeModelRouting()` la recrée au
 * chargement à partir de `corrector_chat_model`. Mais elle la recrée **sans repli**, donc
 * l'Assistant pédagogique était le seul chemin de la suite à rester un point de
 * défaillance unique, même sur les apps patchées par `patch-routing-fallbacks.ts`
 * (qui ne remplit que les tâches DÉJÀ présentes).
 *
 * Règle : la tâche `assistant` est calquée sur `correction` — même primaire, mêmes replis.
 * C'est la tâche la plus proche (génération de document long, raisonnement souhaitable),
 * et c'est déjà le modèle que l'assistant utilisait de fait via `corrector_chat_model`.
 *
 * N'écrit QUE si la clé manque : un choix admin existant n'est jamais écrasé. Backup de la
 * DB (API better-sqlite3, pas un `cp` — le WAL rendrait la copie incomplète) avant toute
 * écriture. Idempotent.
 *
 * Usage : npx tsx scripts/patch-routing-assistant.ts
 */

type TaskCfg = {primary?: string; fallbacks?: string[]};
type Routing = Record<string, TaskCfg>;

async function main() {
  const db = getDb();
  const stamp = new Date().toISOString().slice(0, 10);
  const backupPath = `data/api-manage.db.bak-assistant-${stamp}`;
  await db.backup(backupPath);
  console.log(`[patch-assistant] backup : ${backupPath}`);

  const rows = db
    .prepare<[], {app: string; value_json: string}>(
      "SELECT app, value_json FROM global_settings WHERE key = 'corrector_model_routing'",
    )
    .all();
  const chatModels = new Map(
    db
      .prepare<[], {app: string; value_json: string}>(
        "SELECT app, value_json FROM global_settings WHERE key = 'corrector_chat_model'",
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
      const routing = JSON.parse(row.value_json) as Routing;
      if (routing.assistant?.primary) {
        console.log(`  = ${row.app} : déjà présent (${routing.assistant.primary})`);
        continue;
      }
      // Repli en cascade : correction (le plus proche), puis le champ chat de l'app.
      const source = routing.correction?.primary ? routing.correction : undefined;
      const primary = source?.primary ?? chatModels.get(row.app);
      if (!primary) {
        console.log(`  ! ${row.app} : ni routing.correction ni corrector_chat_model — ignoré`);
        continue;
      }
      const fallbacks = [...(source?.fallbacks ?? [])];
      routing.assistant = {primary, fallbacks};
      update.run(JSON.stringify(routing), Date.now(), row.app);
      patched++;
      console.log(
        `  ✓ ${row.app} : assistant → ${primary}` +
          (fallbacks.length ? ` (secours : ${fallbacks.join(', ')})` : ' (aucun secours)'),
      );
    }
    return patched;
  });

  console.log(`[patch-assistant] terminé : ${patchAll()} app(s) mises à jour sur ${rows.length}.`);
}

main();
