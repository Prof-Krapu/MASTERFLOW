import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildExpressiveCanonCapabilityMap} from '../src/services/expressive_canon_capability_map.ts';

const admin: AuthUser = {id: 'expressive-map-admin', username: 'expressive_map_admin', role: 'admin'};
const subject: AuthUser = {id: 'expressive-map-subject', username: 'expressive_map_subject', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  for (const user of [admin, subject]) {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
      )
      .run(user.id, user.username, user.username, user.role, now, now);
  }
  getDb().prepare('DELETE FROM style_mirror_profiles WHERE user_id = ?').run(subject.id);
  getDb()
    .prepare(
      `INSERT INTO style_mirror_profiles
       (id, user_id, owner_id, project_id, persona_id, register_target, energy_target,
        lexical_complexity, mirror_intensity, lexical_overrides_json, signature_moves_override_json,
        tone_rules_json, behavior_config_json, source_refs_json, profile_status, consent_status,
        consent_ref, consent_granted_at, consent_revoked_at, validated_by, validated_at,
        validation_version, visual_canon_ref, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, 'casual', 'medium', 'balanced', 0.5, '[]', '[]',
        '[]', '{}', '[]', 'active', 'granted', ?, ?, NULL, ?, ?, 'expressive_canon_p1',
        NULL, ?, ?)`,
    )
    .run(
      'expressive-map-profile-active',
      subject.id,
      subject.id,
      'masterflex-001',
      `subject:${subject.id}:style_mirror`,
      now,
      subject.id,
      now,
      now,
      now,
    );
  getDb()
    .prepare(
      `INSERT INTO style_mirror_profiles
       (id, user_id, owner_id, project_id, persona_id, register_target, energy_target,
        lexical_complexity, mirror_intensity, lexical_overrides_json, signature_moves_override_json,
        tone_rules_json, behavior_config_json, source_refs_json, profile_status, consent_status,
        created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, NULL, NULL, NULL, 0.5, '[]', '[]',
        '[]', '{}', '[]', 'draft', 'pending', ?, ?)`,
    )
    .run('expressive-map-profile-pending', subject.id, admin.id, now, now);
});

describe('expressive_canon_capability_map', () => {
  it('expose Style Mirror comme base Expressive Canon sans provider voix ni table concurrente', () => {
    const map = buildExpressiveCanonCapabilityMap(admin);

    expect(map.execution_policy).toBe('diagnostic_only');
    expect(map.style_mirror.table).toBe('style_mirror_profiles');
    expect(map.style_mirror.injectable_profiles).toBeGreaterThanOrEqual(1);
    expect(map.style_mirror.pending_consent_profiles).toBeGreaterThanOrEqual(1);
    expect(map.primitives).toContainEqual(expect.objectContaining({
      primitive_id: 'style_mirror_profiles_existing_runtime',
      status: 'implemented',
      gate: expect.stringContaining('aucune table behavior_profiles concurrente'),
    }));
    expect(map.primitives).toContainEqual(expect.objectContaining({
      primitive_id: 'persona_tts_controlled_runtime',
      status: 'partial',
      endpoint_refs: ['/api/v1/tts'],
    }));
    expect(map.consent_policy).toMatchObject({
      subject_activation_required: true,
      admin_cannot_bypass_consent: true,
      revocation_cuts_next_injection: true,
    });
    expect(map.prompt_policy).toMatchObject({
      provider_agnostic_prompt_only: true,
      no_raw_private_sample_text: true,
      style_never_changes_permissions_facts_sources_or_method: true,
      persona_canon_remains_primary_voice: true,
    });
    expect(map.tts_policy).toMatchObject({
      provider_call_allowed_by_this_map: false,
      default_voice_whitelisted: 'fr-FR-HenriNeural',
      rate_limit_per_minute: 10,
    });
    expect(map.forbidden_shortcuts).toEqual(expect.arrayContaining([
      'behavior_profiles_parallel_table',
      'admin_force_activate_style_profile',
      'tts_provider_call_from_diagnostic_map',
    ]));
  });
});
