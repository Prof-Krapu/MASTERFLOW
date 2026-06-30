import {
  MasterFlowOrientationSnapshotSchema,
  ROLE_RANK,
  type ActionRegistryEntry,
  type MasterFlowOrientationQuery,
  type MasterFlowOrientationSnapshot,
  type OrientationCapabilitySnapshot,
  type OrientationCapabilityVisibility,
  type OrientationDomainSnapshot,
  type OrientationImplementationStatus,
  type RiskLevel,
} from '@masterflow/shared';

import {listRegistry} from '../engines/action_registry.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {assertExperienceScopeAccess} from './experience_fabric.ts';
import {listRuntimePacks, resolveRuntimePacks} from './runtime_pack_registry.ts';
import {
  lintVisualKnowledgeRegistry,
  listVisualKnowledgeRegistry,
} from './visual_knowledge_fabric.ts';

const RISK_LEVELS: readonly RiskLevel[] = ['low', 'medium', 'medium_high', 'high', 'variable'];

function riskLevel(value: string): RiskLevel {
  return RISK_LEVELS.includes(value as RiskLevel) ? (value as RiskLevel) : 'variable';
}

function statusFromBoolean(hasValue: boolean): OrientationImplementationStatus {
  return hasValue ? 'implemented' : 'absent';
}

function domainForAction(entry: ActionRegistryEntry): string {
  const text = `${entry.action_id} ${entry.ui_surface} ${entry.endpoint}`.toLowerCase();
  if (text.includes('visual') || text.includes('image') || text.includes('da') || text.includes('theme') || text.includes('d08')) {
    return 'da_visual_fabric';
  }
  if (text.includes('story') || text.includes('narrative') || text.includes('masterstory')) {
    return 'masterstory';
  }
  if (text.includes('inventory') || text.includes('ocr') || text.includes('resource')) {
    return 'inventory_resources_outputs';
  }
  if (text.includes('factory') || text.includes('backflow')) {
    return 'factory_backflow';
  }
  if (text.includes('security') || text.includes('trust') || text.includes('validation') || text.includes('permission') || text.includes('admin') || text.includes('deploy')) {
    return 'security_trust';
  }
  if (text.includes('voice') || text.includes('tts') || text.includes('style') || text.includes('persona')) {
    return 'personas_voice_style';
  }
  if (text.includes('teaching') || text.includes('learning') || text.includes('subject') || text.includes('correction') || text.includes('cohort')) {
    return 'teaching_learning';
  }
  return 'runtime_actions';
}

function visibilityForAction(actor: AuthUser, entry: ActionRegistryEntry): OrientationCapabilityVisibility {
  if (ROLE_RANK[actor.role] < ROLE_RANK[entry.minimum_role]) return 'locked';
  if (entry.status === 'live') return 'available';
  if (entry.status === 'future') return 'future';
  return 'out_of_scope';
}

function implementationForAction(entry: ActionRegistryEntry): OrientationImplementationStatus {
  if (entry.status === 'live') return 'implemented';
  if (entry.status === 'future') return 'future';
  return 'blocked';
}

function actionCapability(actor: AuthUser, entry: ActionRegistryEntry): OrientationCapabilitySnapshot {
  const visibility = visibilityForAction(actor, entry);
  return {
    capability_id: entry.action_id,
    label: entry.label,
    domain_id: domainForAction(entry),
    source_type: 'action_registry',
    implementation_status: implementationForAction(entry),
    visibility,
    risk_level: riskLevel(entry.risk_level),
    validation_required: entry.validation_required,
    endpoint: entry.endpoint,
    blocked_reason: visibility === 'available' ? null : visibility,
    source_refs: ['apps/backend/src/seeds/action_registry_seed.v1.json'],
  };
}

function runtimePackCapabilities(actor: AuthUser, availableActions: string[]): OrientationCapabilitySnapshot[] {
  const resolution = resolveRuntimePacks({
    role: actor.role,
    available_action_ids: availableActions,
  });
  const availabilityById = new Map(resolution.pack_availability.map((item) => [item.pack_id, item]));
  return listRuntimePacks().map((pack) => {
    const availability = availabilityById.get(pack.pack_id);
    const visibility: OrientationCapabilityVisibility =
      availability?.status === 'active' || availability?.status === 'limited'
        ? 'available'
        : pack.status === 'future'
          ? 'future'
          : 'locked';
    return {
      capability_id: pack.pack_id,
      label: pack.label,
      domain_id: pack.active_modes.includes('teaching') ? 'teaching_learning' : 'runtime_actions',
      source_type: 'runtime_pack',
      implementation_status: pack.status === 'live' ? 'implemented' : pack.status === 'partial' ? 'partial' : pack.status,
      visibility,
      risk_level: null,
      validation_required: null,
      endpoint: null,
      blocked_reason: visibility === 'available' ? null : availability?.reason ?? pack.status,
      source_refs: ['apps/backend/src/seeds/runtime_pack_registry_seed.v1.json', ...pack.source_refs],
    };
  });
}

function visualFabricCapabilities(): OrientationCapabilitySnapshot[] {
  const registry = listVisualKnowledgeRegistry('empty_core');
  const lint = lintVisualKnowledgeRegistry(registry);
  const implemented = registry.status === 'empty_ready' && lint.valid;
  return [
    {
      capability_id: 'visual_knowledge_registry_empty_core',
      label: 'Registry Kernel visuel vide',
      domain_id: 'da_visual_fabric',
      source_type: 'visual_fabric',
      implementation_status: implemented ? 'implemented' : 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/experience/visual-fabric/registry',
      blocked_reason: null,
      source_refs: registry.source_refs,
    },
  ];
}

function factoryRouterCapabilities(): OrientationCapabilitySnapshot[] {
  return [
    {
      capability_id: 'factory_router_external_fast_index',
      label: 'Routeur local Factories vers primitives MasterFlow',
      domain_id: 'factory_backflow',
      source_type: 'factory_router',
      implementation_status: 'partial',
      visibility: 'locked',
      risk_level: null,
      validation_required: true,
      endpoint: null,
      blocked_reason: 'external_candidate_not_runtime_masterflow',
      source_refs: [
        '/Users/malex/Desktop/FACTORIES/_MASTERFLOW_ROUTER/00_README_ROUTER.md',
        '/Users/malex/Desktop/FACTORIES/MASTERFLOW_FACTORY_COMMON_CDC_V1_CANDIDATE.md',
      ],
    },
  ];
}

function systemContractCapabilities(): OrientationCapabilitySnapshot[] {
  return [
    {
      capability_id: 'narrative_canon_graph',
      label: 'Graphe de canon narratif',
      domain_id: 'masterstory',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/experience/visual-grammar',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/narrative_canon_graph.ts',
        'docs/experience-fabric/NARRATIVE_CANON_GRAPH_V1.md',
      ],
    },
    {
      capability_id: 'storylet_engine',
      label: 'Storylets et recommandations narratives',
      domain_id: 'masterstory',
      source_type: 'system_contract',
      implementation_status: 'implemented',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/experience/storylets',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/storylet_engine.ts',
        'docs/experience-fabric/STORYLET_ENGINE_V1.md',
      ],
    },
    {
      capability_id: 'inventory_registry_gap',
      label: 'Registry explicable Inventory à consolider',
      domain_id: 'inventory_resources_outputs',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/inventory/capability-map',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/inventory.ts',
        'apps/backend/src/engines/resource_truth.ts',
      ],
    },
    {
      capability_id: 'resource_output_capability_map',
      label: 'Resources / Outputs / assets',
      domain_id: 'inventory_resources_outputs',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/diagnostics/resource-output/capability-map',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/engines/resource_truth.ts',
        'apps/backend/src/services/visual_manifests.ts',
        'apps/backend/src/services/da_runtime.ts',
        'apps/backend/src/services/resource_output_capability_map.ts',
      ],
    },
    {
      capability_id: 'factory_backflow_capability_map',
      label: 'Carte native de routing Factory Backflow',
      domain_id: 'factory_backflow',
      source_type: 'system_contract',
      implementation_status: 'implemented',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/backflow/capability-map',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/factory_backflow_intake.ts',
        'apps/backend/src/routers/factory_backflow.ts',
      ],
    },
    {
      capability_id: 'security_guard_and_safety_state',
      label: 'Security Guard + Safety State',
      domain_id: 'security_trust',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/diagnostics/security-trust/capability-map',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/security_guard.ts',
        'apps/backend/src/services/safety_state.ts',
        'apps/backend/src/services/security_trust_capability_map.ts',
      ],
    },
    {
      capability_id: 'trust_fabric',
      label: 'Trust Fabric sources / users / liens',
      domain_id: 'security_trust',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: null,
      blocked_reason: null,
      source_refs: ['apps/backend/src/services/trust_fabric.ts'],
    },
    {
      capability_id: 'style_mirror_expressive_canon',
      label: 'Style Mirror / Expressive Canon',
      domain_id: 'personas_voice_style',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: '/api/v1/diagnostics/expressive-canon/capability-map',
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/style_mirror_engine.ts',
        'apps/backend/src/services/expressive_canon_capability_map.ts',
        'docs/audits/EXPRESSIVE_CANON_BEHAVIOR_GRAPH_AUDIT_2026-06-29.md',
      ],
    },
    {
      capability_id: 'voice_persona_tts',
      label: 'Voice persona / TTS contrôlé',
      domain_id: 'personas_voice_style',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'locked',
      risk_level: null,
      validation_required: true,
      endpoint: null,
      blocked_reason: 'provider_cost_and_consent_gate',
      source_refs: ['apps/backend/src/services/tts.ts'],
    },
    {
      capability_id: 'teaching_learning_integrity',
      label: 'Teaching / Learning / intégrité pédagogique',
      domain_id: 'teaching_learning',
      source_type: 'system_contract',
      implementation_status: 'partial',
      visibility: 'available',
      risk_level: null,
      validation_required: null,
      endpoint: null,
      blocked_reason: null,
      source_refs: [
        'apps/backend/src/services/pedagogical_integrity.ts',
        'apps/backend/src/services/learning_mirror_engine.ts',
      ],
    },
  ];
}

function domainSnapshot(domainId: string, capabilities: OrientationCapabilitySnapshot[]): OrientationDomainSnapshot {
  const domainCapabilities = capabilities.filter((capability) => capability.domain_id === domainId);
  const implemented = domainCapabilities.filter((capability) => capability.implementation_status === 'implemented').length;
  const hasAvailable = domainCapabilities.some((capability) => capability.visibility === 'available');
  const hasFuture = domainCapabilities.some((capability) => capability.visibility === 'future');
  const registry = statusFromBoolean(domainCapabilities.length > 0);
  const resolver: OrientationImplementationStatus = hasAvailable ? 'partial' : hasFuture ? 'future' : registry;

  const labels: Record<string, string> = {
    da_visual_fabric: 'DA / Visual Fabric',
    masterstory: 'MasterStory / Narrative Fabric',
    inventory_resources_outputs: 'Inventory / Resources / Outputs',
    factory_backflow: 'Factories / Backflow',
    runtime_actions: 'Runtime / Actions',
    security_trust: 'Security / Trust',
    personas_voice_style: 'Personas / Voice / Style',
    teaching_learning: 'Teaching / Learning',
  };
  const fallbackSources: Record<string, string> = {
    da_visual_fabric: 'apps/backend/src/services/visual_knowledge_fabric.ts',
    masterstory: 'apps/backend/src/services/narrative_canon_graph.ts',
    inventory_resources_outputs: 'apps/backend/src/services/inventory.ts',
    factory_backflow: '/Users/malex/Desktop/FACTORIES/_MASTERFLOW_ROUTER/00_README_ROUTER.md',
    runtime_actions: 'apps/backend/src/seeds/action_registry_seed.v1.json',
    security_trust: 'apps/backend/src/services/security_guard.ts',
    personas_voice_style: 'apps/backend/src/services/style_mirror_engine.ts',
    teaching_learning: 'apps/backend/src/services/subjects.ts',
  };
  const gap = implemented === domainCapabilities.length && domainCapabilities.length > 0
    ? 'Fondation représentée ; vérifier les ponts transversaux avant absorption.'
    : domainCapabilities.length === 0
      ? 'Aucune capacité indexée dans cette tranche d’orientation.'
      : 'Capacités présentes mais orientation, explication ou gates encore partiels.';

  return {
    domain_id: domainId,
    label: labels[domainId] ?? domainId,
    registry,
    resolver,
    compiler: domainId === 'da_visual_fabric' ? 'partial' : 'unknown',
    lint: domainId === 'da_visual_fabric' || domainId === 'security_trust' ? 'partial' : 'unknown',
    explanation: hasAvailable ? 'partial' : 'unknown',
    gate: domainCapabilities.some((capability) => capability.validation_required) ? 'partial' : 'unknown',
    gap_summary: gap,
    source_refs: [
      ...new Set([
        ...domainCapabilities.flatMap((capability) => capability.source_refs),
        fallbackSources[domainId] ?? 'apps/backend/src/services/orientation_fabric.ts',
      ]),
    ].slice(0, 30),
  };
}

function nextActions(capabilities: OrientationCapabilitySnapshot[]) {
  const order: Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    medium_high: 2,
    high: 3,
    variable: 4,
  };
  return capabilities
    .filter((capability) => capability.visibility === 'available' && capability.risk_level !== null)
    .sort((a, b) => order[a.risk_level ?? 'variable'] - order[b.risk_level ?? 'variable'])
    .slice(0, 5)
    .map((capability) => ({
      action_id: capability.capability_id,
      label: capability.label,
      domain_id: capability.domain_id,
      reason: 'Action live disponible dans les registres ; à proposer seulement si le contexte utilisateur la rend utile.',
      risk_level: capability.risk_level ?? 'variable',
      validation_required: capability.validation_required ?? false,
      confidence: capability.risk_level === 'low' ? 0.82 : 0.68,
    }));
}

/**
 * Construit la boussole transversale de MasterFlow.
 * Diagnostic uniquement : aucune action n'est exécutée et aucune permission n'est créée.
 */
export function buildMasterFlowOrientationSnapshot(
  actor: AuthUser,
  query: MasterFlowOrientationQuery,
): MasterFlowOrientationSnapshot {
  assertExperienceScopeAccess(actor, query.project_id);
  const includeFuture = query.include_future ?? true;
  const actionCapabilities = listRegistry().map((entry) => actionCapability(actor, entry));
  const availableActionIds = actionCapabilities
    .filter((capability) => capability.visibility === 'available')
    .map((capability) => capability.capability_id);
  const allCapabilities = [
    ...actionCapabilities,
    ...runtimePackCapabilities(actor, availableActionIds),
    ...visualFabricCapabilities(),
    ...factoryRouterCapabilities(),
    ...systemContractCapabilities(),
  ].filter((capability) =>
    (includeFuture || capability.visibility === 'available') &&
    (!query.domain_id || capability.domain_id === query.domain_id),
  );
  const domainIds = [
    'da_visual_fabric',
    'masterstory',
    'inventory_resources_outputs',
    'factory_backflow',
    'runtime_actions',
    'security_trust',
    'personas_voice_style',
    'teaching_learning',
  ].filter((domainId) => !query.domain_id || query.domain_id === domainId);

  return MasterFlowOrientationSnapshotSchema.parse({
    generated_at: Date.now(),
    actor_role: actor.role,
    project_id: query.project_id ?? null,
    active_mode: query.active_mode ?? null,
    domains: domainIds.map((domainId) => domainSnapshot(domainId, allCapabilities)),
    capabilities: allCapabilities,
    next_action_candidates: nextActions(allCapabilities),
    blocked_capabilities: allCapabilities
      .filter((capability) => capability.visibility !== 'available')
      .map((capability) => ({
        capability_id: capability.capability_id,
        reason: capability.blocked_reason ?? capability.visibility,
      })),
    orientation_invariants: [
      'diagnostic_only_no_execution',
      'action_registry_does_not_create_permission',
      'factory_complete_pack_never_imported_as_masterflow_runtime',
      'ui_removed_from_system_rush',
    ],
    execution_policy: 'diagnostic_only',
    source_refs: [
      'apps/backend/src/seeds/action_registry_seed.v1.json',
      'apps/backend/src/seeds/runtime_pack_registry_seed.v1.json',
      'apps/backend/src/seeds/visual_knowledge_fabric_seed.v1.json',
      '/Users/malex/Desktop/FACTORIES/_MASTERFLOW_ROUTER/00_README_ROUTER.md',
    ],
  });
}
