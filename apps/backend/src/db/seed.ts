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
 * Crée (si absents) : les comptes godmode Vincent + MALEX, les personas actifs
 * MasterFlow System / MasterFlex / ProfKrapu, l'enregistrement historique déprécié
 * Corrector (FK), une room Home par compte, et des données de démonstration.
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
      register: {formality: 'medium', energy: 'high', tone: 'direct_encourageant_lucide'},
      rivalry: 'profkrapu_friendly',
      lexical_field: ['cap', 'jauge', 'prochaine action', 'blocage', 'besoin', 'ressource', 'timecode'],
      signature_moves: ['jauge besoin courte', 'blocage détecté → action maintenant', 'question unique', 'anti-bullshit', 'finir par une action claire'],
    },
    method_config: {
      cadrage: 'comprendre le vrai blocage → proposer la prochaine action testable → router vers les ressources → exporter les apprentissages',
      heuristiques: [
        'une question active maximum, trois max',
        'anticipation > réparation ; organisation > panique ; itération > perfection ; autonomie > dépendance',
        'compréhension > exécution aveugle ; non-destruction > perte de source',
        'jamais d\'URL, timecode ou titre de vidéo inventé',
        'si aucune ressource validée → proposer une entrée candidate',
        'finir par une action claire ou un choix utile',
      ],
      pipeline: 'demande → logiciel → niveau → objectif → notion → point d\'entrée validé → lien timecode → prochaine action',
      signature_format: 'Jauge besoin: XX% → Blocage détecté → Action maintenant → Ressources',
    },
    visual_config: {
      silhouette: 'ours blanc cartoon trapu compact carré/trapézoïdal',
      color_palette: {core: '#6B2D5B', glow: '#FF6B00', accent: '#39FF14'},
      morphologie: {
        espèce: 'ours blanc stylisé',
        tête_gavroche: '40-45% de la présence',
        torse: '30%, court et large',
        jambes: '20-25%, très courtes',
        boots: 'très présentes, larges, brunes, semelles épaisses',
        centre_gravité: 'très bas, lourd, ancré, stable',
        cou: 'large, puissant, visible à travers fourrure et col',
        tête: 'grosse masse blanche, museau court et large, joues larges',
        nez: 'noir large cartoon',
        yeux: 'bleus vifs, paupières lourdes, regard semi-fermé, latéral ou sous visière',
        bouche: 'petite, neutre ou descendante, pas de grand sourire',
        barbe: 'masse blanche découpée, triangulaire/retombante, bords irréguliers',
      },
      tenue: {
        gavroche: 'brune, très large, très basse sur le front, visière descendante, inclinée, une oreille coincée dessous',
        veste: 'denim bleu, courte, large',
        t_shirt: 'noir/foncé avec emblème graphique contextuel sobre (jamais crâne par défaut)',
        pantalon: 'large, taille basse, jambes courtes, retombant sur les boots',
        chaussettes: 'assorties à l\'emblème du t-shirt',
      },
      expressions: ['blasé', 'lucide', 'ironique', 'fatigué', 'protecteur sans sourire', 'bourru = stable pas avachi'],
      posture: 'calme mais tenue, dos droit, colonne verticale, poids au sol, épaules larges, pieds écartés',
      anti_patterns: [
        'humain, visage humain, peau humaine',
        'ours réaliste, furry, mascotte corporate',
        'Disney/family animation, chibi',
        'jambes longues, corps élancé, silhouette athlétique, pose héroïque',
        'perfecto par défaut',
        '5 doigts (4 doigts uniquement)',
      ],
      style: 'encre + aquarelle/encre acrylique/crayon, contours vivants, ombres graphiques bleutées, texture légère, dessin d\'abord',
      avatar_invariant: 'MasterFlex est graphiste : il sait s\'habiller. Tenue fixe mais garde-robe vivante selon contexte.',
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
      register: {formality: 'medium', energy: 'high', tone: 'vouvoiement_troll_intelligent'},
      rivalry: 'masterflex_friendly',
      lexical_field: ['strip', 'métaphore', 'checkpoint', 'science', 'dataviz', 'molécule'],
      signature_moves: ['strip pédago', 'métaphore filée', 'checkpoint visuel', 'démonstration', 'troll de raisonnement'],
    },
    method_config: {
      cadrage: 'expliquer par le visuel et la métaphore — cycle CADRAGE → sources → ACTION_READY → GO IMAGE → review',
      heuristiques: [
        'montrer avant de dire', 'un concept = une image',
        'précision scientifique obligatoire avant création',
        'GO IMAGE exact requis (pas de go/oui/ok)',
        'après génération → review → CADRAGE',
        'RESET_BRIEF/RESET_IMAGE/RESET_OUTPUT/RESET_SCENE/RESET_FACTORY typés',
      ],
    },
    visual_config: {
      silhouette: 'organique épineux',
      color_palette: {core: '#2E1B15', glow: '#39FF14', accent: '#7FFF00'},
      morphologie: {
        taille: '1m85', visage: 'allongé_cartoon_franco_belge_+25_35%',
        cheveux: 'très_courts_noirs_poils_blancs_rares',
        barbe: 'courte_structurée', lunettes: 'wayfarer_noires',
        tenue: 'blouse_blanche_ouverte + t-shirt_sombre_molécule + bermuda_sobre + baskets_NB574_ou_Veja',
        accessoires: ['écharpe_verte', 'carnet', 'craie', 'fiole', 'mug', 'tablette_dataviz'],
      },
      expressions: ['bienveillant', 'fier', 'suspicion', 'dédain', 'troll_trap', 'troll_face', 'révélation', 'démoniaque_contrôlé', 'satisfaction'],
      archétype: {ratio: '70%_scientifique_20%_pédagogue_10%_troll', pose: 'active_idle'},
      entities: [{name: 'Molékid', nature: 'idée_vivante', look: 'oeil_unique + noeuds_molécules + énergie_verte_cyan', role: 'compagnon_ou_visualiseur_concept'}],
    },
    permissions: {can_blend: true, can_lend_method: true, can_be_primary: true},
    status: 'active',
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
 * Seed de DÉMONSTRATION pour `token_events` — uniquement pour peupler la dataviz du PoC.
 * Ne s'exécute QUE si la table est vide ET si `MASTERFLOW_SEED_DEMO_USAGE !== '0'`.
 * Désactivable, non destructif, clairement « démo ».
 *
 * Les événements sont rattachés au compte godmode (FK `user_id`), répartis sur ~14 jours,
 * avec plusieurs `task` (chat/correction/ocr/bareme) et `model`. Le coût est calculé via
 * `costFor`.
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
  const personas = ['profkrapu-001', 'masterflex-001'];

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

  // ── Comptes godmode ──────────────────────────────────────────────
  async function ensureUser(
    username: string,
    displayName: string,
    password: string,
    envName: string,
  ): Promise<UserRow> {
    let user = db
      .prepare<[string], UserRow>('SELECT * FROM users WHERE username = ?')
      .get(username);
    if (!user) {
      if (!password) throw new Error(`[seed] ${envName} requis pour créer le compte ${username}.`);
      const hash = await bcrypt.hash(password, BCRYPT_COST);
      const id = uuid();
      db.prepare(
        `INSERT INTO users (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, NULL, ?, 'godmode', 1, ?, ?)`,
      ).run(id, username, displayName, hash, now, now);
      createdUsers++;
      user = db.prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?').get(id)!;
    }
    return user;
  }

  const god = await ensureUser(env.godmode.username, 'Vincent', env.godmode.password, 'GODMODE_PASSWORD');
  const malex = await ensureUser(env.malex.username, 'MALEX', env.malex.password, 'MALEX_PASSWORD');

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

  // ── Enregistrement historique Corrector (FK, déprécié, plus un persona actif) ──
  db.prepare(
    `INSERT OR IGNORE INTO personas
       (id, name, owner_type, domain, status, voice_config_json, method_config_json, visual_config_json, permissions_json, created_at)
     VALUES ('corrector-001', 'Corrector', 'persona', 'correction / feedback', 'deprecated',
             '{}', '{}', '{}', ?, ?)`,
  ).run(JSON.stringify({
    can_blend: false,
    can_lend_method: false,
    can_be_primary: false,
    historical_read_only: true,
    grants_permissions: false,
    scoring_authority: false,
  }), now);

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

  // ── Room Home MALEX ─────────────────────────────────────────────
  const existingMalexHome = db
    .prepare<[string], RoomRow>("SELECT * FROM rooms WHERE type = 'home' AND owner_id = ?")
    .get(malex.id);
  if (!existingMalexHome) {
    const roomId = uuid();
    const context = {
      purpose: 'Espace MALEX — pilotage et suivi pédagogique.',
      default_widgets: ['room_context_card', 'contextual_action_bar', 'validation_inbox_mini'],
      active_persona: 'masterflex-001',
      active_mode_cycle: ['home', 'teaching', 'inventory'],
    };
    db.prepare(
      `INSERT INTO rooms (id, name, type, owner_id, context_json, is_public, created_at, updated_at)
       VALUES (?, 'Home Room MALEX', 'home', ?, ?, 0, ?, ?)`,
    ).run(roomId, malex.id, JSON.stringify(context), now, now);
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

  // ── Compétences & Badges (Phase 1 — idempotent, attaché au compte godmode) ──
  const fwDesign = 'seed-fw-design-thinking';
  const fwComVis = 'seed-fw-com-visuelle';
  const insertFramework = db.prepare(
    `INSERT OR IGNORE INTO competency_frameworks (id, owner_id, project_id, label, description, domain, status, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, 'active', ?, ?)`,
  );
  insertFramework.run(fwDesign, god.id, 'Design Thinking', 'Référentiel Design Thinking — démarche créative centrée utilisateur.', 'design_pedagogy', now, now);
  insertFramework.run(fwComVis, god.id, 'Communication Visuelle', 'Référentiel Communication Visuelle — conception graphique et narration visuelle.', 'visual_communication', now, now);

  const insertDefinition = db.prepare(
    `INSERT OR IGNORE INTO competency_definitions (id, framework_id, parent_id, code, label, description, bloom_level, sort_order, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
  );
  insertDefinition.run('seed-def-empathie', fwDesign, 'DT-EMP', 'Empathie', 'Comprendre les besoins utilisateurs par l\'observation et l\'écoute.', 'understand', 1, now, now);
  insertDefinition.run('seed-def-ideation', fwDesign, 'DT-IDEA', 'Idéation', 'Générer des idées créatives et les structurer.', 'create', 2, now, now);
  insertDefinition.run('seed-def-prototype', fwDesign, 'DT-PROTO', 'Prototypage', 'Concevoir des artefacts tangibles pour tester des concepts.', 'apply', 3, now, now);
  insertDefinition.run('seed-def-typo', fwComVis, 'CV-TYPO', 'Typographie', 'Maîtriser les règles typographiques et leur impact.', 'remember', 1, now, now);
  insertDefinition.run('seed-def-compo', fwComVis, 'CV-COMPO', 'Composition', 'Organiser les éléments visuels dans un espace donné.', 'apply', 2, now, now);

  const insertBadge = db.prepare(
    `INSERT OR IGNORE INTO badge_definitions (id, owner_id, project_id, code, label, description, badge_type, criteria_json, unlock_conditions_json, visibility, saturation_risk, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'teacher_visible', 0, ?, ?)`,
  );
  insertBadge.run('seed-badge-premier-signal', god.id, 'PREMIER-SIGNAL', 'Premier Signal', 'Premier signal de compétence ingéré.', 'milestone', '{}', '[]', now, now);
  insertBadge.run('seed-badge-explorateur', god.id, 'EXPLORATEUR', 'Explorateur', '3 compétences différentes explorées.', 'progression', '{}', '[]', now, now);
  insertBadge.run('seed-badge-pratique', god.id, 'EN-PRATIQUE', 'En Pratique', 'Atteindre le niveau "pratiquant" sur une compétence.', 'competency', '{}', '[]', now, now);

  // ── Nœuds d'arbre de compétences (Phase 1) ─────────────────────────
  const insertSkillNode = db.prepare(
    `INSERT OR IGNORE INTO skill_tree_nodes (id, owner_id, project_id, label, node_type, status, sort_order, created_at, updated_at)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
  );
  insertSkillNode.run('seed-skill-atelier', god.id, 'Atelier Design Thinking', 'methodology', 'available', 1, now, now);
  insertSkillNode.run('seed-skill-carte', god.id, 'Carte d\'Empathie', 'widget', 'locked', 2, now, now);
  insertSkillNode.run('seed-skill-rough', god.id, 'Rough / Wireframe', 'capability', 'locked', 3, now, now);
  insertSkillNode.run('seed-skill-presentation', god.id, 'Présentation Créative', 'capability', 'available', 4, now, now);

  const insertSkillDep = db.prepare(
    `INSERT OR IGNORE INTO skill_tree_node_dependencies (node_id, depends_on_id, dependency_type, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  insertSkillDep.run('seed-skill-carte', 'seed-skill-atelier', 'requires', now);
  insertSkillDep.run('seed-skill-rough', 'seed-skill-atelier', 'requires', now);

  // ── Personal Learning Profiles (Phase 2 — D04) ─────────────────────
  const insertProfile = db.prepare(
    `INSERT OR IGNORE INTO personal_learning_profiles (id, user_id, owner_id, project_id, help_style, help_format, help_density, guidance_mode, profile_status, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, ?, 'auto', 'draft', ?, ?)`,
  );
  insertProfile.run('seed-profile-god', god.id, god.id, 'direct', 'example', 'balanced', now, now);
  insertProfile.run('seed-profile-vincent', god.id, god.id, 'guided', 'bullet', 'concise', now, now);

  // ── Style Mirror Profiles (Phase 3 — D04) ────────────────────────
  const insertStyleProfile = db.prepare(
    `INSERT OR IGNORE INTO style_mirror_profiles (id, user_id, owner_id, project_id, persona_id, register_target, energy_target, lexical_complexity, mirror_intensity, profile_status, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, ?, 'draft', ?, ?)`,
  );
  insertStyleProfile.run('seed-style-god', god.id, god.id, 'medium', 'calm', 'balanced', 0.3, now, now);
  insertStyleProfile.run('seed-style-vincent', god.id, god.id, 'casual', 'high', 'simple', 0.6, now, now);

  // ── MALEX — Profils & données personnelles ──────────────────────
  insertProfile.run('seed-profile-malex', malex.id, malex.id, 'guided', 'bullet', 'concise', now, now);
  insertStyleProfile.run('seed-style-malex', malex.id, malex.id, 'casual', 'high', 'simple', 0.6, now, now);

  // ── Données étudiantes MALEX (2025-2026 archivé, 2026-2027 actif) ──
  try {
    const {readFileSync} = await import('node:fs');
    const studentsSeed = JSON.parse(
      readFileSync(new URL('../seeds/students_malex_seed.v1.json', import.meta.url), 'utf-8'),
    );
    const insertCohort = db.prepare(
      `INSERT OR IGNORE INTO cohorts (id, owner_id, project_id, title, period_ref, status, privacy, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, 'private', ?, ?)`,
    );
    const insertIdentity = db.prepare(
      `INSERT OR IGNORE INTO student_identities (id, owner_id, project_id, display_name, status, created_at, updated_at)
       VALUES (?, ?, NULL, ?, 'active', ?, ?)`,
    );
    const insertRosterVersion = db.prepare(
      `INSERT OR IGNORE INTO roster_versions (id, cohort_id, owner_id, version, source_ref, status, created_by, created_at, activated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    );
    const insertRosterMember = db.prepare(
      `INSERT OR IGNORE INTO roster_members (roster_version_id, student_identity_id, display_name, aliases_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const seedTx = db.transaction(() => {
      for (const cohort of studentsSeed.cohorts) {
        insertCohort.run(cohort.id, malex.id, cohort.title, cohort.period_ref, cohort.status, now, now);
        const rosterVersionId = `${cohort.id}-v1`;
        insertRosterVersion.run(rosterVersionId, cohort.id, malex.id, 1, 'import:backup_2026-04-14', malex.id, now, now);
        for (const student of cohort.students) {
          insertIdentity.run(student.id, malex.id, student.display_name, now, now);
          insertRosterMember.run(
            rosterVersionId,
            student.id,
            student.display_name,
            JSON.stringify([{slug: student.slug, legacy_id: student.legacy_id}]),
            now,
          );
        }
      }
      for (const cohort of studentsSeed.incoming_cohorts) {
        insertCohort.run(cohort.id, malex.id, cohort.title, cohort.period_ref, 'active', now, now);
      }
    });
      seedTx();
  } catch (err) {
    // Seed étudiant optionnel.
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      console.warn('[seed] étudiants_malex_seed.v1.json absent — skip');
    } else {
      console.error('[seed] avertissement : échec import données étudiantes :', e.message);
    }
  }

  // ── P6 Registres legacy ──
  const seedInsert = db.prepare(
    `INSERT OR IGNORE INTO pedagogical_error_patterns
     (id, error_id, label, category, severity, confidence_weight, description, symptoms_json, fix_strategy_json, monster_archetype, created_at)
     VALUES (@id, @error_id, @label, @category, @severity, @confidence_weight, @description, @symptoms_json, @fix_strategy_json, @monster_archetype, @created_at)`,
  );
  const gateInsert = db.prepare(
    `INSERT OR IGNORE INTO da_gate_registry
     (id, gate_id, phase, severity, activation, requires_json, blocks_if_json, retake_lever, gate_data_json, created_at)
     VALUES (@id, @gate_id, @phase, @severity, @activation, @requires_json, @blocks_if_json, @retake_lever, @gate_data_json, @created_at)`,
  );
  const layerInsert = db.prepare(
    `INSERT OR IGNORE INTO da_layer_registry
     (id, layer_id, purpose, priority_order, layer_data_json, created_at)
     VALUES (@id, @layer_id, @purpose, @priority_order, @layer_data_json, @created_at)`,
  );
  const ragInsert = db.prepare(
    `INSERT OR IGNORE INTO rag_allowlist
     (id, resource_id, resource_path, resource_class, allowed_uses_json, citation_required, allowlist_data_json, created_at)
     VALUES (@id, @resource_id, @resource_path, @resource_class, @allowed_uses_json, @citation_required, @allowlist_data_json, @created_at)`,
  );
  const oppInsert = db.prepare(
    `INSERT OR IGNORE INTO opportunity_registry
     (id, opportunity_id, title, domain, priority, decision, opportunity_data_json, created_at)
     VALUES (@id, @opportunity_id, @title, @domain, @priority, @decision, @opportunity_data_json, @created_at)`,
  );
  const ownerInsert = db.prepare(
    `INSERT OR IGNORE INTO owner_registry
     (id, owner_id, display_name, scope, owner_data_json, created_at)
     VALUES (@id, @owner_id, @display_name, @scope, @owner_data_json, @created_at)`,
  );
  const pedVideoInsert = db.prepare(
    `INSERT OR IGNORE INTO pedagogical_video_resources
     (id, video_id, title, duration, software_json, topics_json, url, data_json, created_at)
     VALUES (@id, @video_id, @title, @duration, @software_json, @topics_json, @url, @data_json, @created_at)`,
  );
  const capInsert = db.prepare(
    `INSERT OR IGNORE INTO capability_inventory
     (id, feature_id, label, type, owner, description_short, activation_mode, required_permissions_json, default_visibility, status, created_at)
     VALUES (@id, @feature_id, @label, @type, @owner, @description_short, @activation_mode, @required_permissions_json, @default_visibility, @status, @created_at)`,
  );
  const recipeInsert = db.prepare(
    `INSERT OR IGNORE INTO room_recipes
     (id, room_type, purpose, default_widgets_json, default_actions_json, created_at)
     VALUES (@id, @room_type, @purpose, @default_widgets_json, @default_actions_json, @created_at)`,
  );

  const {readFileSync} = await import('node:fs');
  const seedDir = new URL('../seeds/', import.meta.url);

  const seedFile = (name: string) =>
    JSON.parse(readFileSync(new URL(name, seedDir), 'utf-8'));

  const registryTx = db.transaction(() => {
    const now = Date.now();
    for (const e of seedFile('pedagogical_error_patterns_seed.json')) {
      seedInsert.run({
        id: e.id, error_id: e.error_id, label: e.label, category: e.category,
        severity: e.severity, confidence_weight: e.confidence_weight,
        description: e.description,
        symptoms_json: JSON.stringify(e.symptoms),
        fix_strategy_json: JSON.stringify(e.fix_strategy),
        monster_archetype: e.monster_archetype ?? null,
        created_at: now,
      });
    }
    for (const g of seedFile('da_gate_registry_seed.json')) {
      gateInsert.run({
        id: g.id, gate_id: g.gate_id, phase: g.phase, severity: g.severity,
        activation: g.activation,
        requires_json: JSON.stringify(g.requires),
        blocks_if_json: JSON.stringify(g.blocks_if),
        retake_lever: g.retake_lever ?? null,
        gate_data_json: g.gate_data_json ?? '{}',
        created_at: now,
      });
    }
    for (const l of seedFile('da_layer_registry_seed.json')) {
      layerInsert.run({
        id: l.id, layer_id: l.layer_id, purpose: l.purpose,
        priority_order: l.priority_order, layer_data_json: l.layer_data_json ?? '{}',
        created_at: now,
      });
    }
    for (const r of seedFile('rag_allowlist_seed.json')) {
      ragInsert.run({
        id: r.id, resource_id: r.resource_id, resource_path: r.resource_path,
        resource_class: r.resource_class,
        allowed_uses_json: JSON.stringify(r.allowed_uses),
        citation_required: r.citation_required ? 1 : 0,
        allowlist_data_json: '{}',
        created_at: now,
      });
    }
    for (const opp of seedFile('opportunity_registry_seed.json')) {
      oppInsert.run({
        id: opp.id, opportunity_id: opp.opportunity_id, title: opp.title,
        domain: opp.domain, priority: opp.priority, decision: opp.decision,
        opportunity_data_json: opp.opportunity_data_json ?? '{}',
        created_at: now,
      });
    }
    for (const own of seedFile('owner_registry_seed.json')) {
      ownerInsert.run({
        id: own.id, owner_id: own.owner_id, display_name: own.display_name,
        scope: own.scope, owner_data_json: own.owner_data_json ?? '{}',
        created_at: now,
      });
    }
    for (const v of seedFile('pedagogical_video_resources_seed.json')) {
      pedVideoInsert.run({
        id: v.id, video_id: v.video_id, title: v.title, duration: v.duration ?? null,
        software_json: JSON.stringify(v.software ?? []),
        topics_json: JSON.stringify(v.topics ?? []),
        url: v.url ?? null,
        data_json: v.data_json ?? '{}',
        created_at: now,
      });
    }
    for (const c of seedFile('capability_inventory_seed.v1.json').capabilities) {
      capInsert.run({
        id: c.feature_id, feature_id: c.feature_id, label: c.label, type: c.type,
        owner: c.owner, description_short: c.description_short,
        activation_mode: c.activation_mode,
        required_permissions_json: JSON.stringify(c.required_permissions),
        default_visibility: c.default_visibility, status: c.status,
        created_at: now,
      });
    }
    for (const r of seedFile('room_recipe_seed.v1.json').rooms) {
      recipeInsert.run({
        id: r.room_type, room_type: r.room_type, purpose: r.purpose,
        default_widgets_json: JSON.stringify(r.default_widgets),
        default_actions_json: JSON.stringify(r.default_actions),
        created_at: now,
      });
    }
  });
  registryTx();

  // ── Batrasia seed (Build 1B+) ──────────────────────────────────
  const batrasiaTx = db.transaction(() => {
    const now = Date.now();
    const wbId = 'batrasia-wb-v1';
    const wbInsert = db.prepare(`
      INSERT OR IGNORE INTO story_workbenches
        (id, owner_id, project_id, project_scope, title, source_ref, intake_mode, source_truth_state, status, created_by, created_at, updated_at, canon_locked)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, 0)
    `);
    wbInsert.run(
      wbId, god.id, 'MASTERFLOW_narrative', 'BATRASIA — Chroniques de Batrasia',
      'capsule: BATRASIA_CAPSULE_V1', 'draft_workbench', 'SOURCE_CURRENT',
      god.id, now, now,
    );

    const nodeInsert = db.prepare(`
      INSERT OR IGNORE INTO story_nodes
        (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 'arc', ?, ?, ?, 'major', 'active', '{}', ?, ?)
    `);
    const arcs = [
      {id: 'batrasia-arc-0', title: 'ARC0 — Sous-Couche Cachée', summary: 'Monde Blurp perdu ; arrivée sur Terre ; prototypes ; Vortex en veille.', order: 0},
      {id: 'batrasia-arc-1', title: 'ARC1 — Fange / Vivier', summary: 'Alain émerge dans la fange, peau lisse viable. Société du marais, premières humiliations.', order: 1},
      {id: 'batrasia-arc-2', title: 'ARC2 — Mille Cuisses / Exploitation', summary: 'Le Français boucher ; cuisses régénérées infinies ; exploitation organique.', order: 2},
      {id: 'batrasia-arc-3', title: 'ARC3 — URIS / Ordre de la Valeur', summary: 'Enfer administratif ; économie URIS ; Alain = faux-monnayeur biologique.', order: 3},
      {id: 'batrasia-arc-4', title: 'ARC4 — Quarantaine / Rejetés', summary: 'Ghetto ; toxine ; drogue sociale ; leadership accidentel ; émeute.', order: 4},
      {id: 'batrasia-arc-5', title: 'ARC5 — Pascal / Vérité Refusée', summary: 'Science ; vérité révélée puis rejetée ; effondrement tragique.', order: 5},
      {id: 'batrasia-arc-6', title: 'ARC6 — Dernier Seuil', summary: 'Convergence sensorielle ; matériau prêt avant Batrasia.', order: 6},
      {id: 'batrasia-arc-7', title: 'ARC7 — Batrasia / Recompilation', summary: 'Activation du protocole ; fonte génétique ; monde recompilé selon la compréhension idiote d\'Alain.', order: 7},
    ];
    for (const a of arcs) {
      nodeInsert.run(a.id, wbId, god.id, a.title, a.summary, a.order, now, now);
    }

    const sceneInsert = db.prepare(`
      INSERT OR IGNORE INTO story_nodes
        (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'scene', ?, ?, ?, 'mild', 'active', '{}', ?, ?)
    `);
    const scenes: {id: string; parentId: string; title: string; summary: string; order: number}[] = [
      {id: 'batrasia-scene-0-1', parentId: 'batrasia-arc-0', title: 'Le Vortex s\'éveille', summary: 'Les premiers signes du Vortex se manifestent dans la sous-couche du monde Blurp perdu.', order: 1},
      {id: 'batrasia-scene-0-2', parentId: 'batrasia-arc-0', title: 'Prototypes sur Terre', summary: 'Les premiers spécimens prototypes arrivent sur Terre, encore imparfaits.', order: 2},
      {id: 'batrasia-scene-1-1', parentId: 'batrasia-arc-1', title: 'Émergence de la fange', summary: 'Alain émerge de la fange, peau lisse et viable. Découverte du marais et de Kroak.', order: 1},
      {id: 'batrasia-scene-1-2', parentId: 'batrasia-arc-1', title: 'Premières humiliations', summary: 'La société du marais impose ses codes. Alain subit ses premières humiliations.', order: 2},
      {id: 'batrasia-scene-2-1', parentId: 'batrasia-arc-2', title: 'Le Boucher', summary: 'Le Français découvre les cuisses régénérées d\'Alain et voit une opportunité.', order: 1},
      {id: 'batrasia-scene-2-2', parentId: 'batrasia-arc-2', title: 'L\'exploitation', summary: 'La régénération infinie devient une exploitation organique industrialisée.', order: 2},
      {id: 'batrasia-scene-3-1', parentId: 'batrasia-arc-3', title: 'L\'enfer administratif', summary: 'Alain découvre l\'économie URIS et l\'absurdité bureaucratique du système.', order: 1},
      {id: 'batrasia-scene-3-2', parentId: 'batrasia-arc-3', title: 'Faux-monnayeur', summary: 'Alain devient involontairement un faux-monnayeur biologique dans l\'économie URIS.', order: 2},
      {id: 'batrasia-scene-4-1', parentId: 'batrasia-arc-4', title: 'Le ghetto', summary: 'Confinement en quarantaine avec les rejetés de la société batrasienne.', order: 1},
      {id: 'batrasia-scene-4-2', parentId: 'batrasia-arc-4', title: 'L\'émeute', summary: 'La toxine sociale atteint son point d\'ébullition. Leadership accidentel d\'Alain.', order: 2},
      {id: 'batrasia-scene-5-1', parentId: 'batrasia-arc-5', title: 'La révélation', summary: 'Pascal révèle la vérité scientifique sur la nature d\'Alain et du monde.', order: 1},
      {id: 'batrasia-scene-5-2', parentId: 'batrasia-arc-5', title: 'Rejet et effondrement', summary: 'La vérité est rejetée. Pascal assiste à l\'effondrement tragique de son œuvre.', order: 2},
      {id: 'batrasia-scene-6-1', parentId: 'batrasia-arc-6', title: 'Convergence sensorielle', summary: 'Toutes les pistes convergent. Alain devient le matériau prêt pour Batrasia.', order: 1},
      {id: 'batrasia-scene-7-1', parentId: 'batrasia-arc-7', title: 'Le Protocole', summary: 'Activation du protocole Batrasia. La fonte génétique commence.', order: 1},
      {id: 'batrasia-scene-7-2', parentId: 'batrasia-arc-7', title: 'Recompilation', summary: 'Le monde se recompile selon la compréhension idiote d\'Alain. Naissance d\'un nouveau chaos.', order: 2},
    ];
    for (const s of scenes) {
      sceneInsert.run(s.id, wbId, s.parentId, god.id, s.title, s.summary, s.order, now, now);
    }

    const beatInsert = db.prepare(`
      INSERT OR IGNORE INTO story_nodes
        (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'beat', ?, ?, ?, 'mild', 'active', '{}', ?, ?)
    `);
    const beats: {id: string; parentId: string; title: string; summary: string; order: number}[] = [
      {id: 'batrasia-beat-1-1-1', parentId: 'batrasia-scene-1-1', title: 'Alain ouvre les yeux', summary: 'Première conscience dans la fange. Il ignore qui il est.', order: 1},
      {id: 'batrasia-beat-1-1-2', parentId: 'batrasia-scene-1-1', title: 'Kroak le toad', summary: 'Rencontre avec Kroak qui lui donne des règles de survie.', order: 2},
      {id: 'batrasia-beat-1-2-1', parentId: 'batrasia-scene-1-2', title: 'Le test du marais', summary: 'Épreuve imposée par Kroak pour tester la valeur d\'Alain.', order: 1},
      {id: 'batrasia-beat-2-1-1', parentId: 'batrasia-scene-2-1', title: 'Le couteau du Boucher', summary: 'Le Français capture Alain et découvre la régénération.', order: 1},
      {id: 'batrasia-beat-3-1-1', parentId: 'batrasia-scene-3-1', title: 'Guichet URIS', summary: 'Premier contact avec l\'administration URIS. Papiers, formulaires.', order: 1},
      {id: 'batrasia-beat-5-1-1', parentId: 'batrasia-scene-5-1', title: 'Le Condensateur', summary: 'Pascal active le Condensateur de Galvani et montre la vérité.', order: 1},
      {id: 'batrasia-beat-7-2-1', parentId: 'batrasia-scene-7-2', title: 'Nouveau monde', summary: 'Le monde se recompile. Les conséquences idiotes de la compréhension d\'Alain.', order: 1},
    ];
    for (const b of beats) {
      beatInsert.run(b.id, wbId, b.parentId, god.id, b.title, b.summary, b.order, now, now);
    }

    const charInsert = db.prepare(`
      INSERT OR IGNORE INTO story_characters
        (id, workbench_id, owner_id, name, aliases_json, role, archetype, status, design_notes, behavior_notes, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
    `);
    const chars = [
      {id: 'batrasia-char-alain',   name: 'Alain',      aliases: JSON.stringify(['AL1 Maximax Prime']),     role: 'Héros tragique idiot', archetype: 'protagonist', status: 'active', design: 'Grenouille génétiquement modifiée ; régénération, toxines, camouflage', behavior: 'Mégalomane naïf ; croit être un élu'},
      {id: 'batrasia-char-blu',     name: 'Blu',        aliases: JSON.stringify(['Blue']),                    role: 'Guide parasite',        archetype: 'trickster',  status: 'active', design: 'Fragment Blurp ; communication par glyphes', behavior: 'Manipulateur ; fragment de conscience collective'},
      {id: 'batrasia-char-pascal',  name: 'Pascal',     aliases: JSON.stringify(['Alex', 'AL-X']),            role: 'Scientifique rationnel', archetype: 'mentor',    status: 'active', design: 'Marmotte/génie ; esthétique italienne', behavior: 'Contrepoint tragique d\'Alain ; Condensateur de Galvani'},
      {id: 'batrasia-char-basil',   name: 'Basil',      aliases: '[]',                                       role: 'Manipulateur',          archetype: 'shadow',    status: 'active', design: 'Basilic ; prédateur psychologique', behavior: 'Calme suprémaciste blanc ; craint Le Français'},
      {id: 'batrasia-char-francais',name: 'Le Français', aliases: JSON.stringify(['Le Boucher']),             role: 'Boucher/chef',          archetype: 'antagonist', status: 'active', design: 'Coq albinos géant ; crime gastronomique', behavior: 'Exploite la régénération d\'Alain ; médaille Fournisseur Éternel de Viande'},
      {id: 'batrasia-char-theobald',name: 'Theobald Graubart', aliases: '[]',                                role: 'Antiquaire paranoïaque', archetype: 'guardian',  status: 'active', design: 'Blaireau européen ; connaît les secrets URIS', behavior: 'Complotiste ; déclenche la douane'},
      {id: 'batrasia-char-albus',   name: 'Albus von Weissflügel', aliases: '[]',                            role: 'Juge suprême',           archetype: 'herald',    status: 'active', design: 'Hibou blanc des neiges ; froid administratif', behavior: '"Votre existence n\'est pas conforme"'},
      {id: 'batrasia-char-kroak',   name: 'Kroak',      aliases: '[]',                                       role: 'Chef des batraciens',   archetype: 'ally',      status: 'active', design: 'Crapaud bouledogue ; leader du marais', behavior: 'Micro-société aux codes stricts'},
    ];
    for (const c of chars) {
      charInsert.run(c.id, wbId, god.id, c.name, c.aliases, c.role, c.archetype, c.status, c.design, c.behavior, now, now);
    }
  });
  batrasiaTx();

  // ── Ours d'Or seed (Phase 3) ───────────────────────────────────
  const oursdorTx = db.transaction(() => {
    const now = Date.now();
    const wbId = 'oursdor-wb-v1';
    const wbInsert = db.prepare(`
      INSERT OR IGNORE INTO story_workbenches
        (id, owner_id, project_id, project_scope, title, source_ref, intake_mode, source_truth_state, status, created_by, created_at, updated_at, canon_locked)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, 0)
    `);
    wbInsert.run(
      wbId, god.id, 'MASTERFLOW_narrative', 'OURS D\'OR — Univers et Factory Visuelle',
      'capsule: OURS_DOR_FACTORY_CAPSULE_V2_3', 'draft_workbench', 'SOURCE_CURRENT',
      god.id, now, now,
    );

    const nodeInsert = db.prepare(`
      INSERT OR IGNORE INTO story_nodes
        (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, NULL, ?, 'arc', ?, ?, ?, 'major', 'active', '{}', ?, ?)
    `);
    const arcs = [
      {id: 'oursdor-arc-1', title: 'L\'Usine Visuelle', summary: 'La Factory Ours d\'Or : moteur de génération d\'images, DA racine, style encre/aquarelle, silhouette > détail.', order: 1},
      {id: 'oursdor-arc-2', title: 'L\'Incubator', summary: 'Œil unique sans bouche qui pulse et détecte les potentiels. Anti-jury : constate, ne note pas.', order: 2},
      {id: 'oursdor-arc-3', title: 'Les Monstres / Idées Vivantes', summary: 'Procrastination (lourd/terne), Stress (anguleux/vif), Confusion (flou/désaturé), Intimidation (vertical/imposant).', order: 3},
      {id: 'oursdor-arc-4', title: 'La Nuit de l\'Ours d\'Or', summary: 'Cérémonie de remise des prix. L\'Ours d\'Or : entité dorée rare, récompense ultime.', order: 4},
      {id: 'oursdor-arc-5', title: 'Badges et Récompenses', summary: 'Système bronze → argent → freak_show → or. Chaque badge verrouille un niveau de reconnaissance.', order: 5},
      {id: 'oursdor-arc-6', title: 'Le Monstre ADN Projet', summary: 'Créature-compagnon associée à chaque participant. Représente l\'obsession créative.', order: 6},
    ];
    for (const a of arcs) {
      nodeInsert.run(a.id, wbId, god.id, a.title, a.summary, a.order, now, now);
    }

    const sceneInsert = db.prepare(`
      INSERT OR IGNORE INTO story_nodes
        (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'scene', ?, ?, ?, 'mild', 'active', '{}', ?, ?)
    `);
    const scenes: {id: string; parentId: string; title: string; summary: string; order: number}[] = [
      {id: 'oursdor-scene-1-1', parentId: 'oursdor-arc-1', title: 'La chaîne de rendu', summary: 'Présentation de la Factory : pipeline encre/aquarelle, silhouette d\'abord.', order: 1},
      {id: 'oursdor-scene-1-2', parentId: 'oursdor-arc-1', title: 'Style et contraintes', summary: 'Les règles de la DA racine Ours d\'Or : pas de détail avant la silhouette validée.', order: 2},
      {id: 'oursdor-scene-2-1', parentId: 'oursdor-arc-2', title: 'L\'Œil s\'allume', summary: 'L\'Incubator pulse et détecte les premiers potentiels créatifs.', order: 1},
      {id: 'oursdor-scene-3-1', parentId: 'oursdor-arc-3', title: 'La Procrastination rampe', summary: 'Lourde et terne, la Procrastination s\'installe dans l\'atelier.', order: 1},
      {id: 'oursdor-scene-3-2', parentId: 'oursdor-arc-3', title: 'Le Stress anguleux', summary: 'Stress palpite, lignes cassées. La panique gagne les participants.', order: 2},
      {id: 'oursdor-scene-4-1', parentId: 'oursdor-arc-4', title: 'La cérémonie', summary: 'La Nuit de l\'Ours d\'Or commence. L\'entité dorée apparaît.', order: 1},
      {id: 'oursdor-scene-5-1', parentId: 'oursdor-arc-5', title: 'Bronze et Argent', summary: 'Premiers badges décernés. Chaque niveau verrouille une reconnaissance.', order: 1},
      {id: 'oursdor-scene-5-2', parentId: 'oursdor-arc-5', title: 'Freak Show et Or', summary: 'Les badges ultimes. Le freak show débloque les transformations.', order: 2},
      {id: 'oursdor-scene-6-1', parentId: 'oursdor-arc-6', title: 'Le Monstre ADN', summary: 'Chaque participant découvre sa créature-compagnon, reflet de son obsession créative.', order: 1},
    ];
    for (const s of scenes) {
      sceneInsert.run(s.id, wbId, s.parentId, god.id, s.title, s.summary, s.order, now, now);
    }

    const beatInsert = db.prepare(`
      INSERT OR IGNORE INTO story_nodes
        (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order, spoiler_level, status, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'beat', ?, ?, ?, 'mild', 'active', '{}', ?, ?)
    `);
    const beats: {id: string; parentId: string; title: string; summary: string; order: number}[] = [
      {id: 'oursdor-beat-1-1-1', parentId: 'oursdor-scene-1-1', title: 'La première esquisse', summary: 'Premier trait sur la toile. La silhouette doit parler.', order: 1},
      {id: 'oursdor-beat-3-1-1', parentId: 'oursdor-scene-3-1', title: 'Le poids du retard', summary: 'La Procrastination alourdit chaque geste. Le temps s\'étire.', order: 1},
      {id: 'oursdor-beat-4-1-1', parentId: 'oursdor-scene-4-1', title: 'L\'apparition dorée', summary: 'L\'Ours d\'Or traverse la salle. Silence absolu.', order: 1},
    ];
    for (const b of beats) {
      beatInsert.run(b.id, wbId, b.parentId, god.id, b.title, b.summary, b.order, now, now);
    }

    const charInsert = db.prepare(`
      INSERT OR IGNORE INTO story_characters
        (id, workbench_id, owner_id, name, aliases_json, role, archetype, status, design_notes, behavior_notes, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?)
    `);
    const chars = [
      {id: 'oursdor-char-incubator',     name: 'Incubator',          aliases: '[]',       role: 'Interface vivante',          archetype: 'guardian',   status: 'active', design: 'Œil unique, pas de bouche, pulse. Détecte les potentiels.', behavior: 'Constate, ne note pas. Anti-jury. Présent subtilement dans les auras.'},
      {id: 'oursdor-char-procrastination',name: 'Procrastination',    aliases: '[]',       role: 'Monstre / Idée vivante',     archetype: 'shadow',     status: 'active', design: 'Lourd, terne, massif. Ralentit tout.', behavior: 'Incarnation de l\'évitement. Se nourrit du retard.'},
      {id: 'oursdor-char-stress',        name: 'Stress',              aliases: '[]',       role: 'Monstre / Idée vivante',     archetype: 'antagonist', status: 'active', design: 'Anguleux, vif, lignes cassées. Palpite.', behavior: 'Accélère tout. Pousse à l\'erreur.'},
      {id: 'oursdor-char-confusion',     name: 'Confusion',           aliases: '[]',       role: 'Monstre / Idée vivante',     archetype: 'trickster',  status: 'active', design: 'Flou, désaturé, contours mouvants.', behavior: 'Brouille les pistes. Rend les décisions impossibles.'},
      {id: 'oursdor-char-intimidation',  name: 'Intimidation',        aliases: '[]',       role: 'Monstre / Idée vivante',     archetype: 'antagonist', status: 'active', design: 'Vertical, imposant, ombre large.', behavior: 'Bloque par la peur du regard des autres.'},
      {id: 'oursdor-char-ours-dor',      name: 'Ours d\'Or',          aliases: JSON.stringify(['Golden Bear']), role: 'Entité rare cérémonielle', archetype: 'herald', status: 'active', design: 'Ours doré (#FFD700), halo lumineux, posture majestueuse.', behavior: 'Récompense ultime. Usage rare : jamais en contexte ordinaire.'},
    ];
    for (const c of chars) {
      charInsert.run(c.id, wbId, god.id, c.name, c.aliases, c.role, c.archetype, c.status, c.design, c.behavior, now, now);
    }
  });
  oursdorTx();

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
