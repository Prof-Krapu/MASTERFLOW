import {beforeAll, describe, expect, it} from 'vitest';

import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createAction,
  executeAction,
  expireOpenSensitiveActions,
  getActionFor,
  listPending,
  previewOpenSensitiveActionsExpiry,
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
  it('isole lecture et preflight au propriétaire', () => {
    const created = createAction(god, {
      registry_id: 'set_global_setting',
      intent: 'set_global_setting',
      object_type: 'global_setting',
      payload: {},
    });
    expect(getActionFor(student, created.id)).toBeNull();
    expect(() => preflightAction(student, created.id)).toThrow(/action_access_denied/);
  });

  it('refuse au preflight une action future ou hors scope', () => {
    const created = createAction(god, {
      registry_id: 'compile_da_context',
      intent: 'compile_da_context',
      object_type: 'da_context',
      payload: {},
    });
    const flighted = preflightAction(god, created.id);
    expect(flighted.status).toBe('failed');
    expect(flighted.error).toBe('action_not_live:future');
  });

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
    const pending = listPending(god);
    expect(pending.some((a) => a.id === id)).toBe(true);

    // ── Validation humaine explicite → 'approved'.
    const approved = validateAction(god, id, {decision: 'approved'});
    expect(approved.status).toBe('approved');

    // ── Pas d'exécuteur réel : aucun faux succès.
    const completed = executeAction(god, id);
    expect(completed.status).toBe('failed');
    expect(completed.error).toBe('not_implemented');
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

  it('rend stale une action sensible pending_validation après hard stop sans suppression', () => {
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    });
    const flighted = preflightAction(god, created.id);
    expect(flighted.status).toBe('pending_validation');

    const expired = expireOpenSensitiveActions(god, {
      scope: 'mine',
      reason: 'hard_stop',
      note: 'test hard stop',
    });
    expect(expired.expired_action_ids).toContain(created.id);

    const stale = getActionFor(god, created.id);
    expect(stale?.status).toBe('stale');
    expect(stale?.error).toContain('stale:hard_stop');
    expect(() => validateAction(god, created.id, {decision: 'approved'})).toThrow(/stale/);
    expect(() => executeAction(god, created.id)).toThrow(/stale/);
  });

  it('prévisualise le hard stop sans modifier les actions', () => {
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    });
    preflightAction(god, created.id);

    const preview = previewOpenSensitiveActionsExpiry(god, {
      scope: 'mine',
      reason: 'hard_stop',
    });
    expect(preview.candidate_action_ids).toContain(created.id);
    expect(preview.audit_trace).toEqual(expect.arrayContaining(['read_only', 'no_status_change']));
    expect(getActionFor(god, created.id)?.status).toBe('pending_validation');
  });

  it('rend stale une action approuvée avant exécution si le contexte change', () => {
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      payload: {},
    });
    preflightAction(god, created.id);
    expect(validateAction(god, created.id, {decision: 'approved'}).status).toBe('approved');

    const expired = expireOpenSensitiveActions(god, {scope: 'mine', reason: 'context_changed'});
    expect(expired.expired_action_ids).toContain(created.id);
    expect(getActionFor(god, created.id)?.status).toBe('stale');
    expect(() => executeAction(god, created.id)).toThrow(/stale/);
  });

  it('ne rend pas stale une action low-risk approuvée automatiquement', () => {
    const created = createAction(god, {
      registry_id: 'get_current_context',
      intent: 'get_current_context',
      object_type: 'context',
      payload: {},
    });
    expect(preflightAction(god, created.id).status).toBe('approved');

    const expired = expireOpenSensitiveActions(god, {scope: 'mine', reason: 'context_changed'});
    expect(expired.expired_action_ids).not.toContain(created.id);
    expect(getActionFor(god, created.id)?.status).toBe('approved');
  });
});
