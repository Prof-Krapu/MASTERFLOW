import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';

let teacherId: string;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  teacherId = 'teacher-pedagogy-storage';
  db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, 'teacher_pedagogy_storage', 'Teacher Pedagogy Storage', 'x', 'teacher', 1, ?, ?)`,
  ).run(teacherId, now, now);
});

describe('PR-CB0 — persistance evidence, signaux et deltas', () => {
  it('crée les tables et indexes de manière idempotente', () => {
    const db = getDb();
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
             'evidence_events',
             'pedagogical_signals',
             'teacher_decision_deltas',
             'task_model_profiles'
           )
         ORDER BY name`,
      )
      .all() as Array<{name: string}>;

    expect(tables.map((row) => row.name)).toEqual([
      'evidence_events',
      'pedagogical_signals',
      'task_model_profiles',
      'teacher_decision_deltas',
    ]);

    const indexes = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'index' AND name LIKE 'idx_%'
           AND tbl_name IN (
             'evidence_events',
             'pedagogical_signals',
             'teacher_decision_deltas',
             'task_model_profiles'
           )`,
      )
      .all() as Array<{name: string}>;
    expect(indexes.map((row) => row.name)).toContain('idx_teacher_deltas_project');

    const deltaColumns = db
      .prepare(`PRAGMA table_info('teacher_decision_deltas')`)
      .all() as Array<{name: string}>;
    expect(deltaColumns.map((row) => row.name)).toContain('project_id');
  });

  it('stocke une evidence privée par défaut et refuse une confiance hors bornes', () => {
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO evidence_events
         (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
          payload_ref, extraction_confidence, occurred_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = Date.now();
    insert.run(
      'evidence-storage-001',
      'submission',
      'ocr-submission-v1',
      teacherId,
      'course-001',
      '["submission-001"]',
      'storage://submission-001',
      0.9,
      now,
      now,
    );

    const row = db
      .prepare('SELECT privacy_level, status FROM evidence_events WHERE id = ?')
      .get('evidence-storage-001') as {privacy_level: string; status: string};
    expect(row).toEqual({privacy_level: 'private', status: 'candidate'});

    expect(() =>
      insert.run(
        'evidence-storage-invalid',
        'submission',
        'ocr-submission-v1',
        teacherId,
        'course-001',
        '[]',
        'storage://invalid',
        1.1,
        now,
        now,
      ),
    ).toThrow();
  });

  it('refuse de confondre proposition IA et décision professeur', () => {
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO teacher_decision_deltas
         (id, object_type, object_ref, ai_proposal_ref, human_decision_ref,
          changed_fields_json, teacher_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    expect(() =>
      insert.run(
        'delta-storage-invalid',
        'feedback',
        'feedback-001',
        'feedback-version-001',
        'feedback-version-001',
        '["observed_issue"]',
        teacherId,
        Date.now(),
      ),
    ).toThrow();
  });

  it('conserve les signaux sensibles comme observations et les profils modèle en draft', () => {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `INSERT INTO pedagogical_signals
         (id, signal_type, level, project_scope, evidence_refs_json, recurrence,
          confidence, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'signal-storage-001',
      'confusion',
      'cohort',
      'course-001',
      '["evidence-storage-001"]',
      1,
      0.6,
      now,
      now,
    );

    db.prepare(
      `INSERT INTO task_model_profiles
         (id, task, allowed_providers_json, fallback_order_json, privacy_mode,
          max_cost_eur, max_latency_ms, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'task-profile-storage-001',
      'criterion_analysis',
      '["local-provider"]',
      '[]',
      'local_only',
      0,
      30_000,
      now,
      now,
      teacherId,
    );

    const signal = db
      .prepare('SELECT sensitivity, status FROM pedagogical_signals WHERE id = ?')
      .get('signal-storage-001') as {sensitivity: string; status: string};
    const profile = db
      .prepare('SELECT status FROM task_model_profiles WHERE id = ?')
      .get('task-profile-storage-001') as {status: string};

    expect(signal).toEqual({sensitivity: 'sensitive', status: 'observation'});
    expect(profile.status).toBe('draft');
  });
});
