import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {scanForMissedTriggers} from '../src/services/d12_auto_detector.ts';
import {listD12MissedTriggerFindings} from '../src/services/d12_findings.ts';
import {recordWorkflowEvent} from '../src/services/workflow_observability.ts';

const actor: AuthUser = {id: 'd12-auto-admin', username: 'd12_auto_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(actor.id, actor.username, actor.username, actor.role, now, now);
});

describe('D12 auto-detector', () => {
  it('scan ne crée pas de findings sans événements bloquants', () => {
    const result = scanForMissedTriggers(actor, 60_000);
    expect(result.scanned_events).toBe(0);
    expect(result.findings_created).toBe(0);
    expect(result.finding_ids).toEqual([]);
  });

  it('détecte un échec workflow et crée une finding observation-only', () => {
    recordWorkflowEvent({
      event_id: 'auto-detect-fail-1',
      workflow_id: 'wd-1',
      event_type: 'workflow_failed',
      workflow_type: 'correction_pipeline',
      capability_id: 'feedback_draft',
      owner_id: actor.id,
      project_id: null,
      room_id: null,
      duration_ms: null,
      cost_eur: null,
      tokens: null,
      status: 'failed',
      blocker_category: 'model_error',
      created_at: Date.now() - 10_000,
    });
    recordWorkflowEvent({
      event_id: 'auto-detect-fail-2',
      workflow_id: 'wd-2',
      event_type: 'workflow_blocked',
      workflow_type: 'intake_pipeline',
      capability_id: 'document_intake',
      owner_id: actor.id,
      project_id: null,
      room_id: null,
      duration_ms: null,
      cost_eur: null,
      tokens: null,
      status: 'blocked',
      blocker_category: 'resource_missing',
      created_at: Date.now() - 5_000,
    });

    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    const result = scanForMissedTriggers(actor, 120_000);
    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };

    expect(result.scanned_events).toBe(2);
    expect(result.findings_created).toBe(2);
    expect(result.finding_ids).toHaveLength(2);

    const findings = listD12MissedTriggerFindings();
    const autoFindings = findings.filter(
      (f) => f.source_ref === 'workflow_event:auto-detect-fail-1'
        || f.source_ref === 'workflow_event:auto-detect-fail-2',
    );
    expect(autoFindings).toHaveLength(2);
    for (const f of autoFindings) {
      expect(f.status).toBe('observation');
      expect(f.blocked_actions).toEqual(expect.arrayContaining(['auto_patch', 'auto_canon']));
    }

    expect(after).toEqual(before);
  });

  it('déduplique : ne crée pas de deuxième finding pour le même événement', () => {
    const before = listD12MissedTriggerFindings().length;
    const result = scanForMissedTriggers(actor, 120_000);
    const after = listD12MissedTriggerFindings().length;

    expect(result.findings_created).toBe(0);
    expect(after).toBe(before);
  });

  it('ignore les événements non bloquants (workflow_started, workflow_completed)', () => {
    recordWorkflowEvent({
      event_id: 'auto-detect-ok-1',
      workflow_id: 'wd-3',
      event_type: 'workflow_started',
      workflow_type: 'test',
      capability_id: 'unit_test',
      owner_id: actor.id,
      project_id: null,
      room_id: null,
      duration_ms: null,
      cost_eur: null,
      tokens: null,
      status: 'started',
      blocker_category: null,
      created_at: Date.now(),
    });
    recordWorkflowEvent({
      event_id: 'auto-detect-ok-2',
      workflow_id: 'wd-3',
      event_type: 'workflow_completed',
      workflow_type: 'test',
      capability_id: 'unit_test',
      owner_id: actor.id,
      project_id: null,
      room_id: null,
      duration_ms: 1000,
      cost_eur: null,
      tokens: null,
      status: 'completed',
      blocker_category: null,
      created_at: Date.now(),
    });

    const before = listD12MissedTriggerFindings().length;
    const result = scanForMissedTriggers(actor, 60_000);
    expect(result.findings_created).toBe(0);
    expect(listD12MissedTriggerFindings().length).toBe(before);
  });
});
