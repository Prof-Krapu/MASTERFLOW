import {
  ArrowLeft,
  BookOpen,
  Boxes,
  GraduationCap,
  Home,
  MessageCircle,
  MicOff,
  Presentation,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import './current-ui-demo.css';

type DemoMode = 'home' | 'teaching' | 'project' | 'learning';
type DemoTurn = {id: number; role: 'user' | 'assistant'; content: string};

const modes = [
  {id: 'home', label: 'Home', signal: 'Reprendre', icon: Home},
  {id: 'teaching', label: 'Teaching', signal: 'Piloter', icon: GraduationCap},
  {id: 'project', label: 'Project', signal: 'Construire', icon: Boxes},
  {id: 'learning', label: 'Learning', signal: 'Progresser', icon: BookOpen},
] as const;

function HomeDemo({onTeaching}: {onTeaching: () => void}): ReactElement {
  return (
    <div className="home-dashboard">
      <article className="home-card home-card--context">
        <h3 className="home-card__title">Tu es ici</h3>
        <p className="home-card__main">Cockpit personnel MasterFlow</p>
        <div className="home-card__meta"><span>MasterFlex</span><span>Home</span></div>
        <p className="home-card__signal">Le contexte utile est chargé.</p>
      </article>
      <article className="home-card home-card--next-action">
        <h3 className="home-card__title">Prochaine action</h3>
        <p className="home-card__main">Préparer la séance IA de 4CREA A</p>
        <button onClick={onTeaching} type="button">Ouvrir Teaching</button>
      </article>
      <article className="home-card home-card--resume">
        <h3 className="home-card__title">À reprendre</h3>
        <p className="home-card__main">Ours d’Or 2026</p>
        <p className="home-card__signal">Progression : 64 %</p>
      </article>
      <article className="home-card home-card--watch">
        <h3 className="home-card__title">À surveiller</h3>
        <p className="home-card__count">3 validations</p>
      </article>
      <article className="home-card home-card--resources">
        <h3 className="home-card__title">Ressources utiles</h3>
        <p className="home-card__count">12 sources validées</p>
      </article>
      <article className="home-card home-card--modes">
        <h3 className="home-card__title">État système</h3>
        <p className="home-card__main">Aucun blocage critique</p>
      </article>
    </div>
  );
}

function TeachingDemo({onProjection}: {onProjection: () => void}): ReactElement {
  return (
    <article className="panel adaptive-page adaptive-page--attention">
      <header className="adaptive-page__header">
        <div>
          <p className="eyebrow">Teaching / cockpit professeur</p>
          <h2>4CREA A</h2>
          <p>24 étudiants · roster V3 · trois sujets actifs.</p>
        </div>
        <div className="adaptive-page__status adaptive-page__status--attention">
          <strong>Prêt avec réserves</strong>
          <span>Quatre identités restent à confirmer.</span>
        </div>
      </header>
      <section className="adaptive-page__next">
        <p className="eyebrow">Prochaine action</p>
        <div className="current-demo__action">
          <strong>Relire les rapprochements étudiants incertains.</strong>
          <button type="button">Commencer</button>
        </div>
      </section>
      <div className="teaching-readiness__grid">
        {[
          ['Classe', 'Prête', 'Roster actif et ressources disponibles.'],
          ['Sujets', 'Partiel', 'Un sujet reste à assigner.'],
          ['Corrections', 'Prêt', '18 rendus reçus sur 24.'],
          ['Météo', 'Inconnue', 'Aucune météo collective inventée.'],
          ['Feedbacks', 'Partiel', '4 retours attendent validation.'],
          ['Projection', 'Prête', 'Robot CDC IA assigné.'],
        ].map(([label, status, detail]) => (
          <section className="teaching-readiness__item teaching-readiness__item--partial" key={label}>
            <div><strong>{label}</strong><span>{status}</span></div>
            <p>{detail}</p>
          </section>
        ))}
      </div>
      <article className="teaching-guided">
        <div className="teaching-guided__heading">
          <div><strong>Robot CDC IA</strong><span>Compagnon assigné</span></div>
          <button className="secondary" onClick={onProjection} type="button">
            <Presentation size={16} /> Projeter
          </button>
        </div>
        <p className="muted compact">Aide le groupe à cadrer son outil sans produire le travail.</p>
      </article>
      <details className="teaching-advanced">
        <summary><span>Atelier Teaching avancé</span><small>Sujets, rosters, barèmes et corrections</small></summary>
        <div className="teaching-advanced__content">
          <p className="muted">Les formulaires techniques restent disponibles mais cachés au repos.</p>
        </div>
      </details>
    </article>
  );
}

function ProjectDemo(): ReactElement {
  return (
    <article className="panel adaptive-page adaptive-page--ready">
      <header className="adaptive-page__header">
        <div><p className="eyebrow">Project / espace de travail</p><h2>Ours d’Or 2026</h2><p>Canon, participants et prochaines étapes.</p></div>
        <div className="adaptive-page__status adaptive-page__status--ready"><strong>Synchronisé</strong><span>Contexte projet chargé.</span></div>
      </header>
      <section className="adaptive-page__next">
        <p className="eyebrow">Prochaine action</p>
        <div className="current-demo__action"><strong>Valider le prochain palier des monstres-idées.</strong><button type="button">Ouvrir</button></div>
      </section>
      <div className="adaptive-page__layout">
        <main className="adaptive-page__main">
          <section className="project-section">
            <div className="panel-header"><h3>Progression</h3><span className="counter">64%</span></div>
            <progress max="100" value="64">64%</progress>
            <div className="object-deck">
              <article className="object-card"><div><strong>Brief concours</strong><span>Canon validé</span></div><small>prêt</small></article>
              <article className="object-card"><div><strong>Assets participants</strong><span>8 candidats</span></div><small>review</small></article>
            </div>
          </section>
        </main>
        <aside className="adaptive-page__context">
          <strong>Contexte</strong>
          <dl className="adaptive-context-facts">
            <div><dt>Membres</dt><dd>12</dd></div>
            <div><dt>Sources</dt><dd>18</dd></div>
            <div><dt>Validations</dt><dd>3</dd></div>
          </dl>
        </aside>
      </div>
    </article>
  );
}

function LearningDemo(): ReactElement {
  return (
    <article className="panel adaptive-page adaptive-page--ready">
      <header className="adaptive-page__header">
        <div><p className="eyebrow">Learning / parcours personnel</p><h2>Concevoir un outil IA</h2><p>Programme guidé, ressources et progression.</p></div>
        <div className="adaptive-page__status adaptive-page__status--ready"><strong>En cours</strong><span>Étape 3 sur 7.</span></div>
      </header>
      <section className="adaptive-page__next">
        <p className="eyebrow">Prochaine action</p>
        <div className="current-demo__action"><strong>Regarder « Transformer un besoin en CDC » · 08:42</strong><button type="button">Continuer</button></div>
      </section>
      <div className="current-demo__learning-grid">
        <article className="home-card"><h3 className="home-card__title">Progression</h3><p className="home-card__count">42%</p><progress max="100" value="42">42%</progress></article>
        <article className="home-card"><h3 className="home-card__title">Compétences</h3><p className="home-card__main">Cadrage · Recherche · Prototypage</p></article>
        <article className="home-card"><h3 className="home-card__title">Ressources</h3><p className="home-card__count">6</p><p className="home-card__signal">Toutes validées</p></article>
      </div>
    </article>
  );
}

export function CurrentUiDemo(): ReactElement {
  const [mode, setMode] = useState<DemoMode>('home');
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<DemoTurn[]>([
    {id: 1, role: 'assistant', content: 'Je suis prêt. On reprend par quoi ?'},
  ]);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;
    setTurns((current) => [
      ...current,
      {id: Date.now(), role: 'user', content: value},
      {id: Date.now() + 1, role: 'assistant', content: 'Démo : je routerais cette demande vers le contexte actif.'},
    ]);
    setInput('');
    setChatOpen(true);
  };

  return (
    <main className="current-demo">
      <header className="topbar current-demo__topbar">
        <div className="topbar__brand"><p className="eyebrow">MasterFlow · démo navigable</p><h1>Interface actuelle</h1></div>
        <div className="topbar__meta"><span className="status status--ready">simulation</span><a className="current-demo__exit" href="/">Quitter</a></div>
      </header>
      <div className="current-demo__layout">
        <nav className="panel mode-rail current-demo__nav" aria-label="Modes de démonstration">
          {modes.map((item) => {
            const Icon = item.icon;
            return (
              <button className={`mode-button${mode === item.id ? ' mode-button--active' : ''}`} key={item.id} onClick={() => setMode(item.id)} type="button">
                <Icon size={18} /><strong>{item.label}</strong><span>{item.signal}</span>
              </button>
            );
          })}
        </nav>

        <section className="current-demo__workspace">
          {mode === 'home' ? <HomeDemo onTeaching={() => setMode('teaching')} /> : null}
          {mode === 'teaching' ? <TeachingDemo onProjection={() => setProjectionOpen(true)} /> : null}
          {mode === 'project' ? <ProjectDemo /> : null}
          {mode === 'learning' ? <LearningDemo /> : null}

          <div className={`chat-dock${chatOpen ? ' chat-dock--expanded' : ''}`}>
            <div className="chat-dock__header">
              <div><span className="chat-dock__persona-state">MasterFlex · Disponible</span><small>Conversation simulée</small></div>
              <button className="secondary chat-dock__expand" onClick={() => setChatOpen((current) => !current)} type="button">
                <MessageCircle size={16} /> {chatOpen ? 'Réduire' : 'Ouvrir'}
              </button>
            </div>
            {chatOpen ? <div className="chat-dock__log">{turns.map((turn) => <article className={`chat-dock__turn chat-dock__turn--${turn.role}`} key={turn.id}><strong>{turn.role === 'user' ? 'Vous' : 'MasterFlex'}</strong><p>{turn.content}</p></article>)}</div> : null}
            <form className="chat-dock__form" onSubmit={submit}><input onChange={(event) => setInput(event.target.value)} placeholder="Simuler une demande…" value={input} /><button disabled={!input.trim()} type="submit"><Send size={16} /></button></form>
          </div>
        </section>

        <aside className="persona-rail current-demo__persona" aria-label="Persona de démonstration">
          <div className="persona-rail__state"><span className="persona-rail__pulse" /><span>Disponible</span></div>
          <div className="persona-rail__avatar"><span>MF</span></div>
          <div className="persona-rail__identity"><p className="eyebrow">Compagnon actif</p><h2>MasterFlex</h2><p>Coaching / production</p></div>
          <span className="persona-rail__asset">Visuel provisoire</span>
          <div className="persona-rail__details"><small>Démo statique : aucune donnée, permission ou action réelle.</small></div>
        </aside>
      </div>

      {projectionOpen ? (
        <section className="class-projection" role="dialog" aria-modal="true">
          <header className="class-projection__header"><div><p className="eyebrow">Projection classe · 4CREA A</p><span>Robot CDC IA · simulation</span></div><button className="secondary" onClick={() => setProjectionOpen(false)} type="button"><ArrowLeft size={18} /> Retour</button></header>
          <div className="class-projection__stage"><div className="class-projection__character"><span>R</span><small>Visuel provisoire</small></div><div className="class-projection__dialogue"><p className="eyebrow">Robot CDC IA</p><h1>Votre outil répond-il à un vrai besoin ?</h1><blockquote>Je ne ferai pas le CDC à votre place. Mais je peux repérer ce qui reste flou.</blockquote></div></div>
          <div className="class-projection__controls"><div className="class-projection__voice-state"><MicOff size={19} /><div><strong>Micro simulé</strong><span>Aucune transcription réelle dans cette démo.</span></div></div><button onClick={() => setProjectionOpen(false)} type="button">Revenir au sujet</button></div>
          <footer className="class-projection__footer"><ShieldCheck size={18} /><span>Projection de démonstration · aucune donnée étudiante affichée.</span></footer>
        </section>
      ) : null}
    </main>
  );
}
