import {
  FolderKanban,
  GraduationCap,
  History,
  MessageCircle,
  PackageOpen,
  Pencil,
  Plus,
  Save,
  Send,
  Upload,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import type {CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement} from 'react';

import '../current-ui-demo.css';
import masterflowMark from '../assets/masterflow-mark-graff.svg';
import {
  accessLevels,
  buildPrototypeHomeModes,
  buildPrototypeModeGroups,
  getPrototypeProfile,
  getPrototypeProfileRank,
  getPrototypeThemePalette,
  prototypeProfileIds,
  skillFamilyColors,
} from './prototype-profile-registry';
import type {DemoMode, PrototypeProfileId} from './prototype-profile-registry';
import {
  PrototypeActionLibrary,
  PrototypeActionRail,
  PrototypeCommandDock,
  PrototypeNavigationRail,
  PrototypeOverlayFrame,
  PrototypeShortcuts,
  PrototypeSystemChrome,
  PrototypeTunnel,
} from './prototype-shell-components';
import type {
  PrototypeActionSuggestion,
  PrototypeLibraryAction,
  PrototypeModeGroup,
  PrototypeSystemPanel,
} from './prototype-shell-components';
import {PrototypeCharacterSurface, PrototypeHomeSurface} from './prototype-product-surfaces';
import {PrototypeSkilltreeSurface} from './prototype-skilltree-surface';
import type {PrototypePersonaMoodState, PrototypeSkillArcId, PrototypeSkillFamilyId} from './prototype-skilltree-surface';
import {prototypeShortcutGroups, prototypeShortcutRules} from './prototype-shortcut-registry';
import {
  getActivePrototypeUiStates,
  getTopBlockingPrototypeUiState,
  prototypeUiExclusionGroups,
  prototypeUiStateDefinitions,
  resolveKeyboardToggle,
  resolveMicroToggle,
} from './prototype-ui-state-registry';
import {resolveCycledShortcutDestination, usePrototypeShortcuts} from './use-prototype-shortcuts';
import type {PrototypeDockPanel, PrototypeViewMode} from './use-prototype-shortcuts';
import {componentLabWorkspaces} from './component-lab-workspaces';
import type {ComponentLabWorkspaceId} from './component-lab-workspaces';
import './component-lab.css';

type LabTab = 'navigation' | 'home' | 'persona' | 'system' | 'command' | 'states' | 'overlays' | 'tunnel';
type LabScenario = 'rest' | 'compose' | 'mobile' | 'tunnel' | 'collision';
type CommandDockPreset = 'closed' | 'keyboard' | 'long' | 'history' | 'micro' | 'recording' | 'transcription';
type SkilltreePreset = 'home' | 'overview' | 'mobile';
type LabOverlay = 'actions' | 'settings' | 'shortcuts';

interface ComponentLabProps {
  workspaceId: ComponentLabWorkspaceId;
}

interface PersistedLabWorkspace {
  accessLevel?: string;
  activeMode?: string;
  dockPanel?: PrototypeDockPanel;
  light?: boolean;
  mobile?: boolean;
  profileId?: PrototypeProfileId;
  railOpen?: boolean;
  tab?: LabTab;
}

const labTabs: LabTab[] = ['navigation', 'home', 'persona', 'system', 'command', 'states', 'overlays', 'tunnel'];

function readPersistedLabWorkspace(workspaceId: ComponentLabWorkspaceId): PersistedLabWorkspace {
  try {
    const raw = window.localStorage.getItem(`masterflow.ui-lab.${workspaceId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedLabWorkspace;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const labNavigationCycle = ['home', 'character', 'project', 'teaching', 'learn', 'story', 'da', 'inventory', 'companions'];

const labSuggestions: PrototypeActionSuggestion[] = [
  {id: 'resume', label: 'Reprendre', icon: MessageCircle},
  {id: 'save', label: 'Sauvegarder', icon: Save},
  {id: 'edit', label: 'Modifier', icon: Pencil},
  {id: 'history', label: 'Historique', icon: History},
  {id: 'export', label: 'Exporter', icon: Upload},
];

const labHistory = [
  {
    id: 'context',
    speaker: 'MasterFlow',
    summary: 'Le contexte actif a été repris.',
    detail: 'Projet, profil et dernière action utile restent disponibles dans cette fixture locale.',
  },
  {
    id: 'answer',
    speaker: 'Persona',
    summary: 'Une réponse courte est disponible.',
    detail: 'Le Lab vérifie uniquement le composant et son état développé.',
  },
];

const labActions: PrototypeLibraryAction[] = [
  {id: 'open-project', label: 'Ouvrir un projet', category: 'Projet', icon: FolderKanban, relevant: true},
  {id: 'resume', label: 'Reprendre', category: 'Projet', icon: MessageCircle, relevant: true},
  {id: 'save', label: 'Sauvegarder', category: 'Outils', icon: Save},
  {id: 'share', label: 'Partager', category: 'Partage', icon: Send},
  {id: 'new', label: 'Nouveau', category: 'Création', icon: Plus},
  {id: 'export', label: 'Exporter', category: 'Partage', icon: Upload},
];

const labSearchResults = [
  {id: 'teacher', label: 'Chercher un prof', detail: 'Personnes', icon: GraduationCap},
  {id: 'resource', label: 'Chercher une ressource', detail: 'Ressources', icon: PackageOpen},
  {id: 'project', label: 'Ouvrir un projet', detail: 'Projets', icon: FolderKanban},
  {id: 'message', label: 'Chercher un message', detail: 'Conversation', icon: MessageCircle},
];

const commandDockPresets: Array<{id: CommandDockPreset; label: string}> = [
  {id: 'closed', label: 'Fermé'},
  {id: 'keyboard', label: 'Clavier'},
  {id: 'long', label: 'Texte long'},
  {id: 'history', label: 'Historique'},
  {id: 'micro', label: 'Micro'},
  {id: 'recording', label: 'REC'},
  {id: 'transcription', label: 'Transcription'},
];

const skilltreePresets: Array<{id: SkilltreePreset; label: string}> = [
  {id: 'home', label: 'Profil'},
  {id: 'overview', label: 'Tableau'},
  {id: 'mobile', label: 'Mobile'},
];

const skillFamilyLabels: Record<PrototypeSkillFamilyId, string> = {
  image: 'Image',
  volume: 'Volume',
  system: 'Système',
  story: 'Story',
  soft: 'Soft',
};

function useLabPresence<T>(value: T | null, duration = 240): {
  closing: boolean;
  renderedValue: T | null;
} {
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

export function ComponentLab({workspaceId}: ComponentLabProps): ReactElement {
  const workspace = componentLabWorkspaces[workspaceId];
  const [initialWorkspaceState] = useState(() => readPersistedLabWorkspace(workspaceId));
  const initialProfileId = initialWorkspaceState.profileId
    && prototypeProfileIds.includes(initialWorkspaceState.profileId)
    ? initialWorkspaceState.profileId
    : workspace.defaultProfileId;
  const initialTab = initialWorkspaceState.tab && labTabs.includes(initialWorkspaceState.tab)
    ? initialWorkspaceState.tab
    : 'navigation';
  const [tab, setTab] = useState<LabTab>(initialTab);
  const [profileId, setProfileId] = useState<PrototypeProfileId>(initialProfileId);
  const [light, setLight] = useState(initialWorkspaceState.light ?? false);
  const [mobile, setMobile] = useState(initialWorkspaceState.mobile ?? false);
  const [railOpen, setRailOpen] = useState(initialWorkspaceState.railOpen ?? true);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessLevel, setAccessLevel] = useState(initialWorkspaceState.accessLevel ?? 'teacher');
  const [activeMode, setActiveMode] = useState(initialWorkspaceState.activeMode ?? 'project');
  const [characterOpen, setCharacterOpen] = useState(false);
  const [systemPanel, setSystemPanel] = useState<PrototypeSystemPanel>(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [dockPanel, setDockPanel] = useState<PrototypeDockPanel>(
    Object.prototype.hasOwnProperty.call(initialWorkspaceState, 'dockPanel')
      ? initialWorkspaceState.dockPanel ?? null
      : 'keyboard',
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>('context');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [input, setInput] = useState('');
  const [overlay, setOverlay] = useState<LabOverlay | null>(null);
  const [actionSearch, setActionSearch] = useState('');
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [tunnelClosing, setTunnelClosing] = useState(false);
  const [viewMode, setViewMode] = useState<PrototypeViewMode>('normal');
  const [activeFixtureArcId, setActiveFixtureArcId] = useState<PrototypeSkillArcId | null>(null);
  const [activeFixtureFamilyId, setActiveFixtureFamilyId] = useState<PrototypeSkillFamilyId | null>(null);
  const [skillsOverviewOpen, setSkillsOverviewOpen] = useState(false);
  const navigationDestinationRef = useRef(initialWorkspaceState.activeMode ?? 'project');

  useEffect(() => {
    const snapshot: PersistedLabWorkspace = {
      accessLevel,
      activeMode,
      dockPanel,
      light,
      mobile,
      profileId,
      railOpen,
      tab,
    };
    window.localStorage.setItem(`masterflow.ui-lab.${workspaceId}`, JSON.stringify(snapshot));
  }, [accessLevel, activeMode, dockPanel, light, mobile, profileId, railOpen, tab, workspaceId]);

  const profile = getPrototypeProfile(profileId);
  const profilePalette = getPrototypeThemePalette(profile.defaultThemePaletteId);
  const profileRankTitle = getPrototypeProfileRank(profile).title;
  const labModeGroups = buildPrototypeModeGroups();
  const homePrimaryModes = buildPrototypeHomeModes(['project', 'teaching', 'learn']);
  const homeSecondaryModes = buildPrototypeHomeModes(['story', 'da', 'inventory', 'companions']);
  const labSkillArcs = profile.skillArcs;
  const resolvedFixtureArcId = labSkillArcs.some((arc) => arc.id === activeFixtureArcId)
    ? activeFixtureArcId
    : null;
  const resolvedFixtureArc = labSkillArcs.find((arc) => arc.id === resolvedFixtureArcId) ?? null;
  const fixtureMetric = resolvedFixtureArc?.metrics[0] ?? profile.stats[0]!;
  const resolvedFixtureFamilies = resolvedFixtureArc
    ? Array.from(new Set(resolvedFixtureArc.skills.map((skill) => skill.family)))
    : [];
  const activeFixtureFamily = resolvedFixtureArc
    ? resolvedFixtureFamilies.includes(activeFixtureFamilyId!)
      ? activeFixtureFamilyId
      : resolvedFixtureFamilies[0] ?? null
    : null;
  const fixtureMood = {
    asset: profile.avatarAsset,
    color: profile.personaColor,
    id: 'neutral',
  } satisfies PrototypePersonaMoodState;
  const fixtureSkillSliderIndex = resolvedFixtureArc
    ? labSkillArcs.findIndex((arc) => arc.id === resolvedFixtureArc.id) + 1
    : 0;
  const overlayPresence = useLabPresence(overlay);
  const dockPanelPresence = useLabPresence(dockPanel, 220);
  const historyPresence = useLabPresence(historyOpen ? true : null, 220);
  const systemPanelPresence = useLabPresence(systemPanel, 220);
  const selectFixtureSkillSliderIndex = (nextIndex: number): void => {
    const normalizedIndex = (nextIndex + labSkillArcs.length + 1) % (labSkillArcs.length + 1);
    setSkillsOverviewOpen(false);
    setActiveFixtureFamilyId(null);
    setActiveFixtureArcId(normalizedIndex === 0 ? null : labSkillArcs[normalizedIndex - 1]?.id ?? null);
  };
  const uiStateSnapshot = {
    accessOpen,
    actionLibraryOpen: overlay === 'actions',
    dockPanel,
    historyOpen,
    railOpen,
    recording,
    settingsOpen: overlay === 'settings',
    shortcutsOpen: overlay === 'shortcuts',
    systemPanelOpen: Boolean(systemPanel),
    tunnelOpen,
    viewMode,
  };
  const activeUiStateIds = getActivePrototypeUiStates(uiStateSnapshot);
  const topBlockingUiState = getTopBlockingPrototypeUiState(uiStateSnapshot);
  const activeDestination = characterOpen ? 'character' : activeMode;
  const activeDestinationIndex = labNavigationCycle.indexOf(activeDestination);
  const previousDestination = labNavigationCycle[
    (activeDestinationIndex - 1 + labNavigationCycle.length) % labNavigationCycle.length
  ] ?? 'home';
  const nextDestination = labNavigationCycle[
    (activeDestinationIndex + 1) % labNavigationCycle.length
  ] ?? 'home';
  const shortcutPreviousDestination = resolveCycledShortcutDestination(labNavigationCycle, activeDestination, -1) ?? previousDestination;
  const shortcutNextDestination = resolveCycledShortcutDestination(labNavigationCycle, activeDestination, 1) ?? nextDestination;
  const themeStyle = {
    '--persona-color': profile.personaColor,
    '--proto-accent': profilePalette.color,
    '--proto-accent-deep': profilePalette.deep,
    '--proto-accent-gradient': profilePalette.gradient,
    '--proto-blue': profile.supportColor,
    '--proto-support': profile.supportColor,
    '--proto-user-color': profile.personaColor,
  } as CSSProperties;

  const closeTransientSurfaces = (): void => {
    setAccessOpen(false);
    setExpandedHistoryId('context');
    setHistoryOpen(false);
    setOverlay(null);
    setQuickSearch('');
    setRecording(false);
    setSystemPanel(null);
    setTunnelClosing(false);
    setTunnelOpen(false);
    setTranscribing(false);
  };

  const applyScenario = (scenario: LabScenario): void => {
    closeTransientSurfaces();
    setViewMode('normal');

    if (scenario === 'rest') {
      setTab('navigation');
      setMobile(false);
      setRailOpen(false);
      setDockPanel(null);
      setInput('');
      setCharacterOpen(false);
      setActiveMode('home');
      navigationDestinationRef.current = 'home';
      return;
    }

    if (scenario === 'compose') {
      setTab('command');
      setMobile(false);
      setRailOpen(true);
      setDockPanel('keyboard');
      setInput('Explique-moi ce point sans me refaire un tableau technique.');
      return;
    }

    if (scenario === 'mobile') {
      setTab('system');
      setMobile(true);
      setRailOpen(false);
      setDockPanel(null);
      setSystemPanel('search');
      setQuickSearch('ressource');
      return;
    }

    if (scenario === 'tunnel') {
      setTab('tunnel');
      setMobile(false);
      setRailOpen(true);
      setDockPanel(null);
      setTunnelOpen(true);
      setInput('Développe le point courant en mode confort.');
      return;
    }

    setTab('states');
    setMobile(false);
    setRailOpen(true);
    setDockPanel('keyboard');
    setHistoryOpen(true);
    setOverlay('actions');
    setInput('État volontairement chargé pour tester les priorités.');
  };

  const applyCommandDockPreset = (preset: CommandDockPreset): void => {
    closeTransientSurfaces();
    setTab('command');
    setMobile(false);
    setRailOpen(true);
    setViewMode('normal');

    if (preset === 'closed') {
      setDockPanel(null);
      setInput('');
      return;
    }

    if (preset === 'micro' || preset === 'recording') {
      setDockPanel('micro');
      setRecording(preset === 'recording');
      setInput('');
      return;
    }

    setDockPanel('keyboard');
    setRecording(false);

    if (preset === 'long') {
      setInput('Je veux une réponse longue, confortable, avec assez de place pour relire ce que j’écris avant de l’envoyer. Là on vérifie surtout que le champ ne redevient pas une micro-boîte pénible.');
      return;
    }

    if (preset === 'history') {
      setHistoryOpen(true);
      setExpandedHistoryId('answer');
      setInput('Reprends ce qu’on vient de dire.');
      return;
    }

    if (preset === 'transcription') {
      setTranscribing(true);
      setInput('La dictée remplit le clavier, mais ce n’est pas le micro conversationnel.');
      return;
    }

    setInput('Écrire à MasterFlow');
  };

  const openSkilltreeArc = (arcId: PrototypeSkillArcId): void => {
    closeTransientSurfaces();
    setTab('persona');
    setMobile(false);
    setRailOpen(true);
    setCharacterOpen(true);
    setSkillsOverviewOpen(false);
    setActiveFixtureFamilyId(null);
    setActiveFixtureArcId(arcId);
  };

  const applySkilltreePreset = (preset: SkilltreePreset): void => {
    closeTransientSurfaces();
    setTab('persona');
    setRailOpen(true);
    setCharacterOpen(true);

    if (preset === 'mobile') {
      setMobile(true);
      setSkillsOverviewOpen(false);
      setActiveFixtureFamilyId(null);
      setActiveFixtureArcId(labSkillArcs[0]?.id ?? null);
      return;
    }

    setMobile(false);
    setActiveFixtureFamilyId(null);
    setActiveFixtureArcId(null);
    setSkillsOverviewOpen(preset === 'overview');
  };

  const closeTunnel = (): void => {
    if (!tunnelOpen || tunnelClosing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTunnelClosing(false);
      setTunnelOpen(false);
      return;
    }
    setTunnelClosing(true);
  };

  const finishTunnelClose = (): void => {
    setTunnelClosing(false);
    setTunnelOpen(false);
  };

  const navigateLab = (destination: string): void => {
    navigationDestinationRef.current = destination;
    setTab('navigation');
    if (destination === 'character') {
      setCharacterOpen(true);
      return;
    }
    setCharacterOpen(false);
    setActiveMode(destination);
  };

  usePrototypeShortcuts({
    accessOpen,
    actionLibraryOpen: overlay === 'actions',
    characterOpen,
    closeCharacterPage: () => setCharacterOpen(false),
    closeShortcuts: () => setOverlay(null),
    closeTunnel,
    dockPanel,
    historyOpen,
    modeCycle: labNavigationCycle,
    navigateTo: navigateLab,
    navigationDestinationRef,
    railOpen,
    selectSkillSliderIndex: selectFixtureSkillSliderIndex,
    setAccessOpen,
    setActionLibraryOpen: (value) => {
      const next = typeof value === 'function' ? value(overlay === 'actions') : value;
      setOverlay(next ? 'actions' : null);
    },
    setActionSearch,
    setDockPanel,
    setHistoryOpen,
    setQuickSearch,
    setRailOpen,
    setRecording,
    setSettingsOpen: (value) => {
      const next = typeof value === 'function' ? value(overlay === 'settings') : value;
      setOverlay(next ? 'settings' : null);
    },
    setShortcutsClosing: () => undefined,
    setShortcutsOpen: (value) => {
      const next = typeof value === 'function' ? value(overlay === 'shortcuts') : value;
      setOverlay(next ? 'shortcuts' : null);
    },
    setSystemPanelClosed: () => setSystemPanel(null),
    setSystemPanelSearch: () => {
      setTab('system');
      setSystemPanel((current) => current === 'search' ? null : 'search');
    },
    setTunnelClosing,
    setTunnelOpen: (value) => {
      const next = typeof value === 'function' ? value(tunnelOpen) : value;
      setTunnelOpen(next);
      if (next) setTab('tunnel');
    },
    setViewMode,
    settingsOpen: overlay === 'settings',
    shortcutsOpen: overlay === 'shortcuts',
    skillSliderIndex: fixtureSkillSliderIndex,
    systemPanelOpen: Boolean(systemPanel),
    tunnelOpen,
    viewMode,
  });

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!input.trim()) return;
    setInput('');
  };

  const submitOnEnter = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const renderBrandMark = (className: string): ReactElement => (
    <img alt="" className={className} src={masterflowMark} />
  );

  return (
    <main
      className={`proto-shell proto-shell--theme-${light ? 'light' : 'dark'} proto-shell--view-${viewMode} ui-lab${mobile ? ' ui-lab--mobile' : ''}${railOpen ? ' proto-shell--rail-open' : ''}${tunnelOpen ? ' proto-shell--tunnel-open' : ''}`}
      style={themeStyle}
    >
      <header className="ui-lab__toolbar">
        <div className="ui-lab__workspaces" aria-label="Espaces de travail">
          {(Object.keys(componentLabWorkspaces) as ComponentLabWorkspaceId[]).map((id) => (
            <a aria-current={workspaceId === id ? 'page' : undefined} href={`/ui-lab/${id}`} key={id}>
              {componentLabWorkspaces[id].label}
            </a>
          ))}
        </div>
        <strong>{workspace.owner} Lab</strong>
        <nav aria-label="Composants">
          {labTabs.map((item) => (
            <button aria-pressed={tab === item} key={item} onClick={() => setTab(item)} type="button">{item}</button>
          ))}
        </nav>
        <div className="ui-lab__scenarios" aria-label="Scénarios rapides">
          <button onClick={() => applyScenario('rest')} type="button">Repos</button>
          <button onClick={() => applyScenario('compose')} type="button">Édition</button>
          <button onClick={() => applyScenario('mobile')} type="button">Mobile</button>
          <button onClick={() => applyScenario('tunnel')} type="button">Tunnel</button>
          <button onClick={() => applyScenario('collision')} type="button">Conflit</button>
        </div>
        <div className="ui-lab__controls">
          <button
            onClick={() => {
              const currentIndex = prototypeProfileIds.indexOf(profileId);
              setProfileId(prototypeProfileIds[(currentIndex + 1) % prototypeProfileIds.length] ?? 'masterflex');
            }}
            type="button"
          >
            {profile.name}
          </button>
          <button onClick={() => setLight((current) => !current)} type="button">{light ? 'Clair' : 'Sombre'}</button>
          <button onClick={() => setMobile((current) => !current)} type="button">{mobile ? '390 px' : 'Desktop'}</button>
        </div>
      </header>

      <section className="ui-lab__stage" aria-label={`Aperçu ${tab}`}>
        {tab === 'navigation' ? (
          <>
            <PrototypeNavigationRail
              accessClosing={false}
              accessLevel={accessLevel}
              accessLevels={accessLevels}
              accessOpen={accessOpen}
              activeMode={activeMode}
              brandMark={renderBrandMark('proto-mf-mark')}
              characterActive={characterOpen}
              homeActive={!characterOpen && activeMode === 'home'}
              mobileLabel={profile.name}
              modeGroups={labModeGroups}
              onCloseRail={() => setRailOpen(false)}
              onOpenActions={() => setOverlay('actions')}
              onOpenCharacter={() => navigateLab('character')}
              onOpenHome={() => navigateLab('home')}
              onOpenSettings={() => setOverlay('settings')}
              onPointerEnter={() => setRailOpen(true)}
              onPointerLeave={() => undefined}
              onSelectAccess={(id) => {
                setAccessLevel(id);
                setAccessOpen(false);
              }}
              onSelectMode={navigateLab}
              onToggleAccess={() => setAccessOpen((current) => !current)}
              profileAvatar={profile.avatarAsset}
              profileName={profile.name}
            />

            <aside className="ui-lab__nav-fixture" aria-label="Fixture navigation clavier">
              <small>Fixture navigation</small>
              <strong>{activeDestination === 'character' ? 'Persona' : activeDestination}</strong>
              <p>
                <span>↑ {shortcutPreviousDestination}</span>
                <span>↓ {shortcutNextDestination}</span>
              </p>
              <div className="ui-lab__nav-cycle" aria-label="Cycle raccourci">
                {labNavigationCycle.map((destination) => (
                  <button
                    aria-pressed={activeDestination === destination}
                    key={destination}
                    onClick={() => navigateLab(destination)}
                    type="button"
                  >
                    {destination === 'character' ? 'persona' : destination}
                  </button>
                ))}
              </div>
            </aside>
          </>
        ) : null}

        {tab === 'home' ? (
          <div className="proto-canvas-empty ui-lab__real-home">
            <PrototypeHomeSurface
              copy={{
                body: profile.modePunchlines.home ?? profile.defaultPunchline,
                eyebrow: profile.defaultPunchline,
                title: profile.displayName === 'Malex' ? 'Oh, te revoilà toi.' : `Bonjour ${profile.displayName}.`,
              }}
              onSelectMode={(mode) => {
                setActiveMode(mode);
                setCharacterOpen(false);
                setTab('navigation');
              }}
              primaryModes={homePrimaryModes}
              secondaryModes={homeSecondaryModes}
            />
          </div>
        ) : null}

        {tab === 'persona' ? (
          <>
            <aside className="ui-lab__skilltree-fixture" aria-label="Banc de test Skilltree">
              <small>Skilltree / Galaxy</small>
              <strong>{skillsOverviewOpen ? 'tableau complet' : resolvedFixtureArc?.label ?? 'profil central'}</strong>
              <div className="ui-lab__skilltree-fixture-row">
                {skilltreePresets.map((preset) => (
                  <button key={preset.id} onClick={() => applySkilltreePreset(preset.id)} type="button">
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="ui-lab__skilltree-fixture-row" aria-label="Galaxies">
                {labSkillArcs.map((arc) => (
                  <button
                    aria-pressed={resolvedFixtureArc?.id === arc.id}
                    key={arc.id}
                    onClick={() => openSkilltreeArc(arc.id)}
                    style={{'--fixture-node-color': arc.color} as CSSProperties}
                    type="button"
                  >
                    {arc.label}
                  </button>
                ))}
              </div>
              {resolvedFixtureArc ? (
                <div className="ui-lab__skilltree-fixture-row" aria-label="Familles de skills">
                  {resolvedFixtureFamilies.map((family) => (
                    <button
                      aria-pressed={activeFixtureFamily === family}
                      key={family}
                      onClick={() => setActiveFixtureFamilyId(family)}
                      style={{'--fixture-node-color': skillFamilyColors[family]} as CSSProperties}
                      type="button"
                    >
                      {skillFamilyLabels[family]}
                    </button>
                  ))}
                </div>
              ) : null}
            </aside>
            <PrototypeCharacterSurface
              canonAlt={profile.canonAlt}
              canonAsset={profile.canonAsset}
              closing={false}
              galaxyOpen={Boolean(resolvedFixtureArcId)}
              inventoryItems={profile.inventoryConnections.map((item) => ({
                color: item.color,
                count: item.count,
                icon: item.icon,
                id: item.id,
                label: item.label,
              }))}
              name={profile.name}
              onAnimationEnd={() => undefined}
              onClose={() => setTab('navigation')}
              profileId={profileId}
              punchline={profile.defaultPunchline}
              rankTitle={profileRankTitle}
              skillsOverviewOpen={skillsOverviewOpen}
            >
              <PrototypeSkilltreeSurface
                activePersonaMood={fixtureMood}
                activePersonaStat={fixtureMetric}
                activeProfileName={profile.name}
                activeSkillArcs={labSkillArcs}
                activeSkillFamily={activeFixtureFamily}
                displayedPersonaMood={fixtureMood}
                onSelectArc={(arcId) => {
                  setSkillsOverviewOpen(false);
                  setActiveFixtureFamilyId(null);
                  setActiveFixtureArcId(arcId);
                }}
                onSelectSkillSliderIndex={selectFixtureSkillSliderIndex}
                personaDisplayValue={fixtureMetric.value}
                portraitLayers={{current: fixtureMood, previous: null}}
                selectedSkillArc={resolvedFixtureArc}
                shortLabels={{[fixtureMetric.id]: fixtureMetric.label}}
                skillFamilyColors={skillFamilyColors}
                skillGalaxyOpen={Boolean(resolvedFixtureArc)}
                skillSliderIndex={fixtureSkillSliderIndex}
                skillsOverviewOpen={skillsOverviewOpen}
              />
            </PrototypeCharacterSurface>
          </>
        ) : null}

        {tab === 'system' ? (
          <PrototypeSystemChrome
            appearanceLight={light}
            brandMark={renderBrandMark('proto-wordmark__mark')}
            onClosePanel={() => setSystemPanel(null)}
            onExit={() => setSystemPanel(null)}
            onOpenCharacter={() => undefined}
            onOpenHome={() => setActiveMode('home')}
            onQuickSearchChange={setQuickSearch}
            onTogglePanel={(panel) => {
              if (panel === 'search') setQuickSearch('');
              setSystemPanel((current) => current === panel ? null : panel);
            }}
            onToggleRail={() => setRailOpen((current) => !current)}
            onToggleTheme={() => setLight((current) => !current)}
            panel={systemPanel}
            panelClosing={systemPanelPresence.closing}
            profileAvatar={profile.avatarAsset}
            profileName={profile.name}
            quickSearch={quickSearch}
            railOpen={railOpen}
            renderedPanel={systemPanelPresence.renderedValue}
            searchResults={labSearchResults}
          />
        ) : null}

        {tab === 'command' ? (
          <>
            <aside className="ui-lab__command-fixture" aria-label="Banc de test clavier et micro">
              <small>Command Dock</small>
              <strong>{dockPanel ? dockPanel : 'fermé'}{recording ? ' · REC' : ''}{transcribing ? ' · dictée' : ''}</strong>
              <p>Entrée envoie. Shift+Entrée ajoute une ligne. Le micro conversationnel reste séparé de la transcription.</p>
              <div>
                {commandDockPresets.map((preset) => (
                  <button key={preset.id} onClick={() => applyCommandDockPreset(preset.id)} type="button">
                    {preset.label}
                  </button>
                ))}
              </div>
            </aside>
            <PrototypeActionRail libraryOpen={overlay === 'actions'} onOpenLibrary={() => setOverlay('actions')} />
            <PrototypeCommandDock
              dockPanel={dockPanel}
              dockPanelClosing={dockPanelPresence.closing}
              expandedHistoryId={expandedHistoryId}
              historyClosing={historyPresence.closing}
              historyItems={labHistory}
              historyOpen={historyOpen}
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
              renderedDockPanel={dockPanelPresence.renderedValue}
              showSuggestions={Boolean(dockPanel || historyOpen)}
              suggestions={labSuggestions}
              transcribing={transcribing}
            />
          </>
        ) : null}

        {tab === 'states' ? (
          <section className="ui-lab__states" aria-label="États globaux UI">
            <header>
              <small>Machine d’état prototype</small>
              <h2>Qui est ouvert, qui bloque, qui ferme quoi.</h2>
              <p>{topBlockingUiState ? `${topBlockingUiState.label} bloque l’arrière-plan.` : 'Aucune surface bloquante active.'}</p>
            </header>
            <div className="ui-lab__state-grid">
              {prototypeUiStateDefinitions.map((state) => (
                <article
                  className={activeUiStateIds.includes(state.id) ? 'is-active' : undefined}
                  key={state.id}
                >
                  <small>{state.family}</small>
                  <strong>{state.label}</strong>
                  <span>{state.closesOnEscape ? 'Esc' : 'manuel'} · {state.closesOnOutsideClick ? 'clic extérieur' : 'pas clic extérieur'}</span>
                </article>
              ))}
            </div>
            <aside className="ui-lab__state-rules">
              {prototypeUiExclusionGroups.map((group) => (
                <div key={group.id}>
                  <strong>{group.label}</strong>
                  <span>{group.states.join(' · ')}</span>
                </div>
              ))}
            </aside>
            <section className="ui-lab__shortcut-matrix" aria-label="Raccourcis clavier prototype">
              <header>
                <small>Raccourcis</small>
                <strong>Table canonique active</strong>
              </header>
              <div>
                {prototypeShortcutRules.map((rule) => (
                  <article key={rule.id}>
                    <kbd>{rule.keys}</kbd>
                    <span>
                      <strong>{rule.label}</strong>
                      <small>{rule.behavior}</small>
                    </span>
                    <em>{rule.textTarget === 'blocked' ? 'hors champ texte' : rule.textTarget === 'textarea-only' ? 'textarea' : 'global'}</em>
                  </article>
                ))}
              </div>
            </section>
          </section>
        ) : null}

        {tab === 'overlays' ? (
          <div className="ui-lab__overlay-launchers">
            <button onClick={() => setOverlay('settings')} type="button">Paramètres</button>
            <button onClick={() => setOverlay('actions')} type="button">Actions</button>
            <button onClick={() => setOverlay('shortcuts')} type="button">Raccourcis</button>
          </div>
        ) : null}

        {tab === 'tunnel' || tunnelOpen ? (
          <PrototypeTunnel
            avatarAsset={profile.avatarAsset}
            closing={tunnelClosing}
            input={input}
            name={profile.name}
            onAnimationEnd={finishTunnelClose}
            onClose={closeTunnel}
            onInputChange={setInput}
            onInputKeyDown={submitOnEnter}
            onSubmit={submit}
            prompt={profile.tunnelPrompt}
            punchline={profile.defaultPunchline}
            tunnelLine={profile.tunnelLine}
          />
        ) : null}
      </section>

      <aside className="ui-lab__snapshot" aria-label="État courant du Lab">
        <small>{workspace.label} · espace persistant</small>
        <strong>{profile.name} · {light ? 'clair' : 'sombre'} · {mobile ? '390 px' : 'desktop'}</strong>
        <span>{tab} · {activeDestination === 'character' ? 'persona' : activeDestination}</span>
        <div>
          {(activeUiStateIds.length ? activeUiStateIds : ['repos']).slice(0, 5).map((stateId) => (
            <i key={stateId}>{stateId}</i>
          ))}
        </div>
      </aside>

      {overlayPresence.renderedValue === 'actions' ? (
        <PrototypeActionLibrary
          actions={labActions}
          categories={['Projet', 'Création', 'Partage', 'Outils']}
          closing={overlayPresence.closing}
          onClose={() => setOverlay(null)}
          onSearchChange={setActionSearch}
          onSelectAction={() => setOverlay(null)}
          search={actionSearch}
        />
      ) : null}

      {overlayPresence.renderedValue === 'shortcuts' ? (
        <PrototypeShortcuts
          closing={overlayPresence.closing}
          groups={prototypeShortcutGroups}
          onClose={() => setOverlay(null)}
          onClosed={() => setOverlay(null)}
        />
      ) : null}

      {overlayPresence.renderedValue === 'settings' ? (
        <PrototypeOverlayFrame className="proto-overlay" closing={overlayPresence.closing} onClose={() => setOverlay(null)}>
          <section aria-label="Paramètres du composant" aria-modal="true" className={`proto-settings ui-lab__settings${overlayPresence.closing ? ' is-closing' : ''}`} role="dialog">
            <button aria-label="Fermer les paramètres" className="proto-settings__close" onClick={() => setOverlay(null)} type="button"><X size={19} /></button>
            <div className="proto-settings__content">
              <small>Fixture locale</small>
              <h2>Apparence</h2>
              <div className="ui-lab__settings-actions">
                <button onClick={() => setProfileId('masterflex')} type="button">MasterFlex</button>
                <button onClick={() => setProfileId('profkrapu')} type="button">ProfKrapu</button>
                <button onClick={() => setLight((current) => !current)} type="button">{light ? 'Mode sombre' : 'Mode clair'}</button>
              </div>
            </div>
          </section>
        </PrototypeOverlayFrame>
      ) : null}
    </main>
  );
}
