import {Router, type Request, type Response} from 'express';
import {requireUser, type AuthUser} from '../middleware/auth.ts';
import {assertWeatherAccess, computeWeather} from '../services/weather_engine.ts';

const actor = (request: Request): AuthUser => {
  if (!request.user) throw new Error('unauthorized');
  return request.user;
};

const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'weather_error';
  s.status(m.endsWith('_denied') ? 403 : 400).json({error: m});
};

export function createWeatherRouter(): Router {
  const r = Router();
  r.use(requireUser);

  r.get('/weather/:userId', (q, s) => {
    try {
      const projectScope = typeof q.query.project_scope === 'string' ? q.query.project_scope : undefined;
      const userId = q.params.userId ?? '';
      assertWeatherAccess(actor(q), userId, projectScope);
      s.json(computeWeather(userId, projectScope));
    } catch (e) { fail(s, e); }
  });

  return r;
}
