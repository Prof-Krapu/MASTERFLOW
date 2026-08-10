import {ArrowRight, CheckCircle2, FlaskConical, GitPullRequest, MonitorUp, ShieldCheck} from 'lucide-react';
import type {ReactElement} from 'react';

import masterflexCanon from '../assets/masterflex-canon-full.png';
import masterflexNeutral from '../assets/masterflex-portraits/neutral.png';
import masterflowWordmark from '../assets/masterflow-wordmark.svg';
import profkrapuCanon from '../assets/profkrapu-canon/profkrapu-canon-v4.png';
import profkrapuNeutral from '../assets/profkrapu-portraits/neutral.png';
import {studentPlaceholderA, studentPlaceholderB} from '../student-avatar-assets.ts';

const semanticTokens = [
  ['Marque', 'var(--mf-brand)'],
  ['Action', 'var(--mf-action)'],
  ['Persona', 'var(--persona-color)'],
  ['Support', 'var(--mf-support)'],
  ['Succès', 'var(--mf-success)'],
  ['Attention', 'var(--mf-warning)'],
  ['Danger', 'var(--mf-danger)'],
  ['Focus', 'var(--mf-focus)'],
] as const;

export function ComponentLabFoundations(): ReactElement {
  return (
    <section className="ui-lab-foundations">
      <header><small>Fondations actives</small><h1>Une grammaire commune avant les pages.</h1><p>Tokens sémantiques, états interactifs et formulaires utilisent les mêmes règles dans le Lab, le Proto et le runtime.</p></header>
      <div className="ui-lab-foundations__tokens">
        {semanticTokens.map(([label, color]) => <article key={label}><span style={{background: color}} /><strong>{label}</strong><small>{color}</small></article>)}
      </div>
      <div className="ui-lab-foundations__samples">
        <article><small>Actions</small><div><button type="button">Principale</button><button className="is-secondary" type="button">Secondaire</button><button disabled type="button">Indisponible</button></div></article>
        <article><small>Champ et focus</small><label><span>Nom de la classe</span><input defaultValue="4CREA A" /></label><p>Le focus doit rester visible et ne jamais être masqué par le Dock.</p></article>
        <article><small>États honnêtes</small><div className="ui-lab-foundations__statuses"><span>Prêt</span><span>Lecture seule</span><span>Non raccordé</span><span>Futur</span></div></article>
      </div>
    </section>
  );
}

export function ComponentLabAssets({brandMark}: {brandMark: ReactElement}): ReactElement {
  return (
    <section className="ui-lab-assets">
      <header><small>Assets actifs uniquement</small><h1>Identité réellement utilisée</h1><p>Les candidats lourds et archives historiques ne sont pas réimportés automatiquement dans le Lab.</p></header>
      <div className="ui-lab-assets__grid">
        <article className="is-logo"><span>Logo dynamique actif</span>{brandMark}<strong>MasterFlow mark</strong><small>Même tracé que le Shell, couleurs pilotées par le profil.</small></article>
        <article className="is-wordmark"><span>Wordmark actif</span><img alt="MasterFlow" src={masterflowWordmark} /><strong>MasterFlow wordmark</strong></article>
        <article><span>Persona actif</span><img alt="Portrait neutre MasterFlex" src={masterflexNeutral} /><strong>MasterFlex</strong><small>Portrait neutre runtime</small></article>
        <article><span>Canon actif</span><img alt="MasterFlex en pied" src={masterflexCanon} /><strong>MasterFlex canon</strong></article>
        <article><span>Persona actif</span><img alt="Portrait neutre ProfKrapu" src={profkrapuNeutral} /><strong>ProfKrapu</strong><small>Portrait neutre runtime</small></article>
        <article><span>Canon actif</span><img alt="ProfKrapu en pied" src={profkrapuCanon} /><strong>ProfKrapu canon V4</strong></article>
        <article><span>Fallback étudiant actif</span><img alt="Silhouette étudiante provisoire, variante A" src={studentPlaceholderA} /><strong>Étudiant · variante A</strong><small>Décoratif, sans déduction d’identité</small></article>
        <article><span>Fallback étudiant actif</span><img alt="Silhouette étudiante provisoire, variante B" src={studentPlaceholderB} /><strong>Étudiant · variante B</strong><small>Décoratif, sans déduction d’identité</small></article>
      </div>
    </section>
  );
}

export function ComponentLabPipeline(): ReactElement {
  const steps = [
    {detail: 'Composer et tester sans backend.', icon: FlaskConical, label: 'Lab'},
    {detail: 'Assembler dans l’expérience complète.', icon: MonitorUp, label: 'Proto'},
    {detail: 'Vérifier Bible, états et permissions.', icon: ShieldCheck, label: 'Preflight'},
    {detail: 'Brancher uniquement après validation.', icon: GitPullRequest, label: 'Runtime et Git'},
  ];
  return (
    <section className="ui-lab-pipeline">
      <header><small>Promotion contrôlée</small><h1>Une seule route de sortie.</h1><p>Aucune page du Lab ne devient automatiquement canon ou runtime.</p></header>
      <div>{steps.map((step, index) => { const Icon = step.icon; return <article key={step.label}><Icon size={25} /><strong>{step.label}</strong><p>{step.detail}</p>{index < steps.length - 1 ? <ArrowRight aria-hidden="true" className="ui-lab-pipeline__arrow" size={20} /> : <CheckCircle2 aria-hidden="true" className="ui-lab-pipeline__done" size={20} />}</article>; })}</div>
    </section>
  );
}
