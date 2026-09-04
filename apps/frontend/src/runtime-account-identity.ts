export type AuthenticatedProfileId = 'masterflex' | 'profkrapu';

type AuthenticatedUserIdentity = {
  display_name: string;
  role: string;
};

/**
 * Résout l'habillage personnel depuis le compte authentifié uniquement.
 *
 * Une Room ou sa persona active ne doivent jamais pouvoir modifier l'identité affichée.
 * ProfKrapu reste l'habillage propre du compte godmode Vincent ; les autres comptes
 * conservent l'habillage MasterFlow par défaut. Cette fonction n'accorde aucun droit.
 */
export function resolveAuthenticatedProfileId(user: AuthenticatedUserIdentity): AuthenticatedProfileId {
  return user.role === 'godmode' && user.display_name.trim().toLocaleLowerCase('fr') === 'vincent'
    ? 'profkrapu'
    : 'masterflex';
}
