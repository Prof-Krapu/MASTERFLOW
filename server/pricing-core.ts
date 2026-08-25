/**
 * Calcul serveur du coût d'un événement token (audit 2026-07-11, P2) : avant,
 * `costEUR` était calculé côté client et gobé tel quel — un fork buggé ou une
 * valeur forgée faussait tout le monitoring.
 *
 * La sémantique est le MIROIR EXACT de estimateCost/estimatePageCost du
 * lib/token-tracker.ts des sous-apps : correspondance par sous-chaîne la plus
 * longue (sinon « gpt-4o » l'emporte sur « gpt-4o-mini » et facture ×16),
 * entrée `default` en repli, tarif perPage réservé aux modèles qui en ont un.
 *
 * Module pur, sans dépendance session/DB — testé dans tests/pricing-core.test.ts.
 */

export interface ModelPricing {
  model: string;
  inputPer1M: number;
  outputPer1M: number;
  perPage?: number;
}

function bestMatch(pricing: ModelPricing[], modelLower: string, needPerPage: boolean): ModelPricing | undefined {
  return pricing
    .filter(
      (p) =>
        p.model !== 'default' &&
        (!needPerPage || typeof p.perPage === 'number') &&
        modelLower.includes(p.model.toLowerCase()),
    )
    .sort((a, b) => b.model.length - a.model.length)[0];
}

/**
 * Coût total (tokens + pages) d'un événement, ou null si aucune table de tarifs
 * exploitable — l'appelant retombe alors sur la valeur cliente.
 */
export function computeCostEUR(
  model: string,
  promptTokens: number,
  completionTokens: number,
  pages: number,
  pricing: ModelPricing[],
): number | null {
  if (!Array.isArray(pricing) || pricing.length === 0) return null;
  const modelLower = model.toLowerCase();
  const rates = bestMatch(pricing, modelLower, false) ?? pricing.find((p) => p.model === 'default');
  const pageRates = bestMatch(pricing, modelLower, true);
  if (!rates && !pageRates) return null;
  const tokenCost = rates
    ? (promptTokens / 1_000_000) * rates.inputPer1M + (completionTokens / 1_000_000) * rates.outputPer1M
    : 0;
  const pageCost = pageRates?.perPage ? pages * pageRates.perPage : 0;
  return tokenCost + pageCost;
}
