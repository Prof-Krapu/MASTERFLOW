import {beforeAll, describe, expect, it} from 'vitest';

import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createAction,
  executeAction,
  preflightAction,
  validateAction,
} from '../src/engines/action_engine.ts';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';

/**
 * PR-2 — Écriture `global_settings` via action sensible (`set_global_setting`).
 *
 * Invariants couverts :
 *  - cycle draft → pending_validation → admin-approve → completed avec UPSERT réel ;
 *  - execute avant validation → throw (invariant cycle de vie) ;
 *  - teacher ne peut pas valider (validator_role = 'admin') ;
 *  - défense en profondeur : même si approuvée, execute par non-admin → failed ;
 *  - clé hors allowlist → failed (rejet exécuteur).
 */

const god: AuthUser = {id: 'g2', username: 'vincent', role: 'godmode'};
const admin: AuthUser = {id: 'a2', username: 'admin_test', role: 'admin'};
const teacher: AuthUser = {id: 't2', username: 'teacher_test', role: 'teacher'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const ts = 1700000001000;
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(god.id, 'godmode_pr2', 'Godmode PR2', god.role, ts, ts);
  insertUser.run(admin.id, 'admin_pr2', 'Admin PR2', admin.role, ts, ts);
  insertUser.run(teacher.id, 'teacher_pr2', 'Teacher PR2', teacher.role, ts, ts);
});

describe('set_global_setting — cycle de vie & invariants', () => {
  it('draft → pending_validation (action sensible, validator_role = admin)', () => {
    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {app: 'llm', key: 'model', value: 'gpt-4o'},
    });
    expect(created.status).toBe('draft');

    const flighted = preflightAction(god, created.id);
    expect(flighted.status).toBe('pending_validation');
    expect(flighted.preflight?.requires_validation).toBe(true);
    expect(flighted.preflight?.validator_role).toBe('admin');
  });

  it('execute avant validation → throw (invariant cycle)', () => {
    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {app: 'llm', key: 'model', value: 'test'},
    });
    preflightAction(god, created.id);
    expect(() => executeAction(god, created.id)).toThrow();
  });

  it('validation par teacher → throw (rôle insuffisant pour set_global_setting)', () => {
    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {app: 'llm', key: 'model', value: 'test'},
    });
    preflightAction(god, created.id);
    expect(() => validateAction(teacher, created.id, {decision: 'approved'})).toThrow();
  });

  it('admin valide + execute → completed + global_settings upsertée + diff dans result', () => {
    const app = 'llm';
    const key = 'model';
    const value = 'gpt-4o-mini';

    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {app, key, value},
    });
    preflightAction(god, created.id);

    const approved = validateAction(admin, created.id, {decision: 'approved'});
    expect(approved.status).toBe('approved');

    const completed = executeAction(admin, created.id);
    expect(completed.status).toBe('completed');
    expect(completed.result?.app).toBe(app);
    expect(completed.result?.key).toBe(key);
    expect(completed.result?.new).toBe(value);

    const row = getDb()
      .prepare('SELECT value_json FROM global_settings WHERE app = ? AND key = ?')
      .get(app, key) as {value_json: string} | undefined;
    expect(row).toBeDefined();
    expect(JSON.parse(row!.value_json)).toBe(value);
  });

  it('execute par teacher même si approuvé → failed (défense en profondeur)', () => {
    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {app: 'llm', key: 'provider', value: 'openai'},
    });
    preflightAction(god, created.id);
    validateAction(admin, created.id, {decision: 'approved'});

    expect(() => executeAction(teacher, created.id)).toThrow(/action_access_denied/);
  });

  it('clé hors allowlist → failed (rejet exécuteur)', () => {
    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {app: 'secret', key: 'api_key', value: 'sk-xxx'},
    });
    preflightAction(god, created.id);
    validateAction(admin, created.id, {decision: 'approved'});

    const result = executeAction(admin, created.id);
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/allowlist/);
  });
});
