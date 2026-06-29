import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  upsertProfile, getProfile, updateProfileStatus, getStyleInstructions,
} from '../src/services/style_mirror_engine.ts';

const teacher: AuthUser = {id: 'sm-test-teacher', username: 'sm_test_teacher', role: 'teacher'};
const student: AuthUser = {id: 'sm-test-student', username: 'sm_test_student', role: 'student'};
const projectId = 'sm-test-project';

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
  getDb().prepare('DELETE FROM project_members WHERE project_id = ?').run(projectId);
  getDb().prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  getDb().prepare(
    `INSERT INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES (?, ?, 'Style Mirror Test', 'active', 'private', ?, ?)`,
  ).run(projectId, teacher.id, now, now);
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
      behavior_config: {
        rhythm: 'short',
        warmth: 0.8,
        frankness: 0.6,
        playfulness: 0.4,
        technical_density: 0.3,
      },
      source_refs: ['memory_card:style-sample'],
    });
    expect(profile.user_id).toBe(student.id);
    expect(profile.register_target).toBe('casual');
    expect(profile.energy_target).toBe('high');
    expect(profile.mirror_intensity).toBe(0.7);
    expect(profile.tone_rules).toContain('Utilise des questions');
    expect(profile.behavior_config.rhythm).toBe('short');
    expect(profile.source_refs).toContain('memory_card:style-sample');
    expect(profile.profile_status).toBe('draft');
    expect(profile.consent_status).toBe('pending');
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

  it('updateProfileStatus active seulement par consentement du sujet', () => {
    const profile = upsertProfile(teacher, {
      user_id: teacher.id,
      register_target: 'medium',
    });
    const updated = updateProfileStatus(teacher, profile.id, 'active');
    expect(updated.profile_status).toBe('active');
    expect(updated.consent_status).toBe('granted');
    expect(updated.validated_by).toBe(teacher.id);

    const studentProfile = getProfile(teacher, student.id, null);
    expect(() => updateProfileStatus(teacher, studentProfile.id, 'active')).toThrow('style_mirror_subject_consent_required');
    const consented = updateProfileStatus(student, studentProfile.id, 'active');
    expect(consented.profile_status).toBe('active');
    expect(consented.consent_status).toBe('granted');
    expect(consented.validated_by).toBe(student.id);
  });

  it('getStyleInstructions retourne null sans profil actif', () => {
    const result = getStyleInstructions('nonexistent', 'masterflex-001');
    expect(result).toBeNull();
  });

  it('getStyleInstructions génère des instructions depuis un profil actif', () => {
    // Activer le profil général de l'étudiant
    const profile = getProfile(teacher, student.id, null);
    updateProfileStatus(student, profile.id, 'active');

    const instructions = getStyleInstructions(student.id, 'masterflex-001');
    expect(instructions).not.toBeNull();
    expect(instructions).toContain('Voix stylisée consentie');
    expect(instructions).toContain('casual');
    expect(instructions).toContain('Utilise des questions');
    expect(instructions!.length).toBeLessThanOrEqual(1200);
  });

  it('getStyleInstructions préfère profil persona-specific au général', () => {
    const specificProfile = getProfile(teacher, student.id, 'masterflex-001');
    updateProfileStatus(student, specificProfile.id, 'active');

    const instructionsGeneric = getStyleInstructions(student.id, 'unknown-persona');
    expect(instructionsGeneric).not.toBeNull();
    expect(instructionsGeneric).toContain('casual');

    const instructionsSpecific = getStyleInstructions(student.id, 'masterflex-001');
    expect(instructionsSpecific).not.toBeNull();
    expect(instructionsSpecific).toContain('playful');
  });

  it('getStyleInstructions préfère le profil projet puis coupe après révocation', () => {
    const projectProfile = upsertProfile(teacher, {
      user_id: student.id,
      project_id: projectId,
      persona_id: 'masterflex-001',
      register_target: 'formal',
      energy_target: 'calm',
    });
    updateProfileStatus(student, projectProfile.id, 'active');

    const projectInstructions = getStyleInstructions(student.id, 'masterflex-001', projectId);
    expect(projectInstructions).not.toBeNull();
    expect(projectInstructions).toContain('formal');
    expect(projectInstructions).toContain('calm');

    updateProfileStatus(student, projectProfile.id, 'archived');
    const fallbackInstructions = getStyleInstructions(student.id, 'masterflex-001', projectId);
    expect(fallbackInstructions).not.toBeNull();
    expect(fallbackInstructions).toContain('playful');
    expect(fallbackInstructions).not.toContain('formal');
  });
});
