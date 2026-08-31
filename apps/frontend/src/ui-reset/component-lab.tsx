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
import {useEffect, useId, useRef, useState} from 'react';
import type {CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement} from 'react';

import '../current-ui-demo.css';
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
import {buildPrototypeTunnelFixture} from './prototype-tunnel-model';
import {ComponentLabAssets, ComponentLabFoundations, ComponentLabPipeline} from './component-lab-foundations';
import {ComponentLabProject} from './component-lab-project';
import {TeachingWorkspaceSurface} from './component-lab-teaching';
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
import {componentLabReviewState} from './component-lab-review-state';
import './component-lab.css';

type LabTab = 'review' | 'foundations' | 'assets' | 'navigation' | 'home' | 'persona' | 'project' | 'teaching' | 'system' | 'command' | 'states' | 'overlays' | 'tunnel' | 'pipeline';
type LabScenario = 'rest' | 'compose' | 'mobile' | 'tunnel' | 'collision';
type CommandDockPreset = 'closed' | 'keyboard' | 'long' | 'history' | 'micro' | 'recording' | 'transcription';
type SkilltreePreset = 'home' | 'overview' | 'mobile';
type LabOverlay = 'actions' | 'settings' | 'shortcuts';

interface ComponentLabProps {
  workspaceId: ComponentLabWorkspaceId;
}

function LabMasterflowMark({className}: {className: string}): ReactElement {
  const shadowId = `mf-lab-shadow-${useId().replace(/:/g, '')}`;

  return (
    <svg aria-hidden="true" className={className} viewBox="-12 -12 344.315 344.315">
      <defs>
        <filter id={shadowId} height="140%" width="140%" x="-20%" y="-20%">
          <feDropShadow dx="0" dy="5" floodColor="#000" floodOpacity="0.38" stdDeviation="4" />
        </filter>
      </defs>
      <g filter={`url(#${shadowId})`} transform="translate(0 320.315) scale(1 -1)">
        <path
          d="M0 0 C-4.381 21.746 -8.236 38.507 -10.341 58.447 L-14.531 98.134 L-17.124 118.898 C-17.437 121.407 -18.282 122.847 -19.748 125.022 C-20.932 126.778 -22.95 130.507 -25.803 129.115 C-27.345 128.363 -28.555 127.534 -30.398 128.511 C-33.491 127.47 -35.064 124.093 -34.845 120.716 C-37.746 114.371 -39.792 108.113 -41.185 101.34 L-45.179 81.926 L-57.427 25.841 L-59.94 13.266 C-68.465 27.819 -75.84 42.368 -82.7 57.683 L-93.224 81.181 C-94.774 84.641 -95.667 88.346 -96.602 91.917 C-97.681 95.236 -100.384 97.217 -103.601 95.766 C-106.431 97.34 -109.262 96.465 -111.539 94.458 L-115.114 93.695 C-117.234 91.184 -115.512 88.69 -115.421 85.879 C-114.352 52.66 -110.578 20.018 -102.901 -12.253 C-102.234 -15.06 -101.014 -17.858 -99.525 -19.815 C-94.707 -18.752 -94.633 -24.03 -92.687 -23.843 C-92.193 -23.796 -90.559 -23.086 -90.471 -22.602 L-89.513 -17.376 C-89.188 -17.47 -87.922 -17.985 -87.869 -17.556 L-87.618 -15.545 L-91.205 13.336 C-92.102 20.204 -92.839 26.663 -93.158 33.834 L-64.981 -18.69 C-63.564 -21.332 -62.569 -22.512 -59.458 -23.583 L-51.681 -26.259 C-50.124 -26.795 -48.983 -27.605 -47.456 -26.757 C-46.557 -26.259 -45.997 -24.57 -45.535 -23.432 C-43.927 -19.463 -43.932 -16.219 -43.898 -12.029 C-43.841 -5.04 -42.689 1.921 -41.456 9.007 C-38.691 24.902 -35.18 40.285 -31.345 55.887 C-27.854 31.372 -24.142 8.025 -18.286 -15.584 C-14.21 -32.015 -14.904 -30.728 -9.201 -46.695 C-7.537 -51.353 -4.656 -55.383 -3.299 -60.213 C-2.318 -63.706 -0.372 -66.578 2.968 -68.339 C5.306 -67.221 6.929 -68.156 8.317 -70.222 C9.587 -71.534 11.202 -72.417 13.043 -71.581 C14.148 -71.079 14.628 -69.415 14.595 -67.889 C15.126 -67.407 16.479 -66.512 16.418 -65.886 L16.196 -63.613 L18.746 -63.978 C19.186 -64.041 19.601 -62.302 19.612 -61.83 C19.69 -58.778 18.199 -55.816 17.091 -52.969 C4.381 -21.746 0 0 0 0 Z"
          fill="var(--proto-accent)"
          transform="translate(213.7575 97.6511)"
        />
        <path
          d="M0 0 L-10.613 8.8 L-34.779 23.609 C-34.641 23.672 -34.5 23.735 -34.361 23.797 L-39.825 25.488 C-39.85 25.289 -39.913 25.099 -40.048 24.923 C-40.909 23.797 -41.476 23.635 -42.898 23.482 C-45.074 23.247 -43.497 19.759 -46.121 16.721 C-46.488 16.297 -46.651 15.809 -46.622 15.377 C-46.565 14.536 -46.171 13.597 -45.57 13.202 L-24.839 0.724 L-36.003 -2.167 C-50.959 -6.04 -65.327 -10.595 -79.904 -15.307 L-119.466 -27.558 L-169.772 -42.657 C-169.74 -42.482 -169.706 -42.305 -169.673 -42.129 L-177.706 -46.789 C-177.407 -46.923 -177.161 -47.089 -177.006 -47.322 C-176.012 -48.809 -176.296 -49.475 -177.424 -51.008 C-179.232 -53.465 -171.269 -53.654 -169.269 -58.588 C-168.091 -59.422 -156.264 -58.087 -154.551 -57.526 L-117.741 -45.584 L-90.046 -36.933 L-53.433 -24.895 L-28.335 -16.911 C-25.794 -16.103 -23.076 -14.707 -20.422 -14.502 L-22.931 -17.83 L-35.187 -34.857 C-35.725 -35.605 -36.004 -36.753 -35.967 -37.599 C-35.948 -38.035 -35.738 -38.407 -35.337 -38.594 C-32.471 -39.933 -33.615 -44.263 -31.487 -43.165 C-30.096 -42.447 -29.531 -42.259 -28.577 -42.824 C-28.427 -42.912 -28.345 -43.056 -28.299 -43.233 L-23.203 -38.274 C-23.344 -38.298 -23.487 -38.323 -23.627 -38.347 L-9.412 -18.437 L0.102 -2.203 C0.747 -1.365 0.704 -0.429 0 0 Z"
          fill="var(--proto-user-color)"
          transform="translate(231.9357 269.0836)"
        />
      </g>
    </svg>
  );
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

const labTabs: LabTab[] = ['review', 'foundations', 'assets', 'navigation', 'home', 'persona', 'project', 'teaching', 'system', 'command', 'states', 'overlays', 'tunnel', 'pipeline'];
const labTabLabels: Record<LabTab, string> = {
  assets: 'Assets',
  command: 'Dock',
  foundations: 'Fondations',
  home: 'Home',
  navigation: 'Navigation',
  overlays: 'Overlays',
  persona: 'Persona',
  pipeline: 'Promotion',
  project: 'Project',
  review: 'Vue globale',
  states: 'États',
  system: 'Système',
  teaching: 'Teaching',
  tunnel: 'Tunnel',
};

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
    : 'review';
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
  const secondaryProfileId = prototypeProfileIds.find((candidateId) => candidateId !== profileId);
  const tunnelFixture = buildPrototypeTunnelFixture(
    profile,
    secondaryProfileId ? getPrototypeProfile(secondaryProfileId) : undefined,
  );
  const profilePalette = getPrototypeThemePalette(profile.defaultThemePaletteId);
  const profileRankTitle = getPrototypeProfileRank(profile).title;
  const labModeGroups = buildPrototypeModeGroups();
  const homePrimaryModes = buildPrototypeHomeModes(['project', 'teaching', 'learn'])
    .map((mode) => ({...mode, resume: mode.id === 'project'}));
  const homeSecondaryModes = buildPrototypeHomeModes(['story', 'da', 'inventory', 'masterbuild']);
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
    microAvailable: true,
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

  const renderBrandMark = (className: string): ReactElement => <LabMasterflowMark className={className} />;

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
            <button aria-pressed={tab === item} key={item} onClick={() => setTab(item)} type="button">{labTabLabels[item]}</button>
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
        {tab === 'review' ? (
          <section className="ui-lab__review" aria-label="Cockpit de review partagé">
            <header className="ui-lab__review-hero">
              <small>{componentLabReviewState.round.id} · {componentLabReviewState.pullRequest.id}</small>
              <h1>{componentLabReviewState.round.title}</h1>
              <p>{componentLabReviewState.decisionExpected}</p>
              <div className="ui-lab__review-links" aria-label="Liens de test">
                {componentLabReviewState.links.map((link) => (
                  <a href={link.href} key={link.href} rel={link.role === 'github' ? 'noreferrer' : undefined} target={link.role === 'github' ? '_blank' : undefined}>
                    <span>{link.role}</span>
                    <strong>{link.label}</strong>
                  </a>
                ))}
              </div>
            </header>

            <section className="ui-lab__review-status" aria-label="Statuts de review">
              {componentLabReviewState.statusCards.map((card) => (
                <article key={card.id} style={{'--review-status-color': card.color} as CSSProperties}>
                  <span>{card.count}</span>
                  <strong>{card.label}</strong>
                  <p>{card.summary}</p>
                </article>
              ))}
            </section>

            <section className="ui-lab__review-columns" aria-label="Checklists de validation">
              {componentLabReviewState.validation.map((checklist) => (
                <article className="ui-lab__review-checklist" key={checklist.owner}>
                  <header>
                    <small>{checklist.owner}</small>
                    <h2>{checklist.title}</h2>
                  </header>
                  <div>
                    {checklist.items.map((item) => (
                      <label className={item.done ? 'is-done' : undefined} key={item.id}>
                        <input checked={item.done} readOnly type="checkbox" />
                        <span>
                          <strong>{item.label}</strong>
                          <small>{item.detail}</small>
                        </span>
                      </label>
                    ))}
                  </div>
                </article>
              ))}

              <aside className="ui-lab__review-scope" aria-label="Hors périmètre">
                <small>Hors périmètre</small>
                <h2>Pas dans ce round</h2>
                <ul>
                  {componentLabReviewState.outOfScope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            </section>
          </section>
        ) : null}

        {tab === 'foundations' ? <ComponentLabFoundations /> : null}

        {tab === 'assets' ? <ComponentLabAssets brandMark={renderBrandMark('ui-lab-assets__mark')} /> : null}

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
                body: '7 espaces disponibles. Dernière activité : Identité de lancement.',
                eyebrow: 'MasterFlow est prêt.',
                title: profile.displayName === 'Malex' ? 'Salut MALEX.' : `Bonjour ${profile.displayName}.`,
              }}
              onResume={() => setTab('project')}
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

        {tab === 'project' ? <ComponentLabProject /> : null}

        {tab === 'teaching' ? <TeachingWorkspaceSurface dataMode="fixture" /> : null}

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
            <PrototypeActionRail actions={labSuggestions.slice(0, 3)} libraryOpen={overlay === 'actions'} onOpenLibrary={() => setOverlay('actions')} />
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
              showHistory
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
            closing={tunnelClosing}
            contextSummary={tunnelFixture.contextSummary}
            input={input}
            messages={tunnelFixture.messages}
            onAnimationEnd={finishTunnelClose}
            onClose={closeTunnel}
            onInputChange={setInput}
            onInputKeyDown={submitOnEnter}
            onSubmit={submit}
            prompt={profile.tunnelPrompt}
            participants={tunnelFixture.participants}
            tunnelPrompt={tunnelFixture.prompt}
          />
        ) : null}

        {tab === 'pipeline' ? <ComponentLabPipeline /> : null}
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
