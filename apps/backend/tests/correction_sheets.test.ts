import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {listCorrectionSheetDrafts, updateCorrectionSheetDraft, validateCorrectionSheetDraft} from '../src/services/correction_sheets.ts';

const teacher: AuthUser = {id: 'cs-test-teacher', username: 'cs_test_teacher', role: 'teacher'};
const now = Date.now();

beforeAll(async () => {
  await seedAll();
  getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);

  getDb().prepare(
    `INSERT OR IGNORE INTO subject_templates (id, owner_id, project_scope, title, status, created_at, updated_at)
     VALUES (?, ?, 'MASTERFLOW_narrative', 'Test Tpl', 'active', ?, ?)`,
  ).run('cs-test-tpl', teacher.id, now, now);

  getDb().prepare(
    `INSERT OR IGNORE INTO subject_versions
     (id, template_id, version, project_id, project_scope, manifest_json, status, created_by, created_at)
     VALUES (?, ?, 1, NULL, 'MASTERFLOW_narrative', '{}', 'validated', ?, ?)`,
  ).run('cs-test-sv', 'cs-test-tpl', teacher.id, now);

  getDb().prepare(
    `INSERT OR IGNORE INTO subject_assignments
     (id, owner_id, project_id, project_scope, cohort_id, source_subject_version_id, title, subject_snapshot_json, status, created_by, created_at)
     VALUES (?, ?, NULL, 'MASTERFLOW_narrative', 'cohort-iscom-2026-1a', ?, 'Test Assignment', '{}', 'active', ?, ?)`,
  ).run('cs-test-assignment', teacher.id, 'cs-test-sv', teacher.id, now);
});

describe('CorrectionSheets', () => {
  it('list throws for unknown assignment', () => {
    expect(() => listCorrectionSheetDrafts(teacher, 'nonexistent')).toThrow('assignment_not_found');
  });

  it('list returns drafts for known assignment', () => {
    const result = listCorrectionSheetDrafts(teacher, 'cs-test-assignment');
    expect(Array.isArray(result)).toBe(true);
  });

  it('update fails for nonexistent draft', () => {
    expect(() => updateCorrectionSheetDraft(teacher, 'cs-nonexistent', {
      teacher_fields: {},
      locked_teacher_fields: [],
    })).toThrow('not_found');
  });

  it('validate fails for nonexistent draft', () => {
    expect(() => validateCorrectionSheetDraft(teacher, 'cs-nonexistent', {validation_ref: 'x'})).toThrow('not_found');
  });
});
