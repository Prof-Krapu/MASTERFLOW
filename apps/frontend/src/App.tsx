import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {AuthResponse, CurrentContext} from '@masterflow/shared';

import {getCurrentContext, login, setToken} from './api.ts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function App(): ReactElement {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [context, setContext] = useState<CurrentContext | null>(null);
  const [username, setUsername] = useState('vincent');
  const [password, setPassword] = useState('masterflow');
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const isConnected = auth !== null && context !== null;

  const actionSummary = useMemo(() => {
    if (!context) return '0 action';
    const count = context.available_actions.length;
    return count > 1 ? `${count} actions` : `${count} action`;
  }, [context]);

  const loadContext = useCallback(async (token: string): Promise<void> => {
    setState('loading');
    setError(null);
    try {
      const current = await getCurrentContext(token);
      setContext(current);
      setState('ready');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Contexte indisponible.');
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setState('loading');
      setError(null);
      try {
        const nextAuth = await login(username, password);
        setAuth(nextAuth);
        await loadContext(nextAuth.token);
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Connexion impossible.');
      }
    },
    [loadContext, password, username],
  );

  const handleLogout = useCallback((): void => {
    setAuth(null);
    setContext(null);
    setToken(null);
    setState('idle');
    setError(null);
  }, []);

  useEffect(() => {
    document.title = isConnected ? 'MasterFlow - Home Room' : 'MasterFlow - Connexion';
  }, [isConnected]);

  return (
    <main className="shell">
      <section className="topbar" aria-label="Etat MasterFlow">
        <div>
          <p className="eyebrow">MasterFlow</p>
          <h1>Home Room</h1>
        </div>
        <span className={`status status--${state}`}>
          {state === 'ready' ? 'connecte' : state}
        </span>
      </section>

      {!auth ? (
        <form className="panel login" onSubmit={handleSubmit}>
          <label>
            Identifiant
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="text"
              value={username}
            />
          </label>
          <label>
            Mot de passe
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button disabled={state === 'loading'} type="submit">
            {state === 'loading' ? 'Connexion...' : 'Se connecter'}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      ) : (
        <section className="workspace" aria-label="Contexte courant">
          <article className="panel">
            <div className="panel-header">
              <h2>Contexte</h2>
              <button className="secondary" onClick={handleLogout} type="button">
                Deconnexion
              </button>
            </div>
            {context ? (
              <dl className="facts">
                <div>
                  <dt>Utilisateur</dt>
                  <dd>{context.user.display_name} · {context.user.role}</dd>
                </div>
                <div>
                  <dt>Room</dt>
                  <dd>{context.room.name}</dd>
                </div>
                <div>
                  <dt>Surface</dt>
                  <dd>{context.room_instance.active_surface}</dd>
                </div>
                <div>
                  <dt>Actions</dt>
                  <dd>{actionSummary}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">Contexte en attente.</p>
            )}
          </article>

          <article className="panel">
            <h2>Prochaine couche</h2>
            <p className="muted">
              Shell connecte au contrat REST. Les widgets chat, personas, actions et ressources
              arrivent un par un apres validation de cette base.
            </p>
          </article>
        </section>
      )}
    </main>
  );
}

export default App;
