import {describe, expect, it} from 'vitest';

import {proposeModeHandoffs} from '../src/services/mode_handoff.ts';

describe('mode handoff router', () => {
  it('propose Project vers Story sans modifier le projet source', () => {
    const candidates = proposeModeHandoffs({
      object: {
        object_type: 'project',
        object_id: 'project-1',
        source_mode: 'project',
        source_refs: ['project:project-1', 'brief:brief-1'],
        authority: 'validated',
      },
      available_pack_ids: ['masterflow-story-visual-bridge'],
    });
    expect(candidates).toContainEqual(
      expect.objectContaining({
        source_mode: 'project',
        target_mode: 'story',
        target_stage_id: 'frame_project_as_story',
        expected_output_types: ['story_workbench_candidate'],
        status: 'proposed',
        validation_required: true,
      }),
    );
  });

  it('propose Inventory vers DA en conservant les références', () => {
    const candidates = proposeModeHandoffs({
      object: {
        object_type: 'inventory_asset',
        object_id: 'asset-1',
        source_mode: 'inventory',
        source_refs: ['inventory:asset-1', 'storage:sha256-test'],
        authority: 'validated',
      },
      available_pack_ids: ['masterflow-story-visual-bridge'],
    });
    expect(candidates[0]).toMatchObject({
      source_mode: 'inventory',
      target_mode: 'visual-lab',
      target_stage_id: 'route_inventory_reference',
      source_refs: ['inventory:asset-1', 'storage:sha256-test'],
    });
  });

  it('renforce la validation si la source est seulement candidate', () => {
    const candidates = proposeModeHandoffs({
      object: {
        object_type: 'brief',
        object_id: 'brief-candidate',
        source_mode: 'project',
        source_refs: ['brief:candidate'],
        authority: 'candidate',
      },
      available_pack_ids: ['masterflow-story-visual-bridge'],
    });
    expect(candidates[0]).toMatchObject({
      confidence: 0.65,
      validation_required: true,
      risk_level: 'medium',
    });
  });

  it('ne propose rien si le pack cible est indisponible', () => {
    const candidates = proposeModeHandoffs({
      object: {
        object_type: 'project',
        object_id: 'project-1',
        source_mode: 'project',
        source_refs: ['project:project-1'],
        authority: 'validated',
      },
      available_pack_ids: [],
    });
    expect(candidates).toEqual([]);
  });
});
