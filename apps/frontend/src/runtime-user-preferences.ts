export const runtimeUserPreferencesStorageKey = 'masterflow.runtime-user-preferences.v1';

export function runtimeUserPreferencesStorageKeyFor(scope?: string | null): string {
  const normalized = scope?.trim().toLocaleLowerCase('fr').replace(/[^a-z0-9_-]+/g, '-');
  return normalized ? `${runtimeUserPreferencesStorageKey}.${normalized}` : runtimeUserPreferencesStorageKey;
}

export type RuntimeMotionPreference = 'auto' | 'reduce' | 'full';
export type RuntimeTextScale = 'small' | 'standard' | 'large';
export type RuntimeTranscriptionLanguage = 'fr-FR' | 'en-US';

export type RuntimeUserPreferences = {
  accessibility: {
    motion: RuntimeMotionPreference;
    enhancedContrast: boolean;
    textScale: RuntimeTextScale;
  };
  voice: {
    transcriptionLanguage: RuntimeTranscriptionLanguage;
    autoplay: boolean;
  };
  notifications: {
    validations: boolean;
    jobs: boolean;
    planning: boolean;
  };
  privacy: {
    localHistory: boolean;
    diagnostics: boolean;
  };
  paletteValuesInverted: boolean;
};

export const defaultRuntimeUserPreferences: RuntimeUserPreferences = {
  accessibility: {
    motion: 'auto',
    enhancedContrast: false,
    textScale: 'standard',
  },
  voice: {
    transcriptionLanguage: 'fr-FR',
    autoplay: false,
  },
  notifications: {
    validations: true,
    jobs: true,
    planning: true,
  },
  privacy: {
    localHistory: true,
    diagnostics: false,
  },
  paletteValuesInverted: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readEnum<const T extends readonly string[]>(
  value: unknown,
  values: T,
  fallback: T[number],
): T[number] {
  return typeof value === 'string' && values.includes(value) ? value as T[number] : fallback;
}

/**
 * Normalise un instantané inconnu sans laisser une préférence invalide casser l'interface.
 */
export function normalizeRuntimeUserPreferences(value: unknown): RuntimeUserPreferences {
  const root = isRecord(value) ? value : {};
  const accessibility = isRecord(root['accessibility']) ? root['accessibility'] : {};
  const voice = isRecord(root['voice']) ? root['voice'] : {};
  const notifications = isRecord(root['notifications']) ? root['notifications'] : {};
  const privacy = isRecord(root['privacy']) ? root['privacy'] : {};

  return {
    accessibility: {
      motion: readEnum(
        accessibility['motion'],
        ['auto', 'reduce', 'full'] as const,
        defaultRuntimeUserPreferences.accessibility.motion,
      ),
      enhancedContrast: readBoolean(
        accessibility['enhancedContrast'],
        defaultRuntimeUserPreferences.accessibility.enhancedContrast,
      ),
      textScale: readEnum(
        accessibility['textScale'],
        ['small', 'standard', 'large'] as const,
        defaultRuntimeUserPreferences.accessibility.textScale,
      ),
    },
    voice: {
      transcriptionLanguage: readEnum(
        voice['transcriptionLanguage'],
        ['fr-FR', 'en-US'] as const,
        defaultRuntimeUserPreferences.voice.transcriptionLanguage,
      ),
      autoplay: readBoolean(voice['autoplay'], defaultRuntimeUserPreferences.voice.autoplay),
    },
    notifications: {
      validations: readBoolean(
        notifications['validations'],
        defaultRuntimeUserPreferences.notifications.validations,
      ),
      jobs: readBoolean(notifications['jobs'], defaultRuntimeUserPreferences.notifications.jobs),
      planning: readBoolean(
        notifications['planning'],
        defaultRuntimeUserPreferences.notifications.planning,
      ),
    },
    privacy: {
      localHistory: readBoolean(
        privacy['localHistory'],
        defaultRuntimeUserPreferences.privacy.localHistory,
      ),
      diagnostics: readBoolean(
        privacy['diagnostics'],
        defaultRuntimeUserPreferences.privacy.diagnostics,
      ),
    },
    paletteValuesInverted: readBoolean(
      root['paletteValuesInverted'],
      defaultRuntimeUserPreferences.paletteValuesInverted,
    ),
  };
}

export function readRuntimeUserPreferences(scope?: string | null): RuntimeUserPreferences {
  if (typeof window === 'undefined') return normalizeRuntimeUserPreferences(null);

  try {
    const raw = window.localStorage.getItem(runtimeUserPreferencesStorageKeyFor(scope));
    return raw === null
      ? normalizeRuntimeUserPreferences(null)
      : normalizeRuntimeUserPreferences(JSON.parse(raw));
  } catch {
    return normalizeRuntimeUserPreferences(null);
  }
}

/**
 * Enregistre un instantané normalisé. `false` indique que le navigateur a refusé le stockage.
 */
export function storeRuntimeUserPreferences(
  preferences: RuntimeUserPreferences,
  scope?: string | null,
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const normalized = normalizeRuntimeUserPreferences(preferences);
    window.localStorage.setItem(runtimeUserPreferencesStorageKeyFor(scope), JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

/**
 * Expose au document les préférences visuelles consommables sans coupler le stockage au CSS.
 */
export function applyRuntimeUserPreferences(
  preferences: RuntimeUserPreferences,
  root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement,
): void {
  if (root === null) return;

  const normalized = normalizeRuntimeUserPreferences(preferences);
  root.dataset.masterflowMotion = normalized.accessibility.motion;
  root.dataset.masterflowContrast = normalized.accessibility.enhancedContrast ? 'enhanced' : 'standard';
  root.dataset.masterflowTextScale = normalized.accessibility.textScale;
  root.dataset.masterflowPaletteValues = normalized.paletteValuesInverted ? 'inverted' : 'original';
  root.dataset.masterflowPlanningNotifications = normalized.notifications.planning ? 'enabled' : 'disabled';
  root.dataset.masterflowVoiceLanguage = normalized.voice.transcriptionLanguage;
}

export function runtimeMotionIsReduced(preferences: RuntimeUserPreferences): boolean {
  if (preferences.accessibility.motion === 'reduce') return true;
  if (preferences.accessibility.motion === 'full') return false;
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
