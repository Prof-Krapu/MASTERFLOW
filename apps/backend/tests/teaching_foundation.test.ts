import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {getTeachingWorkspaceFoundation} from '../src/services/teaching_foundation.ts';

const teacher: AuthUser = {id: 'foundation-teacher', username: 'foundation_teacher', role: 'teacher'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, 'Foundation Teacher', 'x', 'teacher', 1, ?, ?),
            ('foundation-other', 'foundation_other', 'Other Owner', 'x', 'teacher', 1, ?, ?)`,
  ).run(teacher.id, teacher.username, now, now, now, now);
  db.prepare(
    `INSERT INTO institutions (id, owner_id, name, status, created_at, updated_at)
     VALUES ('institution-a', ?, 'Institution A', 'active', ?, ?),
            ('institution-b', 'foundation-other', 'Institution B', 'active', ?, ?)`,
  ).run(teacher.id, now, now, now, now);
  db.prepare(
    `INSERT INTO schools (id, institution_id, name, code, status, created_at, updated_at)
     VALUES ('school-a', 'institution-a', 'School A', 'A', 'active', ?, ?),
            ('school-b', 'institution-b', 'School B', 'B', 'active', ?, ?)`,
  ).run(now, now, now, now);
  db.prepare(
    `INSERT INTO space_memberships
       (id, institution_id, school_id, user_id, role, status, created_at, updated_at)
     VALUES ('membership-a', 'institution-a', 'school-a', ?, 'teacher', 'active', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO teaching_modules
       (id, school_id, project_id, academic_framework_id, academic_level_id, code, title, status, created_at, updated_at)
     VALUES ('module-a', 'school-a', NULL, NULL, NULL, 'MOD-A', 'Module visible', 'active', ?, ?),
            ('module-b', 'school-b', NULL, NULL, NULL, 'MOD-B', 'Module caché', 'active', ?, ?)`,
  ).run(now, now, now, now);
  db.prepare(
    `INSERT INTO course_offerings (id, module_id, cohort_id, period_ref, status, created_at, updated_at)
     VALUES ('offering-a', 'module-a', NULL, '2026-S1', 'active', ?, ?)`,
  ).run(now, now);
  db.prepare(
    `INSERT INTO course_sessions (id, offering_id, title, starts_at, ends_at, status, created_at, updated_at)
     VALUES ('session-a', 'offering-a', 'Session A', ?, ?, 'planned', ?, ?)`,
  ).run(now + 1_000, now + 3_600_000, now, now);
  db.prepare(
    `INSERT INTO enrollments (id, offering_id, user_id, student_identity_id, status, created_at, updated_at)
     VALUES ('enrollment-a', 'offering-a', ?, NULL, 'active', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO learning_objectives
       (id, module_id, label, competency_refs_json, status, created_at, updated_at)
     VALUES ('objective-a', 'module-a', 'Objectif A', '["competency:a"]', 'validated', ?, ?)`,
  ).run(now, now);
});
describe('Teaching Workspace foundation', () => {
  it('isole strictement les institutions et écoles visibles', () => {
    const foundation = getTeachingWorkspaceFoundation(teacher);
    expect(foundation.institutions.map((item) => item.institution_id)).toEqual(['institution-a']);
    expect(foundation.schools.map((item) => item.school_id)).toEqual(['school-a']);
    expect(foundation.modules.map((item) => item.module_id)).toEqual(['module-a']);
    expect(foundation.offerings.map((item) => item.offering_id)).toEqual(['offering-a']);
    expect(foundation.sessions.map((item) => item.session_id)).toEqual(['session-a']);
    expect(foundation.enrollments.map((item) => item.enrollment_id)).toEqual(['enrollment-a']);
  });

  it('garde preuve, signal et décision professeur comme trois catégories distinctes', () => {
    expect(getTeachingWorkspaceFoundation(teacher).evidence_semantics).toEqual({
      evidence_events_are_sources: true,
      pedagogical_signals_are_interpretations: true,
      teacher_decision_deltas_are_human_decisions: true,
      categories_are_not_interchangeable: true,
    });
  });
});
