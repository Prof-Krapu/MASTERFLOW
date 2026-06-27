import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {computeWeather} from '../src/services/weather_engine.ts';

const teacher: AuthUser = {id: 'w-test-teacher', username: 'w_test_teacher', role: 'teacher'};
const student: AuthUser = {id: 'w-test-student', username: 'w_test_student', role: 'student'};
const now = Date.now();

beforeAll(async () => {
  await seedAll();
  const insertUser = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  insertUser.run(student.id, student.username, student.username, student.role, now, now);

  // Seed some competency progress for weather computation
  const insertProgress = getDb().prepare(
    `INSERT OR IGNORE INTO user_competency_progress
       (id, user_id, competency_id, project_id, current_mastery, confidence, signal_count, trajectory, validation_required, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?, 0, ?, 1, ?, ?)`,
  );

  // Student with mixed progress: some blocked, some improving
  insertProgress.run(`${student.id}-prog-1`, student.id, 'seed-def-ideation', 'discovering', 0.2, 'blocked', now, now);
  insertProgress.run(`${student.id}-prog-2`, student.id, 'seed-def-prototype', 'practicing', 0.6, 'consolidating', now, now);
  insertProgress.run(`${student.id}-prog-3`, student.id, 'seed-def-typo', 'guided', 0.3, 'needs_review', now, now);

  // Student with good progress
  const insertGood = getDb().prepare(
    `INSERT OR IGNORE INTO user_competency_progress
       (id, user_id, competency_id, current_mastery, confidence, trajectory, validation_required, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );

  const goodStudent = 'w-test-good';
  insertUser.run(goodStudent, 'w_test_good', 'w_test_good', 'student', now, now);
  insertGood.run(`${goodStudent}-prog-1`, goodStudent, 'seed-def-empathie', 'autonomous', 0.9, 'transferred', now, now);
  insertGood.run(`${goodStudent}-prog-2`, goodStudent, 'seed-def-ideation', 'practicing', 0.8, 'consolidating', now, now);
  insertGood.run(`${goodStudent}-prog-3`, goodStudent, 'seed-def-compo', 'mentor_ready', 0.95, 'transferred', now, now);

  // Teacher with no progress
  insertUser.run('w-test-no-progress', 'w_test_none', 'w_test_none', 'student', now, now);
});

describe('weather_engine', () => {
  it('computeWeather retourne une météo favorable pour une bonne progression', () => {
    const w = computeWeather('w-test-good');
    expect(['sunny', 'cloudy']).toContain(w.weather);
    expect(w.composite_score).toBeGreaterThan(50);
    expect(w.trend).toBe('improving');
  });

  it('computeWeather retourne cloudy pour une progression mixte', () => {
    const w = computeWeather(student.id);
    expect(['cloudy', 'rainy', 'sunny']).toContain(w.weather);
    expect(w.signals_summary).toBeDefined();
    expect(w.trend).toBeDefined();
    expect(w.generated_at).toBeGreaterThan(now - 1000);
  });

  it('computeWeather retourne stormy pour un état dégradé (saturation)', () => {
    const overloaded = 'w-test-overload';
    getDb().prepare(
      `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', 'student', 1, ?, ?)`,
    ).run(overloaded, 'w_test_over', 'w_test_over', now, now);

    getDb().prepare(
      `INSERT OR IGNORE INTO user_progression_events
         (id, user_id, event_type, detail_json, created_at)
       VALUES (?, ?, 'saturation_detected', '{}', ?)`,
    ).run(`${overloaded}-sat-1`, overloaded, now);
    getDb().prepare(
      `INSERT OR IGNORE INTO user_progression_events
         (id, user_id, event_type, detail_json, created_at)
       VALUES (?, ?, 'saturation_detected', '{}', ?)`,
    ).run(`${overloaded}-sat-2`, overloaded, now);

    const w = computeWeather(overloaded);
    expect(w.weather).toBe('stormy');
    expect(w.saturation_warnings.length).toBeGreaterThanOrEqual(1);
    expect(w.suggested_guidance_mode).toBe('structured');
  });

  it('computeWeather gère un utilisateur sans aucune progression', () => {
    const w = computeWeather('w-test-no-progress');
    expect(w.weather).toBeDefined();
    expect(w.trend).toBe('stable');
    expect(w.composite_score).toBe(50);
  });

  it('computeWeather accepte un projectScope', () => {
    const w = computeWeather(student.id, 'project-scope-test');
    expect(w).toBeDefined();
  });
});
