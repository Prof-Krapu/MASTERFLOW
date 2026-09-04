export const runtimeAuthStorageKey = 'masterflow.runtime-auth-token';

export type RuntimeAuthPersistence = 'session' | 'persistent';

function readStorage(storage: Storage): string | null {
  try {
    return storage.getItem(runtimeAuthStorageKey);
  } catch {
    return null;
  }
}

function clearStorage(storage: Storage): void {
  try {
    storage.removeItem(runtimeAuthStorageKey);
  } catch {
    // Une politique navigateur peut rendre le stockage indisponible.
  }
}

export function storeRuntimeAuthToken(
  token: string,
  persistence: RuntimeAuthPersistence = 'session',
): void {
  if (typeof window === 'undefined') return;

  clearStoredRuntimeAuthToken();
  const storage = persistence === 'persistent'
    ? window.localStorage
    : window.sessionStorage;

  try {
    storage.setItem(runtimeAuthStorageKey, token);
  } catch {
    // L'authentification reste active en mémoire même si le stockage est bloqué.
  }
}

export function readRuntimeAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return readStorage(window.sessionStorage) ?? readStorage(window.localStorage);
}

export function readRuntimeAuthPersistence(): RuntimeAuthPersistence | null {
  if (typeof window === 'undefined') return null;
  if (readStorage(window.sessionStorage)) return 'session';
  if (readStorage(window.localStorage)) return 'persistent';
  return null;
}

export function clearStoredRuntimeAuthToken(): void {
  if (typeof window === 'undefined') return;
  clearStorage(window.sessionStorage);
  clearStorage(window.localStorage);
}
