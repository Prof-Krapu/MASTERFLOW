import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createCohort, createRosterVersion, getRosterVersion} from '../src/services/cohorts.ts';
import {
  compileCorrectionContextPayload,
  createCorrectionContextSnapshot,
  createIdentityMatchCandidate,
  decideIdentityMatchCandidate,
  getCorrectionContextSnapshot,
  linkSubmissionIdentity,
} from '../src/services/correction_context.ts';

const teacher: AuthUser = {id: 'context-teacher', username: 'context_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'context-outsider', username: 'context_outsider', role: 'godmode'};

function insertCorrectionFoundation(batchId: string): void {
  const db = getDb();
  const now = Date.now();
  const templateId = `${batchId}-template`;
  const rubricId = `${batchId}-rubric`;
  const profileId = `${batchId}-profile`;
  db.prepare(
    `INSERT INTO rubric_templates
       (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES (?, ?, ?, 'Barème contexte', 'active', ?, ?)`,
  ).run(templateId, teacher.id, batchId, now, now);
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES (?, ?, 1, ?, ?, 20, 'validated', ?, ?)`,
  ).run(
    rubricId,
    templateId,
    batchId,
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
    teacher.id,
    now,
  );
  db.prepare(
    `INSERT INTO institutional_grading_profiles
       (id, owner_id, project_scope, version, scale_json, expected_band_json,
        anchors_json, calibration_mode, max_global_delta,
        protected_thresholds_json, threshold_crossing_requires_validation,
        status, created_at)
     VALUES (?, ?, ?, 1, '[0,20]', '[10,15]', '{}',
             'diagnostic_then_teacher_validation', 1, '[]', 1, 'validated', ?)`,
  ).run(profileId, teacher.id, batchId, now);
  db.prepare(
    `INSERT INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'draft', 0, ?, ?)`,
  ).run(batchId, teacher.id, batchId, rubricId, profileId, now, now);
}

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insert.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
});

describe('snapshot de contexte correction V1', () => {
  it('fige roster, sujet, barème et sources une seule fois', () => {
    const batchId = 'context-batch-once';
    insertCorrectionFoundation(batchId);
    const cohort = createCohort(teacher, {title: '4CREA A'});
    const roster = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://4crea-a/v1',
      members: [
        {display_name: 'Alice Martin', aliases: ['Alice']},
        {display_name: 'Bob Durand', aliases: ['Bob', 'Alice']},
      ],
    });
    const snapshot = createCorrectionContextSnapshot(teacher, batchId, {
      cohort_id: cohort.cohort_id,
      roster_version_id: roster.roster_version_id,
      subject_version_ref: 'subject://campagne/v3',
      source_refs: ['transcript://debrief/2026-06-20'],
      process_context_profile_ref: 'process://correction-oral/v1',
    });
    expect(snapshot).toMatchObject({
      batch_id: batchId,
      cohort_id: cohort.cohort_id,
      roster_version_id: roster.roster_version_id,
      subject_version_ref: 'subject://campagne/v3',
      source_refs: ['transcript://debrief/2026-06-20'],
    });
    expect(() =>
      createCorrectionContextSnapshot(teacher, batchId, {
        cohort_id: cohort.cohort_id,
        roster_version_id: roster.roster_version_id,
        subject_version_ref: 'subject://other',
        source_refs: ['transcript://other'],
        process_context_profile_ref: 'process://correction-oral/v1',
      }),
    ).toThrow('correction_context_snapshot_exists');

    const alice = roster.members.find((member) => member.display_name === 'Alice Martin');
    const bob = roster.members.find((member) => member.display_name === 'Bob Durand');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO evidence_events
           (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
            payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
         VALUES ('context-evidence-link', 'transcript', 'manual-v1', ?, ?, '[]',
                 'storage://private/transcripts/link', 1, 'private', ?, 'candidate', ?)`,
      )
      .run(teacher.id, batchId, now, now);
    getDb()
      .prepare(
        `INSERT INTO submissions
           (id, batch_id, owner_id, project_scope, source_evidence_ref,
            identity_status, status, privacy_level, created_at, updated_at)
         VALUES ('context-submission-link', ?, ?, ?, 'context-evidence-link',
                 'unknown', 'review', 'private', ?, ?)`,
      )
      .run(batchId, teacher.id, batchId, now, now);

    const linked = linkSubmissionIdentity(teacher, 'context-submission-link', {
      context_snapshot_id: snapshot.snapshot_id,
      student_identity_id: alice!.student_identity_id,
    });
    expect(linked).toMatchObject({
      submission_id: 'context-submission-link',
      student_identity_id: alice!.student_identity_id,
      identity_status: 'confirmed',
    });
    expect(
      linkSubmissionIdentity(teacher, 'context-submission-link', {
        context_snapshot_id: snapshot.snapshot_id,
        student_identity_id: alice!.student_identity_id,
      }),
    ).toEqual(linked);
    expect(() =>
      linkSubmissionIdentity(teacher, 'context-submission-link', {
        context_snapshot_id: snapshot.snapshot_id,
        student_identity_id: bob!.student_identity_id,
      }),
    ).toThrow('submission_identity_locked');
    expect(() =>
      linkSubmissionIdentity(outsider, 'context-submission-link', {
        context_snapshot_id: snapshot.snapshot_id,
        student_identity_id: alice!.student_identity_id,
      }),
    ).toThrow('correction_batch_not_found');

    getDb()
      .prepare(
        `INSERT INTO submissions
           (id, batch_id, owner_id, project_scope, source_evidence_ref,
            identity_status, status, privacy_level, created_at, updated_at)
         VALUES ('context-submission-candidate', ?, ?, ?, 'context-evidence-link',
                 'unknown', 'review', 'private', ?, ?)`,
      )
      .run(batchId, teacher.id, batchId, now, now);
    const candidate = createIdentityMatchCandidate(teacher, 'context-submission-candidate', {
      context_snapshot_id: snapshot.snapshot_id,
      observed_label: 'Alice',
    });
    expect(candidate).toMatchObject({
      status: 'pending',
      observed_label: 'Alice',
    });
    expect(candidate.candidate_identity_ids).toHaveLength(2);
    expect(
      getDb()
        .prepare('SELECT student_identity_id, identity_status FROM submissions WHERE id = ?')
        .get('context-submission-candidate'),
    ).toEqual({student_identity_id: null, identity_status: 'candidate'});
    expect(() =>
      decideIdentityMatchCandidate(outsider, candidate.candidate_id, {
        decision: 'confirm',
        selected_identity_id: alice!.student_identity_id,
      }),
    ).toThrow('correction_batch_not_found');
    const confirmed = decideIdentityMatchCandidate(teacher, candidate.candidate_id, {
      decision: 'confirm',
      selected_identity_id: alice!.student_identity_id,
    });
    expect(confirmed).toMatchObject({
      status: 'confirmed',
      selected_identity_id: alice!.student_identity_id,
      decided_by: teacher.id,
    });
    expect(() =>
      decideIdentityMatchCandidate(teacher, candidate.candidate_id, {
        decision: 'confirm',
        selected_identity_id: alice!.student_identity_id,
      }),
    ).toThrow('identity_match_candidate_decided');

    getDb()
      .prepare(
        `INSERT INTO submissions
           (id, batch_id, owner_id, project_scope, source_evidence_ref,
            identity_status, status, privacy_level, created_at, updated_at)
         VALUES ('context-submission-reject', ?, ?, ?, 'context-evidence-link',
                 'unknown', 'review', 'private', ?, ?)`,
      )
      .run(batchId, teacher.id, batchId, now, now);
    const rejectedCandidate = createIdentityMatchCandidate(teacher, 'context-submission-reject', {
      context_snapshot_id: snapshot.snapshot_id,
      observed_label: 'Bob',
    });
    expect(
      decideIdentityMatchCandidate(teacher, rejectedCandidate.candidate_id, {
        decision: 'reject',
      }),
    ).toMatchObject({status: 'rejected', selected_identity_id: null});
  });

  it('conserve la version historique après activation d’un nouveau roster', () => {
    const batchId = 'context-batch-history';
    insertCorrectionFoundation(batchId);
    const cohort = createCohort(teacher, {title: 'Historique'});
    const v1 = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://history/v1',
      members: [{display_name: 'Élève V1', aliases: []}],
    });
    createCorrectionContextSnapshot(teacher, batchId, {
      cohort_id: cohort.cohort_id,
      roster_version_id: v1.roster_version_id,
      subject_version_ref: 'subject://history/v1',
      source_refs: ['evidence://history/v1'],
      process_context_profile_ref: 'process://correction/v1',
    });
    const v2 = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://history/v2',
      members: [{display_name: 'Élève V2', aliases: []}],
    });

    const snapshot = getCorrectionContextSnapshot(teacher, batchId);
    expect(snapshot.roster_version_id).toBe(v1.roster_version_id);
    expect(getRosterVersion(teacher, cohort.cohort_id, v1.roster_version_id)).toMatchObject({
      status: 'archived',
      members: v1.members,
    });
    const payload = compileCorrectionContextPayload(teacher, batchId);
    expect(payload).toMatchObject({
      snapshot_id: snapshot.snapshot_id,
      privacy: 'private',
      roster: {
        roster_version_id: v1.roster_version_id,
        version: 1,
        members: v1.members,
      },
      subject_version_ref: 'subject://history/v1',
      source_refs: ['evidence://history/v1'],
    });
    expect(JSON.stringify(payload)).not.toContain('payload_ref');

    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO evidence_events
           (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
            payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
         VALUES ('context-evidence-outside-roster', 'submission', 'manual-v1', ?, ?, '[]',
                 'storage://private/submissions/outside-roster', 1, 'private', ?, 'candidate', ?)`,
      )
      .run(teacher.id, batchId, now, now);
    getDb()
      .prepare(
        `INSERT INTO submissions
           (id, batch_id, owner_id, project_scope, source_evidence_ref,
            identity_status, status, privacy_level, created_at, updated_at)
         VALUES ('context-submission-outside-roster', ?, ?, ?,
                 'context-evidence-outside-roster', 'unknown', 'review', 'private', ?, ?)`,
      )
      .run(batchId, teacher.id, batchId, now, now);
    expect(() =>
      linkSubmissionIdentity(teacher, 'context-submission-outside-roster', {
        context_snapshot_id: snapshot.snapshot_id,
        student_identity_id: v2.members[0]!.student_identity_id,
      }),
    ).toThrow('student_identity_not_in_snapshot_roster');
  });

  it('ne révèle pas le snapshot owner-private à un godmode extérieur', () => {
    const batchId = 'context-batch-private';
    insertCorrectionFoundation(batchId);
    const cohort = createCohort(teacher, {title: 'Privé'});
    const roster = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://private/v1',
      members: [{display_name: 'Élève privé', aliases: []}],
    });
    createCorrectionContextSnapshot(teacher, batchId, {
      cohort_id: cohort.cohort_id,
      roster_version_id: roster.roster_version_id,
      subject_version_ref: 'subject://private/v1',
      source_refs: ['evidence://private/v1'],
      process_context_profile_ref: 'process://correction/v1',
    });
    expect(() => getCorrectionContextSnapshot(outsider, batchId)).toThrow(
      'correction_batch_not_found',
    );
    expect(() => compileCorrectionContextPayload(outsider, batchId)).toThrow(
      'correction_batch_not_found',
    );
  });
});
