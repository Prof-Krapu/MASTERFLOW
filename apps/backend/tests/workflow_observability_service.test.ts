import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {
  getWorkflowDiagnostics,
  getWorkflowTrace,
  recordWorkflowEvent,
} from '../src/services/workflow_observability.ts';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES ('workflow-owner', 'workflow_owner', 'workflow_owner', 'x', 'teacher', 1, ?, ?)`,
    )
    .run(now, now);
});

function event(overrides: Partial<Parameters<typeof recordWorkflowEvent>[0]> = {}) {
  const createdAt = overrides.created_at ?? 1000;
  return recordWorkflowEvent({
    event_id: `workflow-event-${createdAt}-${overrides.event_type ?? 'workflow_started'}`,
    workflow_id: 'workflow-observability-main',
    event_type: 'workflow_started',
    workflow_type: 'cdc_intake',
    capability_id: 'moth_cdc',
    owner_id: 'workflow-owner',
    project_id: 'project-observability',
    room_id: null,
    duration_ms: null,
    cost_eur: null,
    tokens: null,
    status: 'started',
    blocker_category: null,
    created_at: createdAt,
    ...overrides,
  });
}

describe('PR-9 — service workflow observability', () => {
  it('enregistre une trace workflow et agrège latence, coût nullable et friction', () => {
    event({event_id: 'wf-main-start', created_at: 10_000});
    event({
      event_id: 'wf-main-step',
      event_type: 'workflow_step_completed',
      duration_ms: 120,
      cost_eur: 0.02,
      tokens: 100,
      status: 'running',
      created_at: 10_120,
    });
    event({
      event_id: 'wf-main-blocked',
      event_type: 'workflow_blocked',
      status: 'blocked',
      blocker_category: 'missing_resource',
      created_at: 10_200,
    });
    event({
      event_id: 'wf-main-completed',
      event_type: 'workflow_completed',
      duration_ms: 500,
      cost_eur: 0.03,
      tokens: 150,
      status: 'completed',
      created_at: 10_500,
    });
    event({
      event_id: 'wf-other-failed',
      workflow_id: 'workflow-observability-other',
      event_type: 'workflow_failed',
      workflow_type: 'export_pipeline',
      capability_id: 'export_prepare',
      duration_ms: 900,
      cost_eur: null,
      tokens: null,
      status: 'failed',
      blocker_category: 'runner_timeout',
      created_at: 11_000,
    });

    const trace = getWorkflowTrace('workflow-observability-main');
    expect(trace.map((item) => item.event_id)).toEqual([
      'wf-main-start',
      'wf-main-step',
      'wf-main-blocked',
      'wf-main-completed',
    ]);

    const diagnostics = getWorkflowDiagnostics({from: 9000, to: 12_000});
    expect(diagnostics.totals.workflows).toBe(2);
    expect(diagnostics.totals.completed).toBe(1);
    expect(diagnostics.totals.failed).toBe(1);
    expect(diagnostics.totals.blocked).toBe(1);
    expect(diagnostics.totals.duration_p50_ms).toBe(500);
    expect(diagnostics.totals.duration_p95_ms).toBe(900);
    expect(diagnostics.totals.cost_eur).toBeCloseTo(0.05, 6);
    expect(diagnostics.totals.tokens).toBe(250);
    expect(diagnostics.friction).toContainEqual({
      blocker_category: 'missing_resource',
      events: 1,
    });
  });

  it('filtre par capability et refuse les libellés secrets', () => {
    const diagnostics = getWorkflowDiagnostics({
      from: 9000,
      to: 12_000,
      capabilityId: 'moth_cdc',
    });

    expect(diagnostics.totals.workflows).toBe(1);
    expect(diagnostics.by_capability).toHaveLength(1);
    expect(diagnostics.by_capability[0]?.key).toBe('moth_cdc');

    expect(() =>
      event({
        event_id: 'wf-secret',
        workflow_id: 'workflow-secret',
        capability_id: 'api_key_leak',
        created_at: 12_500,
      }),
    ).toThrow('workflow_event_contains_secret');
  });

  it('expose une table sans contenu personnel brut', () => {
    const columns = getDb()
      .prepare("PRAGMA table_info('workflow_events')")
      .all() as Array<{name: string}>;
    expect(columns.map((column) => column.name)).not.toContain('payload_json');
    expect(columns.map((column) => column.name)).not.toContain('message');
    expect(columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(['workflow_id', 'capability_id', 'duration_ms', 'cost_eur']),
    );
  });
});
