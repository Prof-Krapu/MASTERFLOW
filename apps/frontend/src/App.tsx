import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {
  ActionRegistryEntry,
  AuthResponse,
  CurrentContext,
  Persona,
  RegistryStatus,
  Resource,
  WsServerMessage,
} from '@masterflow/shared';

import {getAvailableActions, getCurrentContext, getPersonas, getResources, login, setToken} from './api.ts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type WsState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';
type ChatTurn = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  speaker?: string;
};
type ActionBuckets = Record<RegistryStatus, ActionRegistryEntry[]>;

const STATUS_LABEL: Record<RegistryStatus, string> = {
  live: 'live',
  future: 'a venir',
  out_of_scope: 'masque',
};

const ROLE_LABEL: Record<string, string> = {
  student: 'learn',
  teacher: 'prof',
  admin: 'admin',
  godmode: 'godmode',
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

function wsUrl(roomInstanceId: string, token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const encodedRoom = encodeURIComponent(roomInstanceId);
  const encodedToken = encodeURIComponent(token);
  return `${protocol}//${window.location.host}/ws/${encodedRoom}?token=${encodedToken}`;
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function App(): ReactElement {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [context, setContext] = useState<CurrentContext | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [actions, setActions] = useState<ActionRegistryEntry[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [wsState, setWsState] = useState<WsState>('idle');
  const [chatInput, setChatInput] = useState('');
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const assistantTurnRef = useRef<string | null>(null);

  const isConnected = auth !== null && context !== null;

  const actionSummary = useMemo(() => {
    const count = actions.length;
    return count > 1 ? `${count} actions` : `${count} action`;
  }, [actions.length]);

  const visiblePersonas = personas.length > 0 ? personas : (context?.personas ?? []);
  const visibleActions = actions.length > 0 ? actions : (context?.available_actions ?? []);

  const actionBuckets = useMemo(() => bucketActions(visibleActions), [visibleActions]);
  const liveActions = actionBuckets.live;
  const nextActions = liveActions.slice(0, 3);
  const lockedActions = actionBuckets.future.slice(0, 4);
  const isGodmode = context?.user.role === 'godmode';
  const roomMode = context?.user.role ? (ROLE_LABEL[context.user.role] ?? context.user.role) : 'session';

  const activePersonaId = context?.active_blend?.speaker_persona_id ?? null;

  const activePersona = useMemo(() => {
    if (!activePersonaId) return null;
    return visiblePersonas.find((persona) => persona.id === activePersonaId) ?? null;
  }, [activePersonaId, visiblePersonas]);

  const loadContext = useCallback(async (token: string): Promise<void> => {
    setState('loading');
    setError(null);
    try {
      const [current, nextPersonas, nextActions, nextResources] = await Promise.all([
        getCurrentContext(token),
        getPersonas(token),
        getAvailableActions(token),
        getResources(token),
      ]);
      setContext(current);
      setPersonas(nextPersonas);
      setActions(nextActions);
      setResources(nextResources);
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
    wsRef.current?.close();
    wsRef.current = null;
    assistantTurnRef.current = null;
    setAuth(null);
    setContext(null);
    setPersonas([]);
    setActions([]);
    setResources([]);
    setToken(null);
    setState('idle');
    setWsState('idle');
    setChatInput('');
    setChatTurns([]);
    setError(null);
  }, []);

  const handleChatSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const content = chatInput.trim();
      if (!content || wsRef.current?.readyState !== WebSocket.OPEN) return;

      wsRef.current.send(JSON.stringify({type: 'chat', content}));
      setChatTurns((current) => [
        ...current,
        {id: nextId('user'), role: 'user', content},
      ]);
      setChatInput('');
    },
    [chatInput],
  );

  useEffect(() => {
    document.title = isConnected ? 'MasterFlow - Home Room' : 'MasterFlow - Connexion';
  }, [isConnected]);

  useEffect(() => {
    if (!auth || !context) return undefined;

    const socket = new WebSocket(wsUrl(context.room_instance.id, auth.token));
    wsRef.current = socket;
    setWsState('connecting');
    setChatTurns([]);
    assistantTurnRef.current = null;

    socket.addEventListener('open', () => {
      setWsState('connected');
      socket.send(JSON.stringify({type: 'ping'}));
    });

    socket.addEventListener('close', () => {
      setWsState((current) => (current === 'error' ? 'error' : 'closed'));
      if (wsRef.current === socket) wsRef.current = null;
    });

    socket.addEventListener('error', () => {
      setWsState('error');
    });

    socket.addEventListener('message', (event) => {
      let message: WsServerMessage;
      try {
        message = JSON.parse(String(event.data)) as WsServerMessage;
      } catch {
        setChatTurns((current) => [
          ...current,
          {id: nextId('system'), role: 'system', content: 'Message WS illisible.'},
        ]);
        return;
      }

      if (message.type === 'pong') return;

      if (message.type === 'chat_start') {
        const id = nextId('assistant');
        assistantTurnRef.current = id;
        setChatTurns((current) => [
          ...current,
          {id, role: 'assistant', content: '', speaker: message.speaker},
        ]);
        return;
      }

      if (message.type === 'chat_chunk') {
        const id = assistantTurnRef.current;
        if (!id) return;
        setChatTurns((current) => current.map((turn) => (
          turn.id === id ? {...turn, content: `${turn.content}${message.content}`} : turn
        )));
        return;
      }

      if (message.type === 'chat_end') {
        assistantTurnRef.current = null;
        if (message.method_attribution) {
          setChatTurns((current) => [
            ...current,
            {id: nextId('system'), role: 'system', content: message.method_attribution ?? ''},
          ]);
        }
        return;
      }

      if (message.type === 'error') {
        setChatTurns((current) => [
          ...current,
          {id: nextId('system'), role: 'system', content: message.message},
        ]);
      }
    });

    return () => {
      socket.close();
    };
  }, [auth, context]);

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
          <article className="panel room-hero">
            {context ? (
              <>
                <div className="room-title">
                  <div>
                    <p className="eyebrow">{roomMode}</p>
                    <h2>{context.room.name}</h2>
                  </div>
                  <button className="secondary" onClick={handleLogout} type="button">
                    Deconnexion
                  </button>
                </div>
                <div className="room-summary">
                  <span>{context.user.display_name}</span>
                  <span>{activePersona?.name ?? 'persona simple'}</span>
                  <span>{context.room_instance.active_surface}</span>
                </div>
                <div className="next-actions" aria-label="Actions utiles">
                  {nextActions.length > 0 ? (
                    nextActions.map((action) => (
                      <button className="action-chip" disabled={action.preflight_required} key={action.action_id} type="button">
                        <span>{action.label}</span>
                        <small>{action.preflight_required ? 'preflight' : action.risk_level}</small>
                      </button>
                    ))
                  ) : (
                    <p className="muted compact">Aucune action live disponible.</p>
                  )}
                </div>
              </>
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

          <article className="panel source-strip">
            <div className="panel-header">
              <h2>Sources</h2>
              <span className="counter">{resources.length}</span>
            </div>
            {resources.length > 0 ? (
              <div className="resource-list">
                {resources.slice(0, 3).map((resource) => (
                  <a className="resource-item" href={resource.url ?? '#'} key={resource.id}>
                    <strong>{resource.title}</strong>
                    <span>{resource.source}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted compact">Aucune source validee chargee.</p>
            )}
          </article>

          <article className="panel panel--wide">
            <div className="panel-header">
              <h2>Personas</h2>
              <span className="counter">{visiblePersonas.length}</span>
            </div>
            {visiblePersonas.length > 0 ? (
              <div className="persona-strip">
                {visiblePersonas.map((persona) => (
                  <section
                    className={`persona-pill${persona.id === activePersonaId ? ' persona-pill--active' : ''}`}
                    key={persona.id}
                  >
                    <strong>{persona.name}</strong>
                    <span>{persona.domain}</span>
                  </section>
                ))}
              </div>
            ) : (
              <p className="muted">Aucun persona charge.</p>
            )}
          </article>

          <article className="panel panel--wide chat-panel">
            <div className="panel-header">
              <h2>Chat</h2>
              <span className={`ws-badge ws-badge--${wsState}`}>{wsState}</span>
            </div>
            <div className="chat-log" aria-live="polite">
              {chatTurns.length > 0 ? (
                chatTurns.map((turn) => (
                  <article className={`chat-turn chat-turn--${turn.role}`} key={turn.id}>
                    <strong>{turn.speaker ?? (turn.role === 'user' ? 'Vous' : 'Systeme')}</strong>
                    <p>{turn.content || '...'}</p>
                  </article>
                ))
              ) : (
                <p className="muted compact">Chat pret des que le WebSocket est connecte.</p>
              )}
            </div>
            <form className="chat-form" onSubmit={handleChatSubmit}>
              <input
                aria-label="Message chat"
                disabled={wsState !== 'connected'}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={wsState === 'connected' ? 'Message court...' : 'WebSocket indisponible'}
                type="text"
                value={chatInput}
              />
              <button disabled={wsState !== 'connected' || chatInput.trim().length === 0} type="submit">
                Envoyer
              </button>
            </form>
          </article>

          <article className="panel panel--wide">
            <div className="panel-header">
              <h2>Actions verrouillees</h2>
              <span className="counter">{lockedActions.length}</span>
            </div>
            <div className="locked-grid">
              {lockedActions.length > 0 ? (
                lockedActions.map((action) => (
                  <article className="locked-item" key={action.action_id}>
                    <div>
                      <strong>{action.label}</strong>
                      <span>{action.endpoint}</span>
                    </div>
                    <small>{STATUS_LABEL[action.status]}</small>
                  </article>
                ))
              ) : (
                <p className="muted compact">Aucune action future dans le registre.</p>
              )}
            </div>
          </article>

          {isGodmode ? (
            <article className="panel panel--wide debug-panel">
              <div className="panel-header">
                <h2>Debug</h2>
                <span className="counter">{actionSummary}</span>
              </div>
              <dl className="facts">
                <div>
                  <dt>Live</dt>
                  <dd>{actionBuckets.live.length}</dd>
                </div>
                <div>
                  <dt>Future</dt>
                  <dd>{actionBuckets.future.length}</dd>
                </div>
                <div>
                  <dt>Hors scope</dt>
                  <dd>{actionBuckets.out_of_scope.length}</dd>
                </div>
                <div>
                  <dt>API</dt>
                  <dd>/api/v1</dd>
                </div>
              </dl>
            </article>
          ) : null}
        </section>
      )}
    </main>
  );
}

export default App;
