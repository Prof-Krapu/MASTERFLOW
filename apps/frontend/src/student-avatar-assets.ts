import studentPlaceholderA from './assets/student-placeholders/variant-a.png';
import studentPlaceholderB from './assets/student-placeholders/variant-b.png';

const studentPlaceholderAssets = [studentPlaceholderA, studentPlaceholderB] as const;

/**
 * Choisit un fallback visuel stable sans déduire de genre, d'émotion ou de niveau scolaire.
 * L'identité runtime reste le nom et l'identifiant du roster ; l'image est décorative.
 */
export function getStudentPlaceholderAsset(studentIdentityId: string): string {
  const index = [...studentIdentityId].reduce(
    (total, character) => total + character.charCodeAt(0),
    0,
  ) % studentPlaceholderAssets.length;
  return studentPlaceholderAssets[index] ?? studentPlaceholderAssets[0];
}

export {studentPlaceholderA, studentPlaceholderB};
