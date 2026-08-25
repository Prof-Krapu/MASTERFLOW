import {Router} from 'express';

import {requireUser} from '../auth.ts';
import {getDb} from '../db.ts';
import {computeCostEUR, type ModelPricing} from '../pricing-core.ts';
import {currentUser} from '../session.ts';

const ALLOWED_APPS = new Set(['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg']);

/** Tarifs admin de l'app (clé corrector_model_pricing) — null si absents/illisibles. */
function loadPricing(app: string): ModelPricing[] | null {
  const row = getDb()
    .prepare<[string], {value_json: string}>(
      "SELECT value_json FROM global_settings WHERE app = ? AND key = 'corrector_model_pricing'",
    )
    .get(app);
  if (!row) return null;
  try {
    const value = JSON.parse(row.value_json) as unknown;
    return Array.isArray(value) ? (value as ModelPricing[]) : null;
  } catch {
    return null;
  }
}

/**
 * Endpoint d'ingestion des événements token (un par appel LLM ou par batch OCR).
 * Appelé en fire-and-forget par les sous-apps en mode "managed" — voir
 * pushTelemetryEvent dans lib/tauri.ts. Toléré pour user comme admin.
 */
export function createTelemetryRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.post('/token', (req, res) => {
    const u = currentUser(req)!;
    const b = req.body ?? {};
    const app = String(b.app ?? '');
    if (!ALLOWED_APPS.has(app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const model = String(b.model ?? 'inconnu');
    const task = String(b.task ?? 'other');
    const ts = Number.isFinite(Number(b.ts)) ? Number(b.ts) : Date.now();
    const promptTokens = Math.max(0, Number(b.promptTokens) || 0);
    const completionTokens = Math.max(0, Number(b.completionTokens) || 0);
    const pages = Math.max(0, Number(b.pages) || 0);
    // Intégrité des coûts : recalcul serveur depuis tokens × tarif admin — la valeur
    // cliente n'est qu'un repli quand aucune table de tarifs n'existe pour l'app.
    const serverCost = computeCostEUR(model, promptTokens, completionTokens, pages, loadPricing(app) ?? []);
    const costEUR = serverCost ?? (Number(b.costEUR) || 0);
    // Identifiant + titre du DS rattaché (dimension « par DS » du monitoring).
    // Optionnels : absents pour les tâches sans DS (assistant) ou l'historique antérieur.
    const dsRef = b.dsRef ? String(b.dsRef).slice(0, 200) : null;
    const dsTitle = b.dsTitle ? String(b.dsTitle).slice(0, 300) : null;

    getDb()
      .prepare(
        `INSERT INTO token_events (user_id, app, ts, model, task, prompt_tokens, completion_tokens, pages, cost_eur, ds_ref, ds_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(u.userId!, app, ts, model, task, promptTokens, completionTokens, pages, costEUR, dsRef, dsTitle);
    res.json({ok: true});
  });

  return router;
}
