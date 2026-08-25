import 'dotenv/config';

import {getDb, type UserRow} from '../server/db.ts';
import {encryptIfSensitive} from '../server/secrets-at-rest.ts';

/**
 * Seed Mistral — configure la clé API Mistral + modèles partagés pour les apps
 * `fr`, `nl`, `es`, `svt` dans `global_settings`. Idempotent : ré-écrit les mêmes
 * valeurs à chaque appel (UPSERT via ON CONFLICT).
 *
 * `pc` n'est PAS touché (reste sur GitHub Copilot).
 *
 * Usage : `MISTRAL_API_KEY=... npx tsx scripts/seed-mistral.ts` (depuis la racine de API_manage).
 *
 * La clé N'EST JAMAIS en dur : elle vient de MISTRAL_API_KEY (env ou .env),
 * comme pour seed-albert.ts.
 *
 * Valeurs écrites par app :
 *   - corrector_api_key          = clé Mistral (MISTRAL_API_KEY)
 *   - corrector_base_url         = https://api.mistral.ai
 *   - corrector_ocr_model        = mistral-ocr-2512
 *   - corrector_chat_model       = mistral-medium-2604
 *   - corrector_stt_model        = voxtral-mini-latest
 *   - corrector_reasoning_effort = high (mistral-medium-2604 supporte le reasoning)
 *   - corrector_model_routing    = routing complet (ocr → mistral-ocr-2512,
 *                                  4 autres tâches → mistral-medium-2604)
 *
 * `corrector_instance_config` n'est PAS écrite : la résolution dynamique dans
 * storage.ts force déjà {mode:'client'} pour tout non-admin. Et l'admin reçoit
 * {mode:'admin'} par défaut si aucune valeur n'est stockée — il garde la main.
 *
 * `corrector_ocr_preprocess` n'est PAS écrite non plus : valeur par défaut `true`
 * dans les sous-apps (App.tsx:useState(true)), donc héritée automatiquement.
 */

const TARGET_APPS = ['fr', 'nl', 'es', 'svt', 'ses', 'tech', 'en', 'philo', 'hg'] as const;
const MISTRAL_BASE_URL = 'https://api.mistral.ai';
// Id CANONIQUE daté (OCR 3) et non l'alias `-latest` : Mistral l'a retiré de sa liste de
// modèles le 2026-08-04, ce qui a suffi à faire réaligner l'OCR des 9 correcteurs sur un
// modèle de chat. Cf. `scripts/fix-mistral-ocr-2026-08-04.ts`.
const MISTRAL_OCR_MODEL = 'mistral-ocr-2512';
const MISTRAL_CHAT_MODEL = 'mistral-medium-2604';
const MISTRAL_STT_MODEL = 'voxtral-mini-latest';
// Repli si mistral-medium est en 429/503/timeout : mieux vaut une correction par
// mistral-small qu'un échec sec (audit 2026-07-11, P1 — fallbacks: [] = SPOF).
const MISTRAL_FALLBACK_CHAT_MODEL = 'mistral-small-latest';
const REASONING_EFFORT = 'high' as const;

const MODEL_ROUTING = {
  // OCR : mistral-medium (multimodal) en secours de /v1/ocr — le pipeline bascule
  // automatiquement sur le chemin chat-vision quand le modèle n'est pas mistral-ocr*.
  ocr: {primary: MISTRAL_OCR_MODEL, fallbacks: [MISTRAL_CHAT_MODEL]},
  bareme: {primary: MISTRAL_CHAT_MODEL, fallbacks: [MISTRAL_FALLBACK_CHAT_MODEL]},
  correction: {primary: MISTRAL_CHAT_MODEL, fallbacks: [MISTRAL_FALLBACK_CHAT_MODEL]},
  studentChat: {primary: MISTRAL_CHAT_MODEL, fallbacks: [MISTRAL_FALLBACK_CHAT_MODEL]},
  profile: {primary: MISTRAL_CHAT_MODEL, fallbacks: [MISTRAL_FALLBACK_CHAT_MODEL]},
  assistant: {primary: MISTRAL_CHAT_MODEL, fallbacks: [MISTRAL_FALLBACK_CHAT_MODEL]},
};

interface KeySpec {
  key: string;
  value: unknown;
}

function buildKeySpecs(apiKey: string): KeySpec[] {
  return [
    {key: 'corrector_api_key', value: apiKey},
    {key: 'corrector_base_url', value: MISTRAL_BASE_URL},
    {key: 'corrector_ocr_model', value: MISTRAL_OCR_MODEL},
    {key: 'corrector_chat_model', value: MISTRAL_CHAT_MODEL},
    {key: 'corrector_stt_model', value: MISTRAL_STT_MODEL},
    {key: 'corrector_reasoning_effort', value: REASONING_EFFORT},
    {key: 'corrector_model_routing', value: MODEL_ROUTING},
  ];
}

function findAdminId(): string {
  const row = getDb()
    .prepare<[], UserRow>("SELECT * FROM users WHERE role = 'admin' AND active = 1 ORDER BY created_at ASC LIMIT 1")
    .get();
  if (!row) {
    throw new Error(
      "Aucun utilisateur admin actif trouvé — exécuter `npm run seed:admin` (variables ADMIN_USERNAME/ADMIN_PASSWORD) avant ce script.",
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
  const apiKey = (process.env.MISTRAL_API_KEY ?? '').trim();
  if (!apiKey) {
    throw new Error(
      'MISTRAL_API_KEY absente — définir la variable (env ou .env) avant de lancer le script. La clé ne doit jamais être en dur dans le source.',
    );
  }

  const db = getDb(); // force migrations au passage.
  const adminId = findAdminId();
  const specs = buildKeySpecs(apiKey);
  const now = Date.now();

  console.log(`[seed-mistral] admin référence : ${adminId}`);
  console.log(`[seed-mistral] clé API : ${apiKey.slice(0, 6)}…${apiKey.slice(-4)} (len=${apiKey.length})`);
  console.log(`[seed-mistral] apps cibles : ${TARGET_APPS.join(', ')}`);
  console.log(`[seed-mistral] modèles : OCR=${MISTRAL_OCR_MODEL}, chat=${MISTRAL_CHAT_MODEL}, STT=${MISTRAL_STT_MODEL}, reasoning=${REASONING_EFFORT}`);
  console.log('---');

  const count = db.transaction(() => {
    let total = 0;
    for (const app of TARGET_APPS) {
      for (const {key, value} of specs) {
        upsertGlobalSetting(app, key, value, adminId, now);
        total++;
      }
      console.log(`  ✓ ${app} : ${specs.length} clés écrites`);
    }
    return total;
  })();

  console.log('---');
  console.log(`[seed-mistral] terminé : ${count} upserts (${TARGET_APPS.length} apps × ${specs.length} clés).`);
}

main();
