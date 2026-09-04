export type IntroUserSnapshot = {
  username: string;
  display_name: string;
};

export const introUserStorageKey = 'masterflow.intro-user';
export const introUserChangeEvent = 'masterflow:intro-user-change';
export const defaultIntroPunchline = 'À toi de jouer.';

const introPunchlinesByUsername: Record<string, string> = {
  malex: 'Le chaos est sous contrôle.',
  vincent: 'Les idées passent à l’action.',
};

export function resolveIntroPunchline(user: IntroUserSnapshot | null): string {
  const username = user?.username.trim().toLocaleLowerCase('fr-FR');
  return username ? introPunchlinesByUsername[username] ?? defaultIntroPunchline : defaultIntroPunchline;
}

export function readIntroUserSnapshot(): IntroUserSnapshot | null {
  try {
    const raw = window.sessionStorage.getItem(introUserStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IntroUserSnapshot>;
    return typeof parsed.username === 'string' && typeof parsed.display_name === 'string'
      ? {username: parsed.username, display_name: parsed.display_name}
      : null;
  } catch {
    return null;
  }
}

export function writeIntroUserSnapshot(user: IntroUserSnapshot): void {
  try {
    const snapshot = {username: user.username, display_name: user.display_name};
    window.sessionStorage.setItem(introUserStorageKey, JSON.stringify(snapshot));
    window.dispatchEvent(new CustomEvent<IntroUserSnapshot>(introUserChangeEvent, {detail: snapshot}));
  } catch {
    // Le splash reste décoratif : une indisponibilité du storage ne bloque jamais l'application.
  }
}

export function clearIntroUserSnapshot(): void {
  try {
    window.sessionStorage.removeItem(introUserStorageKey);
  } catch {
    // Même règle : aucune erreur de personnalisation ne doit affecter l'authentification.
  }
}
