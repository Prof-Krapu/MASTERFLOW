import {beforeAll, describe, expect, it} from 'vitest';

import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildMasterFlowOrientationSnapshot} from '../src/services/orientation_fabric.ts';

const godmode: AuthUser = {id: 'orientation-godmode', username: 'orientation', role: 'godmode'};
const student: AuthUser = {id: 'orientation-student', username: 'orientation_student', role: 'student'};

beforeAll(async () => {
  await seedAll();
});

describe('orientation_fabric', () => {
  it('construit une boussole transversale diagnostic-only', () => {
    const snapshot = buildMasterFlowOrientationSnapshot(godmode, {});

    expect(snapshot.execution_policy).toBe('diagnostic_only');
    expect(snapshot.domains.map((domain) => domain.domain_id)).toEqual(
      expect.arrayContaining([
        'da_visual_fabric',
        'masterstory',
        'inventory_resources_outputs',
        'factory_backflow',
        'runtime_actions',
        'security_trust',
        'personas_voice_style',
        'teaching_learning',
      ]),
    );
    expect(snapshot.capabilities.map((capability) => capability.capability_id)).toContain(
      'visual_knowledge_registry_empty_core',
    );
    expect(snapshot.orientation_invariants).toContain('ui_removed_from_system_rush');
  });

  it('garde le routeur factories en candidat externe verrouillé', () => {
    const snapshot = buildMasterFlowOrientationSnapshot(godmode, {domain_id: 'factory_backflow'});
    const factoryRouter = snapshot.capabilities.find(
      (capability) => capability.capability_id === 'factory_router_external_fast_index',
    );

    expect(factoryRouter).toEqual(
      expect.objectContaining({
        source_type: 'factory_router',
        implementation_status: 'partial',
        visibility: 'locked',
        blocked_reason: 'external_candidate_not_runtime_masterflow',
      }),
    );
    expect(snapshot.blocked_capabilities).toContainEqual(
      expect.objectContaining({capability_id: 'factory_router_external_fast_index'}),
    );
    expect(snapshot.capabilities).toContainEqual(
      expect.objectContaining({
        capability_id: 'factory_backflow_capability_map',
        source_type: 'system_contract',
        visibility: 'available',
        endpoint: '/api/v1/backflow/capability-map',
      }),
    );
  });

  it('expose les gaps système sans les présenter comme capacités exécutables', () => {
    const snapshot = buildMasterFlowOrientationSnapshot(godmode, {});

    expect(snapshot.capabilities).toContainEqual(
      expect.objectContaining({
        capability_id: 'inventory_registry_gap',
        domain_id: 'inventory_resources_outputs',
        visibility: 'available',
        endpoint: '/api/v1/inventory/capability-map',
      }),
    );
    expect(snapshot.capabilities).toContainEqual(
      expect.objectContaining({
        capability_id: 'resource_output_capability_map',
        domain_id: 'inventory_resources_outputs',
        visibility: 'available',
        endpoint: '/api/v1/diagnostics/resource-output/capability-map',
      }),
    );
    expect(snapshot.capabilities).toContainEqual(
      expect.objectContaining({
        capability_id: 'style_mirror_expressive_canon',
        domain_id: 'personas_voice_style',
        visibility: 'available',
        endpoint: '/api/v1/diagnostics/expressive-canon/capability-map',
      }),
    );
    expect(snapshot.capabilities).toContainEqual(
      expect.objectContaining({
        capability_id: 'voice_persona_tts',
        domain_id: 'personas_voice_style',
        visibility: 'locked',
        blocked_reason: 'provider_cost_and_consent_gate',
      }),
    );
    expect(snapshot.capabilities).toContainEqual(
      expect.objectContaining({
        capability_id: 'security_guard_and_safety_state',
        domain_id: 'security_trust',
        endpoint: '/api/v1/diagnostics/security-trust/capability-map',
      }),
    );
  });

  it('filtre les capacités futures/verrouillées quand demandé', () => {
    const snapshot = buildMasterFlowOrientationSnapshot(student, {include_future: false});

    expect(snapshot.capabilities.every((capability) => capability.visibility === 'available')).toBe(true);
    expect(snapshot.capabilities.map((capability) => capability.capability_id)).not.toContain(
      'factory_router_external_fast_index',
    );
  });

  it('propose seulement des prochaines actions issues de capacités disponibles', () => {
    const snapshot = buildMasterFlowOrientationSnapshot(godmode, {});
    const available = new Set(
      snapshot.capabilities
        .filter((capability) => capability.visibility === 'available')
        .map((capability) => capability.capability_id),
    );

    expect(snapshot.next_action_candidates.length).toBeGreaterThan(0);
    expect(snapshot.next_action_candidates.every((action) => available.has(action.action_id))).toBe(true);
  });
});
