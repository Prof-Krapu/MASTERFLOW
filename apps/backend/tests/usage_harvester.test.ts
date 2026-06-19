import {beforeAll, describe, expect, it} from 'vitest';

import type {WorkflowEvent} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  getUsageLearningCandidate,
  listUsageLearningCandidates,
  resolveGodModeTargets,
} from '../src/services/usage_harvester.ts';
import {
  decideValidationInboxItem,
  listValidationInboxItems,
} from '../src/services/validation_inbox.ts';
import {recordWorkflowEvent} from '../src/services/workflow_observability.ts';

const teacher: AuthUser = {id: 'usage-harvester-teacher', username: 'usage_harvester_teacher', role: 'teacher'};
const admin: AuthUser = {id: 'usage-harvester-admin', username: 'usage_harvester_admin', role: 'admin'};
const projectId = 'usage-harvester-project';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  for (const user of [teacher, admin]) {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO users
           (id, username, display_name, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
      )
      .run(user.id, user.username, user.username, user.role, now, now);
  }
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO projects
         (id, owner_id, name, status, visibility, created_at, updated_at)
       VALUES (?, ?, 'Usage Harvester', 'active', 'private', ?, ?)`,
    )
    .run(projectId, teacher.id, now, now);
});

function workflowEvent(overrides: Partial<WorkflowEvent> = {}): WorkflowEvent {
  const eventId = overrides.event_id ?? `usage-event-${Date.now()}`;
  return {
    event_id: eventId,
    workflow_id: 'usage-workflow-correction',
    event_type: 'workflow_failed',
    workflow_type: 'correction_pipeline',
    capability_id: 'feedback_draft',
    owner_id: teacher.id,
    project_id: projectId,
    room_id: null,
    duration_ms: null,
    cost_eur: null,
    tokens: null,
    status: 'failed',
    blocker_category: 'teacher_rework',
    created_at: Date.now(),
    ...overrides,
  };
}

describe('D11/D12 — Usage Harvester natif V1', () => {
  it('ignore les événements neutres et extrait automatiquement un échec sans contenu brut', () => {
    recordWorkflowEvent(workflowEvent({
      event_id: 'usage-event-started',
      event_type: 'workflow_started',
      status: 'started',
    }));
    expect(listUsageLearningCandidates()).toHaveLength(0);

    recordWorkflowEvent(workflowEvent({event_id: 'usage-event-failed-1', created_at: 10_000}));
    const candidates = listUsageLearningCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      signal_type: 'failure_or_rework',
      source_environment: 'masterflow_native',
      privacy: 'do_not_export',
      canon_status: 'candidate_only',
      review_status: 'pending',
      routing_status: 'routed',
      repetition_count: 1,
      confidence: 'low',
      status: 'observation',
    });
    expect(candidates[0]?.domain_refs).toContain('D06_CORRECTION_FEEDBACK_EVALUATION');
    expect(candidates[0]?.godmode_targets).toEqual(
      expect.arrayContaining(['CORRECTOR_RUNTIME', 'PEDAGOGY_ENGINE', 'PERMISSION_ENGINE']),
    );
    expect(candidates[0]?.evidence_refs).toEqual(['workflow_event:usage-event-failed-1']);

    const columns = getDb()
      .prepare("PRAGMA table_info('usage_learning_candidates')")
      .all() as Array<{name: string}>;
    expect(columns.map((column) => column.name)).not.toEqual(
      expect.arrayContaining(['raw_conversation', 'payload_json', 'message']),
    );
  });

  it('déduplique une vérité candidate et augmente répétition, confiance et qualification', () => {
    recordWorkflowEvent(workflowEvent({event_id: 'usage-event-failed-2', created_at: 20_000}));
    const candidates = listUsageLearningCandidates();
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      repetition_count: 2,
      confidence: 'medium',
      status: 'hypothesis',
    });
    expect(candidates[0]?.evidence_refs).toEqual([
      'workflow_event:usage-event-failed-1',
      'workflow_event:usage-event-failed-2',
    ]);
  });

  it('route un cas inconnu vers D12 en arbitrage sans inventer un owner utilisateur', () => {
    expect(resolveGodModeTargets({
      affectedProcess: 'unknown_process',
      affectedOutputFamily: 'unknown_output',
    })).toEqual({
      domainRefs: ['D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT'],
      godmodeTargets: ['AUTONOMY_STEP1', 'OBSERVABILITY'],
      routingStatus: 'ambiguous',
    });
  });

  it('projette une seule candidate privée dans l’inbox et décide sans effet externe', () => {
    expect(listValidationInboxItems(teacher).some(
      (item) => item.source_kind === 'usage_learning_candidate',
    )).toBe(false);

    const item = listValidationInboxItems(admin).find(
      (entry) => entry.source_kind === 'usage_learning_candidate',
    );
    expect(item).toMatchObject({
      item_type: 'autonomy_proposal',
      privacy_scope: 'admin_only',
      current_status: 'needs_review',
      proposed_action: 'review_usage_learning_candidate',
      output_readiness_state: 'blocked',
    });
    expect(item?.blocked_actions).toEqual(
      expect.arrayContaining(['auto_process_update', 'auto_canon', 'external_send']),
    );
    if (!item) throw new Error('candidate Usage Harvester absente de la Validation Inbox');

    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    const decided = decideValidationInboxItem(admin, item.item_id, {
      decision: 'approve',
      note: 'Règle candidate confirmée pour test',
    });
    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    const candidate = getUsageLearningCandidate(item.source_id);

    expect(decided.current_status).toBe('approved');
    expect(candidate).toMatchObject({
      review_status: 'approved',
      status: 'user_confirmed_rule',
      reviewer_id: admin.id,
      canon_status: 'candidate_only',
    });
    expect(after).toEqual(before);
    expect(listValidationInboxItems(admin).some((entry) => entry.source_id === item.source_id)).toBe(false);
  });

  it('migre le source_kind de l’inbox sans queue parallèle', () => {
    const table = getDb()
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='validation_inbox_items'")
      .get() as {sql: string};
    expect(table.sql).toContain('usage_learning_candidate');
  });
});
