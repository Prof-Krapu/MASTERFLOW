import type {PrototypeShortcutGroup} from './prototype-shell-components';

export type PrototypeShortcutSurface = 'global' | 'conversation' | 'navigation' | 'skilltree' | 'overlay' | 'tunnel';

export type PrototypeShortcutRule = {
  id: string;
  keys: string;
  label: string;
  group: PrototypeShortcutGroup['label'];
  priority: number;
  surfaces: PrototypeShortcutSurface[];
  textTarget: 'blocked' | 'allowed' | 'textarea-only';
  behavior: string;
};

export const prototypeShortcutRules: readonly PrototypeShortcutRule[] = [
  {
    id: 'enter-send',
    keys: 'Enter',
    label: 'Envoyer',
    group: 'Conversation',
    priority: 70,
    surfaces: ['conversation', 'tunnel'],
    textTarget: 'textarea-only',
    behavior: 'Envoie le message dans le clavier actif ou le composeur Tunnel.',
  },
  {
    id: 'shift-enter-newline',
    keys: 'Shift + Enter',
    label: 'Retour ligne',
    group: 'Conversation',
    priority: 71,
    surfaces: ['conversation', 'tunnel'],
    textTarget: 'textarea-only',
    behavior: 'Insère un retour ligne dans le textarea actif.',
  },
  {
    id: 'keyboard',
    keys: 'K',
    label: 'Clavier',
    group: 'Conversation',
    priority: 80,
    surfaces: ['global', 'conversation'],
    textTarget: 'blocked',
    behavior: 'Ouvre ou replie le clavier, et coupe le micro.',
  },
  {
    id: 'micro',
    keys: 'M',
    label: 'Micro',
    group: 'Conversation',
    priority: 81,
    surfaces: ['global', 'conversation'],
    textTarget: 'blocked',
    behavior: 'Ouvre ou replie le micro, sans basculer vers le clavier.',
  },
  {
    id: 'history',
    keys: 'H',
    label: 'Historique',
    group: 'Conversation',
    priority: 82,
    surfaces: ['global', 'conversation'],
    textTarget: 'blocked',
    behavior: 'Affiche ou masque l’historique conversationnel.',
  },
  {
    id: 'tunnel',
    keys: 'T',
    label: 'Mode Tunnel',
    group: 'Conversation',
    priority: 20,
    surfaces: ['global', 'tunnel'],
    textTarget: 'blocked',
    behavior: 'Passe en mode conversation longue au-dessus de l’interface.',
  },
  {
    id: 'mode-cycle',
    keys: 'Cmd/Ctrl + ↑/↓',
    label: 'Changer de mode',
    group: 'Navigation',
    priority: 60,
    surfaces: ['global', 'navigation'],
    textTarget: 'allowed',
    behavior: 'Boucle dans la liste canonique de navigation visible.',
  },
  {
    id: 'skilltree-cycle',
    keys: '←/→',
    label: 'Naviguer skilltree',
    group: 'Navigation',
    priority: 90,
    surfaces: ['skilltree'],
    textTarget: 'blocked',
    behavior: 'Passe d’une galaxie de compétences à l’autre.',
  },
  {
    id: 'view-mode',
    keys: 'F',
    label: 'Plein écran / focus',
    group: 'Navigation',
    priority: 120,
    surfaces: ['global'],
    textTarget: 'blocked',
    behavior: 'Cycle normal, plein écran, interface masquée.',
  },
  {
    id: 'escape',
    keys: 'Esc',
    label: 'Fermer / sortir',
    group: 'Navigation',
    priority: 10,
    surfaces: ['global', 'overlay', 'tunnel', 'conversation'],
    textTarget: 'allowed',
    behavior: 'Ferme selon priorité : Tunnel, popups, panels, historique, dock, menu, focus.',
  },
  {
    id: 'actions',
    keys: 'A',
    label: 'Actions',
    group: 'Outils',
    priority: 100,
    surfaces: ['global', 'overlay'],
    textTarget: 'blocked',
    behavior: 'Ouvre ou ferme la bibliothèque d’actions.',
  },
  {
    id: 'search',
    keys: 'S',
    label: 'Recherche',
    group: 'Outils',
    priority: 101,
    surfaces: ['global', 'overlay'],
    textTarget: 'blocked',
    behavior: 'Ouvre ou ferme la recherche rapide.',
  },
  {
    id: 'shortcuts',
    keys: 'R',
    label: 'Raccourcis',
    group: 'Outils',
    priority: 30,
    surfaces: ['global', 'overlay'],
    textTarget: 'blocked',
    behavior: 'Ouvre ou ferme la pop-up des raccourcis.',
  },
] as const;

export const prototypeShortcutGroups: readonly PrototypeShortcutGroup[] = [
  {
    label: 'Conversation',
    items: prototypeShortcutRules
      .filter((rule) => rule.group === 'Conversation')
      .map(({keys, label}) => ({keys, label})),
  },
  {
    label: 'Navigation',
    items: prototypeShortcutRules
      .filter((rule) => rule.group === 'Navigation')
      .map(({keys, label}) => ({keys, label})),
  },
  {
    label: 'Outils',
    items: prototypeShortcutRules
      .filter((rule) => rule.group === 'Outils')
      .map(({keys, label}) => ({keys, label})),
  },
] as const;

export const escapePriority = [
  'tunnel',
  'shortcuts',
  'settings',
  'actions',
  'system-panel',
  'mobile-character',
  'history',
  'access',
  'dock',
  'rail',
  'view-mode',
] as const;
