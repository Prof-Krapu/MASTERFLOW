/**
 * Tarification LLM — €/1000 tokens (entrée, sortie) par modèle.
 *
 * Table déclarative et conservatrice : un modèle inconnu coûte **0** (on n'invente
 * jamais un coût). Sert au calcul de `cost_eur` inscrit dans `token_events`.
 * À enrichir au fil des providers réellement branchés via `.env`.
 *
 * Le match est d'abord exact, puis par préfixe (du plus spécifique au plus court),
 * pour absorber les suffixes de version (`gpt-4o-2026-01-01` → `gpt-4o`).
 */

interface Price {
  /** € / 1k tokens d'entrée (prompt). */
  in: number;
  /** € / 1k tokens de sortie (completion). */
  out: number;
}

// Prix indicatifs (à ajuster au branchement réel). Clés en minuscules.
const PRICES: Record<string, Price> = {
  mock: {in: 0, out: 0},
  'gpt-4o-mini': {in: 0.00014, out: 0.00057},
  'gpt-4o': {in: 0.0023, out: 0.0091},
  'mistral-small': {in: 0.0002, out: 0.0006},
  'mistral-medium': {in: 0.0024, out: 0.0073},
  'deepseek-chat': {in: 0.0001, out: 0.0002},
};

// Préfixes triés du plus long au plus court → on préfère le match le plus spécifique.
const PREFIXES = Object.keys(PRICES).sort((a, b) => b.length - a.length);

function priceFor(model: string): Price | null {
  const m = model.toLowerCase();
  const exact = PRICES[m];
  if (exact) return exact;
  for (const key of PREFIXES) {
    if (m.startsWith(key)) {
      const p = PRICES[key];
      if (p) return p;
    }
  }
  return null;
}

/**
 * Coût estimé d'un appel, en euros. Renvoie `0` si le modèle est inconnu
 * (prudence : jamais de coût inventé). Arrondi à 6 décimales pour limiter le
 * bruit flottant.
 */
export function costFor(model: string, promptTokens: number, completionTokens: number): number {
  const p = priceFor(model);
  if (!p) return 0;
  const safePrompt = Number.isSafeInteger(promptTokens) && promptTokens >= 0 ? promptTokens : 0;
  const safeCompletion = Number.isSafeInteger(completionTokens) && completionTokens >= 0 ? completionTokens : 0;
  const eur = (safePrompt / 1000) * p.in + (safeCompletion / 1000) * p.out;
  return Math.round(eur * 1e6) / 1e6;
}
