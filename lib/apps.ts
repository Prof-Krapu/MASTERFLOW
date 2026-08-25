/**
 * Source de vérité unique des 11 correcteurs de la suite, partagée entre le
 * frontend (Landing, Register, panneau admin) et le backend (validation du
 * choix à l'inscription, gate du reverse proxy et du storage).
 *
 * Les icônes lucide restent côté frontend (Landing.tsx) : ce module doit
 * rester importable par le serveur sans tirer React.
 */

export type CorrectorSlug =
  | 'pc'
  | 'fr'
  | 'nl'
  | 'es'
  | 'svt'
  | 'maths'
  | 'ses'
  | 'tech'
  | 'en'
  | 'philo'
  | 'hg';

export interface CorrectorApp {
  slug: CorrectorSlug;
  title: string;
  eyebrow: string;
  description: string;
  accentVar: `--${CorrectorSlug}-color`;
}

export const CORRECTOR_APPS: CorrectorApp[] = [
  {
    slug: 'pc',
    title: 'Physique-Chimie',
    eyebrow: 'Sciences',
    description: 'Barème automatique, corrections au quart de point, dashboard par classe.',
    accentVar: '--pc-color',
  },
  {
    slug: 'fr',
    title: 'Français',
    eyebrow: 'Lettres',
    description: 'Barème souple, réconciliation des notes, suivi par compétences.',
    accentVar: '--fr-color',
  },
  {
    slug: 'nl',
    title: 'Néerlandais',
    eyebrow: 'Langues',
    description: 'Correction calibrée CECRL (A1+ → B2), gestion des classes et DS.',
    accentVar: '--nl-color',
  },
  {
    slug: 'es',
    title: 'Espagnol',
    eyebrow: 'Langues',
    description: 'LV, spécialité LLCER et ETLV — correction calibrée CECRL (A1+ → C1).',
    accentVar: '--es-color',
  },
  {
    slug: 'svt',
    title: 'SVT',
    eyebrow: 'Sciences',
    description:
      'Sciences de la vie et de la Terre — étude de documents (schémas, graphiques) et raisonnement, notation à bandeaux.',
    accentVar: '--svt-color',
  },
  {
    slug: 'maths',
    title: 'Mathématiques',
    eyebrow: 'Sciences',
    description:
      'Tout le lycée (spé, expertes, complémentaires, techno) — notation sommative au quart de point, vision des courbes et figures.',
    accentVar: '--maths-color',
  },
  {
    slug: 'ses',
    title: 'Sciences Économiques et Sociales',
    eyebrow: 'Sciences humaines',
    description:
      'Épreuve composée (mobilisation, étude de document, raisonnement) et dissertation — notation à bandeaux, exploitation des documents statistiques.',
    accentVar: '--ses-color',
  },
  {
    slug: 'tech',
    title: 'Technologie',
    eyebrow: 'Collège',
    description:
      "Cycles 3 et 4 (6e → 3e) — analyse d'objet technique, chaînes d'énergie/information, programmation (Scratch/mBlock), conception. Évaluation par compétences, notation à bandeaux.",
    accentVar: '--tech-color',
  },
  {
    slug: 'en',
    title: 'Anglais',
    eyebrow: 'Langues',
    description:
      'LV, spécialités LLCER et AMC (Anglais, Monde Contemporain) et ETLV — correction calibrée CECRL (A1+ → C1).',
    accentVar: '--en-color',
  },
  {
    slug: 'philo',
    title: 'Philosophie',
    eyebrow: 'Terminale · HLP',
    description:
      'Dissertation et explication de texte (Terminale, voies générale et technologique) et spécialité HLP — notation par paliers, double correction.',
    accentVar: '--philo-color',
  },
  {
    slug: 'hg',
    title: 'Histoire-Géographie',
    eyebrow: 'Seconde à Terminale · HGGSP',
    description:
      'Composition, étude critique de document(s) et croquis (Seconde à Terminale, voies générale et technologique) et spécialité HGGSP — notation par paliers, double correction.',
    accentVar: '--hg-color',
  },
];

export const CORRECTOR_SLUGS: CorrectorSlug[] = CORRECTOR_APPS.map((a) => a.slug);

export function isCorrectorSlug(v: unknown): v is CorrectorSlug {
  return typeof v === 'string' && (CORRECTOR_SLUGS as string[]).includes(v);
}

/** Titre lisible d'un slug (« fr » → « Français ») ; renvoie le slug si inconnu. */
export function correctorTitle(slug: string): string {
  return CORRECTOR_APPS.find((a) => a.slug === slug)?.title ?? slug;
}
