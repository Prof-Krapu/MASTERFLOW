import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {orchestrateConversationTurn} from '../src/services/conversation_turn_orchestrator.ts';
import {scoreConversationEval} from '../src/services/conversation_turn_evals.ts';
import corpus from '../src/seeds/conversation_turn_eval_corpus.v1.json';
import type {ConversationTurnRoute, Role} from '@masterflow/shared';

const teacher: AuthUser = {id: 'conversation-teacher', username: 'conversation_teacher', role: 'teacher'};
const student: AuthUser = {id: 'conversation-student', username: 'conversation_student', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(teacher.id, teacher.username, 'Conversation Teacher', teacher.role, now, now);
  insertUser.run(student.id, student.username, 'Conversation Student', student.role, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO projects
       (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('conversation-project', ?, 'Conversation pilots', 'active', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
     VALUES ('conversation-project', ?, 'owner', ?),
            ('conversation-project', ?, 'participant', ?)`,
  ).run(teacher.id, now, student.id, now);

  const allowedActions = ['get_current_context', 'plan_conversation_turn', 'approve_validation_item'];
  const insertRoom = db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES (?, ?, 'workspace', ?, 'conversation-project', ?, 0, ?, ?)`,
  );
  insertRoom.run(
    'conversation-ours-room',
    "Ours d'Or pilot",
    teacher.id,
    JSON.stringify({
      runtime_pack_ids: ['ours-dor-pilot-v1'],
      allowed_action_ids: allowedActions,
      active_mode_cycle: ['project', 'learning', 'story'],
    }),
    now,
    now,
  );
  insertRoom.run(
    'conversation-talents-room',
    'Talents Créatifs pilot',
    teacher.id,
    JSON.stringify({
      runtime_pack_ids: ['talents-creatifs-pilot-v1'],
      allowed_action_ids: allowedActions,
      active_mode_cycle: ['project', 'learning', 'teaching'],
    }),
    now,
    now,
  );
  const insertInstance = db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES (?, ?, ?, 'workspace', 'workspace', 'medium', NULL, ?, ?)`,
  );
  insertInstance.run('conversation-ours-student', 'conversation-ours-room', student.id, now, now);
  insertInstance.run('conversation-ours-teacher', 'conversation-ours-room', teacher.id, now, now);
  insertInstance.run('conversation-talents-student', 'conversation-talents-room', student.id, now, now);
});

function planOurs(content: string, overrides: Record<string, unknown> = {}) {
  return orchestrateConversationTurn(student, {
    content,
    room_instance_id: 'conversation-ours-student',
    runtime_pack_id: 'ours-dor-pilot-v1',
    active_mode: 'project',
    ...overrides,
  });
}

describe('Conversation Turn Orchestrator', () => {
  it('répond simplement et conserve l’ordre de composition gouverné', () => {
    const plan = planOurs('Explique pourquoi un checkpoint est utile.');
    expect(plan.route).toBe('answer');
    expect(plan.response_policy).toBe('stream_llm');
    expect(plan.pilot_id).toBe('ours-dor');
    expect(plan.execution_budget).toMatchObject({
      max_turns_per_hour: 30,
      max_tool_calls: 0,
      max_output_tokens: 800,
      timeout_ms: 30_000,
      max_cost_eur: 0.2,
      fallback: 'static_guidance',
    });
    expect(plan.trace.map((step) => step.stage)).toEqual([
      'authentication_scope',
      'context_compiler',
      'runtime_pack',
      'process_activation',
      'soft_routing',
      'pedagogical_integrity',
      'permissions',
      'action_registry',
      'bounded_capability',
      'validation',
      'workflow_observability',
    ]);
  });

  it('demande une clarification plutôt que d’inventer le scope', () => {
    const plan = planOurs('Continue');
    expect(plan.route).toBe('clarify');
    expect(plan.clarification_question).toContain('étape');
    expect(plan.response_policy).toBe('static_guidance');
  });

  it('guide sans produire le livrable final étudiant', () => {
    const plan = planOurs('Rédige tout le livrable final prêt à rendre à ma place.');
    expect(plan.route).toBe('guide');
    expect(plan.assistance.assistance_kind).toBe('blocked_integrity');
    expect(plan.assistance.forbidden_outputs).toContain('ready_to_submit_deliverable');
    expect(plan.response_guidance).toContain('ne jamais produire le livrable final');
  });

  it('suspend une action sensible sans l’exécuter', () => {
    const plan = orchestrateConversationTurn(teacher, {
      content: 'Valide cette décision.',
      room_instance_id: 'conversation-ours-teacher',
      runtime_pack_id: 'ours-dor-pilot-v1',
      active_mode: 'project',
      requested_action_id: 'approve_validation_item',
    });
    expect(plan.route).toBe('await_approval');
    expect(plan.response_policy).toBe('hold_for_approval');
    expect(plan.action_candidate).toMatchObject({validation_required: true});
  });

  it('refuse une source Talents dans le pack Ours d’Or', () => {
    const plan = planOurs('Relis cette source.', {
      source_refs: ['talents-creatifs:student:brief-01'],
    });
    expect(plan.route).toBe('clarify');
    expect(plan.accepted_source_refs).toEqual([]);
    expect(plan.rejected_source_refs).toEqual([
      {
        source_ref: 'talents-creatifs:student:brief-01',
        reason: 'runtime_pack_source_namespace_mismatch',
      },
    ]);
  });

  it('refuse les sources équipe Talents à un étudiant', () => {
    const plan = orchestrateConversationTurn(student, {
      content: 'Relis la décision équipe.',
      room_instance_id: 'conversation-talents-student',
      runtime_pack_id: 'talents-creatifs-pilot-v1',
      active_mode: 'project',
      source_refs: ['talents-creatifs:team:decision-01'],
    });
    expect(plan.accepted_source_refs).toEqual([]);
    expect(plan.rejected_source_refs[0]?.reason).toBe('source_role_not_visible_to_actor');
  });

  it('interdit d’activer un autre pack dans la Room', () => {
    expect(() => orchestrateConversationTurn(student, {
      content: 'Explique la prochaine étape.',
      room_instance_id: 'conversation-ours-student',
      runtime_pack_id: 'talents-creatifs-pilot-v1',
      active_mode: 'project',
    })).toThrow('runtime_pack_not_allowed_in_room');
  });

  it.each(corpus.cases)(
    'rejoue le cas $case_id avec la route attendue',
    (evalCase) => {
      const actor = evalCase.actor === 'teacher' ? teacher : student;
      const roomInstanceId = evalCase.runtime_pack_id === 'talents-creatifs-pilot-v1'
        ? 'conversation-talents-student'
        : evalCase.actor === 'teacher'
          ? 'conversation-ours-teacher'
          : 'conversation-ours-student';
      const plan = orchestrateConversationTurn(actor as AuthUser & {role: Role}, {
        content: evalCase.content,
        room_instance_id: roomInstanceId,
        runtime_pack_id: evalCase.runtime_pack_id,
        active_mode: 'project',
        source_refs: evalCase.source_refs,
        requested_action_id: evalCase.requested_action_id,
      });
      expect(plan.route).toBe(evalCase.expected_route as ConversationTurnRoute);
      if (evalCase.expected_guard === 'cross_pack_source_rejected') {
        expect(plan.rejected_source_refs[0]?.reason).toBe('runtime_pack_source_namespace_mismatch');
      }
      if (evalCase.expected_guard === 'team_source_hidden_from_student') {
        expect(plan.rejected_source_refs[0]?.reason).toBe('source_role_not_visible_to_actor');
      }
      if (evalCase.expected_guard === 'student_deliverable_not_produced') {
        expect(plan.assistance.forbidden_outputs).toContain('ready_to_submit_deliverable');
      }
      if (evalCase.expected_guard === 'sensitive_action_suspended') {
        expect(plan.response_policy).toBe('hold_for_approval');
      }
    },
  );

  it('mesure le corpus sans erreur de route, suractivation ou fuite de scope', () => {
    const observations = corpus.cases.map((evalCase) => {
      const actor = evalCase.actor === 'teacher' ? teacher : student;
      const roomInstanceId = evalCase.runtime_pack_id === 'talents-creatifs-pilot-v1'
        ? 'conversation-talents-student'
        : evalCase.actor === 'teacher'
          ? 'conversation-ours-teacher'
          : 'conversation-ours-student';
      const plan = orchestrateConversationTurn(actor, {
        content: evalCase.content,
        room_instance_id: roomInstanceId,
        runtime_pack_id: evalCase.runtime_pack_id,
        active_mode: 'project',
        source_refs: evalCase.source_refs,
        requested_action_id: evalCase.requested_action_id,
      });
      return {
        case_id: evalCase.case_id,
        expected_route: evalCase.expected_route as ConversationTurnRoute,
        actual_route: plan.route,
        rejected_source_count: plan.rejected_source_refs.length,
        expected_source_rejection: [
          'cross_pack_source_rejected',
          'team_source_hidden_from_student',
        ].includes(evalCase.expected_guard),
      };
    });
    expect(scoreConversationEval(observations)).toMatchObject({
      total_cases: corpus.cases.length,
      route_error_rate: 0,
      overactivation_rate: 0,
      unnecessary_clarification_rate: 0,
      scope_leak_rate: 0,
    });
  });

  it('bloque fail-closed quand le plafond horaire de tours est atteint', () => {
    const db = getDb();
    const current = db.prepare(
      `SELECT COUNT(*) AS count FROM workflow_events
       WHERE owner_id = ? AND room_id = ? AND workflow_type = 'conversation_turn'
         AND event_type = 'workflow_started' AND created_at >= ?`,
    ).get(student.id, 'conversation-talents-room', Date.now() - 60 * 60 * 1_000) as {count: number};
    const insertedIds: string[] = [];
    const insert = db.prepare(
      `INSERT INTO workflow_events
         (id, workflow_id, event_type, workflow_type, capability_id, owner_id,
          project_id, room_id, duration_ms, cost_eur, tokens, status, blocker_category, created_at)
       VALUES (?, ?, 'workflow_started', 'conversation_turn', 'conversation_turn_orchestrator', ?,
               'conversation-project', 'conversation-talents-room', NULL, NULL, NULL, 'started', NULL, ?)`,
    );
    try {
      for (let index = current.count; index < 30; index += 1) {
        const id = `turn-limit-fixture-${index}`;
        insertedIds.push(id);
        insert.run(id, id, student.id, Date.now());
      }
      expect(() => orchestrateConversationTurn(student, {
        content: 'Explique la prochaine étape.',
        room_instance_id: 'conversation-talents-student',
        runtime_pack_id: 'talents-creatifs-pilot-v1',
        active_mode: 'project',
      })).toThrow('conversation_turn_hourly_limit_reached');
    } finally {
      const remove = db.prepare('DELETE FROM workflow_events WHERE id = ?');
      for (const id of insertedIds) remove.run(id);
    }
  });
});
