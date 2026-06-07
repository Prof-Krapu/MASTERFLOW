import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {ActionRegistryEntry, AuthResponse, CurrentContext, Persona, RegistryStatus} from '@masterflow/shared';

import {getAvailableActions, getCurrentContext, getPersonas, login, setToken} from './api.ts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type ActionBuckets = Record<RegistryStatus, ActionRegistryEntry[]>;

const STATUS_LABEL: Record<RegistryStatus, string> = {
  live: 'live',
  future: 'a venir',
  out_of_scope: 'masque',
};

function bucketActions(actions: ActionRegistryEntry[]): ActionBuckets {
  return actions.reduce<ActionBuckets>(
    (acc, action) => {
      acc[action.status].push(action);
      return acc;
    },
    {live: [], future: [], out_of_scope: []},
  );
}

function App(): ReactElement {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [context, setContext] = useState<CurrentContext | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [actions, setActions] = useState<ActionRegistryEntry[]>([]);
  const [username, setUsername] = useState('vincent');
  const [password, setPassword] = useState('masterflow');
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);

  const isConnected = auth !== null && context !== null;

  const actionSummary = useMemo(() => {
    const count = actions.length;
    return count > 1 ? `${count} actions` : `${count} action`;
  }, [actions.length]);

  const visiblePersonas = personas.length > 0 ? personas : (context?.personas ?? []);
  const visibleActions = actions.length > 0 ? actions : (context?.available_actions ?? []);

  const actionBuckets = useMemo(() => bucketActions(visibleActions), [visibleActions]);

  const activePersonaId = context?.active_blend?.speaker_persona_id ?? null;

  const activePersona = useMemo(() => {
    if (!activePersonaId) return null;
    return visiblePersonas.find((persona) => persona.id === activePersonaId) ?? null;
  }, [activePersonaId, visiblePersonas]);

  const loadContext = useCallback(async (token: string): Promise<void> => {
    setState('loading');
    setError(null);
    try {
      const [current, nextPersonas, nextActions] = await Promise.all([
        getCurrentContext(token),
        getPersonas(token),
        getAvailableActions(token),
      ]);
      setContext(current);
      setPersonas(nextPersonas);
      setActions(nextActions);
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
    setPersonas([]);
    setActions([]);
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
                <div>
                  <dt>Porte-parole</dt>
                  <dd>{activePersona?.name ?? 'persona simple'}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">Contexte en attente.</p>
            )}
            {error ? (
              <div className="notice notice--error">
                <strong>Backend indisponible</strong>
                <span>{error}</span>
                <button className="secondary" onClick={() => auth ? void loadContext(auth.token) : undefined} type="button">
                  Reessayer
                </button>
              </div>
            ) : null}
          </article>

          <article className="panel">
            <h2>Réseau</h2>
            <dl className="facts">
              <div>
                <dt>API</dt>
                <dd>/api/v1</dd>
              </div>
              <div>
                <dt>Mode distant</dt>
                <dd>IP tailnet directe</dd>
              </div>
              <div>
                <dt>Fallback</dt>
                <dd>retry manuel</dd>
              </div>
            </dl>
          </article>

          <article className="panel panel--wide">
            <div className="panel-header">
              <h2>Personas</h2>
              <span className="counter">{visiblePersonas.length}</span>
            </div>
            {visiblePersonas.length > 0 ? (
              <div className="persona-grid">
                {visiblePersonas.map((persona) => (
                  <section
                    className={`persona-card${persona.id === activePersonaId ? ' persona-card--active' : ''}`}
                    key={persona.id}
                  >
                    <div>
                      <h3>{persona.name}</h3>
                      <p>{persona.domain}</p>
                    </div>
                    <span>{persona.status}</span>
                  </section>
                ))}
              </div>
            ) : (
              <p className="muted">Aucun persona charge.</p>
            )}
          </article>

          <article className="panel panel--wide">
            <div className="panel-header">
              <h2>Actions</h2>
              <span className="counter">{visibleActions.length}</span>
            </div>
            <div className="action-columns">
              {(['live', 'future', 'out_of_scope'] as const).map((status) => (
                <section className="action-column" key={status}>
                  <div className="column-title">
                    <h3>{STATUS_LABEL[status]}</h3>
                    <span>{actionBuckets[status].length}</span>
                  </div>
                  <div className="action-list">
                    {actionBuckets[status].map((action) => (
                      <article className={`action-item action-item--${status}`} key={action.action_id}>
                        <div>
                          <strong>{action.label}</strong>
                          <span>{action.action_id}</span>
                        </div>
                        <small>{action.risk_level}</small>
                      </article>
                    ))}
                    {actionBuckets[status].length === 0 ? <p className="muted compact">Vide.</p> : null}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </section>
      )}
    </main>
  );
}

export default App;
