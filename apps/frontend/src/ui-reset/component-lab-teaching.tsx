import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileSpreadsheet,
  FileUp,
  GraduationCap,
  Megaphone,
  Palette,
  PenTool,
  School,
  Shapes,
  Sparkles,
  UsersRound,
  Video,
} from 'lucide-react';
import {useState} from 'react';
import type {ReactElement} from 'react';
import type {LucideIcon} from 'lucide-react';

import './component-lab.css';

type TeachingLabView =
  | {kind: 'overview'}
  | {kind: 'class'; classId: string}
  | {kind: 'subject'; subjectId: string}
  | {kind: 'import'};

export type TeachingSurfaceSubject = {
  color: string;
  icon: LucideIcon;
  id: string;
  title: string;
  situation?: string;
  tension?: string;
  mission?: string;
  decision?: string;
};

export type TeachingSurfaceClass = {
  color: string;
  icon: LucideIcon;
  id: string;
  levelId: string;
  name: string;
  period?: string | null;
  size: number | null;
  subjectIds: string[];
};

type ComponentLabTeachingProps = {
  classes?: TeachingSurfaceClass[];
  dataMode?: 'fixture' | 'runtime';
  onManageClass?: (classId?: string) => void;
  onManageSubject?: (subjectId?: string) => void;
  subjects?: TeachingSurfaceSubject[];
};

const demoSubjects: TeachingSurfaceSubject[] = [
  {color: '#f15d32', icon: Palette, id: 'da', title: 'Direction artistique'},
  {color: '#3979e8', icon: Megaphone, id: 'strategy', title: 'Stratégie créative'},
  {color: '#8b62c9', icon: Video, id: 'motion', title: 'Motion design'},
  {color: '#f15d32', icon: PenTool, id: 'copy', title: 'Conception-rédaction'},
  {color: '#3979e8', icon: Shapes, id: 'branding', title: 'Identité de marque'},
];

const levels = [
  {id: 'year-1', label: '1re année', short: '01'},
  {id: 'year-2', label: '2e année', short: '02'},
  {id: 'year-3', label: '3e année', short: '03'},
  {id: 'year-4', label: '4e année', short: '04'},
  {id: 'year-5', label: '5e année', short: '05'},
];

const demoClasses: TeachingSurfaceClass[] = [
  {color: '#f15d32', icon: School, id: 'class-1a', levelId: 'year-1', name: '1A Création', size: 28, subjectIds: ['branding', 'copy']},
  {color: '#3979e8', icon: Shapes, id: 'class-1b', levelId: 'year-1', name: '1B Design', size: 26, subjectIds: ['da', 'branding']},
  {color: '#8b62c9', icon: Video, id: 'class-2a', levelId: 'year-2', name: '2A Digital', size: 24, subjectIds: ['motion', 'strategy']},
  {color: '#f15d32', icon: PenTool, id: 'class-2b', levelId: 'year-2', name: '2B Création', size: 27, subjectIds: ['copy', 'da']},
  {color: '#3979e8', icon: Megaphone, id: 'class-3a', levelId: 'year-3', name: '3A Concept', size: 22, subjectIds: ['strategy', 'branding']},
  {color: '#3979e8', icon: BriefcaseBusiness, id: 'class-3b', levelId: 'year-3', name: '3B Projet', size: 25, subjectIds: ['strategy', 'motion']},
  {color: '#f15d32', icon: Sparkles, id: 'class-4a', levelId: 'year-4', name: '4CREA A', size: 21, subjectIds: ['da', 'copy', 'motion']},
  {color: '#8b62c9', icon: GraduationCap, id: 'class-5a', levelId: 'year-5', name: '5A Direction', size: 18, subjectIds: ['strategy', 'da']},
];

function SubjectGlyph({subject, small = false}: {small?: boolean; subject: TeachingSurfaceSubject}): ReactElement {
  const Icon = subject.icon;
  return (
    <span
      aria-label={subject.title}
      className={`teaching-lab__subject-glyph${small ? ' is-small' : ''}`}
      style={{'--teaching-color': subject.color} as React.CSSProperties}
      title={subject.title}
    >
      <Icon aria-hidden="true" size={small ? 15 : 24} />
    </span>
  );
}

function ClassDetail({item, onBack, onOpenSubject, subjects, onManage, dataMode}: {
  item: TeachingSurfaceClass;
  onBack: () => void;
  onOpenSubject: (subjectId: string) => void;
  subjects: TeachingSurfaceSubject[];
  onManage?: () => void;
  dataMode: 'fixture' | 'runtime';
}): ReactElement {
  const Icon = item.icon;
  const linkedSubjects = item.subjectIds.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is TeachingSurfaceSubject => Boolean(subject));
  return (
    <section className="teaching-lab__detail">
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> Toutes les classes</button>
      <header>
        <span className="teaching-lab__class-glyph" style={{'--teaching-color': item.color} as React.CSSProperties}><Icon size={38} /></span>
        <div>
          <small>{levels.find((level) => level.id === item.levelId)?.label ?? 'Niveau à préciser'}</small>
          <h2>{item.name}</h2>
          <p>{item.size === null ? 'Liste étudiante non renseignée' : `${item.size} étudiant${item.size > 1 ? 's' : ''}`}{item.period ? ` · ${item.period}` : ''}</p>
        </div>
      </header>
      <div className="teaching-lab__detail-grid">
        <article>
          <small>Sujets affectés</small>
          <div className="teaching-lab__subject-list">
            {linkedSubjects.length > 0
              ? linkedSubjects.map((subject) => <button key={subject.id} onClick={() => onOpenSubject(subject.id)} type="button"><SubjectGlyph subject={subject} /><span><strong>{subject.title}</strong><small>Ouvrir le sujet</small></span><ChevronRight size={18} /></button>)
              : <p>Aucun sujet affecté à cette classe.</p>}
          </div>
        </article>
        <article>
          <small>Étudiants</small>
          <div className="teaching-lab__student-placeholder">
            <UsersRound size={34} />
            <strong>{item.size === null ? 'Roster à compléter' : `${item.size} identités roster`}</strong>
            <p>{dataMode === 'runtime' ? 'Les identités disponibles restent privées et liées à cette classe.' : 'Les vignettes Persona seront travaillées ici après validation de la composition Classe.'}</p>
            {onManage ? <button className="secondary" onClick={onManage} type="button">Gérer cette classe</button> : null}
          </div>
        </article>
      </div>
    </section>
  );
}

function SubjectDetail({item, onBack, classes, onManage}: {item: TeachingSurfaceSubject; onBack: () => void; classes: TeachingSurfaceClass[]; onManage?: () => void}): ReactElement {
  const assignedClasses = classes.filter((classItem) => classItem.subjectIds.includes(item.id));
  const story = [
    {label: 'Situation', value: item.situation},
    {label: 'Tension', value: item.tension},
    {label: 'Mission', value: item.mission},
    {label: 'Décision', value: item.decision},
  ];
  return (
    <section className="teaching-lab__detail">
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> Tous les sujets</button>
      <header><SubjectGlyph subject={item} /><div><small>Sujet</small><h2>{item.title}</h2><p>{assignedClasses.length} classe{assignedClasses.length > 1 ? 's' : ''} affectée{assignedClasses.length > 1 ? 's' : ''}</p></div></header>
      <div className="teaching-lab__story-sequence">
        {story.map((part, index) => <article key={part.label}><span>{String(index + 1).padStart(2, '0')}</span><strong>{part.label}</strong><p>{part.value ?? 'À renseigner dans le sujet versionné.'}</p></article>)}
      </div>
      <div className="teaching-lab__assigned-classes">
        <small>Classes affectées</small>
        {assignedClasses.length > 0 ? assignedClasses.map((classItem) => <span key={classItem.id}>{classItem.name}</span>) : <p>Aucune affectation active.</p>}
        {onManage ? <button className="secondary" onClick={onManage} type="button">Ouvrir l’atelier du sujet</button> : null}
      </div>
    </section>
  );
}

function PronoteImport({onBack}: {onBack: () => void}): ReactElement {
  return (
    <section className="teaching-lab__import">
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> Retour à Teaching</button>
      <header><FileSpreadsheet size={36} /><div><small>Nouvelle classe</small><h2>Importer depuis Pronote</h2><p>Parcours de démonstration : aucun fichier n’est envoyé ni enregistré.</p></div></header>
      <ol>
        <li className="is-current"><span>1</span><strong>Choisir le CSV</strong><small>Export élèves Pronote</small></li>
        <li><span>2</span><strong>Vérifier les colonnes</strong><small>Nom, prénom, groupe</small></li>
        <li><span>3</span><strong>Prévisualiser</strong><small>Contrôle du roster</small></li>
        <li><span>4</span><strong>Confirmer</strong><small>Création après validation</small></li>
      </ol>
      <button className="teaching-lab__dropzone" type="button"><FileUp size={30} /><strong>Choisir un fichier CSV Pronote</strong><span>Fixture locale — import réel non raccordé</span></button>
    </section>
  );
}

export function ComponentLabTeaching({
  classes = demoClasses,
  dataMode = 'fixture',
  onManageClass,
  onManageSubject,
  subjects = demoSubjects,
}: ComponentLabTeachingProps = {}): ReactElement {
  const [view, setView] = useState<TeachingLabView>({kind: 'overview'});
  const visibleLevels = classes.some((item) => !levels.some((level) => level.id === item.levelId))
    ? [...levels, {id: 'other', label: 'Niveau à préciser', short: '—'}]
    : levels;

  if (view.kind === 'class') {
    const item = classes.find((candidate) => candidate.id === view.classId);
    if (item) return <ClassDetail dataMode={dataMode} item={item} onBack={() => setView({kind: 'overview'})} onManage={onManageClass ? () => onManageClass(item.id) : undefined} onOpenSubject={(subjectId) => setView({kind: 'subject', subjectId})} subjects={subjects} />;
  }
  if (view.kind === 'subject') {
    const item = subjects.find((candidate) => candidate.id === view.subjectId);
    if (item) return <SubjectDetail classes={classes} item={item} onBack={() => setView({kind: 'overview'})} onManage={onManageSubject ? () => onManageSubject(item.id) : undefined} />;
  }
  if (view.kind === 'import' && dataMode === 'fixture') return <PronoteImport onBack={() => setView({kind: 'overview'})} />;

  return (
    <section className="teaching-lab" aria-label="Teaching Lab">
      <header className="teaching-lab__hero">
        <div><small>{dataMode === 'runtime' ? 'Espace pédagogique' : 'Page en construction · référence Persona'}</small><h1>Teaching</h1><p>Les classes d’abord, rangées par niveau. Les détails viennent seulement après le clic.</p></div>
        <button disabled={dataMode === 'runtime' && !onManageClass} onClick={() => dataMode === 'runtime' ? onManageClass?.() : setView({kind: 'import'})} type="button"><FileUp size={19} /> {dataMode === 'runtime' ? 'Gérer les classes' : 'Importer une classe Pronote'}</button>
      </header>

      <section className="teaching-lab__horizon" aria-label="Météo pédagogique">
        <span><Sparkles size={18} /><strong>Météo pédagogique</strong></span>
        <p>{classes.length > 0 ? `${classes.length} classe${classes.length > 1 ? 's' : ''} · ${subjects.length} sujet${subjects.length > 1 ? 's' : ''}.` : 'Aucune classe disponible · dynamique d’apprentissage : données insuffisantes.'}</p>
      </section>

      <div className="teaching-lab__levels">
        {visibleLevels.map((level) => {
          const levelClasses = classes.filter((item) => item.levelId === level.id);
          return (
            <section className="teaching-lab__level" key={level.id}>
              <header><span>{level.short}</span><strong>{level.label}</strong><small>{levelClasses.length} classe{levelClasses.length > 1 ? 's' : ''}</small></header>
              <div>
                {levelClasses.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button className="teaching-lab__class" key={item.id} onClick={() => setView({kind: 'class', classId: item.id})} type="button">
                      <span className="teaching-lab__class-glyph" style={{'--teaching-color': item.color} as React.CSSProperties}><Icon size={26} /></span>
                      <span><strong>{item.name}</strong><small>{item.size === null ? 'Roster à compléter' : `${item.size} étudiant${item.size > 1 ? 's' : ''}`}</small></span>
                      <span className="teaching-lab__class-subjects">{item.subjectIds.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is TeachingSurfaceSubject => Boolean(subject)).map((subject) => <SubjectGlyph key={subject.id} small subject={subject} />)}</span>
                      <ChevronRight size={18} />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="teaching-lab__subjects">
        <header><BookOpen size={20} /><div><small>Bibliothèque</small><h2>Sujets</h2></div></header>
        <div>{subjects.length > 0
          ? subjects.map((subject) => <button key={subject.id} onClick={() => setView({kind: 'subject', subjectId: subject.id})} type="button"><SubjectGlyph subject={subject} /><strong>{subject.title}</strong><small>{classes.filter((item) => item.subjectIds.includes(subject.id)).length} classes</small></button>)
          : <button disabled={!onManageSubject} onClick={() => onManageSubject?.()} type="button"><span className="teaching-lab__subject-glyph" style={{'--teaching-color': '#f15d32'} as React.CSSProperties}><BookOpen size={24} /></span><strong>Créer le premier sujet</strong><small>Ouvrir l’atelier Teaching</small></button>}
        </div>
      </section>

      <p className="teaching-lab__truth"><Check size={16} /> {dataMode === 'runtime' ? 'Classes, sujets, affectations et rosters proviennent du runtime. Aucun climat ni score n’est inventé.' : 'Fixtures visuelles uniquement. Aucun score, élève, affectation ou import n’est présenté comme une donnée runtime.'}</p>
    </section>
  );
}
