import {beforeAll, describe, expect, it} from 'vitest';

import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createAction,
  executeAction,
  expireOpenSensitiveActions,
  expireSelectedSensitiveActions,
  getActionFor,
  listPending,
  previewOpenSensitiveActionsExpiry,
  preflightAction,
  validateAction,
} from '../src/engines/action_engine.ts';
import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {activateHardStop, resumeHardStop} from '../src/services/hard_stop.ts';
import {compareActionContextSnapshot, getActionContextSnapshot} from '../src/services/action_context_snapshots.ts';

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
const otherGod: AuthUser = {id: 'g2', username: 'autre-godmode', role: 'godmode'};

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
  insertUser.run(otherGod.id, 'other_godmode_test', 'Other Godmode Test', otherGod.role, ts, ts);
  getDb().prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES ('hard-stop-room', 'Hard Stop Room', 'home', ?, NULL, NULL, 0, ?, ?)`,
  ).run(god.id, ts, ts);
  getDb().prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES ('context-snapshot-room', 'Context Snapshot Room', 'home', ?, NULL, NULL, 0, ?, ?)`,
  ).run(god.id, ts, ts);
  getDb().prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES ('hard-stop-shared-room', 'Hard Stop Shared Room', 'home', ?, NULL, NULL, 1, ?, ?)`,
  ).run(god.id, ts, ts);
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
      registry_id: 'import_factory_backflow',
      intent: 'import_factory_backflow',
      object_type: 'backflow',
      payload: {},
    });
    const flighted = preflightAction(god, created.id);
    expect(flighted.status).toBe('failed');
    expect(flighted.error).toBe('action_not_live:out_of_scope');
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
    expect(flighted.preflight?.explanation).toMatchObject({
      affected_resources: ['object:validation_item'],
      payload_disclosed: false,
    });
    expect(flighted.preflight?.explanation?.decision_options).toEqual([
      {id: 'approve', availability: 'available', reason: null},
      {
        id: 'modify',
        availability: 'future',
        reason: 'La modification directe d’une Action n’est pas encore implémentée.',
      },
      {id: 'reject', availability: 'available', reason: null},
    ]);
    expect(flighted.preflight?.explanation?.effect_preview.after).toContain('validation humaine');

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
    expect(preview.candidates).toContainEqual(expect.objectContaining({
      id: created.id,
      intent: 'approve',
      status: 'pending_validation',
    }));
    expect(preview.audit_trace).toEqual(expect.arrayContaining(['read_only', 'no_status_change']));
    expect(getActionFor(god, created.id)?.status).toBe('pending_validation');
  });

  it('gèle uniquement la sélection explicite et laisse les autres candidates ouvertes', () => {
    const first = createAction(god, {
      registry_id: 'approve_validation_item', intent: 'approve', object_type: 'validation_item', payload: {},
    });
    const second = createAction(god, {
      registry_id: 'approve_validation_item', intent: 'approve', object_type: 'validation_item', payload: {},
    });
    preflightAction(god, first.id);
    preflightAction(god, second.id);

    const result = expireSelectedSensitiveActions(god, {
      scope: 'mine', reason: 'hard_stop', action_ids: [first.id],
    });
    expect(result.expired_action_ids).toEqual([first.id]);
    expect(result.audit_trace).toContain('explicit_selection_only');
    expect(getActionFor(god, first.id)?.status).toBe('stale');
    expect(getActionFor(god, second.id)?.status).toBe('pending_validation');
  });

  it('refuse atomiquement une sélection contenant une action inaccessible', () => {
    const owned = createAction(god, {
      registry_id: 'approve_validation_item', intent: 'approve', object_type: 'validation_item', payload: {},
    });
    const inaccessible = createAction(otherGod, {
      registry_id: 'approve_validation_item', intent: 'approve', object_type: 'validation_item', payload: {},
    });
    preflightAction(god, owned.id);
    preflightAction(otherGod, inaccessible.id);

    expect(() => expireSelectedSensitiveActions(god, {
      scope: 'mine', reason: 'hard_stop', action_ids: [owned.id, inaccessible.id],
    })).toThrow(/selected_actions_not_eligible/);
    expect(getActionFor(god, owned.id)?.status).toBe('pending_validation');
    expect(getActionFor(otherGod, inaccessible.id)?.status).toBe('pending_validation');
  });

  it('refuse atomiquement une action low-risk sélectionnée et ne crée aucun job', () => {
    const sensitive = createAction(god, {
      registry_id: 'approve_validation_item', intent: 'approve', object_type: 'validation_item', payload: {},
    });
    const lowRisk = createAction(god, {
      registry_id: 'get_current_context', intent: 'get_current_context', object_type: 'context', payload: {},
    });
    preflightAction(god, sensitive.id);
    preflightAction(god, lowRisk.id);
    const jobsBefore = (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count;

    expect(() => expireSelectedSensitiveActions(god, {
      scope: 'mine', reason: 'hard_stop', action_ids: [sensitive.id, lowRisk.id],
    })).toThrow(/selected_actions_not_eligible/);
    expect(getActionFor(god, sensitive.id)?.status).toBe('pending_validation');
    expect(getActionFor(god, lowRisk.id)?.status).toBe('approved');
    const jobsAfter = (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count;
    expect(jobsAfter).toBe(jobsBefore);
  });

  it('bloque les nouveaux preflights sensibles dans la Room jusqu’à reprise explicite', () => {
    const active = activateHardStop(god, {room_id: 'hard-stop-room', reason: 'hard_stop'});
    expect(active.status).toBe('active');

    const sensitive = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      room_id: 'hard-stop-room',
      payload: {},
    });
    const blocked = preflightAction(god, sensitive.id);
    expect(blocked.status).toBe('failed');
    expect(blocked.error).toBe('hard_stop_active');
    expect(blocked.preflight?.context_locks).toContain('hard_stop:hard-stop-room');

    const lowRisk = createAction(god, {
      registry_id: 'get_current_context',
      intent: 'get_current_context',
      object_type: 'context',
      room_id: 'hard-stop-room',
      payload: {},
    });
    expect(preflightAction(god, lowRisk.id).status).toBe('approved');

    expect(resumeHardStop(god, {room_id: 'hard-stop-room'}).status).toBe('released');
    const afterResume = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      room_id: 'hard-stop-room',
      payload: {},
    });
    expect(preflightAction(god, afterResume.id).status).toBe('pending_validation');
    expect(getActionFor(god, sensitive.id)?.status).toBe('failed');
  });

  it('ne propage jamais le stop d’un owner à un autre dans la même Room', () => {
    activateHardStop(god, {room_id: 'hard-stop-shared-room', reason: 'hard_stop'});
    const otherOwnerAction = createAction(otherGod, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      room_id: 'hard-stop-shared-room',
      payload: {},
    });
    expect(preflightAction(otherGod, otherOwnerAction.id).status).toBe('pending_validation');
    resumeHardStop(god, {room_id: 'hard-stop-shared-room'});
  });

  it('capture un snapshot privé puis compare le contexte sans modifier l’action', () => {
    const created = createAction(god, {
      registry_id: 'approve_validation_item',
      intent: 'approve',
      object_type: 'validation_item',
      room_id: 'context-snapshot-room',
      payload: {source_ref: 'validated-source'},
    });
    expect(preflightAction(god, created.id).status).toBe('pending_validation');
    const snapshot = getActionContextSnapshot(created.id);
    expect(snapshot).toMatchObject({action_id: created.id, room_id: 'context-snapshot-room'});
    expect(snapshot?.authoritative_refs.length).toBeGreaterThan(0);

    expect(compareActionContextSnapshot(god, getActionFor(god, created.id)!).comparison).toBe('unchanged');
    getDb().prepare('UPDATE rooms SET updated_at = updated_at + 1 WHERE id = ?').run('context-snapshot-room');
    const comparison = compareActionContextSnapshot(god, getActionFor(god, created.id)!);
    expect(comparison).toMatchObject({comparison: 'requires_review', mutation: false});
    expect(comparison.changed_refs).toContain('room:context-snapshot-room');
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
