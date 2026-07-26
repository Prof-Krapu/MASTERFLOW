export type LabAssetPersonaId = 'masterflex' | 'profkrapu' | 'masterflow';
export type LabAssetStatus = 'active' | 'candidate' | 'archive' | 'decision';
export type LabAssetType = 'portrait' | 'canon' | 'stage-actor' | 'logo' | 'source' | 'process';

export interface ComponentLabAssetEntry {
  action: string;
  alpha: 'yes' | 'no' | 'mixed' | 'n/a';
  format: string;
  id: string;
  notes: string;
  path: string;
  persona: LabAssetPersonaId;
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
    quantity: '20',
    status: 'archive',
    title: 'Stage Actor MasterFlex alpha',
    type: 'source',
    usedIn: 'preuve process',
  },
  {
    action: 'Garder actif pour le moment, normaliser plus tard si saute UI.',
    alpha: 'yes',
    format: '6 x 1254x1254 PNG',
    id: 'profkrapu-portraits-active',
    notes: 'Fonctionne dans le proto, mais ne respecte pas encore le standard 640x640.',
    path: 'apps/frontend/src/assets/profkrapu-portraits/*.png',
    persona: 'profkrapu',
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
