import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  addProjectMember,
  attachResourceScope,
  createProject,
  decideScopedPermission,
  getProject,
  listProjectMembers,
  listProjects,
} from '../src/services/projects.ts';

const teacher: AuthUser = {id: 'projects-service-teacher', username: 'projects_service_teacher', role: 'teacher'};
const student: AuthUser = {id: 'projects-service-student', username: 'projects_service_student', role: 'student'};
const outsider: AuthUser = {id: 'projects-service-outsider', username: 'projects_service_outsider', role: 'student'};
const admin: AuthUser = {id: 'projects-service-admin', username: 'projects_service_admin', role: 'admin'};

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

describe('PR-4 — service Project/Scope', () => {
  it('crée un projet privé pour un teacher+ et refuse un student', () => {
    expect(() => createProject(student, {name: 'Projet refusé'})).toThrow('permission_denied');

    const project = createProject(teacher, {name: 'Projet PR-4 Service'});
    expect(project).toMatchObject({
      owner_id: teacher.id,
      name: 'Projet PR-4 Service',
      status: 'active',
      visibility: 'private',
    });
    expect(listProjectMembers(teacher, project.project_id)).toContainEqual(
      expect.objectContaining({user_id: teacher.id, role: 'owner'}),
    );
  });

  it('masque les projets aux non-membres et les expose aux membres/admins', () => {
    const project = createProject(teacher, {name: 'Projet PR-4 Membership'});

    expect(() => getProject(outsider, project.project_id)).toThrow('project_not_found');
    expect(listProjects(outsider).map((item) => item.project_id)).not.toContain(project.project_id);

    addProjectMember(teacher, project.project_id, {user_id: student.id, role: 'participant'});

    expect(getProject(student, project.project_id).project_id).toBe(project.project_id);
    expect(listProjects(student).map((item) => item.project_id)).toContain(project.project_id);
    expect(listProjects(admin).map((item) => item.project_id)).toContain(project.project_id);
  });

  it('limite la gestion des membres aux owners/admins projet', () => {
    const project = createProject(teacher, {name: 'Projet PR-4 Gates'});
    addProjectMember(teacher, project.project_id, {user_id: student.id, role: 'participant'});

    expect(() =>
      addProjectMember(student, project.project_id, {user_id: outsider.id, role: 'viewer'}),
    ).toThrow('project_membership_denied');

    const member = addProjectMember(admin, project.project_id, {user_id: outsider.id, role: 'viewer'});
    expect(member).toMatchObject({project_id: project.project_id, user_id: outsider.id, role: 'viewer'});
  });

  it('attache explicitement une ressource à un projet avant de l autoriser', () => {
    const project = createProject(teacher, {name: 'Projet PR-4 Resource Scope'});
    addProjectMember(teacher, project.project_id, {user_id: student.id, role: 'participant'});
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO resources
           (id, type, title, url, source, status, subjects_json, created_at)
         VALUES ('resource-pr4-service', 'doc', 'Ressource PR-4', NULL, 'test', 'validated', '[]', ?)`,
      )
      .run(now);

    expect(
      decideScopedPermission({
        actor: student,
        projectId: project.project_id,
        resourceId: 'resource-pr4-service',
        minimumProjectRole: 'participant',
      }),
    ).toMatchObject({allowed: false, resource_scope_match: false});

    attachResourceScope(teacher, {
      resource_id: 'resource-pr4-service',
      scope_type: 'project',
      scope_id: project.project_id,
      access_level: 'read',
      created_at: now,
    });

    expect(
      decideScopedPermission({
        actor: student,
        projectId: project.project_id,
        resourceId: 'resource-pr4-service',
        minimumProjectRole: 'participant',
      }),
    ).toMatchObject({allowed: true, resource_scope_match: true});
  });

  it('trace les créations, ajouts de membres et scopes ressources', () => {
    const rows = getDb()
      .prepare(
        `SELECT event_type FROM audit_logs
         WHERE event_type IN ('project.created','project.member_upserted','resource.scope_attached')`,
      )
      .all() as Array<{event_type: string}>;
    expect(rows.map((row) => row.event_type)).toEqual(
      expect.arrayContaining(['project.created', 'project.member_upserted', 'resource.scope_attached']),
    );
  });
});
