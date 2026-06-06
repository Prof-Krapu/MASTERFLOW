import type {BlendRequest, BlendWeights, Persona, PersonaBlend} from '@masterflow/shared';
import {getDb} from '../db/schema.ts';
import type {PersonaBlendRow, PersonaRow} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';

/**
 * Moteur de personas & chimères — MVP.
 *
 * Un persona porte une voix (`voice_config`), une méthode (`method_config`) et une
 * apparence (`visual_config`). Une *chimère* (blend) fusionne deux personas mais
 * respecte un invariant produit non négociable :
 *
 *   1 SEUL porte-parole sémantique = le persona PRIMAIRE.
 *
 * La fusion est donc *visuelle / d'inspiration* : le secondaire prête sa méthode et
 * sa signature, jamais sa voix de locuteur. La méthode empruntée est explicitement
 * attribuée (`methodAttribution`, ex. « méthode inspirée de Corrector »).
 *
 * Autre invariant : les permissions ne se blendent JAMAIS (elles ne transitent pas
 * par `hybrid_voice_config`).
 */

// ───────────────────────── DTO ─────────────────────────

/** Parse une colonne JSON (`x_json`) en objet, ou `null` si absente/vide. */
function parseJson(raw: string | null): Record<string, unknown> | null {
  return JSON.parse(raw ?? 'null') as Record<string, unknown> | null;
}

/** Convertit une rangée `personas` en DTO du contrat partagé. */
export function toPersonaDTO(row: PersonaRow): Persona {
  return {
    id: row.id,
    name: row.name,
    owner_type: row.owner_type,
    domain: row.domain,
    status: row.status,
    voice_config: parseJson(row.voice_config_json),
    method_config: parseJson(row.method_config_json),
    visual_config: parseJson(row.visual_config_json),
    permissions: parseJson(row.permissions_json),
  };
}

/** Liste tous les personas, triés par nom. */
export function listPersonas(): Persona[] {
  const rows = getDb().prepare('SELECT * FROM personas ORDER BY name').all() as PersonaRow[];
  return rows.map(toPersonaDTO);
}

/** Retourne le persona `id`, ou `null` s'il n'existe pas. */
export function getPersona(id: string): Persona | null {
  const row = getDb().prepare('SELECT * FROM personas WHERE id = ?').get(id) as PersonaRow | undefined;
  return row ? toPersonaDTO(row) : null;
}

// ───────────────────────── Fusion (chimère) ─────────────────────────

/**
 * Phrase d'attribution de la méthode empruntée au persona secondaire.
 * Rend explicite l'invariant « 1 porte-parole » : le primaire parle, mais signale
 * d'où vient la méthode (ex. « méthode inspirée de Corrector »).
 */
export function methodAttribution(secondary: Persona): string {
  return `méthode inspirée de ${secondary.name}`;
}

/**
 * Calcule la voix hybride d'une chimère.
 *
 * Fusionne le `voice_config` du PRIMAIRE (pondéré par `weights.voice`) et le
 * `method_config` du SECONDAIRE (pondéré par `weights.method`), sans jamais mélanger
 * les permissions. Le porte-parole reste le primaire : le secondaire n'apporte qu'un
 * *overlay* de méthode, attribué dans `method_overlay.attribution`.
 */
export function computeHybridVoice(
  primary: Persona,
  secondary: Persona,
  weights: BlendWeights,
): Record<string, unknown> {
  const voice = primary.voice_config ?? {};
  const method = secondary.method_config ?? {};

  return {
    // Registre : voix du primaire (porte-parole sémantique unique).
    register: voice['register'] ?? null,
    // Champ lexical du primaire, conservé tel quel s'il existe.
    ...(voice['lexical_field'] !== undefined ? {lexical_field: voice['lexical_field']} : {}),
    // Overlay de méthode emprunté au secondaire, explicitement attribué.
    method_overlay: {
      ...method,
      source_persona_id: secondary.id,
      attribution: methodAttribution(secondary),
    },
    // Poids effectifs de la fusion (voix primaire / méthode secondaire).
    weights: {
      voice: weights.voice,
      method: weights.method,
      ...(weights.mirror !== undefined ? {mirror: weights.mirror} : {}),
    },
  };
}

// ───────────────────────── Persistance des blends ─────────────────────────

/** Recompose un `PersonaBlend` (DTO complet) depuis une rangée `persona_blends`. */
function toBlendDTO(row: PersonaBlendRow): PersonaBlend {
  const primary = getPersona(row.primary_persona_id);
  if (!primary) {
    throw new Error(`Persona primaire introuvable : ${row.primary_persona_id}`);
  }
  const secondary = row.secondary_persona_id ? getPersona(row.secondary_persona_id) : null;

  const weights = (JSON.parse(row.blend_weights_json ?? 'null') as BlendWeights | null) ?? {
    voice: 0.7,
    method: 0.3,
  };
  const activeLayers = (JSON.parse(row.active_layers_json ?? 'null') as string[] | null) ?? [];

  return {
    id: row.id,
    room_instance_id: row.room_instance_id,
    primary_persona: primary,
    secondary_persona: secondary,
    blend_weights: weights,
    active_layers: activeLayers,
    // Invariant : porte-parole unique = primaire.
    speaker_persona_id: row.primary_persona_id,
    hybrid_voice_config: secondary
      ? computeHybridVoice(primary, secondary, weights)
      : (primary.voice_config ?? {}),
    is_active: row.is_active === 1,
  };
}

/**
 * Crée une chimère pour une `room_instance`.
 *
 * Désactive d'abord tout blend actif de la même room_instance (un seul actif à la
 * fois), puis insère le nouveau. Le porte-parole est forcé au persona primaire.
 * Lève si l'un des personas est introuvable.
 */
export function createBlend(req: BlendRequest): PersonaBlend {
  const db = getDb();

  const primary = getPersona(req.primary_persona_id);
  if (!primary) throw new Error(`Persona primaire introuvable : ${req.primary_persona_id}`);
  const secondary = getPersona(req.secondary_persona_id);
  if (!secondary) throw new Error(`Persona secondaire introuvable : ${req.secondary_persona_id}`);

  const now = Date.now();

  // Un seul blend actif par room_instance : on désactive les précédents.
  db.prepare('UPDATE persona_blends SET is_active = 0, updated_at = ? WHERE room_instance_id = ? AND is_active = 1')
    .run(now, req.room_instance_id);

  const id = uuid();
  db.prepare(
    `INSERT INTO persona_blends
       (id, room_instance_id, primary_persona_id, secondary_persona_id,
        blend_weights_json, active_layers_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    id,
    req.room_instance_id,
    req.primary_persona_id,
    req.secondary_persona_id,
    JSON.stringify(req.blend_weights),
    JSON.stringify(req.active_layers),
    now,
    now,
  );

  const row = db.prepare('SELECT * FROM persona_blends WHERE id = ?').get(id) as PersonaBlendRow;
  return toBlendDTO(row);
}

/** Retourne le blend actif d'une room_instance, ou `null`. */
export function getActiveBlend(roomInstanceId: string): PersonaBlend | null {
  const row = getDb()
    .prepare('SELECT * FROM persona_blends WHERE room_instance_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1')
    .get(roomInstanceId) as PersonaBlendRow | undefined;
  return row ? toBlendDTO(row) : null;
}

/**
 * Met à jour les poids (et éventuellement les couches actives) d'un blend.
 * Le porte-parole et les personas ne changent pas ici. Lève si le blend est inconnu.
 */
export function updateBlend(
  id: string,
  weights: BlendWeights,
  activeLayers?: string[],
): PersonaBlend {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM persona_blends WHERE id = ?').get(id) as
    | PersonaBlendRow
    | undefined;
  if (!existing) throw new Error(`Blend introuvable : ${id}`);

  const now = Date.now();
  const layers = activeLayers ?? JSON.parse(existing.active_layers_json ?? 'null') ?? [];

  db.prepare('UPDATE persona_blends SET blend_weights_json = ?, active_layers_json = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(weights), JSON.stringify(layers), now, id);

  const row = db.prepare('SELECT * FROM persona_blends WHERE id = ?').get(id) as PersonaBlendRow;
  return toBlendDTO(row);
}

/** Désactive un blend (retour au persona seul). Idempotent. */
export function stopBlend(id: string): void {
  getDb()
    .prepare('UPDATE persona_blends SET is_active = 0, updated_at = ? WHERE id = ?')
    .run(Date.now(), id);
}
