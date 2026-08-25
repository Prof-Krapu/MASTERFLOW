import Database from 'better-sqlite3';
import {existsSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

/**
 * Couche SQLite de API_manage.
 *
 * Le fichier DB vit dans `data/api-manage.db` à la racine du projet, gitignored,
 * et SURVIT aux mises à jour des 3 sous-apps (PC/FR/NL). C'est cette propriété
 * qui garantit la persistance des classes/DS/configs entre rebuilds.
 *
 * Toutes les migrations sont idempotentes (`CREATE TABLE IF NOT EXISTS …`),
 * exécutées au boot d'Express. Pas de versioning manuel : on ajoute des colonnes
 * via `ALTER TABLE … ADD COLUMN` quand nécessaire.
 */

const DB_PATH = resolve(process.cwd(), 'data', 'api-manage.db');

let db: Database.Database | null = null;

/** Renvoie l'instance singleton, l'ouvre + applique les migrations au premier appel. */
export function getDb(): Database.Database {
  if (db) return db;

  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, {recursive: true});

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);
  return db;
}

function migrate(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    INTEGER NOT NULL,
      last_login    INTEGER
    );

    CREATE TABLE IF NOT EXISTS invites (
      code         TEXT PRIMARY KEY,
      created_by   TEXT NOT NULL REFERENCES users(id),
      created_at   INTEGER NOT NULL,
      expires_at   INTEGER,
      max_uses     INTEGER NOT NULL DEFAULT 1,
      used_count   INTEGER NOT NULL DEFAULT 0,
      revoked      INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS user_storage (
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      app        TEXT NOT NULL,
      key        TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, app, key)
    );

    CREATE TABLE IF NOT EXISTS global_settings (
      app        TEXT NOT NULL,
      key        TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT NOT NULL REFERENCES users(id),
      PRIMARY KEY (app, key)
    );

    CREATE TABLE IF NOT EXISTS token_events (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      app               TEXT NOT NULL,
      ts                INTEGER NOT NULL,
      model             TEXT NOT NULL,
      task              TEXT NOT NULL,
      prompt_tokens     INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      pages             INTEGER NOT NULL DEFAULT 0,
      cost_eur          REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS feedback_tickets (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      app          TEXT NOT NULL,
      kind         TEXT NOT NULL CHECK (kind IN ('error', 'feedback')),
      ts           INTEGER NOT NULL,
      matiere      TEXT,
      ds_titre     TEXT,
      niveau       TEXT,
      step         TEXT,
      model        TEXT,
      status_code  INTEGER,
      satisfaction TEXT,
      category     TEXT,
      message      TEXT,
      context_json TEXT,
      read         INTEGER NOT NULL DEFAULT 0,
      resolved     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS news (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      content     TEXT NOT NULL,
      category    TEXT NOT NULL CHECK (category IN ('nouveauté', 'mise à jour', 'information')),
      published   INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL,
      created_by  TEXT NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS news_reads (
      user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      news_id  INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
      read_at  INTEGER NOT NULL,
      PRIMARY KEY (user_id, news_id)
    );

    CREATE TABLE IF NOT EXISTS access_requests (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      email          TEXT NOT NULL,
      name           TEXT,
      message        TEXT,
      status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      mailing_opt_in INTEGER NOT NULL DEFAULT 0,
      invite_code    TEXT, -- volontairement sans FK : la révocation d'une invite fait un DELETE FROM invites
      read           INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL,
      processed_at   INTEGER
    );

    CREATE TABLE IF NOT EXISTS mailing_list (
      email          TEXT PRIMARY KEY,
      subscribed_at  INTEGER NOT NULL,
      source         TEXT NOT NULL DEFAULT 'access_request' CHECK (source IN ('access_request', 'admin')),
      active         INTEGER NOT NULL DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_events_user_app ON token_events(user_id, app, ts);
    CREATE INDEX IF NOT EXISTS idx_storage_user ON user_storage(user_id);
    CREATE INDEX IF NOT EXISTS idx_invites_active ON invites(revoked, used_count, max_uses);
    CREATE INDEX IF NOT EXISTS idx_feedback_read ON feedback_tickets(read, ts);
    CREATE INDEX IF NOT EXISTS idx_feedback_app ON feedback_tickets(app, ts);
    CREATE INDEX IF NOT EXISTS idx_news_published ON news(published, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_news_reads_user ON news_reads(user_id);
    CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_access_requests_read ON access_requests(read, created_at);
  `);

  // Ajouts de colonnes post-création (idempotents) : SQLite ne supporte pas
  // "ADD COLUMN IF NOT EXISTS", on interroge donc le schéma existant.
  addColumnIfMissing(d, 'token_events', 'ds_ref', 'TEXT');
  addColumnIfMissing(d, 'token_events', 'ds_title', 'TEXT');
  addColumnIfMissing(d, 'users', 'email', 'TEXT');
  // Correcteur unique rattaché au compte, choisi à l'inscription et modifiable
  // uniquement par l'admin. NULL = pas de restriction (comptes historiques + admins).
  addColumnIfMissing(d, 'users', 'assigned_app', 'TEXT');
  // Nom affiché dans les correcteurs (« Bonjour X »). Renseigné à l'inscription, soit
  // saisi, soit repris du « Nom et prénom » de la demande d'accès. NULL = on retombe
  // sur username, qui n'est qu'un identifiant de connexion.
  addColumnIfMissing(d, 'users', 'display_name', 'TEXT');
  addColumnIfMissing(d, 'news', 'emailed_at', 'INTEGER');
  d.exec(`CREATE INDEX IF NOT EXISTS idx_events_ds ON token_events(ds_ref);`);
}

/** Ajoute une colonne uniquement si elle n'existe pas déjà (migration idempotente). */
function addColumnIfMissing(d: Database.Database, table: string, column: string, type: string): void {
  const cols = d.prepare(`PRAGMA table_info(${table})`).all() as {name: string}[];
  if (!cols.some((c) => c.name === column)) {
    d.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
  }
}

/** Helpers typés sur les rangées les plus fréquentes. */
export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: 'admin' | 'user';
  active: number;
  created_at: number;
  last_login: number | null;
  email: string | null;
  assigned_app: string | null;
  display_name: string | null;
}

export interface InviteRow {
  code: string;
  created_by: string;
  created_at: number;
  expires_at: number | null;
  max_uses: number;
  used_count: number;
  revoked: number;
}

export interface StorageRow {
  user_id: string;
  app: string;
  key: string;
  value_json: string;
  updated_at: number;
}

export interface GlobalSettingRow {
  app: string;
  key: string;
  value_json: string;
  updated_at: number;
  updated_by: string;
}

export interface TokenEventRow {
  id: number;
  user_id: string;
  app: string;
  ts: number;
  model: string;
  task: string;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  ds_ref: string | null;
  ds_title: string | null;
}

export interface FeedbackTicketRow {
  id: number;
  user_id: string;
  app: string;
  kind: 'error' | 'feedback';
  ts: number;
  matiere: string | null;
  ds_titre: string | null;
  niveau: string | null;
  step: string | null;
  model: string | null;
  status_code: number | null;
  satisfaction: string | null;
  category: string | null;
  message: string | null;
  context_json: string | null;
  read: number;
  resolved: number;
}

export interface NewsRow {
  id: number;
  title: string;
  content: string;
  category: 'nouveauté' | 'mise à jour' | 'information';
  published: number;
  created_at: number;
  updated_at: number;
  created_by: string;
  emailed_at: number | null;
}

export interface NewsReadRow {
  user_id: string;
  news_id: number;
  read_at: number;
}

export interface AccessRequestRow {
  id: number;
  email: string;
  name: string | null;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  mailing_opt_in: number;
  invite_code: string | null;
  read: number;
  created_at: number;
  processed_at: number | null;
}

export interface MailingListRow {
  email: string;
  subscribed_at: number;
  source: 'access_request' | 'admin';
  active: number;
}
