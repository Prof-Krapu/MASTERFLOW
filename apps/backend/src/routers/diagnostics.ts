import {Router, type Request, type Response} from 'express';

import {getDb} from '../db/schema.ts';
import {requireRole, requireUser} from '../middleware/auth.ts';

/**
 * Router diagnostic — surfaces de **lecture privées**, gated **admin/godmode**.
 *
 * Invariants produit :
 *  - diagnostic privé par défaut, **jamais teacher/student** (403) ;
 *  - lecture **sans effet** sur le runtime user (aucune écriture, aucune action) ;
 *  - cohérent Q6 « godmode étendu » (surface owner_ops/diagnostic).
 *
 * `requireRole('admin')` couvre admin + godmode (ROLE_RANK : admin=2, godmode=3).
 */

// Colonne/expression de regroupement — whitelist stricte (jamais d'entrée libre en SQL).
const GROUP_COLUMNS = {
  model: 'model',
  task: 'task',
  user: 'user_id',
  day: "strftime('%Y-%m-%d', ts / 1000, 'unixepoch')",
} as const;
type GroupBy = keyof typeof GROUP_COLUMNS;

interface UsageRow {
  group: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_eur: number;
  events: number;
}

/** Parse une borne epoch optionnelle sans accepter de valeur ambiguë ou négative. */
function parseTimestamp(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function createDiagnosticsRouter(): Router {
  const router = Router();
  router.use(requireUser, requireRole('admin'));

  // GET /diagnostics/token-usage?from&to&group_by=model|task|user|day
  router.get('/diagnostics/token-usage', (req: Request, res: Response): void => {
    const groupByRaw = String(req.query.group_by ?? 'model');
    const groupBy: GroupBy = groupByRaw in GROUP_COLUMNS ? (groupByRaw as GroupBy) : 'model';
    const col = GROUP_COLUMNS[groupBy];

    const now = Date.now();
    const fromTs = parseTimestamp(req.query.from, 0);
    const toTs = parseTimestamp(req.query.to, now);
    if (fromTs === null || toTs === null || fromTs > toTs) {
      res.status(400).json({error: 'invalid_time_range'});
      return;
    }

    const rows = getDb()
      .prepare(
        `SELECT ${col} AS "group",
                COALESCE(SUM(prompt_tokens), 0)     AS prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                COALESCE(SUM(cost_eur), 0)          AS cost_eur,
                COUNT(*)                            AS events
           FROM token_events
          WHERE ts BETWEEN ? AND ?
          GROUP BY ${col}
          ORDER BY prompt_tokens DESC`,
      )
      .all(fromTs, toTs) as UsageRow[];

    const normalized = rows.map((r) => ({
      group: r.group ?? '(inconnu)',
      prompt_tokens: r.prompt_tokens,
      completion_tokens: r.completion_tokens,
      cost_eur: r.cost_eur,
      events: r.events,
    }));

    const totals = normalized.reduce(
      (acc, r) => ({
        prompt_tokens: acc.prompt_tokens + r.prompt_tokens,
        completion_tokens: acc.completion_tokens + r.completion_tokens,
        cost_eur: acc.cost_eur + r.cost_eur,
        events: acc.events + r.events,
      }),
      {prompt_tokens: 0, completion_tokens: 0, cost_eur: 0, events: 0},
    );

    res.json({group_by: groupBy, from: fromTs, to: toTs, totals, rows: normalized});
  });

  return router;
}
