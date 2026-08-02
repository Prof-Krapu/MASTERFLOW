import {
  CircleHelp,
  Bell,
  BookOpen,
  Boxes,
  Check,
  Clapperboard,
  FileText,
  FolderKanban,
  GraduationCap,
  History,
  LoaderCircle,
  Lock,
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
  ShieldCheck,
  Sun,
  Upload,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import type {CSSProperties, FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode} from 'react';
import type {ActionRegistryEntry, CurrentContext, Job, ValidationInboxItem} from '@masterflow/shared';

import './current-ui-demo.css';
import {
  clearRuntimeAuthToken,
  getCurrentContext,
  getJobs,
  getValidationInboxItems,
  restoreRuntimeAuthToken,
} from './api';
import {
  PrototypeActionRail,
  PrototypeActionLibrary,
  PrototypeCommandDock,
  PrototypeNavigationRail,
  PrototypeOverlayFrame,
  PrototypeShortcuts,
  PrototypeSystemChrome,
  PrototypeTunnel,
  PrototypeTunnelPromptCard,
} from './ui-reset/prototype-shell-components';
import type {
  PrototypeActionSuggestion,
  PrototypeLibraryAction,
  PrototypeModeGroup,
  PrototypeHistoryItem,
  PrototypeSearchResult,
} from './ui-reset/prototype-shell-components';
import {PrototypeCharacterSurface, PrototypeHomeSurface} from './ui-reset/prototype-product-surfaces';
import {PrototypeSkilltreeSurface} from './ui-reset/prototype-skilltree-surface';
import {MasterbuildConsole} from './masterbuild-console';
import {prototypeShortcutGroups} from './ui-reset/prototype-shortcut-registry';
import {buildPrototypeTunnelFixture} from './ui-reset/prototype-tunnel-model';
import {resolveKeyboardToggle, resolveMicroToggle} from './ui-reset/prototype-ui-state-registry';
import {usePrototypeShortcuts} from './ui-reset/use-prototype-shortcuts';

import {
  accessLevels,
  accessModeMap,
  actionCategories,
  buildPrototypeHomeModes,
  buildPrototypeModeGroups,
  getPrototypeProfile,
  getPrototypeProfileRank,
  getPrototypeThemePalette,
  modeGroups,
  personaStats,
  prototypeProfileIds,
  resolvePersonaMoodState,
  skillFamilyColors,
  themePalettes,
} from './ui-reset/prototype-profile-registry';
import type {
  AccessLevel,
  ActiveSurface,
  AppearanceTheme,
  DemoMode,
  DockPanel,
  NavigationDestination,
  PersonaMetric,
  PersonaMoodState,
  PrototypeProfileId,
  SkillArc,
  SkillArcId,
  SkillFamilyId,
  SystemPanel,
  ThemePaletteId,
  ViewMode,
} from './ui-reset/prototype-profile-registry';

function MasterflowMark({className}: {className: string}): ReactElement {
  const shadowId = `mf-shadow-${useId().replace(/:/g, '')}`;

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

const historyItems = [
  {
    id: 'home-orchestration',
    speaker: 'MasterFlex',
    summary: 'La Home devient un point de départ, pas un tableau de bord.',
    detail: 'Les accès principaux donnent le cap, les actions restent près du clavier et le persona n’intervient que lorsqu’un contexte mérite une explication.',
  },
  {
    id: 'resume',
    speaker: 'Malex',
    summary: 'On repart sur la navigation, le fond et les boutons fixes.',
    detail: 'Prototype reset : fond noir, MasterFlow centré, dock bas permanent, menu gauche hiérarchisé et actions limitées.',
  },
  {
    id: 'buttons',
    speaker: 'MasterFlex',
    summary: 'Les actions doivent partager la même charte.',
    detail: 'Même forme de bouton, même animation au survol, même pression au clic, tooltip systématique si l’icône est seule.',
  },
  {
    id: 'shortcuts',
    speaker: 'Malex',
    summary: 'Chercher des raccourcis clavier simples.',
    detail: 'K pour clavier, M pour micro, H pour historique, Entrée pour valider selon le contexte.',
  },
];

type RuntimeBridgeState = {
  context: CurrentContext | null;
  inboxItems: ValidationInboxItem[];
  jobs: Job[];
  status: 'prototype' | 'runtime' | 'degraded';
  error: string | null;
};

export type CurrentUiRuntime = {
  context: CurrentContext;
  inboxItems: ValidationInboxItem[];
  jobs: Job[];
  renderWorkspace: (mode: ActiveSurface) => ReactNode;
  checkpointLabel: string;
  attentionLabel: string;
  actionState: {
    status: string;
    message: string;
  };
  chat: {
    input: string;
    state: string;
    turns: Array<{
      id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      speaker?: string;
    }>;
    onInputChange: (value: string) => void;
    onSubmit: () => void;
  };
  onActionSelect: (action: ActionRegistryEntry) => void;
  onLogout: () => void;
  onModeSelect: (mode: ActiveSurface) => void;
};

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

const runtimeSurfaceModes: Array<{mode: DemoMode; pattern: RegExp}> = [
  {mode: 'project', pattern: /(^|_)project(_|$)/},
  {mode: 'story', pattern: /(story|narrative|workbench)/},
  {mode: 'da', pattern: /(^|_)(da|theme|manifest)(_|$)/},
  {mode: 'inventory', pattern: /(inventory|asset_storage|asset_review|asset_gallery)/},
  {mode: 'teaching', pattern: /(teaching|pedagogical|competency|badge|skill_tree)/},
  {mode: 'learn', pattern: /(learning|help_context|style_profile)/},
];

const actionIconFor = (action: ActionRegistryEntry): PrototypeActionSuggestion['icon'] => {
  const haystack = `${action.action_id} ${action.label} ${action.ui_surface}`.toLocaleLowerCase('fr');
  if (haystack.includes('context')) return MessageCircle;
  if (haystack.includes('save') || haystack.includes('validate') || haystack.includes('approval')) return Check;
  if (haystack.includes('preflight') || haystack.includes('verify') || haystack.includes('verifier')) return ShieldCheck;
  if (haystack.includes('export') || haystack.includes('send')) return Upload;
  if (haystack.includes('project')) return FolderKanban;
  if (haystack.includes('inventory') || haystack.includes('resource')) return PackageOpen;
  if (haystack.includes('visual') || haystack.includes('da') || haystack.includes('theme')) return Palette;
  if (haystack.includes('story') || haystack.includes('narrative')) return FileText;
  if (haystack.includes('job') || haystack.includes('queue')) return LoaderCircle;
  if (haystack.includes('action')) return Workflow;
  return CircleHelp;
};

const runtimeModesFromContext = (context: CurrentContext | null): Set<DemoMode> | null => {
  if (!context) return null;
  const modesFromRuntime = context.user_runtime_loadout.active_mode_cycle
    .map((id) => runtimeModeAliases[id])
    .filter((id): id is DemoMode => Boolean(id));
  const modes = new Set(modesFromRuntime);
  for (const surface of context.user_runtime_loadout.available_apps) {
    const match = runtimeSurfaceModes.find((candidate) => candidate.pattern.test(surface));
    if (match) modes.add(match.mode);
  }
  if (context.user.role === 'godmode') modes.add('masterbuild');
  return modes;
};

const buildRuntimeSuggestions = (
  context: CurrentContext | null,
  fallback: PrototypeActionSuggestion[],
  onActionSelect?: (action: ActionRegistryEntry) => void,
): PrototypeActionSuggestion[] => {
  if (!context) return fallback;
  const actionsById = new Map(context.available_actions.map((action) => [action.action_id, action]));
  const preferredIds = [
    ...context.user_runtime_loadout.suggested_first_action_ids,
    ...context.user_runtime_loadout.quick_palette_action_ids,
    ...context.user_runtime_loadout.default_action_ids,
  ];
  const ordered = [
    ...preferredIds.map((id) => actionsById.get(id)).filter((action): action is ActionRegistryEntry => Boolean(action)),
    ...context.available_actions,
  ];
  const unique = [...new Map(ordered.map((action) => [action.action_id, action])).values()]
    .filter((action) => action.status === 'live')
    .slice(0, 5);
  return unique.map((action) => ({
    id: action.action_id,
    label: action.label,
    icon: actionIconFor(action),
    onClick: onActionSelect ? () => onActionSelect(action) : undefined,
  }));
};

const actionCategoryFor = (action: ActionRegistryEntry): PrototypeLibraryAction['category'] => {
  const haystack = `${action.action_id} ${action.label} ${action.ui_surface}`.toLocaleLowerCase('fr');
  if (haystack.includes('share') || haystack.includes('send') || haystack.includes('export')) return 'Partage';
  if (haystack.includes('visual') || haystack.includes('story') || haystack.includes('create') || haystack.includes('generate')) return 'Création';
  if (haystack.includes('project') || haystack.includes('inventory') || haystack.includes('resource')) return 'Projet';
  return 'Outils';
};

const buildRuntimeLibraryActions = (context: CurrentContext | null): PrototypeLibraryAction[] => {
  if (!context) return [];
  const relevantIds = new Set([
    ...context.user_runtime_loadout.suggested_first_action_ids,
    ...context.user_runtime_loadout.quick_palette_action_ids,
    ...context.user_runtime_loadout.default_action_ids,
  ]);
  return context.available_actions
    .filter((action) => action.status === 'live')
    .map((action) => ({
      category: actionCategoryFor(action),
      icon: actionIconFor(action),
      id: action.action_id,
      keywords: `${action.action_id} ${action.ui_surface}`,
      label: action.label,
      relevant: relevantIds.has(action.action_id),
    }));
};

const getRuntimeSearchResults = (context: CurrentContext | null, query: string): PrototypeSearchResult[] => {
  if (!context) return [];
  const normalizedQuery = query.trim().toLocaleLowerCase('fr');
  return context.available_actions
    .filter((action) => action.status === 'live')
    .filter((action) => !normalizedQuery
      || `${action.label} ${action.action_id} ${action.ui_surface}`.toLocaleLowerCase('fr').includes(normalizedQuery))
    .slice(0, 6)
    .map((action) => ({
      detail: action.preflight_required ? 'Action réelle · préflight requis' : 'Action réelle',
      icon: actionIconFor(action),
      id: action.action_id,
      label: action.label,
    }));
};

const countAttentionJobs = (jobs: Job[]): number =>
  jobs.filter((job) => ['queued', 'running', 'needs_review', 'failed'].includes(job.status)).length;

const countOpenInboxItems = (items: ValidationInboxItem[]): number =>
  items.filter((item) => ['draft', 'candidate', 'needs_review', 'blocked'].includes(item.current_status)).length;

function useAnimatedPresence<T>(value: T | null, duration = 220): {
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

export function CurrentUiDemo({runtime}: {runtime?: CurrentUiRuntime}): ReactElement {
  const [activeMode, setActiveMode] = useState<ActiveSurface>('home');
  const [activePrototypeProfileId, setActivePrototypeProfileId] = useState<PrototypeProfileId>('masterflex');
  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>('auto');
  const [themePaletteId, setThemePaletteId] = useState<ThemePaletteId>('masterflow');
  const [paletteValuesInverted, setPaletteValuesInverted] = useState(false);
  const [personaColor, setPersonaColor] = useState('#3979e8');
  const [input, setInput] = useState('');
  const [railOpen, setRailOpen] = useState(false);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('teacher');
  const [accessOpen, setAccessOpen] = useState(false);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [characterClosing, setCharacterClosing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [actionLibraryOpen, setActionLibraryOpen] = useState(false);
  const [renderedActionLibraryOpen, setRenderedActionLibraryOpen] = useState(false);
  const [actionLibraryClosing, setActionLibraryClosing] = useState(false);
  const [tunnelOpen, setTunnelOpen] = useState(false);
  const [tunnelClosing, setTunnelClosing] = useState(false);
  const [tunnelPromptVisible, setTunnelPromptVisible] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shortcutsClosing, setShortcutsClosing] = useState(false);
  const [actionSearch, setActionSearch] = useState('');
  const [dockPanel, setDockPanel] = useState<DockPanel>('keyboard');
  const [renderedDockPanel, setRenderedDockPanel] = useState<DockPanel>('keyboard');
  const [dockPanelClosing, setDockPanelClosing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>('buttons');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');
  const [systemPanel, setSystemPanel] = useState<SystemPanel>(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [selectedSkillArcId, setSelectedSkillArcId] = useState<SkillArcId | null>(null);
  const [skillsOverviewOpen, setSkillsOverviewOpen] = useState(false);
  const [personaStatIndex, setPersonaStatIndex] = useState(0);
  const [skillFamilyIndex, setSkillFamilyIndex] = useState(0);
  const [personaDisplayValue, setPersonaDisplayValue] = useState(0);
  const [personaDisplayMasteryValue, setPersonaDisplayMasteryValue] = useState(0);
  const [portraitLayers, setPortraitLayers] = useState<{
    current: PersonaMoodState;
    previous: PersonaMoodState | null;
  }>(() => ({
    current: resolvePersonaMoodState(personaStats[0]!.masteryValue),
    previous: null,
  }));
  const [runtimeBridgeState, setRuntimeBridge] = useState<RuntimeBridgeState>({
    context: null,
    error: null,
    inboxItems: [],
    jobs: [],
    status: 'prototype',
  });
  const runtimeBridge: RuntimeBridgeState = runtime
    ? {
        context: runtime.context,
        error: null,
        inboxItems: runtime.inboxItems,
        jobs: runtime.jobs,
        status: 'runtime',
      }
    : runtimeBridgeState;
  const navigationDestinationRef = useRef<NavigationDestination>('home');
  const [systemPrefersLight, setSystemPrefersLight] = useState(false);
  const settingsPresence = useAnimatedPresence(settingsOpen ? true : null);
  const accessPresence = useAnimatedPresence(accessOpen ? true : null, 180);
  const historyPresence = useAnimatedPresence(historyOpen ? true : null);
  const systemPanelPresence = useAnimatedPresence(systemPanel);
  const runtimeModeIds = useMemo(() => runtimeModesFromContext(runtimeBridge.context), [runtimeBridge.context]);
  const visibleModeIds = useMemo(
    () => runtimeModeIds
      ?? (runtimeBridge.status === 'degraded' ? new Set<DemoMode>() : new Set(accessModeMap[accessLevel])),
    [accessLevel, runtimeBridge.status, runtimeModeIds],
  );
  const activePrototypeProfile = getPrototypeProfile(activePrototypeProfileId);
  const tunnelFixture = buildPrototypeTunnelFixture(activePrototypeProfile);
  const modeCycle = useMemo<NavigationDestination[]>(
    () => ['home', 'character', ...modeGroups.flatMap((group) => group.ids).filter((id) => visibleModeIds.has(id))],
    [visibleModeIds],
  );
  const resolvedAppearance = appearanceTheme === 'auto' ? (systemPrefersLight ? 'light' : 'dark') : appearanceTheme;
  const themePalette = getPrototypeThemePalette(themePaletteId);
  const activeSkillArcs = activePrototypeProfile.skillArcs;
  const selectedSkillArc = activeSkillArcs.find((arc) => arc.id === selectedSkillArcId) ?? null;
  const skillGalaxyOpen = selectedSkillArc !== null || skillsOverviewOpen;
  const activeMetricSet = selectedSkillArc?.metrics ?? activePrototypeProfile.stats;
  const activePersonaStat = activeMetricSet[personaStatIndex] ?? activeMetricSet[0] ?? activePrototypeProfile.stats[0]!;
  const activeSkillFamilies = useMemo(
    () => selectedSkillArc ? Array.from(new Set(selectedSkillArc.skills.map((skill) => skill.family))) : [],
    [selectedSkillArc],
  );
  const activeSkillFamily = activeSkillFamilies[skillFamilyIndex % activeSkillFamilies.length] ?? null;
  const skillSliderIndex = skillsOverviewOpen
    ? activeSkillArcs.length + 1
    : selectedSkillArc
      ? activeSkillArcs.findIndex((arc) => arc.id === selectedSkillArc.id) + 1
      : 0;
  const selectSkillSliderIndex = useCallback((nextIndex: number): void => {
    const normalizedIndex = (nextIndex + activeSkillArcs.length + 2) % (activeSkillArcs.length + 2);
    if (normalizedIndex === 0) {
      setSelectedSkillArcId(null);
      setSkillsOverviewOpen(false);
      return;
    }
    if (normalizedIndex === activeSkillArcs.length + 1) {
      setSelectedSkillArcId(null);
      setSkillsOverviewOpen(true);
      return;
    }
    setSelectedSkillArcId(activeSkillArcs[normalizedIndex - 1]?.id ?? null);
    setSkillsOverviewOpen(false);
  }, [activeSkillArcs]);
  const activePersonaMood = useMemo(
    () => {
      const mood = resolvePersonaMoodState(activePersonaStat.masteryValue);
      return {...mood, asset: activePrototypeProfile.moodAssets[mood.id]};
    },
    [activePersonaStat.masteryValue, activePrototypeProfile],
  );
  const displayedPersonaMood = useMemo(
    () => resolvePersonaMoodState(personaDisplayMasteryValue),
    [personaDisplayMasteryValue],
  );
  const characterPunchline = useMemo((): string => {
    if (selectedSkillArc) return activePrototypeProfile.skillPunchlines[selectedSkillArc.id] ?? activePrototypeProfile.defaultPunchline;
    if (activePrototypeProfile.id !== 'masterflex') {
      if (recording || dockPanel === 'micro') return 'Vous parlez, il vérifie déjà.';
      if (transcribing) return 'Dictée reçue, folklore filtré.';
      if (actionLibraryOpen || systemPanel === 'search') return 'Cherchez, mais proprement.';
      if (historyOpen || systemPanel === 'queue') return 'La preuve ne dort jamais.';
      if (settingsOpen) return 'Palette rose, science verte.';
      return activePrototypeProfile.modePunchlines[activeMode] ?? activePrototypeProfile.defaultPunchline;
    }
    if (recording || dockPanel === 'micro') return 'Plus réactif qu’un cortex';
    if (transcribing) return 'Plus rapide que Fedex';
    if (actionLibraryOpen || systemPanel === 'search') return 'Plus attirant qu’un vortex';
    if (historyOpen || systemPanel === 'queue') return 'Plus Minus que Cortex';
    if (settingsOpen) return 'Plus épicé qu’un Tex-Mex';
    if (systemPanel === 'notifications') return 'Plus pétillant qu’un Fervex';
    if (systemPanel === 'dm') return 'Plus attirant qu’un vortex';
    return activePrototypeProfile.modePunchlines[activeMode] ?? activePrototypeProfile.defaultPunchline;
  }, [activeMode, activePrototypeProfile, actionLibraryOpen, dockPanel, historyOpen, recording, selectedSkillArc, settingsOpen, systemPanel, transcribing]);
  const profileRank = getPrototypeProfileRank(activePrototypeProfile);
  const homeCopy = runtimeBridge.context
    ? {
        eyebrow: runtimeBridge.context.room.name,
        title: `Bonjour ${runtimeBridge.context.user.display_name}.`,
        body: 'Ton contexte, tes accès et tes actions sont chargés depuis cette Room.',
      }
    : runtimeBridge.status === 'degraded'
      ? {
          eyebrow: 'Runtime indisponible',
          title: 'Connexion requise.',
          body: 'Reconnecte-toi pour charger ton contexte, tes accès et tes actions réels.',
        }
      : activePrototypeProfile.id === 'profkrapu'
    ? {
        eyebrow: 'Oh, vous voilà.',
        title: 'Bonjour Vincent.',
        body: 'ProfKrapu est branché. Les molécules attendent, les approximations tremblent.',
      }
    : {
        eyebrow: 'Oh, te revoilà toi.',
        title: 'Bonjour Malex.',
        body: 'MasterFlow est prêt. Toi, on va vérifier. Tu attaques quoi ?',
      };
  const interfaceColor = paletteValuesInverted ? personaColor : themePalette.color;
  const interfaceTop = paletteValuesInverted ? `color-mix(in srgb, ${personaColor} 74%, white)` : themePalette.top;
  const interfaceDeep = paletteValuesInverted ? `color-mix(in srgb, ${personaColor} 74%, black)` : themePalette.deep;
  const userRoleColor = paletteValuesInverted ? themePalette.color : personaColor;
  const themeStyle = {
    '--persona-color': personaColor,
    '--proto-user-color': userRoleColor,
    '--proto-support': themePalette.supportColor,
    '--proto-blue': themePalette.supportColor,
    '--proto-accent': interfaceColor,
    '--proto-accent-top': interfaceTop,
    '--proto-accent-deep': interfaceDeep,
    '--proto-accent-gradient': `linear-gradient(180deg, ${interfaceTop} 0%, ${interfaceColor} 55%, ${interfaceDeep} 100%)`,
  } as CSSProperties;
  const closeTunnel = useCallback((): void => {
    if (tunnelClosing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTunnelOpen(false);
      setTunnelClosing(false);
      return;
    }
    setTunnelClosing(true);
  }, [tunnelClosing]);
  const closeShortcuts = useCallback((): void => {
    if (shortcutsClosing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShortcutsOpen(false);
      setShortcutsClosing(false);
      return;
    }
    setShortcutsClosing(true);
  }, [shortcutsClosing]);
  const closeCharacterPage = useCallback((): void => {
    if (characterClosing) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCharacterOpen(false);
      setSelectedSkillArcId(null);
      setSkillsOverviewOpen(false);
      return;
    }
    setCharacterClosing(true);
  }, [characterClosing]);
  const applyPrototypeProfile = useCallback((profileId: PrototypeProfileId): void => {
    const profile = getPrototypeProfile(profileId);
    setActivePrototypeProfileId(profileId);
    setThemePaletteId(profile.defaultThemePaletteId);
    setPersonaColor(profile.personaColor);
    setPaletteValuesInverted(false);
    setSelectedSkillArcId(null);
    setSkillsOverviewOpen(false);
    setPersonaStatIndex(0);
    setSkillFamilyIndex(0);
    const baseMood = resolvePersonaMoodState(profile.stats[0]!.masteryValue);
    setPortraitLayers({
      current: {...baseMood, asset: profile.moodAssets[baseMood.id]},
      previous: null,
    });
  }, []);
  const selectMode = useCallback((mode: DemoMode): void => {
    navigationDestinationRef.current = mode;
    setActiveMode(mode);
    runtime?.onModeSelect(mode);
    setRailOpen(false);
    setAccessOpen(false);
    setActionLibraryOpen(false);
    setActionLibraryClosing(false);
    setShortcutsOpen(false);
    setShortcutsClosing(false);
    setSettingsOpen(false);
    setSystemPanel(null);
    setQuickSearch('');
    setHistoryOpen(false);
    setRecording(false);
    setTranscribing(false);
    setDockPanel(null);
    if (characterOpen) closeCharacterPage();
  }, [characterOpen, closeCharacterPage, runtime]);
  const selectHome = useCallback((): void => {
    navigationDestinationRef.current = 'home';
    setActiveMode('home');
    runtime?.onModeSelect('home');
    if (window.matchMedia('(max-width: 760px)').matches) setRailOpen(false);
    setAccessOpen(false);
    setActionLibraryOpen(false);
    setActionLibraryClosing(false);
    setShortcutsOpen(false);
    setShortcutsClosing(false);
    setSettingsOpen(false);
    setSystemPanel(null);
    setQuickSearch('');
    setHistoryOpen(false);
    setRecording(false);
    setTranscribing(false);
    setDockPanel('keyboard');
    if (characterOpen) closeCharacterPage();
  }, [characterOpen, closeCharacterPage, runtime]);
  const openCharacterPage = useCallback((): void => {
    navigationDestinationRef.current = 'character';
    setCharacterClosing(false);
    setCharacterOpen(true);
    setSelectedSkillArcId(null);
    setSkillsOverviewOpen(false);
    setRailOpen(false);
    setActionLibraryOpen(false);
    setActionLibraryClosing(false);
    setShortcutsOpen(false);
    setShortcutsClosing(false);
    setSettingsOpen(false);
    setSystemPanel(null);
    setQuickSearch('');
    setDockPanel(null);
    setHistoryOpen(false);
    setRecording(false);
    setTranscribing(false);
  }, []);
  const openActionLibrary = useCallback((): void => {
    setActionSearch('');
    setSettingsOpen(false);
    setShortcutsOpen(false);
    setShortcutsClosing(false);
    setSystemPanel(null);
    setActionLibraryOpen(true);
  }, []);
  const openSettingsPanel = useCallback((): void => {
    setActionLibraryOpen(false);
    setActionLibraryClosing(false);
    setShortcutsOpen(false);
    setShortcutsClosing(false);
    setSystemPanel(null);
    setSettingsOpen(true);
  }, []);

  useEffect(() => {
    if (dockPanel !== 'keyboard') setTranscribing(false);
  }, [dockPanel]);

  useEffect(() => {
    if (actionLibraryOpen) {
      setRenderedActionLibraryOpen(true);
      setActionLibraryClosing(false);
      return;
    }
    if (!renderedActionLibraryOpen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRenderedActionLibraryOpen(false);
      setActionLibraryClosing(false);
      return;
    }

    setActionLibraryClosing(true);
    const timer = window.setTimeout(() => {
      setRenderedActionLibraryOpen(false);
      setActionLibraryClosing(false);
    }, 240);
    return () => window.clearTimeout(timer);
  }, [actionLibraryOpen, renderedActionLibraryOpen]);

  useEffect(() => {
    if (dockPanel) {
      setRenderedDockPanel(dockPanel);
      setDockPanelClosing(false);
      return;
    }
    if (!renderedDockPanel) return;

    setDockPanelClosing(true);
    const timer = window.setTimeout(() => {
      setRenderedDockPanel(null);
      setDockPanelClosing(false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [dockPanel, renderedDockPanel]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const syncTheme = (): void => setSystemPrefersLight(media.matches);
    syncTheme();
    media.addEventListener('change', syncTheme);
    return () => media.removeEventListener('change', syncTheme);
  }, []);

  useEffect(() => {
    if (runtime) return undefined;
    let cancelled = false;
    const loadRuntimeBridge = async (): Promise<void> => {
      try {
        restoreRuntimeAuthToken();
        const context = await getCurrentContext();
        const [jobsResult, inboxResult] = await Promise.allSettled([
          getJobs(),
          getValidationInboxItems(),
        ]);
        if (cancelled) return;
        const nextAccessLevel = accessLevels.some((level) => level.id === context.user.role)
          ? context.user.role as AccessLevel
          : 'student';
        setAccessLevel(nextAccessLevel);
        setRuntimeBridge({
          context,
          error: jobsResult.status === 'rejected' || inboxResult.status === 'rejected'
            ? 'Runtime partiel : certains panneaux sont indisponibles.'
            : null,
          inboxItems: inboxResult.status === 'fulfilled' ? inboxResult.value : [],
          jobs: jobsResult.status === 'fulfilled' ? jobsResult.value : [],
          status: 'runtime',
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
    };
    void loadRuntimeBridge();
    return () => {
      cancelled = true;
    };
  }, [runtime]);

  useEffect(() => {
    if (!runtime) return;
    const nextAccessLevel = accessLevels.some((level) => level.id === runtime.context.user.role)
      ? runtime.context.user.role as AccessLevel
      : 'student';
    setAccessLevel(nextAccessLevel);
    if (runtime.context.user.username.toLocaleLowerCase('fr').includes('vincent')) {
      applyPrototypeProfile('profkrapu');
    }
  }, [applyPrototypeProfile, runtime?.context.user.role, runtime?.context.user.username]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPersonaStatIndex((current) => (current + 1) % activeMetricSet.length);
      if (activeSkillFamilies.length > 0) {
        setSkillFamilyIndex((current) => (current + 1) % activeSkillFamilies.length);
      }
    }, 5600);
    return () => window.clearInterval(timer);
  }, [activeMetricSet.length, activeSkillFamilies.length]);

  useEffect(() => {
    setPersonaStatIndex(0);
    setSkillFamilyIndex(0);
  }, [activePrototypeProfileId, selectedSkillArcId]);

  useEffect(() => {
    if (!selectedSkillArcId) return;
    if (activeSkillArcs.some((arc) => arc.id === selectedSkillArcId)) return;
    setSelectedSkillArcId(null);
    setSkillsOverviewOpen(false);
  }, [activeSkillArcs, selectedSkillArcId]);

  useEffect(() => {
    if (portraitLayers.current.id === activePersonaMood.id) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPortraitLayers({current: activePersonaMood, previous: null});
      return;
    }

    setPortraitLayers((current) => ({
      current: activePersonaMood,
      previous: current.current,
    }));
    const timer = window.setTimeout(() => {
      setPortraitLayers((current) => current.current.id === activePersonaMood.id
        ? {...current, previous: null}
        : current);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [activePersonaMood]);

  useEffect(() => {
    const target = activePersonaStat.value;
    const masteryTarget = activePersonaStat.masteryValue;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPersonaDisplayValue(target);
      setPersonaDisplayMasteryValue(masteryTarget);
      return;
    }

    setPersonaDisplayValue(0);
    setPersonaDisplayMasteryValue(0);
    const duration = 1600;
    const start = window.performance.now();
    let frame = 0;
    const tick = (now: number): void => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setPersonaDisplayValue(Math.round(target * eased));
      setPersonaDisplayMasteryValue(Math.round(masteryTarget * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [activePersonaStat]);

  usePrototypeShortcuts({
    accessOpen,
    actionLibraryOpen,
    characterOpen,
    closeCharacterPage,
    closeShortcuts,
    closeTunnel,
    dockPanel,
    historyOpen,
    modeCycle,
    navigateTo: (destination) => {
      if (destination === 'home') selectHome();
      else if (destination === 'character') openCharacterPage();
      else selectMode(destination as DemoMode);
    },
    navigationDestinationRef,
    railOpen,
    selectSkillSliderIndex,
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
    setSystemPanelSearch: () => setSystemPanel((current) => current === 'search' ? null : 'search'),
    setTunnelClosing,
    setTunnelOpen,
    setViewMode,
    settingsOpen,
    shortcutsOpen,
    skillSliderIndex,
    systemPanelOpen: Boolean(systemPanel),
    tunnelOpen,
    viewMode,
  });

  useEffect(() => {
    const syncFullscreenState = (): void => {
      if (!document.fullscreenElement) {
        setViewMode((current) => current === 'normal' ? current : 'normal');
      }
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  const submit = useCallback((event?: FormEvent<HTMLFormElement>): void => {
    event?.preventDefault();
    const activeInput = runtime?.chat.input ?? input;
    if (!activeInput.trim()) return;
    if (runtime) runtime.chat.onSubmit();
    else setInput('');
    setHistoryOpen(false);
  }, [input, runtime]);

  const submitOnEnter = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    submit();
  };

  const fallbackCommandSuggestions: PrototypeActionSuggestion[] = activeMode === 'home'
    ? [
        {id: 'resume', label: 'Reprendre', icon: MessageCircle},
        {id: 'new', label: 'Nouveau', icon: Plus},
        {id: 'save', label: 'Sauvegarder', icon: Save},
        {id: 'history', label: 'Historique', icon: History, onClick: () => setHistoryOpen((current) => !current)},
        {id: 'project', label: 'Projet', icon: Boxes, onClick: () => selectMode('project')},
      ]
    : [
        {id: 'resume', label: 'Reprendre', icon: MessageCircle},
        {id: 'save', label: 'Sauvegarder', icon: Save},
        {id: 'edit', label: 'Modifier', icon: Pencil},
        {id: 'history', label: 'Historique', icon: History, onClick: () => setHistoryOpen((current) => !current)},
        {id: 'export', label: 'Exporter', icon: Upload},
      ];
  const commandSuggestions = buildRuntimeSuggestions(
    runtimeBridge.context,
    runtimeBridge.status === 'prototype' ? fallbackCommandSuggestions : [],
    runtime?.onActionSelect,
  );
  const runtimeLibraryActions = buildRuntimeLibraryActions(runtimeBridge.context);
  const runtimeSearchResults = getRuntimeSearchResults(runtimeBridge.context, quickSearch);
  const queueCount = runtimeBridge.status === 'runtime' ? countAttentionJobs(runtimeBridge.jobs) : 0;
  const notificationCount = runtimeBridge.status === 'runtime' ? countOpenInboxItems(runtimeBridge.inboxItems) : 0;
  const dmCount = 0;
  const navigationModeGroups: PrototypeModeGroup[] = buildPrototypeModeGroups(visibleModeIds, runtimeBridge.status === 'runtime');
  const visibleAccessLevels = runtimeBridge.context
    ? accessLevels.filter((level) => level.id === runtimeBridge.context?.user.role)
    : runtimeBridge.status === 'degraded'
      ? accessLevels.filter((level) => level.id === accessLevel)
      : accessLevels;
  const homePrimaryModes = buildPrototypeHomeModes(
    ['project', 'teaching', 'learn', 'inventory']
      .filter((id) => visibleModeIds.has(id as DemoMode))
      .slice(0, 3) as DemoMode[],
  );
  const homeSecondaryModes = buildPrototypeHomeModes([]);
  const dockInput = runtime?.chat.input ?? input;
  const runtimeHistoryItems: PrototypeHistoryItem[] = runtime
    ? runtime.chat.turns
        .filter((turn) => turn.role !== 'system')
        .slice(-12)
        .reverse()
        .map((turn) => ({
          id: turn.id,
          speaker: turn.speaker ?? (turn.role === 'user' ? 'Vous' : 'MasterFlow'),
          summary: turn.content || 'Réponse en cours…',
          detail: turn.content || 'Réponse en cours…',
        }))
    : historyItems;

  return (
    <main
      className={`proto-shell proto-shell--theme-${resolvedAppearance} proto-shell--view-${viewMode} proto-shell--dock-${dockPanel ?? 'closed'}${recording ? ' proto-shell--recording' : ''}${railOpen ? ' proto-shell--rail-open' : ''}${tunnelOpen ? ' proto-shell--tunnel-open' : ''}`}
      style={themeStyle}
      onPointerDown={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (
          historyOpen
          && !target.closest('.proto-history-panel')
          && !target.closest('.proto-action-button--history')
          && !target.closest('button[aria-label="Historique"]')
        ) setHistoryOpen(false);
        if (target.closest('.proto-tunnel') || target.closest('.proto-shortcuts-overlay')) return;
        if (target.closest('.proto-commandbar')) return;
        if (dockPanel) {
          setDockPanel(null);
          setRecording(false);
        }
        if (railOpen && !target.closest('.proto-nav') && !target.closest('.proto-mobile-nav')) setRailOpen(false);
        if (accessOpen && !target.closest('.proto-access')) setAccessOpen(false);
        if (systemPanel && !target.closest('.proto-systembar__actions') && !target.closest('.proto-system-popover') && !target.closest('.proto-mobile-nav') && !target.closest('.proto-mobile-system-page')) setSystemPanel(null);
      }}
    >
      <PrototypeNavigationRail
        accessClosing={accessPresence.closing}
        accessLevel={accessLevel}
        accessLevels={visibleAccessLevels}
        accessOpen={Boolean(accessPresence.renderedValue)}
        activeMode={activeMode}
        brandMark={<MasterflowMark className="proto-mf-mark" />}
        characterActive={characterOpen}
        homeActive={!characterOpen && activeMode === 'home'}
        mobileLabel={activePrototypeProfile.mobileLabel}
        modeGroups={navigationModeGroups}
        onCloseRail={() => setRailOpen(false)}
        onOpenActions={() => {
          setRailOpen(false);
          openActionLibrary();
        }}
        onOpenCharacter={() => {
          if (!characterOpen) openCharacterPage();
        }}
        onOpenHome={selectHome}
        onOpenSettings={openSettingsPanel}
        onPointerEnter={() => {
          if (window.matchMedia('(min-width: 761px)').matches) setRailOpen(true);
        }}
        onPointerLeave={() => {
          if (!window.matchMedia('(min-width: 761px)').matches) return;
          setRailOpen(false);
          setAccessOpen(false);
        }}
        onSelectAccess={(id) => {
          if (runtimeBridge.context) {
            setAccessOpen(false);
            return;
          }
          setAccessLevel(id as AccessLevel);
          selectMode('project');
          setAccessOpen(false);
        }}
        onSelectMode={(id) => selectMode(id as DemoMode)}
        onToggleAccess={() => setAccessOpen((current) => !current)}
        profileAvatar={activePrototypeProfile.avatarAsset}
        profileName={activePrototypeProfile.name}
      />

      <section className="proto-workspace" aria-label="Prototype shell Step 1">
        {characterOpen ? (
          <PrototypeCharacterSurface
            canonAlt={activePrototypeProfile.canonAlt}
            canonAsset={activePrototypeProfile.canonAsset}
            closing={characterClosing}
            galaxyOpen={skillGalaxyOpen}
            inventoryItems={activePrototypeProfile.inventoryConnections}
            name={activePrototypeProfile.name}
            onAnimationEnd={(event) => {
              if (!characterClosing || event.animationName !== 'proto-page-out') return;
              setCharacterOpen(false);
              setCharacterClosing(false);
              setSelectedSkillArcId(null);
              setSkillsOverviewOpen(false);
            }}
            onClose={closeCharacterPage}
            profileId={activePrototypeProfile.id}
            punchline={characterPunchline}
            rankTitle={profileRank.title}
            skillsOverviewOpen={skillsOverviewOpen}
          >
            <PrototypeSkilltreeSurface
              activePersonaMood={activePersonaMood}
              activePersonaStat={activePersonaStat}
              activeProfileName={activePrototypeProfile.name}
              activeSkillArcs={activeSkillArcs}
              activeSkillFamily={activeSkillFamily}
              displayedPersonaMood={displayedPersonaMood}
              onSelectArc={(arcId) => {
                setSelectedSkillArcId(arcId);
                setSkillsOverviewOpen(false);
              }}
              onSelectSkillSliderIndex={selectSkillSliderIndex}
              personaDisplayValue={personaDisplayValue}
              portraitLayers={portraitLayers}
              selectedSkillArc={selectedSkillArc}
              shortLabels={activePrototypeProfile.shortLabels}
              skillFamilyColors={skillFamilyColors}
              skillGalaxyOpen={skillGalaxyOpen}
              skillSliderIndex={skillSliderIndex}
              skillsOverviewOpen={skillsOverviewOpen}
            />
          </PrototypeCharacterSurface>
        ) : null}

        {settingsPresence.renderedValue ? (
          <PrototypeOverlayFrame
            className="proto-overlay"
            closing={settingsPresence.closing}
            onClose={() => setSettingsOpen(false)}
          >
            <div aria-label="Paramètres du profil" aria-modal="true" className={`proto-settings${settingsPresence.closing ? ' is-closing' : ''}`} role="dialog">
              <button aria-label="Fermer les paramètres" className="proto-settings__close" onClick={() => setSettingsOpen(false)} type="button">
                <X size={19} />
              </button>
              <aside className="proto-settings__menu">
                <strong>Paramètres</strong>
                <button type="button"><UserRound size={17} /> Compte</button>
                <button className="is-active" type="button"><Palette size={17} /> Interface</button>
                <button type="button"><ShieldCheck size={17} /> Accessibilité</button>
                <button type="button"><Mic size={17} /> Voix et transcription</button>
                <button type="button"><Bell size={17} /> Notifications</button>
                <button type="button"><Lock size={17} /> Confidentialité</button>
              </aside>
              <div className="proto-settings__content">
                <small>Interface</small>
                <h2>Apparence</h2>
                <section className="proto-profile-switcher" aria-label="Profil prototype actif">
                  <h3>Profil prototype</h3>
                  <div>
                    {prototypeProfileIds.map((profileId) => {
                      const profile = getPrototypeProfile(profileId);
                      return (
                      <button
                        aria-pressed={activePrototypeProfileId === profile.id}
                        key={profile.id}
                        onClick={() => applyPrototypeProfile(profile.id)}
                        type="button"
                      >
                        <span>
                          <img alt="" src={profile.avatarAsset} />
                        </span>
                        <strong>{profile.name}</strong>
                        <small>{profile.id === 'profkrapu' ? 'Orchidée rose · science verte' : 'MasterFlow · bleu persona'}</small>
                      </button>
                      );
                    })}
                  </div>
                </section>
                <div className="proto-theme-choice" role="group" aria-label="Thème de l’interface">
                  <button aria-pressed={appearanceTheme === 'auto'} onClick={() => setAppearanceTheme('auto')} type="button">
                    <Monitor size={20} />
                    <span>Automatique</span>
                  </button>
                  <button aria-pressed={appearanceTheme === 'dark'} onClick={() => setAppearanceTheme('dark')} type="button">
                    <Moon size={20} />
                    <span>Sombre</span>
                  </button>
                  <button aria-pressed={appearanceTheme === 'light'} onClick={() => setAppearanceTheme('light')} type="button">
                    <Sun size={20} />
                    <span>Clair</span>
                  </button>
                </div>
                <div className="proto-theme-customizer">
                  <section>
                    <h3>Palettes recommandées</h3>
                    <div className="proto-palette-presets" role="group" aria-label="Palettes recommandées">
                      {themePalettes.map((palette) => (
                        <button
                          aria-label={palette.label}
                          aria-pressed={themePaletteId === palette.id}
                          key={palette.id}
                          onClick={() => {
                            setThemePaletteId(palette.id);
                            setPersonaColor(palette.userColor);
                          }}
                          type="button"
                        >
                          <span className="proto-palette-presets__colors" aria-hidden="true">
                            <i style={{background: palette.color}} />
                            <i style={{background: palette.userColor}} />
                            <i style={{background: palette.supportColor}} />
                          </span>
                          <strong>{palette.label}</strong>
                          <small>{palette.logic}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3>Ta nuance</h3>
                    <div className="proto-color-swatches" role="group" aria-label="Couleur personnelle et bulles utilisateur">
                      {themePalette.userTones.map((option) => (
                        <button
                          aria-label={option.label}
                          aria-pressed={personaColor === option.color}
                          key={option.color}
                          onClick={() => setPersonaColor(option.color)}
                          style={{'--swatch-color': option.color} as CSSProperties}
                          type="button"
                        >
                          <span />
                          <small>{option.label}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3>Valeurs</h3>
                    <button
                      aria-pressed={paletteValuesInverted}
                      className="proto-value-switch"
                      onClick={() => setPaletteValuesInverted((current) => !current)}
                      type="button"
                    >
                      <span aria-hidden="true">
                        <i style={{background: interfaceColor}} />
                      </span>
                      <strong>{paletteValuesInverted ? 'Valeurs inversées' : 'Valeurs originales'}</strong>
                      <small>{paletteValuesInverted ? 'La couleur solo pilote l’interface' : 'La palette pilote l’interface'}</small>
                    </button>
                  </section>
                  <section className="proto-theme-preview" aria-label="Aperçu des rôles de couleur">
                    <div>
                      <span style={{background: interfaceColor}} />
                      <small>Interface</small>
                    </div>
                    <div>
                      <span style={{background: userRoleColor}} />
                      <small>Toi · bulles</small>
                    </div>
                    <div>
                      <span style={{background: themePalette.supportColor}} />
                      <small>Signal secondaire</small>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </PrototypeOverlayFrame>
        ) : null}

        {renderedActionLibraryOpen ? (
          <PrototypeActionLibrary
            actions={runtimeLibraryActions}
            categories={actionCategories}
            closing={actionLibraryClosing}
            onClose={() => setActionLibraryOpen(false)}
            onSearchChange={setActionSearch}
            onSelectAction={(actionId) => {
              const action = runtimeBridge.context?.available_actions.find((candidate) => candidate.action_id === actionId);
              if (runtime && action) runtime.onActionSelect(action);
              setActionLibraryOpen(false);
            }}
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
          appearanceLight={resolvedAppearance === 'light'}
          brandMark={<MasterflowMark className="proto-wordmark__mark" />}
          dmCount={dmCount}
          notificationCount={notificationCount}
          onClosePanel={() => setSystemPanel(null)}
          onExit={() => {
            if (runtime) runtime.onLogout();
            else {
              clearRuntimeAuthToken();
              window.location.assign('/');
            }
          }}
          onOpenCharacter={openCharacterPage}
          onOpenHome={selectHome}
          onQuickSearchChange={setQuickSearch}
          onTogglePanel={(panel) => {
            if (panel === 'search') setQuickSearch('');
            setSystemPanel((current) => current === panel ? null : panel);
          }}
          onToggleRail={() => setRailOpen((current) => !current)}
          onToggleTheme={() => setAppearanceTheme(resolvedAppearance === 'light' ? 'dark' : 'light')}
          panel={systemPanel}
          panelClosing={systemPanelPresence.closing}
          profileAvatar={activePrototypeProfile.avatarAsset}
          profileName={activePrototypeProfile.name}
          quickSearch={quickSearch}
          queueCount={queueCount}
          railOpen={railOpen}
          renderedPanel={systemPanelPresence.renderedValue}
          searchResults={runtimeSearchResults}
        />

        <div className="proto-canvas-empty">
          {activeMode === 'home' ? (
            <PrototypeHomeSurface
              attentionLabel={runtime?.attentionLabel}
              checkpointLabel={runtime?.checkpointLabel}
              copy={homeCopy}
              onPrimaryAction={homePrimaryModes[0] ? () => selectMode(homePrimaryModes[0]!.id as DemoMode) : undefined}
              onSelectMode={(mode) => selectMode(mode as DemoMode)}
              primaryActionLabel={homePrimaryModes[0] ? `Reprendre ${homePrimaryModes[0]!.label}` : undefined}
              primaryModes={homePrimaryModes}
              secondaryModes={homeSecondaryModes}
            />
          ) : null}
          {activeMode === 'masterbuild' && runtimeBridge.context?.user.role === 'godmode' ? (
            <MasterbuildConsole operator={runtimeBridge.context.user.display_name} />
          ) : null}
          {activeMode !== 'home' && activeMode !== 'masterbuild' ? runtime?.renderWorkspace(activeMode) : null}
          {runtime && runtime.actionState.status !== 'idle' ? (
            <aside className={`proto-runtime-status proto-runtime-status--${runtime.actionState.status}`} aria-live="polite">
              <strong>{runtime.actionState.status}</strong>
              <span>{runtime.actionState.message}</span>
            </aside>
          ) : null}
        </div>

        <PrototypeActionRail
          actions={commandSuggestions.slice(0, 3)}
          libraryOpen={actionLibraryOpen}
          onOpenLibrary={openActionLibrary}
        />

        <PrototypeCommandDock
          dockPanel={dockPanel}
          dockPanelClosing={dockPanelClosing}
          expandedHistoryId={expandedHistoryId}
          historyClosing={historyPresence.closing}
          historyItems={runtimeHistoryItems}
          historyOpen={Boolean(historyPresence.renderedValue)}
          input={dockInput}
          onCloseHistory={() => setHistoryOpen(false)}
          onInputChange={runtime ? runtime.chat.onInputChange : setInput}
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
            if (runtime) return;
            const nextDock = resolveMicroToggle({dockPanel});
            setRecording(nextDock.recording);
            setDockPanel(nextDock.dockPanel);
            setHistoryOpen(nextDock.historyOpen);
          }}
          onToggleRecording={() => {
            if (!runtime) setRecording((current) => !current);
          }}
          onToggleTranscription={() => {
            if (!runtime) setTranscribing((current) => !current);
          }}
          microAvailable={!runtime}
          runtimeState={runtime?.chat.state}
          recording={recording}
          renderedDockPanel={renderedDockPanel}
          showSuggestions={Boolean(dockPanel || historyPresence.renderedValue)}
          suggestions={commandSuggestions}
          transcribing={transcribing}
        />
        {!tunnelOpen && tunnelPromptVisible ? (
          <PrototypeTunnelPromptCard
            onAccept={() => setTunnelOpen(true)}
            onDismiss={() => setTunnelPromptVisible(false)}
            prompt={tunnelFixture.prompt}
          />
        ) : null}
        {tunnelOpen ? (
          <PrototypeTunnel
            closing={tunnelClosing}
            contextSummary={tunnelFixture.contextSummary}
            input={input}
            messages={tunnelFixture.messages}
            onAnimationEnd={() => {
              setTunnelOpen(false);
              setTunnelClosing(false);
            }}
            onAcceptPrompt={() => setInput('Oui, développe ce point.')}
            onClose={closeTunnel}
            onDismissPrompt={closeTunnel}
            onInputChange={setInput}
            onInputKeyDown={submitOnEnter}
            onSubmit={submit}
            participants={tunnelFixture.participants}
            prompt={activePrototypeProfile.tunnelPrompt}
            tunnelPrompt={tunnelFixture.prompt}
          />
        ) : null}
      </section>
    </main>
  );
}
