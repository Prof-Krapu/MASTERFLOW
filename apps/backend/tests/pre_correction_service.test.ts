import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  getPreCorrectionDraft,
  recordPreCorrectionDraft,
  type PreCorrectionDraftBundle,
} from '../src/services/pre_correction.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';
import {createCohort, createRosterVersion} from '../src/services/cohorts.ts';
import {createCorrectionContextSnapshot} from '../src/services/correction_context.ts';

const teacher: AuthUser = {
  id: 'teacher-pre-correction',
  username: 'teacher_pre_correction',
  role: 'teacher',
};
const otherTeacher: AuthUser = {
  id: 'teacher-pre-correction-other',
  username: 'teacher_pre_correction_other',
  role: 'teacher',
};
const student: AuthUser = {
  id: 'student-pre-correction',
  username: 'student_pre_correction',
  role: 'student',
};
const admin: AuthUser = {
  id: 'admin-pre-correction',
  username: 'admin_pre_correction',
  role: 'admin',
};

const now = Date.now();
let correctionProjectId = '';
let ownerContextSnapshotId = '';
let projectContextSnapshotId = '';
const baseBundle: PreCorrectionDraftBundle = {
  run: {
    run_id: 'pre-correction-run-valid',
    manifest_id: 'manifest-pre-correction-valid',
    batch_id: 'batch-pre-correction',
    submission_id: 'submission-pre-correction',
    owner_id: teacher.id,
    project_scope: 'course-pre-correction',
    rubric_version_id: 'rubric-pre-correction-v1',
    grading_profile_id: 'grading-pre-correction-v1',
    context_snapshot_id: 'pending-owner-context-snapshot',
    analysis_type: 'rubric_scoring',
    evidence_snapshot_ref: 'storage://private/evidence-snapshots/pre-correction-valid',
    method_version: 'criterion-analysis-v1',
    model_profile_ref: null,
    criterion_score_refs: ['score-pre-correction-clarity', 'score-pre-correction-quality'],
    review_reasons: ['teacher_validation_required'],
    status: 'needs_review',
    created_at: now,
    updated_at: now,
  },
  criterion_scores: [
    {
      draft_id: 'score-pre-correction-clarity',
      run_id: 'pre-correction-run-valid',
      submission_id: 'submission-pre-correction',
      rubric_version_id: 'rubric-pre-correction-v1',
      criterion_id: 'clarity',
      draft_score: 6,
      max_points: 8,
      evidence_refs: ['evidence-pre-correction'],
      confidence: 0.82,
      comment_ref: 'storage://private/comments/pre-correction-clarity',
      status: 'candidate',
      created_at: now,
    },
    {
      draft_id: 'score-pre-correction-quality',
      run_id: 'pre-correction-run-valid',
      submission_id: 'submission-pre-correction',
      rubric_version_id: 'rubric-pre-correction-v1',
      criterion_id: 'quality',
      draft_score: 9,
      max_points: 12,
      evidence_refs: ['evidence-pre-correction'],
      confidence: 0.74,
      comment_ref: null,
      status: 'candidate',
      created_at: now,
    },
  ],
};

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
  const project = createProject(teacher, {name: 'Projet correction bridge'});
  correctionProjectId = project.project_id;
  addProjectMember(teacher, correctionProjectId, {
    user_id: otherTeacher.id,
    role: 'editor',
  });

  db.prepare(
    `INSERT INTO evidence_events
       (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
        payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
     VALUES ('evidence-pre-correction', 'submission', 'ocr-submission-v1', ?,
             'course-pre-correction', '["submission-pre-correction"]',
             'storage://private/submissions/pre-correction', 0.9, 'private', ?,
             'candidate', ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_templates
       (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES ('template-pre-correction', ?, 'course-pre-correction',
             'Projet final', 'active', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES ('rubric-pre-correction-v1', 'template-pre-correction', 1,
             'course-pre-correction', ?, 20, 'validated', ?, ?)`,
  ).run(
    JSON.stringify([
      {
        criterion_id: 'clarity',
        label: 'Clarté',
        description: 'Proposition compréhensible.',
        weight: 0.4,
        max_points: 8,
        evidence_requirements: ['passage_source'],
        required: true,
      },
      {
        criterion_id: 'quality',
        label: 'Qualité',
        description: 'Niveau attendu.',
        weight: 0.6,
        max_points: 12,
        evidence_requirements: ['passage_source'],
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
     VALUES ('grading-pre-correction-v1', ?, 'course-pre-correction', 1,
             '[0,20]', '[13,14]', '{}', 'diagnostic_then_teacher_validation',
             1, '[10]', 1, 'validated', ?)`,
  ).run(teacher.id, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-pre-correction', ?, 'course-pre-correction',
             'rubric-pre-correction-v1', 'grading-pre-correction-v1',
             'draft', 1, ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO submissions
       (id, batch_id, owner_id, project_scope, source_evidence_ref,
        identity_status, status, privacy_level, created_at, updated_at)
     VALUES ('submission-pre-correction', 'batch-pre-correction', ?,
             'course-pre-correction', 'evidence-pre-correction',
             'confirmed', 'review', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  const ownerCohort = createCohort(teacher, {title: 'Pré-correction owner'});
  const ownerRoster = createRosterVersion(teacher, ownerCohort.cohort_id, {
    source_ref: 'manual://pre-correction/owner-roster',
    members: [{display_name: 'Élève owner', aliases: []}],
  });
  ownerContextSnapshotId = createCorrectionContextSnapshot(teacher, 'batch-pre-correction', {
    cohort_id: ownerCohort.cohort_id,
    roster_version_id: ownerRoster.roster_version_id,
    subject_version_ref: 'subject://pre-correction/v1',
    source_refs: ['evidence://pre-correction/v1'],
    process_context_profile_ref: 'process://pre-correction/v1',
  }).snapshot_id;
  baseBundle.run.context_snapshot_id = ownerContextSnapshotId;
  db.prepare("UPDATE correction_batches SET status = 'review' WHERE id = 'batch-pre-correction'").run();
  const insertManifest = db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_scope, rubric_version_id, grading_profile_id, context_snapshot_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES (?, 'batch-pre-correction', 'course-pre-correction',
             'rubric-pre-correction-v1', 'grading-pre-correction-v1',
             ?, '["submission-pre-correction"]', 'workflow-v1', ?, ?, ?, ?)`,
  );
  insertManifest.run(
    'manifest-pre-correction-valid',
    ownerContextSnapshotId,
    'validated',
    teacher.id,
    'teacher-validation-pre-correction',
    now,
  );
  insertManifest.run(
    'manifest-pre-correction-draft',
    ownerContextSnapshotId,
    'draft',
    teacher.id,
    null,
    now,
  );

  const insertProjectEvidence = db.prepare(
    `INSERT INTO evidence_events
       (id, source_type, adapter_id, owner_id, project_id, project_scope, target_refs_json,
        payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
     VALUES (?, 'submission', 'ocr-submission-v1', ?, ?, ?, '["submission-project-bridge"]',
             ?, 0.9, 'private', ?, 'candidate', ?)`,
  );
  insertProjectEvidence.run(
    'evidence-project-correction-owner',
    teacher.id,
    correctionProjectId,
    correctionProjectId,
    'storage://private/submissions/project-owner',
    now,
    now,
  );
  insertProjectEvidence.run(
    'evidence-project-correction-editor',
    otherTeacher.id,
    correctionProjectId,
    correctionProjectId,
    'storage://private/submissions/project-editor',
    now,
    now,
  );
  db.prepare(
    `INSERT INTO rubric_templates
       (id, owner_id, project_id, project_scope, title, status, created_at, updated_at)
     VALUES ('template-project-correction', ?, ?, ?, 'Projet bridge',
             'active', ?, ?)`,
  ).run(teacher.id, correctionProjectId, correctionProjectId, now, now);
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_id, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES ('rubric-project-correction-v1', 'template-project-correction', 1, ?, ?, ?,
             20, 'validated', ?, ?)`,
  ).run(
    correctionProjectId,
    correctionProjectId,
    JSON.stringify([
      {
        criterion_id: 'clarity',
        label: 'Clarté',
        description: 'Proposition compréhensible.',
        weight: 0.4,
        max_points: 8,
        evidence_requirements: ['passage_source'],
        required: true,
      },
      {
        criterion_id: 'quality',
        label: 'Qualité',
        description: 'Niveau attendu.',
        weight: 0.6,
        max_points: 12,
        evidence_requirements: ['passage_source'],
        required: true,
      },
    ]),
    teacher.id,
    now,
  );
  db.prepare(
    `INSERT INTO institutional_grading_profiles
       (id, owner_id, project_id, project_scope, version, scale_json, expected_band_json,
        anchors_json, calibration_mode, max_global_delta,
        protected_thresholds_json, threshold_crossing_requires_validation,
        status, created_at)
     VALUES ('grading-project-correction-v1', ?, ?, ?, 1, '[0,20]', '[13,14]', '{}',
             'diagnostic_then_teacher_validation', 1, '[10]', 1, 'validated', ?)`,
  ).run(teacher.id, correctionProjectId, correctionProjectId, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES ('batch-project-correction', ?, ?, ?, 'rubric-project-correction-v1',
             'grading-project-correction-v1', 'draft', 1, ?, ?)`,
  ).run(teacher.id, correctionProjectId, correctionProjectId, now, now);
  db.prepare(
    `INSERT INTO submissions
       (id, batch_id, owner_id, project_id, project_scope, source_evidence_ref,
        identity_status, status, privacy_level, created_at, updated_at)
     VALUES ('submission-project-bridge', 'batch-project-correction', ?, ?, ?,
             'evidence-project-correction-owner', 'confirmed', 'review', 'private', ?, ?)`,
  ).run(teacher.id, correctionProjectId, correctionProjectId, now, now);
  const projectCohort = createCohort(teacher, {
    title: 'Pré-correction projet',
    project_id: correctionProjectId,
  });
  const projectRoster = createRosterVersion(teacher, projectCohort.cohort_id, {
    source_ref: 'manual://pre-correction/project-roster',
    members: [{display_name: 'Élève projet', aliases: []}],
  });
  projectContextSnapshotId = createCorrectionContextSnapshot(teacher, 'batch-project-correction', {
    cohort_id: projectCohort.cohort_id,
    roster_version_id: projectRoster.roster_version_id,
    subject_version_ref: 'subject://project-correction/v1',
    source_refs: ['evidence://project-correction/v1'],
    process_context_profile_ref: 'process://pre-correction/v1',
  }).snapshot_id;
  db.prepare("UPDATE correction_batches SET status = 'review' WHERE id = 'batch-project-correction'").run();
  db.prepare(
    `INSERT INTO pre_correction_manifests
       (id, batch_id, project_id, project_scope, rubric_version_id, grading_profile_id,
        context_snapshot_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES ('manifest-project-correction', 'batch-project-correction', ?, ?,
             'rubric-project-correction-v1', 'grading-project-correction-v1',
             ?, '["submission-project-bridge"]', 'workflow-project-v1', 'validated', ?,
             'validation-project-correction', ?)`,
  ).run(correctionProjectId, correctionProjectId, projectContextSnapshotId, teacher.id, now);
});

describe('PR-C3 — dépôt interne de pré-correction', () => {
  it('refuse student, teacher hors owner et manifest non validé', () => {
    expect(() => recordPreCorrectionDraft(student, baseBundle)).toThrow('permission_denied');
    expect(() => recordPreCorrectionDraft(otherTeacher, baseBundle)).toThrow('scope_denied');
    expect(() =>
      recordPreCorrectionDraft(admin, {
        ...baseBundle,
        run: {
          ...baseBundle.run,
          run_id: 'pre-correction-run-unvalidated',
          manifest_id: 'manifest-pre-correction-draft',
          criterion_score_refs: baseBundle.run.criterion_score_refs.map(
            (ref) => `${ref}-unvalidated`,
          ),
        },
        criterion_scores: baseBundle.criterion_scores.map((score) => ({
          ...score,
          draft_id: `${score.draft_id}-unvalidated`,
          run_id: 'pre-correction-run-unvalidated',
        })),
      }),
    ).toThrow('pre_correction_manifest_not_validated');
  });

  it('refuse un nouveau run sans snapshot de contexte', () => {
    getDb()
      .prepare(
        "UPDATE pre_correction_manifests SET context_snapshot_id = NULL WHERE id = 'manifest-pre-correction-valid'",
      )
      .run();
    try {
      expect(() =>
        recordPreCorrectionDraft(teacher, {
          ...baseBundle,
          run: {
            ...baseBundle.run,
            run_id: 'pre-correction-run-without-context',
            criterion_score_refs: baseBundle.run.criterion_score_refs.map(
              (ref) => `${ref}-without-context`,
            ),
          },
          criterion_scores: baseBundle.criterion_scores.map((score) => ({
            ...score,
            draft_id: `${score.draft_id}-without-context`,
            run_id: 'pre-correction-run-without-context',
          })),
        }),
      ).toThrow('correction_context_snapshot_required');
    } finally {
      getDb()
        .prepare(
          "UPDATE pre_correction_manifests SET context_snapshot_id = ? WHERE id = 'manifest-pre-correction-valid'",
        )
        .run(ownerContextSnapshotId);
    }
  });

  it('refuse un scoring partiel ou un critère étranger à la rubrique', () => {
    expect(() =>
      recordPreCorrectionDraft(teacher, {
        ...baseBundle,
        run: {
          ...baseBundle.run,
          run_id: 'pre-correction-run-partial',
          criterion_score_refs: ['score-pre-correction-partial'],
        },
        criterion_scores: [
          {
            ...baseBundle.criterion_scores[0]!,
            draft_id: 'score-pre-correction-partial',
            run_id: 'pre-correction-run-partial',
          },
        ],
      }),
    ).toThrow('criterion_coverage_mismatch');
  });

  it('persiste uniquement des candidats explicables en review professeur', () => {
    const saved = recordPreCorrectionDraft(teacher, baseBundle);

    expect(saved.run.status).toBe('needs_review');
    expect(saved.criterion_scores).toHaveLength(2);
    expect(saved.criterion_scores.every((score) => score.status === 'candidate')).toBe(true);
    expect(saved.criterion_scores.every((score) => score.evidence_refs.length > 0)).toBe(true);
    expect(getPreCorrectionDraft(admin, saved.run.run_id)).toEqual(saved);
    expect(() => getPreCorrectionDraft(otherTeacher, saved.run.run_id)).toThrow('scope_denied');

    const runColumns = getDb()
      .prepare("PRAGMA table_info('pre_correction_runs')")
      .all() as Array<{name: string}>;
    const scoreColumns = getDb()
      .prepare("PRAGMA table_info('criterion_score_drafts')")
      .all() as Array<{name: string}>;
    expect(runColumns.map((column) => column.name)).not.toContain('final_score');
    expect(scoreColumns.map((column) => column.name)).not.toContain('final_score');
  });

  it('relie toute la pré-correction à un projet réel et accepte ses preuves multi-auteurs', () => {
    const projectBundle: PreCorrectionDraftBundle = {
      run: {
        ...baseBundle.run,
        run_id: 'pre-correction-run-project',
        manifest_id: 'manifest-project-correction',
        batch_id: 'batch-project-correction',
        submission_id: 'submission-project-bridge',
        project_id: correctionProjectId,
        project_scope: correctionProjectId,
        rubric_version_id: 'rubric-project-correction-v1',
        grading_profile_id: 'grading-project-correction-v1',
        context_snapshot_id: projectContextSnapshotId,
        evidence_snapshot_ref: 'storage://private/evidence-snapshots/project-correction',
        criterion_score_refs: [
          'score-project-correction-clarity',
          'score-project-correction-quality',
        ],
      },
      criterion_scores: [
        {
          ...baseBundle.criterion_scores[0]!,
          draft_id: 'score-project-correction-clarity',
          run_id: 'pre-correction-run-project',
          submission_id: 'submission-project-bridge',
          rubric_version_id: 'rubric-project-correction-v1',
          evidence_refs: ['evidence-project-correction-owner'],
        },
        {
          ...baseBundle.criterion_scores[1]!,
          draft_id: 'score-project-correction-quality',
          run_id: 'pre-correction-run-project',
          submission_id: 'submission-project-bridge',
          rubric_version_id: 'rubric-project-correction-v1',
          evidence_refs: ['evidence-project-correction-editor'],
        },
      ],
    };

    const saved = recordPreCorrectionDraft(otherTeacher, projectBundle);
    expect(saved.run).toMatchObject({
      project_id: correctionProjectId,
      project_scope: correctionProjectId,
      status: 'needs_review',
    });
    expect(getPreCorrectionDraft(otherTeacher, saved.run.run_id)).toEqual(saved);

    expect(() =>
      recordPreCorrectionDraft(otherTeacher, {
        ...projectBundle,
        run: {
          ...projectBundle.run,
          run_id: 'pre-correction-run-project-mismatch',
          project_scope: 'legacy-free-text',
          criterion_score_refs: [
            'score-project-mismatch-clarity',
            'score-project-mismatch-quality',
          ],
        },
        criterion_scores: projectBundle.criterion_scores.map((score) => ({
          ...score,
          draft_id: score.draft_id.replace('correction', 'mismatch'),
          run_id: 'pre-correction-run-project-mismatch',
        })),
      }),
    ).toThrow('project_scope_mismatch');
  });

  it('trace le run sans copier les preuves ou commentaires dans l audit', () => {
    const row = getDb()
      .prepare(
        `SELECT detail_json FROM audit_logs
         WHERE event_type = 'pre_correction.draft_recorded'
           AND detail_json LIKE '%pre-correction-run-valid%'
         LIMIT 1`,
      )
      .get() as {detail_json: string};
    expect(row.detail_json).toContain('pre-correction-run-valid');
    expect(row.detail_json).not.toContain('storage://private');
    expect(row.detail_json).not.toContain('evidence-pre-correction');
  });
});
