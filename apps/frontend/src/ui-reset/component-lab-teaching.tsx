import {
  ArrowLeft,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileSpreadsheet,
  FileUp,
  GraduationCap,
  MessageCircle,
  Megaphone,
  Palette,
  Pencil,
  PenTool,
  Route,
  School,
  Shapes,
  Sparkles,
  Target,
  UsersRound,
  Video,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {ReactElement} from 'react';
import type {LucideIcon} from 'lucide-react';

import {getStudentPlaceholderAsset} from '../student-avatar-assets.ts';
import './component-lab.css';

type TeachingLabView =
  | {kind: 'overview'}
  | {kind: 'class'; classId: string; activeSubjectId?: string}
  | {kind: 'student'; classId: string; studentId: string; subjectId?: string}
  | {kind: 'subject'; subjectId: string; fromClassId?: string}
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
  students?: TeachingSurfaceStudent[];
  subjectIds: string[];
};

export type TeachingSurfaceStudent = {
  id: string;
  name: string;
  subjectProgress?: Record<string, TeachingStudentSubjectState>;
};

type TeachingStudentHealth = 'unknown' | 'ahead' | 'on_track' | 'fragile' | 'attention' | 'at_risk';
type TeachingStudentStage = 'unknown' | 'not_started' | 'in_progress' | 'completed';
type TeachingStudentNotionStatus = 'assigned' | 'introduced' | 'practicing' | 'mastered';
type TeachingStudentNotion = {
  label: string;
  status: TeachingStudentNotionStatus;
};
export type TeachingStudentSubjectState = {
  average?: number;
  confidence?: number | null;
  evidenceRefs?: string[];
  health: TeachingStudentHealth;
  notions?: TeachingStudentNotion[];
  progress: number;
  scoreStatus?: 'needs_review';
  sourceFreshnessAt?: number | null;
  sourceStatus?: 'unavailable' | 'partial' | 'attributed';
  stage: TeachingStudentStage;
  trend: number[];
};

type ComponentLabTeachingProps = {
  onAssignSubject?: (classId: string, subjectId: string) => Promise<boolean>;
  classes?: TeachingSurfaceClass[];
  dataMode?: 'demo' | 'fixture' | 'runtime';
  onActivity?: (label: string) => void;
  onCreateSubject?: () => void;
  onManageClass?: (classId?: string) => void;
  onManageSubject?: (subjectId?: string) => void;
  onOpenSupport?: () => void;
  subjects?: TeachingSurfaceSubject[];
};

export const demoTeachingSubjects: TeachingSurfaceSubject[] = [
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

const demoStudentNames = [
  'Camille R.', 'Sacha B.', 'Noa M.', 'Lou A.', 'Charlie T.', 'Eden V.', 'Alix D.',
  'Andrea L.', 'Billie C.', 'Casey N.', 'Cléo P.', 'Dorian S.', 'Élie G.', 'Gaël F.',
  'Inès J.', 'Jules K.', 'Kim O.', 'Léo H.', 'Maë W.', 'Nino E.', 'Océane I.',
  'Paul Q.', 'Romy Z.', 'Sam U.', 'Tess Y.', 'Ugo X.', 'Vic A.', 'Yaël M.',
];

const DEMO_SUBJECT_NOTIONS: Record<string, string[]> = {
  branding: ['Plateforme de marque', 'Système de signes', 'Cohérence des déclinaisons', 'Présentation du concept'],
  copy: ['Angle éditorial', 'Promesse', 'Hiérarchie du message', 'Tonalité rédactionnelle'],
  da: ['Intention visuelle', 'Composition', 'Typographie', 'Système chromatique'],
  motion: ['Découpage', 'Rythme', 'Transitions', 'Narration animée'],
  strategy: ['Diagnostic', 'Cible', 'Insight', 'Territoire créatif'],
};

function buildDemoStudents(classId: string, count: number, subjectIds: string[]): TeachingSurfaceStudent[] {
  const healthCycle: TeachingStudentHealth[] = ['ahead', 'on_track', 'on_track', 'fragile', 'attention', 'at_risk', 'on_track'];
  return Array.from({length: count}, (_, index) => ({
    id: `${classId}-student-${index + 1}`,
    name: demoStudentNames[index] ?? `Élève ${String(index + 1).padStart(2, '0')}`,
    subjectProgress: Object.fromEntries(subjectIds.map((subjectId, subjectIndex) => {
      const health = healthCycle[(index + subjectIndex * 2) % healthCycle.length] ?? 'unknown';
      const stage: TeachingStudentStage = (index + subjectIndex) % 7 === 0
        ? 'completed'
        : (index + subjectIndex) % 9 === 0
          ? 'not_started'
          : 'in_progress';
      const progress = stage === 'completed' ? 100 : stage === 'not_started' ? 0 : Math.min(88, 28 + ((index * 11 + subjectIndex * 17) % 60));
      const trendShapes = [
        [0.08, 0.24, 0.5, 0.76, 1],
        [0.06, 0.46, 0.62, 0.7, 1],
        [0.04, 0.14, 0.3, 0.68, 1],
      ];
      const trendShape = trendShapes[subjectIndex % trendShapes.length] ?? [0.08, 0.24, 0.5, 0.76, 1];
      const average = Math.round((8 + ((index * 17 + subjectIndex * 13) % 101) / 10) * 10) / 10;
      const notions = (DEMO_SUBJECT_NOTIONS[subjectId] ?? ['Notion principale', 'Mise en pratique', 'Argumentation']).map((label, notionIndex) => ({
        label,
        status: ((index + subjectIndex + notionIndex) % 5 === 0
          ? 'introduced'
          : (index + subjectIndex + notionIndex) % 3 === 0
            ? 'practicing'
            : 'mastered') as TeachingStudentNotionStatus,
      }));
      return [subjectId, {
        average,
        health,
        notions,
        progress,
        stage,
        trend: trendShape.map((ratio, pointIndex) => Math.min(100, Math.round(progress * ratio) + ((index + pointIndex) % 3) - 1)),
      }];
    })),
  }));
}

const STUDENT_HEALTH_LABEL = {
  unknown: 'Sans signal',
  ahead: 'En avance',
  on_track: 'En bonne voie',
  fragile: 'Fragile',
  attention: 'Attention',
  at_risk: 'En péril',
} as const;

const STUDENT_HEALTH_COLOR = {
  unknown: 'var(--proto-muted)',
  ahead: 'var(--mf-user)',
  on_track: 'var(--mf-success)',
  fragile: 'var(--mf-support)',
  attention: 'var(--mf-attention)',
  at_risk: 'var(--mf-danger)',
} as const;

const STUDENT_STAGE_LABEL = {
  unknown: 'Étape inconnue',
  not_started: 'À démarrer',
  in_progress: 'En cours',
  completed: 'Terminé',
} as const;

const STUDENT_NOTION_LABEL = {
  assigned: 'Assignée',
  introduced: 'Abordée',
  practicing: 'En consolidation',
  mastered: 'Maîtrisée',
} as const;

const STUDENT_HEALTH_LEGEND = (Object.keys(STUDENT_HEALTH_LABEL) as TeachingStudentHealth[])
  .filter((health) => health !== 'unknown');

function aggregateStudentState(student: TeachingSurfaceStudent, subjectIds: string[]): TeachingStudentSubjectState {
  const states = subjectIds.map((subjectId) => student.subjectProgress?.[subjectId]).filter((state): state is TeachingStudentSubjectState => Boolean(state));
  if (states.length === 0) return {health: 'unknown', progress: 0, stage: 'unknown', trend: []};
  const healthRank: TeachingStudentHealth[] = ['unknown', 'ahead', 'on_track', 'fragile', 'attention', 'at_risk'];
  const health = states.reduce<TeachingStudentHealth>((worst, state) => healthRank.indexOf(state.health) > healthRank.indexOf(worst) ? state.health : worst, 'unknown');
  const stage: TeachingStudentStage = states.every((state) => state.stage === 'completed')
    ? 'completed'
    : states.every((state) => state.stage === 'not_started')
      ? 'not_started'
      : 'in_progress';
  const progress = Math.round(states.reduce((total, state) => total + state.progress, 0) / states.length);
  const averages = states.map((state) => state.average).filter((average): average is number => typeof average === 'number');
  const average = averages.length > 0 ? Math.round((averages.reduce((total, value) => total + value, 0) / averages.length) * 10) / 10 : undefined;
  const notions = states.flatMap((state) => state.notions ?? []);
  return {average, health, notions, progress, stage, trend: []};
}

export const demoTeachingClasses: TeachingSurfaceClass[] = [
  {color: '#f15d32', icon: School, id: 'class-1a', levelId: 'year-1', name: '1A Création', size: 28, students: buildDemoStudents('class-1a', 28, ['branding', 'copy']), subjectIds: ['branding', 'copy']},
  {color: '#3979e8', icon: Shapes, id: 'class-1b', levelId: 'year-1', name: '1B Design', size: 26, students: buildDemoStudents('class-1b', 26, ['da', 'branding']), subjectIds: ['da', 'branding']},
  {color: '#8b62c9', icon: Video, id: 'class-2a', levelId: 'year-2', name: '2A Digital', size: 24, students: buildDemoStudents('class-2a', 24, ['motion', 'strategy']), subjectIds: ['motion', 'strategy']},
  {color: '#f15d32', icon: PenTool, id: 'class-2b', levelId: 'year-2', name: '2B Création', size: 27, students: buildDemoStudents('class-2b', 27, ['copy', 'da']), subjectIds: ['copy', 'da']},
  {color: '#3979e8', icon: Megaphone, id: 'class-3a', levelId: 'year-3', name: '3A Concept', size: 22, students: buildDemoStudents('class-3a', 22, ['strategy', 'branding']), subjectIds: ['strategy', 'branding']},
  {color: '#3979e8', icon: BriefcaseBusiness, id: 'class-3b', levelId: 'year-3', name: '3B Projet', size: 25, students: buildDemoStudents('class-3b', 25, ['strategy', 'motion']), subjectIds: ['strategy', 'motion']},
  {color: '#f15d32', icon: Sparkles, id: 'class-4a', levelId: 'year-4', name: '4CREA A', size: 21, students: buildDemoStudents('class-4a', 21, ['da', 'copy', 'motion']), subjectIds: ['da', 'copy', 'motion']},
  {color: '#8b62c9', icon: GraduationCap, id: 'class-5a', levelId: 'year-5', name: '5A Direction', size: 18, students: buildDemoStudents('class-5a', 18, ['strategy', 'da']), subjectIds: ['strategy', 'da']},
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

function StudentStageBadge({stage}: {stage: TeachingStudentStage}): ReactElement {
  const glyph = stage === 'completed' ? '✓' : stage === 'in_progress' ? '…' : stage === 'not_started' ? '○' : '—';
  return <i aria-label={STUDENT_STAGE_LABEL[stage]} className="teaching-lab__student-stage" data-stage={stage} title={STUDENT_STAGE_LABEL[stage]}>{glyph}</i>;
}

function SubjectEvolutionChart({activeSubjectId, students, subjects}: {
  activeSubjectId: string;
  students: TeachingSurfaceStudent[];
  subjects: TeachingSurfaceSubject[];
}): ReactElement {
  const series = subjects.map((subject) => {
    const trends = students.map((student) => student.subjectProgress?.[subject.id]?.trend).filter((trend): trend is number[] => Boolean(trend?.length));
    const points = trends.length > 0 ? [0, 1, 2, 3, 4].map((pointIndex) => Math.round(trends.reduce((total, trend) => total + (trend[pointIndex] ?? 0), 0) / trends.length)) : [];
    return {points, subject};
  });
  const hasData = series.some((item) => item.points.length > 0);
  return (
    <section className="teaching-lab__subject-evolution">
      <small>Évolution des sujets</small>
      {hasData ? (
        <>
          <svg aria-label="Courbes moyennes d’évolution des sujets" role="img" viewBox="0 0 240 110">
            {[25, 50, 75].map((value) => <line key={value} x1="8" x2="232" y1={102 - value} y2={102 - value} />)}
            {series.map(({points, subject}) => points.length > 0 ? (
              <g className={activeSubjectId === 'global' || activeSubjectId === subject.id ? 'is-active' : undefined} key={subject.id} style={{'--teaching-color': subject.color} as React.CSSProperties}>
                <polyline points={points.map((value, index) => `${8 + index * 56},${102 - value}`).join(' ')} />
                {points.map((value, index) => <circle cx={8 + index * 56} cy={102 - value} key={`${subject.id}-${index}`} r="3" />)}
              </g>
            ) : null)}
          </svg>
          <div>{series.map(({subject}) => <span className={activeSubjectId === subject.id ? 'is-active' : undefined} key={subject.id} style={{'--teaching-color': subject.color} as React.CSSProperties}><i />{subject.title}</span>)}</div>
        </>
      ) : <p>Évolution non raccordée.</p>}
    </section>
  );
}

function ClassDetail({activeSubjectId: initialActiveSubjectId, item, onActiveSubjectChange, onAssignSubject, onBack, onOpenStudent, onOpenSubject, subjects, onManage, dataMode}: {
  activeSubjectId?: string;
  item: TeachingSurfaceClass;
  onActiveSubjectChange: (subjectId: string) => void;
  onAssignSubject?: (classId: string, subjectId: string) => Promise<boolean>;
  onBack: () => void;
  onOpenStudent: (studentId: string, subjectId?: string) => void;
  onOpenSubject: (subjectId: string) => void;
  subjects: TeachingSurfaceSubject[];
  onManage?: () => void;
  dataMode: 'demo' | 'fixture' | 'runtime';
}): ReactElement {
  const students = item.students ?? [];
  const visibleStudentCount = students.length > 0 ? students.length : item.size;
  const [assignedSubjectIds, setAssignedSubjectIds] = useState(item.subjectIds);
  const [activeSubjectId, setActiveSubjectId] = useState(initialActiveSubjectId ?? 'global');
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [pendingSubjectId, setPendingSubjectId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const linkedSubjects = assignedSubjectIds.map((id) => subjects.find((subject) => subject.id === id)).filter((subject): subject is TeachingSurfaceSubject => Boolean(subject));
  const availableSubjects = subjects.filter((subject) => !assignedSubjectIds.includes(subject.id));
  const canAssign = dataMode !== 'runtime' || Boolean(onAssignSubject);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent): void => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      if (target instanceof HTMLElement && target.closest('button, a, [role="dialog"]')) return;
      if (event.key.toLocaleLowerCase('fr') === 'g') {
        event.preventDefault();
        setActiveSubjectId('global');
        onActiveSubjectChange('global');
      } else if (event.key.toLocaleLowerCase('fr') === 'n' && canAssign) {
        event.preventDefault();
        setAssignmentOpen(true);
      } else if (/^[1-9]$/.test(event.key)) {
        const subject = linkedSubjects[Number(event.key) - 1];
        if (subject) {
          event.preventDefault();
          setActiveSubjectId(subject.id);
          onActiveSubjectChange(subject.id);
        }
      } else if (event.key.toLocaleLowerCase('fr') === 'e' && activeSubjectId !== 'global') {
        event.preventDefault();
        onOpenSubject(activeSubjectId);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [activeSubjectId, canAssign, linkedSubjects, onActiveSubjectChange, onOpenSubject]);

  const confirmAssignment = async (): Promise<void> => {
    if (!pendingSubjectId || assigning) return;
    setAssigning(true);
    const accepted = dataMode !== 'runtime' ? true : await onAssignSubject?.(item.id, pendingSubjectId) ?? false;
    if (accepted) {
      setAssignedSubjectIds((current) => [...current, pendingSubjectId]);
      setActiveSubjectId(pendingSubjectId);
      onActiveSubjectChange(pendingSubjectId);
      setPendingSubjectId('');
      setAssignmentOpen(false);
    }
    setAssigning(false);
  };
  return (
    <section className="teaching-lab__detail">
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> Toutes les classes</button>
      <header className="teaching-lab__class-header">
        <div>
          <h2>{item.name}</h2>
          <p>{levels.find((level) => level.id === item.levelId)?.label ?? 'Niveau à préciser'} · {visibleStudentCount === null ? 'Liste non renseignée' : `${visibleStudentCount} étudiant${visibleStudentCount > 1 ? 's' : ''}`}{item.period ? ` · ${item.period}` : ''}</p>
        </div>
        <span className="teaching-lab__class-shortcuts"><kbd>G</kbd> Global <kbd>1–9</kbd> Sujet <kbd>N</kbd> Assigner <kbd>E</kbd> Modifier</span>
      </header>
      <div className="teaching-lab__detail-grid">
        <article className="teaching-lab__students-panel">
          {students.length > 0 ? (
            <div className="teaching-lab__students">
              <div className="teaching-lab__students-heading">
                <div><strong>{activeSubjectId === 'global' ? 'Vue globale' : linkedSubjects.find((subject) => subject.id === activeSubjectId)?.title ?? 'Étudiants'}</strong><span>{students.length}</span></div>
              </div>
              <div className="teaching-lab__progress-legend" aria-label="Légende de l’avancement">
                {STUDENT_HEALTH_LEGEND.map((health) => <span key={health} style={{'--student-status-color': STUDENT_HEALTH_COLOR[health]} as React.CSSProperties}><i />{STUDENT_HEALTH_LABEL[health]}</span>)}
                {dataMode === 'runtime' ? <small>Sans signal fiable : gris</small> : <small>{dataMode === 'demo' ? 'Données fictives locales' : 'Démonstration Lab'}</small>}
              </div>
              <div className="teaching-lab__student-grid">
                {students.map((student) => {
                  const studentState = activeSubjectId === 'global'
                    ? aggregateStudentState(student, linkedSubjects.map((subject) => subject.id))
                    : student.subjectProgress?.[activeSubjectId] ?? {health: 'unknown', progress: 0, stage: 'unknown', trend: []};
                  return (
                  <button className="teaching-lab__student-card" key={student.id} onClick={() => onOpenStudent(student.id, activeSubjectId === 'global' ? undefined : activeSubjectId)} type="button">
                    <span className="teaching-lab__student-avatar" style={{'--student-status-color': STUDENT_HEALTH_COLOR[studentState.health]} as React.CSSProperties}>
                      <img alt="" aria-hidden="true" src={getStudentPlaceholderAsset(student.id)} />
                      <StudentStageBadge stage={studentState.stage} />
                    </span>
                    <strong>{student.name}</strong>
                  </button>
                  );
                })}
              </div>
              {onManage ? <button className="secondary" onClick={onManage} type="button">Gérer cette classe</button> : null}
            </div>
          ) : (
            <div className="teaching-lab__student-placeholder">
              <UsersRound size={34} />
              <strong>{item.size === null ? 'Roster à compléter' : `${item.size} identités roster`}</strong>
              <p>{dataMode === 'runtime' ? 'Les identités disponibles restent privées et liées à cette classe.' : 'Ajoutez un roster pour afficher les silhouettes provisoires.'}</p>
              {onManage ? <button className="secondary" onClick={onManage} type="button">Gérer cette classe</button> : null}
            </div>
          )}
        </article>
        <article className="teaching-lab__subjects-panel">
          <header><small>Sujets affectés</small>{canAssign ? <button aria-expanded={assignmentOpen} aria-keyshortcuts="N" onClick={() => setAssignmentOpen((open) => !open)} type="button">+ Assigner</button> : null}</header>
          {assignmentOpen ? (
            <section aria-label="Assigner un sujet à la classe" className="teaching-lab__assignment-picker">
              <strong>Assigner à {item.name}</strong>
              {availableSubjects.length > 0 ? <div>{availableSubjects.map((subject) => <button className={pendingSubjectId === subject.id ? 'is-selected' : undefined} key={subject.id} onClick={() => setPendingSubjectId(subject.id)} type="button"><SubjectGlyph small subject={subject} />{subject.title}</button>)}</div> : <p>Tous les sujets sont déjà affectés.</p>}
              <footer><button onClick={() => { setAssignmentOpen(false); setPendingSubjectId(''); }} type="button">Annuler</button><button disabled={!pendingSubjectId || assigning} onClick={() => void confirmAssignment()} type="button">{assigning ? 'Affectation…' : dataMode !== 'runtime' ? 'Simuler l’affectation' : 'Confirmer l’affectation'}</button></footer>
              {dataMode !== 'runtime' ? <small>Démonstration locale, aucune donnée enregistrée.</small> : null}
            </section>
          ) : null}
          <button className={`teaching-lab__global-view${activeSubjectId === 'global' ? ' is-active' : ''}`} onClick={() => { setActiveSubjectId('global'); onActiveSubjectChange('global'); }} type="button"><UsersRound size={16} /><strong>Vue globale</strong></button>
          <div className="teaching-lab__subject-list">
            {linkedSubjects.length > 0
              ? linkedSubjects.map((subject, index) => <div className={activeSubjectId === subject.id ? 'is-active' : undefined} key={subject.id}><button aria-keyshortcuts={index < 9 ? String(index + 1) : undefined} onClick={() => { setActiveSubjectId(subject.id); onActiveSubjectChange(subject.id); }} type="button"><SubjectGlyph small subject={subject} /><span><strong>{subject.title}</strong><small>{index < 9 ? String(index + 1) : ''}</small></span></button><button aria-label={`Modifier ${subject.title}`} aria-keyshortcuts={activeSubjectId === subject.id ? 'E' : undefined} onClick={() => onOpenSubject(subject.id)} title={`Modifier ${subject.title}`} type="button"><Pencil size={14} /></button></div>)
              : <p>Aucun sujet affecté à cette classe.</p>}
          </div>
          <SubjectEvolutionChart activeSubjectId={activeSubjectId} students={students} subjects={linkedSubjects} />
        </article>
      </div>
    </section>
  );
}

function StudentDetail({classItem, dataMode, onBack, student, subjectId, subjects}: {
  classItem: TeachingSurfaceClass;
  dataMode: 'demo' | 'fixture' | 'runtime';
  onBack: () => void;
  student: TeachingSurfaceStudent;
  subjectId?: string;
  subjects: TeachingSurfaceSubject[];
}): ReactElement {
  const linkedSubjects = classItem.subjectIds
    .map((id) => subjects.find((subject) => subject.id === id))
    .filter((subject): subject is TeachingSurfaceSubject => Boolean(subject));
  const [activeSubjectId, setActiveSubjectId] = useState(subjectId ?? 'global');
  const [supportMode, setSupportMode] = useState<'message' | 'program' | null>(null);
  const activeSubject = activeSubjectId === 'global' ? null : linkedSubjects.find((subject) => subject.id === activeSubjectId) ?? null;
  const studentState = activeSubject
    ? student.subjectProgress?.[activeSubject.id] ?? {health: 'unknown', progress: 0, stage: 'unknown', trend: []}
    : aggregateStudentState(student, linkedSubjects.map((subject) => subject.id));
  const subjectStates = linkedSubjects.map((subject) => ({subject, state: student.subjectProgress?.[subject.id]}));
  const weakestSubject = subjectStates
    .filter((item): item is {subject: TeachingSurfaceSubject; state: TeachingStudentSubjectState} => Boolean(item.state))
    .sort((left, right) => left.state.progress - right.state.progress)[0];
  const visibleNotions = activeSubject
    ? (studentState.notions ?? []).map((notion) => ({...notion, subject: activeSubject.title}))
    : subjectStates.flatMap(({subject, state}) => (state?.notions ?? []).map((notion) => ({...notion, subject: subject.title})));
  const masteredCount = visibleNotions.filter((notion) => notion.status === 'mastered').length;
  const averageLabel = typeof studentState.average === 'number'
    ? `${studentState.average.toLocaleString('fr-FR')} / 20${studentState.scoreStatus === 'needs_review' ? ' · à valider' : ''}`
    : 'Non raccordée';
  const sourceLabel = studentState.sourceFreshnessAt
    ? `Signal du ${new Date(studentState.sourceFreshnessAt).toLocaleDateString('fr-FR')}${typeof studentState.confidence === 'number' ? ` · confiance ${Math.round(studentState.confidence * 100)} %` : ''}`
    : 'Aucun signal attribuable';
  const style = {'--student-status-color': STUDENT_HEALTH_COLOR[studentState.health]} as React.CSSProperties;
  return (
    <section className="teaching-lab__detail teaching-lab__student-detail" style={style}>
      <button className="teaching-lab__back" onClick={onBack} type="button"><ArrowLeft size={18} /> {classItem.name}</button>
      <header className="teaching-lab__student-hero">
        <span className="teaching-lab__student-portrait">
          <img alt="" aria-hidden="true" src={getStudentPlaceholderAsset(student.id)} />
          <StudentStageBadge stage={studentState.stage} />
        </span>
        <div>
          <span className="teaching-lab__student-status"><Check size={15} /> {STUDENT_HEALTH_LABEL[studentState.health]}</span>
          <small>Profil étudiant · {classItem.name}</small>
          <h2>{student.name}</h2>
          <p>{activeSubject ? `Lecture pédagogique sur « ${activeSubject.title} ». ` : 'Lecture pédagogique globale. '}Les données non reliées au compte restent explicitement indisponibles.</p>
        </div>
      </header>
      <nav aria-label="Choisir le sujet observé" className="teaching-lab__student-lenses">
        <button className={activeSubjectId === 'global' ? 'is-active' : undefined} onClick={() => setActiveSubjectId('global')} type="button">Tous les sujets</button>
        {linkedSubjects.map((subject) => <button className={activeSubjectId === subject.id ? 'is-active' : undefined} key={subject.id} onClick={() => setActiveSubjectId(subject.id)} type="button"><SubjectGlyph small subject={subject} />{subject.title}</button>)}
      </nav>
      <div className="teaching-lab__student-facts">
        <article><small>{studentState.scoreStatus === 'needs_review' ? 'Score candidat' : 'Moyenne identifiée'}</small><strong>{averageLabel}</strong><span>{dataMode === 'runtime' ? sourceLabel : dataMode === 'demo' ? 'Données fictives locales' : 'Démonstration Lab · source simulée'}</span></article>
        <article><small>Notions maîtrisées</small><strong>{visibleNotions.length > 0 ? `${masteredCount} / ${visibleNotions.length}` : 'Non raccordé'}</strong><span>{activeSubject?.title ?? 'Ensemble des sujets affectés'}</span></article>
        <article><small>Point d’attention</small><strong>{weakestSubject?.subject.title ?? 'Non identifié'}</strong><span>{weakestSubject ? `${weakestSubject.state.progress} % de progression observée` : 'Aucun signal attribuable'}</span></article>
      </div>
      <div className="teaching-lab__student-learning-grid">
        <section className="teaching-lab__student-notions">
          <header><div><small>Apprentissage</small><h3>Notions abordées et maîtrisées</h3></div><Target size={20} /></header>
          {visibleNotions.length > 0 ? (
            <div>{visibleNotions.map((notion, index) => (
              <article key={`${notion.subject}-${notion.label}-${index}`}>
                <span data-status={notion.status}>{notion.status === 'mastered' ? <Check size={14} /> : notion.status === 'practicing' ? '…' : '○'}</span>
                <div><strong>{notion.label}</strong><small>{notion.subject}</small></div>
                <em data-status={notion.status}>{STUDENT_NOTION_LABEL[notion.status]}</em>
              </article>
            ))}</div>
          ) : <p>Aucune notion n’est encore reliée à cette identité étudiante.</p>}
        </section>
        <aside className="teaching-lab__student-support">
          <header><div><small>Accompagnement</small><h3>Prochaine intervention</h3></div><Route size={20} /></header>
          <p>{dataMode !== 'runtime'
            ? `Consolider ${weakestSubject?.subject.title ?? 'le sujet prioritaire'} avec une étape courte, une preuve attendue et un retour ciblé.`
            : 'Une recommandation apparaîtra ici lorsque les travaux, évaluations et objectifs seront reliés à cet étudiant.'}</p>
          <div className="teaching-lab__student-support-actions">
            <button onClick={() => setSupportMode('message')} type="button"><MessageCircle size={17} /> Préparer un message</button>
            <button onClick={() => setSupportMode('program')} type="button"><Route size={17} /> Construire un programme</button>
          </div>
          {dataMode === 'runtime' ? <small>Brouillon local professeur : rien n’est envoyé ni enregistré automatiquement.</small> : null}
          {supportMode ? (
            <section className="teaching-lab__student-support-draft">
              <small>{dataMode === 'runtime' ? 'Candidat professeur local · rien ne sera envoyé' : 'Prototype Lab · rien ne sera envoyé'}</small>
              <strong>{supportMode === 'message' ? `Message pour ${student.name}` : 'Programme pédagogique personnalisé'}</strong>
              <textarea
                aria-label={supportMode === 'message' ? 'Brouillon du message' : 'Brouillon du programme pédagogique'}
                defaultValue={supportMode === 'message'
                  ? `Bonjour ${student.name}, je te propose de reprendre ${weakestSubject?.subject.title ?? 'le point prioritaire'} avec un objectif simple et une preuve à partager.`
                  : `1. Revoir la notion prioritaire\n2. Produire une preuve courte\n3. Faire un point individuel\n4. Ajuster la prochaine étape`}
                rows={5}
              />
              <div><button onClick={() => setSupportMode(null)} type="button">Fermer</button><button disabled type="button">Envoi non raccordé</button></div>
            </section>
          ) : null}
        </aside>
      </div>
      <aside className="teaching-lab__student-account-state">
        <GraduationCap size={22} />
        <div><strong>Profil MasterFlow non relié</strong><p>Le message, le programme et leur suivi deviendront actifs lorsque cette identité de roster sera reliée au compte de l’étudiant.</p></div>
      </aside>
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
  classes = demoTeachingClasses,
  dataMode = 'fixture',
  onAssignSubject,
  onActivity,
  onCreateSubject,
  onManageClass,
  onManageSubject,
  onOpenSupport,
  subjects = demoTeachingSubjects,
}: ComponentLabTeachingProps = {}): ReactElement {
  const [view, setView] = useState<TeachingLabView>({kind: 'overview'});
  const [overviewClassId, setOverviewClassId] = useState<string | null>(null);
  const [overviewSubjectId, setOverviewSubjectId] = useState<string | null>(null);
  const [assignmentPending, setAssignmentPending] = useState(false);
  const visibleLevels = classes.some((item) => !levels.some((level) => level.id === item.levelId))
    ? [...levels, {id: 'other', label: 'Niveau à préciser', short: '—'}]
    : levels;
  const overviewClass = classes.find((item) => item.id === overviewClassId) ?? null;
  const overviewSubject = subjects.find((item) => item.id === overviewSubjectId) ?? null;

  const openClass = (item: TeachingSurfaceClass): void => {
    setView({kind: 'class', classId: item.id});
    onActivity?.(`Classe · ${item.name}`);
  };

  const openSubject = (subject: TeachingSurfaceSubject): void => {
    setView({kind: 'subject', subjectId: subject.id});
    onActivity?.(`Sujet · ${subject.title}`);
  };

  const assignOverviewSubject = async (): Promise<void> => {
    if (!overviewClass || !overviewSubject || !onAssignSubject || assignmentPending) return;
    setAssignmentPending(true);
    try {
      if (await onAssignSubject(overviewClass.id, overviewSubject.id)) {
        setOverviewClassId(overviewClass.id);
        setOverviewSubjectId(overviewSubject.id);
      }
    } finally {
      setAssignmentPending(false);
    }
  };

  if (view.kind === 'class') {
    const item = classes.find((candidate) => candidate.id === view.classId);
    if (item) return <ClassDetail activeSubjectId={view.activeSubjectId} dataMode={dataMode} item={item} onActiveSubjectChange={(activeSubjectId) => setView({kind: 'class', classId: item.id, activeSubjectId})} onAssignSubject={onAssignSubject} onBack={() => setView({kind: 'overview'})} onManage={onManageClass ? () => onManageClass(item.id) : undefined} onOpenStudent={(studentId, subjectId) => {
      const student = item.students?.find((candidate) => candidate.id === studentId);
      setView({kind: 'student', classId: item.id, studentId, ...(subjectId ? {subjectId} : {})});
      if (student) onActivity?.(`Élève · ${student.name}`);
    }} onOpenSubject={(subjectId) => {
      const subject = subjects.find((candidate) => candidate.id === subjectId);
      setView({kind: 'subject', subjectId, fromClassId: item.id});
      if (subject) onActivity?.(`Sujet · ${subject.title}`);
    }} subjects={subjects} />;
  }
  if (view.kind === 'student') {
    const classItem = classes.find((candidate) => candidate.id === view.classId);
    const student = classItem?.students?.find((candidate) => candidate.id === view.studentId);
    if (classItem && student) return <StudentDetail classItem={classItem} dataMode={dataMode} onBack={() => setView({kind: 'class', classId: classItem.id, ...(view.subjectId ? {activeSubjectId: view.subjectId} : {})})} student={student} subjectId={view.subjectId} subjects={subjects} />;
  }
  if (view.kind === 'subject') {
    const item = subjects.find((candidate) => candidate.id === view.subjectId);
    if (item) return <SubjectDetail classes={classes} item={item} onBack={() => setView(view.fromClassId ? {kind: 'class', classId: view.fromClassId, activeSubjectId: item.id} : {kind: 'overview'})} onManage={onManageSubject ? () => onManageSubject(item.id) : undefined} />;
  }
  if (view.kind === 'import' && dataMode !== 'runtime') return <PronoteImport onBack={() => setView({kind: 'overview'})} />;

  return (
    <section className="teaching-lab" aria-label="Teaching Lab">
      <header className="teaching-lab__hero">
        <div><small>{dataMode === 'runtime' ? 'Espace pédagogique' : dataMode === 'demo' ? 'Données fictives locales · aucune écriture backend' : 'Page en construction · référence Persona'}</small><h1>Teaching</h1><p>Les classes d’abord, rangées par niveau. Les détails viennent seulement après le clic.</p></div>
        <div className="teaching-lab__hero-actions">
          {onOpenSupport ? <button className="secondary" onClick={onOpenSupport} type="button"><Route size={19} /> Accompagnement</button> : null}
        </div>
      </header>

      <section className="teaching-lab__horizon" aria-label="Météo pédagogique">
        <span><Sparkles size={18} /><strong>Météo pédagogique</strong></span>
        <p>{classes.length > 0 ? `${classes.length} classe${classes.length > 1 ? 's' : ''} · ${subjects.length} sujet${subjects.length > 1 ? 's' : ''}.` : 'Aucune classe disponible · dynamique d’apprentissage : données insuffisantes.'}</p>
      </section>

      <div className="teaching-lab__overview-grid">
        <section className="teaching-lab__classes-panel">
          <header className="teaching-lab__panel-heading">
            <div><School size={20} /><span><small>Par niveau</small><h2>Classes</h2></span></div>
            {dataMode !== 'runtime' || onManageClass ? <button onClick={() => dataMode === 'runtime' ? onManageClass?.() : setView({kind: 'import'})} type="button"><FileUp size={17} /> {dataMode === 'runtime' ? 'Créer / importer' : 'Importer'}</button> : null}
          </header>
          <div className="teaching-lab__levels">
            {visibleLevels.map((level) => {
              const levelClasses = classes.filter((item) => item.levelId === level.id);
              return (
                <section className="teaching-lab__level" key={level.id}>
                  <header><span>{level.short}</span><strong>{level.label}</strong><small>{levelClasses.length}</small></header>
                  <div>
                    {levelClasses.length > 0 ? levelClasses.map((item) => {
                      const Icon = item.icon;
                      const subjectMatch = overviewSubject ? item.subjectIds.includes(overviewSubject.id) : false;
                      const className = [
                        'teaching-lab__class-row',
                        overviewClassId === item.id ? 'is-selected' : '',
                        overviewSubject && subjectMatch ? 'is-related' : '',
                        overviewSubject && !subjectMatch ? 'is-muted' : '',
                      ].filter(Boolean).join(' ');
                      return (
                        <article className={className} key={item.id} style={{'--teaching-color': item.color} as React.CSSProperties}>
                          <button
                            aria-pressed={overviewClassId === item.id}
                            className="teaching-lab__class-select"
                            onClick={() => setOverviewClassId(item.id)}
                            onDoubleClick={() => openClass(item)}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter') return;
                              event.preventDefault();
                              openClass(item);
                            }}
                            type="button"
                          >
                            <span className="teaching-lab__class-glyph"><Icon size={21} /></span>
                            <span><strong>{item.name}</strong><small>{item.size === null ? 'Roster à compléter' : `${item.size} étudiant${item.size > 1 ? 's' : ''}`}</small></span>
                            <span className="teaching-lab__class-subject-count">{item.subjectIds.length} sujet{item.subjectIds.length > 1 ? 's' : ''}</span>
                          </button>
                          <button aria-label={`Ouvrir ${item.name}`} className="teaching-lab__row-open" onClick={() => openClass(item)} type="button"><ChevronRight size={17} /></button>
                        </article>
                      );
                    }) : <p className="teaching-lab__level-empty">Aucune classe</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <aside className="teaching-lab__subjects">
          <header className="teaching-lab__panel-heading">
            <div><BookOpen size={20} /><span><small>Bibliothèque</small><h2>Sujets</h2></span></div>
            <button disabled={!onCreateSubject} onClick={onCreateSubject} type="button"><BookOpen size={17} /> Créer</button>
          </header>
          <div className="teaching-lab__subject-overview-list">
            {subjects.length > 0 ? subjects.map((subject) => {
              const classCount = classes.filter((item) => item.subjectIds.includes(subject.id)).length;
              const belongsToSelectedClass = overviewClass ? overviewClass.subjectIds.includes(subject.id) : false;
              const className = [
                'teaching-lab__subject-overview-row',
                overviewSubjectId === subject.id ? 'is-selected' : '',
                overviewClass && belongsToSelectedClass ? 'is-related' : '',
                overviewClass && !belongsToSelectedClass ? 'is-muted' : '',
              ].filter(Boolean).join(' ');
              return (
                <article className={className} key={subject.id} style={{'--teaching-color': subject.color} as React.CSSProperties}>
                  <button aria-pressed={overviewSubjectId === subject.id} className="teaching-lab__subject-select" onClick={() => setOverviewSubjectId(subject.id)} type="button">
                    <SubjectGlyph small subject={subject} />
                    <span><strong>{subject.title}</strong><small>{classCount} classe{classCount > 1 ? 's' : ''}</small></span>
                  </button>
                  {onManageSubject ? <button aria-label={`Modifier ${subject.title}`} className="teaching-lab__row-edit" onClick={() => onManageSubject(subject.id)} type="button"><Pencil size={15} /></button> : null}
                  <button aria-label={`Ouvrir ${subject.title}`} className="teaching-lab__row-open" onClick={() => openSubject(subject)} type="button"><ChevronRight size={17} /></button>
                </article>
              );
            }) : <div className="teaching-lab__subject-empty"><BookOpen size={24} /><strong>Aucun sujet</strong><small>Créez le premier sujet privé pour commencer.</small></div>}
          </div>
          {overviewClass && overviewSubject ? (
            <div className="teaching-lab__selection-action">
              <small>{overviewClass.name} · {overviewSubject.title}</small>
              {overviewClass.subjectIds.includes(overviewSubject.id)
                ? <strong><Check size={15} /> Sujet déjà affecté</strong>
                : <button disabled={!onAssignSubject || assignmentPending} onClick={() => void assignOverviewSubject()} type="button">{assignmentPending ? 'Affectation…' : 'Affecter à cette classe'}</button>}
            </div>
          ) : <p className="teaching-lab__selection-hint">Sélectionnez une classe et un sujet pour vérifier leur affectation.</p>}
        </aside>
      </div>

      <p className="teaching-lab__truth"><Check size={16} /> {dataMode === 'runtime' ? 'Classes, sujets, affectations et rosters proviennent du runtime. Aucun climat ni score n’est inventé.' : 'Fixtures visuelles uniquement. Aucun score, élève, affectation ou import n’est présenté comme une donnée runtime.'}</p>
    </section>
  );
}
