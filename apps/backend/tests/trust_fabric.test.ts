import {beforeAll, describe, expect, it} from 'vitest';

import {TrustFabricSnapshotSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {audit} from '../src/lib/audit.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {getTrustFabricSnapshot} from '../src/services/trust_fabric.ts';

const admin: AuthUser = {
  id: 'trust-fabric-admin',
  username: 'trust_fabric_admin',
  role: 'admin',
};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, 'Trust Fabric Admin', 'x', 'admin', 1, ?, ?)`,
    )
    .run(admin.id, admin.username, now, now);
});

describe('Trust Fabric — read model sans persistance', () => {
  it('sépare les quatre dimensions sans score composite', () => {
    const snapshot = getTrustFabricSnapshot(admin, Date.now());
    expect(TrustFabricSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(snapshot.artifact_integrity.state).toBe('unknown');
    expect(snapshot.user_risk_signal.state).toBe('clear');
    expect(snapshot.invariants).toEqual({
      composite_score: false,
      affects_permissions: false,
      automatic_sanction: false,
      raw_payload_exposed: false,
    });
    expect(JSON.stringify(snapshot)).not.toContain('password');
    expect(JSON.stringify(snapshot)).not.toContain('api_key');
  });

  it('projette des signaux sécurité contextuels, expirables et sans payload brut', () => {
    for (let index = 0; index < 3; index += 1) {
      audit({
        event_type: 'security.input_refused',
        user_id: admin.id,
        scope: admin.id,
        detail: {
          audit_code: 'security_prompt_override',
          private_payload: undefined,
        },
      });
    }

    const snapshot = getTrustFabricSnapshot(admin, Date.now());
    expect(snapshot.user_risk_signal).toMatchObject({
      state: 'step_up',
      event_count: 3,
      reversible: true,
      reason_codes: ['security_prompt_override'],
    });
    expect(snapshot.user_risk_signal.expires_at).not.toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain('private_payload');
  });

  it('dégrade seulement la santé runtime lorsqu’un workflow échoue', () => {
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO workflow_events
           (id, workflow_id, event_type, workflow_type, capability_id, owner_id,
            project_id, room_id, duration_ms, cost_eur, tokens, status,
            blocker_category, created_at)
         VALUES (?, ?, 'workflow_failed', 'trust-test', 'trust-runtime', ?,
                 NULL, NULL, 10, 0, 5, 'failed', 'provider', ?)`,
      )
      .run('trust-workflow-failed', 'trust-workflow', admin.id, now);

    const snapshot = getTrustFabricSnapshot(admin, now);
    expect(snapshot.runtime_health.state).toBe('degraded');
    expect(snapshot.runtime_health.failed_or_blocked).toBeGreaterThanOrEqual(1);
    expect(snapshot.user_risk_signal.state).toBe('step_up');
    expect(snapshot.invariants.affects_permissions).toBe(false);
  });
});
