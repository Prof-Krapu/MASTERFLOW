import {
  AddProjectMemberRequestSchema,
  CreateProjectRequestSchema,
  ProjectMemberSchema,
  ProjectSchema,
  ResourceSchema,
  ROLE_RANK,
  ResourceScopeSchema,
  ScopedPermissionDecisionSchema,
  TransferProjectOwnershipSchema,
  type AddProjectMemberRequest,
  type CreateProjectRequest,
  type Project,
  type ProjectMember,
  type ProjectMemberRole,
  type Resource,
  type ResourceScope,
  type ScopedPermissionDecision,
  type TransferProjectOwnership,
} from '@masterflow/shared';

import {
  getDb,
  type ProjectMemberRow,
  type ProjectRow,
  type ResourceRow,
  type ResourceScopeRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

const PROJECT_ROLE_RANK: Record<ProjectMemberRole, number> = {
  viewer: 0,
  participant: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

function toProject(row: ProjectRow): Project {
  return ProjectSchema.parse({
    project_id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    status: row.status,
    visibility: row.visibility,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toMember(row: ProjectMemberRow): ProjectMember {
  return ProjectMemberSchema.parse({
    project_id: row.project_id,
    user_id: row.user_id,
    role: row.role,
    created_at: row.created_at,
  });
}

function toResourceScope(row: ResourceScopeRow): ResourceScope {
  return ResourceScopeSchema.parse({
    resource_id: row.resource_id,
    scope_type: row.scope_type,
    scope_id: row.scope_id,
    access_level: row.access_level,
    created_at: row.created_at,
  });
}

function isGlobalAdmin(actor: AuthUser): boolean {
  return ROLE_RANK[actor.role] >= ROLE_RANK.admin;
}

function getProjectRow(projectId: string): ProjectRow | undefined {
  return getDb().prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as
    | ProjectRow
    | undefined;
}

function getMemberRow(projectId: string, userId: string): ProjectMemberRow | undefined {
  return getDb()
    .prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(projectId, userId) as ProjectMemberRow | undefined;
}

function getProjectRole(actor: AuthUser, projectId: string): ProjectMemberRole | null {
  if (isGlobalAdmin(actor)) return 'admin';
  return getMemberRow(projectId, actor.id)?.role ?? null;
}

function assertCanReadProject(actor: AuthUser, projectId: string): void {
  if (!getProjectRole(actor, projectId)) throw new Error('project_not_found');
}

function assertCanManageMembers(actor: AuthUser, projectId: string, targetRole: ProjectMemberRole): void {
  const role = getProjectRole(actor, projectId);
  if (!role) throw new Error('project_not_found');
  if (role !== 'owner' && role !== 'admin') throw new Error('project_membership_denied');
  if (targetRole === 'owner' && role !== 'owner' && !isGlobalAdmin(actor)) {
    throw new Error('project_owner_required');
  }
}

export function createProject(actor: AuthUser, input: CreateProjectRequest): Project {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
  const request = CreateProjectRequestSchema.parse(input);
  const now = Date.now();
  const projectId = uuid();
  getDb()
    .prepare(
      `INSERT INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
       VALUES (?, ?, ?, 'active', 'private', ?, ?)`,
    )
    .run(projectId, actor.id, request.name, now, now);
  getDb()
    .prepare(
      `INSERT INTO project_members (project_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)`,
    )
    .run(projectId, actor.id, now);
  audit({
    event_type: 'project.created',
    user_id: actor.id,
    scope: projectId,
    detail: {project_id: projectId, visibility: 'private'},
  });
  return getProject(actor, projectId);
}

export function listProjects(actor: AuthUser): Project[] {
  const rows = isGlobalAdmin(actor)
    ? (getDb().prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as ProjectRow[])
    : (getDb()
        .prepare(
          `SELECT p.* FROM projects p
           INNER JOIN project_members pm ON pm.project_id = p.id
           WHERE pm.user_id = ?
           ORDER BY p.updated_at DESC`,
        )
        .all(actor.id) as ProjectRow[]);
  return rows.map(toProject);
}

export function getProject(actor: AuthUser, projectId: string): Project {
  const row = getProjectRow(projectId);
  if (!row) throw new Error('project_not_found');
  assertCanReadProject(actor, projectId);
  return toProject(row);
}

export function addProjectMember(
  actor: AuthUser,
  projectId: string,
  input: AddProjectMemberRequest,
): ProjectMember {
  const request = AddProjectMemberRequestSchema.parse(input);
  if (!getProjectRow(projectId)) throw new Error('project_not_found');
  if (request.role === 'owner') throw new Error('project_owner_transfer_required');
  assertCanManageMembers(actor, projectId, request.role);

  const user = getDb().prepare('SELECT id FROM users WHERE id = ?').get(request.user_id) as
    | {id: string}
    | undefined;
  if (!user) throw new Error('project_member_user_not_found');

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO project_members (project_id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(project_id, user_id) DO UPDATE SET role = excluded.role`,
    )
    .run(projectId, request.user_id, request.role, now);
  audit({
    event_type: 'project.member_upserted',
    user_id: actor.id,
    scope: projectId,
    detail: {project_id: projectId, member_user_id: request.user_id, role: request.role},
  });
  return getMemberOrThrow(projectId, request.user_id);
}

export function transferProjectOwnership(
  actor: AuthUser,
  input: TransferProjectOwnership,
): Project {
  const request = TransferProjectOwnershipSchema.parse(input);
  const project = getProjectRow(request.project_id);
  if (!project) throw new Error('project_not_found');
  if (project.owner_id !== actor.id && !isGlobalAdmin(actor)) {
    throw new Error('project_owner_required');
  }
  if (project.owner_id === request.new_owner_id) return toProject(project);
  const target = getDb()
    .prepare('SELECT id, active FROM users WHERE id = ?')
    .get(request.new_owner_id) as {id: string; active: number} | undefined;
  if (!target || target.active !== 1) throw new Error('project_member_user_not_found');

  const now = Date.now();
  const db = getDb();
  db.transaction(() => {
    db.prepare('UPDATE projects SET owner_id = ?, updated_at = ? WHERE id = ?').run(
      request.new_owner_id,
      now,
      request.project_id,
    );
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, created_at)
       VALUES (?, ?, 'admin', ?)
       ON CONFLICT(project_id, user_id) DO UPDATE SET role = 'admin'`,
    ).run(request.project_id, project.owner_id, now);
    db.prepare(
      `INSERT INTO project_members (project_id, user_id, role, created_at)
       VALUES (?, ?, 'owner', ?)
       ON CONFLICT(project_id, user_id) DO UPDATE SET role = 'owner'`,
    ).run(request.project_id, request.new_owner_id, now);
  })();
  audit({
    event_type: 'project.ownership_transferred',
    user_id: actor.id,
    scope: request.project_id,
    detail: {
      project_id: request.project_id,
      previous_owner_id: project.owner_id,
      new_owner_id: request.new_owner_id,
      override: actor.id !== project.owner_id,
    },
  });
  return getProject(actor, request.project_id);
}

export function listProjectMembers(actor: AuthUser, projectId: string): ProjectMember[] {
  if (!getProjectRow(projectId)) throw new Error('project_not_found');
  assertCanReadProject(actor, projectId);
  const rows = getDb()
    .prepare('SELECT * FROM project_members WHERE project_id = ? ORDER BY created_at, user_id')
    .all(projectId) as ProjectMemberRow[];
  return rows.map(toMember);
}

export function attachResourceScope(actor: AuthUser, input: ResourceScope): ResourceScope {
  const scope = ResourceScopeSchema.parse(input);
  if (!getProjectRow(scope.scope_id)) throw new Error('project_not_found');
  assertCanManageMembers(actor, scope.scope_id, 'admin');
  const resource = getDb().prepare('SELECT id, status FROM resources WHERE id = ?').get(scope.resource_id) as
    | {id: string; status: string}
    | undefined;
  if (!resource) throw new Error('resource_not_found');
  if (resource.status !== 'validated') throw new Error('resource_not_validated');

  getDb()
    .prepare(
      `INSERT INTO resource_scopes (resource_id, scope_type, scope_id, access_level, created_at)
       VALUES (?, 'project', ?, ?, ?)
       ON CONFLICT(resource_id, scope_type, scope_id)
       DO UPDATE SET access_level = excluded.access_level`,
    )
    .run(scope.resource_id, scope.scope_id, scope.access_level, scope.created_at);
  audit({
    event_type: 'resource.scope_attached',
    user_id: actor.id,
    scope: scope.scope_id,
    detail: {
      resource_id: scope.resource_id,
      scope_type: scope.scope_type,
      access_level: scope.access_level,
    },
  });
  return getResourceScopeOrThrow(scope.resource_id, scope.scope_id);
}

/**
 * Liste les ressources partagées dans un projet (via `resource_scopes`). Lisible par
 * TOUT membre du projet (pas seulement l'owner) — c'est le cœur du multi-utilisateur :
 * l'accès vient de l'appartenance au projet, plus de `owner = teacher`.
 */
export function listProjectResources(actor: AuthUser, projectId: string): Resource[] {
  if (!getProjectRow(projectId)) throw new Error('project_not_found');
  assertCanReadProject(actor, projectId);
  const rows = getDb()
    .prepare(
      `SELECT r.* FROM resources r
         INNER JOIN resource_scopes rs ON rs.resource_id = r.id
        WHERE rs.scope_type = 'project' AND rs.scope_id = ? AND r.status = 'validated'
        ORDER BY r.created_at DESC`,
    )
    .all(projectId) as ResourceRow[];
  return rows.map((row) =>
    ResourceSchema.parse({
      id: row.id,
      type: row.type,
      title: row.title,
      url: row.url,
      source: row.source,
      status: row.status,
      subjects: row.subjects_json ? JSON.parse(row.subjects_json) : null,
    }),
  );
}

export function decideScopedPermission(input: {
  actor: AuthUser;
  projectId?: string | null;
  ownerId?: string | null;
  resourceId?: string | null;
  minimumProjectRole?: ProjectMemberRole;
}): ScopedPermissionDecision {
  const projectRole = input.projectId ? getProjectRole(input.actor, input.projectId) : null;
  const ownerMatch = input.ownerId ? input.ownerId === input.actor.id : false;
  const resourceScopeMatch =
    input.resourceId && input.projectId
      ? getResourceScopeRow(input.resourceId, input.projectId) !== undefined
      : null;

  let allowed = isGlobalAdmin(input.actor) || ownerMatch;
  if (!allowed && input.projectId && input.minimumProjectRole && projectRole) {
    allowed =
      PROJECT_ROLE_RANK[projectRole] >= PROJECT_ROLE_RANK[input.minimumProjectRole];
  } else if (!allowed && input.projectId && !input.minimumProjectRole) {
    allowed = projectRole !== null;
  }
  if (allowed && input.resourceId && input.projectId) {
    allowed = resourceScopeMatch === true;
  }

  return ScopedPermissionDecisionSchema.parse({
    allowed,
    reason: allowed ? 'allowed' : 'scope_denied',
    global_role: input.actor.role,
    project_role: projectRole,
    owner_match: ownerMatch,
    resource_scope_match: resourceScopeMatch,
  });
}

function getMemberOrThrow(projectId: string, userId: string): ProjectMember {
  const row = getMemberRow(projectId, userId);
  if (!row) throw new Error('project_member_not_found');
  return toMember(row);
}

function getResourceScopeRow(resourceId: string, projectId: string): ResourceScopeRow | undefined {
  return getDb()
    .prepare(
      `SELECT * FROM resource_scopes
       WHERE resource_id = ? AND scope_type = 'project' AND scope_id = ?`,
    )
    .get(resourceId, projectId) as ResourceScopeRow | undefined;
}

function getResourceScopeOrThrow(resourceId: string, projectId: string): ResourceScope {
  const row = getResourceScopeRow(resourceId, projectId);
  if (!row) throw new Error('resource_scope_not_found');
  return toResourceScope(row);
}
