import {Router, type Request, type Response} from 'express';
import {PedagogicalSignalSchema} from '@masterflow/shared';
import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {listSignals} from '../services/weather_engine.ts';
import {recordPedagogicalSignal} from '../services/pedagogical_records.ts';

const actor = (r: Request): AuthUser => { if (!r.user) throw new Error('unauthorized'); return r.user; };
const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'pedagogical_signals_error';
  s.status(m.endsWith('_not_found') ? 404 : m.endsWith('_denied') ? 403 : m.endsWith('_mismatch') || m.endsWith('_invalid') ? 400 : 400).json({error: m});
};

export function createPedagogicalSignalsRouter(): Router {
  const r = Router();
  r.use(requireUser);

  r.get('/pedagogical-signals', (q, s) => {
    try {
      const projectScope = typeof q.query.project_scope === 'string' ? q.query.project_scope : undefined;
      if (!projectScope) return void s.status(400).json({error: 'project_scope_required'});
      s.json(listSignals(projectScope));
    } catch (e) { fail(s, e); }
  });

  r.post('/pedagogical-signals', (q, s) => {
    const b = PedagogicalSignalSchema.safeParse(q.body);
    if (!b.success) return void s.status(400).json({error: 'invalid_body', detail: b.error.flatten()});
    try { s.status(201).json(recordPedagogicalSignal(actor(q), b.data)); } catch (e) { fail(s, e); }
  });

  return r;
}
