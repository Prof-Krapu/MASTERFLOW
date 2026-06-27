import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  upsertProfile, getProfile, updateProfileStatus, getStyleInstructions,
} from '../src/services/style_mirror_engine.ts';

const teacher: AuthUser = {id: 'sm-test-teacher', username: 'sm_test_teacher', role: 'teacher'};
const student: AuthUser = {id: 'sm-test-student', username: 'sm_test_student', role: 'student'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insert.run(student.id, student.username, student.username, student.role, now, now);
  getDb().prepare('DELETE FROM style_mirror_profiles WHERE user_id IN (?, ?)').run(teacher.id, student.id);
});

describe('style_mirror_engine', () => {
  it('upsertProfile crée un profil et le retourne', () => {
    const profile = upsertProfile(teacher, {
      user_id: student.id,
      register_target: 'casual',
      energy_target: 'high',
      lexical_complexity: 'simple',
      mirror_intensity: 0.7,
      tone_rules: ['Utilise des questions', 'Phrases courtes'],
    });
    expect(profile.user_id).toBe(student.id);
    expect(profile.register_target).toBe('casual');
    expect(profile.energy_target).toBe('high');
    expect(profile.mirror_intensity).toBe(0.7);
    expect(profile.tone_rules).toContain('Utilise des questions');
    expect(profile.profile_status).toBe('draft');
  });

  it('upsertProfile met à jour un profil existant (même user_id + persona_id)', () => {
    const p1 = upsertProfile(teacher, {
      user_id: student.id,
      persona_id: 'masterflex-001',
      register_target: 'formal',
    });
    expect(p1.register_target).toBe('formal');

    const p2 = upsertProfile(teacher, {
      user_id: student.id,
      persona_id: 'masterflex-001',
      register_target: 'playful',
      mirror_intensity: 0.9,
    });
    expect(p2.id).toBe(p1.id);
    expect(p2.register_target).toBe('playful');
    expect(p2.mirror_intensity).toBe(0.9);
    expect(p2.energy_target).toBe(p1.energy_target); // conservé
  });

  it('getProfile récupère le profil spécifique à un persona', () => {
    const profile = getProfile(teacher, student.id, 'masterflex-001');
    expect(profile.register_target).toBe('playful');
  });

  it('getProfile fallback sur le profil général quand persona-specific absent', () => {
    const profile = getProfile(teacher, student.id, 'profkrapu-001');
    expect(profile.register_target).toBe('casual'); // fallback général
  });

  it('getProfile lève pour un utilisateur sans profil', () => {
    expect(() => getProfile(teacher, 'nonexistent', null)).toThrow('profile_not_found');
  });

  it('updateProfileStatus change le statut', () => {
    const profile = upsertProfile(teacher, {
      user_id: teacher.id,
      register_target: 'medium',
    });
    const updated = updateProfileStatus(teacher, profile.id, 'active');
    expect(updated.profile_status).toBe('active');
  });

  it('getStyleInstructions retourne null sans profil actif', () => {
    const result = getStyleInstructions('nonexistent', 'masterflex-001');
    expect(result).toBeNull();
  });

  it('getStyleInstructions génère des instructions depuis un profil actif', () => {
    // Activer le profil général de l'étudiant
    const profile = getProfile(teacher, student.id, null);
    updateProfileStatus(teacher, profile.id, 'active');

    const instructions = getStyleInstructions(student.id, 'masterflex-001');
    expect(instructions).not.toBeNull();
    expect(instructions).toContain('Style adapté');
    expect(instructions).toContain('casual');
    expect(instructions).toContain('Utilise des questions');
  });

  it('getStyleInstructions préfère profil persona-specific au général', () => {
    const specificProfile = getProfile(teacher, student.id, 'masterflex-001');
    updateProfileStatus(teacher, specificProfile.id, 'active');

    const instructionsGeneric = getStyleInstructions(student.id, 'unknown-persona');
    expect(instructionsGeneric).not.toBeNull();
    expect(instructionsGeneric).toContain('casual');

    const instructionsSpecific = getStyleInstructions(student.id, 'masterflex-001');
    expect(instructionsSpecific).not.toBeNull();
    expect(instructionsSpecific).toContain('playful');
  });
});
