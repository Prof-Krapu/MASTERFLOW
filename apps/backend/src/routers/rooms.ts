import {Router} from 'express';
import type {Request, Response} from 'express';

import {UpdateRoomInstanceSchema} from '@masterflow/shared';
import type {Room, RoomInstance} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {RoomInstanceRow, RoomRow} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';

/**
 * Router des rooms (UI Room OS) — MVP.
 *
 * Toutes les routes exigent un utilisateur authentifié (`requireUser` monté en amont).
 * Une *room* est le décor partagé (canon lent) ; une *room_instance* est l'état vivant
 * propre à un utilisateur (zoom, surface active, densité cognitive, état des widgets).
 *
 * Doctrine Room OS : l'interface se recompose, elle ne se navigue pas. L'instance porte
 * donc l'état de recomposition côté utilisateur, créé paresseusement à la première lecture.
 */

// ───────────────────────── DTO ─────────────────────────

/** Parse une colonne JSON (`x_json`) en objet, ou `null` si absente/vide. */
function parseJson(raw: string | null): Record<string, unknown> | null {
  return JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
}

/** Convertit une rangée `rooms` en DTO du contrat partagé. */
function toRoomDTO(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    owner_id: row.owner_id,
    context: parseJson(row.context_json),
    is_public: row.is_public === 1,
  };
}

/**
 * Convertit une rangée `room_instances` en DTO du contrat partagé.
 *
 * Les colonnes libres (`zoom_level`, `active_surface`, `cognitive_density`) sont typées
 * `string` en base ; le contrat partagé les contraint via Zod. On les caste vers le DTO,
 * les valeurs étant garanties par les writes (seed + PUT validé) en amont.
 */
function toRoomInstanceDTO(row: RoomInstanceRow): RoomInstance {
  return {
    id: row.id,
    room_id: row.room_id,
    user_id: row.user_id,
    zoom_level: row.zoom_level as RoomInstance['zoom_level'],
    active_surface: row.active_surface,
    cognitive_density: row.cognitive_density as RoomInstance['cognitive_density'],
    widget_state: parseJson(row.widget_state_json),
    updated_at: row.updated_at,
  };
}

// ───────────────────────── Accès BDD ─────────────────────────

/** Retourne la rangée `rooms` `id`, ou `undefined`. */
function findRoom(roomId: string): RoomRow | undefined {
  return getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as RoomRow | undefined;
}

/** Retourne l'instance de `roomId` pour `userId`, ou `undefined`. */
function findInstance(roomId: string, userId: string): RoomInstanceRow | undefined {
  return getDb()
    .prepare('SELECT * FROM room_instances WHERE room_id = ? AND user_id = ?')
    .get(roomId, userId) as RoomInstanceRow | undefined;
}

/** Crée l'instance par défaut de `roomId` pour `userId` (valeurs de schéma) et la retourne. */
function createInstance(roomId: string, userId: string): RoomInstanceRow {
  const now = Date.now();
  const row: RoomInstanceRow = {
    id: uuid(),
    room_id: roomId,
    user_id: userId,
    zoom_level: 'workspace',
    active_surface: 'workspace',
    cognitive_density: 'medium',
    widget_state_json: null,
    created_at: now,
    updated_at: now,
  };
  getDb()
    .prepare(
      `INSERT INTO room_instances
         (id, room_id, user_id, zoom_level, active_surface, cognitive_density, widget_state_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.room_id,
      row.user_id,
      row.zoom_level,
      row.active_surface,
      row.cognitive_density,
      row.widget_state_json,
      row.created_at,
      row.updated_at,
    );
  return row;
}

// ───────────────────────── Router ─────────────────────────

/** Fabrique le router des rooms. À monter sous `${env.apiBase}/rooms` après `requireUser`. */
export function createRoomsRouter(): Router {
  const router = Router();

  // GET /rooms — liste les rooms visibles (toutes en MVP), triées par nom.
  router.get('/', (_req: Request, res: Response): void => {
    const rows = getDb().prepare('SELECT * FROM rooms ORDER BY name').all() as RoomRow[];
    res.json(rows.map(toRoomDTO));
  });

  // GET /rooms/:id — détail d'une room.
  router.get('/:id', (req: Request, res: Response): void => {
    const roomId = req.params.id;
    if (!roomId) {
      res.status(404).json({error: 'room_not_found'});
      return;
    }
    const room = findRoom(roomId);
    if (!room) {
      res.status(404).json({error: 'room_not_found'});
      return;
    }
    res.json(toRoomDTO(room));
  });

  // GET /rooms/:id/instance — état vivant de l'utilisateur ; créé paresseusement si absent.
  router.get('/:id/instance', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    const roomId = req.params.id;
    if (!roomId || !findRoom(roomId)) {
      res.status(404).json({error: 'room_not_found'});
      return;
    }
    const row = findInstance(roomId, user.id) ?? createInstance(roomId, user.id);
    res.json(toRoomInstanceDTO(row));
  });

  // PUT /rooms/:id/instance — met à jour zoom / surface / densité / widgets (création paresseuse).
  router.put('/:id/instance', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    const roomId = req.params.id;
    if (!roomId || !findRoom(roomId)) {
      res.status(404).json({error: 'room_not_found'});
      return;
    }

    const parsed = UpdateRoomInstanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    const patch = parsed.data;

    const current = findInstance(roomId, user.id) ?? createInstance(roomId, user.id);
    const now = Date.now();
    const next: RoomInstanceRow = {
      ...current,
      zoom_level: patch.zoom_level ?? current.zoom_level,
      active_surface: patch.active_surface ?? current.active_surface,
      cognitive_density: patch.cognitive_density ?? current.cognitive_density,
      widget_state_json:
        patch.widget_state !== undefined ? JSON.stringify(patch.widget_state) : current.widget_state_json,
      updated_at: now,
    };

    getDb()
      .prepare(
        `UPDATE room_instances
            SET zoom_level = ?, active_surface = ?, cognitive_density = ?, widget_state_json = ?, updated_at = ?
          WHERE id = ?`,
      )
      .run(
        next.zoom_level,
        next.active_surface,
        next.cognitive_density,
        next.widget_state_json,
        next.updated_at,
        next.id,
      );

    res.json(toRoomInstanceDTO(next));
  });

  return router;
}
