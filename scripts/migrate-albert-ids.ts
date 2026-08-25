import 'dotenv/config';

import {parseModelsCatalog} from '../lib/model-catalog.ts';
import {MODEL_TASKS, PROVIDER_PRESETS, type ModelRouting} from '../lib/model-routing.ts';
import {getDb, type UserRow} from '../server/db.ts';
import {modelsProbe} from '../server/models-probe.ts';
import {decryptValueJson, encryptIfSensitive} from '../server/secrets-at-rest.ts';

/**
 * Migre les modèles Albert configurés vers leurs identifiants CANONIQUES.
 *
 * Pourquoi : le 2026-07-28, DINUM a renommé sa gamme — `mistralai/Mistral-Small-3.2-24B-…`
 * est devenu `mistral-small-3-2-24b-instruct-2506`, `Qwen/Qwen3-Coder-30B-A3B-Instruct` est
 * devenu `qwen3-coder-30b-A3b-instruct`, etc. Les anciens noms restent des ALIAS fonctionnels
 * (vérifié : `GET /v1/models/:id` et `POST /chat/completions` répondent 200 sur les deux
 * formes), et `servedNames` de `lib/model-catalog.ts` les reconnaît désormais — donc rien
 * n'est cassé et cette migration n'est PAS urgente. Elle sert à ce que la console affiche ce
 * que le fournisseur affiche, et à ce que la correspondance des tarifs porte sur l'id réel.
 *
 * La table alias → canonique n'est pas écrite en dur : elle est construite depuis la sonde
 * live, donc ce script reste juste au prochain renommage.
 *
 * Le modèle de DICTÉE (`corrector_stt_model`) est VOLONTAIREMENT laissé tel quel : la forme
 * préfixée `openai/whisper-large-v3` est la seule éprouvée en dictée réelle, et la résolution
 * des alias n'a été vérifiée que sur /v1/models et /chat/completions — pas sur
 * /v1/audio/transcriptions. Changer un chemin qui marche sans pouvoir le tester serait un
 * pari, pas une migration.
 *
 * Usage (depuis la racine de API_manage) :
 *   npx tsx scripts/migrate-albert-ids.ts            # simulation, n'écrit RIEN
 *   npx tsx scripts/migrate-albert-ids.ts --apply    # applique
 */

const ALBERT_HOST = 'albert.api.etalab.gouv.fr';
/** Clés à réécrire. `corrector_stt_model` en est absente, cf. l'en-tête. */
const CLES_MODELE = ['corrector_ocr_model', 'corrector_chat_model'] as const;

function lire(app: string, key: string): unknown {
  const row = getDb()
    .prepare<[string, string], {value_json: string}>(
      'SELECT value_json FROM global_settings WHERE app = ? AND key = ?',
    )
    .get(app, key);
  if (!row) return undefined;
  try {
    return JSON.parse(decryptValueJson(row.value_json));
  } catch {
    return undefined;
  }
}

function ecrire(app: string, key: string, value: unknown, userId: string): void {
  getDb()
    .prepare(
      `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(app, key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(app, key, encryptIfSensitive(key, JSON.stringify(value)), Date.now(), userId);
}

/** Table alias → id canonique, construite depuis la sonde live d'Albert. */
async function tableAlias(apiKey: string): Promise<Map<string, string>> {
  const {url, headers} = modelsProbe(`https://${ALBERT_HOST}`, apiKey);
  const res = await fetch(url, {headers, signal: AbortSignal.timeout(15_000)});
  if (!res.ok) throw new Error(`Sonde Albert : HTTP ${res.status}`);
  const table = new Map<string, string>();
  for (const m of parseModelsCatalog(await res.text())) {
    for (const alias of m.aliases) table.set(alias, m.id);
  }
  if (table.size === 0) throw new Error('Sonde Albert : aucun alias renvoyé, rien à migrer.');
  return table;
}

async function main(): Promise<void> {
  const applique = process.argv.includes('--apply');
  const db = getDb();

  const admin = db
    .prepare<[], UserRow>(
      "SELECT * FROM users WHERE role = 'admin' AND active = 1 ORDER BY created_at ASC LIMIT 1",
    )
    .get();
  if (!admin) throw new Error('Aucun admin actif — exécuter `npm run seed:admin` avant.');

  const apps = db
    .prepare<[], {app: string}>(
      "SELECT DISTINCT app FROM global_settings WHERE key = 'corrector_base_url' ORDER BY app",
    )
    .all()
    .map((r) => r.app)
    .filter((app) => String(lire(app, 'corrector_base_url') ?? '').includes(ALBERT_HOST));

  if (apps.length === 0) {
    console.log('Aucune app configurée sur Albert — rien à faire.');
    return;
  }

  const cle = String(lire(apps[0]!, 'corrector_api_key') ?? '');
  if (!cle) throw new Error(`Pas de clé API lisible pour l'app ${apps[0]}.`);
  const alias = await tableAlias(cle);
  console.log(`[migrate-albert-ids] ${alias.size} alias connus, ${apps.length} app(s) sur Albert.`);
  console.log(applique ? '[migrate-albert-ids] MODE ÉCRITURE' : '[migrate-albert-ids] simulation (--apply pour écrire)');
  console.log('---');

  let changements = 0;
  for (const app of apps) {
    const canon = (m: string): string => alias.get(m.trim()) ?? m;

    for (const key of CLES_MODELE) {
      const actuel = String(lire(app, key) ?? '');
      if (!actuel || canon(actuel) === actuel) continue;
      console.log(`${app} · ${key} : ${actuel} → ${canon(actuel)}`);
      changements += 1;
      if (applique) ecrire(app, key, canon(actuel), admin.id);
    }

    const routage = lire(app, 'corrector_model_routing') as ModelRouting | undefined;
    if (!routage) continue;
    const suivant = {...routage};
    let routageChange = false;
    for (const {key} of MODEL_TASKS) {
      const p = routage[key];
      if (!p) continue;
      const primary = canon(p.primary);
      const fallbacks = p.fallbacks.map(canon);
      if (primary === p.primary && fallbacks.every((f, i) => f === p.fallbacks[i])) continue;
      console.log(
        `${app} · routing.${key} : ${[p.primary, ...p.fallbacks].join(', ')} → ${[primary, ...fallbacks].join(', ')}`,
      );
      suivant[key] = {primary, fallbacks};
      routageChange = true;
      changements += 1;
    }
    // Le point unique de panne de la route OCR : `fallbacks: []`, assumé jusqu'ici faute de
    // second modèle multimodal chez Albert. `ministral-3-8b-instruct-2512` en est un depuis
    // le 2026-07-28 (déclaré `image-text-to-text`, transcription vérifiée en live).
    //
    // On n'ajoute le repli que si la liste est VIDE : remplacer un repli déjà choisi par un
    // admin serait écraser une décision humaine, ce qui n'est pas le rôle d'une migration.
    const ocr = suivant.ocr;
    const repliOcr = PROVIDER_PRESETS.albert!.routing!.ocr.fallbacks;
    if (ocr && ocr.fallbacks.length === 0 && repliOcr.length > 0 && ocr.primary !== repliOcr[0]) {
      console.log(`${app} · routing.ocr : ajout du repli ${repliOcr.join(', ')} (était sans secours)`);
      suivant.ocr = {primary: ocr.primary, fallbacks: [...repliOcr]};
      routageChange = true;
      changements += 1;
    }

    if (routageChange && applique) ecrire(app, 'corrector_model_routing', suivant, admin.id);
  }

  console.log('---');
  console.log(
    changements === 0
      ? '[migrate-albert-ids] déjà à jour, aucun changement.'
      : `[migrate-albert-ids] ${changements} valeur(s) ${applique ? 'migrées' : 'à migrer'}.`,
  );
}

void main().catch((e: unknown) => {
  console.error('[migrate-albert-ids]', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
