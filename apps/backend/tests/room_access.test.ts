import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  getAccessibleRoom,
  getOwnedAccessibleRoomInstance,
  listAccessibleRooms,
} from '../src/services/room_access.ts';

const owner: AuthUser = {id: 'room-owner', username: 'room_owner', role: 'teacher'};
const member: AuthUser = {id: 'room-member', username: 'room_member', role: 'student'};
const outsider: AuthUser = {id: 'room-outsider', username: 'room_outsider', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(owner.id, owner.username, 'Room Owner', owner.role, now, now);
  insertUser.run(member.id, member.username, 'Room Member', member.role, now, now);
  insertUser.run(outsider.id, outsider.username, 'Room Outsider', outsider.role, now, now);

  db.prepare(
    `INSERT INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('room-project', ?, 'Room Project', 'active', 'private', ?, ?)`,
  ).run(owner.id, now, now);
  db.prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES ('room-project', ?, 'owner', ?), ('room-project', ?, 'participant', ?)`,
  ).run(owner.id, now, member.id, now);

  const insertRoom = db.prepare(
    `INSERT INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES (?, ?, 'workspace', ?, ?, NULL, ?, ?, ?)`,
  );
  insertRoom.run('room-private', 'Private', owner.id, null, 0, now, now);
  insertRoom.run('room-project-shared', 'Project', owner.id, 'room-project', 0, now, now);
  insertRoom.run('room-public', 'Public', owner.id, null, 1, now, now);

  db.prepare(
    `INSERT INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density, created_at, updated_at)
     VALUES ('room-owner-instance', 'room-public', ?, 'workspace', 'workspace', 'medium', ?, ?)`,
  ).run(owner.id, now, now);
});

describe('room_access — isolation owner/public/projet', () => {
  it('masque une Room privée aux autres utilisateurs', () => {
    expect(getAccessibleRoom(owner, 'room-private')?.id).toBe('room-private');
    expect(getAccessibleRoom(member, 'room-private')).toBeNull();
  });

  it('ouvre une Room projet uniquement aux membres', () => {
    expect(getAccessibleRoom(member, 'room-project-shared')?.id).toBe('room-project-shared');
    expect(getAccessibleRoom(outsider, 'room-project-shared')).toBeNull();
  });

  it('la liste ne révèle que les Rooms accessibles', () => {
    const memberIds = listAccessibleRooms(member).map((room) => room.id);
    expect(memberIds).toContain('room-project-shared');
    expect(memberIds).toContain('room-public');
    expect(memberIds).not.toContain('room-private');
  });

  it("refuse l'instance d'un autre utilisateur même sur une Room publique", () => {
    expect(getOwnedAccessibleRoomInstance(owner, 'room-owner-instance')?.id).toBe(
      'room-owner-instance',
    );
    expect(getOwnedAccessibleRoomInstance(member, 'room-owner-instance')).toBeNull();
  });
});
