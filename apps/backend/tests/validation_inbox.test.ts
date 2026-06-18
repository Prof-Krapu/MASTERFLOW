import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {createAction, getAction, preflightAction} from '../src/engines/action_engine.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createProjectsRouter} from '../src/routers/projects.ts';
import {createValidationInboxRouter} from '../src/routers/validation_inbox.ts';
import {
  getFeedbackDraft,
  recordFeedbackDraft,
} from '../src/services/feedback_exports.ts';
import {
  decideValidationInboxItem,
  listValidationInboxItems,
} from '../src/services/validation_inbox.ts';

const teacher: AuthUser = {id: 'validation-inbox-teacher', username: 'validation_inbox_teacher', role: 'teacher'};
const otherTeacher: AuthUser = {
  id: 'validation-inbox-other-teacher',
  username: 'validation_inbox_other_teacher',
  role: 'teacher',
};
const student: AuthUser = {id: 'validation-inbox-student', username: 'validation_inbox_student', role: 'student'};
const now = Date.now();

let server: Server;
let base = '';
let teacherToken = '';
let studentToken = '';

function insertUser(user: AuthUser): void {
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(user.id, user.username, user.username, user.role, now, now);
}

function createPendingAction(): string {
  const created = createAction(teacher, {
    registry_id: 'approve_validation_item',
    intent: 'approve',
    object_type: 'validation_item',
    payload: {source: 'validation_inbox_test'},
  });
  const flighted = preflightAction(teacher, created.id);
  expect(flighted.status).toBe('pending_validation');
  return flighted.id;
}

function createPendingFeedbackDraft(feedbackId: string, owner: AuthUser = teacher): string {
  const draft = recordFeedbackDraft(owner, {
    feedback_id: feedbackId,
    run_id: `run-validation-inbox-${owner.id}`,
    submission_id: `submission-validation-inbox-${owner.id}`,
    owner_id: owner.id,
    project_scope: `course-validation-inbox-${owner.id}`,
    method_version: 'student-safe-feedback-v1',
    model_profile_ref: null,
    observed_strength_ref: `storage://private/validation-inbox/${feedbackId}/strength`,
    observed_issue_ref: `storage://private/validation-inbox/${feedbackId}/issue`,
    evidence_refs: [`evidence-validation-inbox-${owner.id}`],
    impact_on_work_ref: `storage://private/validation-inbox/${feedbackId}/impact`,
    pedagogical_axis_ref: `storage://private/validation-inbox/${feedbackId}/axis`,
    next_action_ref: `storage://private/validation-inbox/${feedbackId}/action`,
    validation_criterion_ref: `storage://private/validation-inbox/${feedbackId}/criterion`,
    tone_level: 'clear',
    evaluation_alignment: 'aligned',
    teacher_validation_required: true,
    status: 'needs_teacher_validation',
    validator_id: null,
    validation_ref: null,
    created_at: now,
    updated_at: now,
  });
  return draft.feedback_id;
}

function insertFeedbackFixture(owner: AuthUser): void {
  const db = getDb();
  const suffix = owner.id;
  db.prepare(
    `INSERT OR IGNORE INTO evidence_events
       (id, source_type, adapter_id, owner_id, project_scope, target_refs_json,
        payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
     VALUES (?, 'submission', 'validation-inbox-test', ?, ?, ?,
             ?, 0.9, 'private', ?, 'candidate', ?)`,
  ).run(
    `evidence-validation-inbox-${suffix}`,
    owner.id,
    `course-validation-inbox-${suffix}`,
    JSON.stringify([`submission-validation-inbox-${suffix}`]),
    `storage://private/validation-inbox/${suffix}/submission`,
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO rubric_templates
       (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES (?, ?, ?, 'Validation Inbox feedback', 'active', ?, ?)`,
  ).run(
    `template-validation-inbox-${suffix}`,
    owner.id,
    `course-validation-inbox-${suffix}`,
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO rubric_versions
       (id, template_id, version, project_scope, criteria_json, total_points,
        status, created_by, created_at)
     VALUES (?, ?, 1, ?, ?, 20, 'validated', ?, ?)`,
  ).run(
    `rubric-validation-inbox-${suffix}-v1`,
    `template-validation-inbox-${suffix}`,
    `course-validation-inbox-${suffix}`,
    JSON.stringify([
      {
        criterion_id: 'global',
        label: 'Global',
        description: 'Critère global.',
        weight: 1,
        max_points: 20,
        evidence_requirements: [],
        required: true,
      },
    ]),
    owner.id,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO institutional_grading_profiles
       (id, owner_id, project_scope, version, scale_json, expected_band_json,
        anchors_json, calibration_mode, max_global_delta,
        protected_thresholds_json, threshold_crossing_requires_validation,
        status, created_at)
     VALUES (?, ?, ?, 1, '[0,20]', '[13,14]', '{}',
             'diagnostic_then_teacher_validation', 1, '[10]', 1, 'validated', ?)`,
  ).run(
    `grading-validation-inbox-${suffix}-v1`,
    owner.id,
    `course-validation-inbox-${suffix}`,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO correction_batches
       (id, owner_id, project_scope, rubric_version_id, grading_profile_id,
        status, submission_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'review', 1, ?, ?)`,
  ).run(
    `batch-validation-inbox-${suffix}`,
    owner.id,
    `course-validation-inbox-${suffix}`,
    `rubric-validation-inbox-${suffix}-v1`,
    `grading-validation-inbox-${suffix}-v1`,
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO submissions
       (id, batch_id, owner_id, project_scope, source_evidence_ref,
        identity_status, status, privacy_level, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'confirmed', 'review', 'private', ?, ?)`,
  ).run(
    `submission-validation-inbox-${suffix}`,
    `batch-validation-inbox-${suffix}`,
    owner.id,
    `course-validation-inbox-${suffix}`,
    `evidence-validation-inbox-${suffix}`,
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO pre_correction_manifests
       (id, batch_id, project_scope, rubric_version_id, grading_profile_id,
        submission_refs_json, workflow_version, status, created_by,
        validation_ref, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'workflow-v1', 'validated', ?,
             'validation-inbox-fixture', ?)`,
  ).run(
    `manifest-validation-inbox-${suffix}`,
    `batch-validation-inbox-${suffix}`,
    `course-validation-inbox-${suffix}`,
    `rubric-validation-inbox-${suffix}-v1`,
    `grading-validation-inbox-${suffix}-v1`,
    JSON.stringify([`submission-validation-inbox-${suffix}`]),
    owner.id,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO pre_correction_runs
       (id, manifest_id, batch_id, submission_id, owner_id, project_scope,
        rubric_version_id, grading_profile_id, analysis_type, evidence_snapshot_ref,
        method_version, criterion_score_refs_json, review_reasons_json,
        status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'rubric_scoring',
             ?, 'criterion-analysis-v1', ?, ?, 'needs_review', ?, ?)`,
  ).run(
    `run-validation-inbox-${suffix}`,
    `manifest-validation-inbox-${suffix}`,
    `batch-validation-inbox-${suffix}`,
    `submission-validation-inbox-${suffix}`,
    owner.id,
    `course-validation-inbox-${suffix}`,
    `rubric-validation-inbox-${suffix}-v1`,
    `grading-validation-inbox-${suffix}-v1`,
    `storage://private/validation-inbox/${suffix}/snapshot`,
    JSON.stringify([`score-validation-inbox-${suffix}`]),
    JSON.stringify(['teacher_validation_required']),
    now,
    now,
  );
}

beforeAll(async () => {
  await seedAll();
  insertUser(teacher);
  insertUser(otherTeacher);
  insertUser(student);
  insertFeedbackFixture(teacher);
  insertFeedbackFixture(otherTeacher);
  teacherToken = signToken(teacher);
  studentToken = signToken(student);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createValidationInboxRouter());
  app.use('/api/v1', createProjectsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

describe('Validation Inbox MVP — projection action-based', () => {
  it('projette une action pending_validation en item reviewable canon', () => {
    const actionId = createPendingAction();
    const items = listValidationInboxItems(teacher);
    const item = items.find((entry) => entry.source_id === actionId);

    expect(item).toBeTruthy();
    expect(item?.source_kind).toBe('action');
    expect(item?.current_status).toBe('needs_review');
    expect(item?.risk_level).toBe('high');
    expect(item?.blocked_actions).toContain('execute_action');
    expect(item?.decision_options).toEqual(['approve', 'reject']);
  });

  it('décide via la Validation Inbox sans contourner validateAction', () => {
    const actionId = createPendingAction();
    const item = listValidationInboxItems(teacher).find((entry) => entry.source_id === actionId);
    if (!item) throw new Error('item de test introuvable');

    const decided = decideValidationInboxItem(teacher, item.item_id, {
      decision: 'approve',
      note: 'OK test',
    });

    expect(decided.current_status).toBe('approved');
    expect(decided.decision?.value).toBe('approve');
    expect(decided.decision?.decided_by).toBe(teacher.id);
    expect(getAction(actionId)?.status).toBe('approved');
  });

  it('refuse les décisions non supportées pour une action dans cette première tranche', () => {
    const actionId = createPendingAction();
    const item = listValidationInboxItems(teacher).find((entry) => entry.source_id === actionId);
    if (!item) throw new Error('item de test introuvable');

    expect(() => decideValidationInboxItem(teacher, item.item_id, {decision: 'park'})).toThrow(
      'validation_inbox_decision_not_supported_for_action',
    );
  });

  it('projette un feedback D06 pending de l owner une seule fois', () => {
    const feedbackId = createPendingFeedbackDraft('feedback-validation-inbox-owner-visible');
    const items = listValidationInboxItems(teacher);
    const feedbackItems = items.filter(
      (entry) => entry.source_kind === 'feedback_draft' && entry.source_id === feedbackId,
    );

    expect(feedbackItems).toHaveLength(1);
    const feedbackItem = feedbackItems[0];
    if (!feedbackItem) throw new Error('item feedback projeté introuvable');
    expect(feedbackItem).toMatchObject({
      item_type: 'feedback_review',
      current_status: 'needs_review',
      risk_level: 'high',
      required_validator: 'teacher_owner',
      output_readiness_state: 'blocked',
      decision_options: ['approve', 'reject'],
    });
    expect(feedbackItem.blocked_actions).toContain('student_send');
  });

  it('ne montre pas le feedback D06 owner-only à un autre professeur', () => {
    const feedbackId = createPendingFeedbackDraft('feedback-validation-inbox-owner-private');

    const visibleForOwner = listValidationInboxItems(teacher).some(
      (entry) => entry.source_kind === 'feedback_draft' && entry.source_id === feedbackId,
    );
    const visibleForOtherTeacher = listValidationInboxItems(otherTeacher).some(
      (entry) => entry.source_kind === 'feedback_draft' && entry.source_id === feedbackId,
    );

    expect(visibleForOwner).toBe(true);
    expect(visibleForOtherTeacher).toBe(false);
  });

  it('approuve un feedback D06 via l autorité reviewFeedbackDraft sans créer d export', () => {
    const feedbackId = createPendingFeedbackDraft('feedback-validation-inbox-approve');
    const item = listValidationInboxItems(teacher).find(
      (entry) => entry.source_kind === 'feedback_draft' && entry.source_id === feedbackId,
    );
    if (!item) throw new Error('item feedback de test introuvable');
    const exportCountBefore = getDb()
      .prepare('SELECT COUNT(*) AS count FROM correction_export_previews')
      .get() as {count: number};

    const decided = decideValidationInboxItem(teacher, item.item_id, {
      decision: 'approve',
      note: 'Feedback sûr pour preview privée',
    });

    const draft = getFeedbackDraft(teacher, feedbackId);
    const exportCountAfter = getDb()
      .prepare('SELECT COUNT(*) AS count FROM correction_export_previews')
      .get() as {count: number};
    expect(decided.current_status).toBe('approved');
    expect(decided.output_readiness_state).toBe('ready');
    expect(draft.status).toBe('approved');
    expect(draft.validator_id).toBe(teacher.id);
    expect(draft.validation_ref).toContain(`validation_inbox:${item.item_id}:approve:`);
    expect(exportCountAfter.count).toBe(exportCountBefore.count);
  });

  it('rejette un feedback D06 via l autorité reviewFeedbackDraft', () => {
    const feedbackId = createPendingFeedbackDraft('feedback-validation-inbox-reject');
    const item = listValidationInboxItems(teacher).find(
      (entry) => entry.source_kind === 'feedback_draft' && entry.source_id === feedbackId,
    );
    if (!item) throw new Error('item feedback de test introuvable');

    const decided = decideValidationInboxItem(teacher, item.item_id, {
      decision: 'reject',
      note: 'Feedback à reprendre',
    });

    expect(decided.current_status).toBe('rejected');
    expect(decided.output_readiness_state).toBe('blocked');
    expect(getFeedbackDraft(teacher, feedbackId).status).toBe('rejected');
  });

  it('refuse une seconde décision sur le même feedback D06', () => {
    const feedbackId = createPendingFeedbackDraft('feedback-validation-inbox-one-shot');
    const item = listValidationInboxItems(teacher).find(
      (entry) => entry.source_kind === 'feedback_draft' && entry.source_id === feedbackId,
    );
    if (!item) throw new Error('item feedback de test introuvable');

    decideValidationInboxItem(teacher, item.item_id, {decision: 'approve'});

    expect(() => decideValidationInboxItem(teacher, item.item_id, {decision: 'reject'})).toThrow(
      'validation_inbox_item_already_decided',
    );
  });

  it('expose /validation-inbox sans bloquer les routeurs suivants montés à la racine', async () => {
    createPendingAction();
    const inbox = await fetch(`${base}/validation-inbox`, {
      headers: {Authorization: `Bearer ${teacherToken}`},
    });
    expect(inbox.status).toBe(200);

    const project = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}`},
      body: JSON.stringify({name: 'Projet après validation inbox'}),
    });
    expect(project.status).toBe(201);
  });

  it('refuse la surface partagée aux comptes student', async () => {
    const response = await fetch(`${base}/validation-inbox`, {
      headers: {Authorization: `Bearer ${studentToken}`},
    });

    expect(response.status).toBe(403);
  });
});
