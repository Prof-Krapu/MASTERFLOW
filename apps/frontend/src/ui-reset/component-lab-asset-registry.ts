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
  formatWarning?: string;
  format: string;
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
    count: 4,
    label: 'Actifs',
    status: 'active',
    summary: 'Chargent déjà dans le proto ou le Lab partagé.',
  },
  {
    color: '#ff6a35',
    count: 2,
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
    count: 2,
    label: 'À décider',
    status: 'decision',
    summary: 'À trancher avant import massif ou normalisation.',
  },
];

export const componentLabAssetRegistry: ComponentLabAssetEntry[] = [
  {
    action: 'Garder actif.',
    alpha: 'yes',
    format: '6 x 640x640 PNG',
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
  },
  {
    action: 'Garder actif.',
    alpha: 'yes',
    format: '829x1500 PNG',
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
  },
  {
    action: 'Garder en Lab, ne pas promouvoir sans revue.',
    alpha: 'yes',
    format: '20 x 960x1728 PNG',
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
  },
  {
    action: 'Conserver provisoirement comme source de vérif.',
    alpha: 'yes',
    format: '20 PNG RGBA',
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
  },
  {
    action: 'Garder actif pour le moment, normaliser plus tard si saute UI.',
    alpha: 'yes',
    formatWarning: 'Non standard UI : cible finale recommandée 640x640.',
    format: '6 x 1254x1254 PNG',
    id: 'profkrapu-portraits-active',
    notes: 'Fonctionne dans le proto, mais ne respecte pas encore le standard 640x640.',
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
    status: 'decision',
    title: 'Portraits ProfKrapu',
    type: 'portrait',
    usedIn: '/ui-reset · profil Vincent',
  },
  {
    action: 'Garder actif.',
    alpha: 'yes',
    format: '829x1500 PNG',
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
  },
  {
    action: 'Ne pas importer en bloc.',
    alpha: 'mixed',
    format: 'sources RGB + previews + composites',
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
  },
  {
    action: 'Importer seulement si besoin de preuve DA.',
    alpha: 'mixed',
    format: 'sources + cutouts + contact sheets',
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
  },
  {
    action: 'Décider si Git doit porter les sources lourdes.',
    alpha: 'yes',
    format: 'PSD 8 MB + PNG variante',
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
  },
  {
    action: 'Garder actif.',
    alpha: 'n/a',
    format: 'SVG dynamique',
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
  },
  {
    action: 'Garder comme process canon candidat.',
    alpha: 'n/a',
    format: 'Markdown + Python',
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
  },
];

export const componentLabAssetNextActions = [
  'Ne pas importer les candidats de l’ancien clone en vrac.',
  'Normaliser ProfKrapu portraits en 640x640 si l’UI montre une saute.',
  'Décider si les PSD et sources lourdes restent hors Git.',
  'Promouvoir Stage Actor seulement après validation visuelle finale.',
];
