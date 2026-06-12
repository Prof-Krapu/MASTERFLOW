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

    -- ───────────────────────── Rooms (UI Room OS) ──────────────────────────
    CREATE TABLE IF NOT EXISTS rooms (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'home',
      owner_id    TEXT REFERENCES users(id),
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

    -- ───────────────────────── Index ───────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_room_instances_user ON room_instances(user_id);
    CREATE INDEX IF NOT EXISTS idx_persona_blends_ri   ON persona_blends(room_instance_id);
    CREATE INDEX IF NOT EXISTS idx_actions_status      ON actions(status);
    CREATE INDEX IF NOT EXISTS idx_actions_user        ON actions(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_action        ON audit_logs(action_id);
    CREATE INDEX IF NOT EXISTS idx_resources_status    ON resources(status);
    CREATE INDEX IF NOT EXISTS idx_token_events_ts      ON token_events(ts);
    CREATE INDEX IF NOT EXISTS idx_token_events_user    ON token_events(user_id);
    CREATE INDEX IF NOT EXISTS idx_token_events_user_ts ON token_events(user_id, ts);
    CREATE INDEX IF NOT EXISTS idx_revoked_expires     ON revoked_tokens(expires_at);
  `);
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
  created_at: number;
  updated_at: number;
  last_login: number | null;
}

export interface RoomRow {
  id: string;
  name: string;
  type: string;
  owner_id: string | null;
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

export interface PersonaRow {
  id: string;
  name: string;
  owner_type: string;
  domain: string;
  status: string;
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
