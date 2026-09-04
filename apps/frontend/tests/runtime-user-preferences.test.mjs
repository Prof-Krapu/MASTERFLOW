import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyRuntimeUserPreferences,
  defaultRuntimeUserPreferences,
  readRuntimeUserPreferences,
  runtimeMotionIsReduced,
  runtimeUserPreferencesStorageKey,
  runtimeUserPreferencesStorageKeyFor,
  storeRuntimeUserPreferences,
} from '../src/runtime-user-preferences.ts';

function fakeStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
  };
}

test('les préférences par défaut restent sûres et francophones', () => {
  globalThis.window = {localStorage: fakeStorage()};

  assert.deepEqual(readRuntimeUserPreferences(), defaultRuntimeUserPreferences);
  assert.equal(defaultRuntimeUserPreferences.voice.autoplay, false);
  assert.equal(defaultRuntimeUserPreferences.voice.transcriptionLanguage, 'fr-FR');
  assert.equal(defaultRuntimeUserPreferences.privacy.diagnostics, false);
});

test('la lecture conserve les valeurs valides et remplace seulement les valeurs invalides', () => {
  const localStorage = fakeStorage();
  globalThis.window = {localStorage};
  localStorage.setItem(runtimeUserPreferencesStorageKey, JSON.stringify({
    accessibility: {motion: 'reduce', enhancedContrast: true, textScale: 'enorme'},
    voice: {transcriptionLanguage: 'en-US', autoplay: true},
    notifications: {validations: false, jobs: 'non', planning: false},
    privacy: {localHistory: false, diagnostics: true},
    paletteValuesInverted: true,
  }));

  assert.deepEqual(readRuntimeUserPreferences(), {
    accessibility: {motion: 'reduce', enhancedContrast: true, textScale: 'standard'},
    voice: {transcriptionLanguage: 'en-US', autoplay: true},
    notifications: {validations: false, jobs: true, planning: false},
    privacy: {localHistory: false, diagnostics: true},
    paletteValuesInverted: true,
  });
});

test('un JSON corrompu retombe intégralement sur les préférences par défaut', () => {
  const localStorage = fakeStorage();
  globalThis.window = {localStorage};
  localStorage.setItem(runtimeUserPreferencesStorageKey, '{pas-json');

  assert.deepEqual(readRuntimeUserPreferences(), defaultRuntimeUserPreferences);
});

test('un stockage navigateur bloqué ne casse ni la lecture ni l’écriture', () => {
  globalThis.window = {
    localStorage: {
      getItem() {
        throw new Error('stockage bloqué');
      },
      setItem() {
        throw new Error('stockage bloqué');
      },
    },
  };

  assert.deepEqual(readRuntimeUserPreferences(), defaultRuntimeUserPreferences);
  assert.equal(storeRuntimeUserPreferences(defaultRuntimeUserPreferences), false);
});

test('l’écriture persiste uniquement un instantané normalisé', () => {
  const localStorage = fakeStorage();
  globalThis.window = {localStorage};

  assert.equal(storeRuntimeUserPreferences({
    ...defaultRuntimeUserPreferences,
    accessibility: {...defaultRuntimeUserPreferences.accessibility, motion: 'full'},
    paletteValuesInverted: true,
  }), true);

  assert.deepEqual(
    JSON.parse(localStorage.getItem(runtimeUserPreferencesStorageKey)),
    {
      ...defaultRuntimeUserPreferences,
      accessibility: {...defaultRuntimeUserPreferences.accessibility, motion: 'full'},
      paletteValuesInverted: true,
    },
  );
});

test('l’application DOM expose les choix visuels sous forme de data-attributes', () => {
  const root = {dataset: {}};

  applyRuntimeUserPreferences({
    ...defaultRuntimeUserPreferences,
    accessibility: {motion: 'reduce', enhancedContrast: true, textScale: 'large'},
    paletteValuesInverted: true,
  }, root);

  assert.deepEqual(root.dataset, {
    masterflowMotion: 'reduce',
    masterflowContrast: 'enhanced',
    masterflowTextScale: 'large',
    masterflowPaletteValues: 'inverted',
    masterflowPlanningNotifications: 'enabled',
    masterflowVoiceLanguage: 'fr-FR',
  });
});

test('les préférences peuvent être isolées par compte', () => {
  const localStorage = fakeStorage();
  globalThis.window = {localStorage};
  const malex = {...defaultRuntimeUserPreferences, paletteValuesInverted: true};
  storeRuntimeUserPreferences(malex, 'MALEX');

  assert.equal(runtimeUserPreferencesStorageKeyFor('MALEX'), `${runtimeUserPreferencesStorageKey}.malex`);
  assert.equal(readRuntimeUserPreferences('malex').paletteValuesInverted, true);
  assert.equal(readRuntimeUserPreferences('vincent').paletteValuesInverted, false);
});

test('le mouvement explicite prime sur la préférence système', () => {
  globalThis.window = {matchMedia: () => ({matches: true})};
  assert.equal(runtimeMotionIsReduced(defaultRuntimeUserPreferences), true);
  assert.equal(runtimeMotionIsReduced({
    ...defaultRuntimeUserPreferences,
    accessibility: {...defaultRuntimeUserPreferences.accessibility, motion: 'full'},
  }), false);
});
