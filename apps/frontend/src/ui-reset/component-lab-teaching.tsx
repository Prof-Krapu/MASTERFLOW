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

type TeachingLabView =
  | {kind: 'overview'}
  | {kind: 'class'; classId: string}
  | {kind: 'subject'; subjectId: string}
  | {kind: 'import'};

type TeachingLabSubject = {
  color: string;
  icon: LucideIcon;
  id: string;
  title: string;
};

type TeachingLabClass = {
  color: string;
  icon: LucideIcon;
  id: string;
  levelId: string;
  name: string;
  size: number;
  subjectIds: string[];
};

const subjects: TeachingLabSubject[] = [
  {color: '#f15d32', icon: Palette, id: 'da', title: 'Direction artistique'},
  {color: '#3979e8', icon: Megaphone, id: 'strategy', title: 'Stratégie créative'},
  {color: '#8b62c9', icon: Video, id: 'motion', title: 'Motion design'},
  {color: '#d44f88', icon: PenTool, id: 'copy', title: 'Conception-rédaction'},
  {color: '#d99522', icon: Shapes, id: 'branding', title: 'Identité de marque'},
];

const levels = [
  {id: 'year-1', label: '1re année', short: '01'},
  {id: 'year-2', label: '2e année', short: '02'},
  {id: 'year-3', label: '3e année', short: '03'},
  {id: 'year-4', label: '4e année', short: '04'},
  {id: 'year-5', label: '5e année', short: '05'},
];

const classes: TeachingLabClass[] = [
  {color: '#f15d32', icon: School, id: 'class-1a', levelId: 'year-1', name: '1A Création', size: 28, subjectIds: ['branding', 'copy']},
  {color: '#3979e8', icon: Shapes, id: 'class-1b', levelId: 'year-1', name: '1B Design', size: 26, subjectIds: ['da', 'branding']},
  {color: '#8b62c9', icon: Video, id: 'class-2a', levelId: 'year-2', name: '2A Digital', size: 24, subjectIds: ['motion', 'strategy']},
  {color: '#d44f88', icon: PenTool, id: 'class-2b', levelId: 'year-2', name: '2B Création', size: 27, subjectIds: ['copy', 'da']},
  {color: '#d99522', icon: Megaphone, id: 'class-3a', levelId: 'year-3', name: '3A Concept', size: 22, subjectIds: ['strategy', 'branding']},
  {color: '#3979e8', icon: BriefcaseBusiness, id: 'class-3b', levelId: 'year-3', name: '3B Projet', size: 25, subjectIds: ['strategy', 'motion']},
  {color: '#f15d32', icon: Sparkles, id: 'class-4a', levelId: 'year-4', name: '4CREA A', size: 21, subjectIds: ['da', 'copy', 'motion']},
  {color: '#8b62c9', icon: GraduationCap, id: 'class-5a', levelId: 'year-5', name: '5A Direction', size: 18, subjectIds: ['strategy', 'da']},
];

function SubjectGlyph({subject, small = false}: {small?: boolean; subject: TeachingLabSubject}): ReactElement {
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

function ClassDetail({item, onBack, onOpenSubject}: {
  item: TeachingLabClass;
  onBack: () => void;
  onOpenSubject: (subjectId: string) => void;
}): ReactElement {
  const Icon = item.icon;
  const linkedSubjects = item.subjectIds.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is TeachingLabSubject => Boolean(subject));
  return (
    <section className="teaching-lab__detail">
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> Toutes les classes</button>
      <header>
        <span className="teaching-lab__class-glyph" style={{'--teaching-color': item.color} as React.CSSProperties}><Icon size={38} /></span>
        <div><small>{levels.find((level) => level.id === item.levelId)?.label}</small><h2>{item.name}</h2><p>{item.size} étudiants · fixture Lab</p></div>
      </header>
      <div className="teaching-lab__detail-grid">
        <article>
          <small>Sujets affectés</small>
          <div className="teaching-lab__subject-list">
            {linkedSubjects.map((subject) => <button key={subject.id} onClick={() => onOpenSubject(subject.id)} type="button"><SubjectGlyph subject={subject} /><span><strong>{subject.title}</strong><small>Ouvrir le sujet</small></span><ChevronRight size={18} /></button>)}
          </div>
        </article>
        <article>
          <small>Étudiants</small>
          <div className="teaching-lab__student-placeholder">
            <UsersRound size={34} />
            <strong>{item.size} identités roster</strong>
            <p>Les vignettes Persona seront travaillées ici après validation de la composition Classe.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

function SubjectDetail({item, onBack}: {item: TeachingLabSubject; onBack: () => void}): ReactElement {
  const assignedClasses = classes.filter((classItem) => classItem.subjectIds.includes(item.id));
  return (
    <section className="teaching-lab__detail">
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> Tous les sujets</button>
      <header><SubjectGlyph subject={item} /><div><small>Sujet</small><h2>{item.title}</h2><p>{assignedClasses.length} classes affectées · fixture Lab</p></div></header>
      <div className="teaching-lab__story-sequence">
        {['Situation', 'Tension', 'Mission', 'Décision'].map((label, index) => <article key={label}><span>{String(index + 1).padStart(2, '0')}</span><strong>{label}</strong><p>Le contenu réel du sujet prendra place ici, après ouverture.</p></article>)}
      </div>
      <div className="teaching-lab__assigned-classes">
        <small>Classes affectées</small>
        {assignedClasses.map((classItem) => <span key={classItem.id}>{classItem.name}</span>)}
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

export function ComponentLabTeaching(): ReactElement {
  const [view, setView] = useState<TeachingLabView>({kind: 'overview'});

  if (view.kind === 'class') {
    const item = classes.find((candidate) => candidate.id === view.classId);
    if (item) return <ClassDetail item={item} onBack={() => setView({kind: 'overview'})} onOpenSubject={(subjectId) => setView({kind: 'subject', subjectId})} />;
  }
  if (view.kind === 'subject') {
    const item = subjects.find((candidate) => candidate.id === view.subjectId);
    if (item) return <SubjectDetail item={item} onBack={() => setView({kind: 'overview'})} />;
  }
  if (view.kind === 'import') return <PronoteImport onBack={() => setView({kind: 'overview'})} />;

  return (
    <section className="teaching-lab" aria-label="Teaching Lab">
      <header className="teaching-lab__hero">
        <div><small>Page en construction · référence Persona</small><h1>Teaching</h1><p>Les classes d’abord, rangées par niveau. Les détails viennent seulement après le clic.</p></div>
        <button onClick={() => setView({kind: 'import'})} type="button"><FileUp size={19} /> Importer une classe Pronote</button>
      </header>

      <section className="teaching-lab__horizon" aria-label="Météo pédagogique">
        <span><Sparkles size={18} /><strong>Météo pédagogique</strong></span>
        <p>Structure prête · dynamique d’apprentissage : données insuffisantes.</p>
      </section>

      <div className="teaching-lab__levels">
        {levels.map((level) => {
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
                      <span><strong>{item.name}</strong><small>{item.size} étudiants</small></span>
                      <span className="teaching-lab__class-subjects">{item.subjectIds.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is TeachingLabSubject => Boolean(subject)).map((subject) => <SubjectGlyph key={subject.id} small subject={subject} />)}</span>
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
        <div>{subjects.map((subject) => <button key={subject.id} onClick={() => setView({kind: 'subject', subjectId: subject.id})} type="button"><SubjectGlyph subject={subject} /><strong>{subject.title}</strong><small>{classes.filter((item) => item.subjectIds.includes(subject.id)).length} classes</small></button>)}</div>
      </section>

      <p className="teaching-lab__truth"><Check size={16} /> Fixtures visuelles uniquement. Aucun score, élève, affectation ou import n’est présenté comme une donnée runtime.</p>
    </section>
  );
}
