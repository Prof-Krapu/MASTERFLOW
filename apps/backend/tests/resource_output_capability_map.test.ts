import {beforeAll, describe, expect, it} from 'vitest';

import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildResourceOutputCapabilityMap} from '../src/services/resource_output_capability_map.ts';

const admin: AuthUser = {id: 'resource-output-admin', username: 'resource_output_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
});

describe('resource_output_capability_map', () => {
  it('distingue Resource Truth, manifests, assets et Output Registry futur sans exécution', () => {
    const map = buildResourceOutputCapabilityMap(admin);

    expect(map.execution_policy).toBe('diagnostic_only');
    expect(map.resources.validated).toBeGreaterThanOrEqual(0);
    expect(map.outputs.generated_assets.candidate).toBeGreaterThanOrEqual(0);
    expect(map.source_truth_policy).toMatchObject({
      default_resources_are_validated_only: true,
      candidate_resource_not_served_by_default: true,
      output_manifest_not_provider_generation: true,
      generated_asset_candidate_requires_review: true,
      export_or_live_publication_requires_human_gate: true,
    });
    expect(map.primitives).toContainEqual(expect.objectContaining({
      primitive_id: 'resource_truth_validated_by_default',
      status: 'implemented',
      area: 'resource_truth',
    }));
    expect(map.primitives).toContainEqual(expect.objectContaining({
      primitive_id: 'output_registry_transversal',
      status: 'future',
      area: 'output_registry',
    }));
    expect(map.forbidden_shortcuts).toEqual(expect.arrayContaining([
      'candidate_resource_as_context_truth',
      'visual_manifest_as_generated_asset',
      'provider_generation_from_capability_map',
    ]));
  });
});
