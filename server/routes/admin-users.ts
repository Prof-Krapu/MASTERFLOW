import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {Router} from 'express';

import {requireAdmin} from '../auth.ts';
import {getDb, type UserRow} from '../db.ts';
import {currentUser} from '../session.ts';
import {isCorrectorSlug} from '@/lib/apps.ts';

interface UserListItem {
  id: string;
  username: string;
  /** Prénom / pseudo d'inscription ; null pour les comptes antérieurs à la colonne. */
  display_name: string | null;
  role: 'admin' | 'user';
  active: number;
  created_at: number;
  last_login: number | null;
  assigned_app: string | null;
}

interface StatsRow {
  user_id: string;
  app: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  first_ts: number;
  last_ts: number;
}

interface DateStatsRow {
  day: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
}

interface ModelStatsRow {
  model: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
}

interface TaskStatsRow {
  task: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
}

interface UserDetailRow {
  user_id: string;
  app: string;
  model: string;
  task: string;
  ds_ref: string | null;
  ds_title: string | null;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  first_ts: number;
  last_ts: number;
}

/** Agrégat par DS (regroupement user × app × ds_ref) pour la vue « par DS ». */
interface DsStatRow {
  user_id: string;
  app: string;
  ds_ref: string;
  ds_title: string | null;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  first_ts: number;
  last_ts: number;
}

/**
 * Admin-only : liste des users + agrégats token_events + actions de modération
 * (désactiver / réactiver / supprimer). La suppression hard cascade sur
 * user_storage et token_events grâce aux FK `ON DELETE CASCADE` de db.ts.
 */
export function createAdminUsersRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  router.get('/users', (_req, res) => {
    const rows = getDb()
      .prepare<[], UserRow>(
        'SELECT id, username, display_name, role, active, created_at, last_login, assigned_app FROM users ORDER BY created_at DESC',
      )
      .all();
    res.json({users: rows as UserListItem[]});
  });

  // Garde-fou : on ne peut ni se cibler soi-même, ni viser un id inconnu.
  function resolveTarget(targetId: string, me: {userId: string}): UserRow | {error: string} {
    if (!targetId) return {error: 'missing_id'};
    if (targetId === me.userId) return {error: 'cant_target_self'};
    const row = getDb()
      .prepare<[string], UserRow>('SELECT * FROM users WHERE id = ?')
      .get(targetId);
    if (!row) return {error: 'not_found'};
    return row;
  }

  // Désactiver / réactiver.
  router.put('/users/:userId/active', (req, res) => {
    const active = req.body?.active === true ? 1 : 0;
    const target = resolveTarget(req.params.userId, currentUser(req) as {userId: string});
    if ('error' in target) {
      res.status(403).json({error: target.error});
      return;
    }
    const result = getDb()
      .prepare('UPDATE users SET active = ? WHERE id = ?')
      .run(active, target.id);
    res.json({ok: true, updated: result.changes});
  });

  // Réassigner le correcteur d'un compte (l'user ne peut PAS le faire lui-même —
  // le choix à l'inscription est définitif, seule cette route le corrige).
  // body { app: slug } ou { app: null } pour lever la restriction (accès à tout).
  router.put('/users/:userId/app', (req, res) => {
    const app = req.body?.app ?? null;
    if (app !== null && !isCorrectorSlug(app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const target = resolveTarget(req.params.userId, currentUser(req) as {userId: string});
    if ('error' in target) {
      res.status(403).json({error: target.error});
      return;
    }
    const result = getDb()
      .prepare('UPDATE users SET assigned_app = ? WHERE id = ?')
      .run(app, target.id);
    res.json({ok: true, updated: result.changes});
  });

  // Suppression définitive : cascade sur user_storage + token_events.
  // Pour un admin, les références sans cascade (invites.created_by,
  // global_settings.updated_by, news.created_by) sont réattribuées à l'admin
  // qui effectue l'action, dans la même transaction que le DELETE.
  router.delete('/users/:userId', (req, res) => {
    const me = currentUser(req) as {userId: string};
    const target = resolveTarget(req.params.userId, me);
    if ('error' in target) {
      res.status(403).json({error: target.error});
      return;
    }
    // Garde-fou : il doit rester au moins un admin actif APRES la suppression.
    // On exclut la cible du comptage — sinon supprimer un admin *desactive*
    // (qui ne compte pour rien) est refuse des qu'il n'y a qu'un seul admin actif.
    // requireAdmin ne verifie pas `active` : l'appelant lui-meme peut etre inactif,
    // le comptage ne peut donc pas etre remplace par un raccourci.
    if (target.role === 'admin') {
      const admins = getDb()
        .prepare<[string], {n: number}>(
          "SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND active = 1 AND id <> ?",
        )
        .get(target.id);
      if (!admins || admins.n === 0) {
        res.status(403).json({
          error: 'cant_delete_last_admin',
          hint: 'Impossible de supprimer le dernier administrateur actif — créez ou réactivez un autre admin d’abord.',
        });
        return;
      }
    }
    const db = getDb();
    const tx = db.transaction(() => {
      // Inconditionnel : ce sont les 3 SEULES references a users(id) sans ON DELETE
      // CASCADE, et foreign_keys est ON — une seule ligne oubliee fait echouer le
      // DELETE. Les conditionner au role de la cible parie sur le fait qu'un compte
      // non-admin n'en detient jamais ; 3 UPDATE a blanc coutent moins cher que ce pari.
      db.prepare('UPDATE invites SET created_by = ? WHERE created_by = ?').run(me.userId, target.id);
      db.prepare('UPDATE global_settings SET updated_by = ? WHERE updated_by = ?').run(me.userId, target.id);
      db.prepare('UPDATE news SET created_by = ? WHERE created_by = ?').run(me.userId, target.id);
      return db.prepare('DELETE FROM users WHERE id = ?').run(target.id);
    });
    const result = tx();
    res.json({ok: true, deleted: result.changes});
  });

  router.get('/stats', (req, res) => {
    const from = Number(req.query.from);
    const to = Number(req.query.to);
    const whereClauses: string[] = [];
    const params: number[] = [];
    if (Number.isFinite(from)) {
      whereClauses.push('ts >= ?');
      params.push(from);
    }
    if (Number.isFinite(to)) {
      whereClauses.push('ts <= ?');
      params.push(to);
    }
    const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const db = getDb();
    const stats = db
      .prepare<number[], StatsRow>(
        `SELECT user_id,
                 app,
                 COUNT(*) AS events,
                 SUM(prompt_tokens) AS prompt_tokens,
                 SUM(completion_tokens) AS completion_tokens,
                 SUM(pages) AS pages,
                 SUM(cost_eur) AS cost_eur,
                 MIN(ts) AS first_ts,
                 MAX(ts) AS last_ts
          FROM token_events
          ${where}
          GROUP BY user_id, app
          ORDER BY cost_eur DESC`,
      )
      .all(...params);

    const byDate = db
      .prepare<number[], DateStatsRow>(
        `SELECT date(ts/1000, 'unixepoch') AS day,
                 COUNT(*) AS events,
                 SUM(prompt_tokens) AS prompt_tokens,
                 SUM(completion_tokens) AS completion_tokens,
                 SUM(pages) AS pages,
                 SUM(cost_eur) AS cost_eur
          FROM token_events
          ${where}
          GROUP BY day
          ORDER BY day ASC`,
      )
      .all(...params);

    const byModel = db
      .prepare<number[], ModelStatsRow>(
        `SELECT model,
                 COUNT(*) AS events,
                 SUM(prompt_tokens) AS prompt_tokens,
                 SUM(completion_tokens) AS completion_tokens,
                 SUM(pages) AS pages,
                 SUM(cost_eur) AS cost_eur
          FROM token_events
          ${where}
          GROUP BY model
          ORDER BY cost_eur DESC`,
      )
      .all(...params);

    const byTask = db
      .prepare<number[], TaskStatsRow>(
        `SELECT task,
                 COUNT(*) AS events,
                 SUM(prompt_tokens) AS prompt_tokens,
                 SUM(completion_tokens) AS completion_tokens,
                 SUM(pages) AS pages,
                 SUM(cost_eur) AS cost_eur
          FROM token_events
          ${where}
          GROUP BY task
          ORDER BY cost_eur DESC`,
      )
      .all(...params);

    const byUserDetail = db
      .prepare<number[], UserDetailRow>(
        `SELECT user_id,
                 app,
                 model,
                 task,
                 ds_ref,
                 -- Titre du DS : on prend la valeur la plus récente non nulle connue.
                 (SELECT ds_title FROM token_events e2
                   WHERE e2.ds_ref = token_events.ds_ref AND e2.ds_title IS NOT NULL
                   ORDER BY e2.ts DESC LIMIT 1) AS ds_title,
                 COUNT(*) AS events,
                 SUM(prompt_tokens) AS prompt_tokens,
                 SUM(completion_tokens) AS completion_tokens,
                 SUM(pages) AS pages,
                 SUM(cost_eur) AS cost_eur,
                 MIN(ts) AS first_ts,
                 MAX(ts) AS last_ts
          FROM token_events
          ${where}
          GROUP BY user_id, app, model, task, ds_ref
          ORDER BY cost_eur DESC`,
      )
      .all(...params);

    // Vue « par DS » : regroupe par devoir (user × app × ds_ref). Le bucket
    // ds_ref IS NULL (tâches sans DS ou historique antérieur) est exclu pour ne
    // pas noyer les vrais DS ; il reste visible côté byTask/byModel/byUserDetail.
    const byDs = db
      .prepare<number[], DsStatRow>(
        `SELECT user_id,
                 app,
                 COALESCE(ds_ref, '') AS ds_ref,
                 (SELECT ds_title FROM token_events e2
                   WHERE e2.ds_ref = token_events.ds_ref AND e2.ds_title IS NOT NULL
                   ORDER BY e2.ts DESC LIMIT 1) AS ds_title,
                 COUNT(*) AS events,
                 SUM(prompt_tokens) AS prompt_tokens,
                 SUM(completion_tokens) AS completion_tokens,
                 SUM(pages) AS pages,
                 SUM(cost_eur) AS cost_eur,
                 MIN(ts) AS first_ts,
                 MAX(ts) AS last_ts
          FROM token_events
          ${where}
          GROUP BY user_id, app, ds_ref
          HAVING ds_ref IS NOT NULL AND ds_ref <> ''
          ORDER BY cost_eur DESC`,
      )
      .all(...params);

    res.json({stats, byDate, byModel, byTask, byUserDetail, byDs});
  });

  // Reset des données de monitoring — autorisé pour l'admin (y compris en prod).
  // Archive CSV serveur AVANT purge (audit 2026-07-11, P2) : l'action était
  // irréversible derrière un simple confirm, sans aucune copie de sauvegarde.
  router.delete('/stats/reset', (req, res) => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM token_events ORDER BY ts').all() as Record<string, unknown>[];
    let archive: string | null = null;
    const first = rows[0];
    if (first) {
      const dir = resolve(process.cwd(), 'data', 'exports');
      mkdirSync(dir, {recursive: true});
      const cols = Object.keys(first);
      const esc = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
      };
      const csv = [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n');
      archive = resolve(dir, `token_events-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
      writeFileSync(archive, csv, 'utf8');
    }
    db.prepare('DELETE FROM token_events').run();
    res.json({ok: true, deleted: rows.length, archive});
  });

  return router;
}
