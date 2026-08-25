/**
 * Fonctions pures de la route santé (server/routes/health.ts), isolées dans un
 * module sans dépendance Express/session pour rester importables par les tests
 * (session.ts jette au chargement si SESSION_SECRET est absent de l'env).
 */

export interface ProviderConfig {
  app: string;
  baseUrl: string;
  apiKey: string;
}

export interface ProviderGroup {
  baseUrl: string;
  apiKey: string;
  apps: string[];
}

/** Regroupe les configs par (baseUrl, clé) — 11 apps mais 2-3 fournisseurs réels. */
export function dedupeProviderConfigs(configs: ProviderConfig[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const cfg of configs) {
    if (!cfg.baseUrl || !cfg.apiKey) continue;
    const key = `${cfg.baseUrl} ${cfg.apiKey}`;
    const group = groups.get(key);
    if (group) {
      group.apps.push(cfg.app);
    } else {
      groups.set(key, {baseUrl: cfg.baseUrl, apiKey: cfg.apiKey, apps: [cfg.app]});
    }
  }
  return [...groups.values()];
}

/** Nom d'affichage du fournisseur depuis sa baseUrl. */
export function providerLabel(baseUrl: string): string {
  if (baseUrl.includes('api.mistral.ai')) return 'Mistral';
  if (baseUrl.includes('albert.api.etalab.gouv.fr')) return 'Albert (Etalab)';
  if (baseUrl.includes('githubcopilot.com')) return 'GitHub Copilot';
  if (baseUrl.includes('api.kimi.com')) return 'Kimi (Moonshot)';
  // Deux plans distincts sur le même hôte : /zen/go sert 23 modèles, /zen en sert 59.
  if (baseUrl.includes('opencode.ai/zen/go')) return 'OpenCode Go';
  if (baseUrl.includes('opencode.ai')) return 'OpenCode';
  if (baseUrl.includes('openai.com')) return 'OpenAI';
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return baseUrl;
  }
}
