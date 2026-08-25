import {getDb} from './db.ts';

/**
 * Logique d'accès « un compte = un correcteur ».
 *
 * Règle : les admins accèdent à tout ; un user dont `assigned_app` est NULL
 * (compte antérieur à la feature) accède à tout ; sinon il n'accède qu'à son
 * correcteur assigné. Utilisée par le reverse proxy /app/* et le storage REST.
 */

/** Décision pure, testable sans DB. */
export function canAccessApp(
  role: 'admin' | 'user' | undefined,
  assignedApp: string | null,
  app: string,
): boolean {
  if (role === 'admin') return true;
  if (assignedApp === null) return true;
  return assignedApp === app;
}

export interface UserAccessRow {
  active: number;
  role: 'admin' | 'user';
  assigned_app: string | null;
}

/**
 * État d'accès frais depuis la DB (et non depuis le cookie de session) : une
 * réassignation ou une désactivation par l'admin prend ainsi effet immédiatement,
 * sans attendre l'expiration de la session.
 */
export function getUserAccess(userId: string): UserAccessRow | null {
  const row = getDb()
    .prepare<[string], UserAccessRow>('SELECT active, role, assigned_app FROM users WHERE id = ?')
    .get(userId);
  return row ?? null;
}
