import {
  BookOpen,
  Boxes,
  Check,
  Clapperboard,
  Command,
  Eye,
  FileText,
  FolderKanban,
  Gem,
  GraduationCap,
  History,
  Hammer,
  LoaderCircle,
  MessageCircle,
  Mic,
  Monitor,
  Moon,
  Network,
  PackageOpen,
  Paintbrush,
  Palette,
  Pencil,
  PenTool,
  Plus,
  Save,
  Search,
  ScrollText,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  UsersRound,
  WandSparkles,
  Workflow,
  X,
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';

import masterflexCanonAsset from '../assets/masterflex-canon-full.png';
import confidentPortraitAsset from '../assets/masterflex-portraits/confident.png';
import disgustPortraitAsset from '../assets/masterflex-portraits/disgust.png';
import fearPortraitAsset from '../assets/masterflex-portraits/fear.png';
import joyPortraitAsset from '../assets/masterflex-portraits/joy.png';
import neutralPortraitAsset from '../assets/masterflex-portraits/neutral.png';
import sadPortraitAsset from '../assets/masterflex-portraits/sad.png';
import profkrapuCanonAsset from '../assets/profkrapu-canon/profkrapu-canon-v4.png';
import profkrapuConfidentPortraitAsset from '../assets/profkrapu-portraits/confident.png';
import profkrapuDisgustPortraitAsset from '../assets/profkrapu-portraits/disgust.png';
import profkrapuFearPortraitAsset from '../assets/profkrapu-portraits/fear.png';
import profkrapuJoyPortraitAsset from '../assets/profkrapu-portraits/joy.png';
import profkrapuNeutralPortraitAsset from '../assets/profkrapu-portraits/neutral.png';
import profkrapuSadPortraitAsset from '../assets/profkrapu-portraits/sad.png';
import {resolvePersonaMood} from '../masterflex-mood';
import type {PersonaMoodId} from '../masterflex-mood';
import type {
  PrototypePersonaMetric,
  PrototypePersonaMoodState,
  PrototypeSkillArc,
  PrototypeSkillArcId,
  PrototypeSkillFamilyId,
} from './prototype-skilltree-surface';
import type {PrototypeModeGroup} from './prototype-shell-components';
import type {PrototypeHomeMode} from './prototype-product-surfaces';

export type DemoMode = 'teaching' | 'learn' | 'project' | 'inventory' | 'da' | 'story' | 'companions' | 'masterbuild';
export type ActiveSurface = 'home' | DemoMode;
export type AppearanceTheme = 'auto' | 'dark' | 'light';
export type DockPanel = 'keyboard' | 'micro' | null;
export type AccessLevel = 'student' | 'teacher' | 'supervision' | 'admin' | 'godmode';
export type ViewMode = 'normal' | 'focus' | 'fullscreen';
export type SystemPanel = 'search' | 'queue' | 'notifications' | 'dm' | 'exit' | null;
export type NavigationDestination = ActiveSurface | 'character';
export type PrototypeProfileId = 'masterflex' | 'profkrapu';
export type ThemePaletteId = 'masterflow' | 'orchid' | 'cobalt' | 'ultraviolet' | 'coral';
export type SkillFamilyId = PrototypeSkillFamilyId;
export type PersonaMetric = PrototypePersonaMetric;
export type PersonaMoodState = PrototypePersonaMoodState;
export type SkillArcId = PrototypeSkillArcId;

export type ModeItem = {
  id: DemoMode;
  label: string;
  icon: LucideIcon;
  status: 'available' | 'locked';
};

export type LibraryAction = {
  id: string;
  label: string;
  category: 'Projet' | 'Création' | 'Partage' | 'Outils';
  icon: LucideIcon;
  keywords?: string;
  relevant?: boolean;
};

export type SkillArc = PrototypeSkillArc;

export type InventoryConnection = {
  id: string;
  label: string;
  color: string;
  count: number;
  icon: LucideIcon;
};

export type PrototypeProfile = {
  id: PrototypeProfileId;
  name: string;
  mobileLabel: string;
  displayName: string;
  rankScore: number;
  defaultThemePaletteId: ThemePaletteId;
  personaColor: string;
  supportColor: string;
  avatarAsset: string;
  moodAssets: Record<PersonaMoodId, string>;
  canonAsset: string;
  canonAlt: string;
  stats: PersonaMetric[];
  inventoryConnections: InventoryConnection[];
  skillArcs: SkillArc[];
  shortLabels: Record<string, string>;
  defaultPunchline: string;
  modePunchlines: Partial<Record<ActiveSurface, string>>;
  skillPunchlines: Partial<Record<SkillArcId, string>>;
  tunnelLine: string;
  tunnelPrompt: string;
};

export const modes: ModeItem[] = [
  {id: 'teaching', label: 'Teaching', icon: GraduationCap, status: 'available'},
  {id: 'learn', label: 'Learn', icon: BookOpen, status: 'available'},
  {id: 'project', label: 'Project', icon: FolderKanban, status: 'available'},
  {id: 'inventory', label: 'Inventory', icon: PackageOpen, status: 'available'},
  {id: 'da', label: 'DA Studio', icon: Paintbrush, status: 'locked'},
  {id: 'story', label: 'MasterStory', icon: ScrollText, status: 'locked'},
  {id: 'companions', label: 'Companions', icon: UsersRound, status: 'available'},
  {id: 'masterbuild', label: 'MasterBuild', icon: Hammer, status: 'available'},
];

export const modeGroups = [
  {label: 'Projet actif', ids: ['project'] as DemoMode[], kind: 'project'},
  {label: 'Expériences', ids: ['teaching', 'learn'] as DemoMode[], kind: 'experience'},
  {label: 'Studios', ids: ['story', 'da'] as DemoMode[], kind: 'studio'},
  {label: 'Personnel', ids: ['inventory', 'companions'] as DemoMode[], kind: 'personal'},
  {label: 'Système', ids: ['masterbuild'] as DemoMode[], kind: 'system'},
];

export const accessLevels: Array<{id: AccessLevel; label: string; icon: LucideIcon}> = [
  {id: 'student', label: 'Élève', icon: GraduationCap},
  {id: 'teacher', label: 'Prof', icon: BookOpen},
  {id: 'supervision', label: 'Supervision', icon: Eye},
  {id: 'admin', label: 'Admin', icon: ShieldCheck},
  {id: 'godmode', label: 'GodMode', icon: Command},
];

export const accessModeMap: Record<AccessLevel, DemoMode[]> = {
  student: ['project', 'learn', 'story', 'companions'],
  teacher: ['project', 'teaching', 'learn', 'story', 'da', 'inventory', 'companions'],
  supervision: ['project', 'teaching', 'learn', 'inventory'],
  admin: ['project', 'da', 'inventory'],
  godmode: ['project', 'teaching', 'learn', 'story', 'da', 'inventory', 'companions', 'masterbuild'],
};

export const libraryActions: LibraryAction[] = [
  {id: 'save', label: 'Sauvegarder', category: 'Projet', icon: Save, relevant: true},
  {id: 'edit', label: 'Modifier', category: 'Projet', icon: Pencil, relevant: true},
  {id: 'share', label: 'Partager', category: 'Partage', icon: Share2, relevant: true},
  {id: 'project', label: 'Ouvrir le projet', category: 'Projet', icon: FolderKanban},
  {id: 'inventory', label: 'Ajouter à Inventory', category: 'Projet', icon: PackageOpen},
  {id: 'story', label: 'Ouvrir MasterStory', category: 'Création', icon: ScrollText},
  {id: 'da', label: 'Ouvrir DA Studio', category: 'Création', icon: Paintbrush},
  {id: 'export', label: 'Exporter', category: 'Partage', icon: Upload, keywords: 'télécharger fichier sortie'},
  {id: 'voice', label: 'Conversation vocale', category: 'Outils', icon: Mic, keywords: 'voix micro parler audio'},
  {id: 'text', label: 'Lire comme texte', category: 'Outils', icon: BookOpen, keywords: 'lecture transcription contenu'},
];

export const actionCategories: LibraryAction['category'][] = ['Projet', 'Création', 'Partage', 'Outils'];

export const themePalettes = [
  {
    id: 'masterflow',
    label: 'MasterFlow',
    logic: 'Orange · Bleu · Violet',
    color: '#f15d32',
    top: '#ff7b3f',
    deep: '#a93225',
    gradient: 'linear-gradient(180deg, #ff7b3f 0%, #f15d32 55%, #a93225 100%)',
    userColor: '#3979e8',
    supportColor: '#8b62c9',
    userTones: [
      {label: 'Cobalt', color: '#3979e8'},
      {label: 'Azur', color: '#4b9eea'},
      {label: 'Nuit', color: '#2454a6'},
    ],
  },
  {
    id: 'orchid',
    label: 'Orchidée',
    logic: 'Rose · Vert · Bleu',
    color: '#e84f8a',
    top: '#ff72a6',
    deep: '#9f285c',
    gradient: 'linear-gradient(180deg, #ff72a6 0%, #e84f8a 55%, #9f285c 100%)',
    userColor: '#35a879',
    supportColor: '#3979e8',
    userTones: [
      {label: 'Menthe', color: '#4fbc8c'},
      {label: 'Émeraude', color: '#35a879'},
      {label: 'Forêt', color: '#24785a'},
    ],
  },
  {
    id: 'cobalt',
    label: 'Cobalt',
    logic: 'Bleu · Ambre · Corail',
    color: '#3979e8',
    top: '#5c92f2',
    deep: '#214da8',
    gradient: 'linear-gradient(180deg, #5c92f2 0%, #3979e8 55%, #214da8 100%)',
    userColor: '#e6a63c',
    supportColor: '#e85d45',
    userTones: [
      {label: 'Miel', color: '#f1ba58'},
      {label: 'Ambre', color: '#e6a63c'},
      {label: 'Ocre', color: '#b97924'},
    ],
  },
  {
    id: 'ultraviolet',
    label: 'Ultraviolet',
    logic: 'Violet · Cyan · Orange',
    color: '#8657c9',
    top: '#a875e8',
    deep: '#57338e',
    gradient: 'linear-gradient(180deg, #a875e8 0%, #8657c9 55%, #57338e 100%)',
    userColor: '#32a9b8',
    supportColor: '#f06a3e',
    userTones: [
      {label: 'Lagon', color: '#4abfca'},
      {label: 'Cyan', color: '#32a9b8'},
      {label: 'Pétrole', color: '#237887'},
    ],
  },
  {
    id: 'coral',
    label: 'Corail',
    logic: 'Corail · Indigo · Jaune',
    color: '#e85d45',
    top: '#ff7b63',
    deep: '#9d3428',
    gradient: 'linear-gradient(180deg, #ff7b63 0%, #e85d45 55%, #9d3428 100%)',
    userColor: '#5968d8',
    supportColor: '#e5b83f',
    userTones: [
      {label: 'Iris', color: '#7180ec'},
      {label: 'Indigo', color: '#5968d8'},
      {label: 'Encre', color: '#3c478f'},
    ],
  },
] as const;

export const personaMoodAssets: Record<PersonaMoodId, string> = {
  fear: fearPortraitAsset,
  disgust: disgustPortraitAsset,
  sad: sadPortraitAsset,
  neutral: neutralPortraitAsset,
  confident: confidentPortraitAsset,
  joy: joyPortraitAsset,
};

export const profKrapuMoodAssets: Record<PersonaMoodId, string> = {
  fear: profkrapuFearPortraitAsset,
  disgust: profkrapuDisgustPortraitAsset,
  sad: profkrapuSadPortraitAsset,
  neutral: profkrapuNeutralPortraitAsset,
  confident: profkrapuConfidentPortraitAsset,
  joy: profkrapuJoyPortraitAsset,
};

export const resolvePersonaMoodState = (masteryValue: number): PersonaMoodState => {
  const mood = resolvePersonaMood(masteryValue);
  return {...mood, asset: personaMoodAssets[mood.id]};
};

export const masterflexPunchlines = [
  'Plus croustillant qu’un Corn Flakes',
  'Plus instinctif qu’un réflexe',
  'Plus attirant qu’un vortex',
  'Plus épicé qu’un Tex-Mex',
  'Plus mordant qu’un T-Rex',
  'Plus rapide que Fedex',
  'Plus réactif qu’un cortex',
  'Plus glamour que Durex',
  'Plus Minus que Cortex',
  'Plus explosif qu’un Torpex',
  'Plus pétillant qu’un Fervex',
  'Plus fluffy que des pancakes',
] as const;

export type MasterflexPunchline = (typeof masterflexPunchlines)[number];
export const defaultMasterflexPunchline: MasterflexPunchline = 'Plus croustillant qu’un Corn Flakes';

export const modePunchlines: Record<ActiveSurface, MasterflexPunchline> = {
  home: defaultMasterflexPunchline,
  project: 'Plus attirant qu’un vortex',
  teaching: 'Plus mordant qu’un T-Rex',
  learn: 'Plus réactif qu’un cortex',
  inventory: 'Plus Minus que Cortex',
  da: 'Plus instinctif qu’un réflexe',
  story: 'Plus épicé qu’un Tex-Mex',
  companions: 'Plus fluffy que des pancakes',
  masterbuild: 'Plus rapide que Fedex',
};

export const skillPunchlines: Partial<Record<SkillArcId, MasterflexPunchline>> = {
  creation: 'Plus explosif qu’un Torpex',
  dialogue: 'Plus glamour que Durex',
  direction: 'Plus instinctif qu’un réflexe',
  structure: 'Plus pétillant qu’un Fervex',
};

export const personaStats = [
  {id: 'pedagogy', value: 76, masteryValue: 76, label: 'Pedagogy Killer', color: '#3979e8'},
  {id: 'bullshit', value: 12, masteryValue: 88, label: 'Bullshit résiduel', color: '#e63d52'},
  {id: 'synthesis', value: 91, masteryValue: 91, label: 'Synthèse turbo, casque vissé', color: '#f15d32'},
  {id: 'chaos', value: 43, masteryValue: 43, label: 'Chaos domestiqué, presque', color: '#a85cff'},
  {id: 'lore', value: 68, masteryValue: 68, label: 'Lore qui colle aux doigts', color: '#4b9eea'},
  {id: 'patience', value: 7, masteryValue: 7, label: 'Patience administrative', color: '#9b2f28'},
  {id: 'taste', value: 84, masteryValue: 84, label: 'Goût du détail, abus compris', color: '#ffb23f'},
  {id: 'canon', value: 59, masteryValue: 59, label: 'Radar canon pas dupe', color: '#225b9e'},
  {id: 'improv', value: 73, masteryValue: 73, label: 'Impro sous contrôle judiciaire', color: '#ff6b4a'},
  {id: 'focus', value: 27, masteryValue: 27, label: 'Focus en stage intensif', color: '#d83e34'},
  {id: 'flow', value: 88, masteryValue: 88, label: 'Flow qui met les coudes', color: '#2f72da'},
  {id: 'drama', value: 18, masteryValue: 82, label: 'Drama budget plafonné', color: '#6c3bc6'},
] satisfies PersonaMetric[];

export const inventoryConnections = [
  {id: 'subjects', label: 'Sujets', count: 12, icon: Network, color: '#3979e8'},
  {id: 'resources', label: 'Ressources', count: 48, icon: PackageOpen, color: '#a85cff'},
  {id: 'videos', label: 'Vidéos', count: 17, icon: Clapperboard, color: '#f15d32'},
  {id: 'documents', label: 'Documents', count: 31, icon: FileText, color: '#ffb23f'},
] satisfies Array<{
  id: string;
  label: string;
  color: string;
  count: number;
  icon: LucideIcon;
}>;

export const skillFamilyColors = {
  image: '#3979e8',
  volume: '#a85cff',
  system: '#f15d32',
  story: '#ffb23f',
  soft: '#8d98a8',
} as const;

export const personaShortLabels: Record<string, string> = {
  pedagogy: 'Pedagogy killer',
  bullshit: 'Bullshit contenu',
  synthesis: 'Synthèse turbo',
  chaos: 'Chaos apprivoisé',
  lore: 'Lore vivant',
  patience: 'Patience limitée',
  taste: 'Détail maniaque',
  canon: 'Radar canon',
  improv: 'Impro cadrée',
  focus: 'Focus variable',
  flow: 'Flow solide',
  drama: 'Drama contenu',
};

export const profileRankLadder = [
  {minimum: 0, title: 'Initié du Flux'},
  {minimum: 20, title: 'Artisan du Flux'},
  {minimum: 40, title: 'Spécialiste confirmé'},
  {minimum: 60, title: 'Expert de la Fabrique'},
  {minimum: 80, title: 'Maître des Flux'},
  {minimum: 95, title: 'Grand Maître'},
] as const;

export const prototypeProfileRank = 88;

export const skillArcs = [
  {
    id: 'creation',
    label: 'Création',
    galaxyTitle: 'Les idées qui refusent de rester tranquilles',
    icon: WandSparkles,
    color: '#f15d32',
    metrics: [
      {id: 'brief', value: 82, masteryValue: 82, label: 'Brief à dompter', color: '#f15d32'},
      {id: 'idea', value: 74, masteryValue: 74, label: 'Idées exploitables', color: '#ff8a45'},
      {id: 'taste', value: 91, masteryValue: 91, label: 'DA instinctive', color: '#3979e8'},
    ],
    skills: [
      {label: 'Concept', icon: WandSparkles, weight: 1.42, mastery: 92, xp: 94, family: 'story'},
      {label: 'Mood', icon: Paintbrush, weight: 1.08, mastery: 78, xp: 81, family: 'image'},
      {label: 'Pitch', icon: PenTool, weight: 0.88, mastery: 66, xp: 62, family: 'story'},
      {label: 'Prototype', icon: Boxes, weight: 1.24, mastery: 84, xp: 88, family: 'volume'},
      {label: 'Élagage', icon: X, weight: 0.72, mastery: 22, xp: 48, family: 'system'},
      {label: 'Surprise', icon: Plus, weight: 0.82, mastery: 15, xp: 72, family: 'story'},
      {label: 'Motion', icon: Clapperboard, weight: 1.18, mastery: 87, xp: 91, family: 'image'},
      {label: 'Volume', icon: Boxes, weight: 1.02, mastery: 76, xp: 74, family: 'volume'},
      {label: 'Montage', icon: Workflow, weight: 0.91, mastery: 69, xp: 67, family: 'system'},
      {label: 'Accident heureux', icon: Sparkles, weight: 0.68, mastery: 8, xp: 56, family: 'story'},
      {label: 'PowerPoint mystique', icon: Monitor, weight: 0.62, mastery: 4, xp: 31, family: 'image'},
      {label: 'Sculpture mentale', icon: Boxes, weight: 0.76, mastery: 29, xp: 43, family: 'volume'},
      {label: 'Goût du risque', icon: ShieldCheck, weight: 0.58, mastery: 18, xp: 26, family: 'soft'},
      {label: 'Obsession du détail', icon: Eye, weight: 0.72, mastery: 31, xp: 42, family: 'soft'},
    ],
  },
  {
    id: 'dialogue',
    label: 'Dialogue',
    galaxyTitle: 'Le silence avait qu’à mieux se défendre',
    icon: MessageCircle,
    color: '#3979e8',
    metrics: [
      {id: 'context', value: 88, masteryValue: 88, label: 'Contexte capté', color: '#3979e8'},
      {id: 'clarity', value: 79, masteryValue: 79, label: 'Clarté sans sermon', color: '#4b9eea'},
      {id: 'tunnel', value: 64, masteryValue: 64, label: 'Tunnel prêt', color: '#a85cff'},
    ],
    skills: [
      {label: 'Écoute', icon: Mic, weight: 1.38, mastery: 91, xp: 86, family: 'system'},
      {label: 'Relance', icon: Send, weight: 0.94, mastery: 73, xp: 79, family: 'story'},
      {label: 'Résumé', icon: FileText, weight: 1.16, mastery: 86, xp: 90, family: 'system'},
      {label: 'Tunnel', icon: MessageCircle, weight: 1.28, mastery: 82, xp: 84, family: 'story'},
      {label: 'Silence', icon: Moon, weight: 0.7, mastery: 18, xp: 41, family: 'image'},
      {label: 'Punchline', icon: Sparkles, weight: 0.84, mastery: 69, xp: 93, family: 'story'},
      {label: 'Cadrage', icon: Eye, weight: 1.02, mastery: 77, xp: 73, family: 'image'},
      {label: 'Reformulation', icon: Pencil, weight: 1.12, mastery: 83, xp: 85, family: 'system'},
      {label: 'Provocation', icon: WandSparkles, weight: 0.78, mastery: 26, xp: 89, family: 'story'},
      {label: 'Respiration', icon: History, weight: 0.66, mastery: 7, xp: 39, family: 'volume'},
      {label: 'Télépathie', icon: Network, weight: 0.62, mastery: 3, xp: 28, family: 'story'},
      {label: 'Réunion courte', icon: History, weight: 0.7, mastery: 12, xp: 36, family: 'system'},
      {label: 'Tact en survie', icon: UsersRound, weight: 0.56, mastery: 21, xp: 32, family: 'soft'},
      {label: 'Calme apparent', icon: Moon, weight: 0.64, mastery: 28, xp: 38, family: 'soft'},
    ],
  },
  {
    id: 'direction',
    label: 'Direction',
    galaxyTitle: 'Le goût, mais avec des preuves',
    icon: Paintbrush,
    color: '#ffb23f',
    metrics: [
      {id: 'canon', value: 81, masteryValue: 81, label: 'Canon surveillé', color: '#ffb23f'},
      {id: 'contrast', value: 67, masteryValue: 67, label: 'Contraste utile', color: '#f15d32'},
      {id: 'style', value: 73, masteryValue: 73, label: 'Style sous contrôle', color: '#3979e8'},
    ],
    skills: [
      {label: 'Charte', icon: Paintbrush, weight: 1.38, mastery: 88, xp: 91, family: 'image'},
      {label: 'Image', icon: Eye, weight: 1.2, mastery: 84, xp: 87, family: 'image'},
      {label: 'Couleur', icon: Sun, weight: 1, mastery: 79, xp: 83, family: 'image'},
      {label: 'Cadre', icon: Monitor, weight: 0.88, mastery: 71, xp: 68, family: 'system'},
      {label: 'Tri', icon: Check, weight: 0.72, mastery: 21, xp: 52, family: 'system'},
      {label: 'Dérive', icon: ShieldCheck, weight: 0.86, mastery: 63, xp: 59, family: 'story'},
      {label: 'Typographie', icon: PenTool, weight: 1.04, mastery: 75, xp: 71, family: 'image'},
      {label: 'Rythme', icon: Clapperboard, weight: 0.94, mastery: 72, xp: 78, family: 'volume'},
      {label: 'Hiérarchie', icon: Workflow, weight: 1.17, mastery: 85, xp: 82, family: 'system'},
      {label: 'Mauvais goût', icon: X, weight: 0.62, mastery: 6, xp: 47, family: 'story'},
      {label: 'Logo plus gros', icon: Plus, weight: 0.64, mastery: 2, xp: 24, family: 'image'},
      {label: 'Beige premium', icon: Palette, weight: 0.68, mastery: 14, xp: 33, family: 'volume'},
      {label: 'Diplomatie DA', icon: MessageCircle, weight: 0.62, mastery: 24, xp: 35, family: 'soft'},
      {label: 'Patience chromatique', icon: History, weight: 0.54, mastery: 17, xp: 27, family: 'soft'},
    ],
  },
  {
    id: 'structure',
    label: 'Structure',
    galaxyTitle: 'Le chaos, désormais avec un dossier',
    icon: Workflow,
    color: '#a85cff',
    metrics: [
      {id: 'flow', value: 86, masteryValue: 86, label: 'Flux rangé', color: '#a85cff'},
      {id: 'queue', value: 72, masteryValue: 72, label: 'Queue lisible', color: '#3979e8'},
      {id: 'chaos', value: 24, masteryValue: 76, label: 'Bazar accepté', color: '#d83e34'},
    ],
    skills: [
      {label: 'Plan', icon: FolderKanban, weight: 1.42, mastery: 89, xp: 92, family: 'system'},
      {label: 'Queue', icon: LoaderCircle, weight: 1.16, mastery: 82, xp: 88, family: 'system'},
      {label: 'Docs', icon: FileText, weight: 0.88, mastery: 72, xp: 65, family: 'story'},
      {label: 'Règles', icon: ShieldCheck, weight: 1.04, mastery: 78, xp: 76, family: 'system'},
      {label: 'Archive', icon: History, weight: 0.72, mastery: 19, xp: 44, family: 'volume'},
      {label: 'Action', icon: Command, weight: 0.84, mastery: 67, xp: 81, family: 'system'},
      {label: 'Contrat', icon: ScrollText, weight: 1.08, mastery: 81, xp: 79, family: 'story'},
      {label: 'Passerelle', icon: Network, weight: 0.98, mastery: 74, xp: 70, family: 'system'},
      {label: 'Preuve', icon: Check, weight: 0.88, mastery: 68, xp: 64, family: 'image'},
      {label: 'Dette', icon: LoaderCircle, weight: 0.64, mastery: 7, xp: 35, family: 'volume'},
      {label: 'Tableur sacré', icon: FileText, weight: 0.62, mastery: 3, xp: 22, family: 'system'},
      {label: 'Dossier final v12', icon: FolderKanban, weight: 0.72, mastery: 13, xp: 30, family: 'story'},
      {label: 'Priorité froide', icon: Gem, weight: 0.66, mastery: 27, xp: 37, family: 'soft'},
      {label: 'Nerfs propres', icon: ShieldCheck, weight: 0.58, mastery: 16, xp: 25, family: 'soft'},
    ],
  },
] satisfies SkillArc[];

export const profKrapuStats = [
  {id: 'science', value: 92, masteryValue: 92, label: 'Science sans paillettes', color: '#35a879'},
  {id: 'logic', value: 81, masteryValue: 81, label: 'Logique sous lampe UV', color: '#3979e8'},
  {id: 'dataviz', value: 61, masteryValue: 61, label: 'Dataviz qui ne ment pas', color: '#8b62c9'},
  {id: 'source', value: 38, masteryValue: 38, label: 'Source encore en cavale', color: '#d9823f'},
  {id: 'troll', value: 18, masteryValue: 18, label: 'Troll passé au contrôle qualité', color: '#c94b32'},
  {id: 'patience', value: 8, masteryValue: 8, label: 'Patience avec les approximations', color: '#d83e34'},
] satisfies PersonaMetric[];

export const profKrapuInventoryConnections = [
  {id: 'courses', label: 'Cours', count: 24, icon: GraduationCap, color: '#35a879'},
  {id: 'schemas', label: 'Schémas', count: 18, icon: Network, color: '#3979e8'},
  {id: 'dataviz', label: 'Dataviz', count: 9, icon: Monitor, color: '#e84f8a'},
  {id: 'molekids', label: 'Molekids', count: 7, icon: Sparkles, color: '#f0c14a'},
] satisfies InventoryConnection[];

export const profKrapuShortLabels: Record<string, string> = {
  science: 'Science nette',
  logic: 'Logique froide',
  dataviz: 'Dataviz propre',
  source: 'Source d’abord',
  troll: 'Troll utile',
  patience: 'Patience scientifique',
};

export const profKrapuSkillArcs = [
  {
    id: 'science',
    label: 'Science',
    galaxyTitle: 'La matière avoue quand on pose la bonne question',
    icon: GraduationCap,
    color: '#35a879',
    metrics: [
      {id: 'chemistry', value: 92, masteryValue: 92, label: 'Chimie cadrée', color: '#35a879'},
      {id: 'botany', value: 78, masteryValue: 78, label: 'Botanique suspecte', color: '#4fbc8c'},
      {id: 'source', value: 95, masteryValue: 95, label: 'Sources vérifiées', color: '#3979e8'},
    ],
    skills: [
      {label: 'Chimie', icon: Sparkles, weight: 1.5, mastery: 94, xp: 91, family: 'system'},
      {label: 'Botanique', icon: Sun, weight: 1.14, mastery: 78, xp: 72, family: 'image'},
      {label: 'Molécules', icon: Network, weight: 1.3, mastery: 90, xp: 86, family: 'system'},
      {label: 'Logique', icon: Workflow, weight: 1.24, mastery: 88, xp: 84, family: 'story'},
      {label: 'Hypothèse', icon: Search, weight: 0.92, mastery: 70, xp: 66, family: 'soft'},
      {label: 'Protocole', icon: Check, weight: 1.02, mastery: 82, xp: 79, family: 'system'},
      {label: 'Précision source', icon: ShieldCheck, weight: 1.22, mastery: 96, xp: 89, family: 'system'},
      {label: 'Réaction', icon: WandSparkles, weight: 0.84, mastery: 62, xp: 74, family: 'image'},
      {label: 'Erreur féconde', icon: Plus, weight: 0.72, mastery: 36, xp: 52, family: 'soft'},
      {label: 'SF6 mental', icon: Command, weight: 0.62, mastery: 22, xp: 44, family: 'soft'},
    ],
  },
  {
    id: 'pedagogy',
    label: 'Pédagogie',
    galaxyTitle: 'Le cours devient suspect, donc utile',
    icon: BookOpen,
    color: '#3979e8',
    metrics: [
      {id: 'course', value: 89, masteryValue: 89, label: 'Cours lisible', color: '#3979e8'},
      {id: 'explain', value: 84, masteryValue: 84, label: 'Explication sèche', color: '#4b9eea'},
      {id: 'lost', value: 18, masteryValue: 82, label: 'Élèves perdus récupérés', color: '#e84f8a'},
    ],
    skills: [
      {label: 'Cours', icon: GraduationCap, weight: 1.46, mastery: 90, xp: 92, family: 'system'},
      {label: 'Vulgarisation', icon: MessageCircle, weight: 1.28, mastery: 86, xp: 88, family: 'story'},
      {label: 'Reformulation', icon: Pencil, weight: 1.08, mastery: 82, xp: 79, family: 'system'},
      {label: 'Question piège', icon: Eye, weight: 0.86, mastery: 61, xp: 76, family: 'story'},
      {label: 'Métaphore', icon: Sparkles, weight: 0.94, mastery: 74, xp: 71, family: 'image'},
      {label: 'Checkpoint', icon: Check, weight: 0.98, mastery: 77, xp: 73, family: 'system'},
      {label: 'Démonstration', icon: Monitor, weight: 1.12, mastery: 80, xp: 82, family: 'volume'},
      {label: 'Élèves perdus', icon: UsersRound, weight: 0.72, mastery: 42, xp: 63, family: 'soft'},
      {label: 'Troll doux', icon: WandSparkles, weight: 0.62, mastery: 33, xp: 68, family: 'soft'},
      {label: 'Phrase qui pique', icon: PenTool, weight: 0.66, mastery: 48, xp: 58, family: 'story'},
    ],
  },
  {
    id: 'dataviz',
    label: 'Dataviz',
    galaxyTitle: 'Les chiffres arrêtent de faire les malins',
    icon: Monitor,
    color: '#e84f8a',
    metrics: [
      {id: 'axis', value: 86, masteryValue: 86, label: 'Axes propres', color: '#e84f8a'},
      {id: 'legend', value: 80, masteryValue: 80, label: 'Légende utile', color: '#ff72a6'},
      {id: 'bullshit', value: 13, masteryValue: 87, label: 'Bullshit statistique contenu', color: '#9f285c'},
    ],
    skills: [
      {label: 'Axes', icon: Workflow, weight: 1.2, mastery: 86, xp: 82, family: 'system'},
      {label: 'Légendes', icon: FileText, weight: 1.04, mastery: 81, xp: 75, family: 'story'},
      {label: 'Hiérarchie', icon: Network, weight: 1.28, mastery: 88, xp: 86, family: 'system'},
      {label: 'Graphique', icon: Monitor, weight: 1.42, mastery: 84, xp: 87, family: 'image'},
      {label: 'Donnée source', icon: ShieldCheck, weight: 1.16, mastery: 93, xp: 88, family: 'system'},
      {label: 'Anti-bullshit', icon: X, weight: 0.86, mastery: 65, xp: 73, family: 'soft'},
      {label: 'Schéma', icon: Network, weight: 1.08, mastery: 78, xp: 80, family: 'image'},
      {label: 'Tableau', icon: Boxes, weight: 0.84, mastery: 57, xp: 62, family: 'volume'},
      {label: 'Fausse précision', icon: Search, weight: 0.68, mastery: 29, xp: 47, family: 'soft'},
      {label: 'Couleur lisible', icon: Palette, weight: 0.76, mastery: 52, xp: 55, family: 'image'},
    ],
  },
  {
    id: 'support',
    label: 'Supports',
    galaxyTitle: 'Le tableau cesse enfin de transpirer',
    icon: FileText,
    color: '#f0c14a',
    metrics: [
      {id: 'thumbnail', value: 74, masteryValue: 74, label: 'Thumbnail civilisé', color: '#f0c14a'},
      {id: 'poster', value: 83, masteryValue: 83, label: 'Poster exploitable', color: '#35a879'},
      {id: 'molekids', value: 69, masteryValue: 69, label: 'Molekids proprement rangé', color: '#3979e8'},
    ],
    skills: [
      {label: 'Thumbnail', icon: Clapperboard, weight: 1.34, mastery: 76, xp: 80, family: 'image'},
      {label: 'Poster', icon: Paintbrush, weight: 1.22, mastery: 82, xp: 79, family: 'image'},
      {label: 'Fiche', icon: FileText, weight: 1.04, mastery: 78, xp: 74, family: 'system'},
      {label: 'Bannière', icon: Monitor, weight: 0.94, mastery: 66, xp: 71, family: 'image'},
      {label: 'Storyboard', icon: ScrollText, weight: 0.9, mastery: 61, xp: 64, family: 'story'},
      {label: 'Molekids', icon: Sparkles, weight: 0.98, mastery: 69, xp: 76, family: 'volume'},
      {label: 'Print handoff', icon: Upload, weight: 0.8, mastery: 55, xp: 58, family: 'system'},
      {label: 'Texte réservé', icon: PenTool, weight: 0.62, mastery: 37, xp: 42, family: 'soft'},
      {label: 'Export sobre', icon: Save, weight: 0.72, mastery: 49, xp: 51, family: 'system'},
      {label: 'Blague sèche', icon: MessageCircle, weight: 0.58, mastery: 44, xp: 57, family: 'soft'},
    ],
  },
] satisfies SkillArc[];

export const profKrapuPunchlines = {
  default: 'Science propre, vanne sèche.',
  home: 'On vulgarise, mais avec des preuves.',
  project: 'Votre bazar a mis une blouse.',
  teaching: 'Cours prêt. Mauvaise foi sous contrôle.',
  learn: 'On apprend, mais on vérifie.',
  inventory: 'Ressources rangées, miracle discret.',
  da: 'Le style attendra les données.',
  story: 'Narration oui, intox non.',
  companions: 'Équipe calme, microscope ouvert.',
  masterbuild: 'Système visible, preuves exigées.',
} satisfies Record<ActiveSurface | 'default', string>;

export const profKrapuSkillPunchlines: Partial<Record<SkillArcId, string>> = {
  science: 'La science, pas le karaoké.',
  pedagogy: 'Pédagogie sèche, impact net.',
  dataviz: 'Un graphe propre ou rien.',
  support: 'Support net, ego rangé.',
};

export const prototypeProfiles: Record<PrototypeProfileId, PrototypeProfile> = {
  masterflex: {
    id: 'masterflex',
    name: 'MasterFlex',
    mobileLabel: 'MasterFlex',
    displayName: 'Malex',
    rankScore: prototypeProfileRank,
    defaultThemePaletteId: 'masterflow',
    personaColor: '#3979e8',
    supportColor: '#8b62c9',
    avatarAsset: neutralPortraitAsset,
    moodAssets: personaMoodAssets,
    canonAsset: masterflexCanonAsset,
    canonAlt: 'MasterFlex en pied',
    stats: personaStats,
    inventoryConnections,
    skillArcs,
    shortLabels: personaShortLabels,
    defaultPunchline: defaultMasterflexPunchline,
    modePunchlines,
    skillPunchlines,
    tunnelLine: 'MasterFlex développe le point, l’interface attend sagement.',
    tunnelPrompt: 'Pose ton pavé, MasterFlex encaisse.',
  },
  profkrapu: {
    id: 'profkrapu',
    name: 'ProfKrapu',
    mobileLabel: 'ProfKrapu',
    displayName: 'Vincent',
    rankScore: 84,
    defaultThemePaletteId: 'orchid',
    personaColor: '#35a879',
    supportColor: '#3979e8',
    avatarAsset: profkrapuNeutralPortraitAsset,
    moodAssets: profKrapuMoodAssets,
    canonAsset: profkrapuCanonAsset,
    canonAlt: 'ProfKrapu en pied',
    stats: profKrapuStats,
    inventoryConnections: profKrapuInventoryConnections,
    skillArcs: profKrapuSkillArcs,
    shortLabels: profKrapuShortLabels,
    defaultPunchline: profKrapuPunchlines.default,
    modePunchlines: profKrapuPunchlines,
    skillPunchlines: profKrapuSkillPunchlines,
    tunnelLine: 'ProfKrapu développe le point, sources sur la table.',
    tunnelPrompt: 'Posez votre hypothèse, ProfKrapu sort la lampe UV.',
  },
};

export const prototypeProfileContractVersion = 'prototype-profile-v1';

export const prototypeProfileIds = Object.keys(prototypeProfiles) as PrototypeProfileId[];

export const getPrototypeProfile = (profileId: PrototypeProfileId): PrototypeProfile => prototypeProfiles[profileId];

export const getPrototypeThemePalette = (paletteId: ThemePaletteId) =>
  themePalettes.find((palette) => palette.id === paletteId) ?? themePalettes[0];

export const getPrototypeProfileRank = (profile: PrototypeProfile) =>
  [...profileRankLadder].reverse().find((rank) => profile.rankScore >= rank.minimum) ?? profileRankLadder[0];

export const buildPrototypeModeGroups = (
  visibleModeIds?: Set<DemoMode>,
  runtimeAuthoritative = false,
): PrototypeModeGroup[] => modeGroups
  .map((group) => ({
    kind: group.kind,
    label: group.label,
    modes: group.ids
      .filter((id) => visibleModeIds ? visibleModeIds.has(id) : true)
      .map((id) => modes.find((mode) => mode.id === id))
      .filter((mode): mode is ModeItem => Boolean(mode))
      .map((mode) => ({
        featured: mode.id === 'project',
        icon: mode.icon,
        id: mode.id,
        label: mode.label,
        locked: runtimeAuthoritative ? false : mode.status === 'locked',
      })),
  }))
  .filter((group) => group.modes.length > 0);

export const buildPrototypeHomeModes = (ids: DemoMode[]): PrototypeHomeMode[] => ids
  .map((id) => modes.find((mode) => mode.id === id))
  .filter((mode): mode is ModeItem => Boolean(mode))
  .map((mode) => ({
    icon: mode.icon,
    id: mode.id,
    label: mode.label,
    primary: mode.id === 'project',
  }));
