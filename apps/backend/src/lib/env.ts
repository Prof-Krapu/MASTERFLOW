import 'dotenv/config';

/**
 * Configuration centralisée, lue une fois au boot.
 *
 * Principe : démarrable sans `.env` en dev (fallbacks), strict en prod.
 * Aucun secret réel codé en dur — uniquement des valeurs de dev explicitement marquées.
 */

const isProd = process.env.NODE_ENV === 'production';

function readSecret(name: string, devFallback: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (isProd) {
    throw new Error(`[env] ${name} requis en production.`);
  }
  console.warn(`[env] ${name} absent — fallback DEV utilisé. Définir dans .env avant toute mise en ligne.`);
  return devFallback;
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 8000),
  apiBase: '/api/v1',

  jwtSecret: readSecret('JWT_SECRET', 'dev-masterflow-secret-change-me-32-characters'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',

  godmode: {
    username: process.env.GODMODE_USERNAME ?? 'vincent',
    password: process.env.GODMODE_PASSWORD ?? (isProd ? '' : 'masterflow'),
  },

  /** Config LLM. `provider=mock` → réponses simulées, aucun appel réseau (dev sans clé). */
  llm: {
    provider: process.env.LLM_PROVIDER ?? 'mock',
    apiKey: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_BASE_URL ?? '',
    model: process.env.LLM_MODEL ?? '',
  },
} as const;
