import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createCohort,
  createRosterVersion,
  getCohort,
  getRosterVersion,
  listRosterVersions,
} from '../src/services/cohorts.ts';

const teacher: AuthUser = {id: 'roster-teacher', username: 'roster_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'roster-outsider', username: 'roster_outsider', role: 'godmode'};
const student: AuthUser = {id: 'roster-student', username: 'roster_student', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insert.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
  insert.run(student.id, student.username, student.username, student.role, now, now);
});

describe('cohortes et rosters versionnés V1', () => {
  it('crée une cohorte privée uniquement pour teacher+', () => {
    expect(() => createCohort(student, {title: 'Interdit'})).toThrow('permission_denied');
    const cohort = createCohort(teacher, {title: '4CREA A', period_ref: '2025-2026'});
    expect(cohort).toMatchObject({
      owner_id: teacher.id,
      title: '4CREA A',
      privacy: 'private',
      status: 'active',
    });
  });

  it('versionne un roster sans réécrire la version précédente', () => {
    const cohort = createCohort(teacher, {title: 'Roster versioning'});
    const v1 = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://teacher/roster-v1',
      members: [
        {display_name: 'Alice Martin', aliases: ['Alice']},
        {display_name: 'Bob Durand', aliases: []},
      ],
    });
    const alice = v1.members.find((member) => member.display_name === 'Alice Martin');
    expect(alice).toBeDefined();

    const v2 = createRosterVersion(teacher, cohort.cohort_id, {
      source_ref: 'manual://teacher/roster-v2',
      members: [
        {
          student_identity_id: alice?.student_identity_id,
          display_name: 'Alice Martin',
          aliases: ['Alice', 'A. Martin'],
        },
        {display_name: 'Chloé Bernard', aliases: []},
      ],
    });

    expect(v2).toMatchObject({version: 2, status: 'active'});
    const history = listRosterVersions(teacher, cohort.cohort_id);
    expect(history.map((version) => [version.version, version.status])).toEqual([
      [2, 'active'],
      [1, 'archived'],
    ]);
    expect(getRosterVersion(teacher, cohort.cohort_id, v1.roster_version_id).members).toEqual(
      v1.members,
    );
  });

  it('ne révèle pas une cohorte owner-private à un autre compte, même godmode', () => {
    const cohort = createCohort(teacher, {title: 'Classe privée'});
    expect(() => getCohort(outsider, cohort.cohort_id)).toThrow('cohort_not_found');
  });

  it('refuse une identité provenant d’un autre scope', () => {
    const first = createCohort(teacher, {title: 'Scope A'});
    const firstRoster = createRosterVersion(teacher, first.cohort_id, {
      source_ref: 'manual://scope-a',
      members: [{display_name: 'Élève A', aliases: []}],
    });
    const foreignIdentity = firstRoster.members[0]?.student_identity_id;
    expect(foreignIdentity).toBeDefined();

    const secondOwner: AuthUser = {id: 'roster-owner-2', username: 'roster_owner_2', role: 'teacher'};
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO users
           (id, username, display_name, password_hash, role, active, created_at, updated_at)
         VALUES (?, ?, ?, 'x', 'teacher', 1, ?, ?)`,
      )
      .run(secondOwner.id, secondOwner.username, secondOwner.username, now, now);
    const second = createCohort(secondOwner, {title: 'Scope B'});
    expect(() =>
      createRosterVersion(secondOwner, second.cohort_id, {
        source_ref: 'manual://scope-b',
        members: [
          {
            student_identity_id: foreignIdentity,
            display_name: 'Élève A',
            aliases: [],
          },
        ],
      }),
    ).toThrow('student_identity_not_found');
  });
});
