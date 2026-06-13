import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';

import {env} from '../lib/env.ts';
import {uuid} from '../lib/uuid.ts';
import {costFor} from '../services/llm_pricing.ts';
import {getDb, type PersonaRow, type RoomRow, type UserRow} from './schema.ts';

/**
 * Seed idempotent du runtime MasterFlow.
 *
 * Crée (si absents) : le compte godmode, les 3 personas du MVP (MasterFlex,
 * ProfKrapu, Corrector), une room Home, et quelques ressources de démonstration
 * pour l'anti-hallucination (2 validées + 1 candidate).
 *
 * Appelé au boot d'Express (cheap : ne hashe le mot de passe que s'il crée le user)
 * et exécutable seul via `npm run seed`.
 */

const BCRYPT_COST = 12;

// Personas du MVP. visual_config porte la palette Zerg (consommée par le PoC métaballs).
const PERSONA_SEEDS = [
  {
    id: 'masterflex-001',
    name: 'MasterFlex',
    owner_type: 'persona',
    domain: 'coaching / production',
    voice_config: {
      register: {formality: 'medium', energy: 'high'},
      lexical_field: ['cap', 'jauge', 'prochaine action'],
      signature_moves: ['jauge courte', 'question utile', 'action suivante'],
    },
    method_config: {
      cadrage: 'avancer sans perdre le contexte',
      heuristiques: ['réduire la charge cognitive', 'une décision à la fois'],
    },
    visual_config: {
      silhouette: 'noyau dense',
      color_palette: {core: '#6B2D5B', glow: '#FF6B00', accent: '#39FF14'},
    },
    permissions: {can_blend: true, can_lend_method: true, can_be_primary: true},
  },
  {
    id: 'profkrapu-001',
    name: 'ProfKrapu',
    owner_type: 'persona',
    domain: 'pédagogie visuelle',
    voice_config: {
      register: {formality: 'medium', energy: 'high'},
      lexical_field: ['strip', 'métaphore', 'checkpoint'],
      signature_moves: ['strip pédago', 'métaphore filée', 'checkpoint visuel'],
    },
    method_config: {
      cadrage: 'expliquer par le visuel et la métaphore',
      heuristiques: ['montrer avant de dire', 'un concept = une image'],
    },
    visual_config: {
      silhouette: 'organique épineux',
      color_palette: {core: '#2E1B15', glow: '#39FF14', accent: '#7FFF00'},
    },
    permissions: {can_blend: true, can_lend_method: true, can_be_primary: true},
  },
  {
    id: 'corrector-001',
    name: 'Corrector',
    owner_type: 'persona',
    domain: 'correction / feedback',
    voice_config: {
      register: {formality: 'medium', energy: 'medium'},
      lexical_field: ['diagnostic', 'priorité', 'critère'],
      signature_moves: ['diagnostic', 'priorité', 'action suivante'],
    },
    method_config: {
      cadrage: 'diagnostiquer puis prioriser le feedback',
      heuristiques: ['un critère à la fois', 'feedback actionnable'],
      criteres: ['clarté', 'exactitude', 'progression'],
    },
    visual_config: {
      silhouette: 'lame chitineuse',
      color_palette: {core: '#8B1E1E', glow: '#A83232', accent: '#D4C5B9'},
    },
    permissions: {can_blend: true, can_lend_method: true, can_be_primary: true},
  },
] as const;

const RESOURCE_SEEDS = [
  {
    type: 'video',
    title: 'La stœchiométrie expliquée simplement',
    url: 'https://example.org/stoechiometrie',
    source: 'subject_library_v3',
    status: 'validated' as const,
    subjects: ['chimie', 'stoechiometrie'],
  },
  {
    type: 'article',
    title: 'Méthode de la dissertation — plan dialectique',
    url: 'https://example.org/dissertation',
    source: 'subject_library_v3',
    status: 'validated' as const,
    subjects: ['francais', 'methode'],
  },
  {
    // Candidate : proposée mais NON vérifiée → ne doit jamais s'afficher comme source sûre.
    type: 'link',
    title: 'Ressource proposée à valider',
    url: 'https://example.org/candidate',
    source: 'user_proposal',
    status: 'candidate' as const,
    subjects: ['divers'],
  },
];

/**
 * Seed de DÉMONSTRATION pour `token_events` — uniquement pour peupler la dataviz du PoC
 * (monitoring usage/coût + vue `API_corrector`). Ne s'exécute QUE si la table est vide ET
 * si `MASTERFLOW_SEED_DEMO_USAGE !== '0'`. Désactivable, non destructif, clairement « démo ».
 *
 * Les événements sont rattachés au compte godmode (FK `user_id`), répartis sur ~14 jours,
 * avec plusieurs `task` (chat/correction/ocr/bareme) et `model`. Le coût est calculé via
 * `costFor` (jamais inventé) ; `task='correction'` matérialise la consommation côté Corrector.
 */
function seedDemoUsage(db: Database.Database, godId: string): number {
  // Jamais en test (assertions déterministes) ni si explicitement désactivé.
  if (process.env.MASTERFLOW_SEED_DEMO_USAGE === '0' || process.env.NODE_ENV === 'test') return 0;
  const existing = db.prepare('SELECT COUNT(*) AS n FROM token_events').get() as {n: number};
  if (existing.n > 0) return 0;

  const DAY = 86_400_000;
  const now = Date.now();
  const tasks = ['chat', 'correction', 'ocr', 'bareme'] as const;
  const models = ['gpt-4o', 'gpt-4o-mini', 'mistral-small', 'mock'] as const;
  const personas = ['profkrapu-001', 'corrector-001', 'masterflex-001'];

  const insert = db.prepare(
    `INSERT INTO token_events
       (user_id, ts, model, task, prompt_tokens, completion_tokens, cost_eur, persona_id, room_instance_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
  );

  // ~3 événements/jour sur 14 jours, variés mais déterministes (pas de hasard).
  let count = 0;
  const tx = db.transaction(() => {
    for (let d = 13; d >= 0; d--) {
      const eventsToday = 2 + (d % 3); // 2..4
      for (let k = 0; k < eventsToday; k++) {
        const idx = d * 7 + k;
        const task = tasks[idx % tasks.length]!;
        const model = models[(idx >> 1) % models.length]!;
        const promptTokens = 400 + ((idx * 137) % 1600);
        const completionTokens = 150 + ((idx * 89) % 900);
        const cost = costFor(model, promptTokens, completionTokens);
        // Heure de la journée variée (pour étaler) ; rattaché à godmode.
        const ts = now - d * DAY + ((idx * 3_600_000) % DAY);
        insert.run(
          godId,
          ts,
          model,
          task,
          promptTokens,
          completionTokens,
          cost,
          personas[idx % personas.length]!,
        );
        count++;
      }
    }
  });
  tx();
  if (count > 0) console.log(`[seed] token_events démo insérés : ${count} (désactiver via MASTERFLOW_SEED_DEMO_USAGE=0)`);
  return count;
}

export async function seedAll(): Promise<{users: number; personas: number; rooms: number; resources: number}> {
  const db = getDb();
  const now = Date.now();
  let createdUsers = 0;
  let createdPersonas = 0;
  let createdRooms = 0;
  let createdResources = 0;

  // ── Compte godmode ───────────────────────────────────────────────
  const godUsername = env.godmode.username;
  let god = db
    .prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?')
    .get(godUsername);

  if (!god) {
    if (!env.godmode.password) {
      throw new Error('[seed] GODMODE_PASSWORD requis pour créer le compte godmode.');
    }
    const hash = await bcrypt.hash(env.godmode.password, BCRYPT_COST);
    const id = uuid();
    db.prepare(
      `INSERT INTO users (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, 'godmode', 1, ?, ?)`,
    ).run(id, godUsername, 'Vincent', hash, now, now);
    createdUsers++;
    god = db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id)!;
  }

  // ── Personas ────────────────────────────────────────────────────
  const insertPersona = db.prepare(
    `INSERT OR IGNORE INTO personas
       (id, name, owner_type, domain, status, voice_config_json, method_config_json, visual_config_json, permissions_json, created_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`,
  );
  for (const p of PERSONA_SEEDS) {
    const res = insertPersona.run(
      p.id,
      p.name,
      p.owner_type,
      p.domain,
      JSON.stringify(p.voice_config),
      JSON.stringify(p.method_config),
      JSON.stringify(p.visual_config),
      JSON.stringify(p.permissions),
      now,
    );
    if (res.changes > 0) createdPersonas++;
  }

  // ── Room Home (widgets dérivés du recipe `project`) ──────────────
  const existingHome = db
    .prepare<[string], RoomRow>("SELECT * FROM rooms WHERE type = 'home' AND owner_id = ?")
    .get(god.id);
  if (!existingHome) {
    const roomId = uuid();
    const context = {
      purpose: 'Point de départ : reprendre le contexte et lancer une action utile.',
      default_widgets: ['room_context_card', 'contextual_action_bar', 'validation_inbox_mini'],
      active_persona: 'profkrapu-001',
    };
    db.prepare(
      `INSERT INTO rooms (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
       VALUES (?, 'Home Room', 'home', ?, ?, 0, ?, ?)`,
    ).run(roomId, god.id, JSON.stringify(context), now, now);
    createdRooms++;
  }

  // ── Ressources (anti-hallucination) ──────────────────────────────
  const insertResource = db.prepare(
    `INSERT INTO resources (id, type, title, url, source, status, subjects_json, created_at)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM resources WHERE title = ?)`,
  );
  for (const r of RESOURCE_SEEDS) {
    const res = insertResource.run(
      uuid(),
      r.type,
      r.title,
      r.url,
      r.source,
      r.status,
      JSON.stringify(r.subjects),
      now,
      r.title,
    );
    if (res.changes > 0) createdResources++;
  }

  // ── Démo usage tokens (PoC dataviz) — idempotent, désactivable ───
  seedDemoUsage(db, god.id);

  return {users: createdUsers, personas: createdPersonas, rooms: createdRooms, resources: createdResources};
}

// Exécution directe : `npm run seed`.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedAll()
    .then((r) => {
      console.log(`[seed] créés → users:${r.users} personas:${r.personas} rooms:${r.rooms} resources:${r.resources}`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('[seed] échec :', e);
      process.exit(1);
    });
}
