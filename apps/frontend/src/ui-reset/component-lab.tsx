import {Boxes, CheckCircle2, Code2, GitPullRequest, Link2, Monitor, Smartphone} from 'lucide-react';
import {useEffect, useMemo, useState} from 'react';
import type {CSSProperties, ReactElement} from 'react';

import masterflowMark from '../assets/masterflow-mark-graff.svg';
import '../current-ui-demo.css';
import {
  accessLevels,
  accessModeMap,
  buildPrototypeHomeModes,
  buildPrototypeModeGroups,
  getPrototypeProfile,
  getPrototypeThemePalette,
  prototypeProfileIds,
} from './prototype-profile-registry';
import type {AccessLevel, DemoMode, PrototypeProfileId} from './prototype-profile-registry';
import {PrototypeHomeSurface} from './prototype-product-surfaces';
import {PrototypeNavigationRail} from './prototype-shell-components';
import {componentLabWorkspaces} from './component-lab-workspaces';
import type {ComponentLabWorkspaceId} from './component-lab-workspaces';
import './component-lab.css';

type LabSection = 'home' | 'navigation' | 'identity' | 'pipeline';
type LabViewport = 'desktop' | 'mobile';

interface ComponentLabProps {
  workspaceId: ComponentLabWorkspaceId;
}

interface PersistedLabState {
  accessLevel?: AccessLevel;
  activeMode?: DemoMode;
  profileId?: PrototypeProfileId;
  section?: LabSection;
  viewport?: LabViewport;
}

const sections: Array<{id: LabSection; label: string}> = [
  {id: 'home', label: 'Home'},
  {id: 'navigation', label: 'Navigation'},
  {id: 'identity', label: 'Identité active'},
  {id: 'pipeline', label: 'Promotion'},
];

const workspaceFocus: Record<ComponentLabWorkspaceId, {description: string; focus: string[]}> = {
  malex: {
    description: 'UI, DA, navigation, rythme, microcopy et comportement du prototype.',
    focus: ['Expérience visuelle', 'Responsive', 'Interaction', 'Cohérence du proto'],
  },
  vincent: {
    description: 'États runtime, permissions et contrats visibles sans appeler le backend.',
    focus: ['États', 'Permissions', 'Contrats', 'Limites runtime'],
  },
};

const isAccessLevel = (value: unknown): value is AccessLevel =>
  accessLevels.some((level) => level.id === value);

const isProfileId = (value: unknown): value is PrototypeProfileId =>
  prototypeProfileIds.includes(value as PrototypeProfileId);

const isSection = (value: unknown): value is LabSection =>
  sections.some((section) => section.id === value);

const readPersistedState = (workspaceId: ComponentLabWorkspaceId): PersistedLabState => {
  try {
    const value = window.localStorage.getItem(`masterflow.component-lab.${workspaceId}`);
    if (!value) return {};
    const parsed = JSON.parse(value) as PersistedLabState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

function ActiveAssetCard({label, src, detail}: {label: string; src: string; detail: string}): ReactElement {
  return (
    <article className="component-lab__asset-card">
      <span>Actif sur main</span>
      <img alt={label} src={src} />
      <div>
        <strong>{label}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export function ComponentLab({workspaceId}: ComponentLabProps): ReactElement {
  const workspace = componentLabWorkspaces[workspaceId];
  const initialState = useMemo(() => readPersistedState(workspaceId), [workspaceId]);
  const [profileId, setProfileId] = useState<PrototypeProfileId>(
    isProfileId(initialState.profileId) ? initialState.profileId : workspace.defaultProfileId,
  );
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(
    isAccessLevel(initialState.accessLevel) ? initialState.accessLevel : 'godmode',
  );
  const [section, setSection] = useState<LabSection>(
    isSection(initialState.section) ? initialState.section : 'home',
  );
  const [viewport, setViewport] = useState<LabViewport>(initialState.viewport === 'mobile' ? 'mobile' : 'desktop');
  const [activeMode, setActiveMode] = useState<DemoMode>(initialState.activeMode ?? 'project');
  const [railOpen, setRailOpen] = useState(true);
  const [accessOpen, setAccessOpen] = useState(false);

  const profile = getPrototypeProfile(profileId);
  const palette = getPrototypeThemePalette(profile.defaultThemePaletteId);
  const availableModeIds = accessModeMap[accessLevel];
  const visibleModes = useMemo(() => new Set<DemoMode>(availableModeIds), [availableModeIds]);
  const modeGroups = buildPrototypeModeGroups(visibleModes, true);
  const homeModes = buildPrototypeHomeModes(availableModeIds);

  useEffect(() => {
    if (visibleModes.has(activeMode)) return;
    setActiveMode(availableModeIds[0] ?? 'project');
  }, [activeMode, availableModeIds, visibleModes]);

  useEffect(() => {
    window.localStorage.setItem(`masterflow.component-lab.${workspaceId}`, JSON.stringify({
      accessLevel,
      activeMode,
      profileId,
      section,
      viewport,
    } satisfies PersistedLabState));
  }, [accessLevel, activeMode, profileId, section, viewport, workspaceId]);

  const previewStyle = {
    '--persona-color': profile.personaColor,
    '--proto-accent': palette.color,
    '--proto-bg': '#08090b',
    '--proto-border': 'rgba(255, 255, 255, 0.13)',
    '--proto-muted': '#aaa5a1',
    '--proto-surface': '#101114',
    '--proto-text': '#f5f1ed',
    '--proto-user-color': profile.personaColor,
    '--proto-warm-white': '#f5f1ed',
  } as CSSProperties;

  return (
    <main className="component-lab" style={previewStyle}>
      <header className="component-lab__header">
        <a aria-label="Ouvrir le prototype assemblé" className="component-lab__brand" href="/ui-reset">
          <img alt="" src={masterflowMark} />
          <span><small>Atelier partagé</small><strong>Component Lab</strong></span>
        </a>
        <nav aria-label="Espaces Component Lab" className="component-lab__workspaces">
          <a aria-current={workspaceId === 'malex' ? 'page' : undefined} href="/ui-lab">MALEX</a>
          <a aria-current={workspaceId === 'vincent' ? 'page' : undefined} href="/ui-lab/vincent">Vincent</a>
        </nav>
        <a className="component-lab__prototype-link" href="/ui-reset"><Link2 size={16} /> Prototype unique</a>
      </header>

      <section className="component-lab__intro">
        <div>
          <small>{workspace.label} · {workspace.owner}</small>
          <h1>Tester ici. Assembler dans le proto. Brancher ensuite.</h1>
          <p>{workspaceFocus[workspaceId].description}</p>
        </div>
        <ul>
          {workspaceFocus[workspaceId].focus.map((item) => <li key={item}><CheckCircle2 size={15} /> {item}</li>)}
        </ul>
      </section>

      <section className="component-lab__controls" aria-label="Réglages du banc de test">
        <div>
          <small>Composant</small>
          {sections.map((item) => (
            <button aria-pressed={section === item.id} key={item.id} onClick={() => setSection(item.id)} type="button">
              {item.label}
            </button>
          ))}
        </div>
        <label>
          <span>Profil actif</span>
          <select onChange={(event) => setProfileId(event.target.value as PrototypeProfileId)} value={profileId}>
            {prototypeProfileIds.map((id) => <option key={id} value={id}>{getPrototypeProfile(id).name}</option>)}
          </select>
        </label>
        <label>
          <span>Accès simulé</span>
          <select onChange={(event) => setAccessLevel(event.target.value as AccessLevel)} value={accessLevel}>
            {accessLevels.map((level) => <option key={level.id} value={level.id}>{level.label}</option>)}
          </select>
        </label>
        <div className="component-lab__viewport">
          <small>Viewport</small>
          <button aria-pressed={viewport === 'desktop'} onClick={() => setViewport('desktop')} type="button"><Monitor size={17} /> Desktop</button>
          <button aria-pressed={viewport === 'mobile'} onClick={() => setViewport('mobile')} type="button"><Smartphone size={17} /> Mobile</button>
        </div>
      </section>

      <section className={`component-lab__bench is-${viewport}`} aria-label={`Banc de test ${section}`}>
        <header>
          <span><Boxes size={17} /><strong>{sections.find((item) => item.id === section)?.label}</strong></span>
          <small>Fixture locale · aucun backend · assets actifs uniquement</small>
        </header>

        {section === 'home' ? (
          <div className="component-lab__stage component-lab__stage--home">
            <PrototypeHomeSurface
              copy={{
                eyebrow: `${workspace.label} · ${accessLevels.find((level) => level.id === accessLevel)?.label}`,
                title: `Bonjour ${profile.displayName}`,
                body: 'Cette surface utilise les mêmes composants et profils que le prototype unique.',
              }}
              onSelectMode={(mode) => setActiveMode(mode as DemoMode)}
              primaryModes={homeModes.slice(0, 3)}
              secondaryModes={homeModes.slice(3)}
            />
          </div>
        ) : null}

        {section === 'navigation' ? (
          <div className={`component-lab__stage component-lab__stage--navigation proto-shell${railOpen ? ' proto-shell--rail-open' : ''}`}>
            <PrototypeNavigationRail
              accessClosing={false}
              accessLevel={accessLevel}
              accessLevels={accessLevels}
              accessOpen={accessOpen}
              activeMode={activeMode}
              brandMark={<img alt="" className="component-lab__nav-mark" src={masterflowMark} />}
              characterActive={false}
              homeActive={false}
              mobileLabel={profile.mobileLabel}
              modeGroups={modeGroups}
              onCloseRail={() => setRailOpen(false)}
              onOpenActions={() => undefined}
              onOpenCharacter={() => setSection('identity')}
              onOpenHome={() => setSection('home')}
              onOpenSettings={() => setAccessOpen((current) => !current)}
              onPointerEnter={() => setRailOpen(true)}
              onPointerLeave={() => undefined}
              onSelectAccess={(id) => {
                if (isAccessLevel(id)) setAccessLevel(id);
                setAccessOpen(false);
              }}
              onSelectMode={(id) => setActiveMode(id as DemoMode)}
              onToggleAccess={() => setAccessOpen((current) => !current)}
              profileAvatar={profile.avatarAsset}
              profileName={profile.name}
            />
            <div className="component-lab__navigation-copy">
              <small>Mode sélectionné</small>
              <strong>{modeGroups.flatMap((group) => group.modes).find((mode) => mode.id === activeMode)?.label}</strong>
              <p>La liste varie avec l’accès simulé. Aucun droit réel n’est modifié.</p>
            </div>
          </div>
        ) : null}

        {section === 'identity' ? (
          <div className="component-lab__stage component-lab__stage--identity">
            <ActiveAssetCard detail="Portrait utilisé dans la navigation" label={`${profile.name} · avatar`} src={profile.avatarAsset} />
            <ActiveAssetCard detail="Personnage utilisé dans la page profil" label={`${profile.name} · canon`} src={profile.canonAsset} />
            <aside>
              <small>Contrat actif</small>
              <h2>{profile.name}</h2>
              <p>{profile.defaultPunchline}</p>
              <dl>
                <div><dt>Profil</dt><dd>{profile.id}</dd></div>
                <div><dt>Modes simulés</dt><dd>{availableModeIds.length}</dd></div>
                <div><dt>Assets candidats</dt><dd>0 importé</dd></div>
              </dl>
            </aside>
          </div>
        ) : null}

        {section === 'pipeline' ? (
          <div className="component-lab__stage component-lab__stage--pipeline">
            {[
              {icon: Boxes, label: '1. Lab', text: 'Composant isolé et états locaux.'},
              {icon: Code2, label: '2. Prototype', text: 'Assemblage dans /ui-reset.'},
              {icon: Link2, label: '3. Runtime', text: 'Raccord aux contrats réels après validation.'},
              {icon: GitPullRequest, label: '4. GitHub', text: 'Draft PR, revue humaine puis merge.'},
            ].map((step) => {
              const Icon = step.icon;
              return <article key={step.label}><Icon size={24} /><strong>{step.label}</strong><p>{step.text}</p></article>;
            })}
          </div>
        ) : null}
      </section>

      <footer className="component-lab__footer">
        <span>Source unique : GitHub `main`</span>
        <span>Lab local partagé par le code, pas par des données</span>
        <span>Aucun candidat ou archive importé</span>
      </footer>
    </main>
  );
}
