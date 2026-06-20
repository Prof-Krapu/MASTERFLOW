import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createCorrectionBatch, listCorrectionBatches} from '../src/services/correction_batches.ts';
import {createCohort, createRosterVersion} from '../src/services/cohorts.ts';
import {intakeSubmission} from '../src/services/submission_intake.ts';
import {createPreCorrectionManifest, validatePreCorrectionManifest} from '../src/services/pre_correction_manifests.ts';
import {
  createInstitutionalGradingProfile,
  createRubricTemplate,
  validateInstitutionalGradingProfile,
  validateRubricVersion,
} from '../src/services/correction_setup.ts';

const teacher: AuthUser = {id: 'batch-teacher', username: 'batch_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'batch-outsider', username: 'batch_outsider', role: 'godmode'};
const criteria = [{
  criterion_id: 'quality', label: 'Qualité', description: 'Niveau du rendu', weight: 1,
  max_points: 20, evidence_requirements: [], required: true,
}];

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insert.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
});

describe('lot de correction contextualisé R1.2', () => {
  it('fige atomiquement un barème/profil validés, roster actif et sujet avant toute intake', () => {
    const rubric = createRubricTemplate(teacher, {title: 'Oral', criteria, total_points: 20});
    validateRubricVersion(teacher, rubric.version.version_id);
    const profile = createInstitutionalGradingProfile(teacher, {
      scale: [0, 20], expected_cohort_band: [10, 15],
      anchors: {insufficient: [0, 9], minimum_met: [10, 11], expected: [12, 15], strong: [16, 17], exceptional: [18, 20]},
      max_global_delta: 1,
    });
    validateInstitutionalGradingProfile(teacher, profile.profile_id);
    const cohort = createCohort(teacher, {title: '4CREA A'});
    const roster = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://4crea-a/v1', members: [{display_name: 'Alice Martin', aliases: []}],
    });
    const created = createCorrectionBatch(teacher, {
      rubric_version_id: rubric.version.version_id,
      grading_profile_id: profile.profile_id,
      cohort_id: cohort.cohort_id,
      roster_version_id: roster.roster_version_id,
      subject_version_ref: 'subject://oral/v1',
      source_refs: ['transcript://oral/2026-06-20'],
      process_context_profile_ref: 'process://correction/oral-v1',
    });
    expect(created.batch).toMatchObject({status: 'draft', submission_count: 0, rubric_version_id: rubric.version.version_id});
    expect(created.context_snapshot).toMatchObject({batch_id: created.batch.batch_id, roster_version_id: roster.roster_version_id, subject_version_ref: 'subject://oral/v1'});
    expect(listCorrectionBatches(teacher)).toContainEqual(expect.objectContaining({batch_id: created.batch.batch_id}));
    expect(listCorrectionBatches(outsider)).not.toContainEqual(expect.objectContaining({batch_id: created.batch.batch_id}));
    const submission = intakeSubmission(teacher, created.batch.batch_id, {
      source_ref: 'storage://private/submissions/alice-oral.pdf', observed_label: 'Alice',
    });
    expect(submission).toMatchObject({batch_id: created.batch.batch_id, identity_status: 'unknown', status: 'candidate', privacy_level: 'private'});
    expect(() => createPreCorrectionManifest(teacher, created.batch.batch_id, {submission_refs: [submission.submission_id], workflow_version: 'manual-review-v1'})).toThrow('submission_identity_not_confirmed');
    getDb().prepare("UPDATE submissions SET identity_status = 'confirmed' WHERE id = ?").run(submission.submission_id);
    const manifest = createPreCorrectionManifest(teacher, created.batch.batch_id, {submission_refs: [submission.submission_id], workflow_version: 'manual-review-v1'});
    expect(manifest).toMatchObject({status: 'draft', validation_ref: null, submission_refs: [submission.submission_id]});
    expect(validatePreCorrectionManifest(teacher, manifest.manifest_id, {validation_ref: 'teacher://review/1'})).toMatchObject({status: 'validated', validation_ref: 'teacher://review/1'});
    expect(() => intakeSubmission(outsider, created.batch.batch_id, {source_ref: 'storage://private/other'})).toThrow('correction_batch_not_found');
  });
});
