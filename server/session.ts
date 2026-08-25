import {getIronSession, type SessionOptions} from 'iron-session';
import type {NextFunction, Request, Response} from 'express';

/**
 * Configuration des sessions iron-session.
 *
 * - Cookies HTTP-only signés + chiffrés. SESSION_SECRET doit faire au moins 32 chars.
 * - SameSite=Lax : suffisant pour notre cas (mêmes origine entre /, /api/*, /app/*).
 * - Secure : true en prod (Tailscale Funnel sert en HTTPS).
 * - 30 jours par défaut.
 */

export interface SessionData {
  userId?: string;
  username?: string;
  role?: 'admin' | 'user';
}

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    "SESSION_SECRET manquant ou trop court (32 chars min). Définir dans .env — voir .env.example.",
  );
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: 'api-manage-session',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  },
};

/** Attache `req.session` à chaque requête. À monter en premier dans le pipeline Express. */
export async function sessionMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    req.session = await getIronSession<SessionData>(req, res, sessionOptions);
    next();
  } catch (e) {
    next(e);
  }
}

/** Renvoie l'utilisateur courant (ou null) en lisant la session sans toucher à la DB. */
export function currentUser(req: Request): SessionData | null {
  const s = req.session;
  if (!s?.userId) return null;
  return {userId: s.userId, username: s.username, role: s.role};
}
