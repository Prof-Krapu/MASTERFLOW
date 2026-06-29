import Database from 'better-sqlite3';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

/**
 * Couche SQLite de MasterFlow — pattern repris de API_manage/server/db.ts.
 *
 * - Fichier DB dans `data/masterflow.db` (gitignored, survit aux rebuilds).
 * - Migrations idempotentes (`CREATE TABLE IF NOT EXISTS …`) exécutées au boot.
 * - UUID partout (pas d'auto-increment, sauf token_events).
 * - Timestamps en INTEGER (epoch ms). Champs flexibles en TEXT JSON (suffixe `_json`).
 *
 * Doctrine : « BDD = runtime vivant ». Le canon lent (Drive) n'est PAS stocké ici.
 */

// Chemin par défaut : data/masterflow.db. Overridable via MASTERFLOW_DB_PATH
// (ex. ':memory:' ou un fichier temporaire) pour des tests isolés.
const DB_PATH = process.env.MASTERFLOW_DB_PATH ?? resolve(process.cwd(), 'data', 'masterflow.db');

let db: Database.Database | null = null;

/** Instance singleton — ouvre la DB + applique les migrations au premier appel. */
export function getDb(): Database.Database {
  if (db) return db;

  if (DB_PATH !== ':memory:') {
    const dir = dirname(DB_PATH);
    if (!existsSync(dir)) mkdirSync(dir, {recursive: true});
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);
  return db;
}

export function dbPath(): string {
  return DB_PATH;
}

function migrate(d: Database.Database): void {
  d.exec(`
    -- ───────────────────────── Identité & sessions ─────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL,
      email         TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'student'
                      CHECK (role IN ('student','teacher','admin','godmode')),
      scope_json        TEXT,
      preferences_json  TEXT,
      active        INTEGER NOT NULL DEFAULT 1,
      auth_version  INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      last_login    INTEGER
    );

    -- JWT stateless : on ne stocke que les jetons révoqués (logout) jusqu'à expiration.
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti         TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      revoked_at  INTEGER NOT NULL,
      expires_at  INTEGER NOT NULL
    );

    -- Codes d'accès (invitations). L'inscription est sur invitation : un code porte le
    -- rôle pré-assigné. Le code n'est créé que pour un rôle ≤ rang du créateur (garde-fou
    -- côté engine, pas DB). used_count < max_uses ET non révoqué ET non expiré = valide.
    CREATE TABLE IF NOT EXISTS invitations (
      code        TEXT PRIMARY KEY,
      role        TEXT NOT NULL DEFAULT 'student'
                    CHECK (role IN ('student','teacher','admin','godmode')),
      created_by  TEXT NOT NULL REFERENCES users(id),
      max_uses    INTEGER NOT NULL DEFAULT 1,
      used_count  INTEGER NOT NULL DEFAULT 0,
      note        TEXT,
      expires_at  INTEGER,
      revoked_at  INTEGER,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    -- ───────────────────────── Projects / scopes / ownership ───────────────
    CREATE TABLE IF NOT EXISTS projects (
      id          TEXT PRIMARY KEY,
      owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','archived')),
      visibility  TEXT NOT NULL DEFAULT 'private'
                    CHECK (visibility = 'private'),
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role        TEXT NOT NULL
                    CHECK (role IN ('viewer','participant','editor','owner','admin')),
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS ownership_edges (
      id          TEXT PRIMARY KEY,
      owner_type  TEXT NOT NULL CHECK (owner_type IN ('user','project')),
      owner_id    TEXT NOT NULL,
      object_type TEXT NOT NULL,
      object_id   TEXT NOT NULL,
      scope       TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      UNIQUE(owner_type, owner_id, object_type, object_id, scope)
    );

    -- ───────────────────────── Cohortes / rosters versionnés ─────────────
    -- V1 manuelle et privée : aucun import, matching automatique ou écrasement historique.
    CREATE TABLE IF NOT EXISTS cohorts (
      id          TEXT PRIMARY KEY,
      owner_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
      title       TEXT NOT NULL,
      period_ref  TEXT,
      status      TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','archived')),
      privacy     TEXT NOT NULL DEFAULT 'private' CHECK (privacy = 'private'),
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_identities (
      id           TEXT PRIMARY KEY,
      owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id   TEXT REFERENCES projects(id) ON DELETE SET NULL,
      display_name TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','archived')),
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roster_versions (
      id           TEXT PRIMARY KEY,
      cohort_id    TEXT NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
      owner_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      version      INTEGER NOT NULL CHECK (version > 0),
      source_ref   TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active','archived')),
      created_by   TEXT NOT NULL REFERENCES users(id),
      created_at   INTEGER NOT NULL,
      activated_at INTEGER NOT NULL,
      UNIQUE(cohort_id, version)
    );

    CREATE TABLE IF NOT EXISTS roster_members (
      roster_version_id   TEXT NOT NULL REFERENCES roster_versions(id) ON DELETE CASCADE,
      student_identity_id TEXT NOT NULL REFERENCES student_identities(id),
      display_name        TEXT NOT NULL,
      aliases_json        TEXT NOT NULL DEFAULT '[]',
      created_at          INTEGER NOT NULL,
      PRIMARY KEY (roster_version_id, student_identity_id)
    );

    -- ───────────────────────── Inventory Core ─────────────────────────────
    CREATE TABLE IF NOT EXISTS inventory_collections (
      id                TEXT PRIMARY KEY,
      owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id        TEXT REFERENCES projects(id) ON DELETE CASCADE,
      scope_type        TEXT NOT NULL CHECK (scope_type IN ('user','project')),
      label             TEXT NOT NULL,
      description       TEXT,
      visibility_scope  TEXT NOT NULL DEFAULT 'private'
                          CHECK (visibility_scope IN ('private','project')),
      validation_status TEXT NOT NULL DEFAULT 'candidate'
                          CHECK (validation_status IN ('candidate','validated','archived')),
      completion_state  TEXT NOT NULL DEFAULT 'unknown'
                          CHECK (completion_state IN (
                            'unknown','selective','complete_declared','abandoned'
                          )),
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id                TEXT PRIMARY KEY,
      owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id        TEXT REFERENCES projects(id) ON DELETE CASCADE,
      collection_id     TEXT REFERENCES inventory_collections(id) ON DELETE SET NULL,
      scope_type        TEXT NOT NULL CHECK (scope_type IN ('user','project')),
      type              TEXT NOT NULL,
      label             TEXT NOT NULL,
      creator_or_brand  TEXT,
      item_status       TEXT NOT NULL DEFAULT 'detected'
                          CHECK (item_status IN (
                            'detected','owned_confirmed','owned_declared','wishlist',
                            'complete_declared','selective','not_interested','abandoned',
                            'duplicate','loan','sell_or_give','to_verify'
                          )),
      validation_status TEXT NOT NULL DEFAULT 'candidate'
                          CHECK (validation_status IN ('candidate','validated','archived')),
      intent            TEXT,
      quantity          INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      condition         TEXT,
      estimated_value   REAL,
      replacement_cost  REAL,
      usage_tags_json   TEXT NOT NULL DEFAULT '[]',
      source_refs_json  TEXT NOT NULL DEFAULT '[]',
      visibility_scope  TEXT NOT NULL DEFAULT 'private'
                          CHECK (visibility_scope IN ('private','project')),
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL,
      archived_at       INTEGER
    );

    CREATE TABLE IF NOT EXISTS collection_matches (
      id            TEXT PRIMARY KEY,
      item_id       TEXT NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
      collection_id TEXT NOT NULL REFERENCES inventory_collections(id) ON DELETE CASCADE,
      match_status  TEXT NOT NULL DEFAULT 'candidate'
                    CHECK (match_status IN ('candidate','confirmed','rejected')),
      confidence    REAL,
      source_ref    TEXT,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      UNIQUE(item_id, collection_id)
    );

    CREATE TABLE IF NOT EXISTS inventory_visibility (
      object_type  TEXT NOT NULL CHECK (object_type IN ('item','collection')),
      object_id    TEXT NOT NULL,
      scope_type   TEXT NOT NULL CHECK (scope_type IN ('user','project')),
      scope_id     TEXT NOT NULL,
      access_level TEXT NOT NULL DEFAULT 'read'
                   CHECK (access_level IN ('read','write','admin')),
      created_at   INTEGER NOT NULL,
      PRIMARY KEY (object_type, object_id, scope_type, scope_id)
    );

    CREATE TABLE IF NOT EXISTS inventory_project_needs (
      id             TEXT PRIMARY KEY,
      project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      owner_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label          TEXT NOT NULL,
      quantity       INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
      required_tags_json TEXT NOT NULL DEFAULT '[]',
      status         TEXT NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','satisfied','abandoned')),
      created_at     INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL
    );

    -- ───────────────────────── Rooms (UI Room OS) ──────────────────────────
    CREATE TABLE IF NOT EXISTS rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'home',
      owner_id    TEXT REFERENCES users(id),
      project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
      context_json TEXT,
      is_public   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    -- État vivant d'une room pour un utilisateur (zoom, surface, widgets).
    CREATE TABLE IF NOT EXISTS room_instances (
      id                TEXT PRIMARY KEY,
      room_id           TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      zoom_level        TEXT NOT NULL DEFAULT 'workspace',
      active_surface    TEXT NOT NULL DEFAULT 'workspace',
      cognitive_density TEXT NOT NULL DEFAULT 'medium',
      widget_state_json TEXT,
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL,
      UNIQUE(user_id, room_id)
    );

    CREATE TABLE IF NOT EXISTS room_checkpoints (
      id                       TEXT PRIMARY KEY,
      room_id                  TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      room_instance_id         TEXT NOT NULL REFERENCES room_instances(id) ON DELETE CASCADE,
      user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id               TEXT REFERENCES projects(id) ON DELETE CASCADE,
      reason                   TEXT NOT NULL
                                 CHECK (reason IN (
                                   'validation','mode_change','stable_activity',
                                   'pedagogical_progress','significant_mutation','manual_save'
                                 )),
      summary                  TEXT NOT NULL,
      active_widgets_json      TEXT NOT NULL DEFAULT '[]',
      active_mode              TEXT NOT NULL,
      decisions_json           TEXT NOT NULL DEFAULT '[]',
      open_loops_json          TEXT NOT NULL DEFAULT '[]',
      media_queue_refs_json    TEXT NOT NULL DEFAULT '[]',
      asset_queue_refs_json    TEXT NOT NULL DEFAULT '[]',
      resource_refs_json       TEXT NOT NULL DEFAULT '[]',
      next_recommended_action  TEXT,
      rollback_light_possible INTEGER NOT NULL DEFAULT 0,
      privacy_scope            TEXT NOT NULL DEFAULT 'private'
                                 CHECK (privacy_scope = 'private'),
      created_at               INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_cards (
      id                TEXT PRIMARY KEY,
      type              TEXT NOT NULL,
      owner_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id        TEXT REFERENCES projects(id) ON DELETE CASCADE,
      scope             TEXT NOT NULL CHECK (scope IN ('user','project')),
      source_ref        TEXT NOT NULL,
      extracted_signal  TEXT NOT NULL,
      distilled_value   TEXT NOT NULL,
      confidence        TEXT NOT NULL CHECK (confidence IN ('low','medium','high','validated')),
      privacy           TEXT NOT NULL CHECK (privacy IN ('public','private','sensitive','restricted')),
      affects_json      TEXT NOT NULL,
      status            TEXT NOT NULL CHECK (status IN ('candidate','active','stale','archived','rejected')),
      compression_level TEXT NOT NULL CHECK (compression_level IN ('L2','L3','L4')),
      invalidation_rule TEXT NOT NULL,
      next_action       TEXT,
      validated_by      TEXT REFERENCES users(id),
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memory_card_links (
      id                TEXT PRIMARY KEY,
      source_card_id    TEXT NOT NULL REFERENCES memory_cards(id) ON DELETE CASCADE,
      target_card_id    TEXT NOT NULL REFERENCES memory_cards(id) ON DELETE CASCADE,
      relation_type     TEXT NOT NULL CHECK (relation_type IN (
                            'supports','contradicts','extends','illustrates','related_to',
                            'broader','narrower','derived_from','requires_validation',
                            'triggers_action','references','used_in','blocks','unlocks'
                          )),
      relation_family   TEXT NOT NULL CHECK (relation_family IN (
                            'semantic','provenance','operational'
                          )),
      rationale         TEXT NOT NULL,
      source_ref        TEXT NOT NULL,
      confidence        TEXT NOT NULL CHECK (confidence IN ('low','medium','high','validated')),
      status            TEXT NOT NULL DEFAULT 'candidate'
                            CHECK (status IN ('candidate','active','rejected','archived')),
      created_by        TEXT NOT NULL REFERENCES users(id),
      validated_by      TEXT REFERENCES users(id),
      created_at        INTEGER NOT NULL,
      updated_at        INTEGER NOT NULL,
      CHECK (source_card_id <> target_card_id),
      UNIQUE(source_card_id, target_card_id, relation_type)
    );

    CREATE INDEX IF NOT EXISTS idx_memory_card_links_source
      ON memory_card_links(source_card_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_memory_card_links_target
      ON memory_card_links(target_card_id, status, updated_at);

    -- ───────────────────────── Personas & chimères ─────────────────────────
    CREATE TABLE IF NOT EXISTS personas (
      id            TEXT PRIMARY KEY,
      name          TEXT UNIQUE NOT NULL,
      owner_type    TEXT NOT NULL DEFAULT 'persona',
      domain        TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'active',
      voice_config_json   TEXT,
      method_config_json  TEXT,
      visual_config_json  TEXT,
      permissions_json    TEXT,
      created_at    INTEGER NOT NULL
    );

    -- Fusion active (chimère) : 1 primaire = porte-parole, 1 secondaire prêté.
    CREATE TABLE IF NOT EXISTS persona_blends (
      id                   TEXT PRIMARY KEY,
      room_instance_id     TEXT NOT NULL REFERENCES room_instances(id) ON DELETE CASCADE,
      primary_persona_id   TEXT NOT NULL REFERENCES personas(id),
      secondary_persona_id TEXT REFERENCES personas(id),
      blend_weights_json   TEXT,
      active_layers_json   TEXT,
      is_active            INTEGER NOT NULL DEFAULT 1,
      created_at           INTEGER NOT NULL,
      updated_at           INTEGER NOT NULL
    );

    -- ───────────────────────── Cycle de vie des actions ────────────────────
    CREATE TABLE IF NOT EXISTS actions (
      id              TEXT PRIMARY KEY,
      registry_id     TEXT,                       -- ref vers action_registry_seed (action_id)
      intent          TEXT NOT NULL,
      object_type     TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'draft',
      user_id         TEXT NOT NULL REFERENCES users(id),
      room_id         TEXT REFERENCES rooms(id),
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      engine          TEXT,
      risk_level      TEXT,
      payload_json    TEXT,
      preflight_json  TEXT,
      validator_id    TEXT REFERENCES users(id),
      validation_note TEXT,
      result_json     TEXT,
      error           TEXT,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hard_stop_control_states (
      id            TEXT PRIMARY KEY,
      owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      room_id       TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      status        TEXT NOT NULL CHECK (status IN ('active','released')),
      reason        TEXT NOT NULL CHECK (reason IN ('manual_owner_stop','hard_stop')),
      note          TEXT,
      activated_by  TEXT NOT NULL REFERENCES users(id),
      released_by   TEXT REFERENCES users(id),
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      released_at   INTEGER
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_hard_stop_owner_room_active
      ON hard_stop_control_states(owner_id, room_id)
      WHERE status = 'active';

    CREATE TABLE IF NOT EXISTS action_context_snapshots (
      id                         TEXT PRIMARY KEY,
      action_id                  TEXT NOT NULL UNIQUE REFERENCES actions(id) ON DELETE CASCADE,
      owner_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id                 TEXT REFERENCES projects(id) ON DELETE SET NULL,
      room_id                    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      room_instance_id           TEXT NOT NULL REFERENCES room_instances(id) ON DELETE CASCADE,
      action_intent              TEXT NOT NULL,
      action_payload_fingerprint TEXT NOT NULL,
      authoritative_refs_json    TEXT NOT NULL,
      checkpoint_ref_json        TEXT,
      hard_stop_state_ref        TEXT,
      context_fingerprint        TEXT NOT NULL,
      created_at                 INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_action_context_snapshots_owner_room
      ON action_context_snapshots(owner_id, room_id, created_at DESC);

    -- Trace immuable des décisions (permission, validation, exécution).
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id),
      action_id   TEXT REFERENCES actions(id),
      event_type  TEXT NOT NULL,
      scope       TEXT,
      detail_json TEXT,
      created_at  INTEGER NOT NULL
    );

    -- ───────────────────────── Shared Validation Inbox MVP ────────────────
    CREATE TABLE IF NOT EXISTS validation_inbox_items (
      id                       TEXT PRIMARY KEY,
      item_type                TEXT NOT NULL,
      title                    TEXT NOT NULL,
      summary                  TEXT NOT NULL,
      domain_refs_json         TEXT NOT NULL DEFAULT '[]',
      object_refs_json         TEXT NOT NULL DEFAULT '[]',
      source_refs_json         TEXT NOT NULL DEFAULT '[]',
      requester_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      required_validator       TEXT NOT NULL,
      status                   TEXT NOT NULL,
      risk_level               TEXT NOT NULL,
      privacy_scope            TEXT NOT NULL,
      source_truth_state       TEXT NOT NULL,
      output_readiness_state   TEXT NOT NULL,
      proposed_action          TEXT NOT NULL,
      impact_summary           TEXT NOT NULL,
      blocked_actions_json     TEXT NOT NULL DEFAULT '[]',
      allowed_actions_json     TEXT NOT NULL DEFAULT '[]',
      conflicts_json           TEXT NOT NULL DEFAULT '[]',
      open_questions_json      TEXT NOT NULL DEFAULT '[]',
      recommended_decision     TEXT,
      decision_options_json    TEXT NOT NULL DEFAULT '[]',
      decision_json            TEXT,
      audit_trace_json         TEXT NOT NULL DEFAULT '[]',
      source_kind              TEXT NOT NULL CHECK (source_kind IN (
                                 'action','feedback_draft','correction_export_preview','d12_finding',
                                 'usage_learning_candidate','factory_backflow_intake','visual_manifest'
                               )),
      source_id                TEXT NOT NULL,
      created_at               INTEGER NOT NULL,
      updated_at               INTEGER NOT NULL,
      UNIQUE(source_kind, source_id)
    );

    -- ───────────────────────── Anti-hallucination ──────────────────────────
    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      title       TEXT NOT NULL,
      url         TEXT,
      source      TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'validated'
                    CHECK (status IN ('candidate','validated','deprecated')),
      subjects_json TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS resource_scopes (
      resource_id   TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      scope_type    TEXT NOT NULL CHECK (scope_type = 'project'),
      scope_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      access_level  TEXT NOT NULL CHECK (access_level IN ('read','write','admin')),
      created_at    INTEGER NOT NULL,
      PRIMARY KEY (resource_id, scope_type, scope_id)
    );

    -- ───────────────────────── RAG permissionné PR-7 ──────────────────────
    CREATE TABLE IF NOT EXISTS rag_resources (
      id            TEXT PRIMARY KEY,
      resource_id   TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
      owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
      source_type   TEXT NOT NULL,
      source_uri    TEXT NOT NULL,
      title         TEXT NOT NULL,
      status        TEXT NOT NULL
                      CHECK (status IN ('candidate','validated','deprecated','revoked','archived')),
      trust_status  TEXT NOT NULL
                      CHECK (trust_status IN (
                        'unverified','source_verified','canonical','private_reference'
                      )),
      scope_type    TEXT NOT NULL CHECK (scope_type IN ('owner','project')),
      scope_id      TEXT NOT NULL,
      content_hash  TEXT NOT NULL,
      indexed_at    INTEGER,
      revoked_at    INTEGER,
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      UNIQUE(resource_id, scope_type, scope_id)
    );

    CREATE TABLE IF NOT EXISTS rag_resource_chunks (
      id              TEXT PRIMARY KEY,
      resource_id     TEXT NOT NULL REFERENCES rag_resources(id) ON DELETE CASCADE,
      chunk_index     INTEGER NOT NULL CHECK (chunk_index >= 0),
      content_excerpt TEXT NOT NULL,
      embedding_ref   TEXT,
      token_count     INTEGER CHECK (token_count IS NULL OR token_count >= 0),
      metadata_json   TEXT NOT NULL DEFAULT '{}',
      status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','stale','revoked')),
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(resource_id, chunk_index)
    );

    CREATE TABLE IF NOT EXISTS rag_context_packs (
      id              TEXT PRIMARY KEY,
      query_hash      TEXT NOT NULL,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      purpose         TEXT NOT NULL DEFAULT 'context_retrieval',
      room_instance_id TEXT REFERENCES room_instances(id) ON DELETE SET NULL,
      context_tier    TEXT NOT NULL DEFAULT 'T2',
      retrieval_strategy TEXT NOT NULL DEFAULT 'lexical',
      scope_type      TEXT NOT NULL CHECK (scope_type IN ('owner','project')),
      scope_id        TEXT NOT NULL,
      citations_json  TEXT NOT NULL,
      filters_json    TEXT NOT NULL DEFAULT '{}',
      status          TEXT NOT NULL
                        CHECK (status IN ('active','refused','stale','expired')),
      refusal_reason  TEXT
                        CHECK (
                          refusal_reason IS NULL
                          OR refusal_reason IN (
                            'no_authorized_source','no_reliable_source','scope_denied',
                            'unsafe_query'
                          )
                        ),
      created_at      INTEGER NOT NULL,
      expires_at      INTEGER
    );

    CREATE TABLE IF NOT EXISTS rag_query_events (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query_hash      TEXT NOT NULL,
      purpose         TEXT NOT NULL DEFAULT 'context_retrieval',
      room_instance_id TEXT REFERENCES room_instances(id) ON DELETE SET NULL,
      scope_type      TEXT NOT NULL CHECK (scope_type IN ('owner','project')),
      scope_id        TEXT NOT NULL,
      result_count    INTEGER NOT NULL CHECK (result_count >= 0),
      refusal_reason  TEXT,
      created_at      INTEGER NOT NULL
    );

    -- ───────────────────────── Template / Schema Registry PR-5 ────────────
    CREATE TABLE IF NOT EXISTS schema_templates (
      id                    TEXT PRIMARY KEY,
      domain                TEXT NOT NULL
                              CHECK (domain IN (
                                'cdc','quote_intake','event_registration','asset_manifest',
                                'bot_guide','correction','course','generic'
                              )),
      name                  TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'candidate'
                              CHECK (status IN ('candidate','validated','deprecated','archived')),
      version               INTEGER NOT NULL CHECK (version > 0),
      owner_id              TEXT REFERENCES users(id) ON DELETE CASCADE,
      schema_json           TEXT NOT NULL,
      required_fields_json  TEXT NOT NULL,
      validation_rules_json TEXT NOT NULL DEFAULT '{}',
      ui_hints_json         TEXT,
      changelog             TEXT NOT NULL,
      created_at            INTEGER NOT NULL,
      updated_at            INTEGER NOT NULL
    );

    -- ───────────────────────── Guided Runtime privé PR-6 ──────────────────
    CREATE TABLE IF NOT EXISTS conversation_guides (
      id                    TEXT PRIMARY KEY,
      owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id            TEXT REFERENCES projects(id) ON DELETE SET NULL,
      name                  TEXT NOT NULL,
      purpose               TEXT NOT NULL,
      domain                TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','candidate','validated','archived')),
      target_schema_id      TEXT NOT NULL REFERENCES schema_templates(id),
      target_schema_version INTEGER NOT NULL CHECK (target_schema_version > 0),
      question_flow_json    TEXT NOT NULL,
      completion_rules_json TEXT NOT NULL DEFAULT '{}',
      functional_persona_id TEXT,
      lore_persona_id       TEXT,
      ui_manifest_json      TEXT,
      analytics_policy_json TEXT NOT NULL DEFAULT '{}',
      consent_policy_json   TEXT NOT NULL DEFAULT '{}',
      version               INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
      created_at            INTEGER NOT NULL,
      updated_at            INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guided_sessions (
      id                     TEXT PRIMARY KEY,
      guide_id               TEXT NOT NULL REFERENCES conversation_guides(id) ON DELETE CASCADE,
      guide_version          INTEGER NOT NULL CHECK (guide_version > 0),
      owner_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id             TEXT REFERENCES projects(id) ON DELETE SET NULL,
      room_id                TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      access_mode            TEXT NOT NULL DEFAULT 'private' CHECK (access_mode = 'private'),
      status                 TEXT NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','completed','expired','revoked')),
      current_question_id    TEXT,
      target_schema_id       TEXT NOT NULL REFERENCES schema_templates(id),
      target_schema_version  INTEGER NOT NULL CHECK (target_schema_version > 0),
      guide_snapshot_json     TEXT,
      schema_snapshot_json    TEXT,
      consent_policy_json     TEXT NOT NULL DEFAULT '{}',
      progress_json          TEXT NOT NULL,
      structured_record_json TEXT NOT NULL DEFAULT '{}',
      expires_at             INTEGER,
      created_at             INTEGER NOT NULL,
      updated_at             INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guided_session_participants (
      session_id   TEXT NOT NULL REFERENCES guided_sessions(id) ON DELETE CASCADE,
      user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
      guest_id     TEXT,
      role         TEXT NOT NULL CHECK (role IN ('owner','facilitator','participant')),
      display_name TEXT,
      consent_json TEXT NOT NULL DEFAULT '{}',
      joined_at    INTEGER NOT NULL,
      last_seen_at INTEGER NOT NULL,
      PRIMARY KEY (session_id, user_id, guest_id),
      CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)
    );

    CREATE TABLE IF NOT EXISTS guided_contributions (
      id              TEXT PRIMARY KEY,
      session_id      TEXT NOT NULL REFERENCES guided_sessions(id) ON DELETE CASCADE,
      participant_ref TEXT NOT NULL,
      question_id     TEXT NOT NULL,
      target_field    TEXT NOT NULL,
      value_json      TEXT NOT NULL,
      source          TEXT NOT NULL CHECK (source IN ('user','facilitator')),
      status          TEXT NOT NULL DEFAULT 'accepted'
                       CHECK (status IN ('accepted','contradiction','superseded')),
      supersedes_id   TEXT REFERENCES guided_contributions(id),
      created_at      INTEGER NOT NULL
    );

    -- ───────────────────────── Config & audit LLM (réutilisé) ──────────────
    CREATE TABLE IF NOT EXISTS global_settings (
      app        TEXT NOT NULL,
      key        TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT,
      PRIMARY KEY (app, key)
    );

    CREATE TABLE IF NOT EXISTS token_events (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           TEXT REFERENCES users(id) ON DELETE CASCADE,
      ts                INTEGER NOT NULL,
      model             TEXT NOT NULL,
      task              TEXT NOT NULL,
      prompt_tokens     INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      cost_eur          REAL NOT NULL DEFAULT 0,
      persona_id        TEXT,
      room_instance_id  TEXT
    );

    -- ───────────────────────── Evidence & signaux pédagogiques ────────────
    -- Fondation PR-CB0 : persistance interne uniquement, aucune route publique.
    CREATE TABLE IF NOT EXISTS evidence_events (
      id                    TEXT PRIMARY KEY,
      source_type           TEXT NOT NULL
                              CHECK (source_type IN (
                                'submission','rubric','transcript','wooclap',
                                'survey','teacher_note','calendar'
                              )),
      adapter_id            TEXT NOT NULL,
      owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id            TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope         TEXT NOT NULL,
      target_refs_json      TEXT NOT NULL,
      payload_ref           TEXT NOT NULL,
      extraction_confidence REAL
                              CHECK (
                                extraction_confidence IS NULL
                                OR (extraction_confidence >= 0 AND extraction_confidence <= 1)
                              ),
      privacy_level         TEXT NOT NULL DEFAULT 'private'
                              CHECK (privacy_level IN ('private','restricted','shared')),
      occurred_at           INTEGER NOT NULL,
      status                TEXT NOT NULL DEFAULT 'candidate'
                              CHECK (status IN ('candidate','validated','rejected','archived')),
      created_at            INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedagogical_signals (
      id                      TEXT PRIMARY KEY,
      signal_type             TEXT NOT NULL
                                CHECK (signal_type IN (
                                  'progression','blockage','confusion','overload',
                                  'method','subject_quality','drift'
                                )),
      level                   TEXT NOT NULL
                                CHECK (level IN (
                                  'individual','group','cohort','course','method','system'
                                )),
      project_id              TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope           TEXT NOT NULL,
      evidence_refs_json      TEXT NOT NULL,
      recurrence              INTEGER NOT NULL DEFAULT 0 CHECK (recurrence >= 0),
      contradiction_refs_json TEXT NOT NULL DEFAULT '[]',
      confidence              REAL
                                CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
      sensitivity             TEXT NOT NULL DEFAULT 'sensitive'
                                CHECK (sensitivity IN ('normal','sensitive','highly_sensitive')),
      status                  TEXT NOT NULL DEFAULT 'observation'
                                CHECK (status IN (
                                  'observation','hypothesis','candidate_pattern',
                                  'validated_alert','stale','archived'
                                )),
      created_at              INTEGER NOT NULL,
      updated_at              INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teacher_decision_deltas (
      id                 TEXT PRIMARY KEY,
      object_type        TEXT NOT NULL
                           CHECK (object_type IN (
                             'criterion_score','feedback','rubric',
                             'calibration','subject','remediation'
                           )),
      object_ref         TEXT NOT NULL,
      ai_proposal_ref    TEXT NOT NULL,
      human_decision_ref TEXT NOT NULL,
      changed_fields_json TEXT NOT NULL,
      reason_code        TEXT,
      free_note_ref      TEXT,
      teacher_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id         TEXT REFERENCES projects(id) ON DELETE SET NULL,
      context_refs_json  TEXT NOT NULL DEFAULT '[]',
      created_at         INTEGER NOT NULL,
      CHECK (ai_proposal_ref <> human_decision_ref)
    );

    CREATE TABLE IF NOT EXISTS task_model_profiles (
      id                     TEXT PRIMARY KEY,
      task                   TEXT NOT NULL
                               CHECK (task IN (
                                 'ocr','rubric_extraction','criterion_analysis',
                                 'feedback_draft','cohort_synthesis','subject_revision','chat',
                                 'image_generation'
                               )),
      allowed_providers_json TEXT NOT NULL,
      fallback_order_json    TEXT NOT NULL DEFAULT '[]',
      model                  TEXT,
      role_models_json       TEXT,
      privacy_mode           TEXT NOT NULL
                               CHECK (privacy_mode IN ('local_only','approved_remote','hybrid')),
      max_cost_eur           REAL CHECK (max_cost_eur IS NULL OR max_cost_eur >= 0),
      max_latency_ms         INTEGER CHECK (max_latency_ms IS NULL OR max_latency_ms > 0),
      status                 TEXT NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','validated','disabled')),
      created_at             INTEGER NOT NULL,
      updated_at             INTEGER NOT NULL,
      updated_by             TEXT REFERENCES users(id)
    );

    -- ───────────────────────── Correction versionnée PR-C1 ────────────────
    -- Objets fondationnels uniquement : aucun score ni exécution automatique.
    CREATE TABLE IF NOT EXISTS rubric_templates (
      id                  TEXT PRIMARY KEY,
      owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id          TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope       TEXT NOT NULL,
      title               TEXT NOT NULL,
      subject_ref         TEXT,
      current_version_ref TEXT,
      status              TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','deprecated')),
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );

    -- D05 R2.1 : bibliothèque de sujets privés et versionnés, sans publication implicite.
    CREATE TABLE IF NOT EXISTS subject_templates (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      title TEXT NOT NULL,
      current_version_ref TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subject_versions (
      id TEXT PRIMARY KEY,
      template_id TEXT NOT NULL REFERENCES subject_templates(id) ON DELETE CASCADE,
      version INTEGER NOT NULL CHECK (version > 0),
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      manifest_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validated','archived')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      UNIQUE(template_id, version)
    );

    CREATE TABLE IF NOT EXISTS subject_assignments (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      cohort_id TEXT NOT NULL REFERENCES cohorts(id),
      source_subject_version_id TEXT NOT NULL REFERENCES subject_versions(id),
      title TEXT NOT NULL,
      subject_snapshot_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      activated_at INTEGER
    );

    -- D06 R2.3 : fiche de correction brouillon synchronisée, distincte d'une note.
    CREATE TABLE IF NOT EXISTS correction_sheet_drafts (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      assignment_id TEXT NOT NULL REFERENCES subject_assignments(id) ON DELETE CASCADE,
      source_subject_version_id TEXT NOT NULL REFERENCES subject_versions(id),
      version INTEGER NOT NULL CHECK (version > 0),
      subject_snapshot_json TEXT NOT NULL,
      derived_fields_json TEXT NOT NULL,
      teacher_fields_json TEXT NOT NULL DEFAULT '{}',
      locked_teacher_fields_json TEXT NOT NULL DEFAULT '[]',
      sync_status TEXT NOT NULL DEFAULT 'synced'
        CHECK (sync_status IN ('synced','needs_teacher_review')),
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','validated','archived')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      validated_by TEXT REFERENCES users(id),
      validated_at INTEGER,
      validation_ref TEXT,
      UNIQUE(assignment_id, version)
    );

    -- D08 R3.1 : références et manifest visuel privés, sans stockage ni génération.
    CREATE TABLE IF NOT EXISTS visual_references (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      label TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      reference_status TEXT NOT NULL CHECK (reference_status IN (
        'canon_strict','expression_only','outfit_only','world_style','poster_energy',
        'filter_reference','output_template','anti_pattern','rejected'
      )),
      provenance_state TEXT NOT NULL CHECK (provenance_state IN ('declared','validated','weak')),
      privacy_scope TEXT NOT NULL CHECK (privacy_scope IN ('private','project_private')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS visual_manifests (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      request_title TEXT NOT NULL,
      intent TEXT NOT NULL,
      privacy_scope TEXT NOT NULL CHECK (privacy_scope IN ('private','project_private')),
      canon_entity_refs_json TEXT NOT NULL,
      da_root_ref TEXT,
      active_layers_json TEXT NOT NULL,
      filters_json TEXT NOT NULL,
      output_family TEXT NOT NULL,
      output_template TEXT NOT NULL,
      source_truth_summary TEXT NOT NULL,
      reference_ids_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN (
        'draft','references_to_classify','da_to_resolve','readiness_blocked',
        'action_ready_preview','generation_blocked_tech_pending','parked',
        'approved','rejected'
      )),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- D08 R5 : assets générés (persistance des résultats de jobs asset_prepare)
    CREATE TABLE IF NOT EXISTS generated_assets (
      id TEXT PRIMARY KEY,
      manifest_id TEXT REFERENCES visual_manifests(id) ON DELETE SET NULL,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      asset_type TEXT NOT NULL CHECK (asset_type IN (
        'image','visual_manifest','badge','render','export'
      )),
      status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN (
        'candidate','approved','rejected','archived'
      )),
      mime_type TEXT,
      storage_ref TEXT,
      thumbnail_ref TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      review_note TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS story_workbenches (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, project_scope TEXT NOT NULL,
      title TEXT NOT NULL, source_ref TEXT NOT NULL, intake_mode TEXT NOT NULL CHECK (intake_mode IN ('audit_only','index_only','draft_workbench')),
      source_truth_state TEXT NOT NULL CHECK (source_truth_state IN ('SOURCE_VERIFIED','SOURCE_CURRENT','SOURCE_LEGACY','USER_PROVIDED')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reader_ready','workshop_ready','parked')),
      created_by TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS story_reader_states (
      id TEXT PRIMARY KEY, workbench_id TEXT NOT NULL REFERENCES story_workbenches(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, current_node TEXT, opening_sequence_lock TEXT,
      mode TEXT NOT NULL CHECK (mode IN ('MODE_LECTURE','MODE_ATELIER','FULL_SPOILERS','MODE_EXPORT')),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(workbench_id, owner_id)
    );
    CREATE TABLE IF NOT EXISTS story_patch_candidates (
      id TEXT PRIMARY KEY, workbench_id TEXT NOT NULL REFERENCES story_workbenches(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, proposal TEXT NOT NULL,
      truth_state TEXT NOT NULL DEFAULT 'CANDIDATE' CHECK (truth_state IN ('CANDIDATE','TO_VALIDATE','OPEN_QUESTION','CONTRADICTION')),
      status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','parked','rejected','validated_for_canon_delta')),
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    -- D09 R6 : nœuds de structure narrative (arcs, scènes, beats)
    CREATE TABLE IF NOT EXISTS story_nodes (
      id TEXT PRIMARY KEY,
      workbench_id TEXT NOT NULL REFERENCES story_workbenches(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES story_nodes(id) ON DELETE CASCADE,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      node_type TEXT NOT NULL CHECK (node_type IN ('arc','scene','beat','sequence','chapter')),
      title TEXT NOT NULL,
      summary TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      spoiler_level TEXT NOT NULL DEFAULT 'none' CHECK (spoiler_level IN ('none','mild','major','critical')),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','locked','archived')),
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    -- D09 R6 : événements narratifs (story beats, unlocks, plot twists)
    CREATE TABLE IF NOT EXISTS narrative_events (
      id TEXT PRIMARY KEY,
      workbench_id TEXT NOT NULL REFERENCES story_workbenches(id) ON DELETE CASCADE,
      node_id TEXT REFERENCES story_nodes(id) ON DELETE SET NULL,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL CHECK (event_type IN (
        'story_beat','milestone','unlock','character_intro','plot_twist','reveal','decision_point'
      )),
      title TEXT NOT NULL,
      description TEXT,
      payload_json TEXT NOT NULL DEFAULT '{}',
      occurred_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS private_quote_drafts (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL, project_scope TEXT NOT NULL,
      version INTEGER NOT NULL CHECK (version > 0), client_label TEXT NOT NULL, currency TEXT NOT NULL,
      lines_json TEXT NOT NULL, assumptions_json TEXT NOT NULL, exclusions_json TEXT NOT NULL,
      validity TEXT NOT NULL, total REAL NOT NULL CHECK (total >= 0),
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','needs_review','validated_private','archived')),
      created_by TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE(owner_id, project_scope, version)
    );

    CREATE TABLE IF NOT EXISTS rubric_versions (
      id            TEXT PRIMARY KEY,
      template_id   TEXT NOT NULL REFERENCES rubric_templates(id) ON DELETE CASCADE,
      version       INTEGER NOT NULL CHECK (version > 0),
      project_id    TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope TEXT NOT NULL,
      criteria_json TEXT NOT NULL,
      total_points  REAL NOT NULL CHECK (total_points > 0),
      status        TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','candidate','validated','archived')),
      created_by    TEXT NOT NULL REFERENCES users(id),
      created_at    INTEGER NOT NULL,
      UNIQUE(template_id, version)
    );

    CREATE TABLE IF NOT EXISTS institutional_grading_profiles (
      id                     TEXT PRIMARY KEY,
      owner_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id             TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope          TEXT NOT NULL,
      version                INTEGER NOT NULL CHECK (version > 0),
      scale_json             TEXT NOT NULL,
      expected_band_json     TEXT NOT NULL,
      anchors_json           TEXT NOT NULL,
      calibration_mode       TEXT NOT NULL
                               CHECK (calibration_mode = 'diagnostic_then_teacher_validation'),
      max_global_delta       REAL NOT NULL CHECK (max_global_delta >= 0),
      protected_thresholds_json TEXT NOT NULL DEFAULT '[]',
      threshold_crossing_requires_validation INTEGER NOT NULL DEFAULT 1
                               CHECK (threshold_crossing_requires_validation IN (0,1)),
      status                 TEXT NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','validated','deprecated')),
      created_at             INTEGER NOT NULL,
      UNIQUE(owner_id, project_scope, version)
    );

    CREATE TABLE IF NOT EXISTS correction_batches (
      id                 TEXT PRIMARY KEY,
      owner_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id         TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope      TEXT NOT NULL,
      rubric_version_id  TEXT NOT NULL REFERENCES rubric_versions(id),
      grading_profile_id TEXT NOT NULL REFERENCES institutional_grading_profiles(id),
      context_snapshot_id TEXT REFERENCES correction_context_snapshots(id),
      status             TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN (
                             'draft','ready','running','review','completed','failed','archived'
                           )),
      submission_count   INTEGER NOT NULL DEFAULT 0 CHECK (submission_count >= 0),
      created_at         INTEGER NOT NULL,
      updated_at         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS correction_context_snapshots (
      id                          TEXT PRIMARY KEY,
      batch_id                    TEXT NOT NULL UNIQUE
                                      REFERENCES correction_batches(id) ON DELETE CASCADE,
      owner_id                    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id                  TEXT REFERENCES projects(id) ON DELETE SET NULL,
      cohort_id                   TEXT NOT NULL REFERENCES cohorts(id),
      roster_version_id           TEXT NOT NULL REFERENCES roster_versions(id),
      rubric_version_id           TEXT NOT NULL REFERENCES rubric_versions(id),
      subject_version_ref         TEXT NOT NULL,
      source_refs_json            TEXT NOT NULL,
      process_context_profile_ref TEXT NOT NULL,
      created_by                  TEXT NOT NULL REFERENCES users(id),
      created_at                  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id                  TEXT PRIMARY KEY,
      batch_id            TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id          TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope       TEXT NOT NULL,
      student_ref         TEXT,
      student_identity_id TEXT REFERENCES student_identities(id),
      identity_linked_by  TEXT REFERENCES users(id),
      identity_linked_at  INTEGER,
      source_evidence_ref TEXT NOT NULL REFERENCES evidence_events(id),
      identity_status     TEXT NOT NULL DEFAULT 'unknown'
                            CHECK (identity_status IN ('unknown','candidate','confirmed','rejected')),
      status              TEXT NOT NULL DEFAULT 'candidate'
                            CHECK (status IN (
                              'candidate','ready','processing','review','completed','rejected'
                            )),
      privacy_level       TEXT NOT NULL DEFAULT 'private'
                            CHECK (privacy_level = 'private'),
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS identity_match_candidates (
      id                          TEXT PRIMARY KEY,
      submission_id               TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      batch_id                    TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      context_snapshot_id         TEXT NOT NULL REFERENCES correction_context_snapshots(id),
      observed_label              TEXT NOT NULL,
      candidate_identity_ids_json TEXT NOT NULL,
      status                      TEXT NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','confirmed','rejected')),
      selected_identity_id        TEXT REFERENCES student_identities(id),
      created_by                  TEXT NOT NULL REFERENCES users(id),
      decided_by                  TEXT REFERENCES users(id),
      created_at                  INTEGER NOT NULL,
      updated_at                  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pre_correction_manifests (
      id                 TEXT PRIMARY KEY,
      batch_id           TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      project_id         TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope      TEXT NOT NULL,
      rubric_version_id  TEXT NOT NULL REFERENCES rubric_versions(id),
      grading_profile_id TEXT NOT NULL REFERENCES institutional_grading_profiles(id),
      submission_refs_json TEXT NOT NULL,
      workflow_version   TEXT NOT NULL,
      status             TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','validated','executing','completed','rejected')),
      created_by         TEXT NOT NULL REFERENCES users(id),
      validation_ref     TEXT,
      created_at         INTEGER NOT NULL,
      CHECK (status IN ('draft','rejected') OR validation_ref IS NOT NULL)
    );

    -- ───────────────────────── Pré-correction explicable PR-C3 ─────────────
    -- Sorties candidates uniquement : aucune note finale ni validation implicite.
    CREATE TABLE IF NOT EXISTS pre_correction_runs (
      id                    TEXT PRIMARY KEY,
      manifest_id           TEXT NOT NULL REFERENCES pre_correction_manifests(id),
      batch_id              TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      submission_id         TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id            TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope         TEXT NOT NULL,
      rubric_version_id     TEXT NOT NULL REFERENCES rubric_versions(id),
      grading_profile_id    TEXT NOT NULL REFERENCES institutional_grading_profiles(id),
      context_snapshot_id   TEXT REFERENCES correction_context_snapshots(id),
      analysis_type         TEXT NOT NULL
                              CHECK (analysis_type IN (
                                'ocr_structured','rubric_scoring','creative_structure',
                                'portfolio_review','mixed'
                              )),
      evidence_snapshot_ref TEXT NOT NULL,
      method_version        TEXT NOT NULL,
      model_profile_ref     TEXT REFERENCES task_model_profiles(id),
      criterion_score_refs_json TEXT NOT NULL,
      review_reasons_json   TEXT NOT NULL DEFAULT '[]',
      status                TEXT NOT NULL DEFAULT 'needs_review'
                              CHECK (status = 'needs_review'),
      created_at            INTEGER NOT NULL,
      updated_at            INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS criterion_score_drafts (
      id                TEXT PRIMARY KEY,
      run_id            TEXT NOT NULL REFERENCES pre_correction_runs(id) ON DELETE CASCADE,
      submission_id     TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      rubric_version_id TEXT NOT NULL REFERENCES rubric_versions(id),
      criterion_id      TEXT NOT NULL,
      draft_score       REAL NOT NULL CHECK (draft_score >= 0),
      max_points        REAL NOT NULL CHECK (max_points > 0),
      evidence_refs_json TEXT NOT NULL,
      confidence        REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
      comment_ref       TEXT,
      status            TEXT NOT NULL DEFAULT 'candidate'
                          CHECK (status IN ('candidate','rejected','superseded')),
      created_at        INTEGER NOT NULL,
      CHECK (draft_score <= max_points),
      UNIQUE(run_id, criterion_id)
    );

    -- ───────────────────────── Calibration / quality review PR-C4 ──────────
    -- Diagnostic uniquement : aucun score source n'est modifié.
    CREATE TABLE IF NOT EXISTS cohort_calibration_reviews (
      id                    TEXT PRIMARY KEY,
      batch_id              TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      owner_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id            TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope         TEXT NOT NULL,
      grading_profile_id    TEXT NOT NULL REFERENCES institutional_grading_profiles(id),
      method_version        TEXT NOT NULL,
      statistics_json       TEXT NOT NULL,
      diagnostic_delta_candidate REAL,
      protected_threshold_crossing_count INTEGER NOT NULL DEFAULT 0
                                CHECK (protected_threshold_crossing_count >= 0),
      alert_codes_json      TEXT NOT NULL DEFAULT '[]',
      sample_item_refs_json TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'review_required'
                              CHECK (status = 'review_required'),
      created_at            INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quality_review_items (
      id                    TEXT PRIMARY KEY,
      calibration_review_id TEXT NOT NULL
                              REFERENCES cohort_calibration_reviews(id) ON DELETE CASCADE,
      run_id                TEXT NOT NULL REFERENCES pre_correction_runs(id) ON DELETE CASCADE,
      submission_id         TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      raw_score             REAL NOT NULL,
      scale_json            TEXT NOT NULL,
      mean_confidence       REAL NOT NULL CHECK (mean_confidence BETWEEN 0 AND 1),
      selection_reasons_json TEXT NOT NULL,
      status                TEXT NOT NULL DEFAULT 'review_required'
                              CHECK (status = 'review_required'),
      created_at            INTEGER NOT NULL,
      UNIQUE(calibration_review_id, run_id)
    );

    -- ───────────────────────── Feedback / exports supervisés PR-C5 ─────────
    CREATE TABLE IF NOT EXISTS feedback_drafts (
      id                      TEXT PRIMARY KEY,
      run_id                  TEXT NOT NULL REFERENCES pre_correction_runs(id) ON DELETE CASCADE,
      submission_id           TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
      owner_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id              TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope           TEXT NOT NULL,
      method_version          TEXT NOT NULL,
      model_profile_ref       TEXT REFERENCES task_model_profiles(id),
      observed_strength_ref   TEXT NOT NULL,
      observed_issue_ref      TEXT NOT NULL,
      evidence_refs_json      TEXT NOT NULL,
      impact_on_work_ref      TEXT NOT NULL,
      pedagogical_axis_ref    TEXT NOT NULL,
      next_action_ref         TEXT NOT NULL,
      validation_criterion_ref TEXT NOT NULL,
      tone_level              TEXT NOT NULL
                                CHECK (tone_level IN ('supportive','clear','firm')),
      evaluation_alignment    TEXT NOT NULL
                                CHECK (evaluation_alignment IN ('aligned','review_required')),
      teacher_validation_required INTEGER NOT NULL DEFAULT 1
                                CHECK (teacher_validation_required = 1),
      status                  TEXT NOT NULL DEFAULT 'needs_teacher_validation'
                                CHECK (status IN (
                                  'needs_teacher_validation','approved','rejected'
                                )),
      validator_id            TEXT REFERENCES users(id),
      validation_ref          TEXT,
      created_at              INTEGER NOT NULL,
      updated_at              INTEGER NOT NULL,
      CHECK (
        (status = 'needs_teacher_validation' AND validator_id IS NULL AND validation_ref IS NULL)
        OR
        (status IN ('approved','rejected') AND validator_id IS NOT NULL AND validation_ref IS NOT NULL)
      )
    );

    CREATE TABLE IF NOT EXISTS correction_export_previews (
      id                      TEXT PRIMARY KEY,
      batch_id                TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      owner_id                TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id              TEXT REFERENCES projects(id) ON DELETE SET NULL,
      project_scope           TEXT NOT NULL,
      format                  TEXT NOT NULL CHECK (format IN ('csv','xlsx','pdf','report')),
      target                  TEXT NOT NULL
                                CHECK (target IN ('teacher_download','manual_injection')),
      source_feedback_refs_json TEXT NOT NULL,
      source_run_refs_json    TEXT NOT NULL,
      preview_ref             TEXT NOT NULL,
      schema_version          TEXT NOT NULL,
      contains_private_data   INTEGER NOT NULL DEFAULT 1 CHECK (contains_private_data = 1),
      publication_allowed     INTEGER NOT NULL DEFAULT 0 CHECK (publication_allowed = 0),
      human_validation_required INTEGER NOT NULL DEFAULT 1
                                CHECK (human_validation_required = 1),
      status                  TEXT NOT NULL DEFAULT 'needs_teacher_validation'
                                CHECK (status IN (
                                  'needs_teacher_validation','approved_for_export','rejected'
                                )),
      validator_id            TEXT REFERENCES users(id),
      validation_ref          TEXT,
      created_at              INTEGER NOT NULL,
      updated_at              INTEGER NOT NULL,
      CHECK (
        (status = 'needs_teacher_validation' AND validator_id IS NULL AND validation_ref IS NULL)
        OR
        (status IN ('approved_for_export','rejected')
          AND validator_id IS NOT NULL AND validation_ref IS NOT NULL)
      )
    );

    -- ───────────────────────── Jobs / queues PR-C2 ────────────────────────
    CREATE TABLE IF NOT EXISTS jobs (
      id            TEXT PRIMARY KEY,
      type          TEXT NOT NULL
                      CHECK (type IN (
                        'rag_reindex','resource_revoke','export_prepare',
                        'asset_prepare','ocr_prepare','correction_prepare'
                      )),
      status        TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN (
                        'queued','running','needs_review','completed',
                        'failed','cancelled','expired'
                      )),
      owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      scope_type    TEXT NOT NULL,
      scope_id      TEXT NOT NULL,
      risk_level    TEXT NOT NULL
                      CHECK (risk_level IN ('low','medium','medium_high','high','variable')),
      payload_json  TEXT NOT NULL,
      result_json   TEXT,
      error         TEXT,
      progress      INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
      retry_count   INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL,
      started_at    INTEGER,
      completed_at  INTEGER,
      cancelled_at  INTEGER,
      runner_id     TEXT,
      claimed_at    INTEGER,
      lease_expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS job_events (
      id          TEXT PRIMARY KEY,
      job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      event_type  TEXT NOT NULL
                    CHECK (event_type IN (
                      'job_queued','job_started','job_progress','job_needs_review',
                      'job_completed','job_failed','job_cancelled','job_retried'
                    )),
      detail_json TEXT,
      created_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runner_heartbeats (
      runner_id      TEXT PRIMARY KEY,
      runner_family  TEXT NOT NULL,
      job_types_json TEXT NOT NULL,
      status         TEXT NOT NULL
                       CHECK (status IN ('online','draining','offline')),
      active_job_id  TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      version        TEXT NOT NULL,
      host_ref       TEXT,
      lease_ms       INTEGER NOT NULL CHECK (lease_ms > 0 AND lease_ms <= 3600000),
      last_seen_at   INTEGER NOT NULL,
      updated_at     INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workflow_events (
      id               TEXT PRIMARY KEY,
      workflow_id      TEXT NOT NULL,
      event_type       TEXT NOT NULL
                         CHECK (event_type IN (
                           'workflow_started','workflow_step_completed',
                           'workflow_blocked','workflow_failed','workflow_completed',
                           'validation_requested','validation_approved','validation_rejected',
                           'job_queued','job_failed','resource_missing','permission_denied'
                         )),
      workflow_type    TEXT NOT NULL,
      capability_id    TEXT NOT NULL,
      owner_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id       TEXT,
      room_id          TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      duration_ms      INTEGER CHECK (duration_ms IS NULL OR duration_ms >= 0),
      cost_eur         REAL CHECK (cost_eur IS NULL OR cost_eur >= 0),
      tokens           INTEGER CHECK (tokens IS NULL OR tokens >= 0),
      status           TEXT NOT NULL
                         CHECK (status IN (
                           'started','running','blocked','failed','completed',
                           'validation_pending','validation_approved','validation_rejected'
                         )),
      blocker_category TEXT,
      created_at       INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS d12_missed_trigger_findings (
      id                          TEXT PRIMARY KEY,
      owner_id                    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id                  TEXT REFERENCES projects(id) ON DELETE SET NULL,
      source_ref                  TEXT NOT NULL,
      expected_process            TEXT NOT NULL,
      actual_runtime_response     TEXT NOT NULL,
      missing_runtime_piece       TEXT NOT NULL,
      user_impact                 TEXT NOT NULL,
      domain_refs_json            TEXT NOT NULL DEFAULT '[]',
      output_family_refs_json     TEXT NOT NULL DEFAULT '[]',
      evidence_refs_json          TEXT NOT NULL DEFAULT '[]',
      blocked_actions_json        TEXT NOT NULL DEFAULT '[]',
      recommended_queue_task_json TEXT NOT NULL,
      severity                    TEXT NOT NULL
                                    CHECK (severity IN ('low','medium','high','critical')),
      status                      TEXT NOT NULL DEFAULT 'observation'
                                    CHECK (status IN (
                                      'observation','hypothesis','candidate_pattern',
                                      'validated_alert','stale','archived'
                                    )),
      owner_decision_json         TEXT,
      detected_at                 INTEGER NOT NULL,
      created_at                  INTEGER NOT NULL,
      updated_at                  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS d12_release_receipts (
      id                  TEXT PRIMARY KEY,
      owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      commit_sha          TEXT NOT NULL,
      environment_label   TEXT NOT NULL,
      components_json     TEXT NOT NULL,
      evidence_refs_json  TEXT NOT NULL DEFAULT '[]',
      observed_at         INTEGER NOT NULL,
      note                TEXT,
      proof_state         TEXT NOT NULL CHECK (proof_state IN ('unknown','evidence_attached')),
      runtime_status      TEXT NOT NULL DEFAULT 'not_verified' CHECK (runtime_status = 'not_verified'),
      created_at          INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS d12_backup_receipts (
      id                  TEXT PRIMARY KEY,
      owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_label        TEXT NOT NULL,
      environment_label   TEXT NOT NULL,
      checksum_sha256     TEXT NOT NULL,
      backup_observed_at  INTEGER NOT NULL,
      evidence_refs_json  TEXT NOT NULL DEFAULT '[]',
      note                TEXT,
      proof_state         TEXT NOT NULL CHECK (proof_state IN ('unknown','evidence_attached')),
      restore_status      TEXT NOT NULL DEFAULT 'not_tested' CHECK (restore_status = 'not_tested'),
      created_at          INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS d12_incident_records (id TEXT PRIMARY KEY,owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),impact_summary TEXT NOT NULL,scope_refs_json TEXT NOT NULL,symptom_refs_json TEXT NOT NULL,evidence_refs_json TEXT NOT NULL DEFAULT '[]',observed_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'recorded_unresolved' CHECK(status='recorded_unresolved'),created_at INTEGER NOT NULL);

    CREATE TABLE IF NOT EXISTS usage_learning_candidates (
      id                         TEXT PRIMARY KEY,
      owner_id                   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id                 TEXT REFERENCES projects(id) ON DELETE SET NULL,
      source_environment         TEXT NOT NULL
                                   CHECK (source_environment IN ('masterflow_native','portable_factory')),
      source_factory_id          TEXT,
      source_session_or_event    TEXT NOT NULL,
      signal_type                TEXT NOT NULL
                                   CHECK (signal_type IN (
                                     'repeated_correction','stable_preference','recurring_workflow',
                                     'new_source_or_stakeholder','new_validation_or_sensitive_action',
                                     'recurring_exception','failure_or_rework','contradiction',
                                     'missed_trigger','portable_factory_backflow'
                                   )),
      summary                    TEXT NOT NULL,
      affected_process           TEXT NOT NULL,
      affected_output_family     TEXT NOT NULL,
      domain_refs_json           TEXT NOT NULL DEFAULT '[]',
      evidence_summary           TEXT NOT NULL,
      evidence_refs_json         TEXT NOT NULL DEFAULT '[]',
      repetition_count           INTEGER NOT NULL DEFAULT 1 CHECK (repetition_count > 0),
      confidence                 TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
      status                     TEXT NOT NULL
                                   CHECK (status IN (
                                     'observation','hypothesis','user_confirmed_rule',
                                     'contradiction','open_question'
                                   )),
      privacy                    TEXT NOT NULL CHECK (privacy IN ('safe','anonymize','do_not_export')),
      scope                      TEXT NOT NULL,
      godmode_targets_json       TEXT NOT NULL DEFAULT '[]',
      routing_status             TEXT NOT NULL
                                   CHECK (routing_status IN ('pending','routed','ambiguous','quarantined')),
      canon_status               TEXT NOT NULL DEFAULT 'candidate_only'
                                   CHECK (canon_status = 'candidate_only'),
      review_status              TEXT NOT NULL DEFAULT 'pending'
                                   CHECK (review_status IN ('pending','approved','parked','rejected','archived')),
      reviewer_id                TEXT REFERENCES users(id),
      review_note                TEXT,
      dedupe_key                 TEXT NOT NULL UNIQUE,
      detected_at                INTEGER NOT NULL,
      created_at                 INTEGER NOT NULL,
      updated_at                 INTEGER NOT NULL
    );

    -- ───────────────────────── D11 Factory Backflow V6C ──────────────────
    -- Manifeste JSON contrôlé uniquement. Aucun ZIP, fichier, URL ou activation runtime.
    CREATE TABLE IF NOT EXISTS factory_backflow_intakes (
      id                     TEXT PRIMARY KEY,
      owner_id               TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      factory_id             TEXT,
      factory_version        TEXT,
      target_platform        TEXT,
      export_id              TEXT,
      export_type            TEXT,
      source_session_ref     TEXT,
      summary                TEXT,
      candidate_count        INTEGER NOT NULL DEFAULT 0 CHECK (candidate_count >= 0),
      passport_json          TEXT,
      backflow_export_json   TEXT,
      quarantine_reasons_json TEXT NOT NULL DEFAULT '[]',
      intake_status          TEXT NOT NULL CHECK (intake_status IN ('candidate','quarantined')),
      review_status          TEXT NOT NULL DEFAULT 'pending'
                               CHECK (review_status IN ('pending','approved','parked','rejected','archived')),
      reviewer_id            TEXT REFERENCES users(id),
      review_note            TEXT,
      canon_status           TEXT NOT NULL DEFAULT 'candidate_only'
                               CHECK (canon_status = 'candidate_only'),
      created_at             INTEGER NOT NULL,
      updated_at             INTEGER NOT NULL
    );

    -- Une validation owner matérialise un candidat local, jamais une mise à jour de domaine/canon.
    CREATE TABLE IF NOT EXISTS factory_backflow_candidate_updates (
      id                  TEXT PRIMARY KEY,
      intake_id           TEXT NOT NULL REFERENCES factory_backflow_intakes(id) ON DELETE CASCADE,
      owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      factory_id          TEXT,
      source_candidate_id TEXT NOT NULL,
      summary             TEXT NOT NULL,
      classification      TEXT NOT NULL CHECK (classification IN (
                            'SYSTEM','PERSONA','DA','PROJECT_LORE','OUTPUT','PLATFORM',
                            'RESOURCE','PEDAGOGY','PRIVATE'
                          )),
      routing_status      TEXT NOT NULL CHECK (routing_status = 'unrouted'),
      target_domain       TEXT,
      candidate_status    TEXT NOT NULL CHECK (candidate_status = 'approved_candidate'),
      canon_status        TEXT NOT NULL DEFAULT 'candidate_only'
                            CHECK (canon_status = 'candidate_only'),
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL,
      UNIQUE(intake_id, source_candidate_id)
    );

    CREATE TABLE IF NOT EXISTS factory_backflow_candidate_routes (
      candidate_update_id TEXT PRIMARY KEY REFERENCES factory_backflow_candidate_updates(id) ON DELETE CASCADE,
      target_domain       TEXT NOT NULL,
      routed_by           TEXT NOT NULL REFERENCES users(id),
      note                TEXT,
      created_at          INTEGER NOT NULL
    );

    -- ───────────────────────── Index ───────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_invitations_created_by ON invitations(created_by);
    CREATE INDEX IF NOT EXISTS idx_room_instances_user ON room_instances(user_id);
    CREATE INDEX IF NOT EXISTS idx_room_checkpoints_instance
      ON room_checkpoints(room_instance_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memory_cards_scope
      ON memory_cards(scope, owner_id, project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_cohorts_owner
      ON cohorts(owner_id, project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_student_identities_scope
      ON student_identities(owner_id, project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_roster_versions_cohort
      ON roster_versions(cohort_id, status, version DESC);
    CREATE INDEX IF NOT EXISTS idx_roster_members_identity
      ON roster_members(student_identity_id, roster_version_id);
    CREATE INDEX IF NOT EXISTS idx_persona_blends_ri   ON persona_blends(room_instance_id);
    CREATE INDEX IF NOT EXISTS idx_actions_status      ON actions(status);
    CREATE INDEX IF NOT EXISTS idx_actions_user        ON actions(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action        ON audit_logs(action_id);
    CREATE INDEX IF NOT EXISTS idx_resources_status    ON resources(status);
    CREATE INDEX IF NOT EXISTS idx_token_events_ts      ON token_events(ts);
    CREATE INDEX IF NOT EXISTS idx_token_events_user    ON token_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_token_events_user_ts ON token_events(user_id, ts);
    CREATE INDEX IF NOT EXISTS idx_revoked_expires     ON revoked_tokens(expires_at);
    CREATE INDEX IF NOT EXISTS idx_projects_owner_status
      ON projects(owner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_project_members_user
      ON project_members(user_id, role);
    CREATE INDEX IF NOT EXISTS idx_ownership_edges_object
      ON ownership_edges(object_type, object_id, scope);
    CREATE INDEX IF NOT EXISTS idx_resource_scopes_scope
      ON resource_scopes(scope_type, scope_id, access_level);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_owner
      ON inventory_items(owner_id, validation_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_project
      ON inventory_items(project_id, visibility_scope, validation_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_collections_owner
      ON inventory_collections(owner_id, validation_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_inventory_visibility_scope
      ON inventory_visibility(scope_type, scope_id, access_level);
    CREATE INDEX IF NOT EXISTS idx_inventory_project_needs
      ON inventory_project_needs(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_rag_resources_scope
      ON rag_resources(scope_type, scope_id, status, trust_status);
    CREATE INDEX IF NOT EXISTS idx_rag_chunks_resource
      ON rag_resource_chunks(resource_id, status, chunk_index);
    CREATE INDEX IF NOT EXISTS idx_rag_context_packs_user
      ON rag_context_packs(user_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_rag_query_events_user
      ON rag_query_events(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_schema_templates_status
      ON schema_templates(domain, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_schema_templates_owner
      ON schema_templates(owner_id, domain, version);
    CREATE INDEX IF NOT EXISTS idx_conversation_guides_owner
      ON conversation_guides(owner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_conversation_guides_project
      ON conversation_guides(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_guided_sessions_owner
      ON guided_sessions(owner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_guided_sessions_guide
      ON guided_sessions(guide_id, status);
    CREATE INDEX IF NOT EXISTS idx_guided_participants_user
      ON guided_session_participants(user_id, role);
    CREATE INDEX IF NOT EXISTS idx_guided_contributions_session
      ON guided_contributions(session_id, target_field, created_at);
    CREATE INDEX IF NOT EXISTS idx_evidence_scope_status
      ON evidence_events(project_scope, status, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_evidence_owner
      ON evidence_events(owner_id, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_signals_scope_status
      ON pedagogical_signals(project_scope, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_signals_type_level
      ON pedagogical_signals(signal_type, level);
    CREATE INDEX IF NOT EXISTS idx_teacher_deltas_teacher
      ON teacher_decision_deltas(teacher_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_teacher_deltas_object
      ON teacher_decision_deltas(object_type, object_ref);
    CREATE INDEX IF NOT EXISTS idx_task_model_profiles_task
      ON task_model_profiles(task, status);
    CREATE INDEX IF NOT EXISTS idx_rubric_templates_scope
      ON rubric_templates(project_scope, status);
    CREATE INDEX IF NOT EXISTS idx_rubric_versions_template
      ON rubric_versions(template_id, version);
    CREATE INDEX IF NOT EXISTS idx_grading_profiles_scope
      ON institutional_grading_profiles(project_scope, status);
    CREATE INDEX IF NOT EXISTS idx_correction_batches_scope
      ON correction_batches(project_scope, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_correction_context_roster
      ON correction_context_snapshots(roster_version_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_correction_context_cohort
      ON correction_context_snapshots(cohort_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_batch
      ON submissions(batch_id, status);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_manifests_batch
      ON pre_correction_manifests(batch_id, status);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_runs_owner
      ON pre_correction_runs(owner_id, project_scope, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_runs_submission
      ON pre_correction_runs(submission_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_criterion_score_drafts_run
      ON criterion_score_drafts(run_id, criterion_id);
    CREATE INDEX IF NOT EXISTS idx_calibration_reviews_batch
      ON cohort_calibration_reviews(batch_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_quality_review_items_review
      ON quality_review_items(calibration_review_id, status);
    CREATE INDEX IF NOT EXISTS idx_feedback_drafts_run
      ON feedback_drafts(run_id, status);
    CREATE INDEX IF NOT EXISTS idx_feedback_drafts_owner
      ON feedback_drafts(owner_id, project_scope, status);
    CREATE INDEX IF NOT EXISTS idx_correction_export_previews_batch
      ON correction_export_previews(batch_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_owner_status
      ON jobs(owner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_scope
      ON jobs(scope_type, scope_id, status);
    CREATE INDEX IF NOT EXISTS idx_job_events_job
      ON job_events(job_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_runner_heartbeats_family
      ON runner_heartbeats(runner_family, status, last_seen_at);
    CREATE INDEX IF NOT EXISTS idx_workflow_events_created
      ON workflow_events(created_at, capability_id, workflow_type);
    CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow
      ON workflow_events(workflow_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_workflow_events_owner
      ON workflow_events(owner_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_d12_findings_owner
      ON d12_missed_trigger_findings(owner_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_d12_findings_project
      ON d12_missed_trigger_findings(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_usage_learning_owner_review
      ON usage_learning_candidates(owner_id, review_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_usage_learning_project_review
      ON usage_learning_candidates(project_id, review_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_factory_backflow_owner_review
      ON factory_backflow_intakes(owner_id, review_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_factory_backflow_candidate_updates_owner
      ON factory_backflow_candidate_updates(owner_id, routing_status, updated_at);

    -- ───────────────────────── D05 Competency & Gamification ─────────────────
    -- Frameworks de compétences (ex: «Design Thinking», «Communication visuelle»)
    CREATE TABLE IF NOT EXISTS competency_frameworks (
      id            TEXT PRIMARY KEY,
      owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id    TEXT REFERENCES projects(id) ON DELETE CASCADE,
      label         TEXT NOT NULL,
      description   TEXT,
      domain        TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','archived')),
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    -- Définitions de compétences individuelles
    CREATE TABLE IF NOT EXISTS competency_definitions (
      id            TEXT PRIMARY KEY,
      framework_id  TEXT NOT NULL REFERENCES competency_frameworks(id) ON DELETE CASCADE,
      parent_id     TEXT REFERENCES competency_definitions(id) ON DELETE SET NULL,
      code          TEXT NOT NULL,
      label         TEXT NOT NULL,
      description   TEXT,
      bloom_level   TEXT CHECK (bloom_level IN (
                      'remember','understand','apply','analyze','evaluate','create'
                    )),
      icon          TEXT,
      sort_order    INTEGER NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','archived')),
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );

    -- Signaux observés de compétence (preuves)
    CREATE TABLE IF NOT EXISTS user_competency_signals (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      competency_id   TEXT NOT NULL REFERENCES competency_definitions(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      evidence_ref    TEXT,
      source          TEXT NOT NULL CHECK (source IN (
                        'teacher','system','self','peer','workflow'
                      )),
      mastery_level   TEXT NOT NULL CHECK (mastery_level IN (
                        'discovering','guided','practicing','autonomous','mentor_ready'
                      )),
      autonomy_level  TEXT CHECK (autonomy_level IN (
                        'dependent','assisted','independent','initiative','mentor'
                      )),
      confidence      REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
      observation     TEXT,
      validation_required INTEGER NOT NULL DEFAULT 0,
      validator_id    TEXT REFERENCES users(id),
      validated_at    INTEGER,
      status          TEXT NOT NULL DEFAULT 'candidate'
                        CHECK (status IN ('candidate','validated','rejected','superseded')),
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    -- Progression agrégée par compétence / utilisateur
    CREATE TABLE IF NOT EXISTS user_competency_progress (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      competency_id   TEXT NOT NULL REFERENCES competency_definitions(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      current_mastery TEXT NOT NULL CHECK (current_mastery IN (
                        'unknown','discovering','guided','practicing','autonomous','mentor_ready'
                      )),
      current_autonomy TEXT CHECK (current_autonomy IN (
                        'unknown','dependent','assisted','independent','initiative','mentor'
                      )),
      confidence      REAL NOT NULL DEFAULT 0,
      signal_count    INTEGER NOT NULL DEFAULT 0,
      last_signal_at  INTEGER,
      trajectory      TEXT CHECK (trajectory IN (
                        'emerging','consolidating','unstable','transferred','blocked','needs_review'
                      )),
      validation_required INTEGER NOT NULL DEFAULT 1,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(user_id, competency_id, project_id)
    );

    -- Nœuds d'arbre de compétences
    CREATE TABLE IF NOT EXISTS skill_tree_nodes (
      id              TEXT PRIMARY KEY,
      owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      label           TEXT NOT NULL,
      node_type       TEXT NOT NULL CHECK (node_type IN (
                        'competency','capability','app','engine','widget','export',
                        'pack','permission','asset_render','reward_asset',
                        'methodology','teacher_persona','companion','living_idea'
                      )),
      status          TEXT NOT NULL DEFAULT 'locked' CHECK (status IN (
                        'locked','available','active','equipped',
                        'validation_required','admin_only','cooldown',
                        'future_ready','deprecated','conflict'
                      )),
      unlock_source   TEXT,
      required_role   TEXT,
      required_pack   TEXT,
      required_validation INTEGER NOT NULL DEFAULT 0,
      runtime_cost    REAL,
      visible_to_user INTEGER NOT NULL DEFAULT 1,
      usable_by_user  INTEGER NOT NULL DEFAULT 0,
      equipped        INTEGER NOT NULL DEFAULT 0,
      explanation     TEXT,
      companion_family TEXT CHECK (companion_family IN (
                        'MOTH','MOLEKID','INCUBATOR_CREATURE','MASTERFLEX_HELPER',
                        'STUDENT_DISCOVERY','PROJECT_MONSTER', NULL
                      )),
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    -- Dépendances entre nœuds
    CREATE TABLE IF NOT EXISTS skill_tree_node_dependencies (
      node_id         TEXT NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
      depends_on_id   TEXT NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
      dependency_type TEXT NOT NULL DEFAULT 'requires'
                        CHECK (dependency_type IN ('requires','improves','extends','blocks','unlocks')),
      created_at      INTEGER NOT NULL,
      PRIMARY KEY (node_id, depends_on_id)
    );

    -- Définitions de badges
    CREATE TABLE IF NOT EXISTS badge_definitions (
      id              TEXT PRIMARY KEY,
      owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      code            TEXT NOT NULL,
      label           TEXT NOT NULL,
      description     TEXT,
      badge_type      TEXT NOT NULL CHECK (badge_type IN (
                        'progression','competency','milestone','event','ritual','challenge'
                      )),
      icon            TEXT,
      criteria_json   TEXT NOT NULL DEFAULT '{}',
      unlock_conditions_json TEXT NOT NULL DEFAULT '[]',
      reward_type     TEXT CHECK (reward_type IN (
                        'badge','unlock','feedback','resource','output','ritual'
                      )),
      reward_ref      TEXT,
      visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN (
                        'private','teacher_visible','project_visible','public_candidate'
                      )),
      saturation_risk INTEGER NOT NULL DEFAULT 0,
      status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','archived')),
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    -- Badges attribués
    CREATE TABLE IF NOT EXISTS user_badges (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id        TEXT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      awarded_by      TEXT REFERENCES users(id),
      reason          TEXT,
      evidence_ref    TEXT,
      visibility      TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN (
                        'private','teacher_visible','project_visible','public_candidate'
                      )),
      status          TEXT NOT NULL DEFAULT 'awarded'
                        CHECK (status IN ('awarded','revoked','equipped','archived')),
      awarded_at      INTEGER NOT NULL,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(user_id, badge_id)
    );

    -- Événements de progression utilisateur
    CREATE TABLE IF NOT EXISTS user_progression_events (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      event_type      TEXT NOT NULL CHECK (event_type IN (
                        'signal_ingested','milestone_reached','badge_awarded',
                        'skill_unlocked','level_changed','saturation_detected',
                        'ritual_completed','challenge_proposed','challenge_completed'
                      )),
      ref_type        TEXT,
      ref_id          TEXT,
      detail_json     TEXT NOT NULL DEFAULT '{}',
      created_at      INTEGER NOT NULL
    );

    -- Graphes pédagogiques
    CREATE TABLE IF NOT EXISTS pedagogical_graphs (
      id              TEXT PRIMARY KEY,
      owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      label           TEXT NOT NULL,
      description     TEXT,
      scope           TEXT NOT NULL DEFAULT 'general'
                        CHECK (scope IN ('general','personal','shared','subject')),
      status          TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','archived')),
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    -- Nœuds de graphe pédagogique
    CREATE TABLE IF NOT EXISTS pedagogical_graph_nodes (
      id              TEXT PRIMARY KEY,
      graph_id        TEXT NOT NULL REFERENCES pedagogical_graphs(id) ON DELETE CASCADE,
      node_type       TEXT NOT NULL CHECK (node_type IN (
                        'competency','resource','workflow','persona','project',
                        'subject','tool','methodology','discipline','exercise','feedback'
                      )),
      label           TEXT NOT NULL,
      ref_type        TEXT,
      ref_id          TEXT,
      metadata_json   TEXT NOT NULL DEFAULT '{}',
      sort_order      INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    -- Arêtes du graphe pédagogique
    CREATE TABLE IF NOT EXISTS pedagogical_graph_edges (
      id              TEXT PRIMARY KEY,
      graph_id        TEXT NOT NULL REFERENCES pedagogical_graphs(id) ON DELETE CASCADE,
      source_node_id  TEXT NOT NULL REFERENCES pedagogical_graph_nodes(id) ON DELETE CASCADE,
      target_node_id  TEXT NOT NULL REFERENCES pedagogical_graph_nodes(id) ON DELETE CASCADE,
      relation_type   TEXT NOT NULL CHECK (relation_type IN (
                        'requires','improves','extends','illustrates','contradicts',
                        'simplifies','references','recommended_for','used_in','blocks','unlocks'
                      )),
      weight          REAL,
      metadata_json   TEXT NOT NULL DEFAULT '{}',
      created_at      INTEGER NOT NULL,
      UNIQUE(source_node_id, target_node_id, relation_type)
    );

    -- ───────────────────────── D04 Personal Learning Profiles ─────────────────
    CREATE TABLE IF NOT EXISTS personal_learning_profiles (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      help_style      TEXT CHECK (help_style IN (
                          'direct','guided','explorative','visual','step_by_step'
                        )),
      help_format     TEXT CHECK (help_format IN (
                          'text','bullet','example','analogy','exercise','visual'
                        )),
      help_density    TEXT CHECK (help_density IN ('concise','balanced','detailed')),
      preferred_personas_json TEXT NOT NULL DEFAULT '[]',
      learning_state_json     TEXT NOT NULL DEFAULT '{}',
      professional_self_json  TEXT NOT NULL DEFAULT '{}',
      guidance_mode   TEXT NOT NULL DEFAULT 'auto' CHECK (guidance_mode IN (
                          'auto','discovery','structured','challenge','mentor'
                        )),
      profile_status  TEXT NOT NULL DEFAULT 'draft' CHECK (profile_status IN (
                          'draft','proposed','user_validated','teacher_validated','archived'
                        )),
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(user_id, project_id)
    );

    -- Instantanés de contexte d'aide (help context snapshots)
    CREATE TABLE IF NOT EXISTS help_context_snapshots (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_id      TEXT REFERENCES personal_learning_profiles(id) ON DELETE SET NULL,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      detected_need   TEXT NOT NULL CHECK (detected_need IN (
                          'concept','method','blockage','validation','inspiration','orientation','practice'
                        )),
      confidence      REAL NOT NULL DEFAULT 0.5,
      recommended_mode TEXT NOT NULL CHECK (recommended_mode IN (
                          'discovery','structured','challenge','mentor'
                        )),
      recommended_persona TEXT,
      context_json    TEXT NOT NULL DEFAULT '{}',
      resolved_at     INTEGER,
      created_at      INTEGER NOT NULL
    );

    -- ───────────────────────── D04 Style Mirror Profiles ──────────────────
    CREATE TABLE IF NOT EXISTS style_mirror_profiles (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      owner_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
      persona_id      TEXT REFERENCES personas(id) ON DELETE CASCADE,
      register_target     TEXT CHECK (register_target IN (
                              'auto','formal','medium','casual','playful'
                            )),
      energy_target       TEXT CHECK (energy_target IN (
                              'auto','calm','medium','high'
                            )),
      lexical_complexity  TEXT CHECK (lexical_complexity IN (
                              'auto','simple','balanced','rich'
                            )),
      mirror_intensity    REAL NOT NULL DEFAULT 0.5
                            CHECK (mirror_intensity >= 0 AND mirror_intensity <= 1),
      lexical_overrides_json          TEXT NOT NULL DEFAULT '[]',
      signature_moves_override_json   TEXT NOT NULL DEFAULT '[]',
      tone_rules_json                 TEXT NOT NULL DEFAULT '[]',
      behavior_config_json            TEXT NOT NULL DEFAULT '{}',
      source_refs_json                TEXT NOT NULL DEFAULT '[]',
      consent_status                  TEXT NOT NULL DEFAULT 'pending' CHECK (
                                        consent_status IN ('pending','granted','revoked')
                                      ),
      consent_ref                     TEXT,
      consent_granted_at              INTEGER,
      consent_revoked_at              INTEGER,
      validated_by                    TEXT REFERENCES users(id) ON DELETE SET NULL,
      validated_at                    INTEGER,
      validation_version              TEXT,
      visual_canon_ref                TEXT,
      profile_status  TEXT NOT NULL DEFAULT 'draft' CHECK (profile_status IN (
                          'draft','active','archived'
                        )),
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL,
      UNIQUE(user_id, project_id, persona_id)
    );
  `);

  ensureColumn(d, 'jobs', 'runner_id', 'TEXT');
  ensureColumn(d, 'users', 'auth_version', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn(d, 'rooms', 'project_id', 'TEXT REFERENCES projects(id) ON DELETE CASCADE');
  ensureColumn(d, 'actions', 'project_id', 'TEXT REFERENCES projects(id) ON DELETE CASCADE');
  ensureColumn(d, 'guided_sessions', 'guide_snapshot_json', 'TEXT');
  ensureColumn(d, 'guided_sessions', 'schema_snapshot_json', 'TEXT');
  ensureColumn(d, 'guided_sessions', 'consent_policy_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(d, 'style_mirror_profiles', 'behavior_config_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(d, 'style_mirror_profiles', 'source_refs_json', "TEXT NOT NULL DEFAULT '[]'");
  ensureColumn(d, 'style_mirror_profiles', 'consent_status', "TEXT NOT NULL DEFAULT 'pending'");
  ensureColumn(d, 'style_mirror_profiles', 'consent_ref', 'TEXT');
  ensureColumn(d, 'style_mirror_profiles', 'consent_granted_at', 'INTEGER');
  ensureColumn(d, 'style_mirror_profiles', 'consent_revoked_at', 'INTEGER');
  ensureColumn(d, 'style_mirror_profiles', 'validated_by', 'TEXT');
  ensureColumn(d, 'style_mirror_profiles', 'validated_at', 'INTEGER');
  ensureColumn(d, 'style_mirror_profiles', 'validation_version', 'TEXT');
  ensureColumn(d, 'style_mirror_profiles', 'visual_canon_ref', 'TEXT');
  ensureColumn(d, 'rag_context_packs', 'purpose', "TEXT NOT NULL DEFAULT 'context_retrieval'");
  ensureColumn(d, 'rag_context_packs', 'room_instance_id', 'TEXT');
  ensureColumn(d, 'rag_context_packs', 'context_tier', "TEXT NOT NULL DEFAULT 'T2'");
  ensureColumn(d, 'rag_context_packs', 'retrieval_strategy', "TEXT NOT NULL DEFAULT 'lexical'");
  ensureColumn(d, 'rag_context_packs', 'filters_json', "TEXT NOT NULL DEFAULT '{}'");
  ensureColumn(d, 'rag_query_events', 'purpose', "TEXT NOT NULL DEFAULT 'context_retrieval'");
  ensureColumn(d, 'rag_query_events', 'room_instance_id', 'TEXT');
  ensureColumn(
    d,
    'inventory_collections',
    'completion_state',
    "TEXT NOT NULL DEFAULT 'unknown'",
  );
  ensureColumn(d, 'jobs', 'claimed_at', 'INTEGER');
  ensureColumn(d, 'jobs', 'lease_expires_at', 'INTEGER');
  ensureColumn(d, 'task_model_profiles', 'model', 'TEXT');
  ensureColumn(d, 'task_model_profiles', 'role_models_json', 'TEXT');
  ensureColumn(d, 'evidence_events', 'project_id', 'TEXT');
  ensureColumn(d, 'pedagogical_signals', 'project_id', 'TEXT');
  ensureColumn(d, 'teacher_decision_deltas', 'project_id', 'TEXT');
  ensureColumn(d, 'rubric_templates', 'project_id', 'TEXT');
  ensureColumn(d, 'rubric_versions', 'project_id', 'TEXT');
  ensureColumn(d, 'institutional_grading_profiles', 'project_id', 'TEXT');
  ensureColumn(d, 'correction_batches', 'project_id', 'TEXT');
  ensureColumn(d, 'submissions', 'project_id', 'TEXT');
  ensureColumn(d, 'submissions', 'student_identity_id', 'TEXT');
  ensureColumn(d, 'submissions', 'identity_linked_by', 'TEXT');
  ensureColumn(d, 'submissions', 'identity_linked_at', 'INTEGER');
  ensureColumn(d, 'pre_correction_manifests', 'project_id', 'TEXT');
  ensureColumn(d, 'pre_correction_runs', 'project_id', 'TEXT');
  ensureColumn(d, 'pre_correction_manifests', 'context_snapshot_id', 'TEXT');
  ensureColumn(d, 'pre_correction_runs', 'context_snapshot_id', 'TEXT');
  ensureColumn(d, 'feedback_drafts', 'project_id', 'TEXT');
  ensureColumn(d, 'correction_export_previews', 'project_id', 'TEXT');
  ensureColumn(d, 'cohort_calibration_reviews', 'project_id', 'TEXT');
  ensureColumn(d, 'd12_missed_trigger_findings', 'owner_decision_json', 'TEXT');

  // Story→DA bridge columns
  ensureColumn(d, 'visual_manifests', 'workbench_id', 'TEXT REFERENCES story_workbenches(id) ON DELETE SET NULL');
  ensureColumn(d, 'visual_manifests', 'node_id', 'TEXT REFERENCES story_nodes(id) ON DELETE SET NULL');
  ensureColumn(d, 'visual_manifests', 'output_promise_json', 'TEXT');
  // Canon lock on workbenches
  ensureColumn(d, 'story_workbenches', 'canon_locked', 'INTEGER NOT NULL DEFAULT 0');

  // SQLite ne sait pas ALTER un CHECK : la colonne `task` a gagné `image_generation`.
  // On reconstruit la table (lignes préservées) sur les colonnes déjà étendues ci-dessus.
  migrateTaskModelProfilesTaskCheck(d);
  migrateValidationInboxSourceKindCheck(d);

  d.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_claimable
      ON jobs(status, type, updated_at, lease_expires_at);
    CREATE INDEX IF NOT EXISTS idx_evidence_project
      ON evidence_events(project_id, status, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_signals_project
      ON pedagogical_signals(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_teacher_deltas_project
      ON teacher_decision_deltas(project_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_rubric_templates_project
      ON rubric_templates(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_rubric_versions_project
      ON rubric_versions(project_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_grading_profiles_project
      ON institutional_grading_profiles(project_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_correction_batches_project
      ON correction_batches(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_project
      ON submissions(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_student_identity
      ON submissions(student_identity_id, identity_status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_identity_match_submission
      ON identity_match_candidates(submission_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_manifests_project
      ON pre_correction_manifests(project_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_runs_project
      ON pre_correction_runs(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_manifests_context
      ON pre_correction_manifests(context_snapshot_id, status);
    CREATE INDEX IF NOT EXISTS idx_pre_correction_runs_context
      ON pre_correction_runs(context_snapshot_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_drafts_project
      ON feedback_drafts(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_correction_export_previews_project
      ON correction_export_previews(project_id, status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_cohort_calibration_reviews_project
      ON cohort_calibration_reviews(project_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_validation_inbox_status
      ON validation_inbox_items(status, updated_at);
    CREATE INDEX IF NOT EXISTS idx_validation_inbox_source
      ON validation_inbox_items(source_kind, source_id);
  `);

  d.exec(`
    -- ──────────────────────── Registres seed legacy (P6) ────────────────────────
    CREATE TABLE IF NOT EXISTS pedagogical_error_patterns (
      id            TEXT PRIMARY KEY,
      error_id      TEXT UNIQUE NOT NULL,
      label         TEXT NOT NULL,
      category      TEXT NOT NULL,
      severity      TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
      confidence_weight REAL NOT NULL DEFAULT 0.7,
      description   TEXT NOT NULL,
      symptoms_json TEXT NOT NULL DEFAULT '[]',
      fix_strategy_json TEXT NOT NULL DEFAULT '[]',
      monster_archetype TEXT,
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS da_gate_registry (
      id            TEXT PRIMARY KEY,
      gate_id       TEXT UNIQUE NOT NULL,
      phase         TEXT NOT NULL,
      severity      TEXT NOT NULL,
      activation    TEXT NOT NULL,
      requires_json TEXT NOT NULL DEFAULT '[]',
      blocks_if_json TEXT NOT NULL DEFAULT '[]',
      retake_lever  TEXT,
      gate_data_json TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS da_layer_registry (
      id            TEXT PRIMARY KEY,
      layer_id      TEXT UNIQUE NOT NULL,
      purpose       TEXT,
      priority_order INTEGER NOT NULL DEFAULT 0,
      layer_data_json TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rag_allowlist (
      id            TEXT PRIMARY KEY,
      resource_id   TEXT UNIQUE NOT NULL,
      resource_path TEXT NOT NULL,
      resource_class TEXT NOT NULL,
      allowed_uses_json TEXT NOT NULL DEFAULT '[]',
      citation_required INTEGER NOT NULL DEFAULT 1,
      allowlist_data_json TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS opportunity_registry (
      id            TEXT PRIMARY KEY,
      opportunity_id TEXT UNIQUE NOT NULL,
      title         TEXT NOT NULL,
      domain        TEXT NOT NULL,
      priority      TEXT NOT NULL,
      decision      TEXT NOT NULL DEFAULT 'pending',
      opportunity_data_json TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS owner_registry (
      id            TEXT PRIMARY KEY,
      owner_id      TEXT UNIQUE NOT NULL,
      display_name  TEXT NOT NULL,
      scope         TEXT NOT NULL,
      owner_data_json TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pedagogical_video_resources (
      id            TEXT PRIMARY KEY,
      video_id      TEXT UNIQUE NOT NULL,
      title         TEXT NOT NULL,
      duration      TEXT,
      software_json TEXT NOT NULL DEFAULT '[]',
      topics_json   TEXT NOT NULL DEFAULT '[]',
      url           TEXT,
      data_json     TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS capability_inventory (
      id              TEXT PRIMARY KEY,
      feature_id      TEXT UNIQUE NOT NULL,
      label           TEXT NOT NULL,
      type            TEXT NOT NULL,
      owner           TEXT NOT NULL,
      description_short TEXT NOT NULL,
      activation_mode TEXT NOT NULL,
      required_permissions_json TEXT NOT NULL DEFAULT '[]',
      default_visibility TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'active_candidate',
      created_at      INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS room_recipes (
      id                TEXT PRIMARY KEY,
      room_type         TEXT UNIQUE NOT NULL,
      purpose           TEXT NOT NULL,
      default_widgets_json TEXT NOT NULL DEFAULT '[]',
      default_actions_json TEXT NOT NULL DEFAULT '[]',
      created_at        INTEGER NOT NULL
    );

    -- Story characters (MasterStory → DA bridge)
    CREATE TABLE IF NOT EXISTS story_characters (
      id            TEXT PRIMARY KEY,
      workbench_id  TEXT NOT NULL REFERENCES story_workbenches(id) ON DELETE CASCADE,
      owner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      aliases_json  TEXT NOT NULL DEFAULT '[]',
      role          TEXT NOT NULL,
      archetype     TEXT NOT NULL DEFAULT 'neutral'
                    CHECK (archetype IN ('protagonist','antagonist','mentor','ally','trickster',
                      'guardian','herald','shadow','shapeshifter','sidekick','collective','neutral')),
      status        TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','inactive','deceased','unknown','concept')),
      design_notes  TEXT,
      behavior_notes TEXT,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );
  `);
}

function ensureColumn(
  d: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const columns = d.prepare(`PRAGMA table_info('${tableName}')`).all() as Array<{name: string}>;
  if (!columns.some((column) => column.name === columnName)) {
    d.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

/**
 * Migration idempotente du CHECK `task` de `task_model_profiles` (ajout de
 * `image_generation`). SQLite ne permet pas d'ALTER un CHECK : on reconstruit la
 * table selon la procédure recommandée (foreign_keys OFF hors transaction, copie,
 * drop, rename). No-op si la table est déjà à jour ou absente. Suppose les colonnes
 * `model`/`role_models_json` déjà présentes (ajoutées par `ensureColumn` en amont).
 */
function migrateTaskModelProfilesTaskCheck(d: Database.Database): void {
  const row = d
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_model_profiles'")
    .get() as {sql?: string} | undefined;
  if (!row?.sql || row.sql.includes('image_generation')) return; // déjà à jour / absente

  d.pragma('foreign_keys = OFF');
  try {
    d.transaction(() => {
      d.exec(`
        CREATE TABLE task_model_profiles__new (
          id                     TEXT PRIMARY KEY,
          task                   TEXT NOT NULL
                                   CHECK (task IN (
                                     'ocr','rubric_extraction','criterion_analysis',
                                     'feedback_draft','cohort_synthesis','subject_revision','chat',
                                     'image_generation'
                                   )),
          allowed_providers_json TEXT NOT NULL,
          fallback_order_json    TEXT NOT NULL DEFAULT '[]',
          model                  TEXT,
          role_models_json       TEXT,
          privacy_mode           TEXT NOT NULL
                                   CHECK (privacy_mode IN ('local_only','approved_remote','hybrid')),
          max_cost_eur           REAL CHECK (max_cost_eur IS NULL OR max_cost_eur >= 0),
          max_latency_ms         INTEGER CHECK (max_latency_ms IS NULL OR max_latency_ms > 0),
          status                 TEXT NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft','validated','disabled')),
          created_at             INTEGER NOT NULL,
          updated_at             INTEGER NOT NULL,
          updated_by             TEXT REFERENCES users(id)
        );
        INSERT INTO task_model_profiles__new
          (id, task, allowed_providers_json, fallback_order_json, model, role_models_json,
           privacy_mode, max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by)
          SELECT id, task, allowed_providers_json, fallback_order_json, model, role_models_json,
                 privacy_mode, max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by
          FROM task_model_profiles;
        DROP TABLE task_model_profiles;
        ALTER TABLE task_model_profiles__new RENAME TO task_model_profiles;
        CREATE INDEX IF NOT EXISTS idx_task_model_profiles_task
          ON task_model_profiles(task, status);
      `);
    })();
  } finally {
    d.pragma('foreign_keys = ON');
  }
}

/**
 * Migration idempotente du CHECK `source_kind` de la Validation Inbox.
 * La fondation initiale acceptait uniquement `action`; D06 ajoute
 * `feedback_draft`, `correction_export_preview`, `d12_finding` puis
 * `usage_learning_candidate` sans créer d'inbox parallèle
 * et sans perdre les items existants.
 */
function migrateValidationInboxSourceKindCheck(d: Database.Database): void {
  const row = d
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='validation_inbox_items'")
    .get() as {sql?: string} | undefined;
  if (!row?.sql || row.sql.includes('visual_manifest')) return;

  d.pragma('foreign_keys = OFF');
  try {
    d.transaction(() => {
      d.exec(`
        CREATE TABLE validation_inbox_items__new (
          id                       TEXT PRIMARY KEY,
          item_type                TEXT NOT NULL,
          title                    TEXT NOT NULL,
          summary                  TEXT NOT NULL,
          domain_refs_json         TEXT NOT NULL DEFAULT '[]',
          object_refs_json         TEXT NOT NULL DEFAULT '[]',
          source_refs_json         TEXT NOT NULL DEFAULT '[]',
          requester_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          owner_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          required_validator       TEXT NOT NULL,
          status                   TEXT NOT NULL,
          risk_level               TEXT NOT NULL,
          privacy_scope            TEXT NOT NULL,
          source_truth_state       TEXT NOT NULL,
          output_readiness_state   TEXT NOT NULL,
          proposed_action          TEXT NOT NULL,
          impact_summary           TEXT NOT NULL,
          blocked_actions_json     TEXT NOT NULL DEFAULT '[]',
          allowed_actions_json     TEXT NOT NULL DEFAULT '[]',
          conflicts_json           TEXT NOT NULL DEFAULT '[]',
          open_questions_json      TEXT NOT NULL DEFAULT '[]',
          recommended_decision     TEXT,
          decision_options_json    TEXT NOT NULL DEFAULT '[]',
          decision_json            TEXT,
          audit_trace_json         TEXT NOT NULL DEFAULT '[]',
          source_kind              TEXT NOT NULL CHECK (source_kind IN (
                                     'action','feedback_draft','correction_export_preview','d12_finding',
                                     'usage_learning_candidate','factory_backflow_intake','visual_manifest'
                                   )),
          source_id                TEXT NOT NULL,
          created_at               INTEGER NOT NULL,
          updated_at               INTEGER NOT NULL,
          UNIQUE(source_kind, source_id)
        );
        INSERT INTO validation_inbox_items__new
          (id, item_type, title, summary, domain_refs_json, object_refs_json, source_refs_json,
           requester_id, owner_id, required_validator, status, risk_level, privacy_scope,
           source_truth_state, output_readiness_state, proposed_action, impact_summary,
           blocked_actions_json, allowed_actions_json, conflicts_json, open_questions_json,
           recommended_decision, decision_options_json, decision_json, audit_trace_json,
           source_kind, source_id, created_at, updated_at)
          SELECT id, item_type, title, summary, domain_refs_json, object_refs_json, source_refs_json,
                 requester_id, owner_id, required_validator, status, risk_level, privacy_scope,
                 source_truth_state, output_readiness_state, proposed_action, impact_summary,
                 blocked_actions_json, allowed_actions_json, conflicts_json, open_questions_json,
                 recommended_decision, decision_options_json, decision_json, audit_trace_json,
                 source_kind, source_id, created_at, updated_at
          FROM validation_inbox_items;
        DROP TABLE validation_inbox_items;
        ALTER TABLE validation_inbox_items__new RENAME TO validation_inbox_items;
        CREATE INDEX IF NOT EXISTS idx_validation_inbox_status
          ON validation_inbox_items(status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_validation_inbox_source
          ON validation_inbox_items(source_kind, source_id);
      `);
    })();
  } finally {
    d.pragma('foreign_keys = ON');
  }
}

// ───────────────────────── Types de rangées ─────────────────────────

export type Role = 'student' | 'teacher' | 'admin' | 'godmode';

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  password_hash: string;
  role: Role;
  scope_json: string | null;
  preferences_json: string | null;
  active: number;
  auth_version: number;
  created_at: number;
  updated_at: number;
  last_login: number | null;
}

export interface InvitationRow {
  code: string;
  role: Role;
  created_by: string;
  max_uses: number;
  used_count: number;
  note: string | null;
  expires_at: number | null;
  revoked_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface ProjectRow {
  id: string;
  owner_id: string;
  name: string;
  status: 'active' | 'archived';
  visibility: 'private';
  created_at: number;
  updated_at: number;
}

export interface ProjectMemberRow {
  project_id: string;
  user_id: string;
  role: 'viewer' | 'participant' | 'editor' | 'owner' | 'admin';
  created_at: number;
}

export interface OwnershipEdgeRow {
  id: string;
  owner_type: 'user' | 'project';
  owner_id: string;
  object_type: string;
  object_id: string;
  scope: string;
  created_at: number;
}

export interface ResourceScopeRow {
  resource_id: string;
  scope_type: 'project';
  scope_id: string;
  access_level: 'read' | 'write' | 'admin';
  created_at: number;
}

export interface InventoryCollectionRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  scope_type: 'user' | 'project';
  label: string;
  description: string | null;
  visibility_scope: 'private' | 'project';
  validation_status: 'candidate' | 'validated' | 'archived';
  completion_state: 'unknown' | 'selective' | 'complete_declared' | 'abandoned';
  created_at: number;
  updated_at: number;
}

export interface CollectionMatchRow {
  id: string;
  item_id: string;
  collection_id: string;
  match_status: 'candidate' | 'confirmed' | 'rejected';
  confidence: number | null;
  source_ref: string | null;
  created_at: number;
  updated_at: number;
}

export interface InventoryProjectNeedRow {
  id: string;
  project_id: string;
  owner_id: string;
  label: string;
  quantity: number;
  required_tags_json: string;
  status: 'open' | 'satisfied' | 'abandoned';
  created_at: number;
  updated_at: number;
}

export interface InventoryItemRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  collection_id: string | null;
  scope_type: 'user' | 'project';
  type:
    | 'book'
    | 'comic'
    | 'manga'
    | 'artbook'
    | 'art_supply'
    | 'tool'
    | 'gear'
    | 'software'
    | 'product'
    | 'archive'
    | 'custom';
  label: string;
  creator_or_brand: string | null;
  item_status:
    | 'detected'
    | 'owned_confirmed'
    | 'owned_declared'
    | 'wishlist'
    | 'complete_declared'
    | 'selective'
    | 'not_interested'
    | 'abandoned'
    | 'duplicate'
    | 'loan'
    | 'sell_or_give'
    | 'to_verify';
  validation_status: 'candidate' | 'validated' | 'archived';
  intent: string | null;
  quantity: number;
  condition: string | null;
  estimated_value: number | null;
  replacement_cost: number | null;
  usage_tags_json: string;
  source_refs_json: string;
  visibility_scope: 'private' | 'project';
  created_at: number;
  updated_at: number;
  archived_at: number | null;
}

export interface RagResourceRow {
  id: string;
  resource_id: string;
  owner_id: string;
  project_id: string | null;
  source_type: string;
  source_uri: string;
  title: string;
  status: 'candidate' | 'validated' | 'deprecated' | 'revoked' | 'archived';
  trust_status: 'unverified' | 'source_verified' | 'canonical' | 'private_reference';
  scope_type: 'owner' | 'project';
  scope_id: string;
  content_hash: string;
  indexed_at: number | null;
  revoked_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface RagResourceChunkRow {
  id: string;
  resource_id: string;
  chunk_index: number;
  content_excerpt: string;
  embedding_ref: string | null;
  token_count: number | null;
  metadata_json: string;
  status: 'active' | 'stale' | 'revoked';
  created_at: number;
  updated_at: number;
}

export interface RagContextPackRow {
  id: string;
  query_hash: string;
  user_id: string;
  purpose: string;
  room_instance_id: string | null;
  context_tier: 'T0' | 'T1' | 'T2' | 'T3' | 'T4' | 'T5';
  retrieval_strategy: 'lexical' | 'vector' | 'hybrid';
  scope_type: 'owner' | 'project';
  scope_id: string;
  citations_json: string;
  filters_json: string;
  status: 'active' | 'refused' | 'stale' | 'expired';
  refusal_reason:
    | 'no_authorized_source'
    | 'no_reliable_source'
    | 'scope_denied'
    | 'unsafe_query'
    | null;
  created_at: number;
  expires_at: number | null;
}

export interface SchemaTemplateRow {
  id: string;
  domain:
    | 'cdc'
    | 'quote_intake'
    | 'event_registration'
    | 'asset_manifest'
    | 'bot_guide'
    | 'correction'
    | 'course'
    | 'generic';
  name: string;
  status: 'candidate' | 'validated' | 'deprecated' | 'archived';
  version: number;
  owner_id: string | null;
  project_id: string | null;
  schema_json: string;
  required_fields_json: string;
  validation_rules_json: string;
  ui_hints_json: string | null;
  changelog: string;
  created_at: number;
  updated_at: number;
}

export interface ConversationGuideRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  name: string;
  purpose: string;
  domain: string;
  status: 'draft' | 'candidate' | 'validated' | 'archived';
  target_schema_id: string;
  target_schema_version: number;
  question_flow_json: string;
  completion_rules_json: string;
  functional_persona_id: string | null;
  lore_persona_id: string | null;
  ui_manifest_json: string | null;
  analytics_policy_json: string;
  consent_policy_json: string;
  version: number;
  created_at: number;
  updated_at: number;
}

export interface GuidedSessionRow {
  id: string;
  guide_id: string;
  guide_version: number;
  owner_id: string;
  project_id: string | null;
  room_id: string | null;
  access_mode: 'private';
  status: 'active' | 'completed' | 'expired' | 'revoked';
  current_question_id: string | null;
  target_schema_id: string;
  target_schema_version: number;
  guide_snapshot_json: string | null;
  schema_snapshot_json: string | null;
  consent_policy_json: string;
  progress_json: string;
  structured_record_json: string;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface GuidedSessionParticipantRow {
  session_id: string;
  user_id: string | null;
  guest_id: string | null;
  role: 'owner' | 'facilitator' | 'participant';
  display_name: string | null;
  consent_json: string;
  joined_at: number;
  last_seen_at: number;
}

export interface GuidedContributionRow {
  id: string;
  session_id: string;
  participant_ref: string;
  question_id: string;
  target_field: string;
  value_json: string;
  source: 'user' | 'facilitator';
  status: 'accepted' | 'contradiction' | 'superseded';
  supersedes_id: string | null;
  created_at: number;
}

export interface RoomRow {
  id: string;
  name: string;
  type: string;
  owner_id: string | null;
  project_id: string | null;
  context_json: string | null;
  is_public: number;
  created_at: number;
  updated_at: number;
}

export interface RoomInstanceRow {
  id: string;
  room_id: string;
  user_id: string;
  zoom_level: string;
  active_surface: string;
  cognitive_density: string;
  widget_state_json: string | null;
  created_at: number;
  updated_at: number;
}

export interface RoomCheckpointRow {
  id: string;
  room_id: string;
  room_instance_id: string;
  user_id: string;
  project_id: string | null;
  reason:
    | 'validation'
    | 'mode_change'
    | 'stable_activity'
    | 'pedagogical_progress'
    | 'significant_mutation'
    | 'manual_save';
  summary: string;
  active_widgets_json: string;
  active_mode: string;
  decisions_json: string;
  open_loops_json: string;
  media_queue_refs_json: string;
  asset_queue_refs_json: string;
  resource_refs_json: string;
  next_recommended_action: string | null;
  rollback_light_possible: number;
  privacy_scope: 'private';
  created_at: number;
}

export interface MemoryCardRow {
  id: string;
  type: string;
  owner_id: string;
  project_id: string | null;
  scope: 'user' | 'project';
  source_ref: string;
  extracted_signal: string;
  distilled_value: string;
  confidence: 'low' | 'medium' | 'high' | 'validated';
  privacy: 'public' | 'private' | 'sensitive' | 'restricted';
  affects_json: string;
  status: 'candidate' | 'active' | 'stale' | 'archived' | 'rejected';
  compression_level: 'L2' | 'L3' | 'L4';
  invalidation_rule: string;
  next_action: string | null;
  validated_by: string | null;
  created_at: number;
  updated_at: number;
}

export interface MemoryCardLinkRow {
  id: string;
  source_card_id: string;
  target_card_id: string;
  relation_type:
    | 'supports'
    | 'contradicts'
    | 'extends'
    | 'illustrates'
    | 'related_to'
    | 'broader'
    | 'narrower'
    | 'derived_from'
    | 'requires_validation'
    | 'triggers_action'
    | 'references'
    | 'used_in'
    | 'blocks'
    | 'unlocks';
  relation_family: 'semantic' | 'provenance' | 'operational';
  rationale: string;
  source_ref: string;
  confidence: 'low' | 'medium' | 'high' | 'validated';
  status: 'candidate' | 'active' | 'rejected' | 'archived';
  created_by: string;
  validated_by: string | null;
  created_at: number;
  updated_at: number;
}

export interface PersonaRow {
  id: string;
  name: string;
  owner_type: string;
  domain: string;
  status: 'active' | 'deprecated';
  voice_config_json: string | null;
  method_config_json: string | null;
  visual_config_json: string | null;
  permissions_json: string | null;
  created_at: number;
}

export interface PersonaBlendRow {
  id: string;
  room_instance_id: string;
  primary_persona_id: string;
  secondary_persona_id: string | null;
  blend_weights_json: string | null;
  active_layers_json: string | null;
  is_active: number;
  created_at: number;
  updated_at: number;
}

export interface ActionRow {
  id: string;
  registry_id: string | null;
  intent: string;
  object_type: string;
  status: string;
  user_id: string;
  room_id: string | null;
  project_id: string | null;
  engine: string | null;
  risk_level: string | null;
  payload_json: string | null;
  preflight_json: string | null;
  validator_id: string | null;
  validation_note: string | null;
  result_json: string | null;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export interface HardStopControlStateRow {
  id: string;
  owner_id: string;
  room_id: string;
  status: 'active' | 'released';
  reason: 'manual_owner_stop' | 'hard_stop';
  note: string | null;
  activated_by: string;
  released_by: string | null;
  created_at: number;
  updated_at: number;
  released_at: number | null;
}

export interface ActionContextSnapshotRow {
  id: string;
  action_id: string;
  owner_id: string;
  project_id: string | null;
  room_id: string;
  room_instance_id: string;
  action_intent: string;
  action_payload_fingerprint: string;
  authoritative_refs_json: string;
  checkpoint_ref_json: string | null;
  hard_stop_state_ref: string | null;
  context_fingerprint: string;
  created_at: number;
}

export interface ValidationInboxItemRow {
  id: string;
  item_type: string;
  title: string;
  summary: string;
  domain_refs_json: string;
  object_refs_json: string;
  source_refs_json: string;
  requester_id: string;
  owner_id: string;
  required_validator: string;
  status: string;
  risk_level: string;
  privacy_scope: string;
  source_truth_state: string;
  output_readiness_state: string;
  proposed_action: string;
  impact_summary: string;
  blocked_actions_json: string;
  allowed_actions_json: string;
  conflicts_json: string;
  open_questions_json: string;
  recommended_decision: string | null;
  decision_options_json: string;
  decision_json: string | null;
  audit_trace_json: string;
  source_kind: 'action' | 'feedback_draft' | 'correction_export_preview' | 'd12_finding' | 'usage_learning_candidate' | 'factory_backflow_intake' | 'visual_manifest';
  source_id: string;
  created_at: number;
  updated_at: number;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action_id: string | null;
  event_type: string;
  scope: string | null;
  detail_json: string | null;
  created_at: number;
}

export interface ResourceRow {
  id: string;
  type: string;
  title: string;
  url: string | null;
  source: string;
  status: 'candidate' | 'validated' | 'deprecated';
  subjects_json: string | null;
  created_at: number;
}

export interface EvidenceEventRow {
  id: string;
  source_type: string;
  adapter_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  target_refs_json: string;
  payload_ref: string;
  extraction_confidence: number | null;
  privacy_level: 'private' | 'restricted' | 'shared';
  occurred_at: number;
  status: 'candidate' | 'validated' | 'rejected' | 'archived';
  created_at: number;
}

export interface PedagogicalSignalRow {
  id: string;
  signal_type: string;
  level: string;
  project_id: string | null;
  project_scope: string;
  evidence_refs_json: string;
  recurrence: number;
  contradiction_refs_json: string;
  confidence: number | null;
  sensitivity: 'normal' | 'sensitive' | 'highly_sensitive';
  status: 'observation' | 'hypothesis' | 'candidate_pattern' | 'validated_alert' | 'stale' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface TeacherDecisionDeltaRow {
  id: string;
  object_type: string;
  object_ref: string;
  ai_proposal_ref: string;
  human_decision_ref: string;
  changed_fields_json: string;
  reason_code: string | null;
  free_note_ref: string | null;
  teacher_id: string;
  project_id: string | null;
  context_refs_json: string;
  created_at: number;
}

export interface TaskModelProfileRow {
  id: string;
  task: string;
  allowed_providers_json: string;
  fallback_order_json: string;
  model: string | null;
  role_models_json: string | null;
  privacy_mode: 'local_only' | 'approved_remote' | 'hybrid';
  max_cost_eur: number | null;
  max_latency_ms: number | null;
  status: 'draft' | 'validated' | 'disabled';
  created_at: number;
  updated_at: number;
  updated_by: string | null;
}

export interface D12MissedTriggerFindingRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  source_ref: string;
  expected_process: string;
  actual_runtime_response: string;
  missing_runtime_piece: string;
  user_impact: string;
  domain_refs_json: string;
  output_family_refs_json: string;
  evidence_refs_json: string;
  blocked_actions_json: string;
  recommended_queue_task_json: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'observation' | 'hypothesis' | 'candidate_pattern' | 'validated_alert' | 'stale' | 'archived';
  owner_decision_json: string | null;
  detected_at: number;
  created_at: number;
  updated_at: number;
}

export interface D12ReleaseReceiptRow {
  id: string;
  owner_id: string;
  commit_sha: string;
  environment_label: string;
  components_json: string;
  evidence_refs_json: string;
  observed_at: number;
  note: string | null;
  proof_state: 'unknown' | 'evidence_attached';
  runtime_status: 'not_verified';
  created_at: number;
}

export interface D12BackupReceiptRow {
  id: string; owner_id: string; target_label: string; environment_label: string; checksum_sha256: string;
  backup_observed_at: number; evidence_refs_json: string; note: string | null;
  proof_state: 'unknown' | 'evidence_attached'; restore_status: 'not_tested'; created_at: number;
}
export interface D12IncidentRecordRow{id:string;owner_id:string;severity:'low'|'medium'|'high'|'critical';impact_summary:string;scope_refs_json:string;symptom_refs_json:string;evidence_refs_json:string;observed_at:number;status:'recorded_unresolved';created_at:number;}

export interface UsageLearningCandidateRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  source_environment: 'masterflow_native' | 'portable_factory';
  source_factory_id: string | null;
  source_session_or_event: string;
  signal_type: string;
  summary: string;
  affected_process: string;
  affected_output_family: string;
  domain_refs_json: string;
  evidence_summary: string;
  evidence_refs_json: string;
  repetition_count: number;
  confidence: 'low' | 'medium' | 'high';
  status: 'observation' | 'hypothesis' | 'user_confirmed_rule' | 'contradiction' | 'open_question';
  privacy: 'safe' | 'anonymize' | 'do_not_export';
  scope: string;
  godmode_targets_json: string;
  routing_status: 'pending' | 'routed' | 'ambiguous' | 'quarantined';
  canon_status: 'candidate_only';
  review_status: 'pending' | 'approved' | 'parked' | 'rejected' | 'archived';
  reviewer_id: string | null;
  review_note: string | null;
  dedupe_key: string;
  detected_at: number;
  created_at: number;
  updated_at: number;
}

export interface FactoryBackflowIntakeRow {
  id: string;
  owner_id: string;
  factory_id: string | null;
  factory_version: string | null;
  target_platform: string | null;
  export_id: string | null;
  export_type: string | null;
  source_session_ref: string | null;
  summary: string | null;
  candidate_count: number;
  passport_json: string | null;
  backflow_export_json: string | null;
  quarantine_reasons_json: string;
  intake_status: 'candidate' | 'quarantined';
  review_status: 'pending' | 'approved' | 'parked' | 'rejected' | 'archived';
  reviewer_id: string | null;
  review_note: string | null;
  canon_status: 'candidate_only';
  created_at: number;
  updated_at: number;
}

export interface FactoryBackflowCandidateUpdateRow {
  id: string;
  intake_id: string;
  owner_id: string;
  factory_id: string | null;
  source_candidate_id: string;
  summary: string;
  classification:
    | 'SYSTEM'
    | 'PERSONA'
    | 'DA'
    | 'PROJECT_LORE'
    | 'OUTPUT'
    | 'PLATFORM'
    | 'RESOURCE'
    | 'PEDAGOGY'
    | 'PRIVATE';
  routing_status: 'unrouted';
  target_domain: string | null;
  candidate_status: 'approved_candidate';
  canon_status: 'candidate_only';
  created_at: number;
  updated_at: number;
}

export interface PreCorrectionRunRow {
  id: string;
  manifest_id: string;
  batch_id: string;
  submission_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  rubric_version_id: string;
  grading_profile_id: string;
  context_snapshot_id: string | null;
  analysis_type: string;
  evidence_snapshot_ref: string;
  method_version: string;
  model_profile_ref: string | null;
  criterion_score_refs_json: string;
  review_reasons_json: string;
  status: 'needs_review';
  created_at: number;
  updated_at: number;
}

export interface CriterionScoreDraftRow {
  id: string;
  run_id: string;
  submission_id: string;
  rubric_version_id: string;
  criterion_id: string;
  draft_score: number;
  max_points: number;
  evidence_refs_json: string;
  confidence: number;
  comment_ref: string | null;
  status: 'candidate' | 'rejected' | 'superseded';
  created_at: number;
}

export interface CohortCalibrationReviewRow {
  id: string;
  batch_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  grading_profile_id: string;
  method_version: string;
  statistics_json: string;
  diagnostic_delta_candidate: number | null;
  protected_threshold_crossing_count: number;
  alert_codes_json: string;
  sample_item_refs_json: string;
  status: 'review_required';
  created_at: number;
}

export interface QualityReviewItemRow {
  id: string;
  calibration_review_id: string;
  run_id: string;
  submission_id: string;
  raw_score: number;
  scale_json: string;
  mean_confidence: number;
  selection_reasons_json: string;
  status: 'review_required';
  created_at: number;
}

export interface FeedbackDraftRow {
  id: string;
  run_id: string;
  submission_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  method_version: string;
  model_profile_ref: string | null;
  observed_strength_ref: string;
  observed_issue_ref: string;
  evidence_refs_json: string;
  impact_on_work_ref: string;
  pedagogical_axis_ref: string;
  next_action_ref: string;
  validation_criterion_ref: string;
  tone_level: 'supportive' | 'clear' | 'firm';
  evaluation_alignment: 'aligned' | 'review_required';
  teacher_validation_required: number;
  status: 'needs_teacher_validation' | 'approved' | 'rejected';
  validator_id: string | null;
  validation_ref: string | null;
  created_at: number;
  updated_at: number;
}

export interface CorrectionExportPreviewRow {
  id: string;
  batch_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'report';
  target: 'teacher_download' | 'manual_injection';
  source_feedback_refs_json: string;
  source_run_refs_json: string;
  preview_ref: string;
  schema_version: string;
  contains_private_data: number;
  publication_allowed: number;
  human_validation_required: number;
  status: 'needs_teacher_validation' | 'approved_for_export' | 'rejected';
  validator_id: string | null;
  validation_ref: string | null;
  created_at: number;
  updated_at: number;
}

export interface JobRow {
  id: string;
  type: string;
  status: string;
  owner_id: string;
  scope_type: string;
  scope_id: string;
  risk_level: string;
  payload_json: string;
  result_json: string | null;
  error: string | null;
  progress: number;
  retry_count: number;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  completed_at: number | null;
  cancelled_at: number | null;
  runner_id: string | null;
  claimed_at: number | null;
  lease_expires_at: number | null;
}

export interface JobEventRow {
  id: string;
  job_id: string;
  event_type: string;
  detail_json: string | null;
  created_at: number;
}

export interface RunnerHeartbeatRow {
  runner_id: string;
  runner_family: string;
  job_types_json: string;
  status: 'online' | 'draining' | 'offline';
  active_job_id: string | null;
  version: string;
  host_ref: string | null;
  lease_ms: number;
  last_seen_at: number;
  updated_at: number;
}

export interface WorkflowEventRow {
  id: string;
  workflow_id: string;
  event_type: string;
  workflow_type: string;
  capability_id: string;
  owner_id: string;
  project_id: string | null;
  room_id: string | null;
  duration_ms: number | null;
  cost_eur: number | null;
  tokens: number | null;
  status: string;
  blocker_category: string | null;
  created_at: number;
}

export interface CohortRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  title: string;
  period_ref: string | null;
  status: 'active' | 'archived';
  privacy: 'private';
  created_at: number;
  updated_at: number;
}

export interface StudentIdentityRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  display_name: string;
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface RosterVersionRow {
  id: string;
  cohort_id: string;
  owner_id: string;
  version: number;
  source_ref: string;
  status: 'active' | 'archived';
  created_by: string;
  created_at: number;
  activated_at: number;
}

export interface RosterMemberRow {
  roster_version_id: string;
  student_identity_id: string;
  display_name: string;
  aliases_json: string;
  created_at: number;
}

export interface CorrectionContextSnapshotRow {
  id: string;
  batch_id: string;
  owner_id: string;
  project_id: string | null;
  cohort_id: string;
  roster_version_id: string;
  rubric_version_id: string;
  subject_version_ref: string;
  source_refs_json: string;
  process_context_profile_ref: string;
  created_by: string;
  created_at: number;
}

export interface SubmissionRow {
  id: string;
  batch_id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  student_ref: string | null;
  student_identity_id: string | null;
  identity_linked_by: string | null;
  identity_linked_at: number | null;
  source_evidence_ref: string;
  identity_status: 'unknown' | 'candidate' | 'confirmed' | 'rejected';
  status: 'candidate' | 'ready' | 'processing' | 'review' | 'completed' | 'rejected';
  privacy_level: 'private';
  created_at: number;
  updated_at: number;
}

export interface CompetencyFrameworkRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  label: string;
  description: string | null;
  domain: string;
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface CompetencyDefinitionRow {
  id: string;
  framework_id: string;
  parent_id: string | null;
  code: string;
  label: string;
  description: string | null;
  bloom_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create' | null;
  icon: string | null;
  sort_order: number;
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface UserCompetencySignalRow {
  id: string;
  user_id: string;
  competency_id: string;
  project_id: string | null;
  evidence_ref: string | null;
  source: 'teacher' | 'system' | 'self' | 'peer' | 'workflow';
  mastery_level: 'discovering' | 'guided' | 'practicing' | 'autonomous' | 'mentor_ready';
  autonomy_level: 'dependent' | 'assisted' | 'independent' | 'initiative' | 'mentor' | null;
  confidence: number;
  observation: string | null;
  validation_required: number;
  validator_id: string | null;
  validated_at: number | null;
  status: 'candidate' | 'validated' | 'rejected' | 'superseded';
  created_at: number;
  updated_at: number;
}

export interface UserCompetencyProgressRow {
  id: string;
  user_id: string;
  competency_id: string;
  project_id: string | null;
  current_mastery: 'unknown' | 'discovering' | 'guided' | 'practicing' | 'autonomous' | 'mentor_ready';
  current_autonomy: 'unknown' | 'dependent' | 'assisted' | 'independent' | 'initiative' | 'mentor' | null;
  confidence: number;
  signal_count: number;
  last_signal_at: number | null;
  trajectory: 'emerging' | 'consolidating' | 'unstable' | 'transferred' | 'blocked' | 'needs_review' | null;
  validation_required: number;
  created_at: number;
  updated_at: number;
}

export interface SkillTreeNodeRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  label: string;
  node_type: 'competency' | 'capability' | 'app' | 'engine' | 'widget' | 'export' | 'pack' | 'permission' | 'asset_render' | 'reward_asset' | 'methodology' | 'teacher_persona' | 'companion' | 'living_idea';
  status: 'locked' | 'available' | 'active' | 'equipped' | 'validation_required' | 'admin_only' | 'cooldown' | 'future_ready' | 'deprecated' | 'conflict';
  unlock_source: string | null;
  required_role: string | null;
  required_pack: string | null;
  required_validation: number;
  runtime_cost: number | null;
  visible_to_user: number;
  usable_by_user: number;
  equipped: number;
  explanation: string | null;
  companion_family: 'MOTH' | 'MOLEKID' | 'INCUBATOR_CREATURE' | 'MASTERFLEX_HELPER' | 'STUDENT_DISCOVERY' | 'PROJECT_MONSTER' | null;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface SkillTreeNodeDependencyRow {
  node_id: string;
  depends_on_id: string;
  dependency_type: 'requires' | 'improves' | 'extends' | 'blocks' | 'unlocks';
  created_at: number;
}

export interface BadgeDefinitionRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  code: string;
  label: string;
  description: string | null;
  badge_type: 'progression' | 'competency' | 'milestone' | 'event' | 'ritual' | 'challenge';
  icon: string | null;
  criteria_json: string;
  unlock_conditions_json: string;
  reward_type: 'badge' | 'unlock' | 'feedback' | 'resource' | 'output' | 'ritual' | null;
  reward_ref: string | null;
  visibility: 'private' | 'teacher_visible' | 'project_visible' | 'public_candidate';
  saturation_risk: number;
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface UserBadgeRow {
  id: string;
  user_id: string;
  badge_id: string;
  project_id: string | null;
  awarded_by: string | null;
  reason: string | null;
  evidence_ref: string | null;
  visibility: 'private' | 'teacher_visible' | 'project_visible' | 'public_candidate';
  status: 'awarded' | 'revoked' | 'equipped' | 'archived';
  awarded_at: number;
  created_at: number;
  updated_at: number;
}

export interface UserProgressionEventRow {
  id: string;
  user_id: string;
  project_id: string | null;
  event_type: 'signal_ingested' | 'milestone_reached' | 'badge_awarded' | 'skill_unlocked' | 'level_changed' | 'saturation_detected' | 'ritual_completed' | 'challenge_proposed' | 'challenge_completed';
  ref_type: string | null;
  ref_id: string | null;
  detail_json: string;
  created_at: number;
}

export interface PedagogicalGraphRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  label: string;
  description: string | null;
  scope: 'general' | 'personal' | 'shared' | 'subject';
  status: 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface PedagogicalGraphNodeRow {
  id: string;
  graph_id: string;
  node_type: 'competency' | 'resource' | 'workflow' | 'persona' | 'project' | 'subject' | 'tool' | 'methodology' | 'discipline' | 'exercise' | 'feedback';
  label: string;
  ref_type: string | null;
  ref_id: string | null;
  metadata_json: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface PedagogicalGraphEdgeRow {
  id: string;
  graph_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: 'requires' | 'improves' | 'extends' | 'illustrates' | 'contradicts' | 'simplifies' | 'references' | 'recommended_for' | 'used_in' | 'blocks' | 'unlocks';
  weight: number | null;
  metadata_json: string;
  created_at: number;
}

export interface PersonalLearningProfileRow {
  id: string;
  user_id: string;
  owner_id: string;
  project_id: string | null;
  help_style: 'direct' | 'guided' | 'explorative' | 'visual' | 'step_by_step' | null;
  help_format: 'text' | 'bullet' | 'example' | 'analogy' | 'exercise' | 'visual' | null;
  help_density: 'concise' | 'balanced' | 'detailed' | null;
  preferred_personas_json: string;
  learning_state_json: string;
  professional_self_json: string;
  guidance_mode: 'auto' | 'discovery' | 'structured' | 'challenge' | 'mentor';
  profile_status: 'draft' | 'proposed' | 'user_validated' | 'teacher_validated' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface HelpContextSnapshotRow {
  id: string;
  user_id: string;
  profile_id: string | null;
  project_id: string | null;
  detected_need: 'concept' | 'method' | 'blockage' | 'validation' | 'inspiration' | 'orientation' | 'practice';
  confidence: number;
  recommended_mode: 'discovery' | 'structured' | 'challenge' | 'mentor';
  recommended_persona: string | null;
  context_json: string;
  resolved_at: number | null;
  created_at: number;
}

export interface StyleMirrorProfileRow {
  id: string;
  user_id: string;
  owner_id: string;
  project_id: string | null;
  persona_id: string | null;
  register_target: 'auto' | 'formal' | 'medium' | 'casual' | 'playful' | null;
  energy_target: 'auto' | 'calm' | 'medium' | 'high' | null;
  lexical_complexity: 'auto' | 'simple' | 'balanced' | 'rich' | null;
  mirror_intensity: number;
  lexical_overrides_json: string;
  signature_moves_override_json: string;
  tone_rules_json: string;
  behavior_config_json: string;
  source_refs_json: string;
  consent_status: 'pending' | 'granted' | 'revoked';
  consent_ref: string | null;
  consent_granted_at: number | null;
  consent_revoked_at: number | null;
  validated_by: string | null;
  validated_at: number | null;
  validation_version: string | null;
  visual_canon_ref: string | null;
  profile_status: 'draft' | 'active' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface PedagogicalErrorPatternRow {
  id: string;
  error_id: string;
  label: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence_weight: number;
  description: string;
  symptoms_json: string;
  fix_strategy_json: string;
  monster_archetype: string | null;
  created_at: number;
}

export interface DaGateRegistryRow {
  id: string;
  gate_id: string;
  phase: string;
  severity: string;
  activation: string;
  requires_json: string;
  blocks_if_json: string;
  retake_lever: string | null;
  gate_data_json: string;
  created_at: number;
}

export interface DaLayerRegistryRow {
  id: string;
  layer_id: string;
  purpose: string | null;
  priority_order: number;
  layer_data_json: string;
  created_at: number;
}

export interface RagAllowlistRow {
  id: string;
  resource_id: string;
  resource_path: string;
  resource_class: string;
  allowed_uses_json: string;
  citation_required: number;
  allowlist_data_json: string;
  created_at: number;
}

export interface OpportunityRegistryRow {
  id: string;
  opportunity_id: string;
  title: string;
  domain: string;
  priority: string;
  decision: string;
  opportunity_data_json: string;
  created_at: number;
}

export interface OwnerRegistryRow {
  id: string;
  owner_id: string;
  display_name: string;
  scope: string;
  owner_data_json: string;
  created_at: number;
}

export interface CapabilityRow {
  id: string;
  feature_id: string;
  label: string;
  type: string;
  owner: string;
  description_short: string;
  activation_mode: string;
  required_permissions_json: string;
  default_visibility: string;
  status: string;
  created_at: number;
}

export interface RoomRecipeRow {
  id: string;
  room_type: string;
  purpose: string;
  default_widgets_json: string;
  default_actions_json: string;
  created_at: number;
}

export interface StoryCharacterRow {
  id: string;
  workbench_id: string;
  owner_id: string;
  name: string;
  aliases_json: string;
  role: string;
  archetype: string;
  status: string;
  design_notes: string | null;
  behavior_notes: string | null;
  metadata_json: string;
  created_at: number;
  updated_at: number;
}
