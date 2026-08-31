import {
  TeachingWorkspaceFoundationSchema,
  type AssignmentDeadline,
  type CourseOffering,
  type CourseSession,
  type Enrollment,
  type Institution,
  type LearningObjective,
  type School,
  type SpaceMembership,
  type TeachingModule,
  type TeachingResourceLink,
  type TeachingWorkspaceFoundation,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getProject} from './projects.ts';

interface IdRow { id: string }

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}
/**
 * Projection en lecture seule des nouvelles fondations Teaching.
 * Elle ne renvoie que les espaces dont l'acteur est propriétaire ou membre actif,
 * et uniquement son propre membership/enrollment : les rosters restent dans Teaching.
 */
export function getTeachingWorkspaceFoundation(
  actor: AuthUser,
  projectId?: string | null,
): TeachingWorkspaceFoundation {
  if (projectId) getProject(actor, projectId);
  const db = getDb();
  const institutions = db.prepare(
    `SELECT DISTINCT i.* FROM institutions i
     LEFT JOIN space_memberships m ON m.institution_id = i.id
     WHERE i.status != 'archived'
       AND (i.owner_id = ? OR (m.user_id = ? AND m.status = 'active'))
     ORDER BY i.name, i.id`,
  ).all(actor.id, actor.id) as Array<{
    id: string; owner_id: string; name: string; status: Institution['status']; created_at: number; updated_at: number;
  }>;
  const institutionIds = institutions.map((item) => item.id);
  if (institutionIds.length === 0) {
    return TeachingWorkspaceFoundationSchema.parse({
      institutions: [], schools: [], memberships: [], modules: [], offerings: [], sessions: [],
      enrollments: [], objectives: [], deadlines: [], resource_links: [],
      evidence_semantics: {
        evidence_events_are_sources: true,
        pedagogical_signals_are_interpretations: true,
        teacher_decision_deltas_are_human_decisions: true,
        categories_are_not_interchangeable: true,
      },
      generated_at: Date.now(),
    });
  }

  const schools = db.prepare(
    `SELECT * FROM schools WHERE institution_id IN (${placeholders(institutionIds)})
       AND status != 'archived' ORDER BY name, id`,
  ).all(...institutionIds) as Array<{
    id: string; institution_id: string; name: string; code: string; status: School['status']; created_at: number; updated_at: number;
  }>;
  const memberships = db.prepare(
    `SELECT * FROM space_memberships WHERE institution_id IN (${placeholders(institutionIds)})
       AND user_id = ? AND status != 'archived' ORDER BY institution_id, school_id, id`,
  ).all(...institutionIds, actor.id) as Array<{
    id: string; institution_id: string; school_id: string | null; user_id: string;
    role: SpaceMembership['role']; status: SpaceMembership['status']; created_at: number; updated_at: number;
  }>;
  const schoolIds = schools.map((item) => item.id);
  const modules = schoolIds.length === 0 ? [] : db.prepare(
    `SELECT * FROM teaching_modules WHERE school_id IN (${placeholders(schoolIds)})
       AND status != 'archived' ${projectId ? 'AND (project_id = ? OR project_id IS NULL)' : ''}
     ORDER BY title, id`,
  ).all(...schoolIds, ...(projectId ? [projectId] : [])) as Array<{
    id: string; school_id: string; project_id: string | null; academic_framework_id: string | null;
    academic_level_id: string | null; code: string; title: string; status: TeachingModule['status'];
  }>;
  const moduleIds = modules.map((item) => item.id);
  const offerings = moduleIds.length === 0 ? [] : db.prepare(
    `SELECT * FROM course_offerings WHERE module_id IN (${placeholders(moduleIds)})
       AND status != 'archived' ORDER BY period_ref, id`,
  ).all(...moduleIds) as Array<{
    id: string; module_id: string; cohort_id: string | null; period_ref: string; status: CourseOffering['status'];
  }>;
  const offeringIds = offerings.map((item) => item.id);
  const sessions = offeringIds.length === 0 ? [] : db.prepare(
    `SELECT * FROM course_sessions WHERE offering_id IN (${placeholders(offeringIds)})
       AND status != 'archived' ORDER BY starts_at, id`,
  ).all(...offeringIds) as Array<{
    id: string; offering_id: string; title: string; starts_at: number; ends_at: number; status: CourseSession['status'];
  }>;
  const enrollments = offeringIds.length === 0 ? [] : db.prepare(
    `SELECT * FROM enrollments WHERE offering_id IN (${placeholders(offeringIds)})
       AND user_id = ? AND status != 'archived' ORDER BY id`,
  ).all(...offeringIds, actor.id) as Array<{
    id: string; offering_id: string; user_id: string | null; student_identity_id: string | null; status: Enrollment['status'];
  }>;
  const objectives = moduleIds.length === 0 ? [] : db.prepare(
    `SELECT * FROM learning_objectives WHERE module_id IN (${placeholders(moduleIds)})
       AND status != 'archived' ORDER BY id`,
  ).all(...moduleIds) as Array<{
    id: string; module_id: string; label: string; competency_refs_json: string; status: LearningObjective['status'];
  }>;
  const assignmentRows = moduleIds.length === 0 ? [] : db.prepare(
    `SELECT d.* FROM assignment_deadlines d
     JOIN course_offerings o ON o.id = d.offering_id
     WHERE o.module_id IN (${placeholders(moduleIds)}) AND d.status != 'archived'
     ORDER BY d.due_at, d.id`,
  ).all(...moduleIds) as Array<{
    id: string; assignment_id: string; offering_id: string; due_at: number; timezone: string; status: AssignmentDeadline['status'];
  }>;
  const resourceLinks = moduleIds.length === 0 ? [] : db.prepare(
    `SELECT * FROM teaching_resource_links WHERE module_id IN (${placeholders(moduleIds)})
       AND status != 'archived' ORDER BY id`,
  ).all(...moduleIds) as Array<{
    id: string; module_id: string; resource_id: string; objective_id: string | null; source_ref: string; status: TeachingResourceLink['status'];
  }>;

  return TeachingWorkspaceFoundationSchema.parse({
    institutions: institutions.map((row) => ({institution_id: row.id, ...row})),
    schools: schools.map((row) => ({school_id: row.id, ...row})),
    memberships: memberships.map((row) => ({membership_id: row.id, ...row})),
    modules: modules.map((row) => ({module_id: row.id, ...row})),
    offerings: offerings.map((row) => ({offering_id: row.id, ...row})),
    sessions: sessions.map((row) => ({session_id: row.id, ...row})),
    enrollments: enrollments.map((row) => ({enrollment_id: row.id, ...row})),
    objectives: objectives.map((row) => ({
      objective_id: row.id,
      module_id: row.module_id,
      label: row.label,
      competency_refs: JSON.parse(row.competency_refs_json) as unknown,
      status: row.status,
    })),
    deadlines: assignmentRows.map((row) => ({deadline_id: row.id, ...row})),
    resource_links: resourceLinks.map((row) => ({resource_link_id: row.id, ...row})),
    evidence_semantics: {
      evidence_events_are_sources: true,
      pedagogical_signals_are_interpretations: true,
      teacher_decision_deltas_are_human_decisions: true,
      categories_are_not_interchangeable: true,
    },
    generated_at: Date.now(),
  });
}
