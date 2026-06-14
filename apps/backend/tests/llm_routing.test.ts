import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {
  assertAllowedEgress,
  resolveLLMRoute,
  type LLMRuntimeConfig,
} from '../src/services/llm_routing.ts';

const remoteConfig: LLMRuntimeConfig = {
  provider: 'provider-approved',
  apiKey: 'test-secret',
  baseUrl: 'https://llm.example.test/v1',
  model: 'model-approved',
  egressAllowlist: ['https://llm.example.test'],
};

beforeAll(async () => {
  await seedAll();
  // Le seed pose des profils OpenRouter validés par tâche ; on isole ce test en
  // repartant d'une table vide pour contrôler exactement les profils sous test.
  getDb().prepare('DELETE FROM task_model_profiles').run();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO task_model_profiles
         (id, task, allowed_providers_json, fallback_order_json, privacy_mode,
          max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'validated', ?, ?, NULL)`,
    )
    .run(
      'routing-profile-criterion',
      'criterion_analysis',
      JSON.stringify(['provider-approved']),
      JSON.stringify(['provider-approved']),
      'approved_remote',
      1,
      30_000,
      now,
      now,
    );

  // Profil avec un modèle propre (routage multi-LLM selon rôle/besoin).
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO task_model_profiles
         (id, task, allowed_providers_json, fallback_order_json, model, privacy_mode,
          max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'validated', ?, ?, NULL)`,
    )
    .run(
      'routing-profile-rubric',
      'rubric_extraction',
      JSON.stringify(['provider-approved']),
      JSON.stringify(['provider-approved']),
      'task-model-rubric-v2',
      'approved_remote',
      1,
      30_000,
      now,
      now,
    );

  // Profil avec routage par rôle (économie de tokens) : modèle de base bon marché,
  // escalade teacher/admin.
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO task_model_profiles
         (id, task, allowed_providers_json, fallback_order_json, model, role_models_json, privacy_mode,
          max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'validated', ?, ?, NULL)`,
    )
    .run(
      'routing-profile-chat',
      'chat',
      JSON.stringify(['provider-approved']),
      JSON.stringify(['provider-approved']),
      'chat-base-cheap',
      JSON.stringify({teacher: 'chat-strong-teacher', admin: 'chat-strong-admin'}),
      'approved_remote',
      1,
      30_000,
      now,
      now,
    );
});

describe('PR-CB2 — routage LLM et egress gated', () => {
  it('conserve le mock local sans profil validé ni réseau', () => {
    const route = resolveLLMRoute('chat', {
      provider: 'mock',
      apiKey: '',
      baseUrl: '',
      model: '',
      egressAllowlist: [],
    });

    expect(route.provider).toBe('mock');
    expect(route.baseUrl).toBeNull();
  });

  it('résout un provider externe uniquement via le profil validé de la tâche', () => {
    const route = resolveLLMRoute('criterion_analysis', remoteConfig);

    expect(route.provider).toBe('provider-approved');
    expect(route.profile?.status).toBe('validated');
    expect(route.profile?.task).toBe('criterion_analysis');
    // Profil sans modèle propre → repli sur le modèle global de l'environnement.
    expect(route.profile?.model).toBeNull();
    expect(route.model).toBe('model-approved');
  });

  it('fait primer le modèle du profil sur le modèle global', () => {
    const route = resolveLLMRoute('rubric_extraction', remoteConfig);

    expect(route.provider).toBe('provider-approved');
    expect(route.profile?.model).toBe('task-model-rubric-v2');
    expect(route.model).toBe('task-model-rubric-v2');
  });

  it('utilise le modèle du profil même quand le modèle global est vide', () => {
    const route = resolveLLMRoute('rubric_extraction', {...remoteConfig, model: ''});

    expect(route.model).toBe('task-model-rubric-v2');
  });

  it('reste fail-closed si ni le profil ni l environnement ne fournit de modèle', () => {
    expect(() => resolveLLMRoute('criterion_analysis', {...remoteConfig, model: ''})).toThrow(
      'llm_route_incomplete_provider_config',
    );
  });

  it('escalade le modèle selon le rôle (teacher/admin) pour économiser des tokens', () => {
    expect(resolveLLMRoute('chat', remoteConfig, 'teacher').model).toBe('chat-strong-teacher');
    expect(resolveLLMRoute('chat', remoteConfig, 'admin').model).toBe('chat-strong-admin');
  });

  it('garde le modèle de base pour un rôle sans escalade, ou sans rôle fourni', () => {
    // student n'a pas d'entrée role_models → modèle de base du profil.
    expect(resolveLLMRoute('chat', remoteConfig, 'student').model).toBe('chat-base-cheap');
    // aucun rôle fourni (ex. runner de fond) → modèle de base du profil.
    expect(resolveLLMRoute('chat', remoteConfig).model).toBe('chat-base-cheap');
  });

  it('refuse une tâche sans profil validé et un provider non autorisé', () => {
    expect(() => resolveLLMRoute('feedback_draft', remoteConfig)).toThrow(
      'llm_route_missing_validated_profile',
    );
    expect(() =>
      resolveLLMRoute('criterion_analysis', {...remoteConfig, provider: 'provider-rogue'}),
    ).toThrow('llm_route_provider_denied');
  });

  it('applique une allowlist d origine exacte et interdit HTTP distant', () => {
    expect(assertAllowedEgress('https://llm.example.test/v1', remoteConfig.egressAllowlist).origin)
      .toBe('https://llm.example.test');
    expect(() =>
      assertAllowedEgress('https://evil.example.test/v1', remoteConfig.egressAllowlist),
    ).toThrow('llm_egress_origin_denied');
    expect(() =>
      assertAllowedEgress('http://llm.example.test/v1', ['http://llm.example.test']),
    ).toThrow('llm_egress_https_required');
  });

  it('autorise HTTP uniquement sur loopback quand il est explicitement allowlisté', () => {
    expect(assertAllowedEgress('http://127.0.0.1:11434/v1', ['http://127.0.0.1:11434']).origin)
      .toBe('http://127.0.0.1:11434');
  });
});
