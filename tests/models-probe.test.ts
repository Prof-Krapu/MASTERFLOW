import test from 'node:test';
import assert from 'node:assert/strict';

// `modelsProbe` vit dans un module feuille (sans Express/session/DB) depuis qu'il est
// partagé avec le rafraîchissement de catalogue : l'import statique suffit, plus besoin
// de poser SESSION_SECRET avant un import dynamique.
import {modelsProbe} from '../server/models-probe.ts';

test('modelsProbe : Kimi Code — le segment /coding est conservé', () => {
  // https://api.kimi.com/v1/models renvoie 404 (nginx) : seul .../coding/v1/models
  // existe. C'est le piège n°1 d'une config Kimi, d'où ce test.
  const {url, headers} = modelsProbe('https://api.kimi.com/coding', 'sk-kimi-test');
  assert.equal(url, 'https://api.kimi.com/coding/v1/models');
  assert.equal(headers.Authorization, 'Bearer sk-kimi-test');
  assert.equal(headers['User-Agent'], undefined, 'en-têtes Copilot non appliqués');
});

test('modelsProbe : suffixe /vN déjà présent → pas de doublon', () => {
  assert.equal(modelsProbe('https://api.mistral.ai/v1', 'k').url, 'https://api.mistral.ai/v1/models');
  assert.equal(modelsProbe('https://api.mistral.ai', 'k').url, 'https://api.mistral.ai/v1/models');
});

test('modelsProbe : GitHub Copilot — pas de /v1 et en-têtes obligatoires', () => {
  const {url, headers} = modelsProbe('https://api.githubcopilot.com', 'gho_x');
  assert.equal(url, 'https://api.githubcopilot.com/models');
  assert.equal(headers['User-Agent'], 'api-corrector/1.0.0');
  assert.equal(headers['Openai-Intent'], 'conversation-edits');
});

test('modelsProbe : OpenCode Go — le segment /zen/go est conservé', () => {
  // Sondé le 2026-07-26 : cette URL répond 200 avec 23 modèles. Le code des sous-apps
  // affirmait pourtant qu'OpenCode Go n'a pas d'endpoint /models, d'où une liste figée
  // à la main qui a pourri. Ce test est la garde contre un retour en arrière.
  const {url, headers} = modelsProbe('https://opencode.ai/zen/go', 'sk-oc-test');
  assert.equal(url, 'https://opencode.ai/zen/go/v1/models');
  assert.equal(headers.Authorization, 'Bearer sk-oc-test');
});

test('modelsProbe : slash final ignoré', () => {
  assert.equal(modelsProbe('https://api.kimi.com/coding/', 'k').url, 'https://api.kimi.com/coding/v1/models');
});
