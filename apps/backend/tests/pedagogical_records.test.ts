import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  captureEvidence,
  listEvidence,
  recordPedagogicalSignal,
  recordTeacherDecisionDelta,
  saveTaskModelProfileDraft,
} from '../src/services/pedagogical_records.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const teacherA: AuthUser = {id: 'teacher-records-a', username: 'teacher_records_a', role: 'teacher'};
const teacherB: AuthUser = {id: 'teacher-records-b', username: 'teacher_records_b', role: 'teacher'};
const admin: AuthUser = {id: 'admin-records', username: 'admin_records', role: 'admin'};
const student: AuthUser = {id: 'student-records', username: 'student_records', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacherA, teacherB, admin, student]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
});

describe('PR-CB0 — dépôt interne permissionné', () => {
  it('utilise Project/Scope pour les nouvelles preuves et signaux projet', () => {
    const project = createProject(teacherA, {name: 'Projet pedagogique bridge'});
    const baseEvidence = {
      source_type: 'teacher_note' as const,
      adapter_id: 'teacher-note-v1',
      project_id: project.project_id,
      project_scope: project.project_id,
      target_refs: ['cohort-bridge'],
      extraction_confidence: null,
      privacy_level: 'private' as const,
      occurred_at: Date.now(),
      status: 'candidate' as const,
    };

    expect(() =>
      captureEvidence(teacherB, {
        ...baseEvidence,
        evidence_id: 'evidence-project-bridge-denied',
        owner_id: teacherB.id,
        payload_ref: 'storage://teacher-b-denied',
      }),
    ).toThrow('scope_denied');

    addProjectMember(teacherA, project.project_id, {user_id: teacherB.id, role: 'editor'});
    captureEvidence(teacherA, {
      ...baseEvidence,
      evidence_id: 'evidence-project-bridge-a',
      owner_id: teacherA.id,
      payload_ref: 'storage://teacher-a-project',
    });
    captureEvidence(teacherB, {
      ...baseEvidence,
      evidence_id: 'evidence-project-bridge-b',
      owner_id: teacherB.id,
      payload_ref: 'storage://teacher-b-project',
    });

    expect(
      listEvidence(teacherA, project.project_id, project.project_id).map((item) => item.evidence_id),
    ).toEqual(
      expect.arrayContaining(['evidence-project-bridge-a', 'evidence-project-bridge-b']),
    );
    expect(
      recordPedagogicalSignal(teacherA, {
        signal_id: 'signal-project-bridge',
        signal_type: 'confusion',
        level: 'cohort',
        project_id: project.project_id,
        project_scope: project.project_id,
        evidence_refs: ['evidence-project-bridge-a', 'evidence-project-bridge-b'],
        recurrence: 2,
        contradiction_refs: [],
        confidence: 0.7,
        sensitivity: 'sensitive',
        status: 'observation',
        created_at: Date.now(),
        updated_at: Date.now(),
      }),
    ).toMatchObject({project_id: project.project_id});

    expect(() =>
      captureEvidence(teacherA, {
        ...baseEvidence,
        evidence_id: 'evidence-project-bridge-mismatch',
        owner_id: teacherA.id,
        project_scope: 'legacy-free-text',
        payload_ref: 'storage://mismatch',
      }),
    ).toThrow('project_scope_mismatch');
  });

  it('interdit les preuves au student et les écritures teacher pour un autre owner', () => {
    const input = {
      evidence_id: 'evidence-records-denied',
      source_type: 'teacher_note' as const,
      adapter_id: 'teacher-note-v1',
      owner_id: teacherB.id,
      project_scope: 'course-records',
      target_refs: ['course-records'],
      payload_ref: 'storage://teacher-note-denied',
      extraction_confidence: null,
      privacy_level: 'private' as const,
      occurred_at: Date.now(),
      status: 'candidate' as const,
    };

    expect(() => captureEvidence(student, {...input, owner_id: student.id})).toThrow('permission_denied');
    expect(() => captureEvidence(teacherA, input)).toThrow('scope_denied');
  });

  it('limite la lecture teacher à ses propres preuves', () => {
    const now = Date.now();
    captureEvidence(teacherA, {
      evidence_id: 'evidence-records-a',
      source_type: 'submission',
      adapter_id: 'ocr-v1',
      owner_id: teacherA.id,
      project_scope: 'course-records',
      target_refs: ['submission-a'],
      payload_ref: 'storage://submission-a',
      extraction_confidence: 0.8,
      privacy_level: 'private',
      occurred_at: now,
      status: 'candidate',
    });
    captureEvidence(teacherB, {
      evidence_id: 'evidence-records-b',
      source_type: 'submission',
      adapter_id: 'ocr-v1',
      owner_id: teacherB.id,
      project_scope: 'course-records',
      target_refs: ['submission-b'],
      payload_ref: 'storage://submission-b',
      extraction_confidence: 0.9,
      privacy_level: 'private',
      occurred_at: now,
      status: 'candidate',
    });

    expect(listEvidence(teacherA, 'course-records').map((item) => item.evidence_id)).toEqual([
      'evidence-records-a',
    ]);
    expect(listEvidence(admin, 'course-records')).toHaveLength(2);
  });

  it('refuse un signal teacher fondé sur la preuve d un autre owner', () => {
    const base = {
      signal_id: 'signal-records-denied',
      signal_type: 'confusion' as const,
      level: 'cohort' as const,
      project_scope: 'course-records',
      evidence_refs: ['evidence-records-b'],
      recurrence: 1,
      contradiction_refs: [],
      confidence: 0.5,
      sensitivity: 'sensitive' as const,
      status: 'observation' as const,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    expect(() => recordPedagogicalSignal(teacherA, base)).toThrow('scope_denied');
    expect(recordPedagogicalSignal(teacherB, {...base, signal_id: 'signal-records-b'}).status).toBe(
      'observation',
    );
  });

  it('enregistre le delta du professeur sans appliquer d enrichissement', () => {
    const delta = recordTeacherDecisionDelta(teacherA, {
      delta_id: 'delta-records-a',
      object_type: 'feedback',
      object_ref: 'feedback-records-a',
      ai_proposal_ref: 'feedback-records-ai',
      human_decision_ref: 'feedback-records-human',
      changed_fields: ['observed_issue'],
      reason_code: 'precision',
      free_note_ref: null,
      teacher_id: teacherA.id,
      context_refs: ['course-records'],
      created_at: Date.now(),
    });

    expect(delta.human_decision_ref).not.toBe(delta.ai_proposal_ref);
    const enrichmentTables = getDb()
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN ('course_enrichment_candidates','method_profile_candidates')`,
      )
      .all();
    expect(enrichmentTables).toHaveLength(0);
  });

  it('réserve les profils modèle à admin et les force à rester draft', () => {
    const profile = {
      profile_id: 'task-profile-records',
      task: 'feedback_draft' as const,
      allowed_providers: ['local-provider'],
      fallback_order: [],
      privacy_mode: 'local_only' as const,
      max_cost_eur: 0,
      max_latency_ms: 10_000,
      status: 'draft' as const,
    };

    expect(() => saveTaskModelProfileDraft(teacherA, profile)).toThrow('permission_denied');
    expect(saveTaskModelProfileDraft(admin, profile).status).toBe('draft');
    expect(() =>
      saveTaskModelProfileDraft(admin, {...profile, status: 'validated' as const}),
    ).toThrow('task_model_profile_requires_validation');
  });
});
