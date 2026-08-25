import 'dotenv/config';

import {PROVIDER_PRESETS} from '../lib/model-routing.ts';
import {getDb, type UserRow} from '../server/db.ts';
import {encryptIfSensitive} from '../server/secrets-at-rest.ts';

/**
 * Seed Albert — configure la clé API souveraine Albert (DINUM/Etalab) + modèles
 * partagés dans `global_settings`. Idempotent (UPSERT via ON CONFLICT).
 *
 * Albert est OpenAI-compatible (baseUrl + Bearer) mais l'OCR passe par la vision
 * multimodale (Mistral-Small-3.2, l'endpoint /v1/ocr d'Albert est inopérant) et la
 * correction par gpt-oss-120b (raisonnement). L'extraction structurée (normalisation CSV,
 * barème) est routée vers deepseek-v4-flash — pool de quota distinct de gpt-oss, 393 k de
 * contexte — et les textes rédactionnels sur l'élève (appréciations de bulletin, synthèses,
 * profil du chat élève) vers Mistral-Small-3.2, PAS vers deepseek : DINUM ne le recommande
 * que pour du code, et il est révocable au 2026-10-01.
 *
 * Usage (depuis la racine de API_manage) :
 *   ALBERT_API_KEY=sk-eyJ... npx tsx scripts/seed-albert.ts            # → les 11 apps
 *   ALBERT_API_KEY=sk-eyJ... npx tsx scripts/seed-albert.ts svt maths  # → apps choisies
 *
 * La clé N'EST JAMAIS en dur : elle vient de ALBERT_API_KEY (clé JWT propre à chaque
 * compte). Le script échoue clairement si la variable est absente.
 *
 * Les VALEURS écrites viennent toutes de `PROVIDER_PRESETS.albert` (lib/model-routing.ts) :
 * base URL, modèles OCR/chat/STT, effort de raisonnement et routage des 7 tâches. Les lister
 * ici en dur serait la garantie de les voir diverger — c'est exactement ce qui s'est produit
 * avant le 2026-07-28.
 */

const ALL_APPS = ['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg'] as const;
type App = (typeof ALL_APPS)[number];

/**
 * Modèles et routage DÉRIVÉS du préréglage (`lib/model-routing.ts`) et non recopiés.
 *
 * Ils l'étaient jusqu'au 2026-07-28, et les deux listes avaient divergé. Le préréglage est la
 * source unique : la console admin l'applique, ce script écrit exactement la même chose, et un
 * changement de gamme chez DINUM ne se corrige plus qu'à un seul endroit.
 */
const PRESET = PROVIDER_PRESETS.albert!;

const ALBERT_BASE_URL = PRESET.baseUrl;
const ALBERT_OCR_MODEL = PRESET.ocrModel;
const ALBERT_CHAT_MODEL = PRESET.chatModel;
// Route `structure` (et non `profile`) depuis le 2026-07-30 : les deux ont été séparées, la
// normalisation CSV est passée sur `structure`. Lire `profile` ici écrirait mistral-small dans
// le journal en le présentant comme le modèle CSV.
const ALBERT_CSV_MODEL = PRESET.routing!.structure.primary;
const ALBERT_PROFILE_MODEL = PRESET.routing!.profile.primary;
// Dictée vocale : l'ID canonique est aujourd'hui `whisper-large-v3` et `openai/whisper-large-v3`
// n'en est plus qu'un alias — les deux répondent 200 (vérifié 2026-07-28 sur GET /v1/models/:id).
// On garde la forme préfixée, seule éprouvée en dictée réelle (2026-07-08 : 3 min de webm/opus
// transcrites d'un coup, pas de limite 30 s côté serveur).
const ALBERT_STT_MODEL = PRESET.sttModel;
const REASONING_EFFORT = PRESET.reasoningEffort;

const MODEL_ROUTING = PRESET.routing;

interface KeySpec {
  key: string;
  value: unknown;
}

function buildKeySpecs(apiKey: string): KeySpec[] {
  return [
    {key: 'corrector_api_key', value: apiKey},
    {key: 'corrector_base_url', value: ALBERT_BASE_URL},
    {key: 'corrector_ocr_model', value: ALBERT_OCR_MODEL},
    {key: 'corrector_chat_model', value: ALBERT_CHAT_MODEL},
    {key: 'corrector_reasoning_effort', value: REASONING_EFFORT},
    {key: 'corrector_model_routing', value: MODEL_ROUTING},
    {key: 'corrector_stt_model', value: ALBERT_STT_MODEL},
  ];
}

/** Apps cibles : arguments CLI (validés contre ALL_APPS) ou les 6 par défaut. */
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
  const apiKey = (process.env.ALBERT_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error(
      'ALBERT_API_KEY vide — définir la variable (clé JWT sk-eyJ... du compte Albert) avant de lancer le script.',
    );
  }

  const db = getDb(); // force migrations au passage.
  const adminId = findAdminId();
  const targetApps = resolveTargetApps();
  const specs = buildKeySpecs(apiKey);
  const now = Date.now();

  console.log(`[seed-albert] admin référence : ${adminId}`);
  console.log(`[seed-albert] clé API : ${apiKey.slice(0, 6)}…${apiKey.slice(-4)} (len=${apiKey.length})`);
  console.log(`[seed-albert] apps cibles : ${targetApps.join(', ')}`);
  console.log(
    `[seed-albert] modèles : OCR=${ALBERT_OCR_MODEL}, correction=${ALBERT_CHAT_MODEL}, ` +
      `structure/CSV=${ALBERT_CSV_MODEL}, profil/rédactionnel=${ALBERT_PROFILE_MODEL}, reasoning=${REASONING_EFFORT}`,
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
  console.log(`[seed-albert] terminé : ${count} upserts (${targetApps.length} apps × ${specs.length} clés).`);
}

main();
