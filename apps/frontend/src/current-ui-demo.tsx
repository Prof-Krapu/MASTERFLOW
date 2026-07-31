import {
  BookOpen,
  BriefcaseBusiness,
  Command,
  GraduationCap,
  LayoutDashboard,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import type {FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement} from 'react';
import type {AuthResponse, CurrentContext, Role} from '@masterflow/shared';

import {getCurrentContext, login, setToken} from './api';
import masterflexPortrait from './assets/masterflex-portraits/neutral.png';
import masterflowMark from './assets/masterflow-mark-graff.svg';
import profkrapuPortrait from './assets/profkrapu-portraits/neutral.png';
import './ui-reset/shell-dock-active.css';
import {
  PrototypeCommandDock,
  PrototypeNavigationRail,
  PrototypeSystemChrome,
} from './ui-reset/prototype-shell-components';
import type {
  PrototypeActionSuggestion,
  PrototypeDockPanel,
  PrototypeModeGroup,
  PrototypeSystemPanel,
} from './ui-reset/prototype-shell-components';
import {resolveKeyboardToggle} from './ui-reset/prototype-ui-state-registry';

type ActiveProfile = 'masterflex' | 'profkrapu';

const profiles = {
  masterflex: {name: 'MasterFlex', portrait: masterflexPortrait},
  profkrapu: {name: 'ProfKrapu', portrait: profkrapuPortrait},
} as const;

const roleLabels: Record<Role, string> = {
  student: 'Étudiant',
  teacher: 'Enseignant',
  admin: 'Administrateur',
  godmode: 'Godmode',
};

const modeLabels: Record<string, string> = {
  admin: 'Administration',
  experience: 'Expérience',
  home: 'Accueil',
  inventory: 'Inventory',
  learning: 'Apprendre',
  project: 'Projets',
  story: 'MasterStory',
  teaching: 'Enseigner',
};

const modeIcons: Record<string, typeof Command> = {
  admin: ShieldCheck,
  experience: Sparkles,
  home: LayoutDashboard,
  inventory: BookOpen,
  learning: GraduationCap,
  project: BriefcaseBusiness,
  story: Sparkles,
  teaching: Users,
};

function profileFromContext(context: CurrentContext): ActiveProfile {
  const activeId = context.active_blend?.speaker_persona_id
    ?? context.user_runtime_loadout.available_persona_ids[0]
    ?? '';
  return activeId.toLowerCase().includes('profkrapu') ? 'profkrapu' : 'masterflex';
}

export function CurrentUiDemo(): ReactElement {
  const [accessOpen, setAccessOpen] = useState(false);
  const [appearanceLight, setAppearanceLight] = useState(false);
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [context, setContext] = useState<CurrentContext | null>(null);
  const [dockPanel, setDockPanel] = useState<PrototypeDockPanel>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<PrototypeSystemPanel>(null);
  const [password, setPassword] = useState('');
  const [profileId, setProfileId] = useState<ActiveProfile>('masterflex');
  const [quickSearch, setQuickSearch] = useState('');
  const [railOpen, setRailOpen] = useState(false);
  const [status, setStatus] = useState('Connectez-vous pour charger le contexte réel de MasterFlow.');
  const [username, setUsername] = useState('');

  const profile = profiles[profileId];
  const loadout = context?.user_runtime_loadout ?? null;
  const availableActions = context?.available_actions ?? [];

  const modeGroups = useMemo<PrototypeModeGroup[]>(() => {
    const activeModes = loadout?.active_mode_cycle ?? [];
    if (activeModes.length === 0) {
      return [{label: 'Runtime', kind: 'primary', modes: [
        {id: 'shell', label: 'Connexion requise', icon: Lock, locked: true},
      ]}];
    }
    return [{
      label: 'Modes disponibles',
      kind: 'primary',
      modes: activeModes.map((mode) => ({
        id: mode,
        label: modeLabels[mode] ?? mode,
        icon: modeIcons[mode] ?? Command,
      })),
    }];
  }, [loadout?.active_mode_cycle]);

  const actionSuggestions = useMemo<PrototypeActionSuggestion[]>(() => {
    if (!loadout) return [];
    const preferred = [
      ...loadout.suggested_first_action_ids,
      ...loadout.quick_palette_action_ids,
      ...loadout.default_action_ids,
    ];
    const ids = [...new Set(preferred)];
    return ids
      .map((id) => availableActions.find((action) => action.action_id === id))
      .filter((action): action is NonNullable<typeof action> => action !== undefined)
      .slice(0, 5)
      .map((action) => ({
        id: action.action_id,
        label: action.label,
        icon: Command,
        onClick: () => setStatus(
          `${action.label} est disponible (${action.risk_level}). Consultation uniquement : aucune exécution.`,
        ),
      }));
  }, [availableActions, loadout]);

  const filteredActions = useMemo(() => {
    const query = quickSearch.trim().toLowerCase();
    if (!query) return availableActions;
    return availableActions.filter((action) =>
      `${action.label} ${action.action_id} ${action.ui_surface}`.toLowerCase().includes(query),
    );
  }, [availableActions, quickSearch]);

  const loadRuntimeContext = async (nextAuth: AuthResponse): Promise<void> => {
    const current = await getCurrentContext(nextAuth.token);
    setAuth(nextAuth);
    setContext(current);
    setProfileId(profileFromContext(current));
    setStatus(
      `Contexte chargé depuis le backend : ${current.room.name}, ${current.available_actions.length} action(s) disponible(s).`,
    );
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const nextAuth = await login(username, password);
      await loadRuntimeContext(nextAuth);
      setPassword('');
    } catch (caught) {
      setToken(null);
      setAuth(null);
      setContext(null);
      setError(caught instanceof Error ? caught.message : 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  const refreshContext = async (): Promise<void> => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await loadRuntimeContext(auth);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Contexte indisponible.');
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setToken(null);
    setAuth(null);
    setContext(null);
    setQuickSearch('');
    setInput('');
    setStatus('Session locale fermée. Connectez-vous pour recharger le contexte réel.');
  };

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const query = input.trim();
    if (!query) return;
    if (!context) {
      setStatus('Connexion requise avant de consulter les actions du runtime.');
      return;
    }
    const match = availableActions.find((action) =>
      `${action.label} ${action.action_id}`.toLowerCase().includes(query.toLowerCase()),
    );
    setQuickSearch(query);
    setStatus(match
      ? `${match.label} est disponible (${match.risk_level}). Aucune action n’a été exécutée.`
      : `Aucune action disponible ne correspond à « ${query} ». Aucune action n’a été exécutée.`);
    setInput('');
  };

  const submitOnEnter = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const toggleKeyboard = (): void => {
    const next = resolveKeyboardToggle({dockPanel});
    setDockPanel(next.dockPanel);
  };

  const accessLevels = context
    ? [{id: context.user.role, label: roleLabels[context.user.role], icon: ShieldCheck}]
    : [{id: 'signed-out', label: 'Non connecté', icon: Lock}];

  return (
    <main
      className={`proto-shell proto-shell--theme-${appearanceLight ? 'light' : 'dark'} proto-shell--view-normal proto-shell--dock-${dockPanel ?? 'closed'}${railOpen ? ' proto-shell--rail-open' : ''}`}
      onPointerDown={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (railOpen && !target.closest('.proto-nav') && !target.closest('.proto-mobile-nav')) {
          setRailOpen(false);
        }
      }}
    >
      <PrototypeNavigationRail
        accessClosing={false}
        accessLevel={context?.user.role ?? 'signed-out'}
        accessLevels={accessLevels}
        accessOpen={accessOpen}
        activeMode={loadout?.active_mode_cycle[0] ?? 'shell'}
        brandMark={<img alt="" src={masterflowMark} />}
        characterActive={false}
        homeActive
        mobileLabel={context ? `${context.user.display_name} · ${context.room.name}` : 'Connexion runtime'}
        modeGroups={modeGroups}
        onCloseRail={() => setRailOpen(false)}
        onOpenActions={() => setStatus(
          context
            ? `${availableActions.length} action(s) live dans le loadout courant.`
            : 'Connexion requise pour lire les actions disponibles.',
        )}
        onOpenCharacter={() => setStatus(
          context
            ? `Persona actif fourni par le contexte : ${profile.name}. Changement désactivé dans ce lot read-only.`
            : 'Connexion requise pour charger le persona actif.',
        )}
        onOpenHome={() => setStatus(context ? `Contexte actif : ${context.room.name}.` : 'Connexion requise.')}
        onOpenSettings={() => setStatus('Les réglages ne sont pas modifiés par ce lot read-only.')}
        onPointerEnter={() => setRailOpen(true)}
        onPointerLeave={() => setRailOpen(false)}
        onSelectAccess={() => setStatus('Le rôle et les permissions sont décidés par le backend.')}
        onSelectMode={(mode) => {
          setStatus(`Mode ${modeLabels[mode] ?? mode} présent dans le loadout. Navigation fonctionnelle à venir.`);
          setRailOpen(false);
        }}
        onToggleAccess={() => setAccessOpen((current) => !current)}
        profileAvatar={profile.portrait}
        profileName={profile.name}
      />

      <section className="proto-workspace" aria-label="Shell MasterFlow connecté">
        <PrototypeSystemChrome
          appearanceLight={appearanceLight}
          brandMark={<img alt="" src={masterflowMark} />}
          dmCount={0}
          notificationCount={0}
          onClosePanel={() => setPanel(null)}
          onExit={context ? logout : () => window.location.assign('/')}
          onOpenCharacter={() => setStatus(context
            ? `Persona runtime : ${profile.name}.`
            : 'Connexion requise pour charger le persona runtime.')}
          onOpenHome={() => setStatus(context ? `Room active : ${context.room.name}.` : 'Connexion requise.')}
          onQuickSearchChange={setQuickSearch}
          onTogglePanel={(nextPanel) => setPanel((current) => current === nextPanel ? null : nextPanel)}
          onToggleRail={() => setRailOpen((current) => !current)}
          onToggleTheme={() => setAppearanceLight((current) => !current)}
          panel={panel}
          panelClosing={false}
          profileAvatar={profile.portrait}
          profileName={context?.user.display_name ?? profile.name}
          quickSearch={quickSearch}
          queueCount={0}
          railOpen={railOpen}
          renderedPanel={panel}
          searchResults={filteredActions.slice(0, 5).map((action) => ({
            id: action.action_id,
            label: action.label,
            detail: `${action.status} · ${action.risk_level}`,
            icon: Command,
          }))}
        />

        <section className="runtime-shell" aria-labelledby="runtime-shell-title">
          {!context ? (
            <form className="runtime-login" onSubmit={handleLogin}>
              <img alt="" className="lot3-shell-proof__mark" src={masterflowMark} />
              <p>MasterFlow · runtime local</p>
              <h1 id="runtime-shell-title">Entrer dans votre contexte</h1>
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
              <button disabled={loading} type="submit">{loading ? 'Connexion…' : 'Se connecter'}</button>
              {error ? <span className="runtime-error" role="alert">{error}</span> : null}
              <small>{status}</small>
            </form>
          ) : (
            <div className="runtime-read-model">
              <header className="runtime-read-model__header">
                <div>
                  <p>Contexte backend actif</p>
                  <h1 id="runtime-shell-title">Bonjour {context.user.display_name}</h1>
                  <span>{status}</span>
                </div>
                <button disabled={loading} onClick={() => void refreshContext()} type="button">
                  <RefreshCw size={16} /> {loading ? 'Actualisation…' : 'Actualiser'}
                </button>
              </header>

              <div className="runtime-summary" aria-label="Résumé du contexte runtime">
                <article><small>Room</small><strong>{context.room.name}</strong><span>{loadout?.command_center_scope}</span></article>
                <article><small>Accès</small><strong>{roleLabels[context.user.role]}</strong><span>Décidé par le backend</span></article>
                <article><small>Modes</small><strong>{loadout?.active_mode_cycle.length ?? 0}</strong><span>{loadout?.active_mode_cycle.map((mode) => modeLabels[mode] ?? mode).join(' · ') || 'Aucun'}</span></article>
                <article><small>Actions live</small><strong>{availableActions.length}</strong><span>{loadout?.available_apps.length ?? 0} app(s) disponible(s)</span></article>
              </div>

              <div className="runtime-columns">
                <section aria-labelledby="runtime-actions-title">
                  <div className="runtime-section-title">
                    <h2 id="runtime-actions-title">Actions disponibles</h2>
                    <small>{filteredActions.length}/{availableActions.length}</small>
                  </div>
                  <div className="runtime-action-list">
                    {filteredActions.slice(0, 6).map((action) => (
                      <button
                        key={action.action_id}
                        onClick={() => setStatus(
                          `${action.label} : risque ${action.risk_level}, validation ${String(action.validation_required)}. Consultation uniquement.`,
                        )}
                        type="button"
                      >
                        <Command size={16} />
                        <span><strong>{action.label}</strong><small>{action.ui_surface} · {action.risk_level}</small></span>
                      </button>
                    ))}
                    {filteredActions.length === 0 ? <p>Aucune action ne correspond à la recherche.</p> : null}
                  </div>
                </section>

                <section aria-labelledby="runtime-permissions-title">
                  <div className="runtime-section-title">
                    <h2 id="runtime-permissions-title">Permissions et limites</h2>
                    <ShieldCheck size={17} />
                  </div>
                  <dl className="runtime-permissions">
                    <div><dt>Rôle effectif</dt><dd>{context.user.role}</dd></div>
                    <div><dt>Scope</dt><dd>{loadout?.command_center_scope}</dd></div>
                    <div><dt>Personas</dt><dd>{context.personas.length}</dd></div>
                    <div><dt>Capacités verrouillées</dt><dd>{loadout?.locked_capabilities.length ?? 0}</dd></div>
                  </dl>
                  {(loadout?.locked_capabilities.length ?? 0) > 0 ? (
                    <ul className="runtime-lock-list">
                      {loadout?.locked_capabilities.slice(0, 4).map((capability) => (
                        <li key={capability.capability_id}><Lock size={14} /> {capability.capability_id}</li>
                      ))}
                    </ul>
                  ) : <p className="runtime-clear"><ShieldCheck size={15} /> Aucun verrou supplémentaire exposé.</p>}
                </section>
              </div>
            </div>
          )}
        </section>

        <PrototypeCommandDock
          dockPanel={dockPanel}
          dockPanelClosing={false}
          expandedHistoryId={null}
          historyClosing={false}
          historyItems={[]}
          historyOpen={false}
          input={input}
          onCloseHistory={() => undefined}
          onInputChange={setInput}
          onInputKeyDown={submitOnEnter}
          onSubmit={submit}
          onToggleExpandedHistory={() => undefined}
          onToggleHistory={() => setStatus('Aucun historique n’est chargé dans ce lot read-only.')}
          onToggleKeyboard={toggleKeyboard}
          onToggleMicro={() => setStatus('Le micro ne fait pas partie de ce raccord read-only.')}
          onToggleRecording={() => undefined}
          onToggleTranscription={() => setStatus('La transcription ne fait pas partie de ce raccord read-only.')}
          recording={false}
          renderedDockPanel={dockPanel}
          showSuggestions={actionSuggestions.length > 0}
          suggestions={actionSuggestions}
          transcribing={false}
        />
      </section>
    </main>
  );
}
