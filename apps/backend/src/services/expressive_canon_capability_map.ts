import {
  ExpressiveCanonCapabilityMapSchema,
  type ExpressiveCanonCapabilityMap,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';

const STYLE_INSTRUCTION_LIMIT = 1_200;
const DEFAULT_TTS_VOICE = 'fr-FR-HenriNeural';
const MAX_AUDIO_BYTES = 2 * 1024 * 1024;
const TTS_TIMEOUT_MS = 15_000;
const TTS_RATE_LIMIT_PER_MINUTE = 10;

interface StyleMirrorCounts {
  total_profiles: number;
  active_profiles: number;
  injectable_profiles: number;
  pending_consent_profiles: number;
  revoked_profiles: number;
}

function countStyleMirrorProfiles(): StyleMirrorCounts {
  const row = getDb().prepare(`
    SELECT
      COUNT(*) AS total_profiles,
      SUM(CASE WHEN profile_status = 'active' THEN 1 ELSE 0 END) AS active_profiles,
      SUM(CASE
        WHEN profile_status = 'active'
         AND consent_status = 'granted'
         AND validated_at IS NOT NULL
        THEN 1 ELSE 0
      END) AS injectable_profiles,
      SUM(CASE WHEN consent_status = 'pending' THEN 1 ELSE 0 END) AS pending_consent_profiles,
      SUM(CASE WHEN consent_status = 'revoked' THEN 1 ELSE 0 END) AS revoked_profiles
    FROM style_mirror_profiles
  `).get() as Partial<StyleMirrorCounts> | undefined;

  return {
    total_profiles: Number(row?.total_profiles ?? 0),
    active_profiles: Number(row?.active_profiles ?? 0),
    injectable_profiles: Number(row?.injectable_profiles ?? 0),
    pending_consent_profiles: Number(row?.pending_consent_profiles ?? 0),
    revoked_profiles: Number(row?.revoked_profiles ?? 0),
  };
}

/** Carte Expressive Canon : lecture seule, aucun provider voix et aucune activation de profil. */
export function buildExpressiveCanonCapabilityMap(
  actor: AuthUser,
  now = Date.now(),
): ExpressiveCanonCapabilityMap {
  const counts = countStyleMirrorProfiles();

  return ExpressiveCanonCapabilityMapSchema.parse({
    generated_at: now,
    actor_scope_ref: `owner:${actor.id}`,
    style_mirror: {
      table: 'style_mirror_profiles',
      ...counts,
      instruction_limit_chars: STYLE_INSTRUCTION_LIMIT,
      endpoint_refs: [
        '/api/v1/style-mirror/profiles/:userId',
        '/api/v1/style-mirror/profiles',
        '/api/v1/style-mirror/profiles/:id/status',
      ],
    },
    primitives: [
      {
        primitive_id: 'style_mirror_profiles_existing_runtime',
        label: 'Style Mirror existant comme base Expressive Canon',
        status: 'implemented',
        area: 'style_mirror',
        endpoint_refs: [
          '/api/v1/style-mirror/profiles/:userId',
          '/api/v1/style-mirror/profiles',
          '/api/v1/style-mirror/profiles/:id/status',
        ],
        gate: 'Table existante conservée ; aucune table behavior_profiles concurrente.',
        gap: null,
      },
      {
        primitive_id: 'subject_consent_state_machine',
        label: 'Consentement sujet avant activation',
        status: 'implemented',
        area: 'consent',
        endpoint_refs: ['/api/v1/style-mirror/profiles/:id/status'],
        gate: 'Seul le sujet stylisé peut activer son profil ; révocation par archivage sujet.',
        gap: 'Le wording UI et les cartes de validation fine restent à construire hors de cette vague système.',
      },
      {
        primitive_id: 'bounded_prompt_steering',
        label: 'Injection style prompt-only bornée',
        status: 'implemented',
        area: 'prompt_steering',
        endpoint_refs: ['ws://localhost:8000/ws/{room_instance_id}?token=<JWT>'],
        gate: 'Profil actif + consentement granted + validated_at requis ; bloc expressif borné à 1200 caractères.',
        gap: null,
      },
      {
        primitive_id: 'websocket_expressive_voice_metadata',
        label: 'Métadonnée WebSocket Voix stylisée',
        status: 'implemented',
        area: 'ui_metadata',
        endpoint_refs: ['ws://localhost:8000/ws/{room_instance_id}?token=<JWT>'],
        gate: 'Le label reste une métadonnée, pas une phrase répétée dans les réponses.',
        gap: 'L’affichage final UI reste dans le chantier prototype séparé.',
      },
      {
        primitive_id: 'persona_tts_controlled_runtime',
        label: 'TTS persona contrôlé mais provider live non déclenché ici',
        status: 'partial',
        area: 'voice_tts',
        endpoint_refs: ['/api/v1/tts'],
        gate: 'Route authentifiée, quota, timeout, taille audio, persona attendu ; cette carte ne lance jamais EdgeTTS.',
        gap: 'Whitelist multi-voix, consentement voix explicite, suivi coût et mode classe restent à cadrer avant activation large.',
      },
      {
        primitive_id: 'decoding_time_style_control',
        label: 'Contrôle logits / sampling custom',
        status: 'blocked',
        area: 'provider',
        endpoint_refs: [],
        gate: 'Provider OpenAI-compatible actuel : prompt-only en P1.',
        gap: 'Reporter en P3 si un provider expose logits ou sampling contrôlé.',
      },
    ],
    consent_policy: {
      profile_owner_is_stylized_subject: true,
      teacher_can_only_propose_student_profile: true,
      subject_activation_required: true,
      revocation_cuts_next_injection: true,
      admin_cannot_bypass_consent: true,
    },
    prompt_policy: {
      provider_agnostic_prompt_only: true,
      no_logits_or_sampling_control: true,
      no_raw_private_sample_text: true,
      style_never_changes_permissions_facts_sources_or_method: true,
      single_signature_move_maximum: true,
      persona_canon_remains_primary_voice: true,
    },
    tts_policy: {
      provider_call_allowed_by_this_map: false,
      default_voice_whitelisted: DEFAULT_TTS_VOICE,
      max_audio_bytes: MAX_AUDIO_BYTES,
      timeout_ms: TTS_TIMEOUT_MS,
      rate_limit_per_minute: TTS_RATE_LIMIT_PER_MINUTE,
      text_length_bound_by_request_schema: true,
    },
    forbidden_shortcuts: [
      'behavior_profiles_parallel_table',
      'admin_force_activate_style_profile',
      'teacher_activate_student_profile',
      'raw_private_sample_in_prompt',
      'style_changes_permission_or_truth',
      'tts_provider_call_from_diagnostic_map',
      'voice_clone_without_explicit_consent',
      'logits_control_without_provider_support',
    ],
    execution_policy: 'diagnostic_only',
  });
}
