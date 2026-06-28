import 'dotenv/config';

/**
 * Configuration centralisée, lue une fois au boot.
 *
 * Principe : démarrable sans `.env` en dev (fallbacks), strict en prod.
 * Aucun secret réel codé en dur — uniquement des valeurs de dev explicitement marquées.
 */

const isProd = process.env.NODE_ENV === 'production';

function readCsv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isTemplateValue(value: string | undefined): boolean {
  return !value || value.trim().length === 0 || value.startsWith('REPLACE_WITH_');
}

function readSecret(name: string, devFallback: string, minimumLength = 1): string {
  const v = process.env[name]?.trim() ?? '';
  if (!isTemplateValue(v) && v.length >= minimumLength) return v;
  if (isProd) {
    throw new Error(`[env] ${name} requis en production (minimum ${minimumLength} caractères, sans valeur d'exemple).`);
  }
  console.warn(`[env] ${name} absent — fallback DEV utilisé. Définir dans .env avant toute mise en ligne.`);
  return devFallback;
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 8000),
  apiBase: '/api/v1',
  /** SHA injecté par l'hébergeur ou l'opérateur ; jamais inféré depuis le checkout local. */
  releaseSha: process.env.MASTERFLOW_RELEASE_SHA?.trim() || null,

  jwtSecret: readSecret('JWT_SECRET', 'dev-masterflow-secret-change-me-32-characters', 32),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',

  godmode: {
    username: readSecret('GODMODE_USERNAME', 'vincent'),
    password: readSecret('GODMODE_PASSWORD', 'masterflow', 12),
  },

  malex: {
    username: readSecret('MALEX_USERNAME', 'malex'),
    password: readSecret('MALEX_PASSWORD', 'masterflow', 8),
  },

  /** Config LLM. `provider=mock` → réponses simulées, aucun appel réseau (dev sans clé). */
  llm: {
    provider: process.env.LLM_PROVIDER ?? 'mock',
    apiKey: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_BASE_URL ?? '',
    model: process.env.LLM_MODEL ?? '',
    egressAllowlist: readCsv('LLM_EGRESS_ALLOWLIST'),
  },
} as const;
