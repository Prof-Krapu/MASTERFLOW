import {getDb, type RoomInstanceRow, type RoomRow} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';

/**
 * Résolution d'accès aux Rooms.
 *
 * Une Room est visible si elle est publique, possédée par l'acteur ou rattachée à un
 * projet dont il est membre. Aucun rôle global n'ouvre implicitement une Room privée.
 */
export function canAccessRoom(actor: AuthUser, room: RoomRow): boolean {
  if (room.is_public === 1 || room.owner_id === actor.id) return true;
  if (!room.project_id) return false;
  return (
    getDb()
      .prepare('SELECT 1 AS hit FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(room.project_id, actor.id) !== undefined
  );
}

export function getAccessibleRoom(actor: AuthUser, roomId: string): RoomRow | null {
  const room = getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as RoomRow | undefined;
  return room && canAccessRoom(actor, room) ? room : null;
}

export function listAccessibleRooms(actor: AuthUser): RoomRow[] {
  return getDb()
    .prepare(
      `SELECT DISTINCT r.*
         FROM rooms r
         LEFT JOIN project_members pm
           ON pm.project_id = r.project_id AND pm.user_id = ?
        WHERE r.is_public = 1 OR r.owner_id = ? OR pm.user_id IS NOT NULL
        ORDER BY r.name`,
    )
    .all(actor.id, actor.id) as RoomRow[];
}

/** Retourne uniquement une instance appartenant à l'acteur et dont la Room reste accessible. */
export function getOwnedAccessibleRoomInstance(
  actor: AuthUser,
  instanceId: string,
): RoomInstanceRow | null {
  const row = getDb()
    .prepare(
      `SELECT ri.*
         FROM room_instances ri
         INNER JOIN rooms r ON r.id = ri.room_id
         LEFT JOIN project_members pm
           ON pm.project_id = r.project_id AND pm.user_id = ?
        WHERE ri.id = ?
          AND ri.user_id = ?
          AND (r.is_public = 1 OR r.owner_id = ? OR pm.user_id IS NOT NULL)`,
    )
    .get(actor.id, instanceId, actor.id, actor.id) as RoomInstanceRow | undefined;
  return row ?? null;
}
