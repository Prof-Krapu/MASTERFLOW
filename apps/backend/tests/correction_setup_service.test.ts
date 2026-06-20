import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createInstitutionalGradingProfile,
  createRubricTemplate,
  createRubricVersion,
  listInstitutionalGradingProfiles,
  listRubricTemplates,
  listRubricVersions,
  validateInstitutionalGradingProfile,
  validateRubricVersion,
} from '../src/services/correction_setup.ts';

const teacher: AuthUser = {id: 'setup-teacher', username: 'setup_teacher', role: 'teacher'};
const outsider: AuthUser = {id: 'setup-outsider', username: 'setup_outsider', role: 'godmode'};

const criteria = [
  {
    criterion_id: 'analysis',
    label: 'Analyse',
    description: 'Qualité de l’analyse',
    weight: 0.5,
    max_points: 10,
    evidence_requirements: ['submission'],
    required: true,
  },
  {
    criterion_id: 'presentation',
    label: 'Présentation',
    description: 'Clarté du rendu',
    weight: 0.5,
    max_points: 10,
    evidence_requirements: [],
    required: true,
  },
];

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
});

describe('configuration correction versionnée R1', () => {
  it('crée un barème privé brouillon puis fige des versions validées sans écraser l’historique', () => {
    const created = createRubricTemplate(teacher, {
      title: 'Débrief oral',
      subject_ref: 'subject://debrief/v1',
      criteria,
      total_points: 20,
    });
    expect(created.template.status).toBe('draft');
    expect(created.version).toMatchObject({version: 1, status: 'draft'});
    expect(listRubricTemplates(teacher)).toContainEqual(
      expect.objectContaining({template_id: created.template.template_id}),
    );
    expect(listRubricTemplates(outsider)).not.toContainEqual(
      expect.objectContaining({template_id: created.template.template_id}),
    );

    const validatedV1 = validateRubricVersion(teacher, created.version.version_id);
    expect(validatedV1.status).toBe('validated');
    const v2 = createRubricVersion(teacher, created.template.template_id, {criteria, total_points: 20});
    expect(v2).toMatchObject({version: 2, status: 'draft'});
    const validatedV2 = validateRubricVersion(teacher, v2.version_id);
    expect(validatedV2.status).toBe('validated');
    expect(listRubricVersions(teacher, created.template.template_id)).toEqual([
      expect.objectContaining({version: 2, status: 'validated'}),
      expect.objectContaining({version: 1, status: 'validated'}),
    ]);
  });

  it('refuse un barème dont les totaux ne correspondent pas', () => {
    expect(() => createRubricTemplate(teacher, {
      title: 'Invalide',
      criteria,
      total_points: 19,
    })).toThrow('Le total doit correspondre aux critères.');
  });

  it('versionne et valide un profil de notation privé sans ouvrir la correction automatique', () => {
    const profile = createInstitutionalGradingProfile(teacher, {
      scale: [0, 20],
      expected_cohort_band: [10, 15],
      anchors: {
        insufficient: [0, 9],
        minimum_met: [10, 11],
        expected: [12, 15],
        strong: [16, 17],
        exceptional: [18, 20],
      },
      max_global_delta: 1,
      protected_thresholds: [10, 16],
    });
    expect(profile).toMatchObject({status: 'draft', calibration_mode: 'diagnostic_then_teacher_validation'});
    expect(profile.version).toBeGreaterThan(0);
    expect(listInstitutionalGradingProfiles(outsider)).not.toContainEqual(
      expect.objectContaining({profile_id: profile.profile_id}),
    );
    expect(validateInstitutionalGradingProfile(teacher, profile.profile_id).status).toBe('validated');
    expect(() => validateInstitutionalGradingProfile(outsider, profile.profile_id)).toThrow('scope_denied');
  });
});
