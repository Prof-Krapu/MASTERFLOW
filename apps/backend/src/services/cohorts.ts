import {
  CohortSchema,
  CreateCohortSchema,
  CreateRosterVersionSchema,
  ROLE_RANK,
  RosterVersionSchema,
  type Cohort,
  type CreateCohort,
  type CreateRosterVersion,
  type RosterMember,
  type RosterVersion,
} from '@masterflow/shared';

import {
  getDb,
  type CohortRow,
  type RosterMemberRow,
  type RosterVersionRow,
  type StudentIdentityRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

function assertTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function canManage(actor: AuthUser, cohort: CohortRow): boolean {
  if (cohort.owner_id === actor.id) return true;
  if (!cohort.project_id) return false;
  return decideScopedPermission({
    actor,
    projectId: cohort.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function cohortRow(id: string): CohortRow | undefined {
  return getDb().prepare('SELECT * FROM cohorts WHERE id = ?').get(id) as CohortRow | undefined;
}

function requireCohort(actor: AuthUser, id: string): CohortRow {
  const row = cohortRow(id);
  if (!row || !canManage(actor, row)) throw new Error('cohort_not_found');
  return row;
}

function toCohort(row: CohortRow): Cohort {
  return CohortSchema.parse({
    cohort_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    title: row.title,
    period_ref: row.period_ref,
    status: row.status,
    privacy: row.privacy,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function membersFor(rosterVersionId: string): RosterMember[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM roster_members
       WHERE roster_version_id = ?
       ORDER BY display_name COLLATE NOCASE, student_identity_id`,
    )
    .all(rosterVersionId) as RosterMemberRow[];
  return rows.map((row) => ({
    student_identity_id: row.student_identity_id,
    display_name: row.display_name,
    aliases: JSON.parse(row.aliases_json) as string[],
  }));
}

function toRosterVersion(row: RosterVersionRow): RosterVersion {
  return RosterVersionSchema.parse({
    roster_version_id: row.id,
    cohort_id: row.cohort_id,
    owner_id: row.owner_id,
    version: row.version,
    source_ref: row.source_ref,
    status: row.status,
    members: membersFor(row.id),
    created_by: row.created_by,
    created_at: row.created_at,
    activated_at: row.activated_at,
  });
}

export function createCohort(actor: AuthUser, input: CreateCohort): Cohort {
  assertTeacher(actor);
  const request = CreateCohortSchema.parse(input);
  if (
    request.project_id &&
    !decideScopedPermission({
      actor,
      projectId: request.project_id,
      minimumProjectRole: 'editor',
    }).allowed
  ) {
    throw new Error('project_not_found');
  }
  const now = Date.now();
  const id = uuid();
  getDb()
    .prepare(
      `INSERT INTO cohorts
         (id, owner_id, project_id, title, period_ref, status, privacy, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', 'private', ?, ?)`,
    )
    .run(
      id,
      actor.id,
      request.project_id ?? null,
      request.title,
      request.period_ref ?? null,
      now,
      now,
    );
  audit({
    event_type: 'cohort.created',
    user_id: actor.id,
    scope: request.project_id ?? actor.id,
    detail: {cohort_id: id, project_id: request.project_id ?? null, privacy: 'private'},
  });
  return getCohort(actor, id);
}

export function getCohort(actor: AuthUser, id: string): Cohort {
  assertTeacher(actor);
  return toCohort(requireCohort(actor, id));
}

function resolveIdentity(
  cohort: CohortRow,
  member: CreateRosterVersion['members'][number],
  now: number,
): StudentIdentityRow {
  if (member.student_identity_id) {
    const existing = getDb()
      .prepare('SELECT * FROM student_identities WHERE id = ?')
      .get(member.student_identity_id) as StudentIdentityRow | undefined;
    if (
      !existing ||
      existing.status !== 'active' ||
      existing.owner_id !== cohort.owner_id ||
      existing.project_id !== cohort.project_id
    ) {
      throw new Error('student_identity_not_found');
    }
    return existing;
  }

  const identity: StudentIdentityRow = {
    id: uuid(),
    owner_id: cohort.owner_id,
    project_id: cohort.project_id,
    display_name: member.display_name,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
  getDb()
    .prepare(
      `INSERT INTO student_identities
         (id, owner_id, project_id, display_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    )
    .run(
      identity.id,
      identity.owner_id,
      identity.project_id,
      identity.display_name,
      now,
      now,
    );
  return identity;
}

export function createRosterVersion(
  actor: AuthUser,
  cohortId: string,
  input: CreateRosterVersion,
): RosterVersion {
  assertTeacher(actor);
  const cohort = requireCohort(actor, cohortId);
  const request = CreateRosterVersionSchema.parse(input);
  const now = Date.now();
  const rosterVersionId = uuid();

  const transaction = getDb().transaction(() => {
    const current = getDb()
      .prepare('SELECT COALESCE(MAX(version), 0) AS version FROM roster_versions WHERE cohort_id = ?')
      .get(cohortId) as {version: number};
    const version = current.version + 1;
    getDb()
      .prepare("UPDATE roster_versions SET status = 'archived' WHERE cohort_id = ? AND status = 'active'")
      .run(cohortId);
    getDb()
      .prepare(
        `INSERT INTO roster_versions
           (id, cohort_id, owner_id, version, source_ref, status, created_by, created_at, activated_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
      )
      .run(
        rosterVersionId,
        cohortId,
        cohort.owner_id,
        version,
        request.source_ref,
        actor.id,
        now,
        now,
      );

    const usedIdentityIds = new Set<string>();
    const insertMember = getDb().prepare(
      `INSERT INTO roster_members
         (roster_version_id, student_identity_id, display_name, aliases_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    for (const member of request.members) {
      const identity = resolveIdentity(cohort, member, now);
      if (usedIdentityIds.has(identity.id)) throw new Error('duplicate_student_identity');
      usedIdentityIds.add(identity.id);
      insertMember.run(
        rosterVersionId,
        identity.id,
        member.display_name,
        JSON.stringify(member.aliases),
        now,
      );
    }
    getDb().prepare('UPDATE cohorts SET updated_at = ? WHERE id = ?').run(now, cohortId);
  });

  transaction();
  audit({
    event_type: 'roster.version_created',
    user_id: actor.id,
    scope: cohort.project_id ?? cohort.owner_id,
    detail: {
      cohort_id: cohortId,
      roster_version_id: rosterVersionId,
      member_count: request.members.length,
      source_ref: request.source_ref,
    },
  });
  return getRosterVersion(actor, cohortId, rosterVersionId);
}

export function getRosterVersion(
  actor: AuthUser,
  cohortId: string,
  rosterVersionId: string,
): RosterVersion {
  assertTeacher(actor);
  requireCohort(actor, cohortId);
  const row = getDb()
    .prepare('SELECT * FROM roster_versions WHERE id = ? AND cohort_id = ?')
    .get(rosterVersionId, cohortId) as RosterVersionRow | undefined;
  if (!row) throw new Error('roster_version_not_found');
  return toRosterVersion(row);
}

export function listRosterVersions(actor: AuthUser, cohortId: string): RosterVersion[] {
  assertTeacher(actor);
  requireCohort(actor, cohortId);
  const rows = getDb()
    .prepare('SELECT * FROM roster_versions WHERE cohort_id = ? ORDER BY version DESC')
    .all(cohortId) as RosterVersionRow[];
  return rows.map(toRosterVersion);
}
