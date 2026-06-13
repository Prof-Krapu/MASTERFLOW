import {Router, type Request, type Response} from 'express';
import {z} from 'zod';

import {BlendRequestSchema, BlendWeightsSchema} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {RoomInstanceRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {requireUser} from '../middleware/auth.ts';
import {
  createBlend,
  getPersona,
  listPersonas,
  requireSelectablePersona,
  stopBlend,
  updateBlend,
} from '../engines/persona_engine.ts';

/**
 * Router personas & chimères — Phase 2.
 *
 * Toutes les routes exigent un utilisateur authentifié (`requireUser`).
 * Le moteur (`persona_engine`) reste l'autorité métier ; ce router se contente de
 * valider les bodies via les schémas Zod partagés et de façonner les réponses
 * (Persona / PersonaBlend du contrat `@masterflow/shared`).
 *
 * Invariant produit rappelé par le moteur : 1 SEUL porte-parole sémantique = le
 * persona PRIMAIRE. La fusion est visuelle / d'inspiration, jamais une fusion de
 * permissions.
 */

/** Body de mise à jour d'une chimère : nouveaux poids + couches actives optionnelles. */
const UpdateBlendSchema = z.object({
  blend_weights: BlendWeightsSchema,
  active_layers: z.array(z.string()).optional(),
});

/** Body d'activation d'un persona dans une room_instance. */
const ActivatePersonaSchema = z.object({
  room_instance_id: z.string().min(1),
});

export function createPersonasRouter(): Router {
  const router = Router();

  // Garde d'authentification sur tout le router.
  router.use(requireUser);

  // ───────────────────────── Lecture ─────────────────────────

  /** Liste tous les personas disponibles. */
  router.get('/personas', (_req: Request, res: Response) => {
    res.json(listPersonas());
  });

  /** Détail d'un persona, ou 404. */
  router.get('/personas/:id', (req: Request, res: Response) => {
    const persona = getPersona(req.params.id ?? '');
    if (!persona) {
      res.status(404).json({error: 'persona_not_found'});
      return;
    }
    res.json(persona);
  });

  // ───────────────────────── Chimères (blends) ─────────────────────────

  /** Crée une chimère (désactive le blend actif de la room_instance, puis insère). */
  router.post('/personas/blend', (req: Request, res: Response) => {
    const parsed = BlendRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }

    try {
      const blend = createBlend(parsed.data);
      audit({
        event_type: 'persona.blend.created',
        user_id: req.user?.id ?? null,
        scope: blend.room_instance_id,
        detail: {
          blend_id: blend.id,
          primary_persona_id: blend.primary_persona.id,
          secondary_persona_id: blend.secondary_persona?.id ?? null,
        },
      });
      res.status(201).json(blend);
    } catch (err) {
      // Personas introuvables, etc. : le moteur lève une Error explicite.
      res.status(400).json({error: 'blend_failed', message: (err as Error).message});
    }
  });

  /** Met à jour les poids (et couches) d'une chimère existante. */
  router.put('/personas/blend/:id', (req: Request, res: Response) => {
    const parsed = UpdateBlendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }

    try {
      const blend = updateBlend(req.params.id ?? '', parsed.data.blend_weights, parsed.data.active_layers);
      audit({
        event_type: 'persona.blend.updated',
        user_id: req.user?.id ?? null,
        scope: blend.room_instance_id,
        detail: {blend_id: blend.id, blend_weights: blend.blend_weights},
      });
      res.json(blend);
    } catch (err) {
      res.status(404).json({error: 'blend_not_found', message: (err as Error).message});
    }
  });

  /** Désactive une chimère (retour au persona seul). Idempotent → 204. */
  router.delete('/personas/blend/:id', (req: Request, res: Response) => {
    const blendId = req.params.id ?? '';
    stopBlend(blendId);
    audit({
      event_type: 'persona.blend.stopped',
      user_id: req.user?.id ?? null,
      detail: {blend_id: blendId},
    });
    res.status(204).end();
  });

  // ───────────────────────── Activation d'un persona ─────────────────────────

  /**
   * Active un persona dans une room_instance.
   *
   * Écrit `active_persona` dans l'état vivant de la room_instance (`widget_state`),
   * la room_instance n'ayant pas de colonne `context` dédiée. Vérifie que le persona
   * et la room_instance existent, et que celle-ci appartient bien à l'utilisateur.
   */
  router.post('/personas/:id/activate', (req: Request, res: Response) => {
    const parsed = ActivatePersonaSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', details: parsed.error.flatten()});
      return;
    }

    const personaId = req.params.id ?? '';
    const existingPersona = getPersona(personaId);
    if (!existingPersona) {
      res.status(404).json({error: 'persona_not_found'});
      return;
    }
    let persona;
    try {
      persona = requireSelectablePersona(personaId);
    } catch {
      res.status(409).json({error: 'persona_deprecated'});
      return;
    }

    const db = getDb();
    const instance = db
      .prepare('SELECT * FROM room_instances WHERE id = ?')
      .get(parsed.data.room_instance_id) as RoomInstanceRow | undefined;
    if (!instance) {
      res.status(404).json({error: 'room_instance_not_found'});
      return;
    }

    // Garde de propriété : on n'active que dans SA propre room_instance.
    if (instance.user_id !== req.user?.id) {
      res.status(403).json({error: 'forbidden'});
      return;
    }

    // Fusionne le contexte existant avec le nouveau persona actif.
    const widgetState =
      (JSON.parse(instance.widget_state_json ?? 'null') as Record<string, unknown> | null) ?? {};
    widgetState['active_persona'] = persona.id;

    const now = Date.now();
    db.prepare('UPDATE room_instances SET widget_state_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(widgetState),
      now,
      instance.id,
    );

    audit({
      event_type: 'persona.activated',
      user_id: req.user?.id ?? null,
      scope: instance.id,
      detail: {persona_id: persona.id, room_instance_id: instance.id},
    });

    res.json({room_instance_id: instance.id, active_persona: persona.id, persona});
  });

  return router;
}
