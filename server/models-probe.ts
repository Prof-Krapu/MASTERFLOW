/**
 * URL de listing des modèles + en-têtes, par fournisseur — miroir de l'auth des apps
 * correcteurs (`API_corrector/lib/copilot-models.ts`, `lib/api-client.ts`) afin que le test
 * de clé admin se comporte comme le client réel.
 *
 * Module feuille, sans dépendance Express/session/DB : il est importé par le test de clé
 * (`routes/admin-settings.ts`), la route santé (`routes/health.ts`) ET le rafraîchissement
 * de catalogue (`model-catalog-service.ts`). Le garder ici évite le cycle d'imports qui
 * naîtrait si `model-catalog-service.ts` devait le tirer depuis `routes/admin-settings.ts`,
 * lequel dépend maintenant du service.
 */
export function modelsProbe(baseUrl: string, apiKey: string): {url: string; headers: Record<string, string>} {
  const stripped = baseUrl.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
  // GitHub Copilot : endpoint SANS /v1 + en-têtes obligatoires (sinon 404 / 401).
  // cf. API_corrector/lib/copilot-models.ts:72-80
  if (stripped.includes('githubcopilot.com')) {
    headers['User-Agent'] = 'api-corrector/1.0.0';
    headers['Openai-Intent'] = 'conversation-edits';
    headers['x-initiator'] = 'user';
    return {url: `${stripped}/models`, headers};
  }
  // Générique OpenAI-compatible (Mistral, Albert, OpenAI, OpenCode Go…), idempotent sur le
  // suffixe /vN : certains presets le mettent dans la baseUrl, d'autres non. Sans ça →
  // `…/v1/v1/models` → 404.
  const url = /\/v\d+$/i.test(stripped) ? `${stripped}/models` : `${stripped}/v1/models`;
  return {url, headers};
}
