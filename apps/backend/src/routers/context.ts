import {Router} from 'express';
import type {Request, Response} from 'express';

import {CurrentContextSchema} from '@masterflow/shared';
import type {CurrentContext, Room, RoomInstance, User} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {RoomInstanceRow, RoomRow, UserRow} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import {requireUser} from '../middleware/auth.ts';
import {listRegistry} from '../engines/action_registry.ts';
import {getActiveBlend, listPersonas} from '../engines/persona_engine.ts';

/**
 * Router de contexte — résolution du « où je suis » courant.
 *
 * Doctrine Room OS : l'UI se recompose autour d'un contexte. `GET /context/current`
 * fournit l'état complet dont le front a besoin pour peindre une room : utilisateur,
 * room, instance vivante (zoom/surface/widgets), personas disponibles, chimère active
 * et registre des actions proposables.
 *
 * Une seule responsabilité : assembler ce snapshot. La logique métier reste dans les
 * moteurs (personas, registre) ; ici on ne fait que la résolution room + l'instance.
 */

// ───────────────────────── DTO ─────────────────────────

/** Façonne une rangée `users` en DTO public (sans hash ni champs internes). */
function toUserDTO(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    role: row.role,
  };
}

/** Façonne une rangée `rooms` en DTO de contrat (context parsé, booléen normalisé). */
function toRoomDTO(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    owner_id: row.owner_id,
    context: JSON.parse(row.context_json ?? 'null') as Record<string, unknown> | null,
    is_public: row.is_public === 1,
  };
}

/** Façonne une rangée `room_instances` en DTO de contrat (widget_state parsé). */
function toRoomInstanceDTO(row: RoomInstanceRow): RoomInstance {
  return {
    id: row.id,
    room_id: row.room_id,
    user_id: row.user_id,
    zoom_level: row.zoom_level as RoomInstance['zoom_level'],
    active_surface: row.active_surface,
    cognitive_density: row.cognitive_density as RoomInstance['cognitive_density'],
    widget_state: JSON.parse(row.widget_state_json ?? 'null') as Record<string, unknown> | null,
    updated_at: row.updated_at,
  };
}

// ───────────────────────── Résolution room ─────────────────────────

/**
 * Trouve la room d'ancrage de l'utilisateur :
 *   1. sa propre room Home (owner_id = user, type = 'home') ;
 *   2. à défaut, sa room la plus ancienne (quel que soit le type) ;
 *   3. à défaut, la 1re room publique accessible.
 * Retourne `null` si aucune room n'est accessible.
 */
function resolveRoom(userId: string): RoomRow | null {
  const db = getDb();

  const home = db
    .prepare<[string], RoomRow>("SELECT * FROM rooms WHERE owner_id = ? AND type = 'home' ORDER BY created_at LIMIT 1")
    .get(userId);
  if (home) return home;

  const owned = db
    .prepare<[string], RoomRow>('SELECT * FROM rooms WHERE owner_id = ? ORDER BY created_at LIMIT 1')
    .get(userId);
  if (owned) return owned;

  const pub = db
    .prepare<[], RoomRow>('SELECT * FROM rooms WHERE is_public = 1 ORDER BY created_at LIMIT 1')
    .get();
  return pub ?? null;
}

/**
 * Garantit une `room_instance` pour (user, room) : retourne l'existante ou en crée une
 * avec les valeurs par défaut du schéma. La contrainte UNIQUE(user_id, room_id) borne
 * à une instance par couple.
 */
function ensureRoomInstance(userId: string, roomId: string): RoomInstanceRow {
  const db = getDb();

  const existing = db
    .prepare<[string, string], RoomInstanceRow>(
      'SELECT * FROM room_instances WHERE user_id = ? AND room_id = ?',
    )
    .get(userId, roomId);
  if (existing) return existing;

  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density, widget_state_json, created_at, updated_at)
     VALUES (?, ?, ?, 'workspace', 'workspace', 'medium', NULL, ?, ?)`,
  ).run(id, roomId, userId, now, now);

  return db
    .prepare<[string], RoomInstanceRow>('SELECT * FROM room_instances WHERE id = ?')
    .get(id)!;
}

// ───────────────────────── Router ─────────────────────────

/** Fabrique le router `/context`. */
export function createContextRouter(): Router {
  const router = Router();

  /**
   * GET /context/current — snapshot du contexte courant de l'utilisateur authentifié.
   * Résout sa room d'ancrage, garantit l'instance, et agrège personas / chimère / actions.
   */
  router.get('/current', requireUser, (req: Request, res: Response): void => {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }

    const db = getDb();
    const userRow = db
      .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
      .get(authUser.id);
    if (!userRow) {
      res.status(404).json({error: 'user_not_found'});
      return;
    }

    const roomRow = resolveRoom(authUser.id);
    if (!roomRow) {
      res.status(404).json({error: 'no_accessible_room'});
      return;
    }

    const instanceRow = ensureRoomInstance(authUser.id, roomRow.id);

    const context: CurrentContext = {
      user: toUserDTO(userRow),
      room: toRoomDTO(roomRow),
      room_instance: toRoomInstanceDTO(instanceRow),
      personas: listPersonas(),
      active_blend: getActiveBlend(instanceRow.id),
      available_actions: listRegistry(),
    };

    res.json(CurrentContextSchema.parse(context));
  });

  return router;
}
