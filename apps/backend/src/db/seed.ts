import bcrypt from 'bcryptjs';
import type Database from 'better-sqlite3';

import type {LLMTask, Role} from '@masterflow/shared';

import {env} from '../lib/env.ts';
import {uuid} from '../lib/uuid.ts';
import {costFor} from '../services/llm_pricing.ts';
import {getDb, type PersonaRow, type RoomRow, type UserRow} from './schema.ts';

/**
 * Seed idempotent du runtime MasterFlow.
 *
 * Crée (si absents) : le compte godmode, les personas actifs MasterFlex et
 * ProfKrapu, l'enregistrement historique déprécié Corrector, une room Home, et
 * quelques ressources de démonstration pour l'anti-hallucination.
 *
 * Appelé au boot d'Express (cheap : ne hashe le mot de passe que s'il crée le user)
 * et exécutable seul via `npm run seed`.
 */

const BCRYPT_COST = 12;

// Personas du MVP. visual_config porte la palette Zerg (consommée par le PoC métaballs).
const PERSONA_SEEDS = [
  {
    id: 'masterflow-system-001',
    name: 'MasterFlow System',
    owner_type: 'system',
    domain: 'orientation / assistance',
    voice_config: {
      register: {formality: 'medium', energy: 'calm'},
      lexical_field: ['contexte', 'etape', 'action utile'],
      signature_moves: ['clarification courte', 'prochaine etape'],
    },
    method_config: {
      cadrage: 'orienter sobrement sans inventer de contexte ni de permission',
      heuristiques: ['dire ce qui manque', 'proposer une etape utile'],
    },
    visual_config: {
      silhouette: 'interface neutre',
      color_palette: {core: '#2F3437', glow: '#D8DEE2', accent: '#2F8F83'},
    },
    permissions: {can_blend: false, can_lend_method: false, can_be_primary: true},
    status: 'active',
  },
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
    status: 'active',
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
    status: 'active',
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
    permissions: {
      can_blend: false,
      can_lend_method: false,
      can_be_primary: false,
      historical_read_only: true,
      grants_permissions: false,
      scoring_authority: false,
    },
    status: 'deprecated',
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

const SCHEMA_TEMPLATE_SEEDS = [
  {
    id: 'cdc-template-candidate-v1',
    domain: 'cdc',
    name: 'CDC candidat v1',
    version: 1,
    schema: {
      type: 'object',
      properties: {
        context: {type: 'string'},
        objectives: {type: 'array', items: {type: 'string'}},
        audience: {type: 'string'},
        constraints: {type: 'array', items: {type: 'string'}},
        deliverables: {type: 'array', items: {type: 'string'}},
      },
    },
    requiredFields: ['context', 'objectives', 'audience', 'deliverables'],
    validationRules: {public_use_requires_status: 'validated'},
    uiHints: {progress_fields: ['context', 'objectives', 'audience', 'deliverables']},
    changelog: 'Seed candidat non canonique pour ateliers CDC prives.',
  },
  {
    id: 'quote-intake-candidate-v1',
    domain: 'quote_intake',
    name: 'Demande de devis candidat v1',
    version: 1,
    schema: {
      type: 'object',
      properties: {
        need: {type: 'string'},
        budget_range: {type: 'string'},
        timeline: {type: 'string'},
        references: {type: 'array', items: {type: 'string'}},
        blockers: {type: 'array', items: {type: 'string'}},
      },
    },
    requiredFields: ['need', 'budget_range', 'timeline'],
    validationRules: {public_use_requires_status: 'validated'},
    uiHints: {progress_fields: ['need', 'budget_range', 'timeline']},
    changelog: 'Seed candidat non canonique pour qualification de devis.',
  },
  {
    id: 'event-registration-candidate-v1',
    domain: 'event_registration',
    name: 'Inscription evenement candidat v1',
    version: 1,
    schema: {
      type: 'object',
      properties: {
        attendee_name: {type: 'string'},
        email: {type: 'string'},
        attendee_type: {type: 'string'},
        attendance_mode: {type: 'string'},
        consent_notifications: {type: 'boolean'},
      },
    },
    requiredFields: ['attendee_name', 'email', 'attendee_type', 'consent_notifications'],
    validationRules: {public_use_requires_status: 'validated', private_data_default: true},
    uiHints: {progress_fields: ['attendee_name', 'email', 'attendee_type']},
    changelog: 'Seed candidat non canonique pour inscriptions evenement.',
  },
  {
    id: 'asset-manifest-candidate-v1',
    domain: 'asset_manifest',
    name: 'Manifest asset candidat v1',
    version: 1,
    schema: {
      type: 'object',
      properties: {
        asset_type: {type: 'string'},
        owner_id: {type: 'string'},
        scope: {type: 'string'},
        source_refs: {type: 'array', items: {type: 'string'}},
        validation_status: {type: 'string'},
      },
    },
    requiredFields: ['asset_type', 'owner_id', 'scope', 'source_refs', 'validation_status'],
    validationRules: {generated_assets_require_manifest: true},
    uiHints: {progress_fields: ['asset_type', 'scope', 'source_refs', 'validation_status']},
    changelog: 'Seed candidat non canonique pour manifestes assets generes.',
  },
] as const;

// ── Profils de routage LLM (OpenRouter) — VALIDÉS mais INERTES sans clé ─────────
// Tant que LLM_PROVIDER=mock (défaut), ces profils n'ont AUCUN effet : resolveLLMRoute
// reste en mock, zéro appel réseau. Ils déclarent, par tâche (et par rôle pour le chat),
// quel modèle OpenRouter utiliser quand une vraie clé est posée en env serveur.
// Économie de tokens : modèle de base bon marché, escalade vers un modèle fort seulement
// pour les rôles/tâches qui en ont besoin. Les ID de modèles sont des défauts raisonnables
// — ajustables (voir openrouter.ai/models). 1 clé + 1 base URL OpenRouter → N modèles.
const OR_CHEAP = 'google/gemini-3-flash'; // rapide, multimodal, bon marché (chat base, OCR)
const OR_MID = 'anthropic/claude-sonnet-4.6'; // qualité correction
const OR_STRONG = 'anthropic/claude-opus-4.8'; // raisonnement lourd / escalade prof-admin
const OR_IMAGE = 'google/gemini-3-flash-image'; // génération d'image (cf. runner image, gated)

interface SeedProfile {
  task: LLMTask;
  model: string;
  role_models?: Partial<Record<Role, string>>;
}

const TASK_MODEL_PROFILE_SEEDS: SeedProfile[] = [
  // Chat : student bon marché, escalade teacher → mid, admin/godmode → fort.
  {task: 'chat', model: OR_CHEAP, role_models: {teacher: OR_MID, admin: OR_STRONG, godmode: OR_STRONG}},
  {task: 'ocr', model: OR_CHEAP},
  {task: 'criterion_analysis', model: OR_MID},
  {task: 'rubric_extraction', model: OR_MID},
  {task: 'feedback_draft', model: OR_MID},
  {task: 'cohort_synthesis', model: OR_STRONG},
  {task: 'subject_revision', model: OR_MID},
  {task: 'image_generation', model: OR_IMAGE},
];

/**
 * Seed idempotent des profils de routage par tâche (un profil `validated` par tâche).
 * `INSERT OR REPLACE` sur un id déterministe → exactement un profil validé par tâche
 * (pas d'ambiguïté de routage). Inerte tant que le provider reste `mock`.
 */
function seedTaskModelProfiles(db: Database.Database, now: number): void {
  const insert = db.prepare(
    `INSERT OR REPLACE INTO task_model_profiles
       (id, task, allowed_providers_json, fallback_order_json, model, role_models_json, privacy_mode,
        max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, 'approved_remote', NULL, NULL, 'validated', ?, ?, NULL)`,
  );
  for (const p of TASK_MODEL_PROFILE_SEEDS) {
    insert.run(
      `tmp-${p.task}`,
      p.task,
      JSON.stringify(['openrouter']),
      JSON.stringify(['openrouter']),
      p.model,
      p.role_models ? JSON.stringify(p.role_models) : null,
      now,
      now,
    );
  }
}

export async function seedAll(): Promise<{
  users: number;
  personas: number;
  rooms: number;
  resources: number;
  schemaTemplates: number;
}> {
  const db = getDb();
  const now = Date.now();
  let createdUsers = 0;
  let createdPersonas = 0;
  let createdRooms = 0;
  let createdResources = 0;
  let createdSchemaTemplates = 0;

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
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const p of PERSONA_SEEDS) {
    const res = insertPersona.run(
      p.id,
      p.name,
      p.owner_type,
      p.domain,
      p.status,
      JSON.stringify(p.voice_config),
      JSON.stringify(p.method_config),
      JSON.stringify(p.visual_config),
      JSON.stringify(p.permissions),
      now,
    );
    if (res.changes > 0) createdPersonas++;
  }

  // Migration PR-C0 : conserve la rangée et les FK historiques, mais retire
  // Corrector des nouveaux parcours même sur une base déjà seedée.
  const corrector = PERSONA_SEEDS.find((persona) => persona.id === 'corrector-001');
  if (corrector) {
    db.prepare(
      `UPDATE personas
       SET status = 'deprecated', permissions_json = ?
       WHERE id = 'corrector-001'`,
    ).run(JSON.stringify(corrector.permissions));
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
      active_mode_cycle: ['home', 'teaching', 'inventory'],
    };
    db.prepare(
      `INSERT INTO rooms (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
       VALUES (?, 'Home Room', 'home', ?, ?, 0, ?, ?)`,
    ).run(roomId, god.id, JSON.stringify(context), now, now);
    createdRooms++;
  } else {
    let context: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(existingHome.context_json ?? '{}') as unknown;
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        context = parsed as Record<string, unknown>;
      }
    } catch {
      context = {};
    }

    const configuredModes = Array.isArray(context['active_mode_cycle'])
      ? context['active_mode_cycle'].filter((mode): mode is string => typeof mode === 'string')
      : ['home'];
    const activeModeCycle = [...new Set([...configuredModes, 'teaching'])];
    if (!configuredModes.includes('teaching')) {
      db.prepare('UPDATE rooms SET context_json = ?, updated_at = ? WHERE id = ?').run(
        JSON.stringify({...context, active_mode_cycle: activeModeCycle}),
        now,
        existingHome.id,
      );
    }
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

  // ── Schema templates PR-5 (candidats, non canoniques) ───────────
  const insertSchemaTemplate = db.prepare(
    `INSERT OR IGNORE INTO schema_templates
       (id, domain, name, status, version, owner_id, schema_json, required_fields_json,
        validation_rules_json, ui_hints_json, changelog, created_at, updated_at)
     VALUES (?, ?, ?, 'candidate', ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const template of SCHEMA_TEMPLATE_SEEDS) {
    const res = insertSchemaTemplate.run(
      template.id,
      template.domain,
      template.name,
      template.version,
      JSON.stringify(template.schema),
      JSON.stringify(template.requiredFields),
      JSON.stringify(template.validationRules),
      JSON.stringify(template.uiHints),
      template.changelog,
      now,
      now,
    );
    if (res.changes > 0) createdSchemaTemplates++;
  }

  // ── Profils de routage LLM par tâche/rôle (validés, inertes sans clé) ────
  seedTaskModelProfiles(db, now);

  return {
    users: createdUsers,
    personas: createdPersonas,
    rooms: createdRooms,
    resources: createdResources,
    schemaTemplates: createdSchemaTemplates,
  };
}

// Exécution directe : `npm run seed`.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedAll()
    .then((r) => {
      console.log(
        `[seed] créés → users:${r.users} personas:${r.personas} rooms:${r.rooms} resources:${r.resources} schemaTemplates:${r.schemaTemplates}`,
      );
      process.exit(0);
    })
    .catch((e) => {
      console.error('[seed] échec :', e);
      process.exit(1);
    });
}
