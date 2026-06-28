import {describe, expect, it} from 'vitest';

import {
  RuntimePackManifestSchema,
  type RuntimePackManifest,
} from '@masterflow/shared';

import {
  listRuntimePacks,
  resolveRuntimePacks,
} from '../src/services/runtime_pack_registry.ts';

describe('runtime pack registry', () => {
  it('valide tous les manifests déclaratifs', () => {
    const packs = listRuntimePacks();
    expect(packs.length).toBeGreaterThanOrEqual(4);
    expect(packs.map((pack) => pack.pack_id)).toContain('masterflow-theme-studio');
  });

  it('refuse les étapes dupliquées et les actions requises/optionnelles en conflit', () => {
    const invalid: RuntimePackManifest = {
      pack_id: 'invalid',
      version: '1',
      label: 'Invalid',
      description: 'Manifest volontairement invalide.',
      minimum_role: 'student',
      status: 'live',
      active_modes: ['home'],
      required_action_ids: ['same'],
      optional_action_ids: ['same'],
      stages: [
        {
          stage_id: 'duplicate',
          label: 'Étape',
          purpose: 'Tester.',
          activation: 'always',
          required_action_ids: [],
          input_object_types: [],
          output_object_types: [],
          target_mode: null,
          context_tier: 'T1',
          checkpoint_policy: 'none',
        },
        {
          stage_id: 'duplicate',
          label: 'Étape bis',
          purpose: 'Tester encore.',
          activation: 'manual',
          required_action_ids: [],
          input_object_types: [],
          output_object_types: [],
          target_mode: null,
          context_tier: 'T1',
          checkpoint_policy: 'none',
        },
      ],
      guidance: null,
      source_refs: [],
    };
    expect(RuntimePackManifestSchema.safeParse(invalid).success).toBe(false);
  });

  it('n’active que les packs soutenus par les actions et le rôle', () => {
    const student = resolveRuntimePacks({
      role: 'student',
      available_action_ids: ['get_current_context', 'view_learning_profile'],
    });
    expect(student.available_pack_ids).toEqual([
      'masterflow-core-runtime',
      'masterflow-guided-learning',
    ]);
    expect(student.pack_availability.some((item) => item.pack_id === 'masterflow-theme-studio')).toBe(false);
    expect(student.guidance_candidates).toHaveLength(2);
  });

  it('ne repropose pas une guidance déjà terminée ou passée', () => {
    const result = resolveRuntimePacks({
      role: 'student',
      available_action_ids: ['get_current_context', 'view_learning_profile'],
      acknowledged_guidance_ids: ['discover-masterflow-core'],
    });
    expect(result.guidance_candidates.map((candidate) => candidate.guidance_id)).toEqual([
      'guided-learning-available',
    ]);
  });

  it('garde Theme Studio verrouillé tant que son statut est future', () => {
    const result = resolveRuntimePacks({
      role: 'godmode',
      available_action_ids: [
        'get_current_context',
        'compile_da_context',
        'view_style_profile',
        'manage_style_profile',
      ],
    });
    expect(result.pack_availability).toContainEqual({
      pack_id: 'masterflow-theme-studio',
      status: 'locked',
      reason: 'pack_future',
      missing_action_ids: [],
    });
  });
});
