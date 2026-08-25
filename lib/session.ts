import {useEffect, useState} from 'react';

/** Représente l'utilisateur courant, identique au retour de GET /api/v1/auth/me. */
export interface SessionUser {
  id: string;
  username: string;
  role: 'admin' | 'user';
  /** Correcteur rattaché au compte (slug) ; null = pas de restriction (admin, comptes historiques). */
  assignedApp: string | null;
  /** Prénom ou pseudo affiché dans les correcteurs ; null = on retombe sur username. */
  displayName: string | null;
}

export type SessionState =
  | {status: 'loading'}
  | {status: 'anon'}
  | {status: 'logged'; user: SessionUser}
  | {status: 'error'; message: string};

/**
 * Hook simple : interroge /api/v1/auth/me au montage et expose un refresh().
 * Pas de cache global — on tolère deux fetchs au pire (Login redirige vers / qui re-fetch).
 */
export function useSession(): SessionState & {refresh: () => void} {
  const [state, setState] = useState<SessionState>({status: 'loading'});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/auth/me', {credentials: 'include'})
      .then(async (r) => {
        if (cancelled) return;
        if (r.status === 401) return setState({status: 'anon'});
        if (!r.ok) return setState({status: 'error', message: `HTTP ${r.status}`});
        const user = (await r.json()) as SessionUser;
        setState({status: 'logged', user});
      })
      .catch((e) => !cancelled && setState({status: 'error', message: String(e)}));
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {...state, refresh: () => setTick((t) => t + 1)};
}

export async function apiLogin(username: string, password: string): Promise<SessionUser> {
  const r = await fetch('/api/v1/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username, password}),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string};
    throw new Error(body.error ?? `HTTP ${r.status}`);
  }
  return (await r.json()) as SessionUser;
}

export async function apiRegister(
  username: string,
  password: string,
  inviteCode: string,
  app: string,
  displayName?: string,
): Promise<SessionUser> {
  const r = await fetch('/api/v1/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({username, password, inviteCode, app, displayName}),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ? `${body.error}: ${body.hint}` : body.error ?? `HTTP ${r.status}`);
  }
  return (await r.json()) as SessionUser;
}

export async function apiLogout(): Promise<void> {
  await fetch('/api/v1/auth/logout', {method: 'POST', credentials: 'include'});
}
