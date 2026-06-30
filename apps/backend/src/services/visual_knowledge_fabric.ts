import {createHash} from 'node:crypto';

import {
  CompileVisualPlanRequestSchema,
  CompiledVisualPlanSchema,
  D08VisualManifestCandidateSchema,
  VisualKnowledgeRegistrySchema,
  VisualRegistryLintReportSchema,
  type CompiledGaugeValue,
  type CompiledVisualPlan,
  type D08VisualManifestCandidate,
  type DaGaugeDefinition,
  type DaLayerDefinition,
  type VisualDaAuthority,
  type VisualKnowledgeRegistry,
  type VisualRegistryDiagnostic,
  type VisualRegistryLintReport,
  type VisualOutputFamilyV2,
  type VisualReferenceRoleV2,
  type VisualRegistryEntityKind,
  type VisualRegistryLifecycle,
  type VisualTraitAssignment,
  type CompileVisualPlanRequest,
} from '@masterflow/shared';

import emptyRegistrySeed from '../seeds/visual_knowledge_fabric_seed.v1.json';
import {listVisualDaRegistry} from './visual_da_registry.ts';

type RegistrySource = 'empty_core' | 'legacy_adapter';

let emptyRegistryCache: VisualKnowledgeRegistry | null = null;
let legacyRegistryCache: VisualKnowledgeRegistry | null = null;

function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function lifecycle(status: 'active' | 'candidate' | 'blocked'): VisualRegistryLifecycle {
  if (status === 'active') return 'validated_version';
  if (status === 'candidate') return 'candidate';
  return 'revoked';
}

function entityKind(kind: string): VisualRegistryEntityKind {
  if ([
    'persona',
    'subpersona',
    'monster',
    'role',
    'decor',
    'prop',
  ].includes(kind)) {
    return kind as VisualRegistryEntityKind;
  }
  return 'character';
}

function gaugeFamily(gaugeId: string): DaGaugeDefinition['family'] {
  if (gaugeId.includes('readability')) return 'structure';
  if (gaugeId.includes('caricature')) return 'style';
  if (gaugeId.includes('strangeness')) return 'tone';
  if (gaugeId.includes('filter')) return 'render';
  return 'style';
}

function outputFamily(surface: string): VisualOutputFamilyV2 {
  if (surface.includes('ui_state')) return 'ui_state_pack';
  if (surface.includes('avatar') && surface.includes('badge')) return 'profile_picture';
  if (surface.includes('avatar')) return 'avatar';
  if (surface.includes('badge')) return 'badge';
  if (surface.includes('monster')) return 'asset_pack';
  if (surface.includes('role')) return 'asset_pack';
  return 'manifest';
}

function layerKind(authority: VisualDaAuthority, layerId: string): DaLayerDefinition['layer_kind'] {
  if (authority === 'masterflow_core') return 'root';
  if (authority === 'event_da_layer' || layerId.includes('event')) return 'event';
  if (authority === 'dedicated_da_layer') return 'project';
  if (authority === 'persona_visual_registry') return 'entity';
  if (authority === 'role_class_registry') return 'role';
  if (authority === 'pipeline_slice_registry') return 'output';
  return 'render';
}

function referenceRole(role: string): VisualReferenceRoleV2 {
  const supported: VisualReferenceRoleV2[] = [
    'canon_strict',
    'identity_anchor',
    'expression_only',
    'outfit_only',
    'pose_reference',
    'world_style',
    'graphic_language',
    'color_palette',
    'layout_reference',
    'poster_energy',
    'filter_reference',
    'output_template',
    'inspiration',
    'candidate',
    'anti_pattern',
    'contaminated',
    'rejected',
  ];
  return supported.includes(role as VisualReferenceRoleV2)
    ? role as VisualReferenceRoleV2
    : 'candidate';
}

/**
 * Projette l'ancien registre dans le nouveau contrat sans promouvoir son contenu
 * en canon du Visual Knowledge Fabric.
 */
export function buildLegacyVisualRegistryProjection(): VisualKnowledgeRegistry {
  if (legacyRegistryCache) return legacyRegistryCache;
  const legacy = listVisualDaRegistry();
  const traitDefinitions = legacy.atomic_bricks.map((brick) => ({
    trait_id: `legacy_brick:${brick.brick_id}`,
    label: brick.brick_id,
    category: brick.brick_type === 'silhouette'
      ? 'silhouette' as const
      : brick.brick_type === 'pose' || brick.brick_type === 'expression'
        ? 'acting' as const
        : brick.brick_type === 'palette'
          ? 'color' as const
          : brick.brick_type === 'composition'
            ? 'composition' as const
            : brick.brick_type === 'negative_lock' || brick.brick_type === 'validation_check'
              ? 'safety' as const
              : brick.brick_type === 'style' || brick.brick_type === 'texture'
                ? 'style' as const
                : 'identity' as const,
    value_type: 'string' as const,
    unit: null,
    description: brick.positive_prompt,
    source_refs: brick.source_refs,
  }));
  const brickMap = new Map(legacy.atomic_bricks.map((brick) => [brick.brick_id, brick]));
  const assignments = (refs: string[]): VisualTraitAssignment[] => refs.flatMap((ref) => {
    const brick = brickMap.get(ref);
    if (!brick) return [];
    return [{
      trait_id: `legacy_brick:${brick.brick_id}`,
      value: brick.positive_prompt,
      authority: brick.authority,
      locked: brick.priority === 'mandatory',
      source_refs: brick.source_refs,
    }];
  });
  const rootLayers: DaLayerDefinition[] = legacy.roots.map((root) => ({
    layer_id: root.root_id,
    label: root.label,
    layer_kind: 'root',
    scope: 'system',
    scope_ref: null,
    status: lifecycle(root.status),
    version: 'legacy-projection-v1',
    priority: 200,
    parent_layer_refs: [],
    incompatible_layer_refs: [],
    immutable_trait_refs: [],
    trait_assignments: [],
    gauge_overrides: [],
    positive_constraints: [root.summary],
    negative_locks: [],
    source_refs: root.source_refs,
  }));
  const layers: DaLayerDefinition[] = legacy.layers.map((layer) => ({
    layer_id: layer.layer_id,
    label: layer.label,
    layer_kind: layerKind(layer.authority, layer.layer_id),
    scope: layer.authority === 'event_da_layer' ? 'event' : 'project',
    scope_ref: layer.layer_id,
    status: lifecycle(layer.status),
    version: 'legacy-projection-v1',
    priority: 400 + layer.priority_order,
    parent_layer_refs: [],
    incompatible_layer_refs: [],
    immutable_trait_refs: [],
    trait_assignments: [],
    gauge_overrides: [],
    positive_constraints: [layer.summary],
    negative_locks: layer.cannot_be_root ? ['layer_cannot_replace_da_root'] : [],
    source_refs: layer.source_refs,
  }));
  const annotations = legacy.reference_boards.map((board) => ({
    annotation_id: board.board_id,
    reference_id: board.board_id,
    label: board.label,
    role: referenceRole(board.role),
    selector: {
      type: 'whole_asset' as const,
      x: null,
      y: null,
      width: null,
      height: null,
    },
    allowed_uses: board.allowed_use,
    forbidden_uses: board.forbidden_use,
    provenance_state: board.provenance_state,
    rights_status: 'unknown' as const,
    consent_ref: null,
    source_ref: board.source_ref,
  }));
  const rules = [...new Set(legacy.pipeline_slices.flatMap((slice) => slice.gate_refs))].map((gateRef) => ({
    rule_id: gateRef,
    label: gateRef,
    phase: 'preflight' as const,
    severity: 'block' as const,
    activation: 'legacy_pipeline_slice',
    requires: [],
    blocks_if: [`gate_failed:${gateRef}`],
    retake_lever: null,
    source_refs: ['legacy:visual_da_registry_seed.v1'],
  }));
  legacyRegistryCache = VisualKnowledgeRegistrySchema.parse({
    registry_id: 'legacy_visual_da_compatibility_projection',
    version: '1.0.0',
    status: 'compatibility_projection',
    entities: legacy.entity_profiles.map((entity) => ({
      entity_ref: entity.entity_id,
      label: entity.display_name,
      entity_kind: entityKind(entity.entity_type),
      status: lifecycle(entity.status),
      version: 'legacy-projection-v1',
      scope: 'system',
      scope_ref: null,
      trait_assignments: assignments(entity.atomic_brick_refs),
      layer_refs: uniq([entity.root_ref, ...entity.default_layer_refs]),
      reference_annotation_refs: entity.reference_board_refs,
      acting_profile_ref: entity.acting_profile_ref,
      source_refs: entity.source_refs,
    })),
    trait_definitions: traitDefinitions,
    layers: [...rootLayers, ...layers],
    gauges: legacy.visual_gauges.map((gauge) => ({
      gauge_id: gauge.gauge_id,
      label: gauge.label,
      family: gaugeFamily(gauge.gauge_id),
      min: gauge.min,
      max: gauge.max,
      default_value: gauge.default_value,
      safe_min: gauge.min,
      safe_max: gauge.max,
      unit: 'level',
      user_adjustable: true,
      effect_trait_refs: [],
      incompatible_gauge_refs: [],
      retake_lever: null,
      source_refs: gauge.source_refs,
    })),
    reference_annotations: annotations,
    output_recipes: legacy.pipeline_slices.map((slice) => ({
      recipe_id: slice.output_surface,
      label: slice.label,
      family: outputFamily(slice.output_surface),
      status: 'validated_version',
      version: 'legacy-projection-v1',
      required_trait_refs: slice.required_brick_refs.map((ref) => `legacy_brick:${ref}`),
      required_reference_roles: slice.required_reference_roles.map(referenceRole),
      default_gauge_values: {},
      technical_constraints: Object.fromEntries((slice.output_requirements ?? []).map((item, index) => [`requirement_${index + 1}`, item])),
      provider_requirements: [],
      positive_constraints: slice.container_parts ?? [],
      negative_locks: [
        ...(slice.logo_policy ? [slice.logo_policy] : []),
        'generation_disabled_in_compatibility_projection',
      ],
      source_refs: slice.source_refs,
    })),
    rules,
    asset_versions: [],
    source_refs: [
      'adapter:visual_da_registry_seed.v1',
      'contract:VISUAL_KNOWLEDGE_FABRIC_V1',
    ],
  });
  return legacyRegistryCache;
}

/** Charge le kernel vide ou la projection de compatibilité explicitement demandée. */
export function listVisualKnowledgeRegistry(source: RegistrySource = 'empty_core'): VisualKnowledgeRegistry {
  if (source === 'legacy_adapter') return buildLegacyVisualRegistryProjection();
  if (emptyRegistryCache) return emptyRegistryCache;
  emptyRegistryCache = VisualKnowledgeRegistrySchema.parse(emptyRegistrySeed);
  return emptyRegistryCache;
}

function duplicateDiagnostics(
  label: string,
  refs: string[],
): VisualRegistryDiagnostic[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const ref of refs) {
    if (seen.has(ref)) duplicates.add(ref);
    seen.add(ref);
  }
  return [...duplicates].map((ref) => ({
    severity: 'block',
    code: `duplicate_${label}`,
    target_ref: ref,
    message: `La référence ${ref} est déclarée plusieurs fois dans ${label}.`,
    source_refs: [],
  }));
}

/** Lint global du registre, indépendant d'une demande de génération. */
export function lintVisualKnowledgeRegistry(
  registryInput: VisualKnowledgeRegistry,
): VisualRegistryLintReport {
  const registry = VisualKnowledgeRegistrySchema.parse(registryInput);
  const diagnostics: VisualRegistryDiagnostic[] = [
    ...duplicateDiagnostics('entity', registry.entities.map((item) => item.entity_ref)),
    ...duplicateDiagnostics('trait', registry.trait_definitions.map((item) => item.trait_id)),
    ...duplicateDiagnostics('layer', registry.layers.map((item) => item.layer_id)),
    ...duplicateDiagnostics('gauge', registry.gauges.map((item) => item.gauge_id)),
    ...duplicateDiagnostics('annotation', registry.reference_annotations.map((item) => item.annotation_id)),
    ...duplicateDiagnostics('output_recipe', registry.output_recipes.map((item) => item.recipe_id)),
    ...duplicateDiagnostics('rule', registry.rules.map((item) => item.rule_id)),
    ...duplicateDiagnostics('asset_version', registry.asset_versions.map((item) => item.asset_version_id)),
  ];
  const traitRefs = new Set(registry.trait_definitions.map((item) => item.trait_id));
  const layerRefs = new Set(registry.layers.map((item) => item.layer_id));
  const gaugeRefs = new Set(registry.gauges.map((item) => item.gauge_id));
  const annotationMap = new Map(registry.reference_annotations.map((item) => [item.annotation_id, item]));

  for (const layer of registry.layers) {
    for (const parentRef of layer.parent_layer_refs) {
      if (!layerRefs.has(parentRef)) diagnostics.push({
        severity: 'block',
        code: 'missing_parent_layer',
        target_ref: layer.layer_id,
        message: `Le parent ${parentRef} est absent du registre.`,
        source_refs: layer.source_refs,
      });
    }
    for (const incompatibleRef of layer.incompatible_layer_refs) {
      if (!layerRefs.has(incompatibleRef)) diagnostics.push({
        severity: 'warning',
        code: 'unknown_incompatible_layer',
        target_ref: layer.layer_id,
        message: `La couche incompatible ${incompatibleRef} n'existe pas dans cette version.`,
        source_refs: layer.source_refs,
      });
    }
    for (const traitRef of [
      ...layer.immutable_trait_refs,
      ...layer.trait_assignments.map((item) => item.trait_id),
    ]) {
      if (!traitRefs.has(traitRef)) diagnostics.push({
        severity: 'block',
        code: 'unknown_layer_trait',
        target_ref: layer.layer_id,
        message: `Le trait ${traitRef} utilisé par la couche n'est pas défini.`,
        source_refs: layer.source_refs,
      });
    }
    for (const override of layer.gauge_overrides) {
      if (!gaugeRefs.has(override.gauge_id)) diagnostics.push({
        severity: 'block',
        code: 'unknown_layer_gauge',
        target_ref: layer.layer_id,
        message: `La jauge ${override.gauge_id} utilisée par la couche n'est pas définie.`,
        source_refs: layer.source_refs,
      });
    }
  }

  for (const entity of registry.entities) {
    for (const layerRef of entity.layer_refs) {
      if (!layerRefs.has(layerRef)) diagnostics.push({
        severity: 'block',
        code: 'unknown_entity_layer',
        target_ref: entity.entity_ref,
        message: `La couche ${layerRef} assignée à l'entité est absente.`,
        source_refs: entity.source_refs,
      });
    }
    for (const assignment of entity.trait_assignments) {
      if (!traitRefs.has(assignment.trait_id)) diagnostics.push({
        severity: 'block',
        code: 'unknown_entity_trait',
        target_ref: entity.entity_ref,
        message: `Le trait ${assignment.trait_id} assigné à l'entité est absent.`,
        source_refs: assignment.source_refs,
      });
    }
    for (const annotationRef of entity.reference_annotation_refs) {
      const annotation = annotationMap.get(annotationRef);
      if (!annotation) {
        diagnostics.push({
          severity: 'block',
          code: 'unknown_entity_annotation',
          target_ref: entity.entity_ref,
          message: `L'annotation ${annotationRef} est absente.`,
          source_refs: entity.source_refs,
        });
      } else if (['contaminated', 'rejected'].includes(annotation.role)) {
        diagnostics.push({
          severity: 'block',
          code: 'unsafe_entity_reference',
          target_ref: entity.entity_ref,
          message: `La référence ${annotationRef} est ${annotation.role} et ne peut pas piloter cette entité.`,
          source_refs: [annotation.source_ref],
        });
      } else if (annotation.rights_status === 'unknown') {
        diagnostics.push({
          severity: 'warning',
          code: 'unknown_reference_rights',
          target_ref: annotationRef,
          message: 'Les droits de cette référence doivent être arbitrés avant génération.',
          source_refs: [annotation.source_ref],
        });
      }
    }
  }

  for (const output of registry.output_recipes) {
    for (const traitRef of output.required_trait_refs) {
      if (!traitRefs.has(traitRef)) diagnostics.push({
        severity: 'block',
        code: 'unknown_output_trait',
        target_ref: output.recipe_id,
        message: `Le trait obligatoire ${traitRef} de l'output est absent.`,
        source_refs: output.source_refs,
      });
    }
    for (const gaugeRef of Object.keys(output.default_gauge_values)) {
      if (!gaugeRefs.has(gaugeRef)) diagnostics.push({
        severity: 'block',
        code: 'unknown_output_gauge',
        target_ref: output.recipe_id,
        message: `La jauge ${gaugeRef} de l'output est absente.`,
        source_refs: output.source_refs,
      });
    }
  }

  const entityRefs = new Set(registry.entities.map((item) => item.entity_ref));
  const outputRefs = new Set(registry.output_recipes.map((item) => item.recipe_id));
  const assetVersionRefs = new Set(registry.asset_versions.map((item) => item.asset_version_id));
  for (const asset of registry.asset_versions) {
    if (!outputRefs.has(asset.output_recipe_ref)) diagnostics.push({
      severity: 'block',
      code: 'unknown_asset_output',
      target_ref: asset.asset_version_id,
      message: `La recette ${asset.output_recipe_ref} de cette version d'asset est absente.`,
      source_refs: asset.provenance_refs,
    });
    for (const entityRef of asset.entity_refs) {
      if (!entityRefs.has(entityRef)) diagnostics.push({
        severity: 'block',
        code: 'unknown_asset_entity',
        target_ref: asset.asset_version_id,
        message: `L'entité ${entityRef} liée à cette version d'asset est absente.`,
        source_refs: asset.provenance_refs,
      });
    }
    if (asset.parent_version_ref && !assetVersionRefs.has(asset.parent_version_ref)) diagnostics.push({
      severity: 'block',
      code: 'unknown_asset_parent',
      target_ref: asset.asset_version_id,
      message: `La version parente ${asset.parent_version_ref} est absente.`,
      source_refs: asset.provenance_refs,
    });
    if (asset.rights_status !== 'known') diagnostics.push({
      severity: asset.rights_status === 'restricted' ? 'block' : 'warning',
      code: 'asset_rights_unresolved',
      target_ref: asset.asset_version_id,
      message: 'Les droits de cette version d’asset ne permettent pas encore sa promotion canon.',
      source_refs: asset.provenance_refs,
    });
  }

  for (const layer of registry.layers) {
    const cycleProbe = resolveLayers(registry, [layer.layer_id]);
    for (const conflict of cycleProbe.conflicts.filter((item) => item.startsWith('layer_cycle:'))) {
      diagnostics.push({
        severity: 'block',
        code: 'layer_cycle',
        target_ref: layer.layer_id,
        message: conflict,
        source_refs: layer.source_refs,
      });
    }
  }

  const uniqueDiagnostics = [...new Map(
    diagnostics.map((item) => [`${item.code}:${item.target_ref}:${item.message}`, item]),
  ).values()];
  const counts = {
    info: uniqueDiagnostics.filter((item) => item.severity === 'info').length,
    warning: uniqueDiagnostics.filter((item) => item.severity === 'warning').length,
    block: uniqueDiagnostics.filter((item) => item.severity === 'block').length,
  };
  return VisualRegistryLintReportSchema.parse({
    registry_id: registry.registry_id,
    registry_version: registry.version,
    valid: counts.block === 0,
    generated_at: Date.now(),
    counts,
    diagnostics: uniqueDiagnostics,
    execution_policy: 'diagnostic_only',
  });
}

function resolveLayers(
  registry: VisualKnowledgeRegistry,
  requestedRefs: string[],
): {layers: DaLayerDefinition[]; missing: string[]; conflicts: string[]} {
  const layerMap = new Map(registry.layers.map((layer) => [layer.layer_id, layer]));
  const resolved = new Map<string, DaLayerDefinition>();
  const missing: string[] = [];
  const conflicts: string[] = [];

  const visit = (layerRef: string, path: string[]): void => {
    if (path.includes(layerRef)) {
      conflicts.push(`layer_cycle:${[...path, layerRef].join('>')}`);
      return;
    }
    if (resolved.has(layerRef)) return;
    const layer = layerMap.get(layerRef);
    if (!layer || ['revoked', 'deprecated', 'superseded'].includes(layer.status)) {
      missing.push(`layer:${layerRef}`);
      return;
    }
    for (const parentRef of layer.parent_layer_refs) visit(parentRef, [...path, layerRef]);
    resolved.set(layer.layer_id, layer);
  };

  for (const ref of requestedRefs) visit(ref, []);
  const layers = [...resolved.values()].sort((left, right) =>
    left.priority - right.priority || left.layer_id.localeCompare(right.layer_id),
  );
  const active = new Set(layers.map((layer) => layer.layer_id));
  for (const layer of layers) {
    for (const incompatible of layer.incompatible_layer_refs) {
      if (active.has(incompatible)) conflicts.push(`incompatible_layers:${layer.layer_id}:${incompatible}`);
    }
  }
  return {layers, missing: uniq(missing), conflicts: uniq(conflicts)};
}

function compileGauges(
  gauges: DaGaugeDefinition[],
  layers: DaLayerDefinition[],
  outputDefaults: Record<string, number>,
  preferences: Record<string, number>,
): {values: CompiledGaugeValue[]; conflicts: string[]; missing: string[]} {
  const conflicts: string[] = [];
  const missing: string[] = [];
  const valueMap = new Map<string, CompiledGaugeValue>();
  for (const gauge of gauges) {
    valueMap.set(gauge.gauge_id, {
      gauge_id: gauge.gauge_id,
      value: gauge.default_value,
      min: gauge.min,
      max: gauge.max,
      safe_min: gauge.safe_min,
      safe_max: gauge.safe_max,
      locked: false,
      source_ref: `gauge_default:${gauge.gauge_id}`,
    });
  }
  for (const [gaugeId, value] of Object.entries(outputDefaults)) {
    const gauge = valueMap.get(gaugeId);
    if (!gauge) {
      missing.push(`gauge:${gaugeId}`);
      continue;
    }
    gauge.value = Math.min(gauge.max, Math.max(gauge.min, value));
    gauge.source_ref = `output_default:${gaugeId}`;
  }
  for (const layer of layers) {
    for (const override of layer.gauge_overrides) {
      const gauge = valueMap.get(override.gauge_id);
      if (!gauge) {
        missing.push(`gauge:${override.gauge_id}`);
        continue;
      }
      if (override.value < gauge.min || override.value > gauge.max) {
        conflicts.push(`gauge_hard_limit:${override.gauge_id}:${override.value}`);
      }
      gauge.value = Math.min(gauge.max, Math.max(gauge.min, override.value));
      gauge.locked ||= override.lock;
      gauge.source_ref = `layer:${layer.layer_id}`;
    }
  }
  for (const [gaugeId, requested] of Object.entries(preferences)) {
    const definition = gauges.find((gauge) => gauge.gauge_id === gaugeId);
    const gauge = valueMap.get(gaugeId);
    if (!definition || !gauge) {
      missing.push(`gauge:${gaugeId}`);
      continue;
    }
    if (!definition.user_adjustable || gauge.locked) {
      conflicts.push(`gauge_not_adjustable:${gaugeId}`);
      continue;
    }
    if (requested < definition.safe_min || requested > definition.safe_max) {
      conflicts.push(`gauge_preference_clamped:${gaugeId}:${requested}`);
    }
    gauge.value = Math.min(definition.safe_max, Math.max(definition.safe_min, requested));
    gauge.source_ref = `user_preference:${gaugeId}`;
  }
  return {values: [...valueMap.values()], conflicts: uniq(conflicts), missing: uniq(missing)};
}

function sameTraitValue(left: VisualTraitAssignment['value'], right: VisualTraitAssignment['value']): boolean {
  return stable(left) === stable(right);
}

function resolveTraitAssignments(
  assignments: VisualTraitAssignment[],
  immutableTraitRefs: string[],
): {traits: VisualTraitAssignment[]; conflicts: string[]} {
  const resolved = new Map<string, VisualTraitAssignment>();
  const conflicts: string[] = [];
  const immutable = new Set(immutableTraitRefs);

  for (const assignment of assignments) {
    const current = resolved.get(assignment.trait_id);
    if (current && (current.locked || immutable.has(assignment.trait_id)) &&
      !sameTraitValue(current.value, assignment.value)) {
      conflicts.push(`immutable_trait_override:${assignment.trait_id}`);
      continue;
    }
    resolved.set(assignment.trait_id, {
      ...assignment,
      locked: assignment.locked || immutable.has(assignment.trait_id),
    });
  }
  return {
    traits: [...resolved.values()].sort((left, right) => left.trait_id.localeCompare(right.trait_id)),
    conflicts: uniq(conflicts),
  };
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Compile un registre fourni, utile pour les fixtures synthétiques et futurs workspaces DA Studio. */
export function compileVisualPlanWithRegistry(
  registryInput: VisualKnowledgeRegistry,
  input: CompileVisualPlanRequest,
): CompiledVisualPlan {
  const request = CompileVisualPlanRequestSchema.parse(input);
  const registry = VisualKnowledgeRegistrySchema.parse(registryInput);
  const entityMap = new Map(registry.entities.map((entity) => [entity.entity_ref, entity]));
  const entities = request.entity_refs.flatMap((ref) => {
    const entity = entityMap.get(ref);
    return entity ? [entity] : [];
  });
  const missing = request.entity_refs
    .filter((ref) => !entityMap.has(ref))
    .map((ref) => `entity:${ref}`);
  const requestedLayers = uniq([
    ...entities.flatMap((entity) => entity.layer_refs),
    ...request.requested_layer_refs,
  ]);
  const layerResolution = resolveLayers(registry, requestedLayers);
  missing.push(...layerResolution.missing);

  const output = registry.output_recipes.find((recipe) => recipe.recipe_id === request.output_recipe_ref) ?? null;
  if (!output || ['revoked', 'deprecated', 'superseded'].includes(output.status)) {
    missing.push(`output_recipe:${request.output_recipe_ref}`);
  }

  const gaugeCompilation = compileGauges(
    registry.gauges,
    layerResolution.layers,
    output?.default_gauge_values ?? {},
    request.preference_gauge_values,
  );
  missing.push(...gaugeCompilation.missing);
  const traitResolution = resolveTraitAssignments(
    [
      ...entities.flatMap((entity) => entity.trait_assignments),
      ...layerResolution.layers.flatMap((layer) => layer.trait_assignments),
    ],
    layerResolution.layers.flatMap((layer) => layer.immutable_trait_refs),
  );
  const conflicts = uniq([
    ...layerResolution.conflicts,
    ...gaugeCompilation.conflicts,
    ...traitResolution.conflicts,
  ]);

  const activeTraits = traitResolution.traits;
  const traitIds = new Set(registry.trait_definitions.map((trait) => trait.trait_id));
  for (const assignment of activeTraits) {
    if (!traitIds.has(assignment.trait_id)) missing.push(`trait_definition:${assignment.trait_id}`);
  }
  const activeTraitIds = new Set(activeTraits.map((trait) => trait.trait_id));
  for (const requiredTraitRef of output?.required_trait_refs ?? []) {
    if (!activeTraitIds.has(requiredTraitRef)) missing.push(`required_trait:${requiredTraitRef}`);
  }

  const annotationMap = new Map(registry.reference_annotations.map((annotation) => [annotation.annotation_id, annotation]));
  const annotations = entities.flatMap((entity) =>
    entity.reference_annotation_refs.flatMap((ref) => {
      const annotation = annotationMap.get(ref);
      if (!annotation) {
        missing.push(`reference_annotation:${ref}`);
        return [];
      }
      return [annotation];
    }),
  );
  for (const role of output?.required_reference_roles ?? []) {
    if (!annotations.some((annotation) => annotation.role === role)) {
      missing.push(`reference_role:${role}`);
    }
  }

  const positiveConstraints = uniq([
    ...layerResolution.layers.flatMap((layer) => layer.positive_constraints),
    ...(output?.positive_constraints ?? []),
    ...activeTraits.map((trait) => `${trait.trait_id}:${String(trait.value)}`),
  ]);
  const negativeLocks = uniq([
    ...layerResolution.layers.flatMap((layer) => layer.negative_locks),
    ...(output?.negative_locks ?? []),
    ...annotations
      .filter((annotation) => ['anti_pattern', 'contaminated', 'rejected'].includes(annotation.role))
      .flatMap((annotation) => annotation.forbidden_uses),
  ]);
  const criticalMissing = missing.filter((item) =>
    item.startsWith('entity:') ||
    item.startsWith('layer:') ||
    item.startsWith('output_recipe:') ||
    item.startsWith('trait_definition:') ||
    item.startsWith('required_trait:'),
  );
  const status = criticalMissing.length > 0 || conflicts.some((item) =>
    item.startsWith('layer_cycle:') || item.startsWith('immutable_trait_override:'),
  )
    ? 'blocked'
    : missing.length > 0 || conflicts.length > 0
      ? 'limited'
      : 'ready_for_manifest';
  const provenanceRefs = uniq([
    ...registry.source_refs,
    ...entities.flatMap((entity) => entity.source_refs),
    ...layerResolution.layers.flatMap((layer) => layer.source_refs),
    ...(output?.source_refs ?? []),
    ...annotations.map((annotation) => annotation.source_ref),
  ]);
  const hashPayload = {
    registry_id: registry.registry_id,
    registry_version: registry.version,
    request,
    resolved_entity_refs: entities.map((entity) => entity.entity_ref),
    layer_stack: layerResolution.layers.map((layer) => layer.layer_id),
    gauges: gaugeCompilation.values,
    active_traits: activeTraits,
    annotations: annotations.map((annotation) => annotation.annotation_id),
    output_recipe: output?.recipe_id ?? null,
    positive_constraints: positiveConstraints,
    negative_locks: negativeLocks,
    conflicts,
    missing_items: uniq(missing),
  };
  const deterministicHash = createHash('sha256').update(stable(hashPayload)).digest('hex');

  return CompiledVisualPlanSchema.parse({
    compiled_at: Date.now(),
    deterministic_hash: deterministicHash,
    registry_id: registry.registry_id,
    registry_version: registry.version,
    status,
    intent: request.intent,
    context: request.context,
    active_mode: request.active_mode,
    resolved_entity_refs: entities.map((entity) => entity.entity_ref),
    layer_stack: layerResolution.layers.map((layer) => ({
      layer_ref: layer.layer_id,
      layer_kind: layer.layer_kind,
      priority: layer.priority,
      source_refs: layer.source_refs,
    })),
    gauges: gaugeCompilation.values,
    active_traits: activeTraits,
    reference_annotations: annotations,
    output_recipe: output,
    positive_constraints: positiveConstraints,
    negative_locks: negativeLocks,
    conflicts,
    missing_items: uniq(missing),
    provenance_refs: provenanceRefs.length > 0 ? provenanceRefs : ['contract:VISUAL_KNOWLEDGE_FABRIC_V1'],
    explanation_cards: [
      {
        title: 'Composition DA',
        explanation: `${layerResolution.layers.length} layer(s), ${entities.length} entité(s) et ${activeTraits.length} trait(s) ont été résolus sans provider.`,
        source_refs: provenanceRefs.slice(0, 10).length > 0
          ? provenanceRefs.slice(0, 10)
          : ['contract:VISUAL_KNOWLEDGE_FABRIC_V1'],
      },
      {
        title: status === 'ready_for_manifest' ? 'Plan prêt' : 'Décisions restantes',
        explanation: status === 'ready_for_manifest'
          ? 'Le plan structuré peut alimenter un manifest D08 après validation ; aucune image n’est générée.'
          : `Le compilateur refuse d’inventer : ${uniq([...missing, ...conflicts]).join(', ') || 'configuration incomplète'}.`,
        source_refs: ['contract:VISUAL_KNOWLEDGE_FABRIC_V1'],
      },
    ],
    provider_requirements: output?.provider_requirements ?? [],
    execution_policy: 'compile_only',
    generation_allowed: false,
    canon_promotion_allowed: false,
  });
}

/** Compile une direction visuelle structurée. Aucun prompt ni job image n'est produit. */
export function compileVisualPlan(input: CompileVisualPlanRequest): CompiledVisualPlan {
  const request = CompileVisualPlanRequestSchema.parse(input);
  return compileVisualPlanWithRegistry(
    listVisualKnowledgeRegistry(request.registry_source),
    request,
  );
}

/** Projette un plan compilé vers D08 sans écrire de manifest ni matérialiser de référence. */
export function buildD08VisualManifestCandidate(
  planInput: CompiledVisualPlan,
): D08VisualManifestCandidate {
  const plan = CompiledVisualPlanSchema.parse(planInput);
  const root = plan.layer_stack.find((layer) => layer.layer_kind === 'root') ?? null;
  const blockers = [
    ...(plan.status === 'blocked' ? ['compiled_visual_plan_blocked'] : []),
    ...plan.missing_items,
    ...plan.conflicts.filter((item) =>
      item.startsWith('layer_cycle:') || item.startsWith('immutable_trait_override:'),
    ),
  ];
  const warnings = [
    ...plan.conflicts.filter((item) => !blockers.includes(item)),
    ...(plan.reference_annotations.some((annotation) => annotation.rights_status !== 'known')
      ? ['reference_rights_require_review']
      : []),
    ...(plan.reference_annotations.length > 0
      ? ['reference_annotations_must_be_materialized_as_visual_reference_ids']
      : []),
  ];
  return D08VisualManifestCandidateSchema.parse({
    plan_hash: plan.deterministic_hash,
    readiness: blockers.length === 0 ? 'ready_for_d08_review' : 'blocked',
    request_preview: {
      request_title: `Plan DA · ${plan.resolved_entity_refs.join(', ') || 'entité à définir'}`,
      intent: plan.intent,
      canon_entity_refs: plan.resolved_entity_refs,
      da_root_ref: root?.layer_ref ?? null,
      active_layers: plan.layer_stack
        .filter((layer) => layer.layer_kind !== 'root')
        .map((layer) => layer.layer_ref),
      filters: plan.negative_locks.slice(0, 30),
      output_family: 'visual_manifest_candidate',
      output_template: plan.output_recipe?.recipe_id ?? 'output_recipe_missing',
      source_truth_summary: `Plan ${plan.deterministic_hash.slice(0, 12)} compilé depuis ${plan.provenance_refs.length} source(s), sans provider.`,
      reference_annotation_refs: plan.reference_annotations.map((annotation) => annotation.annotation_id),
    },
    blockers: uniq(blockers),
    warnings: uniq(warnings),
    provenance_refs: plan.provenance_refs,
    persistence_allowed: false,
    generation_allowed: false,
    canon_promotion_allowed: false,
    required_next_action: 'owner_reviews_then_materializes_visual_references',
  });
}
