import {
  SecurityTrustCapabilityMapSchema,
  type SecurityTrustCapabilityMap,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {getSafetyStateSnapshot} from './safety_state.ts';
import {getTrustFabricSnapshot} from './trust_fabric.ts';

/** Carte de sécurité explicable : lecture seule, aucun ban, aucune permission modifiée. */
export function buildSecurityTrustCapabilityMap(
  actor: AuthUser,
  roomId?: string,
  now = Date.now(),
): SecurityTrustCapabilityMap {
  return SecurityTrustCapabilityMapSchema.parse({
    generated_at: now,
    actor_scope_ref: roomId ? `room:${roomId}` : `owner:${actor.id}`,
    trust_snapshot: getTrustFabricSnapshot(actor, now),
    safety_state: getSafetyStateSnapshot(actor, roomId, now),
    primitives: [
      {
        primitive_id: 'security_guard_input_classifier',
        label: 'Classification prompt injection / tool misuse / source poisoning',
        status: 'implemented',
        protects: ['chat', 'rag', 'memory', 'tool', 'upload', 'render'],
        endpoint_refs: [],
        gap: 'Le classifier est déterministe ; il reste à le brancher systématiquement partout où une entrée non fiable arrive.',
      },
      {
        primitive_id: 'trust_fabric_runtime_signals',
        label: 'Trust Fabric sans score composite',
        status: 'implemented',
        protects: ['sources', 'user_risk_signal', 'runtime_health', 'artifact_integrity'],
        endpoint_refs: ['/api/v1/diagnostics/trust'],
        gap: 'L’intégrité artefact reste déclarée unknown tant qu’un passeport commun n’est pas généralisé.',
      },
      {
        primitive_id: 'safety_state_narrative_projection',
        label: 'Projection narrative des états de sécurité',
        status: 'implemented',
        protects: ['persona_reaction', 'godmode_alert', 'class_projection'],
        endpoint_refs: ['/api/v1/diagnostics/safety-state'],
        gap: null,
      },
      {
        primitive_id: 'godmode_manual_sanction',
        label: 'Décision godmode pour sanction ou rétablissement',
        status: 'partial',
        protects: ['users', 'permissions', 'classroom_context'],
        endpoint_refs: [],
        gap: 'MasterFlow alerte et bloque via gates existants ; le ban/retrait de droits reste un chantier admin séparé.',
      },
    ],
    response_policy: {
      curiosity_allowed: true,
      educational_explanation_allowed: true,
      suspicious_inputs_warn_or_refuse: true,
      hard_stop_requires_existing_gate: true,
      ban_is_manual_godmode_only: true,
    },
    narrative_states: [
      'normal',
      'vigilant',
      'recadrage',
      'suspicious',
      'closed',
      'hard_stop',
      'recovered',
    ],
    execution_policy: 'diagnostic_only',
  });
}
