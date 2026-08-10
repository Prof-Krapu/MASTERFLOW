import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createCohort, createRosterVersion} from '../src/services/cohorts.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';
import {activateSubjectAssignment, createSubject, createSubjectAssignment, validateSubjectVersion} from '../src/services/subjects.ts';
import {getTeachingOverview} from '../src/services/teaching.ts';
import {assertPedagogicalScopeAccess, assertWeatherAccess, computeWeather} from '../src/services/weather_engine.ts';

const owner: AuthUser = {id: 'teaching-owner', username: 'teaching_owner', role: 'teacher'};
const editor: AuthUser = {id: 'teaching-editor', username: 'teaching_editor', role: 'teacher'};
const student: AuthUser = {id: 'teaching-student', username: 'teaching_student', role: 'student'};
const outsider: AuthUser = {id: 'teaching-outsider', username: 'teaching_outsider', role: 'teacher'};

const manifest = {
  situation: 'Une marque doit évoluer.',
  tension: 'Visibilité contre cohérence.',
  mission: 'Construire une campagne.',
  decision_to_make: 'Choisir un territoire.',
  observable_deliverables: ['Concept'],
  proofs_of_understanding: ['Justification sourcée'],
  progression_levels: ['Diagnostic', 'Décision'],
  objectives: ['Argumenter'],
  criteria: ['Cohérence'],
  competencies: ['Direction artistique'],
  bloom_level: 'Évaluer',
  constraints: [],
  checkpoints: [],
  evaluation_mode: 'Formative',
  assistance_level: 'Guidage léger',
  deadlines: [],
  resource_refs: [],
  correction_model_candidate_ref: null,
  deployment_state: 'private_draft' as const,
};

let projectId = '';
let cohortId = '';
let assignmentId = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, editor, student, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(owner, {name: 'Teaching partagé'});
  projectId = project.project_id;
  addProjectMember(owner, projectId, {user_id: editor.id, role: 'editor'});
  addProjectMember(owner, projectId, {user_id: student.id, role: 'participant'});
  const cohort = createCohort(owner, {project_id: projectId, title: '4CREA A'});
  cohortId = cohort.cohort_id;
  createRosterVersion(owner, cohortId, {
    source_ref: 'test://teaching-roster',
    members: [{display_name: 'Camille Test', aliases: []}],
  });
  const subject = createSubject(editor, {project_id: projectId, title: 'Direction artistique', manifest});
  validateSubjectVersion(editor, subject.version.version_id);
  const assignment = createSubjectAssignment(editor, {
    project_id: projectId,
    cohort_id: cohortId,
    source_subject_version_id: subject.version.version_id,
    title: 'Direction artistique',
  });
  assignmentId = assignment.assignment_id;
  activateSubjectAssignment(editor, assignmentId);
});

describe('Teaching overview attribuable', () => {
  it('autorise un éditeur projet à affecter un sujet à la cohorte du projet', () => {
    const overview = getTeachingOverview(editor);
    expect(overview.cohorts.some((item) => item.cohort.cohort_id === cohortId)).toBe(true);
    expect(overview.assignments).toContainEqual(expect.objectContaining({
      assignment: expect.objectContaining({assignment_id: assignmentId}),
      correction_sheet_status: 'draft',
    }));
  });

  it('projette les identités sans inventer de maîtrise, score ou météo', () => {
    const overview = getTeachingOverview(editor);
    const projectedStudent = overview.cohorts.find((item) => item.cohort.cohort_id === cohortId)?.students[0];
    expect(projectedStudent?.display_name).toBe('Camille Test');
    expect(projectedStudent?.subject_states[0]).toMatchObject({
      stage: 'no_signal',
      signal_status: 'unavailable',
      candidate_score: null,
      assigned_notions: ['Direction artistique'],
    });
  });

  it('refuse les scopes météo/signaux étrangers et autorise le projet partagé explicite', () => {
    expect(() => assertPedagogicalScopeAccess(outsider, projectId)).toThrow('pedagogical_scope_denied');
    expect(() => assertWeatherAccess(outsider, student.id, projectId)).toThrow('pedagogical_scope_denied');
    expect(() => assertWeatherAccess(owner, student.id, projectId)).not.toThrow();
    expect(() => assertWeatherAccess(student, student.id, projectId)).not.toThrow();
  });

  it('ne mélange plus les signaux individuels globaux sans scope explicite', () => {
    const weather = computeWeather(student.id);
    expect(weather.signals_summary.total_recent).toBe(0);
  });
});
