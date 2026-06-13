import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createCalibrationReview,
  getCalibrationReview,
} from '../src/services/calibration_review.ts';

const teacher: AuthUser = {
  id: 'teacher-calibration',
  username: 'teacher_calibration',
  role: 'teacher',
};
const otherTeacher: AuthUser = {
  id: 'teacher-calibration-other',
  username: 'teacher_calibration_other',
  role: 'teacher',
};
const student: AuthUser = {
  id: 'student-calibration',
  username: 'student_calibration',
  role: 'student',
};
const admin: AuthUser = {
  id: 'admin-calibration',
  username: 'admin_calibration',
  role: 'admin',
};
const now = Date.now();

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, otherTeacher, student, admin]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  db.prepare(
    `INSERT INTO evidence_events
       (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
        payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
     VALUES ('evidence-calibration', 'submission', 'ocr-submission-v1', ?,
             'course-calibration', '[]', 'storage://private/calibration',
             0.9, 'private', ?, 'candidate', ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_templates
       (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES ('template-calibration', ?, 'course-calibration',
             'Calibration', 'active', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES ('rubric-calibration-v1', 'template-calibration', 1,
             'course-calibration', ?, 20, 'validated', ?, ?)`,
  ).run(
    JSON.stringify([
      {
        criterion_id: 'global',
        label: 'Global',
        description: 'Score brut de test.',
        weight: 1,
        max_points: 20,
        evidence_requirements: [],
        required: true,
      },
    ]),
    teacher.id,
    now,
  );
  db.prepare(
    `INSERT INTO institutional_grading_profiles
       (id, owner_id, project_scope, version, scale_json, expected_band_json,
        anchors_json, calibration_mode, max_global_delta,
        protected_thresholds_json, threshold_crossing_requires_validation,
        status, created_at)
     VALUES ('grading-calibration-v1', ?, 'course-calibration', 1,
             '[0,20]', '[13,14]', '{}', 'diagnostic_then_teacher_validation',
             1, '[10]', 1, 'validated', ?)`,
  ).run(teacher.id, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-calibration', ?, 'course-calibration',
             'rubric-calibration-v1', 'grading-calibration-v1',
             'review', 4, ?, ?)`,
  ).run(teacher.id, now, now);

  const insertSubmission = db.prepare(
    `INSERT INTO submissions
       (id, batch_id, owner_id, project_scope, source_evidence_ref,
        identity_status, status, privacy_level, created_at, updated_at)
     VALUES (?, 'batch-calibration', ?, 'course-calibration',
             'evidence-calibration', 'confirmed', 'review', 'private', ?, ?)`,
  );
  for (let index = 1; index <= 4; index += 1) {
    insertSubmission.run(`submission-calibration-${index}`, teacher.id, now, now);
  }
  db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_scope, rubric_version_id, grading_profile_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES ('manifest-calibration', 'batch-calibration', 'course-calibration',
             'rubric-calibration-v1', 'grading-calibration-v1', ?,
             'workflow-v1', 'validated', ?, 'validation-calibration', ?)`,
  ).run(
    JSON.stringify([
      'submission-calibration-1',
      'submission-calibration-2',
      'submission-calibration-3',
      'submission-calibration-4',
    ]),
    teacher.id,
    now,
  );

  const insertRun = db.prepare(
    `INSERT INTO pre_correction_runs
       (id, manifest_id, batch_id, submission_id, owner_id, project_scope,
        rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
        method_version, criterion_score_refs_json, review_reasons_json,
        status, created_at, updated_at)
     VALUES (?, 'manifest-calibration', 'batch-calibration', ?, ?,
             'course-calibration', 'rubric-calibration-v1', 'grading-calibration-v1',
             'rubric_scoring', ?, 'criterion-analysis-v1', ?, '[]',
             'needs_review', ?, ?)`,
  );
  const insertScore = db.prepare(
    `INSERT INTO criterion_score_drafts
       (id, run_id, submission_id, rubric_version_id, criterion_id, draft_score,
        max_points, evidence_refs_json, confidence, status, created_at)
     VALUES (?, ?, ?, 'rubric-calibration-v1', 'global', ?, 20,
             '["evidence-calibration"]', ?, 'candidate', ?)`,
  );
  const fixtures = [
    {score: 8, confidence: 0.9},
    {score: 9.5, confidence: 0.4},
    {score: 10.2, confidence: 0.8},
    {score: 11, confidence: 0.85},
  ];
  fixtures.forEach((fixture, index) => {
    const suffix = index + 1;
    const runId = `run-calibration-${suffix}`;
    const submissionId = `submission-calibration-${suffix}`;
    const scoreId = `score-calibration-${suffix}`;
    insertRun.run(
      runId,
      submissionId,
      teacher.id,
      `storage://private/snapshots/${runId}`,
      JSON.stringify([scoreId]),
      now,
      now,
    );
    insertScore.run(
      scoreId,
      runId,
      submissionId,
      fixture.score,
      fixture.confidence,
      now,
    );
  });

  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-calibration-small', ?, 'course-calibration',
             'rubric-calibration-v1', 'grading-calibration-v1',
             'review', 2, ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_scope, rubric_version_id, grading_profile_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES ('manifest-calibration-small', 'batch-calibration-small',
             'course-calibration', 'rubric-calibration-v1', 'grading-calibration-v1',
             ?, 'workflow-v1', 'validated', ?, 'validation-calibration-small', ?)`,
  ).run(
    JSON.stringify([
      'submission-calibration-small-1',
      'submission-calibration-small-2',
    ]),
    teacher.id,
    now,
  );
  for (let index = 1; index <= 2; index += 1) {
    const submissionId = `submission-calibration-small-${index}`;
    const runId = `run-calibration-small-${index}`;
    const scoreId = `score-calibration-small-${index}`;
    db.prepare(
      `INSERT INTO submissions
         (id, batch_id, owner_id, project_scope, source_evidence_ref,
          identity_status, status, privacy_level, created_at, updated_at)
       VALUES (?, 'batch-calibration-small', ?, 'course-calibration',
               'evidence-calibration', 'confirmed', 'review', 'private', ?, ?)`,
    ).run(submissionId, teacher.id, now, now);
    db.prepare(
      `INSERT INTO pre_correction_runs
         (id, manifest_id, batch_id, submission_id, owner_id, project_scope,
          rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
          method_version, criterion_score_refs_json, review_reasons_json,
          status, created_at, updated_at)
       VALUES (?, 'manifest-calibration-small', 'batch-calibration-small', ?, ?,
               'course-calibration', 'rubric-calibration-v1', 'grading-calibration-v1',
               'rubric_scoring', ?, 'criterion-analysis-v1', ?, '[]',
               'needs_review', ?, ?)`,
    ).run(
      runId,
      submissionId,
      teacher.id,
      `storage://private/snapshots/${runId}`,
      JSON.stringify([scoreId]),
      now,
      now,
    );
    insertScore.run(scoreId, runId, submissionId, 8 + index, 0.8, now);
  }
});

describe('PR-C4 — calibration et contrôle qualité internes', () => {
  it('refuse les rôles et owners non autorisés', () => {
    const input = {
      review_id: 'calibration-review-denied',
      batch_id: 'batch-calibration',
      max_sample_size: 8,
      created_at: now,
    };
    expect(() => createCalibrationReview(student, input)).toThrow('permission_denied');
    expect(() => createCalibrationReview(otherTeacher, input)).toThrow('scope_denied');
  });

  it('crée un diagnostic borné et signale le seuil protégé sans toucher aux scores', () => {
    const before = getDb()
      .prepare(
        `SELECT id, draft_score, status FROM criterion_score_drafts
         WHERE run_id LIKE 'run-calibration-%' ORDER BY id`,
      )
      .all();
    const bundle = createCalibrationReview(teacher, {
      review_id: 'calibration-review-valid',
      batch_id: 'batch-calibration',
      max_sample_size: 8,
      created_at: now,
    });

    expect(bundle.review.status).toBe('review_required');
    expect(bundle.review.method_version).toBe('cohort-quality-review-v1');
    expect(bundle.review.statistics.sample_count).toBe(4);
    expect(bundle.review.statistics.mean_raw_score).toBeCloseTo(9.675);
    expect(bundle.review.statistics.median_raw_score).toBeCloseTo(9.85);
    expect(bundle.review.statistics.position).toBe('below_expected_band');
    expect(bundle.review.diagnostic_delta_candidate).toBe(1);
    expect(bundle.review.protected_threshold_crossing_count).toBe(1);
    expect(bundle.review.alert_codes).toEqual([
      'cohort_below_expected_band',
      'protected_threshold_crossing',
    ]);

    const reasons = new Set(bundle.sample_items.flatMap((item) => item.selection_reasons));
    expect(reasons).toContain('strongest_draft');
    expect(reasons).toContain('weakest_draft');
    expect(reasons).toContain('protected_threshold_boundary');
    expect(reasons).toContain('low_confidence');
    expect(
      bundle.sample_items.find((item) => item.run_id === 'run-calibration-2')
        ?.selection_reasons,
    ).toContain('low_confidence');

    const after = getDb()
      .prepare(
        `SELECT id, draft_score, status FROM criterion_score_drafts
         WHERE run_id LIKE 'run-calibration-%' ORDER BY id`,
      )
      .all();
    expect(after).toEqual(before);
    expect(getCalibrationReview(admin, bundle.review.review_id)).toEqual(bundle);
    expect(() => getCalibrationReview(otherTeacher, bundle.review.review_id)).toThrow(
      'scope_denied',
    );
  });

  it('ne crée aucune colonne de note finale ou de delta appliqué', () => {
    const reviewColumns = getDb()
      .prepare("PRAGMA table_info('cohort_calibration_reviews')")
      .all() as Array<{name: string}>;
    const names = reviewColumns.map((column) => column.name);
    expect(names).not.toContain('final_score');
    expect(names).not.toContain('applied_delta');
    expect(names).not.toContain('validated_by');
  });

  it('refuse de proposer une calibration sur un échantillon insuffisant', () => {
    const bundle = createCalibrationReview(teacher, {
      review_id: 'calibration-review-small',
      batch_id: 'batch-calibration-small',
      max_sample_size: 8,
      created_at: now,
    });
    expect(bundle.review.statistics.sample_count).toBe(2);
    expect(bundle.review.statistics.position).toBe('insufficient_data');
    expect(bundle.review.diagnostic_delta_candidate).toBeNull();
    expect(bundle.review.alert_codes).toEqual(['insufficient_sample']);
  });

  it('audite le diagnostic sans exposer les scores individuels', () => {
    const row = getDb()
      .prepare(
        `SELECT detail_json FROM audit_logs
         WHERE event_type = 'calibration.review_created'
           AND detail_json LIKE '%calibration-review-valid%'
         LIMIT 1`,
      )
      .get() as {detail_json: string};
    expect(row.detail_json).toContain('calibration-review-valid');
    expect(row.detail_json).not.toContain('submission-calibration');
    expect(row.detail_json).not.toContain('9.5');
  });
});
