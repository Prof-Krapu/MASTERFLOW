import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createAction,
  executeAction,
  preflightAction,
  validateAction,
} from '../src/engines/action_engine.ts';
import {
  addProjectMember,
  createProject,
  getProject,
  listProjectMembers,
} from '../src/services/projects.ts';

const owner: AuthUser = {id: 'ownership-owner', username: 'ownership_owner', role: 'teacher'};
const nextOwner: AuthUser = {id: 'ownership-next', username: 'ownership_next', role: 'teacher'};
const admin: AuthUser = {id: 'ownership-admin', username: 'ownership_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, nextOwner, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
});

describe('ownership projet — transfert atomique sensible', () => {
  it('interdit une promotion owner par simple upsert', () => {
    const project = createProject(owner, {name: 'Ownership upsert interdit'});
    expect(() =>
      addProjectMember(owner, project.project_id, {
        user_id: nextOwner.id,
        role: 'owner',
      }),
    ).toThrow('project_owner_transfer_required');
  });

  it('transfère via preflight + validation admin et conserve un owner unique', () => {
    const project = createProject(owner, {name: 'Ownership transféré'});
    addProjectMember(owner, project.project_id, {
      user_id: nextOwner.id,
      role: 'editor',
    });
    const created = createAction(owner, {
      registry_id: 'transfer_project_ownership',
      intent: 'transfer_project_ownership',
      object_type: 'project',
      project_id: project.project_id,
      payload: {project_id: project.project_id, new_owner_id: nextOwner.id},
    });
    expect(preflightAction(owner, created.id).status).toBe('pending_validation');
    expect(validateAction(admin, created.id, {decision: 'approved'}).status).toBe('approved');
    expect(executeAction(admin, created.id).status).toBe('completed');

    expect(getProject(admin, project.project_id).owner_id).toBe(nextOwner.id);
    const members = listProjectMembers(admin, project.project_id);
    expect(members.filter((member) => member.role === 'owner')).toEqual([
      expect.objectContaining({user_id: nextOwner.id}),
    ]);
    expect(members).toContainEqual(expect.objectContaining({user_id: owner.id, role: 'admin'}));
  });
});
