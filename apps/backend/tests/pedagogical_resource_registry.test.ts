import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  addAcademicLevelAlias,
  adjustPedagogicalClassification,
  listAcademicFrameworks,
  listClassificationReview,
  pedagogicalResourceStats,
  reconcilePedagogicalClassification,
  searchPedagogicalResources,
  syncPedagogicalResourceRegistry,
} from '../src/services/pedagogical_resource_registry.ts';

const teacher: AuthUser = {id: 'ped-resource-teacher', username: 'ped_resource_teacher', role: 'teacher'};
const admin: AuthUser = {id: 'ped-resource-admin', username: 'ped_resource_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO users
      (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, 'x', ?, 1, ?, ?)
  `);
  insert.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insert.run(admin.id, admin.username, admin.username, admin.role, now, now);
});

describe('registre pedagogique BDD', () => {
  it('importe les 49 videos et 20 exemples sans relire les fichiers au runtime de recherche', () => {
    const stats = pedagogicalResourceStats();
    expect(stats.resources).toBe(69);
    expect(stats.notions).toBeGreaterThan(400);

    const secondSync = syncPedagogicalResourceRegistry();
    expect(secondSync.unchanged).toBe(true);
  });

  it('expose un cadre academique dynamique et ses alias', () => {
    const frameworks = listAcademicFrameworks();
    const higherEducation = frameworks.find((framework) => framework.code === 'higher_education_fr');
    expect(higherEducation?.levels.map((level) => level.code)).toEqual(['B1', 'B2', 'B3', 'B4', 'B5']);

    addAcademicLevelAlias(admin, 'higher_education_fr', 'B5', 'cinquieme creation', 'Alias ISCOM explicite');
    const updated = listAcademicFrameworks().find((framework) => framework.code === 'higher_education_fr');
    expect(updated?.levels.find((level) => level.code === 'B5')?.aliases).toContain('cinquieme creation');
  });

  it('retrouve une ressource validee avec notion, timecode et explication', () => {
    const result = searchPedagogicalResources({query: 'storyboard', levelCode: 'B1', limit: 5});
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toMatchObject({status: 'validated'});
    expect(result.results.some((resource) =>
      resource.matched_notions.some((notion) => notion.label.toLowerCase().includes('storyboard') && notion.timestamp_seconds !== null),
    )).toBe(true);
    expect(result.results.every((resource) => resource.why.length > 0)).toBe(true);
  });

  it('garde les exemples legacy candidats hors de la recherche normale', () => {
    expect(searchPedagogicalResources({query: 'Louis Armstrong'}).results).toHaveLength(0);
    const adminResults = searchPedagogicalResources({query: 'Louis Armstrong', includeCandidates: true});
    expect(adminResults.results).toHaveLength(1);
    expect(adminResults.results[0]).toMatchObject({status: 'candidate', validation_state: 'review_needed'});
    expect(adminResults.results[0]?.classification?.effective_level_code).toBe('B5');
  });

  it('preserve la correction prof et signale un classement source devenu different', () => {
    const resourceId = 'ped-resource-classification-isolated-test';
    const now = Date.now();
    getDb().prepare(`
      INSERT OR IGNORE INTO resources (id, type, title, source, status, subjects_json, created_at)
      VALUES (?, 'example_case', 'Classement isolé', 'test', 'candidate', '[]', ?)
    `).run(resourceId, now);
    getDb().prepare(`
      INSERT OR IGNORE INTO pedagogical_resource_profiles
        (resource_id, resource_kind, format, source_ref, source_hash, validation_state, created_at, updated_at)
      VALUES (?, 'example_case', 'video', 'test', 'initial-profile-hash', 'review_needed', ?, ?)
    `).run(resourceId, now, now);
    reconcilePedagogicalClassification(resourceId, '5e', 'initial-classification-hash');
    const overridden = adjustPedagogicalClassification(teacher, resourceId, {
      framework_code: 'higher_education_fr',
      level_code: 'B3',
      reason: 'Exemple reutilise pour les 3e',
      lock: true,
    });
    expect(overridden.effective_level_code).toBe('B3');
    expect(overridden.teacher_locked).toBe(true);

    reconcilePedagogicalClassification(resourceId, '4e', 'changed-source-hash');
    const review = listClassificationReview().find((item) => item.resource_id === resourceId);
    expect(review?.classification).toMatchObject({
      inferred_level_code: 'B4',
      teacher_level_code: 'B3',
      effective_level_code: 'B3',
      teacher_locked: true,
      status: 'needs_review',
    });
  });
});
