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
