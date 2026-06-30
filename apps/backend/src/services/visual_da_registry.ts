import {
  VisualDaRegistryBundleSchema,
  VisualDaResolverPreviewQuerySchema,
  VisualDaResolverPreviewSchema,
  type NarrativeActingProfile,
  type NarrativeActingState,
  type VisualAtomicBrick,
  type VisualDaLayer,
  type VisualDaRegistryBundle,
  type VisualDaResolverPreview,
  type VisualDaResolverPreviewQuery,
  type VisualEntityProfile,
  type VisualPipelineSlice,
  type VisualReferenceBoard,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import registrySeed from '../seeds/visual_da_registry_seed.v1.json';

let registryCache: VisualDaRegistryBundle | null = null;

/** Registre DA déclaratif. Il ne génère aucune image et ne canonise aucun asset. */
export function listVisualDaRegistry(): VisualDaRegistryBundle {
  if (registryCache) return registryCache;
  registryCache = VisualDaRegistryBundleSchema.parse(registrySeed);
  return registryCache;
}

function byId<T>(items: T[], getId: (item: T) => string): Map<string, T> {
  return new Map(items.map((item) => [getId(item), item]));
}

function uniq(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function pickActingState(
  profile: NarrativeActingProfile | undefined,
  requestedState: string | undefined,
): NarrativeActingState | null {
  if (!profile) return null;
  const wanted = requestedState?.trim().toLowerCase();
  if (wanted) {
    const exact = profile.states.find((state) =>
      [state.state_id, state.emotional_state, state.label].some((candidate) => candidate.toLowerCase() === wanted),
    );
    if (exact) return exact;
  }
  return profile.states.find((state) => state.state_id === profile.default_state_id) ?? profile.states[0] ?? null;
}

function findSlice(
  slices: VisualPipelineSlice[],
  query: VisualDaResolverPreviewQuery,
  entity: VisualEntityProfile,
): VisualPipelineSlice | undefined {
  return slices.find((slice) =>
    slice.output_surface === query.output_surface &&
    (slice.entity_refs.includes(entity.entity_id) || slice.entity_refs.length === 0),
  );
}

function explanation(title: string, explanationText: string, sourceRefs: string[]) {
  return {
    title,
    explanation: explanationText,
    source_refs: sourceRefs.length > 0 ? sourceRefs : ['seed:visual_da_registry_seed.v1'],
  };
}

export function buildVisualDaResolverPreview(
  _actor: AuthUser,
  input: VisualDaResolverPreviewQuery,
): VisualDaResolverPreview {
  const query = VisualDaResolverPreviewQuerySchema.parse(input);
  const registry = listVisualDaRegistry();
  const rootMap = byId(registry.roots, (root) => root.root_id);
  const layerMap = byId(registry.layers, (layer) => layer.layer_id);
  const entityMap = byId(registry.entity_profiles, (entity) => entity.entity_id);
  const brickMap = byId(registry.atomic_bricks, (brick) => brick.brick_id);
  const boardMap = byId(registry.reference_boards, (board) => board.board_id);
  const actingMap = byId(registry.acting_profiles, (profile) => profile.acting_profile_id);

  const entity = entityMap.get(query.entity_id);
  const fallbackRoot = registry.roots.find((root) => root.status === 'active') ?? registry.roots[0];
  if (!entity || entity.status === 'blocked') {
    const sourceRefs = uniq([fallbackRoot?.source_refs[0], 'seed:visual_da_registry_seed.v1']);
    return VisualDaResolverPreviewSchema.parse({
      generated_at: Date.now(),
      entity_id: query.entity_id,
      resolution_status: 'blocked',
      da_stack: fallbackRoot
        ? [{
          stack_ref: fallbackRoot.root_id,
          stack_type: 'root',
          authority: fallbackRoot.authority,
          label: fallbackRoot.label,
        }]
        : [{
          stack_ref: 'missing_root',
          stack_type: 'root',
          authority: 'masterflow_core',
          label: 'Racine DA manquante',
        }],
      narrative_acting_payload: null,
      activated_bricks: [],
      reference_boards: [],
      blocking_gates: ['canon_entity_lock', 'reference_roles_resolved'],
      negative_locks: ['no_invention_from_missing_entity'],
      missing_items: [`entity_profile:${query.entity_id}`],
      visual_gauges: registry.visual_gauges,
      source_refs: sourceRefs,
      d08_manifest_preview: {
        intent: `Preview DA bloqué : profil visuel ${query.entity_id} introuvable ou bloqué.`,
        da_root_ref: fallbackRoot?.root_id ?? null,
        active_layers: [],
        canon_entity_refs: [query.entity_id],
        output_template: query.output_surface,
        status: 'readiness_blocked',
        generation_allowed: false,
        canon_promotion_allowed: false,
      },
      explanation_cards: [
        explanation(
          'Profil visuel absent',
          'Le resolver refuse de reconstruire un personnage sans profil visuel enregistré.',
          sourceRefs,
        ),
      ],
      execution_policy: 'preview_only',
    });
  }

  const missing: string[] = [];
  const root = rootMap.get(entity.root_ref);
  if (!root || root.status !== 'active') missing.push(`root:${entity.root_ref}`);

  const requestedLayerIds = uniq([...entity.default_layer_refs, query.optional_event_layer]);
  const layers: VisualDaLayer[] = [];
  for (const layerId of requestedLayerIds) {
    const layer = layerMap.get(layerId);
    if (!layer || layer.status === 'blocked') {
      missing.push(`layer:${layerId}`);
      continue;
    }
    layers.push(layer);
  }
  layers.sort((left, right) => left.priority_order - right.priority_order);

  const actingProfile = entity.acting_profile_ref ? actingMap.get(entity.acting_profile_ref) : undefined;
  if (entity.acting_profile_ref && !actingProfile) missing.push(`acting_profile:${entity.acting_profile_ref}`);
  const actingState = pickActingState(actingProfile, query.emotional_state);
  if (query.emotional_state && actingProfile && actingState?.state_id !== query.emotional_state) {
    const matched = [actingState?.label, actingState?.emotional_state].includes(query.emotional_state);
    if (!matched && !actingProfile.states.some((state) => state.state_id === query.emotional_state)) {
      missing.push(`acting_state:${query.emotional_state}`);
    }
  }

  const slice = findSlice(registry.pipeline_slices, query, entity);
  if (!slice) missing.push(`pipeline_slice:${query.output_surface}`);

  const brickRefs = uniq([...entity.atomic_brick_refs, ...(slice?.required_brick_refs ?? [])]);
  const bricks: VisualAtomicBrick[] = [];
  for (const brickRef of brickRefs) {
    const brick = brickMap.get(brickRef);
    if (!brick) {
      missing.push(`atomic_brick:${brickRef}`);
      continue;
    }
    bricks.push(brick);
  }

  const boardRefs = uniq([
    ...entity.reference_board_refs,
    ...registry.reference_boards
      .filter((board) => slice?.required_reference_roles.includes(board.role))
      .map((board) => board.board_id),
    ...(layers.some((layer) => layer.layer_id === 'event_layer_ours_dor') ? ['ours_theme', 'ours_components'] : []),
    ...(layers.some((layer) => layer.layer_id === 'prof_krapu_layer') ? ['prof_canon'] : []),
  ]);
  const boards: VisualReferenceBoard[] = [];
  for (const boardRef of boardRefs) {
    const board = boardMap.get(boardRef);
    if (!board) {
      missing.push(`reference_board:${boardRef}`);
      continue;
    }
    boards.push(board);
  }

  const negativeLocks = uniq([
    ...bricks.map((brick) => brick.negative_prompt),
    ...(actingState?.negative_locks ?? []),
    ...boards.flatMap((board) => board.role === 'anti_pattern' ? board.allowed_use : []),
  ]);
  const blockingGates = uniq(slice?.gate_refs ?? ['da_mode_resolved', 'canon_entity_lock', 'reference_roles_resolved']);
  const sourceRefs = uniq([
    ...(root?.source_refs ?? []),
    ...entity.source_refs,
    ...layers.flatMap((layer) => layer.source_refs),
    ...(actingProfile?.source_refs ?? []),
    ...(slice?.source_refs ?? []),
    ...bricks.flatMap((brick) => brick.source_refs),
    ...boards.map((board) => board.source_ref),
  ]);
  const status = !root || !slice || missing.some((item) => item.startsWith('root:') || item.startsWith('pipeline_slice:'))
    ? 'blocked'
    : missing.length > 0
      ? 'limited_missing_inputs'
      : 'ready_for_manifest_preview';

  return VisualDaResolverPreviewSchema.parse({
    generated_at: Date.now(),
    entity_id: entity.entity_id,
    resolution_status: status,
    da_stack: [
      ...(root ? [{
        stack_ref: root.root_id,
        stack_type: 'root',
        authority: root.authority,
        label: root.label,
      }] : []),
      {
        stack_ref: entity.entity_id,
        stack_type: 'entity',
        authority: entity.authority,
        label: entity.display_name,
      },
      ...layers.map((layer) => ({
        stack_ref: layer.layer_id,
        stack_type: 'layer' as const,
        authority: layer.authority,
        label: layer.label,
      })),
      {
        stack_ref: query.output_surface,
        stack_type: 'output_surface',
        authority: 'pipeline_slice_registry',
        label: slice?.label ?? query.output_surface,
      },
    ],
    narrative_acting_payload: actingState,
    activated_bricks: bricks,
    reference_boards: boards,
    blocking_gates: blockingGates,
    negative_locks: negativeLocks,
    missing_items: uniq(missing),
    visual_gauges: registry.visual_gauges.filter((gauge) =>
      gauge.applies_to.includes('masterflow_core') ||
      gauge.applies_to.includes(entity.entity_id) ||
      gauge.applies_to.includes(query.output_surface) ||
      layers.some((layer) => gauge.applies_to.includes(layer.layer_id)),
    ),
    source_refs: sourceRefs.length > 0 ? sourceRefs : ['seed:visual_da_registry_seed.v1'],
    d08_manifest_preview: {
      intent: `${entity.display_name} / ${query.context} / ${query.active_mode} : ${actingState?.narrative_intent ?? 'acting non résolu'}`,
      da_root_ref: root?.root_id ?? null,
      active_layers: layers.map((layer) => layer.layer_id),
      canon_entity_refs: [entity.entity_id],
      output_template: query.output_surface,
      status: status === 'blocked' ? 'readiness_blocked' : 'action_ready_preview',
      generation_allowed: false,
      canon_promotion_allowed: false,
    },
    explanation_cards: [
      explanation(
        'Racine DA',
        root
          ? `${root.label} reste la racine : les couches événementielles ne peuvent pas la remplacer.`
          : 'La racine DA manque, donc le resolver bloque le manifest.',
        root?.source_refs ?? [],
      ),
      explanation(
        'Profil visuel',
        entity.summary,
        entity.source_refs,
      ),
      explanation(
        'Acting narratif',
        actingState
          ? `${actingState.label} : ${actingState.expression}; ${actingState.pose}.`
          : 'Aucun acting résolu : le système doit rester en preview limitée.',
        actingProfile?.source_refs ?? entity.source_refs,
      ),
      explanation(
        'Références',
        boards.length > 0
          ? `Références sélectionnées : ${boards.map((board) => `${board.board_id} (${board.role})`).join(', ')}.`
          : 'Aucune référence utilisable : génération bloquée.',
        boards.map((board) => board.source_ref),
      ),
    ],
    execution_policy: 'preview_only',
  });
}
