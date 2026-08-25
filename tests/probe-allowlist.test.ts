import test from 'node:test';
import assert from 'node:assert/strict';

import {isProbeHostAllowed} from '../server/probe-allowlist.ts';

test('isProbeHostAllowed : fournisseurs connus acceptés (insensible à la casse)', () => {
  assert.ok(isProbeHostAllowed('api.mistral.ai', ''));
  assert.ok(isProbeHostAllowed('albert.api.etalab.gouv.fr', ''));
  assert.ok(isProbeHostAllowed('API.GITHUBCOPILOT.COM', ''));
  // Kimi Code : autorisé par la liste EN DUR, pas par PROBE_ALLOWED_HOSTS — sinon
  // « Tester la clé » renvoie 400 host_not_allowed sur une install neuve.
  assert.ok(isProbeHostAllowed('api.kimi.com', ''));
  // OpenCode Go : c'est le fournisseur dont le catalogue tourne, sa sonde doit passer.
  assert.ok(isProbeHostAllowed('opencode.ai', ''));
  // Registre de capacités : sans lui, plus de vision/reasoning/coût, seulement l'heuristique.
  assert.ok(isProbeHostAllowed('models.dev', ''));
});

test('isProbeHostAllowed : sous-domaines des hôtes autorisés acceptés', () => {
  assert.ok(isProbeHostAllowed('eu.api.mistral.ai', ''));
  assert.ok(!isProbeHostAllowed('notapi.mistral.ai.evil.com', ''), 'suffixe forgé refusé');
});

test('isProbeHostAllowed : cibles SSRF classiques refusées', () => {
  assert.ok(!isProbeHostAllowed('localhost', ''));
  assert.ok(!isProbeHostAllowed('127.0.0.1', ''));
  assert.ok(!isProbeHostAllowed('169.254.169.254', ''), 'métadonnées cloud');
  assert.ok(!isProbeHostAllowed('192.168.1.1', ''));
  assert.ok(!isProbeHostAllowed('example.com', ''));
  assert.ok(!isProbeHostAllowed('api.kimi.com.evil.org', ''), 'suffixe forgé sur kimi');
});

test('isProbeHostAllowed : extension via PROBE_ALLOWED_HOSTS (csv, espaces tolérés)', () => {
  assert.ok(isProbeHostAllowed('mon-llm.example.org', 'mon-llm.example.org'));
  assert.ok(isProbeHostAllowed('api.perso.fr', ' autre.host , api.perso.fr '));
  assert.ok(isProbeHostAllowed('sub.api.perso.fr', 'api.perso.fr'), 'sous-domaine de l’extension');
  assert.ok(!isProbeHostAllowed('api.perso.fr', ''), 'sans extension → refusé');
});
