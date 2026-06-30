import {
  Bell,
  BookOpen,
  Boxes,
  ChevronRight,
  Clock3,
  Command,
  FileText,
  GraduationCap,
  Home,
  LogOut,
  Maximize2,
  MessageCircle,
  Mic,
  MoreHorizontal,
  Palette,
  PanelRightOpen,
  PlayCircle,
  Search,
  Send,
  Settings,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import {useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import masterflexAsset from './assets/masterflex-ui-v2.png';
import profKrapuAsset from './assets/profkrapu-ui-v2.png';
import './current-ui-demo.css';

type DemoMode = 'home' | 'teaching' | 'project' | 'learning';
type ContextPanel = 'notifications' | 'resources' | 'profile' | null;
type PersonaState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'success'
  | 'soft_alert'
  | 'validation_required'
  | 'inactive'
  | 'summoned'
  | 'handoff';

const personaStateLabels: Record<PersonaState, string> = {
  idle: 'Disponible',
  listening: 'Écoute',
  thinking: 'Analyse',
  speaking: 'Réponse',
  success: 'Validé',
  soft_alert: 'À préciser',
  validation_required: 'Validation',
  inactive: 'En veille',
  summoned: 'Invoqué',
  handoff: 'Relais',
};

const modes = [
  {id: 'home', label: 'Home', icon: Home},
  {id: 'teaching', label: 'Teaching', icon: GraduationCap},
  {id: 'project', label: 'Project', icon: Boxes},
  {id: 'learning', label: 'Learning', icon: BookOpen},
] as const;

const actions = [
  {
    id: 'teaching',
    eyebrow: 'Teaching',
    title: 'Reprendre 4CREA A',
    detail: '18 rendus à relire',
    icon: GraduationCap,
    accent: 'orange',
  },
  {
    id: 'project',
    eyebrow: 'Projet actif',
    title: 'Ours d’Or 2026',
    detail: 'Valider le prochain palier',
    icon: Sparkles,
    accent: 'gold',
  },
  {
    id: 'learning',
    eyebrow: 'Learning',
    title: 'Continuer le parcours IA',
    detail: 'Étape 3 sur 7',
    icon: PlayCircle,
    accent: 'blue',
  },
  {
    id: 'resources',
    eyebrow: 'Ressources',
    title: 'Ouvrir les références',
    detail: '6 ressources utiles',
    icon: FileText,
    accent: 'violet',
  },
] as const;

const resources = [
  {label: 'CDC d’un outil IA', type: 'Document', icon: FileText},
  {label: 'Du besoin au prototype', type: 'Vidéo · 08:42', icon: PlayCircle},
  {label: 'Références Ours d’Or', type: 'Projet', icon: Sparkles},
] as const;

function HomeView({
  onMode,
  onResources,
}: {
  onMode: (mode: DemoMode) => void;
  onResources: () => void;
}): ReactElement {
  return (
    <section className="mf-home" aria-labelledby="mf-home-title">
      <header className="mf-home__welcome">
        <p>30 juin · Ton espace est prêt</p>
        <h1 id="mf-home-title">Bonjour Malex.</h1>
        <span>Trois dynamiques avancent. Une attention mérite ton regard.</span>
      </header>

      <article className="mf-atmosphere" aria-label="État pédagogique général">
        <div className="mf-atmosphere__copy">
          <span className="mf-kicker"><Sparkles size={15} /> Météo pédagogique</span>
          <h2>Le terrain est vivant.</h2>
          <p>Les projets progressent bien. La correction de 4CREA A concentre l’attention du moment.</p>
        </div>

        <div className="mf-landscape" aria-hidden="true">
          <div className="mf-landscape__glow" />
          <div className="mf-landscape__line mf-landscape__line--one" />
          <div className="mf-landscape__line mf-landscape__line--two" />
          <div className="mf-landscape__line mf-landscape__line--three" />
          <span className="mf-landscape__node mf-landscape__node--teaching"><i />4CREA A</span>
          <span className="mf-landscape__node mf-landscape__node--project"><i />Ours d’Or</span>
          <span className="mf-landscape__node mf-landscape__node--learning"><i />Parcours IA</span>
        </div>

        <dl className="mf-atmosphere__signals">
          <div><dt>En mouvement</dt><dd>3 pôles</dd></div>
          <div><dt>À reprendre</dt><dd>1 priorité</dd></div>
          <div><dt>Énergie</dt><dd>Stable</dd></div>
        </dl>
      </article>

      <section className="mf-home__actions" aria-labelledby="mf-actions-title">
        <div className="mf-section-heading">
          <div><span>Maintenant</span><h2 id="mf-actions-title">Où veux-tu reprendre ?</h2></div>
          <button aria-label="Afficher plus d’actions" className="mf-icon-button" type="button">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="mf-action-grid">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                className={`mf-action-card mf-action-card--${action.accent}`}
                key={action.id}
                onClick={() => {
                  if (action.id === 'resources') onResources();
                  else onMode(action.id);
                }}
                type="button"
              >
                <span className="mf-action-card__icon"><Icon size={22} /></span>
                <span className="mf-action-card__copy">
                  <small>{action.eyebrow}</small>
                  <strong>{action.title}</strong>
                  <em>{action.detail}</em>
                </span>
                <ChevronRight className="mf-action-card__arrow" size={18} />
              </button>
            );
          })}
        </div>
      </section>
    </section>
  );
}

function ModePreview({mode}: {mode: Exclude<DemoMode, 'home'>}): ReactElement {
  const content = {
    teaching: {
      eyebrow: 'Teaching',
      title: 'Vue pédagogique',
      copy: 'Classes, sujets et corrections seront recomposés dans ce visualiseur après validation de la Home.',
      facts: ['4 classes', '3 sujets actifs', '18 corrections'],
    },
    project: {
      eyebrow: 'Project',
      title: 'Ours d’Or 2026',
      copy: 'Le contexte, le brief, le canon et les participants prendront place dans la prochaine composition.',
      facts: ['64 %', '12 membres', '3 validations'],
    },
    learning: {
      eyebrow: 'Learning',
      title: 'Concevoir un outil IA',
      copy: 'Progression, compétences et ressources seront visualisées sans revenir à un dashboard textuel.',
      facts: ['Étape 3/7', '3 compétences', '6 ressources'],
    },
  }[mode];

  return (
    <section className="mf-room-preview">
      <span className="mf-kicker">{content.eyebrow}</span>
      <h1>{content.title}</h1>
      <p>{content.copy}</p>
      <div className="mf-room-preview__facts">
        {content.facts.map((fact) => <span key={fact}>{fact}</span>)}
      </div>
    </section>
  );
}

function ContextDrawer({panel, onClose}: {panel: Exclude<ContextPanel, null>; onClose: () => void}): ReactElement {
  const heading = panel === 'resources' ? 'Ressources utiles' : panel === 'notifications' ? 'À regarder' : 'Ton espace';
  return (
    <aside className="mf-context" aria-label={heading}>
      <header>
        <div><span>Contexte</span><h2>{heading}</h2></div>
        <button aria-label="Fermer le panneau" className="mf-icon-button" onClick={onClose} type="button"><X size={19} /></button>
      </header>
      {panel === 'resources' ? (
        <div className="mf-resource-list">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return <button key={resource.label} type="button"><Icon size={19} /><span><strong>{resource.label}</strong><small>{resource.type}</small></span><ChevronRight size={16} /></button>;
          })}
        </div>
      ) : null}
      {panel === 'notifications' ? (
        <div className="mf-notification-list">
          <article><i className="mf-dot mf-dot--orange" /><div><strong>4CREA A</strong><p>Quatre identités restent à confirmer.</p></div></article>
          <article><i className="mf-dot mf-dot--blue" /><div><strong>Parcours IA</strong><p>Une nouvelle ressource est disponible.</p></div></article>
        </div>
      ) : null}
      {panel === 'profile' ? (
        <div className="mf-profile-panel">
          <div className="mf-profile-panel__avatar">M</div>
          <strong>Malex</strong>
          <span>Godmode · thème graphite</span>
          <button type="button"><Palette size={17} /> Personnaliser le thème</button>
          <button type="button"><Settings size={17} /> Préférences</button>
        </div>
      ) : null}
    </aside>
  );
}

export function CurrentUiDemo(): ReactElement {
  const [mode, setMode] = useState<DemoMode>('home');
  const [contextPanel, setContextPanel] = useState<ContextPanel>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [personaState, setPersonaState] = useState<PersonaState>('idle');
  const [input, setInput] = useState('');
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setLastMessage(`On reprend « ${message} ». Je prépare le bon espace.`);
    setPersonaState('speaking');
    setInput('');
  };

  return (
    <main className={`mf-os${focusMode ? ' mf-os--focus' : ''}`} data-persona-state={personaState}>
      <nav className="mf-dock" aria-label="Navigation principale">
        <button className="mf-dock__profile" onClick={() => setContextPanel('profile')} title="Profil Malex" type="button">
          <span>M</span><strong>Malex</strong>
        </button>
        <div className="mf-dock__modes">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={mode === item.id ? 'page' : undefined}
                className={mode === item.id ? 'is-active' : ''}
                key={item.id}
                onClick={() => setMode(item.id)}
                title={item.label}
                type="button"
              >
                <Icon size={21} /><strong>{item.label}</strong>
              </button>
            );
          })}
        </div>
        <div className="mf-dock__tools">
          <button title="Rechercher" type="button"><Search size={20} /><strong>Rechercher</strong></button>
          <button title="Theme Studio" type="button"><Palette size={20} /><strong>Theme Studio</strong></button>
          <button title="Réglages" type="button"><Settings size={20} /><strong>Réglages</strong></button>
        </div>
      </nav>

      <section className="mf-stage">
        <header className="mf-toolbar">
          <a className="mf-wordmark" href="?ui_spike=current">MasterFlow</a>
          <div>
            <button aria-label="Ouvrir les notifications" className="mf-icon-button mf-toolbar__notification" onClick={() => setContextPanel('notifications')} type="button">
              <Bell size={19} /><span />
            </button>
            <button aria-label="Basculer le mode focus" className="mf-icon-button" onClick={() => setFocusMode((current) => !current)} type="button"><Maximize2 size={19} /></button>
            <button aria-label="Ouvrir le panneau contextuel" className="mf-icon-button" onClick={() => setContextPanel('resources')} type="button"><PanelRightOpen size={19} /></button>
            <a aria-label="Quitter le prototype" className="mf-icon-button" href="/"><LogOut size={19} /></a>
          </div>
        </header>

        <div className="mf-visualizer">
          {mode === 'home' ? <HomeView onMode={setMode} onResources={() => setContextPanel('resources')} /> : <ModePreview mode={mode} />}
        </div>

        <aside className="mf-persona-rail" aria-label="Compagnon MasterFlex">
          <div className="mf-persona-rail__status">
            <span data-state={personaState} />
            {personaStateLabels[personaState]}
          </div>
          <div className={`mf-persona-bubble${lastMessage ? ' is-visible' : ''}`} role="status">
            {lastMessage ? (
              <button aria-label="Fermer la réponse" onClick={() => { setLastMessage(null); setPersonaState('idle'); }} type="button"><X size={14} /></button>
            ) : null}
            <strong>MasterFlex</strong>
            <span>{lastMessage ?? 'Je suis là. Dis-moi ce que tu veux reprendre, je garde le cockpit clair.'}</span>
          </div>
          <div className="mf-persona" aria-hidden="true">
            <div className="mf-persona__halo" />
            <img alt="" src={masterflexAsset} />
          </div>
        </aside>

        <aside className="mf-interlocutor" aria-label="Interlocuteur consulté">
          <div className="mf-interlocutor__bubble">
            <strong>ProfKrapu</strong>
            <span>Consulté si la réponse touche à la pédagogie ou au cadrage de classe.</span>
          </div>
          <div className="mf-interlocutor__avatar" aria-hidden="true">
            <img alt="" src={profKrapuAsset} />
          </div>
        </aside>

        <form className="mf-launcher" onSubmit={submit}>
          <button aria-label="Commandes rapides" className="mf-icon-button" type="button"><Command size={19} /></button>
          <input
            aria-label="Demander à MasterFlow"
            onChange={(event) => {
              setInput(event.target.value);
              if (personaState !== 'listening') setPersonaState(event.target.value ? 'thinking' : 'idle');
            }}
            placeholder="Que veux-tu faire ?"
            value={input}
          />
          <button
            aria-label={personaState === 'listening' ? 'Arrêter l’écoute' : 'Activer le micro'}
            className={`mf-icon-button${personaState === 'listening' ? ' is-listening' : ''}`}
            onClick={() => setPersonaState((current) => current === 'listening' ? 'idle' : 'listening')}
            type="button"
          >
            <Mic size={19} />
          </button>
          <button aria-label="Envoyer" className="mf-launcher__send" disabled={!input.trim()} type="submit"><Send size={18} /></button>
        </form>
      </section>

      {contextPanel ? <ContextDrawer onClose={() => setContextPanel(null)} panel={contextPanel} /> : null}

      <nav className="mf-mobile-nav" aria-label="Navigation mobile">
        {modes.map((item) => {
          const Icon = item.icon;
          return <button aria-current={mode === item.id ? 'page' : undefined} key={item.id} onClick={() => setMode(item.id)} type="button"><Icon size={19} /><span>{item.label}</span></button>;
        })}
        <button onClick={() => setContextPanel('profile')} type="button"><UserRound size={19} /><span>Profil</span></button>
      </nav>

      <span className="mf-clock"><Clock3 size={14} /> 09:42</span>
      <MessageCircle className="mf-sr-only" />
    </main>
  );
}
