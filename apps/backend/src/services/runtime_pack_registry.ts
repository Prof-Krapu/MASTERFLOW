import {
  ROLE_RANK,
  RuntimePackManifestSchema,
  type GuidanceCandidate,
  type Role,
  type RuntimePackAvailability,
  type RuntimePackManifest,
} from '@masterflow/shared';

import registry from '../seeds/runtime_pack_registry_seed.v1.json';

let cache: RuntimePackManifest[] | null = null;

/** Registre déclaratif des compositions runtime. Aucun pack ne déclenche une action. */
export function listRuntimePacks(): RuntimePackManifest[] {
  if (cache) return cache;
  const raw = (registry as {packs: unknown[]}).packs;
  cache = raw.map((pack) => RuntimePackManifestSchema.parse(pack));
  return cache;
}

export interface RuntimePackResolution {
  available_pack_ids: string[];
  pack_availability: RuntimePackAvailability[];
  guidance_candidates: GuidanceCandidate[];
}

/**
 * Résout les packs depuis les capacités réellement disponibles.
 * Un manifeste décrit une composition ; il ne crée aucune permission et n'exécute rien.
 */
export function resolveRuntimePacks(input: {
  role: Role;
  available_action_ids: string[];
  acknowledged_guidance_ids?: string[];
}): RuntimePackResolution {
  const available = new Set(input.available_action_ids);
  const acknowledged = new Set(input.acknowledged_guidance_ids ?? []);
  const availability: RuntimePackAvailability[] = [];
  const guidance: GuidanceCandidate[] = [];

  for (const pack of listRuntimePacks()) {
    if (ROLE_RANK[input.role] < ROLE_RANK[pack.minimum_role]) continue;

    const missing = pack.required_action_ids.filter((actionId) => !available.has(actionId));
    let status: RuntimePackAvailability['status'] = 'locked';
    let reason: string | null = null;

    if (pack.status === 'live' && missing.length === 0) {
      status = 'active';
    } else if (pack.status === 'partial' && missing.length === 0) {
      status = 'limited';
      reason = 'pack_runtime_partial';
    } else if (pack.status === 'future') {
      reason = 'pack_future';
    } else if (pack.status === 'blocked') {
      reason = 'pack_blocked';
    } else if (missing.length > 0) {
      reason = 'required_action_missing';
    }

    availability.push({
      pack_id: pack.pack_id,
      status,
      reason,
      missing_action_ids: missing,
    });

    if (
      (status === 'active' || status === 'limited') &&
      pack.guidance &&
      !acknowledged.has(pack.guidance.guidance_id)
    ) {
      guidance.push({
        guidance_id: pack.guidance.guidance_id,
        pack_id: pack.pack_id,
        trigger: pack.guidance.trigger,
        title: pack.guidance.title,
        summary: pack.guidance.summary,
        recommended_mode: pack.guidance.recommended_mode,
        tutorial_resource_id: pack.guidance.tutorial_resource_id,
        skippable: pack.guidance.skippable,
        confidence: status === 'active' ? 0.9 : 0.7,
      });
    }
  }

  return {
    available_pack_ids: availability
      .filter((item) => item.status === 'active' || item.status === 'limited')
      .map((item) => item.pack_id),
    pack_availability: availability,
    guidance_candidates: guidance.slice(0, 3),
  };
}
