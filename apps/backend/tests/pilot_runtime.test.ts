import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildPilotHarvest, getPilotJourneyState} from '../src/services/pilot_runtime.ts';
import {createRoomCheckpoint} from '../src/services/room_checkpoints.ts';
import {intakeSource} from '../src/services/source_intake.ts';

const teacher: AuthUser = {id: 'pilot-teacher', username: 'pilot_teacher', role: 'teacher'};
const student: AuthUser = {id: 'pilot-student', username: 'pilot_student', role: 'student'};
const studentPeer: AuthUser = {id: 'pilot-member-b', username: 'pilot_member_b', role: 'student'};
const operator: AuthUser = {id: 'pilot-operator', username: 'pilot_operator', role: 'godmode'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insertUser.run(student.id, student.username, student.username, student.role, now, now);
  insertUser.run(studentPeer.id, studentPeer.username, studentPeer.username, studentPeer.role, now, now);
  insertUser.run(operator.id, operator.username, operator.username, operator.role, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO projects
       (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('pilot-runtime-project', ?, 'Pilot runtime', 'active', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
     VALUES ('pilot-runtime-project', ?, 'owner', ?),
            ('pilot-runtime-project', ?, 'participant', ?),
            ('pilot-runtime-project', ?, 'participant', ?)`,
  ).run(teacher.id, now, student.id, now, studentPeer.id, now);
  db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES ('pilot-runtime-room', 'Ours pilot runtime', 'workspace', ?,
             'pilot-runtime-project', ?, 0, ?, ?)`,
  ).run(
    teacher.id,
    JSON.stringify({runtime_pack_ids: ['ours-dor-pilot-v1']}),
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES ('pilot-talents-room', 'Talents pilot runtime', 'workspace', ?,
             'pilot-runtime-project', ?, 0, ?, ?)`,
  ).run(
    teacher.id,
    JSON.stringify({runtime_pack_ids: ['talents-creatifs-pilot-v1']}),
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES ('pilot-runtime-student-instance', 'pilot-runtime-room', ?, 'workspace',
             'workspace', 'medium', NULL, ?, ?)`,
  ).run(student.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES ('pilot-talents-student-instance', 'pilot-talents-room', ?, 'workspace',
             'workspace', 'medium', NULL, ?, ?)`,
  ).run(student.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES ('pilot-talents-peer-instance', 'pilot-talents-room', ?, 'workspace',
             'workspace', 'medium', NULL, ?, ?)`,
  ).run(studentPeer.id, now, now);
  intakeSource(operator, {
    runtime_pack_id: 'ours-dor-pilot-v1',
    project_id: 'pilot-runtime-project',
    source_ref: 'ours-dor:student:brief-runtime',
    label: 'Brief visible participant',
    source_role: 'student',
    content_sha256: 'c'.repeat(64),
    provenance: 'copie de travail test',
    rights: 'authorized',
    mode: 'register_candidate',
  });
  intakeSource(teacher, {
    runtime_pack_id: 'talents-creatifs-pilot-v1',
    project_id: 'pilot-runtime-project',
    source_ref: 'talents-creatifs:shared:parcours-runtime',
    label: 'Parcours visible du pilote',
    source_role: 'shared',
    content_sha256: 'd'.repeat(64),
    provenance: 'présentation test',
    rights: 'authorized',
    mode: 'register_candidate',
  });
  intakeSource(operator, {
    runtime_pack_id: 'talents-creatifs-pilot-v1',
    project_id: 'pilot-runtime-project',
    source_ref: 'talents-creatifs:team:contacts-runtime',
    label: 'Contacts internes équipe',
    source_role: 'team',
    content_sha256: 'e'.repeat(64),
    provenance: 'source équipe test',
    rights: 'authorized',
    mode: 'register_candidate',
  });
  createRoomCheckpoint(student, 'pilot-runtime-student-instance', {
    reason: 'pedagogical_progress',
    summary: 'Brief relu, première piste cadrée.',
    active_widgets: ['conversation_shell'],
    active_mode: 'project',
    decisions: [],
    open_loops: ['Choisir une piste.'],
    media_queue_refs: [],
    asset_queue_refs: [],
    resource_refs: ['ours-dor:student:brief-runtime'],
    next_recommended_action: 'Formuler deux hypothèses puis choisir avec le professeur.',
    rollback_light_possible: true,
  });
  createRoomCheckpoint(student, 'pilot-talents-student-instance', {
    reason: 'pedagogical_progress',
    summary: 'Brief choisi, idée à verrouiller.',
    active_widgets: ['conversation_shell', 'pilot-stage:idea_lock'],
    active_mode: 'project',
    decisions: ['Brief candidat retenu.'],
    open_loops: ['Tester la pertinence de l’idée.'],
    media_queue_refs: [],
    asset_queue_refs: [],
    resource_refs: ['talents-creatifs:shared:parcours-runtime'],
    next_recommended_action: 'Formuler l’idée directrice et une objection sérieuse.',
    rollback_light_possible: true,
  });
});

describe('Runtime commun des pilotes', () => {
  it('projette projet, participant, checkpoint et sources visibles', () => {
    const state = getPilotJourneyState(
      student,
      'ours-dor-pilot-v1',
      'pilot-runtime-student-instance',
    );
    expect(state).toMatchObject({
      pilot_id: 'ours-dor',
      project: {project_id: 'pilot-runtime-project'},
      participant_count: 3,
      collaboration: null,
      current_stage: {stage_id: 'registration_and_zone'},
      checkpoint: {summary: 'Brief relu, première piste cadrée.'},
      validations_pending: null,
      next_action: 'Formuler deux hypothèses puis choisir avec le professeur.',
    });
    expect(state.visible_sources.map((source) => source.source_ref)).toEqual([
      'ours-dor:student:brief-runtime',
    ]);
    expect(state.journey.stage_count).toBe(7);
    expect(state.journey.stages.map((stage) => stage.stage_id)).toEqual([
      'registration_and_zone',
      'articulate_monster_idea',
      'test_readability_impact',
      'technical_feasibility',
      'submission_readiness',
      'projection_readiness',
      'verdict_debrief',
    ]);
    expect(state.journey.responsibilities).toEqual(expect.arrayContaining([
      expect.objectContaining({label: 'MasterFlex', permission_effect: 'none'}),
      expect.objectContaining({label: 'Incubator', permission_effect: 'none'}),
    ]));
    expect(state.journey.excluded_capabilities).toContain('vote_public_live');
    expect(JSON.stringify(state)).not.toContain('/Users/');
  });

  it('projette les six jalons Talents sans exposer la source team à l’étudiant', () => {
    const state = getPilotJourneyState(
      student,
      'talents-creatifs-pilot-v1',
      'pilot-talents-student-instance',
    );
    expect(state.current_stage).toEqual({stage_id: 'idea_lock', label: 'Idea Lock'});
    expect(state.participant_count).toBe(3);
    expect(state.collaboration).toEqual({
      account_model: 'individual_accounts',
      workspace_model: 'shared_project',
      group_project_id: 'pilot-runtime-project',
      current_membership: {user_id: student.id, role: 'participant'},
    });
    expect(state.journey.current_position).toBe(4);
    expect(state.journey.stage_count).toBe(6);
    expect(state.journey.stages.map((stage) => stage.stage_id)).toEqual([
      'brief_radar',
      'team_build',
      'brief_lock',
      'idea_lock',
      'production_run',
      'proof_drop',
    ]);
    expect(state.journey.group_policy).toEqual({
      default_min: 3,
      default_max: 5,
      exceptions: 'brief_defined',
    });
    expect(state.journey.responsibilities).toHaveLength(5);
    expect(state.journey.responsibilities.every((role) => role.permission_effect === 'none')).toBe(true);
    expect(state.visible_sources.map((source) => source.source_ref)).toEqual([
      'talents-creatifs:shared:parcours-runtime',
    ]);
    expect(JSON.stringify(state)).not.toContain('contacts-runtime');
  });

  it('partage le projet Talents sans permettre à un membre de prendre l’identité de l’autre', () => {
    const studentState = getPilotJourneyState(
      student,
      'talents-creatifs-pilot-v1',
      'pilot-talents-student-instance',
    );
    const peerState = getPilotJourneyState(
      studentPeer,
      'talents-creatifs-pilot-v1',
      'pilot-talents-peer-instance',
    );

    expect(studentState.collaboration?.group_project_id).toBe(peerState.collaboration?.group_project_id);
    expect(studentState.collaboration?.current_membership.user_id).toBe(student.id);
    expect(peerState.collaboration?.current_membership.user_id).toBe(studentPeer.id);
    expect(JSON.stringify(studentState.collaboration)).not.toContain(studentPeer.id);
    expect(JSON.stringify(peerState.collaboration)).not.toContain(student.id);
    expect(() => getPilotJourneyState(
      student,
      'talents-creatifs-pilot-v1',
      'pilot-talents-peer-instance',
    )).toThrow('room_instance_not_found');
    expect(() => getPilotJourneyState(
      studentPeer,
      'talents-creatifs-pilot-v1',
      'pilot-talents-student-instance',
    )).toThrow('room_instance_not_found');
  });

  it('produit un harvest hashable qui reste candidat humain', () => {
    const state = getPilotJourneyState(
      student,
      'ours-dor-pilot-v1',
      'pilot-runtime-student-instance',
    );
    const harvest = buildPilotHarvest(state);
    expect(harvest.snapshot_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(harvest.source_refs).toEqual(['ours-dor:student:brief-runtime']);
    expect(harvest.backflow_candidate).toMatchObject({
      status: 'candidate',
      requires_human_review: true,
    });
  });

  it('ne permet pas de projeter le pack Talents dans la Room Ours', () => {
    expect(() => getPilotJourneyState(
      student,
      'talents-creatifs-pilot-v1',
      'pilot-runtime-student-instance',
    )).toThrow('runtime_pack_not_allowed_in_room');
  });
});
