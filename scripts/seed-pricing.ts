import 'dotenv/config';

import {getDb, type UserRow} from '../server/db.ts';

/**
 * Seed Pricing — injecte les tarifs modèles dans `global_settings` pour les 5 apps.
 * Idempotent : ré-écrit les mêmes valeurs à chaque appel (UPSERT via ON CONFLICT).
 *
 * Usage : `npx tsx scripts/seed-pricing.ts` (depuis la racine de API_manage).
 *
 * Les tarifs sont en EUR / 1M tokens (ou EUR / page pour l'OCR).
 * Basés sur les prix officiels au 15/06/2026, convertis via taux BCE (1 USD = 0.8616 EUR).
 *
 * Priorité de merge côté sous-apps :
 *   admin (global_settings) > personnalisations user > DEFAULT_PRICING
 */

const TARGET_APPS = ['pc', 'fr', 'nl', 'es', 'svt', 'ses', 'tech', 'en', 'philo', 'hg'] as const;

interface ModelPricing {
  model: string;
  inputPer1M: number;
  outputPer1M: number;
  perPage?: number;
}

const PRICING: ModelPricing[] = [
  {model: 'gpt-4o', inputPer1M: 2.15, outputPer1M: 8.62},
  {model: 'gpt-5-mini', inputPer1M: 1.08, outputPer1M: 4.31},
  {model: 'gpt-5.4', inputPer1M: 2.15, outputPer1M: 12.92},
  {model: 'mistral-large', inputPer1M: 0.43, outputPer1M: 1.29},
  {model: 'mistral-medium-2604', inputPer1M: 1.29, outputPer1M: 6.46},
  {model: 'mistral-small', inputPer1M: 0.09, outputPer1M: 0.26},
  // Clé GÉNÉRIQUE : le rapprochement se fait par sous-chaîne, et Mistral fait tourner les
  // versions (mistral-ocr-2512, -3, -4-0). `mistral-ocr-latest` ne couvrait qu'elle-même.
  {model: 'mistral-ocr', inputPer1M: 0.0, outputPer1M: 0.0, perPage: 0.00172},
  // ----- Albert (DINUM) : souverain et GRATUIT, tout à 0. -----
  // Sans entrée explicite, `estimateCost` retombe sur 'default' (1 €/3 € par million) et
  // affiche un coût FICTIF. La correspondance retient la plus longue sous-chaîne, d'où des
  // entrées spécifiques plutôt qu'un 'deepseek' ou un 'mistral' générique — le préréglage
  // DeepSeek et l'API Mistral, eux, sont payants.
  {model: 'gpt-oss-120b', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'deepseek-v4', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'qwen3-coder', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'ministral-3', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'lightonocr', inputPer1M: 0.0, outputPer1M: 0.0},
  // DEUX formes pour le Mistral-Small d'Albert : DINUM l'a renommé le 2026-07-28 en
  // remplaçant les points par des tirets (`mistral-small-3-2-24b-…`), et l'ancienne forme
  // reste un alias valide. Sans l'entrée à tirets, le nouvel id retombe sur 'mistral-small'
  // (0,09 €/0,26 €) et facturerait une API gratuite.
  {model: 'mistral-small-3.2', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'mistral-small-3-2', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'minimax-m3', inputPer1M: 0.27, outputPer1M: 1.07},
  {model: 'glm-4.6v', inputPer1M: 0.26, outputPer1M: 0.77},
  {model: 'glm-5.1', inputPer1M: 1.21, outputPer1M: 3.79},
  {model: 'gemini-3.1', inputPer1M: 1.72, outputPer1M: 10.34},
  // Kimi Code = forfait au quota (pas de facturation au token) -> 0. Entrees
  // specifiques (pas un 'kimi' generique) : le matching retient la plus longue
  // sous-chaine, et 'kimi' passerait aussi kimi-k2.5 (OpenCode Go) a 0.
  {model: 'k3', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'kimi-for-coding', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'default', inputPer1M: 1.0, outputPer1M: 3.0},
];

function resolveAdminUserId(): string {
  const db = getDb();
  const row = db
    .prepare<[], UserRow>("SELECT * FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1")
    .get();
  if (!row) {
    console.error('Aucun admin trouvé en base. Lancez seed:admin d\'abord.');
    process.exit(1);
  }
  return row.id;
}

function seed(): void {
  const db = getDb();
  const adminId = resolveAdminUserId();
  const now = Date.now();
  const valueJson = JSON.stringify(PRICING);

  const stmt = db.prepare(
    `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by)
     VALUES (?, 'corrector_model_pricing', ?, ?, ?)
     ON CONFLICT (app, key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at,
       updated_by = excluded.updated_by`,
  );

  for (const app of TARGET_APPS) {
    stmt.run(app, valueJson, now, adminId);
    console.log(`  ✓ ${app} : ${PRICING.length} tarifs injectés`);
  }

  console.log(`\nSeed terminé. ${TARGET_APPS.length} apps mises à jour.`);
}

seed();
