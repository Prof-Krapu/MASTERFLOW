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
    status: 'local' | 'draft' | 'ready' | 'merged' | 'closed';
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
  decisionExpected: 'Retrouver un seul Lab complet, garder Persona comme référence visuelle et construire Teaching ici avant toute promotion vers le runtime.',
  links: [
    {href: '/', label: 'Runtime local', role: 'prototype'},
    {href: '/ui-reset', label: 'Prototype assemblé', role: 'prototype'},
    {href: '/ui-lab', label: 'Lab MALEX', role: 'lab'},
    {href: '/ui-lab/vincent', label: 'Lab Vincent', role: 'lab'},
    {href: 'https://github.com/Prof-Krapu/MASTERFLOW/blob/main/docs/ui/MASTERFLOW_UI_BIBLE_V1.md', label: 'Bible UI', role: 'doc'},
  ],
  outOfScope: [
    'Déploiement',
    'Backend ou contrat API',
    'Promotion automatique de Teaching vers le runtime',
    'Réimport des anciens packs Stage Actor de 120 Mo',
    'Validation des avatars étudiants candidats',
  ],
  pullRequest: {
    href: '/ui-lab',
    id: 'candidat local',
    status: 'local',
  },
  round: {
    id: 'UI-LAB-CONSOLIDATION-001',
    status: 'En construction',
    title: 'Component Lab unique et complet',
  },
  statusCards: [
    {color: '#ff6a3d', count: 14, id: 'surfaces', label: 'Surfaces', summary: 'Fondations, pages, Shell, états et promotion.'},
    {color: '#3979e8', count: 1, id: 'persona', label: 'Référence Persona', summary: 'Le composant complet du prototype est restauré dans le Lab.'},
    {color: '#8b62c9', count: 1, id: 'teaching', label: 'Teaching Lab', summary: 'Candidat visuel isolé, non raccordé au runtime.'},
    {color: '#6fcf97', count: 1, id: 'home', label: 'Home validée', summary: 'Les modifications Home restent préservées.'},
    {color: '#d83e34', count: 1, id: 'rejected', label: 'Rejeté', summary: 'L’ancien candidat Teaching runtime ne doit pas être publié.'},
  ],
  validation: [
    {
      owner: 'MALEX',
      title: 'Validation expérience',
      items: [
        {detail: 'Le logo dynamique est identique à celui du Shell.', done: true, id: 'malex-logo', label: 'Bon logo'},
        {detail: 'Persona est visible comme page complète et interactive.', done: true, id: 'malex-persona', label: 'Persona restaurée'},
        {detail: 'Teaching expose les cinq niveaux, classes et sujets avant les détails.', done: false, id: 'malex-teaching', label: 'Composition Teaching'},
        {detail: 'Le Lab est assez complet pour poursuivre le travail page par page.', done: false, id: 'malex-complete', label: 'Lab utilisable'},
      ],
    },
    {
      owner: 'Vincent',
      title: 'Validation technique légère',
      items: [
        {detail: 'Le serveur frontend démarre et affiche les deux workspaces.', done: false, id: 'vincent-local', label: 'Lancement local'},
        {detail: '/ui-lab et /ui-lab/vincent utilisent exactement le même code.', done: true, id: 'vincent-routes', label: 'Route unique'},
        {detail: 'Le profil ProfKrapu reste distinct du profil MALEX.', done: true, id: 'vincent-profile', label: 'Profil séparé'},
        {detail: 'Aucun backend ni contrat API n’est modifié dans cette vague.', done: true, id: 'vincent-backend', label: 'Backend intact'},
      ],
    },
  ],
};
