import {beforeAll, describe, expect, it} from 'vitest';

import {
  createBlend,
  getActiveBlend,
  getPersona,
  listPersonas,
  methodAttribution,
} from '../src/engines/persona_engine.ts';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {uuid} from '../src/lib/uuid.ts';

/**
 * Personas & chimères.
 *
 * Invariant produit non négociable : une chimère a 1 SEUL porte-parole sémantique =
 * le persona PRIMAIRE. Le secondaire ne prête que sa méthode (overlay explicitement
 * attribué). Les permissions ne se blendent jamais.
 */

// room_instance créée directement en base (un blend exige une room_instance valide).
let roomInstanceId: string;

beforeAll(async () => {
  await seedAll();

  const db = getDb();

  // Le user godmode et la room Home sont garantis par le seed.
  const user = db.prepare("SELECT id FROM users WHERE username = 'vincent'").get() as
    | {id: string}
    | undefined;
  if (!user) throw new Error('[test] user godmode introuvable après seed');

  const room = db.prepare("SELECT id FROM rooms WHERE type = 'home'").get() as
    | {id: string}
    | undefined;
  if (!room) throw new Error('[test] room Home introuvable après seed');

  roomInstanceId = uuid();
  const ts = 1700000000000;
  db.prepare(
    `INSERT INTO room_instances
       (id, room_id, user_id, zoom_level, active_surface, cognitive_density, widget_state_json, created_at, updated_at)
     VALUES (?, ?, ?, 'workspace', 'workspace', 'medium', NULL, ?, ?)`,
  ).run(roomInstanceId, room.id, user.id, ts, ts);
});

describe('persona blend — chimère ProfKrapu × Corrector', () => {
  it('expose les 3 personas du MVP', () => {
    const personas = listPersonas();
    const ids = personas.map((p) => p.id);
    expect(ids).toContain('profkrapu-001');
    expect(ids).toContain('corrector-001');
  });

  it('1 seul porte-parole (le primaire) + méthode attribuée au secondaire', () => {
    const blend = createBlend({
      room_instance_id: roomInstanceId,
      primary_persona_id: 'profkrapu-001',
      secondary_persona_id: 'corrector-001',
      blend_weights: {voice: 0.7, method: 0.3},
      active_layers: ['voice', 'method_signature'],
    });

    // INVARIANT : porte-parole unique = le persona primaire.
    expect(blend.speaker_persona_id).toBe('profkrapu-001');

    // La méthode empruntée est explicitement attribuée au secondaire.
    const overlay = blend.hybrid_voice_config['method_overlay'] as
      | {attribution?: unknown}
      | undefined;
    expect(overlay?.attribution).toBe('méthode inspirée de Corrector');
  });

  it('getActiveBlend renvoie le blend actif de la room_instance', () => {
    const active = getActiveBlend(roomInstanceId);
    expect(active).not.toBeNull();
    expect(active?.is_active).toBe(true);
    expect(active?.speaker_persona_id).toBe('profkrapu-001');
  });

  it('methodAttribution(Corrector) === "méthode inspirée de Corrector"', () => {
    const corrector = getPersona('corrector-001');
    expect(corrector).not.toBeNull();
    // Garde le strict mode content : on a vérifié la non-nullité juste au-dessus.
    expect(methodAttribution(corrector!)).toBe('méthode inspirée de Corrector');
  });
});
