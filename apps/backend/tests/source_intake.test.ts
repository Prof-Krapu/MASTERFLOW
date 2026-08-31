import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  intakeSource,
  listSourceIntake,
  previewSourceGovernance,
} from '../src/services/source_intake.ts';

const teacher: AuthUser = {id: 'intake-teacher', username: 'intake_teacher', role: 'teacher'};
const student: AuthUser = {id: 'intake-student', username: 'intake_student', role: 'student'};
const admin: AuthUser = {id: 'intake-admin', username: 'intake_admin', role: 'admin'};
const hashA = 'a'.repeat(64);
const hashB = 'b'.repeat(64);

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, admin]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  db.prepare(
    `INSERT OR IGNORE INTO projects
       (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('intake-project', ?, 'Source intake pilot', 'active', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
     VALUES ('intake-project', ?, 'owner', ?), ('intake-project', ?, 'participant', ?)`,
  ).run(teacher.id, now, student.id, now);
});

describe('Source/Intake pilote', () => {
  it('simule sans écrire ni copier la source originale', () => {
    const before = (getDb().prepare('SELECT COUNT(*) AS count FROM source_intake_records').get() as {count: number}).count;
    const record = intakeSource(student, {
      runtime_pack_id: 'ours-dor-pilot-v1',
      project_id: 'intake-project',
      source_ref: 'ours-dor:student:brief-01',
      label: 'Brief étudiant',
      source_role: 'student',
      content_sha256: hashA,
      provenance: 'copie de travail fournie par le participant',
      rights: 'authorized',
      evidence_refs: ['evidence:brief-01'],
      mode: 'simulate',
    });
    const after = (getDb().prepare('SELECT COUNT(*) AS count FROM source_intake_records').get() as {count: number}).count;
    expect(record).toMatchObject({status: 'simulated', persisted: false, original_immutable: true});
    expect(after).toBe(before);
  });

  it('enregistre un manifeste candidat idempotent pour un professeur', () => {
    const input = {
      runtime_pack_id: 'ours-dor-pilot-v1',
      project_id: 'intake-project',
      source_ref: 'ours-dor:teacher:checkpoint-01',
      label: 'Checkpoint professeur',
      source_role: 'teacher' as const,
      content_sha256: hashB,
      provenance: 'copie de travail contrôlée',
      rights: 'owned' as const,
      evidence_refs: ['evidence:checkpoint-01'],
      mode: 'register_candidate' as const,
    };
    const first = intakeSource(teacher, input);
    const second = intakeSource(teacher, input);
    expect(first).toMatchObject({status: 'candidate', persisted: true, original_immutable: true});
    expect(second.intake_id).toBe(first.intake_id);
  });

  it('refuse un namespace appartenant à un autre pilote', () => {
    expect(() => intakeSource(student, {
      runtime_pack_id: 'ours-dor-pilot-v1',
      project_id: 'intake-project',
      source_ref: 'talents-creatifs:student:brief-01',
      label: 'Mauvais brief',
      source_role: 'student',
      content_sha256: hashA,
      provenance: 'test',
      rights: 'authorized',
      mode: 'simulate',
    })).toThrow('source_namespace_mismatch');
  });

  it('masque les sources équipe Talents aux étudiants', () => {
    intakeSource(admin, {
      runtime_pack_id: 'talents-creatifs-pilot-v1',
      project_id: 'intake-project',
      source_ref: 'talents-creatifs:team:decision-01',
      label: 'Décision équipe',
      source_role: 'team',
      content_sha256: hashA,
      provenance: 'équipe Talents',
      rights: 'restricted',
      mode: 'register_candidate',
    });
    expect(listSourceIntake(student, 'talents-creatifs-pilot-v1', 'intake-project')).toEqual([]);
    expect(listSourceIntake(admin, 'talents-creatifs-pilot-v1', 'intake-project')).toHaveLength(1);
  });

  it('prépare une purge sans mutation et la bloque sous legal hold', () => {
    const record = intakeSource(teacher, {
      runtime_pack_id: 'ours-dor-pilot-v1',
      project_id: 'intake-project',
      source_ref: 'ours-dor:teacher:protected-01',
      label: 'Source protégée',
      source_role: 'teacher',
      content_sha256: 'c'.repeat(64),
      provenance: 'archive pédagogique contrôlée',
      rights: 'owned',
      consent_status: 'granted',
      legal_hold: true,
      export_allowed: true,
      retention_until: Date.now() + 86_400_000,
      mode: 'register_candidate',
    });
    const before = getDb().prepare('SELECT * FROM source_intake_records WHERE id = ?').get(record.intake_id);
    const preview = previewSourceGovernance(teacher, record.intake_id, 'request_purge');
    const after = getDb().prepare('SELECT * FROM source_intake_records WHERE id = ?').get(record.intake_id);
    expect(preview).toMatchObject({
      allowed_to_request: false,
      validation_required: true,
      execution_allowed_by_preview: false,
      source_unchanged: true,
    });
    expect(preview.blocked_reasons).toEqual(expect.arrayContaining([
      'legal_hold_active',
      'retention_period_active',
    ]));
    expect(after).toEqual(before);
  });
});
