import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  addProjectMember,
  attachResourceScope,
  createProject,
  listProjectResources,
} from '../src/services/projects.ts';

/**
 * Multi-utilisateur réel : partage de ressources par appartenance à un projet.
 *
 * Cœur testé : un MEMBRE non-owner accède aux ressources rattachées au projet
 * (l'accès vient de la membership, plus de `owner = teacher`). Un non-membre est exclu.
 * Seuls owner/admin du projet peuvent rattacher une ressource.
 */

const owner: AuthUser = {id: 'pres-owner', username: 'pres_owner', role: 'teacher'};
const member: AuthUser = {id: 'pres-member', username: 'pres_member', role: 'student'};
const outsider: AuthUser = {id: 'pres-outsider', username: 'pres_outsider', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insertUser = getDb().prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const u of [owner, member, outsider]) insertUser.run(u.id, u.username, u.username, u.role, now, now);

  getDb()
    .prepare(
      `INSERT OR IGNORE INTO resources (id, type, title, url, source, status, subjects_json, created_at)
       VALUES ('pres-resource-1', 'doc', 'Ressource partagée', NULL, 'test', 'validated', '["maths"]', ?)`,
    )
    .run(now);
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO resources (id, type, title, url, source, status, subjects_json, created_at)
       VALUES ('pres-resource-candidate', 'doc', 'Candidate', NULL, 'test', 'candidate', '[]', ?)`,
    )
    .run(now);
});

describe('partage de ressources par projet (multi-utilisateur)', () => {
  it('un membre non-owner voit la ressource rattachée ; un non-membre est exclu', () => {
    const project = createProject(owner, {name: 'Projet partage ressources'});
    addProjectMember(owner, project.project_id, {user_id: member.id, role: 'participant'});

    // Avant rattachement : aucune ressource partagée.
    expect(listProjectResources(owner, project.project_id)).toHaveLength(0);

    // L'owner rattache la ressource au projet.
    attachResourceScope(owner, {
      resource_id: 'pres-resource-1',
      scope_type: 'project',
      scope_id: project.project_id,
      access_level: 'read',
      created_at: Date.now(),
    });

    // Le MEMBRE (pas l'owner) voit la ressource → accès par appartenance.
    const seenByMember = listProjectResources(member, project.project_id);
    expect(seenByMember).toHaveLength(1);
    expect(seenByMember[0]).toMatchObject({id: 'pres-resource-1', status: 'validated', subjects: ['maths']});

    // Un non-membre ne voit même pas le projet.
    expect(() => listProjectResources(outsider, project.project_id)).toThrow('project_not_found');
  });

  it('seuls owner/admin du projet peuvent rattacher une ressource', () => {
    const project = createProject(owner, {name: 'Projet gate rattachement'});
    addProjectMember(owner, project.project_id, {user_id: member.id, role: 'participant'});

    expect(() =>
      attachResourceScope(member, {
        resource_id: 'pres-resource-1',
        scope_type: 'project',
        scope_id: project.project_id,
        access_level: 'read',
        created_at: Date.now(),
      }),
    ).toThrow('project_membership_denied');
  });

  it('rattacher une ressource inexistante → resource_not_found', () => {
    const project = createProject(owner, {name: 'Projet ressource absente'});
    expect(() =>
      attachResourceScope(owner, {
        resource_id: 'pres-ghost',
        scope_type: 'project',
        scope_id: project.project_id,
        access_level: 'read',
        created_at: Date.now(),
      }),
    ).toThrow('resource_not_found');
  });

  it('refuse de partager une candidate comme vérité projet', () => {
    const project = createProject(owner, {name: 'Projet candidate refusée'});
    expect(() =>
      attachResourceScope(owner, {
        resource_id: 'pres-resource-candidate',
        scope_type: 'project',
        scope_id: project.project_id,
        access_level: 'read',
        created_at: Date.now(),
      }),
    ).toThrow('resource_not_validated');
    expect(listProjectResources(owner, project.project_id)).toEqual([]);
  });
});
