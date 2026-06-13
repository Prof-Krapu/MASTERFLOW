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
      context_refs_json  TEXT NOT NULL DEFAULT '[]',
      created_at         INTEGER NOT NULL,
      CHECK (ai_proposal_ref <> human_decision_ref)
    );

    CREATE TABLE IF NOT EXISTS task_model_profiles (
      id                     TEXT PRIMARY KEY,
      task                   TEXT NOT NULL
                               CHECK (task IN (
                                 'ocr','rubric_extraction','criterion_analysis',
                                 'feedback_draft','cohort_synthesis','subject_revision','chat'
                               )),
      allowed_providers_json TEXT NOT NULL,
      fallback_order_json    TEXT NOT NULL DEFAULT '[]',
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
      project_scope       TEXT NOT NULL,
      title               TEXT NOT NULL,
      subject_ref         TEXT,
      current_version_ref TEXT,
      status              TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','active','deprecated')),
      created_at          INTEGER NOT NULL,
      updated_at          INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rubric_versions (
      id            TEXT PRIMARY KEY,
      template_id   TEXT NOT NULL REFERENCES rubric_templates(id) ON DELETE CASCADE,
      version       INTEGER NOT NULL CHECK (version > 0),
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
      project_scope      TEXT NOT NULL,
      rubric_version_id  TEXT NOT NULL REFERENCES rubric_versions(id),
      grading_profile_id TEXT NOT NULL REFERENCES institutional_grading_profiles(id),
      status             TEXT NOT NULL DEFAULT 'draft'
                           CHECK (status IN (
                             'draft','ready','running','review','completed','failed','archived'
                           )),
      submission_count   INTEGER NOT NULL DEFAULT 0 CHECK (submission_count >= 0),
      created_at         INTEGER NOT NULL,
      updated_at         INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id                  TEXT PRIMARY KEY,
      batch_id            TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
      owner_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_scope       TEXT NOT NULL,
      student_ref         TEXT,
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

    CREATE TABLE IF NOT EXISTS pre_correction_manifests (
      id                 TEXT PRIMARY KEY,
      batch_id           TEXT NOT NULL REFERENCES correction_batches(id) ON DELETE CASCADE,
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
      project_scope         TEXT NOT NULL,
      rubric_version_id     TEXT NOT NULL REFERENCES rubric_versions(id),
      grading_profile_id    TEXT NOT NULL REFERENCES institutional_grading_profiles(id),
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
  `);

  ensureColumn(d, 'jobs', 'runner_id', 'TEXT');
  ensureColumn(d, 'jobs', 'claimed_at', 'INTEGER');
  ensureColumn(d, 'jobs', 'lease_expires_at', 'INTEGER');
  d.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_claimable
      ON jobs(status, type, updated_at, lease_expires_at);
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

export interface EvidenceEventRow {
  id: string;
  source_type: string;
  adapter_id: string;
  owner_id: string;
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
  context_refs_json: string;
  created_at: number;
}

export interface TaskModelProfileRow {
  id: string;
  task: string;
  allowed_providers_json: string;
  fallback_order_json: string;
  privacy_mode: 'local_only' | 'approved_remote' | 'hybrid';
  max_cost_eur: number | null;
  max_latency_ms: number | null;
  status: 'draft' | 'validated' | 'disabled';
  created_at: number;
  updated_at: number;
  updated_by: string | null;
}

export interface PreCorrectionRunRow {
  id: string;
  manifest_id: string;
  batch_id: string;
  submission_id: string;
  owner_id: string;
  project_scope: string;
  rubric_version_id: string;
  grading_profile_id: string;
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
