export type ComponentLabReviewOwner = 'MALEX' | 'Vincent' | 'Codex';

export interface ComponentLabReviewLink {
  href: string;
  label: string;
  role: 'prototype' | 'lab' | 'github' | 'doc';
}

export interface ComponentLabReviewStatus {
  color: string;
  count: number;
  id: string;
  label: string;
  summary: string;
}

export interface ComponentLabReviewChecklistItem {
  detail: string;
  done: boolean;
  id: string;
  label: string;
}

export interface ComponentLabReviewChecklist {
  items: ComponentLabReviewChecklistItem[];
  owner: ComponentLabReviewOwner;
  title: string;
}

export interface ComponentLabReviewState {
  decisionExpected: string;
  links: ComponentLabReviewLink[];
  outOfScope: string[];
  pullRequest: {
    href: string;
    id: string;
    status: 'draft' | 'ready' | 'merged' | 'closed';
  };
  round: {
    id: string;
    status: string;
    title: string;
  };
  statusCards: ComponentLabReviewStatus[];
  validation: ComponentLabReviewChecklist[];
}

export const componentLabReviewState: ComponentLabReviewState = {
  decisionExpected: 'Valider humainement que le Lab partagé est lisible, testable et aligné avec le proto avant toute suite.',
  links: [
    {href: '/ui-reset', label: 'Prototype partagé', role: 'prototype'},
    {href: '/ui-lab', label: 'Lab MALEX', role: 'lab'},
    {href: '/ui-lab/vincent', label: 'Lab Vincent', role: 'lab'},
    {href: 'https://github.com/Prof-Krapu/MASTERFLOW/pull/214', label: 'PR GitHub #214', role: 'github'},
  ],
  outOfScope: [
    'Merge dans main',
    'Déploiement',
    'Backend ou contrat API',
    'Refonte Home/persona/skilltree',
    'Assets candidats ou génération image',
  ],
  pullRequest: {
    href: 'https://github.com/Prof-Krapu/MASTERFLOW/pull/214',
    id: '#214',
    status: 'draft',
  },
  round: {
    id: 'UI-SHELL-DOCK-001',
    status: 'À vérifier',
    title: 'MASTERBUILD Interface V2 / Shared UI Lab',
  },
  statusCards: [
    {color: '#ff6a3d', count: 4, id: 'to-test', label: 'À tester', summary: 'Routes, logo, profils et navigation.'},
    {color: '#3979e8', count: 0, id: 'malex-ok', label: 'Validé MALEX', summary: 'UI, DA et comportement à confirmer.'},
    {color: '#6fcf97', count: 0, id: 'vincent-ok', label: 'Validé Vincent', summary: 'Lancement local et contraintes runtime.'},
    {color: '#d83e34', count: 0, id: 'fix', label: 'À corriger', summary: 'Rien de bloquant listé pour l’instant.'},
    {color: '#8b7d75', count: 5, id: 'scope', label: 'Hors périmètre', summary: 'Ce round ne merge ni ne déploie.'},
  ],
  validation: [
    {
      owner: 'MALEX',
      title: 'Validation expérience',
      items: [
        {detail: 'Le logo du Lab est le même que le proto et réagit aux couleurs.', done: false, id: 'malex-logo', label: 'Logo dynamique'},
        {detail: 'Les deux workspaces restent séparés et compréhensibles.', done: false, id: 'malex-workspaces', label: 'MALEX / Vincent'},
        {detail: 'La navigation, le dock et les overlays gardent la logique du prototype.', done: false, id: 'malex-ui', label: 'Comportement UI'},
        {detail: 'La PR raconte clairement quoi regarder sans relire l’historique.', done: false, id: 'malex-pr', label: 'Lecture PR'},
      ],
    },
    {
      owner: 'Vincent',
      title: 'Validation technique légère',
      items: [
        {detail: 'Le serveur frontend démarre et affiche les routes du Lab.', done: false, id: 'vincent-local', label: 'Lancement local'},
        {detail: '/ui-reset, /ui-lab et /ui-lab/vincent répondent.', done: false, id: 'vincent-routes', label: 'Routes'},
        {detail: 'Le profil ProfKrapu n’écrase pas le profil MALEX.', done: false, id: 'vincent-profile', label: 'Profil séparé'},
        {detail: 'Aucun backend ni contrat API n’est modifié dans cette vague.', done: true, id: 'vincent-backend', label: 'Backend intact'},
      ],
    },
  ],
};
