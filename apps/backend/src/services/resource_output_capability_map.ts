import {
  ResourceOutputCapabilityMapSchema,
  type ResourceOutputCapabilityMap,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';

interface ResourceCounts {
  total: number;
  candidate: number;
  validated: number;
  deprecated: number;
}

interface ManifestCounts {
  total: number;
  approved: number;
  blocked_or_pending: number;
  rejected: number;
}

interface AssetCounts {
  total: number;
  candidate: number;
  approved: number;
  rejected: number;
  archived: number;
}

function resourceCounts(): ResourceCounts {
  const row = getDb().prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'candidate' THEN 1 ELSE 0 END) AS candidate,
      SUM(CASE WHEN status = 'validated' THEN 1 ELSE 0 END) AS validated,
      SUM(CASE WHEN status = 'deprecated' THEN 1 ELSE 0 END) AS deprecated
    FROM resources
  `).get() as Partial<ResourceCounts> | undefined;
  return {
    total: Number(row?.total ?? 0),
    candidate: Number(row?.candidate ?? 0),
    validated: Number(row?.validated ?? 0),
    deprecated: Number(row?.deprecated ?? 0),
  };
}

function manifestCounts(): ManifestCounts {
  const row = getDb().prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE
        WHEN status IN (
          'draft','references_to_classify','da_to_resolve','readiness_blocked',
          'action_ready_preview','generation_blocked_tech_pending','parked'
        ) THEN 1 ELSE 0
      END) AS blocked_or_pending,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM visual_manifests
  `).get() as Partial<ManifestCounts> | undefined;
  return {
    total: Number(row?.total ?? 0),
    approved: Number(row?.approved ?? 0),
    blocked_or_pending: Number(row?.blocked_or_pending ?? 0),
    rejected: Number(row?.rejected ?? 0),
  };
}

function assetCounts(): AssetCounts {
  const row = getDb().prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'candidate' THEN 1 ELSE 0 END) AS candidate,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
      SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived
    FROM generated_assets
  `).get() as Partial<AssetCounts> | undefined;
  return {
    total: Number(row?.total ?? 0),
    candidate: Number(row?.candidate ?? 0),
    approved: Number(row?.approved ?? 0),
    rejected: Number(row?.rejected ?? 0),
    archived: Number(row?.archived ?? 0),
  };
}

/** Carte Resources / Outputs : lecture seule, aucune validation, aucun export et aucun provider. */
export function buildResourceOutputCapabilityMap(
  actor: AuthUser,
  now = Date.now(),
): ResourceOutputCapabilityMap {
  return ResourceOutputCapabilityMapSchema.parse({
    generated_at: now,
    actor_scope_ref: `owner:${actor.id}`,
    resources: {
      ...resourceCounts(),
      endpoint_refs: [
        '/api/v1/resources',
        '/api/v1/resources/:id/validate',
        '/api/v1/rag/resources',
      ],
    },
    outputs: {
      visual_manifests: manifestCounts(),
      generated_assets: assetCounts(),
      endpoint_refs: [
        '/api/v1/visual-references',
        '/api/v1/visual-manifests',
        '/api/v1/da/assets',
        '/api/v1/assets',
      ],
    },
    primitives: [
      {
        primitive_id: 'resource_truth_validated_by_default',
        label: 'Resource Truth anti-hallucination',
        status: 'implemented',
        area: 'resource_truth',
        endpoint_refs: ['/api/v1/resources'],
        gate: 'Recherche par défaut limitée aux ressources validated ; include_all réservé admin/godmode.',
        gap: null,
      },
      {
        primitive_id: 'rag_projection_from_validated_resources',
        label: 'Projection RAG gouvernée par statut',
        status: 'partial',
        area: 'rag_projection',
        endpoint_refs: ['/api/v1/rag/resources'],
        gate: 'Une ressource candidate ne doit pas devenir contexte fiable sans statut validated.',
        gap: 'L’indexation réelle peut encore dépendre de runners séparés ; la carte ne lance aucun reindex.',
      },
      {
        primitive_id: 'visual_manifest_output_promise',
        label: 'Output visuel manifest-first',
        status: 'implemented',
        area: 'visual_manifest',
        endpoint_refs: ['/api/v1/visual-manifests'],
        gate: 'Un manifest prépare une intention/output promise ; il ne génère pas et ne canonise pas un asset.',
        gap: null,
      },
      {
        primitive_id: 'generated_asset_candidate_lifecycle',
        label: 'Lifecycle generated_assets candidat → review',
        status: 'implemented',
        area: 'generated_asset',
        endpoint_refs: ['/api/v1/da/assets', '/api/v1/assets'],
        gate: 'Tout asset stocké entre candidate et demande review humaine avant promotion.',
        gap: 'La sémantique output globale reste à relier au futur Output Registry transversal.',
      },
      {
        primitive_id: 'output_registry_transversal',
        label: 'Output Registry transversal hors DA seule',
        status: 'future',
        area: 'output_registry',
        endpoint_refs: [],
        gate: 'Les familles d’outputs existent par domaine, pas encore comme registre transverse unique.',
        gap: 'À construire après stabilisation Orientation/DA/Inventory pour relier print, export, vidéo, assets, ressources et factories.',
      },
    ],
    source_truth_policy: {
      default_resources_are_validated_only: true,
      candidate_resource_not_served_by_default: true,
      output_manifest_not_provider_generation: true,
      generated_asset_candidate_requires_review: true,
      export_or_live_publication_requires_human_gate: true,
    },
    forbidden_shortcuts: [
      'candidate_resource_as_context_truth',
      'rag_index_unvalidated_resource',
      'visual_manifest_as_generated_asset',
      'asset_candidate_as_canon',
      'export_without_human_gate',
      'provider_generation_from_capability_map',
      'output_registry_duplicate_per_domain',
    ],
    execution_policy: 'diagnostic_only',
  });
}
