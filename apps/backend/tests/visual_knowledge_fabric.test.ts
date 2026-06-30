import {describe, expect, it} from 'vitest';

import {
  CompiledVisualPlanSchema,
  VisualKnowledgeRegistrySchema,
  type VisualKnowledgeRegistry,
} from '@masterflow/shared';

import {
  buildLegacyVisualRegistryProjection,
  buildD08VisualManifestCandidate,
  compileVisualPlan,
  compileVisualPlanWithRegistry,
  lintVisualKnowledgeRegistry,
  listVisualKnowledgeRegistry,
} from '../src/services/visual_knowledge_fabric.ts';

function syntheticRegistry(): VisualKnowledgeRegistry {
  return VisualKnowledgeRegistrySchema.parse({
    registry_id: 'synthetic-visual-registry',
    version: '1.0.0',
    status: 'active',
    entities: [
      {
        entity_ref: 'fixture:human',
        label: 'Personnage humain fictif',
        entity_kind: 'character',
        status: 'candidate',
        version: '0.1.0',
        scope: 'project',
        scope_ref: 'project:fixture',
        trait_assignments: [
          {
            trait_id: 'fixture:readable-silhouette',
            value: 'silhouette simple et immédiatement lisible',
            authority: 'persona_visual_registry',
            locked: true,
            source_refs: ['fixture:visual-kernel'],
          },
        ],
        layer_refs: ['fixture:root', 'fixture:handdrawn-render'],
        reference_annotation_refs: ['fixture:face-region'],
        acting_profile_ref: null,
        source_refs: ['fixture:visual-kernel'],
      },
      {
        entity_ref: 'fixture:decor',
        label: 'Décor neutre fictif',
        entity_kind: 'decor',
        status: 'candidate',
        version: '0.1.0',
        scope: 'project',
        scope_ref: 'project:fixture',
        trait_assignments: [],
        layer_refs: ['fixture:root'],
        reference_annotation_refs: [],
        acting_profile_ref: null,
        source_refs: ['fixture:visual-kernel'],
      },
    ],
    trait_definitions: [
      {
        trait_id: 'fixture:readable-silhouette',
        label: 'Silhouette lisible',
        category: 'silhouette',
        value_type: 'string',
        unit: null,
        description: 'Fixture synthétique de lisibilité.',
        source_refs: ['fixture:visual-kernel'],
      },
    ],
    layers: [
      {
        layer_id: 'fixture:root',
        label: 'Racine fictive',
        layer_kind: 'root',
        scope: 'system',
        scope_ref: null,
        status: 'candidate',
        version: '0.1.0',
        priority: 200,
        parent_layer_refs: [],
        incompatible_layer_refs: [],
        immutable_trait_refs: ['fixture:readable-silhouette'],
        trait_assignments: [],
        gauge_overrides: [],
        positive_constraints: ['illustration non photoréaliste'],
        negative_locks: ['no_photorealism'],
        source_refs: ['fixture:visual-kernel'],
      },
      {
        layer_id: 'fixture:handdrawn-render',
        label: 'Rendu dessiné fictif',
        layer_kind: 'render',
        scope: 'project',
        scope_ref: 'project:fixture',
        status: 'candidate',
        version: '0.1.0',
        priority: 800,
        parent_layer_refs: ['fixture:root'],
        incompatible_layer_refs: ['fixture:glossy-render'],
        immutable_trait_refs: [],
        trait_assignments: [],
        gauge_overrides: [
          {
            gauge_id: 'fixture:ink',
            value: 3,
            lock: true,
            reason: 'Le rendu dessiné exige une présence d’encre stable.',
          },
        ],
        positive_constraints: ['trait manuel visible'],
        negative_locks: ['no_glossy_vector'],
        source_refs: ['fixture:visual-kernel'],
      },
      {
        layer_id: 'fixture:glossy-render',
        label: 'Rendu brillant incompatible',
        layer_kind: 'render',
        scope: 'project',
        scope_ref: 'project:fixture',
        status: 'candidate',
        version: '0.1.0',
        priority: 801,
        parent_layer_refs: ['fixture:root'],
        incompatible_layer_refs: ['fixture:handdrawn-render'],
        immutable_trait_refs: [],
        trait_assignments: [],
        gauge_overrides: [],
        positive_constraints: ['surface brillante'],
        negative_locks: [],
        source_refs: ['fixture:visual-kernel'],
      },
    ],
    gauges: [
      {
        gauge_id: 'fixture:caricature',
        label: 'Caricature',
        family: 'style',
        min: 0,
        max: 4,
        default_value: 2,
        safe_min: 1,
        safe_max: 3,
        unit: 'level',
        user_adjustable: true,
        effect_trait_refs: [],
        incompatible_gauge_refs: [],
        retake_lever: 'Réduire l’exagération structurelle.',
        source_refs: ['fixture:visual-kernel'],
      },
      {
        gauge_id: 'fixture:ink',
        label: 'Encre',
        family: 'render',
        min: 0,
        max: 4,
        default_value: 1,
        safe_min: 0,
        safe_max: 4,
        unit: 'level',
        user_adjustable: true,
        effect_trait_refs: [],
        incompatible_gauge_refs: [],
        retake_lever: null,
        source_refs: ['fixture:visual-kernel'],
      },
    ],
    reference_annotations: [
      {
        annotation_id: 'fixture:face-region',
        reference_id: 'fixture:board',
        label: 'Zone visage',
        role: 'canon_strict',
        selector: {
          type: 'xywh_percent',
          x: 5,
          y: 10,
          width: 35,
          height: 50,
        },
        allowed_uses: ['morphology'],
        forbidden_uses: ['world_style'],
        provenance_state: 'validated',
        rights_status: 'known',
        consent_ref: 'fixture:consent',
        source_ref: 'fixture:board#xywh=percent:5,10,35,50',
      },
    ],
    output_recipes: [
      {
        recipe_id: 'fixture:avatar',
        label: 'Avatar fictif',
        family: 'avatar',
        status: 'candidate',
        version: '0.1.0',
        required_trait_refs: ['fixture:readable-silhouette'],
        required_reference_roles: ['canon_strict'],
        default_gauge_values: {'fixture:caricature': 2},
        technical_constraints: {ratio: '1:1', transparent: true},
        provider_requirements: ['supports_reference_image'],
        positive_constraints: ['lecture miniature'],
        negative_locks: ['no_text'],
        source_refs: ['fixture:visual-kernel'],
      },
    ],
    rules: [],
    asset_versions: [],
    source_refs: ['fixture:visual-kernel'],
  });
}

describe('Visual Knowledge Fabric', () => {
  it('démarre vide et refuse d’inventer une entité ou un output', () => {
    const registry = listVisualKnowledgeRegistry('empty_core');
    const plan = compileVisualPlan({
      registry_source: 'empty_core',
      intent: 'Préparer un avatar inconnu.',
      context: 'da_studio',
      entity_refs: ['unknown:persona'],
      active_mode: 'godmode',
      output_recipe_ref: 'unknown:avatar',
      requested_layer_refs: [],
      preference_gauge_values: {},
    });

    expect(registry.status).toBe('empty_ready');
    expect(registry.entities).toEqual([]);
    expect(registry.output_recipes).toEqual([]);
    expect(registry.gauges.map((gauge) => gauge.gauge_id)).toEqual(
      expect.arrayContaining([
        'system:morphology_head_body_ratio',
        'system:morphology_eye_face_ratio',
        'system:style_caricature',
        'system:continuity_canon_strictness',
      ]),
    );
    expect(plan.status).toBe('blocked');
    expect(plan.missing_items).toEqual(
      expect.arrayContaining(['entity:unknown:persona', 'output_recipe:unknown:avatar']),
    );
    expect(plan.positive_constraints).toEqual([]);
    expect(plan.generation_allowed).toBe(false);
    expect(plan.canon_promotion_allowed).toBe(false);
  });

  it('compile une fixture personnage + render layer + output sans provider', () => {
    const plan = compileVisualPlanWithRegistry(syntheticRegistry(), {
      intent: 'Préparer un avatar dessiné.',
      context: 'story_mode',
      entity_refs: ['fixture:human'],
      active_mode: 'story',
      output_recipe_ref: 'fixture:avatar',
      requested_layer_refs: [],
      acting_state_ref: null,
      preference_gauge_values: {'fixture:caricature': 2.5},
    });

    expect(plan.status).toBe('ready_for_manifest');
    expect(plan.layer_stack.map((layer) => layer.layer_ref)).toEqual([
      'fixture:root',
      'fixture:handdrawn-render',
    ]);
    expect(plan.gauges.find((gauge) => gauge.gauge_id === 'fixture:caricature')).toMatchObject({
      value: 2.5,
      source_ref: 'user_preference:fixture:caricature',
    });
    expect(plan.gauges.find((gauge) => gauge.gauge_id === 'fixture:ink')).toMatchObject({
      value: 3,
      locked: true,
    });
    expect(plan.reference_annotations[0]?.selector.type).toBe('xywh_percent');
    expect(plan.output_recipe?.family).toBe('avatar');
    expect(CompiledVisualPlanSchema.parse(plan).execution_policy).toBe('compile_only');
  });

  it('détecte une incompatibilité de layers et reste déterministe', () => {
    const input = {
      intent: 'Comparer deux rendus.',
      context: 'da_studio',
      entity_refs: ['fixture:human'],
      active_mode: 'godmode',
      output_recipe_ref: 'fixture:avatar',
      requested_layer_refs: ['fixture:glossy-render'],
      acting_state_ref: null,
      preference_gauge_values: {},
    };
    const first = compileVisualPlanWithRegistry(syntheticRegistry(), input);
    const second = compileVisualPlanWithRegistry(syntheticRegistry(), input);

    expect(first.status).toBe('limited');
    expect(first.conflicts.join(' ')).toContain('incompatible_layers');
    expect(first.deterministic_hash).toBe(second.deterministic_hash);
  });

  it('bloque un output lorsque son trait obligatoire manque', () => {
    const registry = syntheticRegistry();
    const entity = registry.entities.find((item) => item.entity_ref === 'fixture:human');
    if (!entity) throw new Error('fixture_human_missing');
    entity.trait_assignments = [];

    const plan = compileVisualPlanWithRegistry(registry, {
      intent: 'Produire un avatar sans inventer sa silhouette.',
      context: 'da_studio',
      entity_refs: ['fixture:human'],
      active_mode: 'godmode',
      output_recipe_ref: 'fixture:avatar',
      requested_layer_refs: [],
      preference_gauge_values: {},
    });

    expect(plan.status).toBe('blocked');
    expect(plan.missing_items).toContain('required_trait:fixture:readable-silhouette');
  });

  it('refuse qu’une couche écrase un trait canon verrouillé', () => {
    const registry = syntheticRegistry();
    const renderLayer = registry.layers.find((layer) => layer.layer_id === 'fixture:handdrawn-render');
    if (!renderLayer) throw new Error('fixture_render_missing');
    renderLayer.trait_assignments = [{
      trait_id: 'fixture:readable-silhouette',
      value: 'silhouette illisible et fragmentée',
      authority: 'dedicated_da_layer',
      locked: false,
      source_refs: ['fixture:render'],
    }];

    const plan = compileVisualPlanWithRegistry(registry, {
      intent: 'Tester une modulation de rendu.',
      context: 'da_studio',
      entity_refs: ['fixture:human'],
      active_mode: 'godmode',
      output_recipe_ref: 'fixture:avatar',
      requested_layer_refs: [],
      preference_gauge_values: {},
    });

    expect(plan.conflicts).toContain('immutable_trait_override:fixture:readable-silhouette');
    expect(plan.status).toBe('blocked');
    expect(plan.active_traits).toContainEqual(expect.objectContaining({
      trait_id: 'fixture:readable-silhouette',
      value: 'silhouette simple et immédiatement lisible',
    }));
  });

  it('bloque une boucle d’héritage de layers', () => {
    const registry = syntheticRegistry();
    const root = registry.layers.find((layer) => layer.layer_id === 'fixture:root');
    if (!root) throw new Error('fixture_root_missing');
    root.parent_layer_refs = ['fixture:handdrawn-render'];
    const plan = compileVisualPlanWithRegistry(registry, {
      intent: 'Tester une boucle.',
      context: 'da_studio',
      entity_refs: ['fixture:human'],
      active_mode: 'godmode',
      output_recipe_ref: 'fixture:avatar',
      requested_layer_refs: [],
      preference_gauge_values: {},
    });

    expect(plan.status).toBe('blocked');
    expect(plan.conflicts.join(' ')).toContain('layer_cycle');
  });

  it('lint le registre et bloque une référence contaminée assignée', () => {
    const registry = syntheticRegistry();
    registry.reference_annotations[0]!.role = 'contaminated';
    const report = lintVisualKnowledgeRegistry(registry);

    expect(report.valid).toBe(false);
    expect(report.diagnostics).toContainEqual(expect.objectContaining({
      code: 'unsafe_entity_reference',
      target_ref: 'fixture:human',
      severity: 'block',
    }));
  });

  it('valide le kernel vide sans inventer de contenu', () => {
    const report = lintVisualKnowledgeRegistry(listVisualKnowledgeRegistry('empty_core'));
    expect(report.valid).toBe(true);
    expect(report.diagnostics).toEqual([]);
  });

  it('projette l’ancien registre sans le déclarer comme nouveau canon', () => {
    const registry = buildLegacyVisualRegistryProjection();
    const plan = compileVisualPlan({
      registry_source: 'legacy_adapter',
      intent: 'Préparer un état UI MasterFlex.',
      context: 'home_chat',
      entity_refs: ['masterflex-001'],
      active_mode: 'home',
      output_recipe_ref: 'ui_state_pack',
      requested_layer_refs: [],
      preference_gauge_values: {},
    });

    expect(registry.status).toBe('compatibility_projection');
    expect(plan.registry_id).toBe('legacy_visual_da_compatibility_projection');
    expect(plan.resolved_entity_refs).toContain('masterflex-001');
    expect(plan.layer_stack.map((layer) => layer.layer_ref)).toContain('masterflow_core');
    expect(plan.generation_allowed).toBe(false);
    expect(plan.negative_locks).toContain('generation_disabled_in_compatibility_projection');
  });

  it('prépare un candidat D08 sans persister ni générer', () => {
    const plan = compileVisualPlanWithRegistry(syntheticRegistry(), {
      registry_source: 'empty_core',
      intent: 'Préparer un avatar fictif.',
      context: 'da_studio',
      entity_refs: ['fixture:human'],
      active_mode: 'godmode',
      output_recipe_ref: 'fixture:avatar',
      requested_layer_refs: [],
      preference_gauge_values: {},
    });
    const candidate = buildD08VisualManifestCandidate(plan);

    expect(candidate.readiness).toBe('ready_for_d08_review');
    expect(candidate.request_preview.da_root_ref).toBe('fixture:root');
    expect(candidate.request_preview.output_template).toBe('fixture:avatar');
    expect(candidate.persistence_allowed).toBe(false);
    expect(candidate.generation_allowed).toBe(false);
    expect(candidate.required_next_action).toBe('owner_reviews_then_materializes_visual_references');
  });

  it('couvre les pilotes personnage, décor, objet, rendu et sorties sans changer le resolver', () => {
    const registry = syntheticRegistry();
    registry.entities.push({
      entity_ref: 'fixture:object',
      label: 'Objet symbolique fictif',
      entity_kind: 'object',
      status: 'candidate',
      version: '0.1.0',
      scope: 'project',
      scope_ref: 'project:fixture',
      trait_assignments: [],
      layer_refs: ['fixture:root'],
      reference_annotation_refs: [],
      acting_profile_ref: null,
      source_refs: ['fixture:visual-kernel'],
    });
    registry.output_recipes.push({
      recipe_id: 'fixture:scene',
      label: 'Scène fictive',
      family: 'scene',
      status: 'candidate',
      version: '0.1.0',
      required_trait_refs: [],
      required_reference_roles: [],
      default_gauge_values: {},
      technical_constraints: {ratio: '16:9'},
      provider_requirements: [],
      positive_constraints: ['composition lisible'],
      negative_locks: ['no_text'],
      source_refs: ['fixture:visual-kernel'],
    });

    const cases = [
      {entity_ref: 'fixture:human', output_ref: 'fixture:avatar', layers: []},
      {entity_ref: 'fixture:decor', output_ref: 'fixture:scene', layers: []},
      {entity_ref: 'fixture:object', output_ref: 'fixture:scene', layers: ['fixture:handdrawn-render']},
    ];
    for (const pilot of cases) {
      const plan = compileVisualPlanWithRegistry(registry, {
        registry_source: 'empty_core',
        intent: `Pilote ${pilot.entity_ref}.`,
        context: 'pilot_matrix',
        entity_refs: [pilot.entity_ref],
        active_mode: 'da_studio',
        output_recipe_ref: pilot.output_ref,
        requested_layer_refs: pilot.layers,
        preference_gauge_values: {},
      });
      expect(plan.status).toBe('ready_for_manifest');
      expect(plan.resolved_entity_refs).toEqual([pilot.entity_ref]);
      expect(plan.generation_allowed).toBe(false);
      expect(plan.canon_promotion_allowed).toBe(false);
    }
  });
});
