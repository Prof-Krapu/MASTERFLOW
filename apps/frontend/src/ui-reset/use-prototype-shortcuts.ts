import {useEffect} from 'react';
import type {Dispatch, MutableRefObject, SetStateAction} from 'react';

import {escapePriority} from './prototype-shortcut-registry';
import {resolveKeyboardToggle, resolveMicroToggle} from './prototype-ui-state-registry';

export type PrototypeDockPanel = 'keyboard' | 'micro' | null;
export type PrototypeViewMode = 'normal' | 'focus' | 'fullscreen';
export type PrototypeCycleDirection = -1 | 1;

export const resolveCycledShortcutDestination = (
  cycle: readonly string[],
  currentDestination: string,
  direction: PrototypeCycleDirection,
): string | null => {
  if (cycle.length < 2) return null;
  const currentIndex = cycle.indexOf(currentDestination);
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  return cycle[(baseIndex + direction + cycle.length) % cycle.length] ?? cycle[0] ?? null;
};

type ShortcutProps = {
  accessOpen: boolean;
  actionLibraryOpen: boolean;
  characterOpen: boolean;
  dockPanel: PrototypeDockPanel;
  historyOpen: boolean;
  modeCycle: string[];
  navigationDestinationRef: MutableRefObject<string>;
  railOpen: boolean;
  settingsOpen: boolean;
  shortcutsOpen: boolean;
  skillSliderIndex: number;
  systemPanelOpen: boolean;
  tunnelOpen: boolean;
  viewMode: PrototypeViewMode;
  closeCharacterPage: () => void;
  closeShortcuts: () => void;
  closeTunnel: () => void;
  navigateTo: (destination: string) => void;
  selectSkillSliderIndex: (index: number) => void;
  setAccessOpen: Dispatch<SetStateAction<boolean>>;
  setActionLibraryOpen: Dispatch<SetStateAction<boolean>>;
  setActionSearch: Dispatch<SetStateAction<string>>;
  setDockPanel: Dispatch<SetStateAction<PrototypeDockPanel>>;
  setHistoryOpen: Dispatch<SetStateAction<boolean>>;
  setQuickSearch: Dispatch<SetStateAction<string>>;
  setRailOpen: Dispatch<SetStateAction<boolean>>;
  setRecording: Dispatch<SetStateAction<boolean>>;
  setSettingsOpen: Dispatch<SetStateAction<boolean>>;
  setShortcutsClosing: Dispatch<SetStateAction<boolean>>;
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>;
  setSystemPanelSearch: () => void;
  setSystemPanelClosed: () => void;
  setTunnelClosing: Dispatch<SetStateAction<boolean>>;
  setTunnelOpen: Dispatch<SetStateAction<boolean>>;
  setViewMode: Dispatch<SetStateAction<PrototypeViewMode>>;
};

export function usePrototypeShortcuts({
  accessOpen,
  actionLibraryOpen,
  characterOpen,
  closeCharacterPage,
  closeShortcuts,
  closeTunnel,
  dockPanel,
  historyOpen,
  modeCycle,
  navigateTo,
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
  setSystemPanelClosed,
  setSystemPanelSearch,
  setTunnelClosing,
  setTunnelOpen,
  setViewMode,
  settingsOpen,
  shortcutsOpen,
  skillSliderIndex,
  systemPanelOpen,
  tunnelOpen,
  viewMode,
}: ShortcutProps): void {
  useEffect(() => {
    const cycleView = (event: KeyboardEvent): void => {
      const target = event.target;
      if (event.key === 'Escape') {
        const escapeHandlers: Record<(typeof escapePriority)[number], () => boolean> = {
          tunnel: () => {
            if (!tunnelOpen) return false;
            closeTunnel();
            return true;
          },
          shortcuts: () => {
            if (!shortcutsOpen) return false;
            closeShortcuts();
            return true;
          },
          settings: () => {
            if (!settingsOpen) return false;
            setSettingsOpen(false);
            return true;
          },
          actions: () => {
            if (!actionLibraryOpen) return false;
            setActionLibraryOpen(false);
            return true;
          },
          'system-panel': () => {
            if (!systemPanelOpen) return false;
            setSystemPanelClosed();
            return true;
          },
          'mobile-character': () => {
            if (!characterOpen || !window.matchMedia('(max-width: 760px)').matches) return false;
            closeCharacterPage();
            return true;
          },
          history: () => {
            if (!historyOpen) return false;
            setHistoryOpen(false);
            return true;
          },
          access: () => {
            if (!accessOpen) return false;
            setAccessOpen(false);
            return true;
          },
          dock: () => {
            if (!dockPanel) return false;
            setDockPanel(null);
            setRecording(false);
            return true;
          },
          rail: () => {
            if (!railOpen) return false;
            setRailOpen(false);
            return true;
          },
          'view-mode': () => {
            if (viewMode === 'normal') return false;
            setViewMode('normal');
            if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
            return true;
          },
        };
        for (const escapeTarget of escapePriority) {
          if (escapeHandlers[escapeTarget]()) return;
        }
        return;
      }

      const isTextTarget = target instanceof HTMLInputElement
        || target instanceof HTMLTextAreaElement
        || (target instanceof HTMLElement && target.isContentEditable);
      const key = event.key.toLowerCase();
      const modeShortcut = (event.metaKey || event.ctrlKey)
        && (event.key === 'ArrowUp' || event.key === 'ArrowDown');

      if (!isTextTarget && key === 't') {
        event.preventDefault();
        if (tunnelOpen) closeTunnel();
        else {
          setActionLibraryOpen(false);
          setDockPanel(null);
          setHistoryOpen(false);
          setRecording(false);
          setSettingsOpen(false);
          setShortcutsOpen(false);
          setSystemPanelClosed();
          setTunnelClosing(false);
          setTunnelOpen(true);
        }
        return;
      }

      if (tunnelOpen) return;

      if (modeShortcut) {
        event.preventDefault();
        const direction: PrototypeCycleDirection = event.key === 'ArrowDown' ? 1 : -1;
        const nextDestination = resolveCycledShortcutDestination(
          modeCycle,
          navigationDestinationRef.current,
          direction,
        );
        if (!nextDestination) return;
        navigationDestinationRef.current = nextDestination;
        navigateTo(nextDestination);
        return;
      }

      if (!isTextTarget && key === 'r') {
        event.preventDefault();
        if (shortcutsOpen) closeShortcuts();
        else {
          setActionLibraryOpen(false);
          setSettingsOpen(false);
          setSystemPanelClosed();
          setShortcutsClosing(false);
          setShortcutsOpen(true);
        }
        return;
      }

      if (shortcutsOpen) return;

      if (
        !isTextTarget
        && characterOpen
        && !settingsOpen
        && !actionLibraryOpen
        && !systemPanelOpen
        && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        selectSkillSliderIndex(skillSliderIndex + (event.key === 'ArrowRight' ? 1 : -1));
        return;
      }

      if (!isTextTarget && key === 'k') {
        event.preventDefault();
        const nextDock = resolveKeyboardToggle({dockPanel});
        setRecording(nextDock.recording);
        setDockPanel(nextDock.dockPanel);
        setHistoryOpen(nextDock.historyOpen);
        return;
      }

      if (!isTextTarget && key === 'm') {
        event.preventDefault();
        const nextDock = resolveMicroToggle({dockPanel});
        setRecording(nextDock.recording);
        setDockPanel(nextDock.dockPanel);
        setHistoryOpen(nextDock.historyOpen);
        return;
      }

      if (!isTextTarget && key === 'h') {
        event.preventDefault();
        setHistoryOpen((current) => !current);
        return;
      }

      if (!isTextTarget && key === 'a') {
        event.preventDefault();
        setActionSearch('');
        if (!actionLibraryOpen) {
          setSettingsOpen(false);
          setShortcutsOpen(false);
          setSystemPanelClosed();
        }
        setActionLibraryOpen((current) => !current);
        return;
      }

      if (!isTextTarget && key === 's') {
        event.preventDefault();
        setQuickSearch('');
        setSystemPanelSearch();
        return;
      }

      if (!isTextTarget && event.key === 'Enter' && dockPanel === 'micro') {
        event.preventDefault();
        setRecording((current) => !current);
        return;
      }

      if (key !== 'f' || isTextTarget) return;

      event.preventDefault();
      setViewMode((current) => {
        if (current === 'normal') {
          void document.documentElement.requestFullscreen?.().catch(() => undefined);
          return 'fullscreen';
        }
        if (current === 'fullscreen') return 'focus';
        if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
        return 'normal';
      });
    };

    window.addEventListener('keydown', cycleView, {capture: true});
    return () => window.removeEventListener('keydown', cycleView, {capture: true});
  }, [
    accessOpen,
    actionLibraryOpen,
    characterOpen,
    closeCharacterPage,
    closeShortcuts,
    closeTunnel,
    dockPanel,
    historyOpen,
    modeCycle,
    navigateTo,
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
    setSystemPanelClosed,
    setSystemPanelSearch,
    setTunnelClosing,
    setTunnelOpen,
    setViewMode,
    settingsOpen,
    shortcutsOpen,
    skillSliderIndex,
    systemPanelOpen,
    tunnelOpen,
    viewMode,
  ]);
}
