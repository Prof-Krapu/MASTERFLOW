import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {buildPilotHarvest, getPilotJourneyState} from '../src/services/pilot_runtime.ts';
import {createRoomCheckpoint} from '../src/services/room_checkpoints.ts';
import {intakeSource} from '../src/services/source_intake.ts';

const teacher: AuthUser = {id: 'pilot-teacher', username: 'pilot_teacher', role: 'teacher'};
const student: AuthUser = {id: 'pilot-student', username: 'pilot_student', role: 'student'};

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
  db.prepare(
    `INSERT OR IGNORE INTO projects
       (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('pilot-runtime-project', ?, 'Pilot runtime', 'active', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
     VALUES ('pilot-runtime-project', ?, 'owner', ?),
            ('pilot-runtime-project', ?, 'participant', ?)`,
  ).run(teacher.id, now, student.id, now);
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
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density,
        widget_state_json, created_at, updated_at)
     VALUES ('pilot-runtime-student-instance', 'pilot-runtime-room', ?, 'workspace',
             'workspace', 'medium', NULL, ?, ?)`,
  ).run(student.id, now, now);
  intakeSource(teacher, {
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
      participant_count: 2,
      checkpoint: {summary: 'Brief relu, première piste cadrée.'},
      validations_pending: null,
      next_action: 'Formuler deux hypothèses puis choisir avec le professeur.',
    });
    expect(state.visible_sources.map((source) => source.source_ref)).toEqual([
      'ours-dor:student:brief-runtime',
    ]);
    expect(JSON.stringify(state)).not.toContain('deadline');
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
