import {Router, type Request, type Response} from 'express';
import {requireUser} from '../middleware/auth.ts';
import {computeWeather} from '../services/weather_engine.ts';

const fail = (s: Response, e: unknown): void => {
  const m = e instanceof Error ? e.message : 'weather_error';
  s.status(400).json({error: m});
};

export function createWeatherRouter(): Router {
  const r = Router();
  r.use(requireUser);

  r.get('/weather/:userId', (q, s) => {
    try {
      const projectScope = typeof q.query.project_scope === 'string' ? q.query.project_scope : undefined;
      s.json(computeWeather(q.params.userId ?? '', projectScope));
    } catch (e) { fail(s, e); }
  });

  return r;
}
