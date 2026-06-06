import {beforeAll, describe, expect, it} from 'vitest';

import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createAction,
  executeAction,
  listPending,
  preflightAction,
  validateAction,
} from '../src/engines/action_engine.ts';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';

/**
 * Cœur produit : le cycle de vie d'une action sensible.
 *
 * Invariant non négociable vérifié ici : aucune action sensible n'est exécutée sans
 * validation humaine explicite. `executeAction` REFUSE tout status ≠ 'approved'
 * (avant validation ET après rejet).
 */

// Utilisateurs de test (le contrat AuthUser est {id, username, role}).
const god: AuthUser = {id: 'g1', username: 'vincent', role: 'godmode'};
const student: AuthUser = {id: 's1', username: 'eleve', role: 'student'};

beforeAll(async () => {
  await seedAll();

  // `actions.user_id` / `validator_id` ont une FK vers `users(id)` :
  // on matérialise les utilisateurs de test en base (le seed crée 'vincent'
  // avec un id auto, pas l'id 'g1' utilisé ici).
  const db = getDb();
  const ts = 1700000000000;
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, email, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, NULL, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(god.id, 'godmode_test', 'Godmode Test', god.role, ts, ts);
  insertUser.run(student.id, 'student_test', 'Student Test', student.role, ts, ts);
});

describe('action lifecycle — action sensible (approve_validation_item)', () => {
  it('draft → pending_validation → approved → completed (chemin nominal)', () => {
    // ── Création : status 'draft', aucun effet.
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    });
    expect(created.status).toBe('draft');
    const id = created.id;

    // ── Preflight : action sensible → 'pending_validation' + validation requise.
    const flighted = preflightAction(god, id);
    expect(flighted.status).toBe('pending_validation');
    expect(flighted.preflight?.requires_validation).toBe(true);

    // ── INVARIANT FORT : exécuter AVANT validation doit lever.
    expect(() => executeAction(god, id)).toThrow();

    // ── L'action figure dans l'inbox de validation.
    const pending = listPending();
    expect(pending.some((a) => a.id === id)).toBe(true);

    // ── Validation humaine explicite → 'approved'.
    const approved = validateAction(god, id, {decision: 'approved'});
    expect(approved.status).toBe('approved');

    // ── Exécution autorisée → 'completed' + résultat ok.
    const completed = executeAction(god, id);
    expect(completed.status).toBe('completed');
    expect(completed.result?.ok).toBe(true);
  });

  it('rejet : une action rejetée ne peut jamais s\'exécuter', () => {
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    });
    const id = created.id;

    const flighted = preflightAction(god, id);
    expect(flighted.status).toBe('pending_validation');

    const rejected = validateAction(god, id, {decision: 'rejected'});
    expect(rejected.status).toBe('rejected');

    // Une action rejetée ne s'exécute pas.
    expect(() => executeAction(god, id)).toThrow();
  });

  it('l\'élève ne peut pas valider une action sensible (rôle insuffisant)', () => {
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    });
    const id = created.id;
    preflightAction(god, id);

    expect(() => validateAction(student, id, {decision: 'approved'})).toThrow();
  });
});
