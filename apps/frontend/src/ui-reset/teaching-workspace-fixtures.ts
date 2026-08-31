import {
  BriefcaseBusiness,
  GraduationCap,
  Megaphone,
  Palette,
  PenTool,
  School,
  Shapes,
  Sparkles,
  Video,
} from 'lucide-react';

import type {
  TeachingStudentSubjectState,
  TeachingSurfaceClass,
  TeachingSurfaceStudent,
  TeachingSurfaceSubject,
} from './component-lab-teaching.tsx';

export const demoTeachingSubjects: TeachingSurfaceSubject[] = [
  {color: '#f15d32', icon: Palette, id: 'da', title: 'Direction artistique'},
  {color: '#3979e8', icon: Megaphone, id: 'strategy', title: 'Stratégie créative'},
  {color: '#8b62c9', icon: Video, id: 'motion', title: 'Motion design'},
  {color: '#f15d32', icon: PenTool, id: 'copy', title: 'Conception-rédaction'},
  {color: '#3979e8', icon: Shapes, id: 'branding', title: 'Identité de marque'},
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
  const healthCycle: Array<TeachingStudentSubjectState['health']> = ['ahead', 'on_track', 'on_track', 'fragile', 'attention', 'at_risk', 'on_track'];
  return Array.from({length: count}, (_, index) => ({
    avatarFallback: (['neutral', 'a', 'b'] as const)[index % 3] ?? 'neutral',
    id: `${classId}-student-${index + 1}`,
    name: demoStudentNames[index] ?? `Élève ${String(index + 1).padStart(2, '0')}`,
    subjectProgress: Object.fromEntries(subjectIds.map((subjectId, subjectIndex) => {
      const health = healthCycle[(index + subjectIndex * 2) % healthCycle.length] ?? 'unknown';
      const stage: TeachingStudentSubjectState['stage'] = (index + subjectIndex) % 7 === 0
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
            : 'mastered') as 'introduced' | 'practicing' | 'mastered',
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
