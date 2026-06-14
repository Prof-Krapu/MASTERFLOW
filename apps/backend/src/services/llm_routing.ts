import {
  LLMTaskSchema,
  TaskModelProfileSchema,
  type LLMTask,
  type Role,
  type TaskModelProfile,
} from '@masterflow/shared';

import {getDb, type TaskModelProfileRow} from '../db/schema.ts';

export interface LLMRuntimeConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  egressAllowlist: readonly string[];
}

export interface ResolvedLLMRoute {
  task: LLMTask;
  provider: string;
  model: string;
  baseUrl: string | null;
  apiKey: string | null;
  profile: TaskModelProfile | null;
}

function toProfile(row: TaskModelProfileRow): TaskModelProfile {
  return TaskModelProfileSchema.parse({
    profile_id: row.id,
    task: row.task,
    allowed_providers: JSON.parse(row.allowed_providers_json) as unknown,
    fallback_order: JSON.parse(row.fallback_order_json) as unknown,
    model: row.model ?? null,
    role_models: row.role_models_json ? (JSON.parse(row.role_models_json) as unknown) : null,
    privacy_mode: row.privacy_mode,
    max_cost_eur: row.max_cost_eur,
    max_latency_ms: row.max_latency_ms,
    status: row.status,
  });
}

export function getValidatedTaskProfile(task: LLMTask): TaskModelProfile | null {
  const rows = getDb()
    .prepare(
      `SELECT * FROM task_model_profiles
       WHERE task = ? AND status = 'validated'
       ORDER BY updated_at DESC`,
    )
    .all(task) as TaskModelProfileRow[];

  if (rows.length > 1) throw new Error(`llm_route_ambiguous_profile:${task}`);
  return rows[0] ? toProfile(rows[0]) : null;
}

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}

function normalizeAllowedOrigin(value: string): string {
  const url = new URL(value);
  if (url.username || url.password) throw new Error('llm_egress_credentials_forbidden');
  return url.origin;
}

/**
 * Gate anti-SSRF : origine exacte allowlistée, HTTPS distant, HTTP limité au loopback.
 */
export function assertAllowedEgress(baseUrl: string, allowlist: readonly string[]): URL {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('llm_egress_invalid_url');
  }

  if (url.username || url.password) throw new Error('llm_egress_credentials_forbidden');
  if (url.search || url.hash) throw new Error('llm_egress_query_forbidden');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname))) {
    throw new Error('llm_egress_https_required');
  }

  let allowedOrigins: string[];
  try {
    allowedOrigins = allowlist.map(normalizeAllowedOrigin);
  } catch {
    throw new Error('llm_egress_invalid_allowlist');
  }
  if (!allowedOrigins.includes(url.origin)) throw new Error('llm_egress_origin_denied');
  return url;
}

/**
 * Résout le provider global contre le profil validé de la tâche.
 * Le mock est local et reste disponible sans profil. Tout provider externe est fail-closed.
 */
export function resolveLLMRoute(
  taskInput: string,
  config: LLMRuntimeConfig,
  role?: Role,
): ResolvedLLMRoute {
  const task = LLMTaskSchema.parse(taskInput);
  const provider = config.provider.trim();

  if (provider === 'mock') {
    return {
      task,
      provider,
      model: 'mock',
      baseUrl: null,
      apiKey: null,
      profile: getValidatedTaskProfile(task),
    };
  }

  const profile = getValidatedTaskProfile(task);
  if (!profile) throw new Error(`llm_route_missing_validated_profile:${task}`);
  if (!profile.allowed_providers.includes(provider)) {
    throw new Error(`llm_route_provider_denied:${provider}`);
  }
  if (profile.fallback_order.length > 0 && !profile.fallback_order.includes(provider)) {
    throw new Error(`llm_route_provider_absent_from_fallback:${provider}`);
  }
  // Routage par tâche × rôle : un modèle déclaré pour le rôle de l'appelant prime,
  // puis le modèle du profil, puis le modèle global env. Économie de tokens : on
  // n'escalade vers un modèle fort que pour les rôles configurés (prof/admin). Le
  // provider/base URL/secrets restent ceux du serveur — ni l'egress ni la privacy
  // ne changent.
  const roleModel = role ? profile.role_models?.[role] : undefined;
  const model = roleModel ?? profile.model ?? config.model;
  if (!config.apiKey || !model || !config.baseUrl) {
    throw new Error('llm_route_incomplete_provider_config');
  }

  const base = assertAllowedEgress(config.baseUrl, config.egressAllowlist);
  if (profile.privacy_mode === 'local_only' && !isLoopback(base.hostname)) {
    throw new Error('llm_route_privacy_denied');
  }

  return {
    task,
    provider,
    model,
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    profile,
  };
}
