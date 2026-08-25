/**
 * Allowlist anti-SSRF du test de clé admin (audit 2026-07-11, P2) : le
 * POST /:app/test fetchait n'importe quelle URL http(s) fournie, avec l'en-tête
 * Authorization. Admin-only, mais on ferme le vecteur (métadonnées cloud,
 * localhost, plages privées) en n'autorisant que les hôtes fournisseurs connus.
 *
 * Miroir de DEFAULT_ALLOWED_HOSTS du proxy des correcteurs
 * (API_corrector/proxy-routes.ts) — même liste, même sémantique sous-domaines.
 * Hôtes supplémentaires (fournisseur personnalisé) : PROBE_ALLOWED_HOSTS="host1,host2".
 */
const DEFAULT_PROBE_ALLOWED_HOSTS = [
  'api.githubcopilot.com',
  'github.com',
  'api.openai.com',
  'open.bigmodel.cn',
  'api.deepseek.com',
  'openrouter.ai',
  'api.groq.com',
  'api.mistral.ai',
  'opencode.ai',
  'api.kimi.com',
  'generativelanguage.googleapis.com',
  'albert.api.etalab.gouv.fr',
  'pildf-1.tail8d8b1f.ts.net',
  // Registre de capacités des modèles (vision, reasoning, contexte, coût) interrogé par
  // `model-catalog-service.ts`. Aucune clé n'y est envoyée : l'API est publique.
  'models.dev',
];

/** Pur et testable : `extraCsv` remplace la lecture d'env dans les tests. */
export function isProbeHostAllowed(
  hostname: string,
  extraCsv: string | undefined = process.env.PROBE_ALLOWED_HOSTS,
): boolean {
  const host = hostname.toLowerCase();
  const extra = (extraCsv || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_PROBE_ALLOWED_HOSTS, ...extra].some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}
