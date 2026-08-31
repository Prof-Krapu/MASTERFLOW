import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {createAction, executeAction, preflightAction, validateAction} from '../src/engines/action_engine.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createOperationalIntake,
  getOperationalIntake,
  listOperationalIntake,
} from '../src/services/operational_intake.ts';

const teacher: AuthUser = {id: 'operations-teacher', username: 'operations_teacher', role: 'teacher'};
const student: AuthUser = {id: 'operations-student', username: 'operations_student', role: 'student'};
const outsider: AuthUser = {id: 'operations-outsider', username: 'operations_outsider', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insert = db.prepare(
    `INSERT INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  db.prepare(
    `INSERT INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('operations-project', ?, 'Operations project', 'active', 'private', ?, ?)`,
  ).run(teacher.id, now, now);
  db.prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES ('operations-project', ?, 'owner', ?), ('operations-project', ?, 'participant', ?)`,
  ).run(teacher.id, now, student.id, now);
});
describe('API_manage operational intake', () => {
  it('crée un feedback candidat idempotent sans contenu brut', () => {
    const input = {
      kind: 'feedback' as const,
      project_id: null,
      scope_type: 'personal' as const,
      scope_id: student.id,
      title: 'Retour sur le parcours',
      detail_ref: 'storage://private/operations/feedback-01',
      provenance: 'formulaire utilisateur authentifié',
      evidence_refs: ['room:pilot-01'],
      moderation_target_ref: null,
      idempotency_key: 'feedback-01-idempotent',
    };
    const first = createOperationalIntake(student, input);
    const second = createOperationalIntake(student, input);
    expect(first).toMatchObject({status: 'candidate', kind: 'feedback'});
    expect(second.intake_id).toBe(first.intake_id);
    expect(JSON.stringify(first)).not.toContain('contenu brut');
  });

  it('isole les scopes et interdit annonces/modération au rôle étudiant', () => {
    expect(() => listOperationalIntake(outsider, 'personal', student.id)).toThrow(
      'operational_intake_scope_denied',
    );
    expect(() => createOperationalIntake(student, {
      kind: 'announcement',
      project_id: 'operations-project',
      scope_type: 'project',
      scope_id: 'operations-project',
      title: 'Annonce interdite',
      detail_ref: 'storage://private/operations/announcement-01',
      provenance: 'test',
      evidence_refs: ['request:test'],
      moderation_target_ref: null,
      idempotency_key: 'announcement-student-denied',
    })).toThrow('operational_intake_kind_denied');
  });

  it('soft-archive uniquement après preflight et validation humaine, sans suppression', () => {
    const intake = createOperationalIntake(teacher, {
      kind: 'ticket',
      project_id: 'operations-project',
      scope_type: 'project',
      scope_id: 'operations-project',
      title: 'Ticket à archiver',
      detail_ref: 'storage://private/operations/ticket-archive',
      provenance: 'inbox projet',
      evidence_refs: ['project:operations-project'],
      moderation_target_ref: null,
      idempotency_key: 'ticket-archive-idempotent',
    });
    const action = createAction(teacher, {
      registry_id: 'soft_archive_operational_intake',
      intent: 'Archiver le ticket traité',
      object_type: 'operational_intake',
      project_id: 'operations-project',
      payload: {intake_id: intake.intake_id, reason: 'Ticket traité et conservé pour audit.'},
    });
    expect(preflightAction(teacher, action.id).status).toBe('pending_validation');
    expect(() => executeAction(teacher, action.id)).toThrow();
    expect(getOperationalIntake(teacher, intake.intake_id).status).toBe('candidate');
    validateAction(teacher, action.id, {decision: 'approved', note: 'Archivage confirmé.'});
    expect(executeAction(teacher, action.id)).toMatchObject({status: 'completed'});
    const row = getDb().prepare('SELECT * FROM operational_intake_items WHERE id = ?').get(intake.intake_id) as {
      status: string; archive_reason: string | null;
    };
    expect(row).toMatchObject({status: 'soft_archived', archive_reason: 'Ticket traité et conservé pour audit.'});
    expect(getDb().prepare('SELECT COUNT(*) AS count FROM operational_intake_items WHERE id = ?').get(intake.intake_id))
      .toEqual({count: 1});
  });
});
