import {
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {useState} from 'react';
import type {FormEvent, KeyboardEvent as ReactKeyboardEvent, ReactElement} from 'react';

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
  PrototypeDockPanel,
  PrototypeModeGroup,
  PrototypeSystemPanel,
} from './ui-reset/prototype-shell-components';
import {resolveKeyboardToggle} from './ui-reset/prototype-ui-state-registry';

type ActiveProfile = 'masterflex' | 'profkrapu';

const profiles = {
  masterflex: {
    name: 'MasterFlex',
    portrait: masterflexPortrait,
  },
  profkrapu: {
    name: 'ProfKrapu',
    portrait: profkrapuPortrait,
  },
} as const;

const modeGroups: PrototypeModeGroup[] = [
  {
    label: 'Tranche suivante',
    kind: 'primary',
    modes: [
      {id: 'teaching', label: 'Teaching', icon: GraduationCap, locked: true},
      {id: 'experience', label: 'Expérience', icon: Sparkles, locked: true},
    ],
  },
];

const accessLevels = [
  {id: 'prototype', label: 'Prototype non connecté', icon: ShieldCheck},
];

export function CurrentUiDemo(): ReactElement {
  const [appearanceLight, setAppearanceLight] = useState(false);
  const [dockPanel, setDockPanel] = useState<PrototypeDockPanel>(null);
  const [input, setInput] = useState('');
  const [panel, setPanel] = useState<PrototypeSystemPanel>(null);
  const [profileId, setProfileId] = useState<ActiveProfile>('masterflex');
  const [quickSearch, setQuickSearch] = useState('');
  const [railOpen, setRailOpen] = useState(false);
  const [status, setStatus] = useState('Shell/Dock isolé depuis la PR #214. Aucun runtime connecté.');
  const profile = profiles[profileId];

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!input.trim()) return;
    setStatus('Saisie capturée localement dans le prototype. Aucune action n’a été exécutée.');
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

  const explainLockedSurface = (): void => {
    setStatus('Cette verticale est volontairement hors Lot 3 et reste verrouillée.');
    setRailOpen(false);
  };

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
        accessLevel="prototype"
        accessLevels={accessLevels}
        accessOpen={false}
        activeMode="shell"
        brandMark={<img alt="" src={masterflowMark} />}
        characterActive={false}
        homeActive
        mobileLabel="Lot 3 · Shell/Dock"
        modeGroups={modeGroups}
        onCloseRail={() => setRailOpen(false)}
        onOpenActions={() => setStatus('La bibliothèque d’actions appartient à une tranche ultérieure.')}
        onOpenCharacter={() => {
          setProfileId((current) => current === 'masterflex' ? 'profkrapu' : 'masterflex');
          setStatus('Profil visuel actif changé. Aucune permission n’est recalculée côté UI.');
        }}
        onOpenHome={() => setStatus('Shell/Dock actif. Home reste hors Lot 3.')}
        onOpenSettings={() => setStatus('Les réglages complets restent hors Lot 3.')}
        onPointerEnter={() => setRailOpen(true)}
        onPointerLeave={() => setRailOpen(false)}
        onSelectAccess={() => setStatus('Les permissions restent sous autorité backend.')}
        onSelectMode={explainLockedSurface}
        onToggleAccess={() => setStatus('Aucun changement de rôle n’est disponible dans ce prototype.')}
        profileAvatar={profile.portrait}
        profileName={profile.name}
      />

      <section className="proto-workspace" aria-label="Lot 3 Shell et Command Dock">
        <PrototypeSystemChrome
          appearanceLight={appearanceLight}
          brandMark={<img alt="" src={masterflowMark} />}
          dmCount={0}
          notificationCount={0}
          onClosePanel={() => setPanel(null)}
          onExit={() => window.location.assign('/')}
          onOpenCharacter={() => {
            setProfileId((current) => current === 'masterflex' ? 'profkrapu' : 'masterflex');
            setStatus('Profil visuel actif changé. Aucun asset candidat n’est chargé.');
          }}
          onOpenHome={() => setStatus('Home reste hors Lot 3.')}
          onQuickSearchChange={setQuickSearch}
          onTogglePanel={(nextPanel) => setPanel((current) => current === nextPanel ? null : nextPanel)}
          onToggleRail={() => setRailOpen((current) => !current)}
          onToggleTheme={() => setAppearanceLight((current) => !current)}
          panel={panel}
          panelClosing={false}
          profileAvatar={profile.portrait}
          profileName={profile.name}
          quickSearch={quickSearch}
          queueCount={0}
          railOpen={railOpen}
          renderedPanel={panel}
          searchResults={[]}
        />

        <section className="lot3-shell-proof" aria-labelledby="lot3-shell-title">
          <img alt="" className="lot3-shell-proof__mark" src={masterflowMark} />
          <p>Lot 3 · expérience active isolée</p>
          <h1 id="lot3-shell-title">Shell et Command Dock</h1>
          <span>{status}</span>
          <div className="lot3-shell-proof__limits">
            <span><ShieldCheck size={16} /> Assets actifs uniquement</span>
            <span><Lock size={16} /> Aucun raccord UI/backend ajouté</span>
          </div>
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
          onToggleHistory={() => setStatus('Aucun historique runtime n’est chargé dans le Lot 3.')}
          onToggleKeyboard={toggleKeyboard}
          onToggleMicro={() => setStatus('Le micro réel reste hors Lot 3.')}
          onToggleRecording={() => undefined}
          onToggleTranscription={() => setStatus('La transcription réelle reste hors Lot 3.')}
          recording={false}
          renderedDockPanel={dockPanel}
          showSuggestions={false}
          suggestions={[]}
          transcribing={false}
        />
      </section>
    </main>
  );
}
