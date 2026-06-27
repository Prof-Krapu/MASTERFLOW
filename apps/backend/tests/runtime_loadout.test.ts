import {beforeAll, describe, expect, it} from 'vitest';

import {getDb, type RoomInstanceRow, type RoomRow} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {deriveUserRuntimeLoadout} from '../src/services/runtime_loadout.ts';

const student: AuthUser = {id: 'loadout-student', username: 'loadout_student', role: 'student'};
const admin: AuthUser = {id: 'loadout-admin', username: 'loadout_admin', role: 'admin'};
let room: RoomRow;
let studentInstance: RoomInstanceRow;
let adminInstance: RoomInstanceRow;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(student.id, student.username, student.username, student.role, now, now);
  insertUser.run(admin.id, admin.username, admin.username, admin.role, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
     VALUES ('loadout-room', 'Loadout', 'course', ?,
             '{"active_persona":"profkrapu-001","allowed_action_ids":["get_current_context","approve_validation_item","view_users","compile_da_context"],"default_action_ids":["get_current_context","view_users"],"active_mode_cycle":["course","review"]}',
             1, ?, ?)`,
  ).run(admin.id, now, now);
  const insertInstance = db.prepare(
    `INSERT OR IGNORE INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density, created_at, updated_at)
     VALUES (?, 'loadout-room', ?, 'workspace', 'course', 'medium', ?, ?)`,
  );
  insertInstance.run('loadout-student-instance', student.id, now, now);
  insertInstance.run('loadout-admin-instance', admin.id, now, now);
  room = db.prepare("SELECT * FROM rooms WHERE id = 'loadout-room'").get() as RoomRow;
  studentInstance = db
    .prepare("SELECT * FROM room_instances WHERE id = 'loadout-student-instance'")
    .get() as RoomInstanceRow;
  adminInstance = db
    .prepare("SELECT * FROM room_instances WHERE id = 'loadout-admin-instance'")
    .get() as RoomInstanceRow;
});

describe('user_runtime_loadout', () => {
  it('masque totalement les actions hors role pour un student', () => {
    const loadout = deriveUserRuntimeLoadout(student, room, studentInstance);
    expect(loadout.available_action_ids).toEqual(['get_current_context']);
    expect(loadout.default_action_ids).toEqual(['get_current_context']);
    expect(loadout.locked_capabilities).toEqual([]);
    expect(loadout.disabled_reason_map).toEqual({});
  });

  it('montre a un admin les capacites futures autorisees comme verrouillees', () => {
    const loadout = deriveUserRuntimeLoadout(admin, room, adminInstance);
    expect(loadout.available_action_ids).toEqual(
      expect.arrayContaining(['get_current_context', 'approve_validation_item', 'view_users']),
    );
    expect(loadout.available_action_ids).not.toContain('compile_da_context');
    expect(loadout.locked_capabilities).toEqual(
      expect.arrayContaining([{capability_id: 'compile_da_context', reason: 'capability_not_live'}]),
    );
    expect(loadout.active_mode_cycle).toEqual(['teaching', 'review']);
  });

  it('ne charge que le persona explicite de la room', () => {
    const loadout = deriveUserRuntimeLoadout(student, room, studentInstance);
    expect(loadout.available_persona_ids).toEqual(['profkrapu-001']);
  });
});
