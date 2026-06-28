import React, {useState} from 'react';
import type {FormEvent, ReactElement, ReactNode} from 'react';

import type {
  ActionRegistryEntry,
  AuthResponse,
  CurrentContext,
  Persona,
  Resource,
  RoomCheckpoint,
  ValidationInboxItem,
} from '@masterflow/shared';

import type {ModeView, WorkMode, WorkModeId} from './mode-runtime.ts';
import {playTts} from './api.ts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type ChatTurn = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  speaker?: string;
};

type RoomSyncState = {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
};

type SituationStat = {
  label: string;
  value: string | number;
};

type MasterFlowShellProps = {
  children: ReactNode;
  state: LoadState;
  auth?: AuthResponse | null;
  context?: CurrentContext | null;
  activePersonaName?: string | null;
  onLogout?: () => void;
};

type SituationPanelProps = {
  activeModeSignal: string;
  activePersonaName: string | null;
  auth: AuthResponse | null;
  context: CurrentContext | null;
  error: string | null;
  latestCheckpoint: RoomCheckpoint | null;
  onLogout: () => void;
  onReloadContext: (token: string) => void;
  roomMode: string;
  roomSync: RoomSyncState;
  situationStats: SituationStat[];
};

type ModeRailProps = {
  activeModeId: WorkModeId;
  availableModes: WorkMode[];
  onModeSelect: (mode: WorkModeId) => void;
};

export function MasterFlowShell({children, state, auth, context, activePersonaName, onLogout}: MasterFlowShellProps): ReactElement {
  return (
    <main className="shell">
      <header className="topbar" aria-label="Etat MasterFlow">
        <div className="topbar__brand">
          <p className="eyebrow">MasterFlow</p>
          <h1>Home Room</h1>
        </div>
        <div className="topbar__meta">
          {activePersonaName ? (
            <span className="topbar__persona">{activePersonaName}</span>
          ) : null}
          <span className={`status status--${state}`}>
            {state === 'ready' ? 'connecte' : state}
          </span>
          {auth && context ? (
            <>
              <span className="topbar__user-name">{context.user.display_name}</span>
              <button className="secondary topbar__logout" onClick={onLogout} type="button">
                Se déconnecter
              </button>
            </>
          ) : null}
        </div>
      </header>
      {children}
    </main>
  );
}

export function SituationPanel({
  activeModeSignal,
  activePersonaName,
  auth,
  context,
  error,
  latestCheckpoint,
  onLogout,
  onReloadContext,
  roomMode,
  roomSync,
  situationStats,
}: SituationPanelProps): ReactElement {
  return (
    <article className="panel situation-panel">
      {context ? (
        <>
          <div className="room-title">
            <div>
              <p className="eyebrow">{roomMode} / {activeModeSignal}</p>
              <h2>{context.room.name}</h2>
            </div>
            <button className="secondary" onClick={onLogout} type="button">
              Deconnexion
            </button>
          </div>
          <div className="room-summary">
            <span>{context.user.display_name}</span>
            <span>{activePersonaName ?? 'persona simple'}</span>
            <span>{context.room_instance.active_surface}</span>
            <span>{context.room_instance.cognitive_density}</span>
          </div>
          <section className="context-card" aria-label="Contexte charge">
            <div>
              <p className="eyebrow">Tu es ici</p>
              <strong>
                {typeof context.room.context?.['purpose'] === 'string'
                  ? context.room.context['purpose']
                  : `${context.room.name} organise le travail utile maintenant.`}
              </strong>
            </div>
            <div className="context-card__meta">
              <span>{context.runtime_context.trace.granted_tier}</span>
              <span>{context.runtime_context.authoritative_facts.length} sources fiables</span>
              <span>{context.user_runtime_loadout.available_action_ids.length} actions</span>
            </div>
            {latestCheckpoint ? (
              <div className="context-resume">
                <strong>Reprise</strong>
                <span>{latestCheckpoint.summary}</span>
                {latestCheckpoint.next_recommended_action ? (
                  <small>Ensuite : {latestCheckpoint.next_recommended_action}</small>
                ) : null}
              </div>
            ) : null}
            {context.runtime_context.trace.uncertainty.length > 0 ? (
              <p className="context-warning">
                Contexte incomplet : {context.runtime_context.trace.uncertainty.join(', ')}
              </p>
            ) : null}
          </section>
          <div className={`room-sync room-sync--${roomSync.status}`} aria-live="polite">
            <strong>{roomSync.status}</strong>
            <span>{roomSync.message}</span>
          </div>
          <div className="situation-grid" aria-label="Situation">
            {situationStats.map((stat) => (
              <div className="situation-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="muted">Contexte en attente.</p>
      )}
      {error ? (
        <div className="notice notice--error">
          <strong>Backend indisponible</strong>
          <span>{error}</span>
          <button className="secondary" onClick={() => auth ? onReloadContext(auth.token) : undefined} type="button">
            Reessayer
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function ModeRail({activeModeId, availableModes, onModeSelect}: ModeRailProps): ReactElement {
  return (
    <nav className="panel mode-rail" aria-label="Modes MasterFlow">
      {availableModes.map((mode) => (
        <button
          className={`mode-button${activeModeId === mode.id ? ' mode-button--active' : ''}`}
          key={mode.id}
          onClick={() => onModeSelect(mode.id)}
          type="button"
        >
          <strong>{mode.label}</strong>
          <span>{mode.signal}</span>
        </button>
      ))}
    </nav>
  );
}

type HomeDashboardProps = {
  context: CurrentContext | null;
  activePersona: Persona | null;
  latestCheckpoint: RoomCheckpoint | null;
  resources: Resource[];
  pendingActions: ValidationInboxItem[];
  availableModes: WorkMode[];
  nextActions: ActionRegistryEntry[];
  modeView: ModeView;
  canValidate: boolean;
  onActionClick: (entry: ActionRegistryEntry) => void;
  onModeSelect: (mode: WorkModeId) => void;
};

type ChatDockProps = {
  wsState: string;
  conversationTurns: ChatTurn[];
  chatInput: string;
  onChatInputChange: (value: string) => void;
  onChatSubmit: (event: FormEvent<HTMLFormElement>) => void;
  activePersonaId?: string | null;
};

export function HomeDashboard(props: HomeDashboardProps): ReactElement {
  const {
    context,
    activePersona,
    latestCheckpoint,
    resources,
    pendingActions,
    availableModes,
    nextActions,
    modeView,
    canValidate,
    onActionClick,
    onModeSelect,
  } = props;

  return (
    <div className="home-dashboard">
      <article className="home-card home-card--context">
        <h3 className="home-card__title">Tu es ici</h3>
        <p className="home-card__main">
          {typeof context?.room.context?.['purpose'] === 'string'
            ? context.room.context['purpose']
            : context?.room.name ?? 'Room active'}
        </p>
        <div className="home-card__meta">
          <span>{activePersona?.name ?? 'persona simple'}</span>
          <span>{context?.room_instance.active_surface ?? 'home'}</span>
        </div>
        <p className="home-card__signal">{modeView.signal}</p>
      </article>

      <article className="home-card home-card--next-action">
        <h3 className="home-card__title">Prochaine action</h3>
        {nextActions.length > 0 ? (
          <div className="home-card__actions">
            {nextActions.map((action) => (
              <button
                className="action-chip"
                key={action.action_id}
                onClick={() => onActionClick(action)}
                type="button"
              >
                <span>{action.label}</span>
                <small>{action.preflight_required ? 'Vérification requise' : 'Disponible'}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="home-card__empty">Aucune action immédiate</p>
        )}
      </article>

      <article className="home-card home-card--resume">
        <h3 className="home-card__title">À reprendre</h3>
        {latestCheckpoint ? (
          <div className="home-card__detail">
            <p>{latestCheckpoint.summary}</p>
            {latestCheckpoint.next_recommended_action ? (
              <small>Ensuite : {latestCheckpoint.next_recommended_action}</small>
            ) : null}
          </div>
        ) : (
          <p className="home-card__empty">Aucune reprise enregistrée pour cette room.</p>
        )}
      </article>

      {canValidate ? (
        <article className="home-card home-card--watch">
          <h3 className="home-card__title">À surveiller</h3>
          <p className="home-card__count">
            {pendingActions.length > 0
              ? `${pendingActions.length} validation(s) en attente`
              : 'Aucune validation en attente'}
          </p>
        </article>
      ) : null}

      <article className="home-card home-card--resources">
        <h3 className="home-card__title">Ressources utiles</h3>
        <p className="home-card__count">{resources.length} source(s) validée(s)</p>
      </article>

      <article className="home-card home-card--modes">
        <h3 className="home-card__title">Modes utiles</h3>
        <div className="home-card__chips">
          {availableModes.map((mode) => (
            <button
              className="mode-chip"
              key={mode.id}
              onClick={() => onModeSelect(mode.id)}
              type="button"
            >
              {mode.label}
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}

export function ChatDock(props: ChatDockProps): ReactElement {
  const {wsState, conversationTurns, chatInput, onChatInputChange, onChatSubmit, activePersonaId} = props;
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlayTts = async (turnId: string, text: string) => {
    try {
      setPlayingId(turnId);
      await playTts(text, activePersonaId ?? undefined);
    } catch (e) {
      console.error('[tts] playTts failed:', e);
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <div className="chat-dock">
      <div className="chat-dock__log">
        {conversationTurns.length > 0 ? (
          conversationTurns.slice(-3).map((turn) => (
            <span className={`chat-dock__turn chat-dock__turn--${turn.role}`} key={turn.id}>
              <strong>
                {turn.speaker ?? (turn.role === 'user' ? 'Vous' : 'Assistant')}
                {turn.role !== 'user' && (
                  <button 
                    type="button" 
                    className="tts-btn"
                    onClick={() => handlePlayTts(turn.id, turn.content)}
                    disabled={playingId === turn.id}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '0.5rem', fontSize: '1.2em' }}
                    title="Écouter ce message"
                  >
                    {playingId === turn.id ? '⏳' : '🔊'}
                  </button>
                )}
              </strong>
              <span>{turn.content}</span>
            </span>
          ))
        ) : (
          <span className="chat-dock__placeholder">
            {wsState === 'connected' ? 'Chat prêt' : 'WebSocket en attente…'}
          </span>
        )}
      </div>
      <form className="chat-dock__form" onSubmit={onChatSubmit}>
        <input
          aria-label="Message"
          disabled={wsState !== 'connected'}
          onChange={(event) => onChatInputChange(event.target.value)}
          placeholder={wsState === 'connected' ? 'Message court…' : 'WebSocket indisponible'}
          type="text"
          value={chatInput}
        />
        <button disabled={wsState !== 'connected' || chatInput.trim().length === 0} type="submit">
          Envoyer
        </button>
      </form>
    </div>
  );
}
