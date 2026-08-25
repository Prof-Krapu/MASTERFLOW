import 'dotenv/config';

import {getDb} from '../server/db.ts';

/**
 * Réparation ponctuelle — incident du 2026-08-04 11:31.
 *
 * Ce jour-là, `GET https://api.mistral.ai/v1/models` a renvoyé 50 modèles SANS la ligne
 * `mistral-ocr-latest` (elle était de retour 15 min plus tard, avec 51 modèles). Le balayage
 * de catalogue y a donc vu une disparition réelle et a réaligné les 9 correcteurs Mistral :
 * `corrector_ocr_model` ET `corrector_model_routing.ocr.primary` sont passés de
 * `mistral-ocr-latest` à `mistral-large-2512`, seul « plus grand contexte multimodal » servi.
 *
 * Conséquence : l'OCR ne passait plus par l'endpoint dédié `/v1/ocr` (meilleur sur le
 * manuscrit, les scans et les tableaux, et facturé 0,00172 €/page) mais par le chat-vision de
 * mistral-large, plus cher et moins bon.
 *
 * Ce script rétablit l'OCR sur `mistral-ocr-2512` — l'id CANONIQUE daté d'OCR 3, et non
 * l'alias `-latest`, précisément parce que Mistral vient de démontrer qu'il peut le retirer de
 * sa liste (aujourd'hui `mistral-ocr-latest` est même une ligne isolée, sans alias vers une
 * version connue : impossible de savoir quelle version elle sert).
 *
 * Migre AUSSI la table de tarifs en base : `bestMatch` (server/pricing-core.ts) rapproche par
 * INCLUSION de sous-chaîne, donc l'entrée `mistral-ocr-latest` ne couvre pas `mistral-ocr-2512`
 * et le coût des pages OCR retomberait silencieusement à 0. La clé devient `mistral-ocr`,
 * générique (2512 / 3 / 4-0), tarif inchangé.
 *
 * Garde-fou : ne réécrit QUE les valeurs exactement égales à `mistral-large-2512`, c'est-à-dire
 * celles écrites par le balayage. Un choix délibéré n'est jamais écrasé. Idempotent.
 *
 * Usage : npx tsx scripts/fix-mistral-ocr-2026-08-04.ts [--dry-run]
 */

type TaskCfg = {primary?: string; fallbacks?: string[]};
type Routing = Record<string, TaskCfg>;
type Pricing = {model: string; inputPer1M: number; outputPer1M: number; perPage?: number};

/** Valeur posée par la bascule automatique — la seule que ce script accepte de réécrire. */
const VALEUR_A_REPARER = 'mistral-large-2512';
const OCR_CIBLE = 'mistral-ocr-2512';
const ANCIENNE_CLE_TARIF = 'mistral-ocr-latest';
const NOUVELLE_CLE_TARIF = 'mistral-ocr';

const dryRun = process.argv.includes('--dry-run');

function lire(app: string, key: string): string | undefined {
  const row = getDb()
    .prepare<[string, string], {value_json: string}>(
      'SELECT value_json FROM global_settings WHERE app = ? AND key = ?',
    )
    .get(app, key);
  return row?.value_json;
}

async function main() {
  const db = getDb();
  if (!dryRun) {
    const backupPath = `data/api-manage.db.bak-fix-ocr-2026-08-04`;
    await db.backup(backupPath);
    console.log(`[fix-ocr] backup : ${backupPath}`);
  } else {
    console.log('[fix-ocr] --dry-run : aucune écriture');
  }

  const baseUrls = new Map(
    db
      .prepare<[], {app: string; value_json: string}>(
        "SELECT app, value_json FROM global_settings WHERE key = 'corrector_base_url'",
      )
      .all()
      .map((r) => [r.app, JSON.parse(r.value_json) as string]),
  );

  const update = db.prepare(
    'UPDATE global_settings SET value_json = ?, updated_at = ? WHERE app = ? AND key = ?',
  );

  const patch = db.transaction(() => {
    let apps = 0;
    let tarifs = 0;

    for (const [app, baseUrl] of [...baseUrls].sort()) {
      const lignes: string[] = [];

      if (baseUrl.includes('api.mistral.ai')) {
        // 1. champ de tête `corrector_ocr_model`
        const brutOcr = lire(app, 'corrector_ocr_model');
        if (brutOcr && (JSON.parse(brutOcr) as string) === VALEUR_A_REPARER) {
          if (!dryRun) update.run(JSON.stringify(OCR_CIBLE), Date.now(), app, 'corrector_ocr_model');
          lignes.push(`ocrModel : ${VALEUR_A_REPARER} → ${OCR_CIBLE}`);
        }

        // 2. routage de la tâche `ocr` (replis conservés : le filet chat-vision reste utile)
        const brutRoutage = lire(app, 'corrector_model_routing');
        if (brutRoutage) {
          const routing = JSON.parse(brutRoutage) as Routing;
          if (routing.ocr?.primary === VALEUR_A_REPARER) {
            routing.ocr.primary = OCR_CIBLE;
            if (!dryRun) {
              update.run(JSON.stringify(routing), Date.now(), app, 'corrector_model_routing');
            }
            lignes.push(
              `routing.ocr : ${VALEUR_A_REPARER} → ${OCR_CIBLE} (replis [${(routing.ocr.fallbacks ?? []).join(', ')}])`,
            );
          }
        }
      }

      // 3. tarifs — tous fournisseurs : la clé `mistral-ocr-latest` ne couvre plus rien.
      const brutTarifs = lire(app, 'corrector_model_pricing');
      if (brutTarifs) {
        const pricing = JSON.parse(brutTarifs) as Pricing[];
        const dejaGenerique = pricing.some((p) => p.model === NOUVELLE_CLE_TARIF);
        const ancienne = pricing.find((p) => p.model === ANCIENNE_CLE_TARIF);
        if (ancienne) {
          const suivant = dejaGenerique
            ? pricing.filter((p) => p.model !== ANCIENNE_CLE_TARIF)
            : pricing.map((p) => (p.model === ANCIENNE_CLE_TARIF ? {...p, model: NOUVELLE_CLE_TARIF} : p));
          if (!dryRun) {
            update.run(JSON.stringify(suivant), Date.now(), app, 'corrector_model_pricing');
          }
          lignes.push(
            dejaGenerique
              ? `tarif : entrée ${ANCIENNE_CLE_TARIF} supprimée (doublon)`
              : `tarif : ${ANCIENNE_CLE_TARIF} → ${NOUVELLE_CLE_TARIF} (${ancienne.perPage} €/page)`,
          );
          tarifs++;
        }
      }

      if (lignes.length > 0) {
        apps++;
        console.log(`  ✓ ${app} — ${lignes.join(' ; ')}`);
      } else {
        console.log(`  = ${app} : inchangé`);
      }
    }
    return {apps, tarifs};
  });

  const {apps, tarifs} = patch();
  console.log(
    `[fix-ocr] terminé : ${apps} app(s) modifiée(s), dont ${tarifs} table(s) de tarifs.` +
      (dryRun ? ' (simulation)' : ''),
  );
}

await main();
