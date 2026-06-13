import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';

let ownerId: string;

beforeAll(async () => {
  await seedAll();
  ownerId = (
    getDb().prepare("SELECT id FROM users WHERE username = 'vincent'").get() as {id: string}
  ).id;
});

describe('PR-C1 — stockage fondationnel de correction', () => {
  it('crée les six tables et leurs index principaux', () => {
    const tables = getDb()
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name IN (
          'rubric_templates','rubric_versions','institutional_grading_profiles',
          'correction_batches','submissions','pre_correction_manifests'
        ) ORDER BY name`,
      )
      .all() as Array<{name: string}>;
    expect(tables.map((row) => row.name)).toHaveLength(6);
  });

  it('persiste une chaîne draft complète sans score ni exécution', () => {
    const db = getDb();
    const now = Date.now();
    db.prepare(
      `INSERT INTO rubric_templates
         (id, owner_id, project_scope, title, subject_ref, current_version_ref,
          status, created_at, updated_at)
       VALUES ('template-storage', ?, 'course-storage', 'Projet final', NULL, NULL,
               'draft', ?, ?)`,
    ).run(ownerId, now, now);
    db.prepare(
      `INSERT INTO rubric_versions
         (id, template_id, version, project_scope, criteria_json, total_points,
          status, created_by, created_at)
       VALUES ('rubric-storage-v1', 'template-storage', 1, 'course-storage', ?, 20,
               'draft', ?, ?)`,
    ).run(
      JSON.stringify([
        {
          criterion_id: 'quality',
          label: 'Qualité',
          description: 'Niveau attendu',
          weight: 1,
          max_points: 20,
          evidence_requirements: [],
          required: true,
        },
      ]),
      ownerId,
      now,
    );
    db.prepare(
      `INSERT INTO institutional_grading_profiles
         (id, owner_id, project_scope, version, scale_json, expected_band_json,
          anchors_json, calibration_mode, max_global_delta,
          protected_thresholds_json, threshold_crossing_requires_validation,
          status, created_at)
       VALUES ('grading-storage-v1', ?, 'course-storage', 1, '[0,20]', '[13,14]', ?,
               'diagnostic_then_teacher_validation', 1, '[10]', 1, 'draft', ?)`,
    ).run(ownerId, JSON.stringify({expected: [12, 14.49]}), now);
    db.prepare(
      `INSERT INTO correction_batches
         (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
          status, submission_count, created_at, updated_at)
       VALUES ('batch-storage', ?, 'course-storage', 'rubric-storage-v1',
               'grading-storage-v1', 'draft', 0, ?, ?)`,
    ).run(ownerId, now, now);

    const columns = db
      .prepare("PRAGMA table_info('correction_batches')")
      .all() as Array<{name: string}>;
    expect(columns.map((column) => column.name)).not.toContain('final_score');
    expect(columns.map((column) => column.name)).not.toContain('result_json');
  });

  it('refuse un manifest validé sans référence de validation', () => {
    expect(() =>
      getDb()
        .prepare(
          `INSERT INTO pre_correction_manifests
             (id, batch_id, project_scope, rubric_version_id, grading_profile_id,
              submission_refs_json, workflow_version, status, created_by,
              validation_ref, created_at)
           VALUES ('manifest-invalid', 'batch-storage', 'course-storage',
                   'rubric-storage-v1', 'grading-storage-v1', '[]', 'workflow-v1',
                   'validated', ?, NULL, ?)`,
        )
        .run(ownerId, Date.now()),
    ).toThrow();
  });
});
