import {Router} from 'express';

import {requireAdmin} from '../auth.ts';
import {getDb, type StorageRow, type UserRow} from '../db.ts';
import {currentUser} from '../session.ts';

/**
 * Routes admin **read-only** pour inspecter le `user_storage` d'un invité.
 *
 * Périmètre :
 * - GET /users/:userId/storage/:app              → liste des clés (sans payload)
 * - GET /users/:userId/storage/:app/:key         → valeur parsée d'une clé
 *
 * Monté sous /api/v1/admin dans index.ts, donc URL finales :
 *   /api/v1/admin/users/:userId/storage/:app{,/:key}
 *
 * Garde-fous :
 * - `requireAdmin` (monté sous /api/v1/admin dans index.ts).
 * - ALLOWED_APPS check (pc, fr, nl, es, svt, maths, ses).
 * - Self-target interdit (cohérent avec admin-users.ts:resolveTarget).
 * - Read-only : aucune route PUT/DELETE. L'admin ne modifie pas le
 *   `user_storage` d'un invité depuis cette UI — il faudrait se loguer
 *   en tant que l'invité via une invitation.
 */

const ALLOWED_APPS = new Set(['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg']);

interface StorageKeySummary {
  key: string;
  len: number;
  updated_at: number;
}

/** Vérifie que la cible existe et n'est pas l'admin courant. */
function resolveTarget(req: import('express').Request, res: import('express').Response): UserRow | null {
  const me = currentUser(req)!;
  const targetId = req.params.userId ?? '';
  if (!targetId) {
    res.status(400).json({error: 'missing_userId'});
    return null;
  }
  if (targetId === me.userId) {
    res.status(400).json({error: 'cant_target_self', hint: 'Utilisez les sous-apps pour votre propre compte.'});
    return null;
  }
  const row = getDb()
    .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
    .get(targetId);
  if (!row) {
    res.status(404).json({error: 'user_not_found'});
    return null;
  }
  return row;
}

export function createAdminStorageRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  // GET /users/:userId/storage/:app — liste des clés (key, longueur JSON, updatedAt).
  router.get('/users/:userId/storage/:app', (req, res) => {
    const target = resolveTarget(req, res);
    if (!target) return;
    if (!ALLOWED_APPS.has(req.params.app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const rows = getDb()
      .prepare<[string, string], StorageKeySummary>(
        'SELECT key, length(value_json) AS len, updated_at FROM user_storage WHERE user_id = ? AND app = ? ORDER BY key',
      )
      .all(target.id, req.params.app);
    res.json({
      userId: target.id,
      username: target.username,
      app: req.params.app,
      keys: rows.map((r) => ({key: r.key, len: r.len, updatedAt: r.updated_at})),
    });
  });

  // GET /users/:userId/storage/:app/:key — valeur parsée d'une clé.
  router.get('/users/:userId/storage/:app/:key', (req, res) => {
    const target = resolveTarget(req, res);
    if (!target) return;
    if (!ALLOWED_APPS.has(req.params.app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const r = getDb()
      .prepare<[string, string, string], StorageRow>(
        'SELECT * FROM user_storage WHERE user_id = ? AND app = ? AND key = ?',
      )
      .get(target.id, req.params.app, req.params.key);
    if (!r) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    let value: unknown = null;
    try {
      value = JSON.parse(r.value_json);
    } catch {
      // On renvoie la chaîne brute si le JSON est corrompu plutôt que de planter.
      value = r.value_json;
    }
    res.json({
      userId: target.id,
      username: target.username,
      app: req.params.app,
      key: req.params.key,
      value,
      updatedAt: r.updated_at,
    });
  });

  return router;
}
