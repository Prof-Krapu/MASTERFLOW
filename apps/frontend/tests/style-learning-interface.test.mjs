import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const api = await readFile(new URL('../src/api.ts', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const settings = await readFile(new URL('../src/runtime-settings-panel.tsx', import.meta.url), 'utf8');
const learning = await readFile(new URL('../src/runtime-style-learning-settings.tsx', import.meta.url), 'utf8');
const chat = await readFile(new URL('../src/app-shell.tsx', import.meta.url), 'utf8');

test('l’API frontend couvre lecture, mise à jour et reset du contrat backend', () => {
  assert.match(api, /getStyleLearningSnapshot/);
  assert.match(api, /'\/style-mirror\/learning\/me'/);
  assert.match(api, /method: 'PATCH'/);
  assert.match(api, /'\/style-mirror\/learning\/me\/reset'/);
  assert.match(api, /method: 'POST'/);
});

test('Confidentialité expose notice, état, marqueurs, pause, collectif, intensité et reset confirmé', () => {
  assert.match(settings, /activeView === 'privacy'/);
  assert.match(settings, /RuntimeStyleLearningSettings/);
  assert.match(learning, /Les messages bruts ne sont pas conservés/);
  assert.match(learning, /Apprentissage actif/);
  assert.match(learning, /Contribution au style collectif/);
  assert.match(learning, /Intensité maximale/);
  assert.match(learning, /Aperçu des marqueurs appris/);
  assert.match(learning, /Confirmer la réinitialisation des marqueurs/);
});

test('les commandes restent reliées à l’utilisateur authentifié et gèrent les erreurs', () => {
  assert.match(app, /updateStyleLearningPreferences\(input, auth\.token\)/);
  assert.match(app, /resetStyleLearning\(auth\.token\)/);
  assert.match(app, /setStyleLearningStatus\('error'\)/);
  assert.match(learning, /role="alert"/);
  assert.match(learning, /aria-live="polite"/);
});

test('expressive_voice est conservé au début du tour et affiché dans le chat', () => {
  assert.match(app, /expressiveVoice: message\.expressive_voice/);
  assert.match(chat, /expressiveVoiceDisclosureText\(turn\.expressiveVoice\)/);
  assert.match(chat, /className="expressive-voice-disclosure"/);
});
