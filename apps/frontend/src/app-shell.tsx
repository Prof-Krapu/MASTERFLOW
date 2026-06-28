import type {ReactElement, ReactNode} from 'react';

import type {
  AuthResponse,
  CurrentContext,
  RoomCheckpoint,
} from '@masterflow/shared';

import type {WorkMode, WorkModeId} from './mode-runtime.ts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

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

export function MasterFlowShell({children, state}: MasterFlowShellProps): ReactElement {
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
