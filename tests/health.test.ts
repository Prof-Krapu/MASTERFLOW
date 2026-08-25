import test from 'node:test';
import assert from 'node:assert/strict';

import {dedupeProviderConfigs, providerLabel} from '../server/health-core.ts';

test('dedupeProviderConfigs : regroupe par (baseUrl, clé), ignore les configs vides', () => {
  const groups = dedupeProviderConfigs([
    {app: 'pc', baseUrl: 'https://api.mistral.ai', apiKey: 'k1'},
    {app: 'fr', baseUrl: 'https://api.mistral.ai', apiKey: 'k1'},
    {app: 'maths', baseUrl: 'https://albert.api.etalab.gouv.fr', apiKey: 'k2'},
    {app: 'nl', baseUrl: '', apiKey: 'k1'}, // baseUrl vide → ignorée
    {app: 'es', baseUrl: 'https://api.mistral.ai', apiKey: ''}, // clé vide → ignorée
  ]);
  assert.equal(groups.length, 2);
  const mistral = groups.find((g) => g.baseUrl.includes('mistral'));
  assert.deepEqual(mistral?.apps, ['pc', 'fr']);
  const albert = groups.find((g) => g.baseUrl.includes('albert'));
  assert.deepEqual(albert?.apps, ['maths']);
});

test('dedupeProviderConfigs : même baseUrl mais clés différentes = deux sondes', () => {
  const groups = dedupeProviderConfigs([
    {app: 'pc', baseUrl: 'https://api.mistral.ai', apiKey: 'k1'},
    {app: 'fr', baseUrl: 'https://api.mistral.ai', apiKey: 'k2'},
  ]);
  assert.equal(groups.length, 2);
});

test('providerLabel : fournisseurs connus nommés, inconnus → hostname', () => {
  assert.equal(providerLabel('https://api.mistral.ai'), 'Mistral');
  assert.equal(providerLabel('https://albert.api.etalab.gouv.fr'), 'Albert (Etalab)');
  assert.equal(providerLabel('https://api.githubcopilot.com'), 'GitHub Copilot');
  assert.equal(providerLabel('https://api.kimi.com/coding'), 'Kimi (Moonshot)');
  assert.equal(providerLabel('https://llm.example.org/v1'), 'llm.example.org');
  assert.equal(providerLabel('pas-une-url'), 'pas-une-url');
});
