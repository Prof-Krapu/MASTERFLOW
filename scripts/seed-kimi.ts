import 'dotenv/config';

import {getDb, type UserRow} from '../server/db.ts';
import {encryptIfSensitive} from '../server/secrets-at-rest.ts';

/**
 * Seed Kimi — configure la clé du plan Kimi Code (Moonshot AI) + modèles partagés
 * dans `global_settings`. Idempotent (UPSERT via ON CONFLICT).
 *
 * Kimi est OpenAI-compatible, mais avec trois particularités vérifiées par sonde
 * (2026-07-25) sur https://api.kimi.com/coding/v1 :
 *   - le segment /coding est OBLIGATOIRE (api.kimi.com/v1 → 404 nginx) ;
 *   - K3 est multimodal (supports_image_in) → un seul modèle couvre OCR/vision ET
 *     correction, ce qui rend le routing plat (pas de 3 voies comme Albert) ;
 *   - le sampling est verrouillé (temperature ≠ 1 → HTTP 400) et le raisonnement est
 *     toujours actif — c'est lib/api-client.ts des sous-apps qui gère ça (isKimi()).
 *
 * Usage (depuis la racine de API_manage) :
 *   KIMI_API_KEY=sk-kimi-... npx tsx scripts/seed-kimi.ts             # → les 11 apps
 *   KIMI_API_KEY=sk-kimi-... npx tsx scripts/seed-kimi.ts svt maths   # → apps choisies
 *
 * La clé N'EST JAMAIS en dur : elle vient de KIMI_API_KEY. Le script échoue clairement
 * si la variable est absente. Elle est chiffrée at-rest (SENSITIVE_GLOBAL_KEYS).
 *
 * Pas de corrector_stt_model : supportsAudioTranscription() des sous-apps exclut Kimi
 * (aucun endpoint /v1/audio/transcriptions) — la dictée vocale reste sur son réglage.
 */

const ALL_APPS = ['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg'] as const;
type App = (typeof ALL_APPS)[number];

const KIMI_BASE_URL = 'https://api.kimi.com/coding';
// K3 : multimodal (image + vidéo), 256k de contexte sur les paliers courants.
// Sert l'OCR des schémas ET la correction — c'est le modèle le plus capable du plan.
const KIMI_OCR_MODEL = 'k3';
const KIMI_CHAT_MODEL = 'k3';
// think_efforts K3 = low|high|max (défaut high). 'none' est proscrit : il désactive le
// raisonnement ET bascule silencieusement sur K2.6 (cf. isKimi() dans api-client.ts).
const REASONING_EFFORT = 'high' as const;

// Repli sur K2.7 Coding, qui est également multimodal, si K3 est saturé (quota partagé
// entre tous les appareils/clés, fenêtre glissante de 5 h).
// kimi-for-coding-highspeed est volontairement absent : 401 hors palier Allegretto.
const KIMI_FALLBACK_MODEL = 'kimi-for-coding';

const MODEL_ROUTING = {
  ocr: {primary: KIMI_OCR_MODEL, fallbacks: [KIMI_FALLBACK_MODEL]},
  bareme: {primary: KIMI_CHAT_MODEL, fallbacks: [KIMI_FALLBACK_MODEL]},
  correction: {primary: KIMI_CHAT_MODEL, fallbacks: [KIMI_FALLBACK_MODEL]},
  studentChat: {primary: KIMI_CHAT_MODEL, fallbacks: [KIMI_FALLBACK_MODEL]},
  profile: {primary: KIMI_CHAT_MODEL, fallbacks: [KIMI_FALLBACK_MODEL]},
  // Assistant pédagogique : sans cette clé, les sous-apps la recréent depuis
  // `corrector_chat_model` mais SANS repli, et un seed ultérieur écraserait toute
  // surcharge posée dans la console ou dans les Réglages d'un correcteur.
  assistant: {primary: KIMI_CHAT_MODEL, fallbacks: [KIMI_FALLBACK_MODEL]},
};

interface KeySpec {
  key: string;
  value: unknown;
}

function buildKeySpecs(apiKey: string): KeySpec[] {
  return [
    {key: 'corrector_api_key', value: apiKey},
    {key: 'corrector_base_url', value: KIMI_BASE_URL},
    {key: 'corrector_ocr_model', value: KIMI_OCR_MODEL},
    {key: 'corrector_chat_model', value: KIMI_CHAT_MODEL},
    {key: 'corrector_reasoning_effort', value: REASONING_EFFORT},
    {key: 'corrector_model_routing', value: MODEL_ROUTING},
  ];
}

/** Apps cibles : arguments CLI (validés contre ALL_APPS) ou les 11 par défaut. */
function resolveTargetApps(): App[] {
  const args = process.argv.slice(2).map((a) => a.trim().toLowerCase());
  if (args.length === 0) return [...ALL_APPS];
  const invalid = args.filter((a) => !ALL_APPS.includes(a as App));
  if (invalid.length > 0) {
    throw new Error(
      `Apps inconnues : ${invalid.join(', ')}. Valeurs valides : ${ALL_APPS.join(', ')}.`,
    );
  }
  return args as App[];
}

function findAdminId(): string {
  const row = getDb()
    .prepare<[], UserRow>("SELECT * FROM users WHERE role = 'admin' AND active = 1 ORDER BY created_at ASC LIMIT 1")
    .get();
  if (!row) {
    throw new Error(
      "Aucun utilisateur admin actif trouvé — exécuter `npm run seed:admin` avant ce script.",
    );
  }
  return row.id;
}

function upsertGlobalSetting(app: string, key: string, value: unknown, adminId: string, now: number) {
  getDb()
    .prepare(
      `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (app, key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(app, key, encryptIfSensitive(key, JSON.stringify(value)), now, adminId);
}

function main() {
  const apiKey = (process.env.KIMI_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error(
      'KIMI_API_KEY vide — définir la variable (clé sk-kimi-... du plan Kimi Code) avant de lancer le script.',
    );
  }

  const db = getDb(); // force migrations au passage.
  const adminId = findAdminId();
  const targetApps = resolveTargetApps();
  const specs = buildKeySpecs(apiKey);
  const now = Date.now();

  console.log(`[seed-kimi] admin référence : ${adminId}`);
  console.log(`[seed-kimi] clé API : ${apiKey.slice(0, 6)}…${apiKey.slice(-4)} (len=${apiKey.length})`);
  console.log(`[seed-kimi] apps cibles : ${targetApps.join(', ')}`);
  console.log(
    `[seed-kimi] modèles : OCR=${KIMI_OCR_MODEL}, correction=${KIMI_CHAT_MODEL}, repli=${KIMI_FALLBACK_MODEL}, reasoning=${REASONING_EFFORT}`,
  );
  console.log('---');

  const count = db.transaction(() => {
    let total = 0;
    for (const app of targetApps) {
      for (const {key, value} of specs) {
        upsertGlobalSetting(app, key, value, adminId, now);
        total++;
      }
      console.log(`  ✓ ${app} : ${specs.length} clés écrites`);
    }
    return total;
  })();

  console.log('---');
  console.log(`[seed-kimi] terminé : ${count} upserts (${targetApps.length} apps × ${specs.length} clés).`);
}

main();
