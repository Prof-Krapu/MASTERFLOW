import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildSecurityTrustCapabilityMap} from '../src/services/security_trust_capability_map.ts';

const admin: AuthUser = {id: 'security-map-admin', username: 'security_map_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(admin.id, admin.username, admin.username, admin.role, now, now);
});

describe('security_trust_capability_map', () => {
  it('relie trust, safety et garde déterministe sans sanction automatique', () => {
    const map = buildSecurityTrustCapabilityMap(admin, 'security-room');

    expect(map.execution_policy).toBe('diagnostic_only');
    expect(map.actor_scope_ref).toBe('room:security-room');
    expect(map.trust_snapshot.invariants).toMatchObject({
      affects_permissions: false,
      automatic_sanction: false,
      composite_score: false,
      raw_payload_exposed: false,
    });
    expect(map.safety_state).toMatchObject({
      class_projection_anonymous: true,
      affects_permissions: false,
      automatic_sanction: false,
    });
    expect(map.response_policy).toMatchObject({
      curiosity_allowed: true,
      educational_explanation_allowed: true,
      suspicious_inputs_warn_or_refuse: true,
      hard_stop_requires_existing_gate: true,
      ban_is_manual_godmode_only: true,
    });
    expect(map.primitives).toContainEqual(expect.objectContaining({
      primitive_id: 'security_guard_input_classifier',
      status: 'implemented',
    }));
  });
});
