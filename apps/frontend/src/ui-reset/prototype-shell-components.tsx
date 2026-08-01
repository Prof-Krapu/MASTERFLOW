import {
  Bell,
  Check,
  ChevronDown,
  Command,
  History,
  Keyboard,
  Lock,
  LoaderCircle,
  LogOut,
  Menu,
  Mic,
  Moon,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import type {CSSProperties, FormEventHandler, KeyboardEventHandler, ReactElement, ReactNode} from 'react';

import type {TunnelContextSummary, TunnelMessage, TunnelParticipant, TunnelPrompt} from './prototype-tunnel-model';
import type {PrototypeDockPanel} from './use-prototype-shortcuts';

export type PrototypeMode = {
  id: string;
  label: string;
  icon: typeof Command;
  locked?: boolean;
  featured?: boolean;
};

export type PrototypeModeGroup = {
  label: string;
  kind: string;
  modes: PrototypeMode[];
};

export type PrototypeAccessLevel = {
  id: string;
  label: string;
  icon: typeof Command;
};

type NavigationRailProps = {
  accessClosing: boolean;
  accessLevel: string;
  accessLevels: PrototypeAccessLevel[];
  accessOpen: boolean;
  activeMode: string;
  brandMark: ReactNode;
  characterActive: boolean;
  homeActive: boolean;
  mobileLabel: string;
  modeGroups: PrototypeModeGroup[];
  profileAvatar: string;
  profileName: string;
  onCloseRail: () => void;
  onOpenActions: () => void;
  onOpenCharacter: () => void;
  onOpenHome: () => void;
  onOpenSettings: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onSelectAccess: (id: string) => void;
  onSelectMode: (id: string) => void;
  onToggleAccess: () => void;
};

export function PrototypeNavigationRail({
  accessClosing,
  accessLevel,
  accessLevels,
  accessOpen,
  activeMode,
  brandMark,
  characterActive,
  homeActive,
  mobileLabel,
  modeGroups,
  onCloseRail,
  onOpenActions,
  onOpenCharacter,
  onOpenHome,
  onOpenSettings,
  onPointerEnter,
  onPointerLeave,
  onSelectAccess,
  onSelectMode,
  onToggleAccess,
  profileAvatar,
  profileName,
}: NavigationRailProps): ReactElement {
  return (
    <nav
      className="proto-nav"
      aria-label="Navigation MasterFlow"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="proto-nav__mobile-heading">
        <button aria-label="Fermer le menu" onClick={onCloseRail} type="button"><X size={20} /></button>
        <strong>Navigation</strong>
        <small>{mobileLabel}</small>
      </div>
      <button
        aria-current={homeActive ? 'page' : undefined}
        aria-label="Ouvrir l’accueil MasterFlow"
        className="proto-nav__toggle"
        onClick={onOpenHome}
        type="button"
      >
        {brandMark}
        <span aria-hidden="true" className="proto-nav__wordmark" />
      </button>

      <button
        aria-current={characterActive ? 'page' : undefined}
        aria-label={`Ouvrir la page personnage ${profileName}`}
        className="proto-profile"
        onClick={onOpenCharacter}
        type="button"
      >
        <span className="proto-profile__avatar">
          <img alt="" src={profileAvatar} />
          <span className="proto-profile__status" />
        </span>
        <span className="proto-profile__identity">
          <strong>{profileName}</strong>
        </span>
      </button>

      <div className="proto-nav__modes">
        {modeGroups.map((group) => (
          <div className={`proto-nav__group proto-nav__group--${group.kind}`} key={group.label}>
            <small>{group.label}</small>
            {group.modes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  aria-current={!characterActive && activeMode === mode.id ? 'page' : undefined}
                  className={`${mode.locked ? 'is-locked ' : ''}${mode.featured ? 'is-featured' : ''}`}
                  key={mode.id}
                  onClick={() => onSelectMode(mode.id)}
                  title={mode.label}
                  type="button"
                >
                  <Icon size={20} />
                  <span>{mode.label}</span>
                  <Lock className="proto-nav__lock" size={13} />
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="proto-nav__footer">
        <div className="proto-access">
          <button
            aria-expanded={accessOpen}
            className="proto-access__current"
            onClick={onToggleAccess}
            type="button"
          >
            <ShieldCheck size={15} />
            <span>Accès · {accessLevels.find((level) => level.id === accessLevel)?.label}</span>
            <ChevronDown size={14} />
          </button>
          {accessOpen || accessClosing ? (
            <div className={`proto-access__options${accessClosing ? ' is-closing' : ''}`}>
              {accessLevels.map((level) => {
                const Icon = level.icon;
                return (
                  <button
                    aria-current={accessLevel === level.id ? 'true' : undefined}
                    key={level.id}
                    onClick={() => onSelectAccess(level.id)}
                    type="button"
                  >
                    <Icon size={14} />
                    <span>{level.label}</span>
                    {accessLevel === level.id ? <Check size={13} /> : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
        <button className="proto-nav__settings" onClick={onOpenSettings} type="button">
          <Settings size={17} />
          <span>Paramètres</span>
        </button>
      </div>
      <button
        aria-label="Ouvrir la bibliothèque d’actions"
        className="proto-nav__mobile-more"
        onClick={onOpenActions}
        type="button"
      >
        <Plus size={24} />
      </button>
    </nav>
  );
}

export type PrototypeSystemPanel = 'search' | 'queue' | 'notifications' | 'dm' | 'exit' | null;

export type PrototypeSearchResult = {
  id: string;
  label: string;
  detail: string;
  icon: typeof Command;
};

type SystemChromeProps = {
  appearanceLight: boolean;
  brandMark: ReactNode;
  dmCount?: number;
  notificationCount?: number;
  panel: PrototypeSystemPanel;
  panelClosing: boolean;
  profileAvatar: string;
  profileName: string;
  quickSearch: string;
  queueCount?: number;
  railOpen: boolean;
  renderedPanel: PrototypeSystemPanel;
  searchResults: PrototypeSearchResult[];
  onClosePanel: () => void;
  onExit: () => void;
  onOpenCharacter: () => void;
  onOpenHome: () => void;
  onQuickSearchChange: (value: string) => void;
  onTogglePanel: (panel: Exclude<PrototypeSystemPanel, null>) => void;
  onToggleRail: () => void;
  onToggleTheme: () => void;
};

export function PrototypeSystemChrome({
  appearanceLight,
  brandMark,
  dmCount = 1,
  notificationCount = 3,
  onClosePanel,
  onExit,
  onOpenCharacter,
  onOpenHome,
  onQuickSearchChange,
  onTogglePanel,
  onToggleRail,
  onToggleTheme,
  panel,
  panelClosing,
  profileAvatar,
  profileName,
  quickSearch,
  queueCount = 2,
  railOpen,
  renderedPanel,
  searchResults,
}: SystemChromeProps): ReactElement {
  const panelContent = (mobile: boolean): ReactNode => {
    if (renderedPanel === 'search') {
      return (
        <>
          {!mobile ? <small>Recherche rapide</small> : null}
          <label className="proto-quick-search">
            <Search size={mobile ? 18 : 16} />
            <input
              autoFocus
              onChange={(event) => onQuickSearchChange(event.target.value)}
              placeholder="Prof, ressource, cours..."
              type="search"
              value={quickSearch}
            />
          </label>
          <div className="proto-quick-search__results">
            {searchResults.slice(0, mobile ? 6 : 4).map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={onClosePanel} type="button">
                  <Icon size={mobile ? 18 : 16} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      );
    }
    if (renderedPanel === 'queue') {
      const queueLabel = queueCount > 0 ? `${queueCount} tâche${queueCount > 1 ? 's' : ''} en cours` : 'Aucune tâche en cours';
      return mobile ? (
        <>
          <button className="proto-mobile-system-page__item" type="button"><LoaderCircle size={19} /><span><strong>{queueLabel}</strong><small>Lecture seule</small></span></button>
          <button className="proto-mobile-system-page__item" type="button"><History size={19} /><span><strong>Task Monitor</strong><small>Branché sans action</small></span></button>
        </>
      ) : (
        <>
          <small>Queue</small>
          <strong>{queueLabel}</strong>
          <p>Task Monitor en lecture seule.</p>
          <p>Aucune action n'est exécutée depuis ce panneau.</p>
        </>
      );
    }
    if (renderedPanel === 'notifications') {
      const validationLabel = notificationCount > 0 ? `${notificationCount} élément${notificationCount > 1 ? 's' : ''} à regarder` : 'Aucune validation';
      return mobile ? (
        <>
          <button className="proto-mobile-system-page__item" type="button"><Check size={19} /><span><strong>{validationLabel}</strong><small>Validation Inbox</small></span></button>
          <button className="proto-mobile-system-page__item" type="button"><Sparkles size={19} /><span><strong>Notifications</strong><small>Lecture seule</small></span></button>
        </>
      ) : (
        <>
          <small>Notifications</small>
          <strong>{validationLabel}</strong>
          <p>Validation Inbox et signaux système, sans décision directe.</p>
        </>
      );
    }
    if (renderedPanel === 'dm') {
      const dmLabel = dmCount > 0 ? `${dmCount} nouvelle${dmCount > 1 ? 's' : ''} requête${dmCount > 1 ? 's' : ''}` : 'Aucune requête directe';
      return mobile ? (
        <button className="proto-mobile-system-page__item" type="button"><Send size={19} /><span><strong>{dmLabel}</strong><small>Messages privés</small></span></button>
      ) : (
        <>
          <small>Messages privés</small>
          <strong>{dmLabel}</strong>
          <p>Demandes directes et messages personnels.</p>
        </>
      );
    }
    if (renderedPanel === 'exit') {
      return (
        <>
          <small>Session</small>
          <strong>Quitter MasterFlow ?</strong>
          <div className="proto-system-popover__actions">
            <button onClick={onClosePanel} type="button">Annuler</button>
            <button onClick={onExit} type="button">Quitter</button>
          </div>
        </>
      );
    }
    return null;
  };

  const panelTitle = renderedPanel === 'search'
    ? 'Recherche rapide'
    : renderedPanel === 'queue'
      ? 'File d’attente'
      : renderedPanel === 'notifications'
        ? 'Notifications'
        : renderedPanel === 'dm'
          ? 'Messages privés'
          : 'Session';

  return (
    <>
      <header className="proto-systembar">
        <div className="proto-systembar__center">
          <button aria-label="Retour à l’accueil MasterFlow" className="proto-wordmark" onClick={onOpenHome} type="button">
            {brandMark}
            <span>MasterFlow</span>
          </button>
        </div>

        <div className="proto-systembar__actions">
          <button aria-expanded={panel === 'queue'} aria-label="Queue en cours" className="proto-system-action proto-system-action--queue" data-tooltip={`Queue · ${queueCount}`} onClick={() => onTogglePanel('queue')} type="button">
            <LoaderCircle size={19} />
            {queueCount > 0 ? <span className="proto-system-badge">{queueCount}</span> : null}
          </button>
          <button aria-expanded={panel === 'notifications'} aria-label="Notifications" className="proto-system-action proto-system-action--notifications" data-tooltip="Notifications" onClick={() => onTogglePanel('notifications')} type="button">
            <Bell size={19} />
            {notificationCount > 0 ? <span className="proto-system-dot">{notificationCount}</span> : null}
          </button>
          <button aria-expanded={panel === 'dm'} aria-label="Messages privés et requêtes" className="proto-system-action proto-system-action--dm" data-tooltip="Messages privés" onClick={() => onTogglePanel('dm')} type="button">
            <Send size={19} />
            {dmCount > 0 ? <span className="proto-system-dot">{dmCount}</span> : null}
          </button>
          <button aria-expanded={panel === 'search'} aria-label="Recherche rapide" className="proto-system-action proto-system-action--search" data-tooltip="Recherche rapide · S" onClick={() => onTogglePanel('search')} type="button">
            <Search size={19} />
          </button>
          <button
            aria-checked={appearanceLight}
            aria-label={appearanceLight ? 'Passer en mode sombre' : 'Passer en mode clair'}
            className={`proto-theme-switch${appearanceLight ? ' is-light' : ''}`}
            data-tooltip={appearanceLight ? 'Mode sombre' : 'Mode clair'}
            onClick={onToggleTheme}
            role="switch"
            type="button"
          >
            {appearanceLight ? <Sun size={13} /> : <Moon size={13} />}
            <i />
          </button>
          <button aria-expanded={panel === 'exit'} aria-label="Quitter MasterFlow" className="proto-system-action proto-system-action--exit" data-tooltip="Quitter" onClick={() => onTogglePanel('exit')} type="button">
            <LogOut size={19} />
          </button>

          {renderedPanel ? (
            <aside className={`proto-system-popover proto-system-popover--${renderedPanel}${panelClosing ? ' is-closing' : ''}`}>
              <button aria-label="Fermer" className="proto-system-popover__close" onClick={onClosePanel} type="button">
                <X size={20} />
              </button>
              {panelContent(false)}
            </aside>
          ) : null}
        </div>
      </header>

      <button
        aria-label={`Ouvrir la page personnage ${profileName}`}
        className="proto-mobile-profile"
        onClick={onOpenCharacter}
        onPointerDown={(event) => {
          if (!railOpen) return;
          event.preventDefault();
          event.stopPropagation();
          onOpenCharacter();
        }}
        type="button"
      >
        <span className="proto-profile__avatar">
          <img alt="" src={profileAvatar} />
          <span className="proto-profile__status" />
        </span>
      </button>

      <nav className="proto-mobile-nav" aria-label="Navigation mobile">
        <button aria-expanded={railOpen} aria-label="Ouvrir le menu" className="proto-mobile-nav__menu" onClick={onToggleRail} type="button">
          <Menu size={22} />
        </button>
        <button aria-expanded={panel === 'notifications'} aria-label="Notifications" onClick={() => onTogglePanel('notifications')} type="button">
          <Bell size={21} />
          {notificationCount > 0 ? <span className="proto-system-dot">{notificationCount}</span> : null}
        </button>
        <button aria-expanded={panel === 'dm'} aria-label="Messages privés" onClick={() => onTogglePanel('dm')} type="button">
          <Send size={21} />
          {dmCount > 0 ? <span className="proto-system-dot">{dmCount}</span> : null}
        </button>
        <button aria-expanded={panel === 'search'} aria-label="Recherche rapide" onClick={() => onTogglePanel('search')} type="button">
          <Search size={21} />
        </button>
        <button aria-expanded={panel === 'queue'} aria-label="Queue en cours" onClick={() => onTogglePanel('queue')} type="button">
          <LoaderCircle size={21} />
          {queueCount > 0 ? <span className="proto-system-badge">{queueCount}</span> : null}
        </button>
      </nav>

      {renderedPanel ? (
        <section className={`proto-mobile-system-page${panelClosing ? ' is-closing' : ''}`} aria-label="Panneau système mobile">
          <button aria-label="Fermer" className="proto-mobile-system-page__close" onClick={onClosePanel} type="button">
            <X size={20} />
          </button>
          <header>
            <span className="proto-mobile-system-page__icon">
              {renderedPanel === 'search' ? <Search size={24} /> : null}
              {renderedPanel === 'queue' ? <LoaderCircle size={24} /> : null}
              {renderedPanel === 'notifications' ? <Bell size={24} /> : null}
              {renderedPanel === 'dm' ? <Send size={24} /> : null}
              {renderedPanel === 'exit' ? <LogOut size={24} /> : null}
            </span>
            <strong>{panelTitle}</strong>
          </header>
          <div className="proto-mobile-system-page__content">
            {panelContent(true)}
          </div>
        </section>
      ) : null}
    </>
  );
}

export type PrototypeActionSuggestion = {
  id: string;
  label: string;
  icon: typeof Command;
  onClick?: () => void;
};

export type PrototypeHistoryItem = {
  id: string;
  speaker: string;
  summary: string;
  detail: string;
};

type ActionRailProps = {
  actions: PrototypeActionSuggestion[];
  libraryOpen: boolean;
  onOpenLibrary: () => void;
};

export function PrototypeActionRail({
  actions,
  libraryOpen,
  onOpenLibrary,
}: ActionRailProps): ReactElement {
  return (
    <aside className="proto-stage-tools" aria-label="Outils contextuels flottants">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            aria-label={action.label}
            className="proto-action-button proto-action-button--icon"
            data-tooltip={action.label}
            key={action.id}
            onClick={onOpenLibrary}
            type="button"
          >
            <Icon size={19} />
          </button>
        );
      })}
      <button
        aria-expanded={libraryOpen}
        aria-label={libraryOpen ? 'Fermer la bibliothèque d’actions' : 'Ouvrir la bibliothèque d’actions'}
        className="proto-action-button proto-action-button--icon proto-stage-tools__more"
        data-tooltip="Toutes les actions · A"
        onClick={onOpenLibrary}
        type="button"
      >
        <Plus size={24} />
      </button>
    </aside>
  );
}

type CommandDockProps = {
  dockPanel: PrototypeDockPanel;
  dockPanelClosing: boolean;
  expandedHistoryId: string | null;
  historyClosing: boolean;
  historyItems: PrototypeHistoryItem[];
  historyOpen: boolean;
  input: string;
  recording: boolean;
  renderedDockPanel: PrototypeDockPanel;
  showSuggestions: boolean;
  suggestions: PrototypeActionSuggestion[];
  transcribing: boolean;
  onCloseHistory: () => void;
  onInputChange: (value: string) => void;
  onInputKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onToggleExpandedHistory: (id: string) => void;
  onToggleHistory: () => void;
  onToggleKeyboard: () => void;
  onToggleMicro: () => void;
  onToggleRecording: () => void;
  onToggleTranscription: () => void;
};

export function PrototypeCommandDock({
  dockPanel,
  dockPanelClosing,
  expandedHistoryId,
  historyClosing,
  historyItems,
  historyOpen,
  input,
  onCloseHistory,
  onInputChange,
  onInputKeyDown,
  onSubmit,
  onToggleExpandedHistory,
  onToggleHistory,
  onToggleKeyboard,
  onToggleMicro,
  onToggleRecording,
  onToggleTranscription,
  recording,
  renderedDockPanel,
  showSuggestions,
  suggestions,
  transcribing,
}: CommandDockProps): ReactElement {
  return (
    <form className="proto-commandbar" onSubmit={onSubmit}>
      {showSuggestions ? (
        <div className="proto-commandbar__chips" aria-label="Actions contextuelles">
          {suggestions.slice(0, 5).map((suggestion) => {
            const Icon = suggestion.icon;
            return (
              <button
                aria-label={suggestion.label}
                className="proto-action-button proto-action-button--pill"
                key={suggestion.id}
                onClick={suggestion.onClick}
                type="button"
              >
                <Icon size={18} />
                <span>{suggestion.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {historyOpen || historyClosing ? (
        <aside className={`proto-history-panel${historyClosing ? ' is-closing' : ''}`} aria-label="Historique de conversation">
          <header>
            <button aria-label="Fermer l’historique" className="proto-history-panel__close" onClick={onCloseHistory} type="button">
              <X size={17} />
            </button>
            <span className="proto-history-panel__icon">
              <History size={22} />
            </span>
            <strong>Historique</strong>
          </header>
          <div className="proto-history-panel__list">
            {historyItems.map((item) => (
              <button
                aria-expanded={expandedHistoryId === item.id}
                className="proto-history-panel__item"
                key={item.id}
                onClick={() => onToggleExpandedHistory(item.id)}
                type="button"
              >
                <span>
                  <small>{item.speaker}</small>
                  <strong>{item.summary}</strong>
                </span>
                {expandedHistoryId === item.id ? <p>{item.detail}</p> : null}
              </button>
            ))}
          </div>
        </aside>
      ) : null}

      {renderedDockPanel ? (
        <div className={`proto-dock-panel proto-dock-panel--${renderedDockPanel}${dockPanelClosing ? ' is-closing' : ''}`}>
          {renderedDockPanel === 'keyboard' ? (
            <div className="proto-commandbar__input">
              <textarea
                aria-label="Champ prototype"
                autoFocus
                onChange={(event) => onInputChange(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder={transcribing ? 'Transcription en cours…' : 'Écrire à MasterFlow'}
                rows={2}
                spellCheck={false}
                value={input}
              />
              <button
                aria-label={transcribing ? 'Arrêter la transcription' : 'Démarrer la transcription'}
                aria-pressed={transcribing}
                className="proto-action-button proto-action-button--transcribe"
                data-tooltip={transcribing ? 'Arrêter la dictée' : 'Dicter du texte'}
                onClick={onToggleTranscription}
                type="button"
              >
                <Mic size={17} />
              </button>
              <button aria-label="Envoyer" className="proto-action-button proto-action-button--send" disabled={!input.trim()} type="submit"><Send size={18} /></button>
            </div>
          ) : (
            <div className={`proto-micro-panel${recording ? ' is-recording' : ''}`}>
              <Mic size={22} />
              <span>{recording ? 'REC' : 'Micro'}</span>
              <strong>{recording ? 'Discussion en cours. Entrée stoppe le REC.' : 'Entrée lance la discussion vocale.'}</strong>
              {recording ? (
                <div className="proto-audio-spectrum" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              ) : null}
              <button className="proto-action-button proto-action-button--pill" onClick={onToggleRecording} type="button">
                <Mic size={17} />
                <span>{recording ? 'Stop' : 'Lancer'}</span>
              </button>
            </div>
          )}
        </div>
      ) : null}

      <div className="proto-dock-buttons" aria-label="Ouverture clavier et micro">
        <button
          aria-expanded={dockPanel === 'keyboard'}
          aria-label="Ouvrir le clavier"
          className="proto-action-button proto-action-button--dock"
          data-tooltip="Clavier"
          onClick={onToggleKeyboard}
          type="button"
        >
          <Keyboard size={22} />
        </button>
        {showSuggestions ? (
          <button
            aria-expanded={historyOpen}
            aria-label={historyOpen ? 'Fermer l’historique' : 'Ouvrir l’historique'}
            className="proto-action-button proto-action-button--dock proto-action-button--history"
            data-tooltip="Historique"
            onClick={onToggleHistory}
            type="button"
          >
            <History size={20} />
          </button>
        ) : null}
        <button
          aria-expanded={dockPanel === 'micro'}
          aria-label={recording ? 'Arrêter l’enregistrement' : 'Ouvrir le micro'}
          className={`proto-action-button proto-action-button--dock proto-action-button--micro${recording ? ' is-recording' : ''}`}
          data-tooltip={recording ? 'Stop REC' : 'Micro'}
          onClick={onToggleMicro}
          type="button"
        >
          {recording ? <span className="proto-rec-label">REC</span> : <Mic size={22} />}
        </button>
      </div>
    </form>
  );
}

type TunnelProps = {
  closing: boolean;
  contextSummary: TunnelContextSummary;
  embedded?: boolean;
  input: string;
  messages: TunnelMessage[];
  participants: TunnelParticipant[];
  prompt: string;
  tunnelPrompt: TunnelPrompt;
  onAnimationEnd: () => void;
  onAcceptPrompt?: () => void;
  onClose: () => void;
  onDismissPrompt?: () => void;
  onInputChange: (value: string) => void;
  onInputKeyDown: KeyboardEventHandler<HTMLTextAreaElement>;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

type TunnelPromptCardProps = {
  prompt: TunnelPrompt;
  onAccept: () => void;
  onDismiss: () => void;
};

export function PrototypeTunnelPromptCard({
  onAccept,
  onDismiss,
  prompt,
}: TunnelPromptCardProps): ReactElement {
  return (
    <aside className="proto-tunnel-prompt" aria-label="Proposition Tunnel">
      <span>{prompt.source}</span>
      <strong>{prompt.question}</strong>
      <div>
        <button onClick={onAccept} type="button">{prompt.yesLabel}</button>
        <button onClick={onDismiss} type="button">{prompt.noLabel}</button>
      </div>
    </aside>
  );
}

export function PrototypeTunnel({
  closing,
  contextSummary,
  embedded = false,
  input,
  messages,
  onAnimationEnd,
  onAcceptPrompt,
  onClose,
  onDismissPrompt,
  onInputChange,
  onInputKeyDown,
  onSubmit,
  participants,
  prompt,
  tunnelPrompt,
}: TunnelProps): ReactElement {
  const lead = participants[0]!;
  const getParticipant = (participantId: string) => participants.find((participant) => participant.id === participantId);

  return (
    <section
      aria-label="Mode Tunnel"
      aria-modal="true"
      className={`proto-tunnel proto-tunnel--conversation${embedded ? ' proto-tunnel--embedded' : ''}${closing ? ' is-closing' : ''}`}
      onAnimationEnd={(event) => {
        if (!closing || event.animationName !== 'proto-tunnel-out') return;
        onAnimationEnd();
      }}
      role="dialog"
    >
      <button aria-label="Fermer le mode Tunnel" className="proto-tunnel__close" onClick={onClose} type="button">
        <X size={20} />
      </button>
      <header className="proto-tunnel__title">
        <small>Mode Tunnel</small>
        <strong>{contextSummary.whyTunnel}</strong>
      </header>
      <div className="proto-tunnel__body">
        <figure className="proto-tunnel__persona">
          <span>
            <img alt="" src={lead.canonAsset} />
          </span>
          <figcaption>
            <strong>{lead.name}</strong>
            <small>{lead.role}</small>
          </figcaption>
        </figure>
        <section className="proto-tunnel__focus" aria-label="Conversation Tunnel">
          <aside className="proto-tunnel__context" aria-label="Résumé cockpit">
            <span>{contextSummary.surface}</span>
            <strong>{contextSummary.currentObject}</strong>
            <small>{contextSummary.returnTarget}</small>
          </aside>
          <div className="proto-tunnel__thread" aria-label="Fil de conversation">
            {messages.map((message) => {
              const participant = getParticipant(message.participantId);
              const isUser = message.participantId === 'user';
              return (
                <div
                  className={`proto-tunnel__message proto-tunnel__message--${isUser ? 'user' : 'persona'} proto-tunnel__message--${message.kind}`}
                  key={message.id}
                  style={participant ? {'--message-color': participant.personaColor} as CSSProperties : undefined}
                >
                  {!isUser && participant ? <img alt="" src={participant.avatarAsset} /> : null}
                  <p>{message.text}</p>
                </div>
              );
            })}
          </div>
          <article className="proto-tunnel__decision" aria-label="Décision rapide Tunnel">
            <span>{tunnelPrompt.source}</span>
            <strong>{tunnelPrompt.question}</strong>
            <div>
              <button onClick={onAcceptPrompt} type="button">{tunnelPrompt.yesLabel}</button>
              <button onClick={onDismissPrompt} type="button">{tunnelPrompt.noLabel}</button>
            </div>
          </article>
        </section>
      </div>
      <form className="proto-tunnel__composer" onSubmit={onSubmit}>
        <textarea
          aria-label="Écrire dans le tunnel"
          autoFocus
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onInputKeyDown}
          placeholder={prompt}
          rows={4}
          spellCheck={false}
          value={input}
        />
        <button aria-label="Envoyer dans le tunnel" className="proto-action-button proto-action-button--send" disabled={!input.trim()} type="submit">
          <Send size={20} />
        </button>
      </form>
    </section>
  );
}

type OverlayFrameProps = {
  children: ReactNode;
  className: string;
  closing?: boolean;
  onClose: () => void;
};

export function PrototypeOverlayFrame({
  children,
  className,
  closing = false,
  onClose,
}: OverlayFrameProps): ReactElement {
  return (
    <div
      className={`${className}${closing ? ' is-closing' : ''}`}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

export type PrototypeLibraryAction = {
  id: string;
  label: string;
  category: string;
  icon: typeof Command;
  keywords?: string;
  relevant?: boolean;
};

type ActionLibraryProps = {
  actions: PrototypeLibraryAction[];
  categories: string[];
  closing: boolean;
  search: string;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelectAction: (id: string) => void;
};

export function PrototypeActionLibrary({
  actions,
  categories,
  closing,
  onClose,
  onSearchChange,
  onSelectAction,
  search,
}: ActionLibraryProps): ReactElement {
  const normalizedSearch = search.trim().toLocaleLowerCase('fr');
  const filteredActions = normalizedSearch
    ? actions.filter((action) => `${action.label} ${action.keywords ?? ''}`.toLocaleLowerCase('fr').includes(normalizedSearch))
    : actions;

  const renderActions = (items: PrototypeLibraryAction[]): ReactNode => (
    <div className="proto-action-library__list">
      {items.map((action) => {
        const Icon = action.icon;
        return (
          <button key={action.id} onClick={() => onSelectAction(action.id)} type="button">
            <Icon size={18} />
            <span>{action.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <PrototypeOverlayFrame className="proto-action-overlay" closing={closing} onClose={onClose}>
      <aside aria-label="Bibliothèque d’actions" aria-modal="true" className={`proto-action-library${closing ? ' is-closing' : ''}`} role="dialog">
        <header className="proto-action-library__header">
          <div>
            <small>Actions</small>
            <h2>Bibliothèque</h2>
          </div>
          <button aria-label="Fermer la bibliothèque" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <label className="proto-action-library__search">
          <Search size={17} />
          <input
            autoFocus
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Rechercher une fonctionnalité"
            value={search}
          />
        </label>

        {normalizedSearch ? (
          <section className="proto-action-library__section">
            <small>Résultats</small>
            {renderActions(filteredActions)}
          </section>
        ) : (
          <>
            <section className="proto-action-library__section proto-action-library__section--relevant">
              <small>Pertinentes maintenant</small>
              {renderActions(actions.filter((action) => action.relevant))}
            </section>
            {categories.map((category) => {
              const categoryActions = actions.filter((action) => action.category === category && !action.relevant);
              if (categoryActions.length === 0) return null;
              return (
                <section className="proto-action-library__section" key={category}>
                  <small>{category}</small>
                  {renderActions(categoryActions)}
                </section>
              );
            })}
          </>
        )}
      </aside>
    </PrototypeOverlayFrame>
  );
}

export type PrototypeShortcutGroup = {
  label: string;
  items: ReadonlyArray<{
    keys: string;
    label: string;
  }>;
};

type ShortcutsProps = {
  closing: boolean;
  groups: ReadonlyArray<PrototypeShortcutGroup>;
  onClose: () => void;
  onClosed: () => void;
};

export function PrototypeShortcuts({
  closing,
  groups,
  onClose,
  onClosed,
}: ShortcutsProps): ReactElement {
  return (
    <PrototypeOverlayFrame className="proto-shortcuts-overlay" closing={closing} onClose={onClose}>
      <section
        aria-label="Raccourcis clavier"
        aria-modal="true"
        className={`proto-shortcuts${closing ? ' is-closing' : ''}`}
        onAnimationEnd={(event) => {
          if (!closing || event.animationName !== 'proto-shortcuts-out') return;
          onClosed();
        }}
        role="dialog"
      >
        <button aria-label="Fermer les raccourcis" className="proto-shortcuts__close" onClick={onClose} type="button">
          <X size={18} />
        </button>
        <header className="proto-shortcuts__header">
          <span>
            <Keyboard size={22} />
          </span>
          <small>Raccourcis</small>
          <strong>Les commandes du cockpit</strong>
        </header>
        <div className="proto-shortcuts__grid">
          {groups.map((group) => (
            <section key={group.label}>
              <h2>{group.label}</h2>
              <ul>
                {group.items.map((item) => (
                  <li key={`${group.label}-${item.keys}`}>
                    <kbd>{item.keys}</kbd>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>
    </PrototypeOverlayFrame>
  );
}
