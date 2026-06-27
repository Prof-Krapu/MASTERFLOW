import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  getProfile, upsertProfile, updateProfileStatus,
  recordHelpContext, listHelpContext,
} from '../src/services/learning_mirror_engine.ts';

const teacher: AuthUser = {id: 'lm-test-teacher', username: 'lm_test_teacher', role: 'teacher'};
const student: AuthUser = {id: 'lm-test-student', username: 'lm_test_student', role: 'student'};

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
  getDb().prepare('DELETE FROM personal_learning_profiles WHERE user_id IN (?, ?)').run(teacher.id, student.id);
  getDb().prepare('DELETE FROM help_context_snapshots WHERE user_id IN (?, ?)').run(teacher.id, student.id);
});

describe('learning_mirror_engine', () => {
  it('upsertProfile crée un profil et le retourne', () => {
    const profile = upsertProfile(teacher, {
      user_id: student.id,
      help_style: 'guided',
      help_format: 'example',
      help_density: 'detailed',
      preferred_personas: ['masterflex-001'],
      guidance_mode: 'structured',
    });
    expect(profile.user_id).toBe(student.id);
    expect(profile.help_style).toBe('guided');
    expect(profile.guidance_mode).toBe('structured');
    expect(profile.profile_status).toBe('draft');
    expect(profile.preferred_personas).toContain('masterflex-001');
  });

  it('upsertProfile met à jour un profil existant (même user_id + project_id)', () => {
    const p1 = upsertProfile(teacher, {
      user_id: student.id,
      help_style: 'direct',
      guidance_mode: 'auto',
    });
    expect(p1.help_style).toBe('direct');

    const p2 = upsertProfile(teacher, {
      user_id: student.id,
      help_style: 'visual',
      guidance_mode: 'challenge',
    });
    expect(p2.id).toBe(p1.id);
    expect(p2.help_style).toBe('visual');
    expect(p2.guidance_mode).toBe('challenge');
    expect(p2.help_format).toBe(p1.help_format); // conservé du premier
  });

  it('getProfile récupère le dernier profil', () => {
    const profile = getProfile(teacher, student.id);
    expect(profile.user_id).toBe(student.id);
    expect(profile.guidance_mode).toBe('challenge');
  });

  it('getProfile lève pour un utilisateur sans profil', () => {
    expect(() => getProfile(teacher, 'nonexistent')).toThrow('profile_not_found');
  });

  it('updateProfileStatus change le statut', () => {
    const profile = upsertProfile(teacher, {
      user_id: teacher.id,
      guidance_mode: 'discovery',
    });
    const updated = updateProfileStatus(teacher, profile.id, 'user_validated');
    expect(updated.profile_status).toBe('user_validated');

    const teacherValidated = updateProfileStatus(teacher, profile.id, 'teacher_validated');
    expect(teacherValidated.profile_status).toBe('teacher_validated');
  });

  it('recordHelpContext crée un snapshot', () => {
    const snapshot = recordHelpContext(teacher, {
      user_id: student.id,
      detected_need: 'blockage',
      confidence: 0.8,
      recommended_mode: 'structured',
      recommended_persona: 'masterflex-001',
      context: {source: 'exercise', exercise_ref: 'ex-123'},
    });
    expect(snapshot.user_id).toBe(student.id);
    expect(snapshot.detected_need).toBe('blockage');
    expect(snapshot.recommended_mode).toBe('structured');
    expect(snapshot.context).toEqual({source: 'exercise', exercise_ref: 'ex-123'});
  });

  it('recordHelpContext lie au profil existant', () => {
    const snapshot = recordHelpContext(teacher, {
      user_id: student.id,
      detected_need: 'validation',
      confidence: 0.9,
      recommended_mode: 'mentor',
    });
    expect(snapshot.profile_id).not.toBeNull();
  });

  it('listHelpContext retourne les snapshots par userId', () => {
    const snapshots = listHelpContext(teacher, student.id);
    expect(snapshots.length).toBeGreaterThanOrEqual(2);
    expect(snapshots.every((s) => s.user_id === student.id)).toBe(true);
  });
});
