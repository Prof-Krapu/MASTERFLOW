import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/runtime-settings-panel.tsx', import.meta.url), 'utf8');
const shell = await readFile(new URL('../src/current-ui-demo.tsx', import.meta.url), 'utf8');
const preferencesSource = await readFile(new URL('../src/runtime-user-preferences.ts', import.meta.url), 'utf8');

test('les six sections de paramètres sont de vraies vues', () => {
  for (const id of ['account', 'interface', 'accessibility', 'voice', 'notifications', 'privacy']) {
    assert.match(source, new RegExp(`id: '${id}'`));
    assert.match(source, new RegExp(`activeView === '${id}'`));
  }
});

test('les préférences ont un effet runtime traçable', () => {
  assert.match(source, /updateAccessibility/);
  assert.match(source, /updateVoice/);
  assert.match(source, /updateNotifications/);
  assert.match(source, /updatePrivacy/);
  assert.match(shell, /notifications\.jobs/);
  assert.match(shell, /notifications\.validations/);
  assert.match(preferencesSource, /notifications\.planning/);
  assert.match(shell, /privacy\.localHistory/);
});

test('les fonctions indisponibles restent explicitement désactivées', () => {
  assert.match(source, /disabled/);
  assert.match(source, /Aucun provider vocal n’est activé/);
  assert.match(source, /Aucun envoi de diagnostic externe n’est raccordé/);
});
