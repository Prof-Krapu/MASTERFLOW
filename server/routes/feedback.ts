import {Router} from 'express';

import {requireUser} from '../auth.ts';
import {getDb} from '../db.ts';
import {currentUser} from '../session.ts';

const ALLOWED_APPS = new Set(['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg']);
const ALLOWED_KINDS = new Set(['error', 'feedback']);

/** Tronque une chaîne libre pour éviter qu'un message géant ne gonfle la DB. */
function clampStr(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.length > max ? s.slice(0, max) : s;
}

/**
 * Endpoint d'ingestion des tickets de feedback / d'erreur, poussés en fire-and-forget
 * par les sous-apps en mode "managed" — voir pushFeedbackTicket dans lib/tauri.ts.
 * Toléré pour user comme admin (un invité non-admin doit pouvoir signaler).
 *
 * Deux `kind` :
 *  - 'error'    : auto-signalé quand le pipeline échoue et s'arrête (502/429/troncature/clé invalide…).
 *  - 'feedback' : retour explicite de l'utilisateur sur une correction insatisfaisante.
 */
export function createFeedbackRouter(): Router {
  const router = Router();
  router.use(requireUser);

  router.post('/', (req, res) => {
    const u = currentUser(req)!;
    const b = req.body ?? {};

    const app = String(b.app ?? '');
    if (!ALLOWED_APPS.has(app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const kind = String(b.kind ?? '');
    if (!ALLOWED_KINDS.has(kind)) {
      res.status(400).json({error: 'invalid_kind'});
      return;
    }

    const ts = Number.isFinite(Number(b.ts)) ? Number(b.ts) : Date.now();
    const statusCodeRaw = Number(b.statusCode);
    const statusCode = Number.isFinite(statusCodeRaw) && statusCodeRaw > 0 ? statusCodeRaw : null;

    let contextJson: string | null = null;
    if (b.context && typeof b.context === 'object') {
      try {
        const s = JSON.stringify(b.context);
        contextJson = s.length > 4000 ? null : s;
      } catch {
        contextJson = null;
      }
    }

    getDb()
      .prepare(
        `INSERT INTO feedback_tickets
           (user_id, app, kind, ts, matiere, ds_titre, niveau, step, model, status_code, satisfaction, category, message, context_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        u.userId!,
        app,
        kind,
        ts,
        clampStr(b.matiere, 120),
        clampStr(b.dsTitre, 300),
        clampStr(b.niveau, 80),
        clampStr(b.step, 60),
        clampStr(b.model, 120),
        statusCode,
        clampStr(b.satisfaction, 20),
        clampStr(b.category, 40),
        clampStr(b.message, 4000),
        contextJson,
      );

    res.json({ok: true});
  });

  return router;
}
