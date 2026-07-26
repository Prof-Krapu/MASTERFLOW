import masterflexCanonAsset from '../assets/masterflex-canon-full.png';
import masterflexConfidentPortraitAsset from '../assets/masterflex-portraits/confident.png';
import masterflexDisgustPortraitAsset from '../assets/masterflex-portraits/disgust.png';
import masterflexFearPortraitAsset from '../assets/masterflex-portraits/fear.png';
import masterflexJoyPortraitAsset from '../assets/masterflex-portraits/joy.png';
import masterflexNeutralPortraitAsset from '../assets/masterflex-portraits/neutral.png';
import masterflexSadPortraitAsset from '../assets/masterflex-portraits/sad.png';
import masterflexNeutralLeftStageAsset from '../assets/masterflex-stage-actor/candidates/left-normalized/neutral-left.png';
import masterflexNeutralRightStageAsset from '../assets/masterflex-stage-actor/candidates/right-normalized/neutral-right.png';
import masterflowMarkAsset from '../assets/masterflow-mark-graff.svg';
import masterflowWordmarkAsset from '../assets/masterflow-wordmark.svg';
import profkrapuCanonAsset from '../assets/profkrapu-canon/profkrapu-canon-v3.png';
import profkrapuConfidentPortraitAsset from '../assets/profkrapu-portraits/confident.png';
import profkrapuDisgustPortraitAsset from '../assets/profkrapu-portraits/disgust.png';
import profkrapuFearPortraitAsset from '../assets/profkrapu-portraits/fear.png';
import profkrapuJoyPortraitAsset from '../assets/profkrapu-portraits/joy.png';
import profkrapuNeutralPortraitAsset from '../assets/profkrapu-portraits/neutral.png';
import profkrapuSadPortraitAsset from '../assets/profkrapu-portraits/sad.png';
import profkrapuNeutralLeftStageAsset from '../assets/profkrapu-stage-actor/candidates/normalized/neutral-left.png';
import profkrapuNeutralRightStageAsset from '../assets/profkrapu-stage-actor/candidates/normalized/neutral-right.png';

export type LabAssetPersonaId = 'masterflex' | 'profkrapu' | 'masterflow';
export type LabAssetStatus = 'active' | 'candidate' | 'archive' | 'decision';
export type LabAssetType = 'portrait' | 'canon' | 'stage-actor' | 'logo' | 'source' | 'process';

export interface ComponentLabAssetPreviewImage {
  alt: string;
  label: string;
  src: string;
}

export type ComponentLabAssetPreview =
  | {kind: 'strip'; images: ComponentLabAssetPreviewImage[]}
  | {kind: 'image'; alt: string; src: string; tone: 'canon' | 'stage'}
  | {kind: 'logo'; images: ComponentLabAssetPreviewImage[]}
  | {kind: 'placeholder'; detail: string; label: string};

export interface ComponentLabAssetEntry {
  action: string;
  alpha: 'yes' | 'no' | 'mixed' | 'n/a';
  decisionOwner: string;
  formatWarning?: string;
  format: string;
  gate: string;
  id: string;
  notes: string;
  path: string;
  persona: LabAssetPersonaId;
  preview: ComponentLabAssetPreview;
  quantity: string;
  status: LabAssetStatus;
  title: string;
  type: LabAssetType;
  usedIn: string;
  visibility: string;
}

export interface ComponentLabAssetStatusCard {
  color: string;
  count: number;
  label: string;
  status: LabAssetStatus;
  summary: string;
}

export const componentLabAssetStatusCards: ComponentLabAssetStatusCard[] = [
  {
    color: '#4b9eea',
    count: 5,
    label: 'Actifs',
    status: 'active',
    summary: 'Chargent déjà dans le proto ou le Lab partagé.',
  },
  {
    color: '#ff6a35',
    count: 3,
    label: 'Candidats',
    status: 'candidate',
    summary: 'Utiles en Lab, mais pas encore canon/runtime.',
  },
  {
    color: '#9b7cff',
    count: 3,
    label: 'Archives',
    status: 'archive',
    summary: 'Preuves ou sources à conserver sans promotion automatique.',
  },
  {
    color: '#ffbd4a',
    count: 1,
    label: 'À décider',
    status: 'decision',
    summary: 'À trancher avant import massif ou normalisation.',
  },
];

export const componentLabAssetRegistry: ComponentLabAssetEntry[] = [
  {
    action: 'Garder actif.',
    alpha: 'yes',
    decisionOwner: 'MALEX',
    format: '6 x 640x640 PNG',
    gate: 'Déjà validé visuel + format.',
    id: 'masterflex-portraits-active',
    notes: 'Pack stable pour les états skilltree. Format UI cible déjà respecté.',
    path: 'apps/frontend/src/assets/masterflex-portraits/*.png',
    persona: 'masterflex',
    preview: {
      kind: 'strip',
      images: [
        {alt: 'MasterFlex neutral', label: 'neutral', src: masterflexNeutralPortraitAsset},
        {alt: 'MasterFlex fear', label: 'fear', src: masterflexFearPortraitAsset},
        {alt: 'MasterFlex disgust', label: 'disgust', src: masterflexDisgustPortraitAsset},
        {alt: 'MasterFlex sad', label: 'sad', src: masterflexSadPortraitAsset},
        {alt: 'MasterFlex confident', label: 'confident', src: masterflexConfidentPortraitAsset},
        {alt: 'MasterFlex joy', label: 'joy', src: masterflexJoyPortraitAsset},
      ],
    },
    quantity: '6',
    status: 'active',
    title: 'Portraits MasterFlex',
    type: 'portrait',
    usedIn: '/ui-reset · skilltree · navigation',
    visibility: 'Proto + Lab',
  },
  {
    action: 'Garder actif.',
    alpha: 'yes',
    decisionOwner: 'MALEX',
    format: '829x1500 PNG',
    gate: 'Canon visuel validé.',
    id: 'masterflex-canon-active',
    notes: 'Visuel canon en pied intégré. Sert de référence d’occupation verticale.',
    path: 'apps/frontend/src/assets/masterflex-canon-full.png',
    persona: 'masterflex',
    preview: {alt: 'Canon full body MasterFlex', kind: 'image', src: masterflexCanonAsset, tone: 'canon'},
    quantity: '1',
    status: 'active',
    title: 'Canon full body MasterFlex',
    type: 'canon',
    usedIn: '/ui-reset · page personnage',
    visibility: 'Proto + Lab',
  },
  {
    action: 'Garder en Lab, ne pas promouvoir sans revue.',
    alpha: 'yes',
    decisionOwner: 'MALEX',
    format: '20 x 960x1728 PNG',
    gate: 'Revue acting + collision UI avant promotion.',
    id: 'masterflex-stage-normalized',
    notes: 'Pack gauche/droite validé pour test, encore candidat produit.',
    path: 'apps/frontend/src/assets/masterflex-stage-actor/candidates/*-normalized/*.png',
    persona: 'masterflex',
    preview: {
      kind: 'strip',
      images: [
        {alt: 'MasterFlex stage actor gauche', label: 'left', src: masterflexNeutralLeftStageAsset},
        {alt: 'MasterFlex stage actor droite', label: 'right', src: masterflexNeutralRightStageAsset},
      ],
    },
    quantity: '20',
    status: 'candidate',
    title: 'Stage Actor MasterFlex normalisé',
    type: 'stage-actor',
    usedIn: '/ui-lab · actor · stage',
    visibility: 'Lab seulement',
  },
  {
    action: 'Conserver provisoirement comme source de vérif.',
    alpha: 'yes',
    decisionOwner: 'Codex',
    format: '20 PNG RGBA',
    gate: 'Archive process, pas de promotion UI.',
    id: 'masterflex-stage-alpha',
    notes: 'Versions détourées avant normalisation. Utiles pour diagnostiquer une saute de taille.',
    path: 'apps/frontend/src/assets/masterflex-stage-actor/candidates/*-alpha/*.png',
    persona: 'masterflex',
    preview: {detail: 'Sources alpha conservées pour diagnostic de cadrage.', kind: 'placeholder', label: 'Alpha sources'},
    quantity: '20',
    status: 'archive',
    title: 'Stage Actor MasterFlex alpha',
    type: 'source',
    usedIn: 'preuve process',
    visibility: 'Source Git',
  },
  {
    action: 'Garder actif standard.',
    alpha: 'yes',
    decisionOwner: 'MALEX + Vincent',
    format: '6 x 640x640 PNG',
    gate: 'Format standard, revue humaine dans profil Vincent.',
    id: 'profkrapu-portraits-active',
    notes: 'Pack Vincent normalisé pour les états skilltree et la navigation profil.',
    path: 'apps/frontend/src/assets/profkrapu-portraits/*.png',
    persona: 'profkrapu',
    preview: {
      kind: 'strip',
      images: [
        {alt: 'ProfKrapu neutral', label: 'neutral', src: profkrapuNeutralPortraitAsset},
        {alt: 'ProfKrapu fear', label: 'fear', src: profkrapuFearPortraitAsset},
        {alt: 'ProfKrapu disgust', label: 'disgust', src: profkrapuDisgustPortraitAsset},
        {alt: 'ProfKrapu sad', label: 'sad', src: profkrapuSadPortraitAsset},
        {alt: 'ProfKrapu confident', label: 'confident', src: profkrapuConfidentPortraitAsset},
        {alt: 'ProfKrapu joy', label: 'joy', src: profkrapuJoyPortraitAsset},
      ],
    },
    quantity: '6',
    status: 'active',
    title: 'Portraits ProfKrapu',
    type: 'portrait',
    usedIn: '/ui-reset · profil Vincent',
    visibility: 'Proto + Lab',
  },
  {
    action: 'Garder actif.',
    alpha: 'yes',
    decisionOwner: 'MALEX',
    format: '829x1500 PNG',
    gate: 'Canon V3 actif, V2 non promue.',
    id: 'profkrapu-canon-active',
    notes: 'V3 intégrée. La V2 reste hors promotion.',
    path: 'apps/frontend/src/assets/profkrapu-canon/profkrapu-canon-v3.png',
    persona: 'profkrapu',
    preview: {alt: 'Canon full body ProfKrapu', kind: 'image', src: profkrapuCanonAsset, tone: 'canon'},
    quantity: '1',
    status: 'active',
    title: 'Canon full body ProfKrapu',
    type: 'canon',
    usedIn: '/ui-reset · page personnage',
    visibility: 'Proto + Lab',
  },
  {
    action: 'Ne pas importer en bloc.',
    alpha: 'mixed',
    decisionOwner: 'MALEX',
    format: 'sources RGB + previews + composites',
    gate: 'Sélection manuelle obligatoire.',
    id: 'old-masterflex-denim-candidates',
    notes: 'Mélange de sources, contact sheets et previews. Certaines images sont opaques.',
    path: 'ancien clone MASTERFLOW/apps/frontend/src/assets/masterflex-portraits/candidates/',
    persona: 'masterflex',
    preview: {detail: 'Hors branche V2 : sources à sélectionner manuellement si besoin.', kind: 'placeholder', label: 'Ancien clone'},
    quantity: '40+',
    status: 'archive',
    title: 'Candidats portraits denim MasterFlex',
    type: 'source',
    usedIn: 'historique génération',
    visibility: 'Archive hors runtime',
  },
  {
    action: 'Importer seulement si besoin de preuve DA.',
    alpha: 'mixed',
    decisionOwner: 'MALEX + Codex',
    format: 'sources + cutouts + contact sheets',
    gate: 'Importer une preuve, jamais le dossier brut.',
    id: 'old-profkrapu-candidates',
    notes: 'Utile pour retracer la génération, pas nécessaire au runtime.',
    path: 'ancien clone MASTERFLOW/apps/frontend/src/assets/profkrapu-*/candidates/',
    persona: 'profkrapu',
    preview: {detail: 'Hors branche V2 : contact sheets et sources, pas runtime.', kind: 'placeholder', label: 'Ancien clone'},
    quantity: '10+',
    status: 'archive',
    title: 'Candidats ProfKrapu',
    type: 'source',
    usedIn: 'historique génération',
    visibility: 'Archive hors runtime',
  },
  {
    action: 'Décider si Git doit porter les sources lourdes.',
    alpha: 'yes',
    decisionOwner: 'MALEX',
    format: 'PSD 8 MB + PNG variante',
    gate: 'GO explicite avant import source lourde.',
    id: 'masterflex-heavy-sources',
    notes: 'Utile pour édition manuelle, mais peut alourdir Git sans bénéfice direct.',
    path: 'ancien clone MASTERFLOW/apps/frontend/src/assets/masterflex-canon-full.psd',
    persona: 'masterflex',
    preview: {detail: 'PSD et variante source : décision Git léger vs preuve complète.', kind: 'placeholder', label: 'Source lourde'},
    quantity: '2',
    status: 'decision',
    title: 'Sources lourdes MasterFlex',
    type: 'source',
    usedIn: 'édition DA',
    visibility: 'Hors runtime',
  },
  {
    action: 'Garder actif.',
    alpha: 'n/a',
    decisionOwner: 'MALEX',
    format: 'SVG dynamique',
    gate: 'Dynamique thème, pas de PNG figé.',
    id: 'masterflow-logo-wordmark',
    notes: 'Logo et typo réagissent aux variables de thème. Pas de PNG figé.',
    path: 'apps/frontend/src/assets/masterflow-*.svg',
    persona: 'masterflow',
    preview: {
      kind: 'logo',
      images: [
        {alt: 'MasterFlow mark', label: 'mark', src: masterflowMarkAsset},
        {alt: 'MasterFlow wordmark', label: 'wordmark', src: masterflowWordmarkAsset},
      ],
    },
    quantity: '2',
    status: 'active',
    title: 'Logo et wordmark MasterFlow',
    type: 'logo',
    usedIn: '/ui-reset · /ui-lab',
    visibility: 'Proto + Lab',
  },
  {
    action: 'Garder comme process canon candidat.',
    alpha: 'n/a',
    decisionOwner: 'MALEX + Codex',
    format: 'Markdown + Python',
    gate: 'À transformer en process MASTERBUILD avant automatisation.',
    id: 'identity-asset-pipeline',
    notes: 'Runbook et scripts récupérés depuis l’ancien clone pour éviter de réinventer.',
    path: 'docs/theme-studio/* · scripts/*identity* · scripts/*chroma*',
    persona: 'masterflow',
    preview: {detail: 'Docs et scripts : pas une image, mais la recette industrielle.', kind: 'placeholder', label: 'Process'},
    quantity: '6',
    status: 'candidate',
    title: 'Pipeline Identity Assets',
    type: 'process',
    usedIn: 'MASTERBUILD · Theme Studio futur',
    visibility: 'Process',
  },
  {
    action: 'Tester en Lab, puis régénérer les placeholders état par état.',
    alpha: 'yes',
    decisionOwner: 'MALEX + Vincent',
    format: '20 x 960x1728 PNG',
    gate: 'Candidat Lab : 2 assets générés réels, 18 placeholders de layout à remplacer avant promotion.',
    id: 'profkrapu-stage-pack-needed',
    notes: 'Pack complet pour tester le pipeline actor/stage. Neutral-left et listening-left sont générés ; les autres slots sécurisent le gabarit Lab mais ne sont pas des acting finals.',
    path: 'apps/frontend/src/assets/profkrapu-stage-actor/candidates/',
    persona: 'profkrapu',
    preview: {
      kind: 'strip',
      images: [
        {alt: 'ProfKrapu stage actor gauche', label: 'left', src: profkrapuNeutralLeftStageAsset},
        {alt: 'ProfKrapu stage actor droite', label: 'right', src: profkrapuNeutralRightStageAsset},
      ],
    },
    quantity: '20',
    status: 'candidate',
    title: 'Stage Actor ProfKrapu candidat',
    type: 'stage-actor',
    usedIn: '/ui-lab · actor · stage',
    visibility: 'Lab seulement',
  },
];

export const componentLabAssetNextActions = [
  'Ne pas importer les candidats de l’ancien clone en vrac.',
  'Vérifier ProfKrapu portraits dans /ui-reset et /ui-lab/vincent.',
  'Préparer ProfKrapu Stage Actor avec les mêmes contraintes que MasterFlex.',
  'Décider si les PSD et sources lourdes restent hors Git.',
  'Promouvoir Stage Actor seulement après validation visuelle finale.',
];
