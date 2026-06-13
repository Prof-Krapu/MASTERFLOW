import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createProject} from '../src/services/projects.ts';
import {
  addGuidedSessionParticipant,
  advanceGuidedSession,
  completeGuidedSession,
  createGuide,
  createGuidedSession,
  getGuide,
  getGuidedSession,
  listGuides,
  submitGuidedAnswer,
  updateGuide,
  validateGuide,
} from '../src/services/guided_runtime.ts';
import {validateSchemaTemplate} from '../src/services/schema_templates.ts';

const teacher: AuthUser = {id: 'guided-service-teacher', username: 'guided_service_teacher', role: 'teacher'};
const student: AuthUser = {id: 'guided-service-student', username: 'guided_service_student', role: 'student'};
const outsider: AuthUser = {id: 'guided-service-outsider', username: 'guided_service_outsider', role: 'student'};
const admin: AuthUser = {id: 'guided-service-admin', username: 'guided_service_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, outsider, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
});

function guideRequest(name: string) {
  return {
    name,
    purpose: 'Atelier CDC prive testable.',
    domain: 'cdc' as const,
    target_schema_id: 'cdc-template-candidate-v1',
    question_flow: [
      {question_id: 'q-context', prompt: 'Quel est le contexte ?', target_field: 'context', kind: 'text' as const, required: true},
      {question_id: 'q-objectives', prompt: 'Quels objectifs ?', target_field: 'objectives', kind: 'multi_choice' as const, required: true, options: ['clarifier', 'cadrer']},
      {question_id: 'q-audience', prompt: 'Quelle audience ?', target_field: 'audience', kind: 'text' as const, required: true},
      {question_id: 'q-deliverables', prompt: 'Quels livrables ?', target_field: 'deliverables', kind: 'multi_choice' as const, required: true, options: ['cdc', 'prototype']},
    ],
    completion_rules: {complete_when_required_fields_done: true},
    functional_persona_id: 'moth-functional-cdc',
    lore_persona_id: 'moth-lore-cdc',
    analytics_policy: {private: true},
    consent_policy: {required: true},
  };
}

describe('PR-6 — service Guided Runtime prive', () => {
  it('exige des sources validées hors preview et un consentement explicite', () => {
    const guide = createGuide(teacher, guideRequest('Guide gates PR-6'));
    expect(() =>
      createGuidedSession(teacher, {
        guide_id: guide.guide_id,
        preview: false,
        consent: {accepted: true},
      }),
    ).toThrow('guided_source_not_validated');
    expect(() =>
      createGuidedSession(teacher, {
        guide_id: guide.guide_id,
        preview: true,
        consent: {},
      }),
    ).toThrow('guided_consent_required');

    validateSchemaTemplate(admin, guide.target_schema_id);
    validateGuide(admin, guide.guide_id);
    expect(
      createGuidedSession(teacher, {
        guide_id: guide.guide_id,
        preview: false,
        consent: {accepted: true},
      }).status,
    ).toBe('active');
  });

  it('cree un guide draft teacher+ rattache projet et refuse student/non-owner', () => {
    const project = createProject(teacher, {name: 'Projet Guided PR-6'});
    const guide = createGuide(teacher, {...guideRequest('Guide PR-6 prive'), project_id: project.project_id});

    expect(guide).toMatchObject({
      owner_id: teacher.id,
      project_id: project.project_id,
      status: 'draft',
      target_schema_id: 'cdc-template-candidate-v1',
      target_schema_version: 1,
    });
    expect(() => createGuide(student, guideRequest('Guide student interdit'))).toThrow('permission_denied');
    expect(() => getGuide(outsider, guide.guide_id)).toThrow('guided_guide_not_found');
    expect(listGuides(teacher).map((item) => item.guide_id)).toContain(guide.guide_id);
  });

  it('modifie seulement un draft owner et fige guide/template version en session', () => {
    const guide = createGuide(teacher, guideRequest('Guide freeze PR-6'));
    const updated = updateGuide(teacher, guide.guide_id, {purpose: 'Atelier CDC prive v2.'});
    expect(updated.version).toBe(2);

    const session = createGuidedSession(teacher, {
      guide_id: guide.guide_id,
      preview: true,
      consent: {accepted: true},
    });
    expect(session).toMatchObject({
      guide_id: guide.guide_id,
      guide_version: 2,
      target_schema_id: 'cdc-template-candidate-v1',
      target_schema_version: 1,
      status: 'active',
    });

    updateGuide(teacher, guide.guide_id, {purpose: 'Atelier CDC prive v3.'});
    expect(getGuidedSession(teacher, session.session_id).guide_version).toBe(2);
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-context',
      value: 'snapshot toujours actif',
    });
    expect(getGuidedSession(teacher, session.session_id).structured_record).toMatchObject({
      context: 'snapshot toujours actif',
    });
  });

  it('autorise participant, refuse non-participant et garde une progression stable', () => {
    const guide = createGuide(teacher, guideRequest('Guide progression PR-6'));
    const session = createGuidedSession(teacher, {
      guide_id: guide.guide_id,
      preview: true,
      consent: {accepted: true},
    });
    addGuidedSessionParticipant(
      teacher,
      session.session_id,
      student.id,
      'participant',
      {accepted: true},
    );

    expect(() =>
      submitGuidedAnswer(outsider, session.session_id, {question_id: 'q-context', value: 'hors scope'}),
    ).toThrow('guided_session_not_found');

    submitGuidedAnswer(student, session.session_id, {question_id: 'q-context', value: 'brief ours'});
    const firstRead = getGuidedSession(student, session.session_id).progress;
    const secondRead = getGuidedSession(student, session.session_id).progress;
    expect(secondRead).toEqual(firstRead);
    expect(firstRead.completed_fields).toContain('context');
    expect(firstRead.missing_fields).toContain('objectives');
  });

  it('conserve les contradictions au lieu d ecraser silencieusement', () => {
    const guide = createGuide(teacher, guideRequest('Guide contradiction PR-6'));
    const session = createGuidedSession(teacher, {
      guide_id: guide.guide_id,
      preview: true,
      consent: {accepted: true},
    });
    addGuidedSessionParticipant(
      teacher,
      session.session_id,
      student.id,
      'participant',
      {accepted: true},
    );

    submitGuidedAnswer(teacher, session.session_id, {question_id: 'q-context', value: 'concours'});
    submitGuidedAnswer(student, session.session_id, {question_id: 'q-context', value: 'cours'});

    const after = advanceGuidedSession(teacher, session.session_id);
    expect(after.progress.contradictions).toContainEqual(
      expect.objectContaining({target_field: 'context'}),
    );
    expect(after.progress.missing_fields).toContain('context');
    expect(after.current_question_id).toBe('q-context');
  });

  it('refuse les valeurs incompatibles avec la question ou le schéma figé', () => {
    const guide = createGuide(teacher, guideRequest('Guide validation PR-6'));
    const session = createGuidedSession(teacher, {
      guide_id: guide.guide_id,
      preview: true,
      consent: {accepted: true},
    });
    expect(() =>
      submitGuidedAnswer(teacher, session.session_id, {
        question_id: 'q-objectives',
        value: 'pas un tableau',
      }),
    ).toThrow('guided_answer_invalid');
    expect(() =>
      submitGuidedAnswer(teacher, session.session_id, {
        question_id: 'q-objectives',
        value: ['option inconnue'],
      }),
    ).toThrow('guided_answer_invalid');
  });

  it('complete une session privee sans effet externe une fois les champs requis remplis', () => {
    const guide = createGuide(teacher, guideRequest('Guide complete PR-6'));
    const session = createGuidedSession(teacher, {
      guide_id: guide.guide_id,
      preview: true,
      consent: {accepted: true},
    });

    submitGuidedAnswer(teacher, session.session_id, {question_id: 'q-context', value: 'atelier prive'});
    submitGuidedAnswer(teacher, session.session_id, {question_id: 'q-objectives', value: ['clarifier']});
    submitGuidedAnswer(teacher, session.session_id, {question_id: 'q-audience', value: 'etudiants'});
    submitGuidedAnswer(teacher, session.session_id, {question_id: 'q-deliverables', value: ['cdc']});

    const completed = completeGuidedSession(teacher, session.session_id);
    expect(completed.status).toBe('completed');
    expect(completed.current_question_id).toBeNull();
    expect(completed.progress.completion_ratio).toBe(1);

    const audits = getDb()
      .prepare("SELECT detail_json FROM audit_logs WHERE event_type = 'guided.session_completed'")
      .all() as Array<{detail_json: string}>;
    expect(audits.map((row) => JSON.parse(row.detail_json) as {external_effects: unknown[]})).toContainEqual(
      expect.objectContaining({external_effects: []}),
    );
  });
});
