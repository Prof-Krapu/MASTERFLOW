export type PrototypeUiDockPanel = 'keyboard' | 'micro' | null;
export type PrototypeUiViewMode = 'normal' | 'focus' | 'fullscreen';

export type PrototypeUiStateId =
  | 'tunnel'
  | 'shortcuts'
  | 'settings'
  | 'action-library'
  | 'system-panel'
  | 'history'
  | 'access-menu'
  | 'keyboard'
  | 'micro'
  | 'recording'
  | 'rail'
  | 'focus-view'
  | 'fullscreen-view';

export type PrototypeUiStateSnapshot = {
  accessOpen: boolean;
  actionLibraryOpen: boolean;
  dockPanel: PrototypeUiDockPanel;
  historyOpen: boolean;
  railOpen: boolean;
  recording: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  systemPanelOpen: boolean;
  tunnelOpen: boolean;
  viewMode: PrototypeUiViewMode;
};

export type PrototypeUiStateDefinition = {
  id: PrototypeUiStateId;
  label: string;
  family: 'conversation' | 'overlay' | 'navigation' | 'view';
  layer: number;
  blocksBackground: boolean;
  closesOnOutsideClick: boolean;
  closesOnEscape: boolean;
};

export const prototypeUiStateDefinitions: readonly PrototypeUiStateDefinition[] = [
  {id: 'tunnel', label: 'Mode Tunnel', family: 'overlay', layer: 900, blocksBackground: true, closesOnOutsideClick: false, closesOnEscape: true},
  {id: 'shortcuts', label: 'Raccourcis', family: 'overlay', layer: 820, blocksBackground: true, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'settings', label: 'Paramètres', family: 'overlay', layer: 800, blocksBackground: true, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'action-library', label: 'Actions', family: 'overlay', layer: 760, blocksBackground: true, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'system-panel', label: 'Panel système', family: 'overlay', layer: 620, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'history', label: 'Historique', family: 'conversation', layer: 520, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'access-menu', label: 'Menu accès', family: 'navigation', layer: 430, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'keyboard', label: 'Clavier', family: 'conversation', layer: 330, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'micro', label: 'Micro', family: 'conversation', layer: 330, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'recording', label: 'REC', family: 'conversation', layer: 340, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'rail', label: 'Menu gauche', family: 'navigation', layer: 300, blocksBackground: false, closesOnOutsideClick: true, closesOnEscape: true},
  {id: 'focus-view', label: 'Interface masquée', family: 'view', layer: 120, blocksBackground: false, closesOnOutsideClick: false, closesOnEscape: true},
  {id: 'fullscreen-view', label: 'Plein écran', family: 'view', layer: 110, blocksBackground: false, closesOnOutsideClick: false, closesOnEscape: true},
] as const;

export const prototypeUiExclusionGroups = [
  {
    id: 'exclusive-dock',
    label: 'Un seul dock conversationnel',
    states: ['keyboard', 'micro'] as const,
  },
  {
    id: 'exclusive-modal',
    label: 'Une seule grande surface au-dessus',
    states: ['tunnel', 'settings', 'action-library', 'shortcuts'] as const,
  },
  {
    id: 'exclusive-view',
    label: 'Un seul mode de vue',
    states: ['focus-view', 'fullscreen-view'] as const,
  },
] as const;

export function getActivePrototypeUiStates(snapshot: PrototypeUiStateSnapshot): PrototypeUiStateId[] {
  const active: PrototypeUiStateId[] = [];
  if (snapshot.tunnelOpen) active.push('tunnel');
  if (snapshot.shortcutsOpen) active.push('shortcuts');
  if (snapshot.settingsOpen) active.push('settings');
  if (snapshot.actionLibraryOpen) active.push('action-library');
  if (snapshot.systemPanelOpen) active.push('system-panel');
  if (snapshot.historyOpen) active.push('history');
  if (snapshot.accessOpen) active.push('access-menu');
  if (snapshot.dockPanel === 'keyboard') active.push('keyboard');
  if (snapshot.dockPanel === 'micro') active.push('micro');
  if (snapshot.recording) active.push('recording');
  if (snapshot.railOpen) active.push('rail');
  if (snapshot.viewMode === 'focus') active.push('focus-view');
  if (snapshot.viewMode === 'fullscreen') active.push('fullscreen-view');
  return active;
}

export function getTopBlockingPrototypeUiState(snapshot: PrototypeUiStateSnapshot): PrototypeUiStateDefinition | null {
  const activeStates = new Set(getActivePrototypeUiStates(snapshot));
  return [...prototypeUiStateDefinitions]
    .filter((definition) => activeStates.has(definition.id) && definition.blocksBackground)
    .sort((a, b) => b.layer - a.layer)[0] ?? null;
}

export function resolveKeyboardToggle(snapshot: Pick<PrototypeUiStateSnapshot, 'dockPanel'>): {
  dockPanel: PrototypeUiDockPanel;
  historyOpen: boolean;
  recording: boolean;
} {
  return {
    dockPanel: snapshot.dockPanel === 'keyboard' ? null : 'keyboard',
    historyOpen: false,
    recording: false,
  };
}

export function resolveMicroToggle(snapshot: Pick<PrototypeUiStateSnapshot, 'dockPanel'>): {
  dockPanel: PrototypeUiDockPanel;
  historyOpen: boolean;
  recording: boolean;
} {
  return {
    dockPanel: snapshot.dockPanel === 'micro' ? null : 'micro',
    historyOpen: false,
    recording: false,
  };
}
