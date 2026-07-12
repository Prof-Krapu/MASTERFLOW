import {
  Bell,
  BookOpen,
  Boxes,
  Check,
  CircleHelp,
  Clapperboard,
  Command,
  FileText,
  FolderKanban,
  GraduationCap,
  History,
  LoaderCircle,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  Network,
  PackageOpen,
  Palette,
  Pencil,
  Plus,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {
  CSSProperties,
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react';
import type {ActionRegistryEntry, CurrentContext, Job, ValidationInboxItem} from '@masterflow/shared';

import {getCurrentContext, getJobs, getValidationInboxItems} from './api';
import masterflexAsset from './assets/masterflex-ui-v2.png';
import profKrapuAsset from './assets/profkrapu-ui-v2.png';
import './current-ui-demo.css';
import {
  PrototypeActionLibrary,
  PrototypeActionRail,
  PrototypeCommandDock,
  PrototypeNavigationRail,
  PrototypeOverlayFrame,
  PrototypeShortcuts,
  PrototypeSystemChrome,
  PrototypeTunnel,
} from './ui-reset/prototype-shell-components';
import type {
  PrototypeActionSuggestion,
  PrototypeLibraryAction,
  PrototypeModeGroup,
  PrototypeSearchResult,
  PrototypeSystemPanel,
} from './ui-reset/prototype-shell-components';
import {prototypeShortcutGroups} from './ui-reset/prototype-shortcut-registry';
import {resolveKeyboardToggle, resolveMicroToggle} from './ui-reset/prototype-ui-state-registry';
import {resolveCycledShortcutDestination, usePrototypeShortcuts} from './ui-reset/use-prototype-shortcuts';
import type {PrototypeDockPanel, PrototypeViewMode} from './ui-reset/use-prototype-shortcuts';

type DemoMode =
  | 'home'
  | 'character'
  | 'project'
  | 'teaching'
  | 'learn'
  | 'story'
  | 'da'
  | 'inventory'
  | 'companions';

type AccessLevel = 'student' | 'teacher' | 'supervision' | 'admin' | 'godmode';
type ShellProfileId = 'masterflex' | 'profkrapu';

type RuntimeBridgeState = {
  context: CurrentContext | null;
  inboxItems: ValidationInboxItem[];
  jobs: Job[];
  status: 'prototype' | 'runtime' | 'degraded';
  error: string | null;
};

const accessLevels = [
  {id: 'student', label: 'Élève', icon: UserRound},
  {id: 'teacher', label: 'Prof', icon: GraduationCap},
  {id: 'supervision', label: 'Supervision', icon: Monitor},
  {id: 'admin', label: 'Admin', icon: ShieldCheck},
  {id: 'godmode', label: 'GodMode', icon: Sparkles},
] as const;

const modeIcons = {
  home: Command,
  character: UserRound,
  project: Boxes,
  teaching: GraduationCap,
  learn: BookOpen,
  story: FileText,
  da: Palette,
  inventory: PackageOpen,
  companions: MessageCircle,
} as const;

const fallbackModeGroups: PrototypeModeGroup[] = [
  {
    label: 'Projet actif',
    kind: 'project',
    modes: [{id: 'project', label: 'Project', icon: Boxes, featured: true}],
  },
  {
    label: 'Expériences',
    kind: 'experience',
    modes: [
      {id: 'teaching', label: 'Teaching', icon: GraduationCap},
      {id: 'learn', label: 'Learn', icon: BookOpen},
    ],
  },
  {
    label: 'Studios',
    kind: 'studios',
    modes: [
      {id: 'story', label: 'MasterStory', icon: FileText},
      {id: 'da', label: 'DA Studio', icon: Palette},
    ],
  },
  {
    label: 'Personnel',
    kind: 'personal',
    modes: [
      {id: 'inventory', label: 'Inventory', icon: PackageOpen},
      {id: 'companions', label: 'Companions', icon: MessageCircle},
    ],
  },
];

const profileMap: Record<ShellProfileId, {
  avatar: string;
  defaultPunchline: string;
  mobileLabel: string;
  name: string;
  theme: {
    accent: string;
    accentDeep: string;
    support: string;
    user: string;
  };
  tunnelLine: string;
  tunnelPrompt: string;
}> = {
  masterflex: {
    avatar: masterflexAsset,
    defaultPunchline: 'Plus croustillant qu’un Corn Flakes',
    mobileLabel: 'MasterFlex',
    name: 'MasterFlex',
    theme: {
      accent: '#ff6a3a',
      accentDeep: '#9f2f20',
      support: '#3979e8',
      user: '#3979e8',
    },
    tunnelLine: 'On pose le pad et on explique.',
    tunnelPrompt: 'Demande à MasterFlex de développer le point en cours',
  },
  profkrapu: {
    avatar: profKrapuAsset,
    defaultPunchline: 'Précision source, troll pédagogique.',
    mobileLabel: 'ProfKrapu',
    name: 'ProfKrapu',
    theme: {
      accent: '#ec5aa6',
      accentDeep: '#912958',
      support: '#60b6f0',
      user: '#52b36c',
    },
    tunnelLine: 'On vérifie avant de faire le malin.',
    tunnelPrompt: 'Demande à ProfKrapu de clarifier scientifiquement',
  },
};

const historyItems = [
  {
    id: 'shell',
    speaker: 'MASTERBUILD',
    summary: 'Shell/Dock est le premier raccord UI.',
    detail: 'On promeut la navigation, la system bar et le dock avant Home, persona et skilltree.',
  },
  {
    id: 'runtime',
    speaker: 'Runtime',
    summary: 'Lecture backend optionnelle.',
    detail: 'Le prototype fonctionne sans backend, puis enrichit modes, actions, jobs et inbox quand le runtime répond.',
  },
  {
    id: 'risk',
    speaker: 'MasterFlex',
    summary: 'Pas de bouton mytho.',
    detail: 'Une action visible peut expliquer ou préparer, mais aucune action sensible ne part depuis une suggestion.',
  },
];

const fallbackSuggestions: PrototypeActionSuggestion[] = [
  {id: 'resume', label: 'Reprendre', icon: MessageCircle},
  {id: 'save', label: 'Sauvegarder', icon: Save},
  {id: 'edit', label: 'Modifier', icon: Pencil},
  {id: 'history', label: 'Historique', icon: History},
  {id: 'export', label: 'Exporter', icon: Upload},
];

const libraryActions: PrototypeLibraryAction[] = [
  {id: 'open-project', label: 'Ouvrir un projet', category: 'Projet', icon: FolderKanban, relevant: true},
  {id: 'resume', label: 'Reprendre le contexte', category: 'Projet', icon: MessageCircle, relevant: true},
  {id: 'preflight', label: 'Préflight action sensible', category: 'Sécurité', icon: ShieldCheck, relevant: true},
  {id: 'save', label: 'Sauvegarder', category: 'Outils', icon: Save},
  {id: 'share', label: 'Partager', category: 'Partage', icon: Send},
  {id: 'new', label: 'Nouveau', category: 'Création', icon: Plus},
  {id: 'export', label: 'Exporter', category: 'Partage', icon: Upload},
  {id: 'resource', label: 'Chercher une ressource', category: 'Ressources', icon: PackageOpen},
  {id: 'course', label: 'Trouver un cours', category: 'Ressources', icon: BookOpen},
];

const quickSearchItems: PrototypeSearchResult[] = [
  {id: 'teacher', label: 'Chercher un prof', detail: 'Personnes', icon: GraduationCap},
  {id: 'resource', label: 'Chercher une ressource', detail: 'Ressources', icon: PackageOpen},
  {id: 'course', label: 'Trouver un cours', detail: 'Cours', icon: BookOpen},
  {id: 'project', label: 'Ouvrir un projet', detail: 'Projets', icon: FolderKanban},
  {id: 'document', label: 'Chercher un document', detail: 'Documents', icon: FileText},
  {id: 'video', label: 'Chercher une vidéo', detail: 'Médias', icon: Clapperboard},
  {id: 'subject', label: 'Chercher un sujet', detail: 'Sujets', icon: Network},
  {id: 'validation', label: 'Voir les décisions', detail: 'Validation', icon: Check},
];

const runtimeModeAliases: Record<string, DemoMode> = {
  course: 'teaching',
  da: 'da',
  da_studio: 'da',
  daStudio: 'da',
  inventory: 'inventory',
  learn: 'learn',
  learning: 'learn',
  narrative: 'story',
  project: 'project',
  story: 'story',
  teaching: 'teaching',
  workspace: 'project',
  companions: 'companions',
};

function MasterflowMark({className}: {className: string}): ReactElement {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 64 64">
      <path d="M8 48 18 14l14 25 14-25 10 34H44l-3-12-9 15-9-15-3 12Z" fill="var(--proto-accent)" />
      <path d="m37 19 18 10-18 10 4-10Z" fill="var(--proto-user-color)" />
      <circle cx="49" cy="46" fill="var(--proto-user-color)" r="4" />
    </svg>
  );
}

function usePresence<T>(value: T | null, duration = 240): {closing: boolean; renderedValue: T | null} {
  const [renderedValue, setRenderedValue] = useState<T | null>(value);

  useEffect(() => {
    if (value !== null) {
      setRenderedValue(value);
      return;
    }
    if (renderedValue === null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRenderedValue(null);
      return;
    }
    const timer = window.setTimeout(() => setRenderedValue(null), duration);
    return () => window.clearTimeout(timer);
  }, [duration, renderedValue, value]);

  return {
    closing: value === null && renderedValue !== null,
    renderedValue,
  };
}

function getQuickSearchResults(query: string): PrototypeSearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  if (!normalizedQuery) return quickSearchItems.slice(0, 6);
  return quickSearchItems.filter((item) => (
    `${item.label} ${item.detail}`.toLocaleLowerCase('fr').includes(normalizedQuery)
  )).slice(0, 6);
}

function actionIconFor(action: ActionRegistryEntry): PrototypeActionSuggestion['icon'] {
  const haystack = `${action.action_id} ${action.label} ${action.ui_surface}`.toLocaleLowerCase('fr');
  if (haystack.includes('context')) return MessageCircle;
  if (haystack.includes('save') || haystack.includes('validate') || haystack.includes('approval')) return Check;
  if (haystack.includes('preflight') || haystack.includes('verify')) return ShieldCheck;
  if (haystack.includes('export') || haystack.includes('send')) return Upload;
  if (haystack.includes('project')) return FolderKanban;
  if (haystack.includes('inventory') || haystack.includes('resource')) return PackageOpen;
  if (haystack.includes('visual') || haystack.includes('da') || haystack.includes('theme')) return Palette;
  if (haystack.includes('story') || haystack.includes('narrative')) return FileText;
  if (haystack.includes('job') || haystack.includes('queue')) return LoaderCircle;
  if (haystack.includes('action')) return Workflow;
  return CircleHelp;
}

function buildRuntimeSuggestions(context: CurrentContext | null): PrototypeActionSuggestion[] {
  if (!context) return fallbackSuggestions;
  return context.available_actions.slice(0, 5).map((action) => ({
    id: action.action_id,
    icon: actionIconFor(action),
    label: action.label,
    onClick: () => undefined,
  }));
}

function buildRuntimeModeGroups(context: CurrentContext | null): PrototypeModeGroup[] {
  if (!context) return fallbackModeGroups;
  const rawModes = [
    ...context.user_runtime_loadout.active_mode_cycle,
    ...context.user_runtime_loadout.available_apps,
  ];
  const visibleModes = new Set<DemoMode>(['home']);
  rawModes.forEach((id) => {
    const mode = runtimeModeAliases[id];
    if (mode) visibleModes.add(mode);
  });
  if (visibleModes.size <= 1) return fallbackModeGroups;
  const modeGroups = fallbackModeGroups
    .map((group) => ({
      ...group,
      modes: group.modes.filter((mode) => visibleModes.has(mode.id as DemoMode)),
    }))
    .filter((group) => group.modes.length > 0);
  return modeGroups.length > 0 ? modeGroups : fallbackModeGroups;
}

function countAttentionJobs(jobs: Job[]): number {
  return jobs.filter((job) => ['queued', 'running', 'pending'].includes(job.status)).length;
}

function countOpenInboxItems(items: ValidationInboxItem[]): number {
  return items.filter((item) => item.status === 'pending').length;
}

function modeTitle(mode: DemoMode): string {
  const labels: Record<DemoMode, string> = {
    home: 'Accueil Shell',
    character: 'Page personnage',
    project: 'Project',
    teaching: 'Teaching',
    learn: 'Learn',
    story: 'MasterStory',
    da: 'DA Studio',
    inventory: 'Inventory',
    companions: 'Companions',
  };
  return labels[mode];
}

export function CurrentUiDemo(): ReactElement {
  const [activeMode, setActiveMode] = useState<DemoMode>('home');
  const [profileId, setProfileId] = useState<ShellProfileId>('masterflex');
  const activeProfile = profileMap[profileId];
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('teacher');
  const [accessOpen, setAccessOpen] = useState(false);
  const [actionLibraryOpen, setActionLibraryOpen] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [appearanceLight, setAppearanceLight] = useState(false);
  const [dockPanel, setDockPanel] = useState<PrototypeDockPanel>('keyboard');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>('shell');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [railOpen, setRailOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsClosing, setShortcutsClosing] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [systemPanel, setSystemPanel] = useState<PrototypeSystemPanel>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [tunnelClosing, setTunnelClosing] = useState(false);
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<PrototypeViewMode>('normal');
  const [runtimeBridge, setRuntimeBridge] = useState<RuntimeBridgeState>({
    context: null,
    error: null,
    inboxItems: [],
    jobs: [],
    status: 'prototype',
  });

  const navigationDestinationRef = useRef<string>('home');
  const modeGroups = useMemo(() => buildRuntimeModeGroups(runtimeBridge.context), [runtimeBridge.context]);
  const modeCycle = useMemo(() => {
    const modes = ['home', 'character'];
    modeGroups.forEach((group) => group.modes.forEach((mode) => modes.push(mode.id)));
    return [...new Set(modes)];
  }, [modeGroups]);
  const commandSuggestions = useMemo(() => buildRuntimeSuggestions(runtimeBridge.context), [runtimeBridge.context]);

  const accessPresence = usePresence(accessOpen ? 'access' : null, 180);
  const actionLibraryPresence = usePresence(actionLibraryOpen ? 'actions' : null, 240);
  const dockPresence = usePresence(dockPanel, 220);
  const historyPresence = usePresence(historyOpen ? 'history' : null, 220);
  const settingsPresence = usePresence(settingsOpen ? 'settings' : null, 240);
  const systemPanelPresence = usePresence(systemPanel, 180);

  const selectMode = useCallback((mode: DemoMode) => {
    navigationDestinationRef.current = mode;
    setActiveMode(mode);
    setRailOpen(false);
    setSettingsOpen(false);
    setActionLibraryOpen(false);
  }, []);

  const closeShortcuts = useCallback(() => {
    if (!shortcutsOpen) return;
    setShortcutsClosing(true);
  }, [shortcutsOpen]);

  const closeTunnel = useCallback(() => {
    if (!tunnelOpen) return;
    setTunnelClosing(true);
  }, [tunnelOpen]);

  const submit = useCallback((event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!input.trim()) return;
    setInput('');
    setHistoryOpen(false);
  }, [input]);

  const submitOnEnter = useCallback((event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    if (!input.trim()) return;
    setInput('');
    setHistoryOpen(false);
  }, [input]);

  useEffect(() => {
    let cancelled = false;
    async function loadRuntime(): Promise<void> {
      try {
        const [context, jobs, inboxItems] = await Promise.all([
          getCurrentContext().catch(() => null),
          getJobs().catch(() => []),
          getValidationInboxItems().catch(() => []),
        ]);
        if (cancelled) return;
        setRuntimeBridge({
          context,
          error: context ? null : 'Runtime indisponible ou non connecté.',
          inboxItems,
          jobs,
          status: context ? 'runtime' : 'degraded',
        });
      } catch (error) {
        if (cancelled) return;
        setRuntimeBridge({
          context: null,
          error: error instanceof Error ? error.message : 'Runtime indisponible.',
          inboxItems: [],
          jobs: [],
          status: 'degraded',
        });
      }
    }
    void loadRuntime();
    return () => {
      cancelled = true;
    };
  }, []);

  usePrototypeShortcuts({
    accessOpen,
    actionLibraryOpen,
    characterOpen: activeMode === 'character',
    closeCharacterPage: () => selectMode('home'),
    closeShortcuts,
    closeTunnel,
    dockPanel,
    historyOpen,
    modeCycle,
    navigateTo: (destination) => selectMode(destination as DemoMode),
    navigationDestinationRef,
    railOpen,
    selectSkillSliderIndex: () => undefined,
    setAccessOpen,
    setActionLibraryOpen,
    setActionSearch,
    setDockPanel,
    setHistoryOpen,
    setQuickSearch,
    setRailOpen,
    setRecording,
    setSettingsOpen,
    setShortcutsClosing,
    setShortcutsOpen,
    setSystemPanelClosed: () => setSystemPanel(null),
    setSystemPanelSearch: () => setSystemPanel('search'),
    setTunnelClosing,
    setTunnelOpen,
    setViewMode,
    settingsOpen,
    shortcutsOpen,
    skillSliderIndex: 0,
    systemPanelOpen: systemPanel !== null,
    tunnelOpen,
    viewMode,
  });

  const queueCount = runtimeBridge.status === 'runtime' ? countAttentionJobs(runtimeBridge.jobs) : 0;
  const notificationCount = runtimeBridge.status === 'runtime' ? countOpenInboxItems(runtimeBridge.inboxItems) : 0;
  const libraryCategories = [...new Set(libraryActions.map((action) => action.category))];
  const themeStyle = {
    '--proto-accent': activeProfile.theme.accent,
    '--proto-accent-deep': activeProfile.theme.accentDeep,
    '--proto-support': activeProfile.theme.support,
    '--proto-user-color': activeProfile.theme.user,
  } as CSSProperties;

  return (
    <main
      className={`proto-shell proto-shell--theme-${appearanceLight ? 'light' : 'dark'} proto-shell--view-${viewMode} proto-shell--dock-${dockPanel ?? 'closed'}${recording ? ' proto-shell--recording' : ''}${railOpen ? ' proto-shell--rail-open' : ''}${tunnelOpen ? ' proto-shell--tunnel-open' : ''}`}
      onPointerDown={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (
          historyOpen
          && !target.closest('.proto-history-panel')
          && !target.closest('.proto-action-button--history')
        ) setHistoryOpen(false);
        if (target.closest('.proto-tunnel') || target.closest('.proto-shortcuts-overlay')) return;
        if (target.closest('.proto-commandbar')) return;
        if (dockPanel) {
          setDockPanel(null);
          setRecording(false);
        }
        if (railOpen && !target.closest('.proto-nav') && !target.closest('.proto-mobile-nav')) setRailOpen(false);
        if (accessOpen && !target.closest('.proto-access')) setAccessOpen(false);
        if (
          systemPanel
          && !target.closest('.proto-systembar__actions')
          && !target.closest('.proto-system-popover')
          && !target.closest('.proto-mobile-nav')
          && !target.closest('.proto-mobile-system-page')
        ) setSystemPanel(null);
      }}
      style={themeStyle}
    >
      <PrototypeNavigationRail
        accessClosing={accessPresence.closing}
        accessLevel={accessLevel}
        accessLevels={accessLevels}
        accessOpen={Boolean(accessPresence.renderedValue)}
        activeMode={activeMode}
        brandMark={<MasterflowMark className="proto-mf-mark" />}
        characterActive={activeMode === 'character'}
        homeActive={activeMode === 'home'}
        mobileLabel={activeProfile.mobileLabel}
        modeGroups={modeGroups}
        onCloseRail={() => setRailOpen(false)}
        onOpenActions={() => {
          setRailOpen(false);
          setActionLibraryOpen(true);
        }}
        onOpenCharacter={() => selectMode('character')}
        onOpenHome={() => selectMode('home')}
        onOpenSettings={() => setSettingsOpen(true)}
        onPointerEnter={() => {
          if (window.matchMedia('(min-width: 761px)').matches) setRailOpen(true);
        }}
        onPointerLeave={() => {
          if (!window.matchMedia('(min-width: 761px)').matches) return;
          setRailOpen(false);
          setAccessOpen(false);
        }}
        onSelectAccess={(id) => {
          setAccessLevel(id as AccessLevel);
          setAccessOpen(false);
        }}
        onSelectMode={(id) => selectMode(id as DemoMode)}
        onToggleAccess={() => setAccessOpen((current) => !current)}
        profileAvatar={activeProfile.avatar}
        profileName={activeProfile.name}
      />

      <section className="proto-workspace" aria-label="Prototype Shell et Command Dock">
        {settingsPresence.renderedValue ? (
          <PrototypeOverlayFrame
            className="proto-overlay"
            closing={settingsPresence.closing}
            onClose={() => setSettingsOpen(false)}
          >
            <div aria-label="Paramètres prototype" aria-modal="true" className={`proto-settings${settingsPresence.closing ? ' is-closing' : ''}`} role="dialog">
              <button aria-label="Fermer les paramètres" className="proto-settings__close" onClick={() => setSettingsOpen(false)} type="button">
                <X size={19} />
              </button>
              <aside className="proto-settings__menu">
                <strong>Paramètres</strong>
                <button className="is-active" type="button"><Palette size={17} /> Interface</button>
                <button type="button"><ShieldCheck size={17} /> Accessibilité</button>
                <button type="button"><Mic size={17} /> Voix</button>
              </aside>
              <div className="proto-settings__content">
                <small>Prototype</small>
                <h2>Profil et thème</h2>
                <section className="proto-profile-switcher" aria-label="Profil actif">
                  <h3>Profil testable</h3>
                  <div>
                    {Object.entries(profileMap).map(([id, profile]) => (
                      <button
                        aria-pressed={profileId === id}
                        key={id}
                        onClick={() => setProfileId(id as ShellProfileId)}
                        type="button"
                      >
                        <span><img alt="" src={profile.avatar} /></span>
                        <strong>{profile.name}</strong>
                        <small>{id === 'profkrapu' ? 'Orchidée rose' : 'Orange / bleu'}</small>
                      </button>
                    ))}
                  </div>
                </section>
                <div className="proto-theme-choice" role="group" aria-label="Thème de l’interface">
                  <button aria-pressed={!appearanceLight} onClick={() => setAppearanceLight(false)} type="button">
                    <Moon size={20} />
                    <span>Sombre</span>
                  </button>
                  <button aria-pressed={appearanceLight} onClick={() => setAppearanceLight(true)} type="button">
                    <Sun size={20} />
                    <span>Clair</span>
                  </button>
                </div>
              </div>
            </div>
          </PrototypeOverlayFrame>
        ) : null}

        {actionLibraryPresence.renderedValue ? (
          <PrototypeActionLibrary
            actions={libraryActions}
            categories={libraryCategories}
            closing={actionLibraryPresence.closing}
            onClose={() => setActionLibraryOpen(false)}
            onSearchChange={setActionSearch}
            onSelectAction={() => setActionLibraryOpen(false)}
            search={actionSearch}
          />
        ) : null}

        {shortcutsOpen ? (
          <PrototypeShortcuts
            closing={shortcutsClosing}
            groups={prototypeShortcutGroups}
            onClose={closeShortcuts}
            onClosed={() => {
              setShortcutsOpen(false);
              setShortcutsClosing(false);
            }}
          />
        ) : null}

        <PrototypeSystemChrome
          appearanceLight={appearanceLight}
          brandMark={<MasterflowMark className="proto-wordmark__mark" />}
          dmCount={0}
          notificationCount={notificationCount}
          onClosePanel={() => setSystemPanel(null)}
          onExit={() => window.location.assign('/')}
          onOpenCharacter={() => selectMode('character')}
          onOpenHome={() => selectMode('home')}
          onQuickSearchChange={setQuickSearch}
          onTogglePanel={(panel) => {
            if (panel === 'search') setQuickSearch('');
            setSystemPanel((current) => current === panel ? null : panel);
          }}
          onToggleRail={() => setRailOpen((current) => !current)}
          onToggleTheme={() => setAppearanceLight((current) => !current)}
          panel={systemPanel}
          panelClosing={systemPanelPresence.closing}
          profileAvatar={activeProfile.avatar}
          profileName={activeProfile.name}
          quickSearch={quickSearch}
          queueCount={queueCount}
          railOpen={railOpen}
          renderedPanel={systemPanelPresence.renderedValue}
          searchResults={getQuickSearchResults(quickSearch)}
        />

        <div className="proto-canvas-empty">
          <section className="mf-room-preview proto-shell-contract" aria-label="Contrat Shell Dock">
            <span className="mf-kicker">
              {runtimeBridge.status === 'runtime' ? 'Runtime branché' : 'Prototype autonome'}
            </span>
            <h1>{modeTitle(activeMode)}</h1>
            <p>
              Tranche P1 : navigation, barre système, actions, clavier, micro, raccourcis et overlays.
              Home, personas et skilltree restent volontairement hors périmètre de ce round.
            </p>
            <div className="mf-room-preview__facts">
              <span>{modeCycle.length} entrées nav</span>
              <span>{commandSuggestions.length} actions</span>
              <span>{runtimeBridge.status}</span>
            </div>
            {runtimeBridge.error ? <p className="proto-shell-contract__note">{runtimeBridge.error}</p> : null}
          </section>
        </div>

        <PrototypeActionRail
          libraryOpen={actionLibraryOpen}
          onOpenLibrary={() => setActionLibraryOpen(true)}
        />

        <PrototypeCommandDock
          dockPanel={dockPanel}
          dockPanelClosing={dockPresence.closing}
          expandedHistoryId={expandedHistoryId}
          historyClosing={historyPresence.closing}
          historyItems={historyItems}
          historyOpen={Boolean(historyPresence.renderedValue)}
          input={input}
          onCloseHistory={() => setHistoryOpen(false)}
          onInputChange={setInput}
          onInputKeyDown={submitOnEnter}
          onSubmit={submit}
          onToggleExpandedHistory={(id) => setExpandedHistoryId((current) => current === id ? null : id)}
          onToggleHistory={() => setHistoryOpen((current) => !current)}
          onToggleKeyboard={() => {
            const nextDock = resolveKeyboardToggle({dockPanel});
            setRecording(nextDock.recording);
            setDockPanel(nextDock.dockPanel);
            setHistoryOpen(nextDock.historyOpen);
          }}
          onToggleMicro={() => {
            const nextDock = resolveMicroToggle({dockPanel});
            setRecording(nextDock.recording);
            setDockPanel(nextDock.dockPanel);
            setHistoryOpen(nextDock.historyOpen);
          }}
          onToggleRecording={() => setRecording((current) => !current)}
          onToggleTranscription={() => setTranscribing((current) => !current)}
          recording={recording}
          renderedDockPanel={dockPresence.renderedValue}
          showSuggestions={Boolean(dockPanel || historyPresence.renderedValue)}
          suggestions={commandSuggestions}
          transcribing={transcribing}
        />

        {tunnelOpen ? (
          <PrototypeTunnel
            avatarAsset={activeProfile.avatar}
            closing={tunnelClosing}
            input={input}
            name={activeProfile.name}
            onAnimationEnd={() => {
              setTunnelOpen(false);
              setTunnelClosing(false);
            }}
            onClose={closeTunnel}
            onInputChange={setInput}
            onInputKeyDown={submitOnEnter}
            onSubmit={submit}
            prompt={activeProfile.tunnelPrompt}
            punchline={activeProfile.defaultPunchline}
            tunnelLine={activeProfile.tunnelLine}
          />
        ) : null}
      </section>
    </main>
  );
}
