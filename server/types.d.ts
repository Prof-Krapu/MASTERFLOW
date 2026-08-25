import type {IronSession} from 'iron-session';
import type {SessionData} from './session.ts';

/** Étend express.Request pour exposer req.session typée. */
declare global {
  namespace Express {
    interface Request {
      session: IronSession<SessionData>;
    }
  }
}

export {};
