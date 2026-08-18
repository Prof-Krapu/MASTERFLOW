import type {RosterAvatarFallback} from '@masterflow/shared';

import studentPlaceholderA from './assets/student-placeholders/variant-a.png';
import studentPlaceholderB from './assets/student-placeholders/variant-b.png';
import studentPlaceholderNeutral from './assets/student-placeholders/variant-neutral.png';

const studentPlaceholderAssets: Record<RosterAvatarFallback, string> = {
  neutral: studentPlaceholderNeutral,
  a: studentPlaceholderA,
  b: studentPlaceholderB,
};

/**
 * Retourne le fallback explicitement porté par le roster. La variante neutre reste la valeur par
 * défaut ; aucune déduction de genre, d'émotion ou de niveau scolaire n'a lieu à l'affichage.
 */
export function getStudentPlaceholderAsset(avatarFallback: RosterAvatarFallback = 'neutral'): string {
  return studentPlaceholderAssets[avatarFallback] ?? studentPlaceholderNeutral;
}

export {studentPlaceholderA, studentPlaceholderB, studentPlaceholderNeutral};
