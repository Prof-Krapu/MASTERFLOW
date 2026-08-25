import test from 'node:test';
import assert from 'node:assert/strict';

import {capacitesOutilsConnues} from '../server/model-catalog-service.ts';
import type {ProviderCatalog} from '../lib/model-catalog.ts';

/**
 * Régression du 2026-08-15 : un rafraîchissement effaçait `toolCalls`.
 *
 * La sonde du 13/08 avait rempli la capacité sur les 11 catalogues. Le 15/08, un
 * rafraîchissement a rebâti `models[]` depuis `GET /v1/models` — muet sur les outils chez
 * Albert — sans que la sonde n'aboutisse, et le champ a disparu sur 8 apps. Or un `toolCalls`
 * absent vaut `false` côté sous-app (`registerModelTools`), donc transport TEXTUEL, où
 * l'Assistant raconte qu'il appelle les outils et invente les résultats.
 *
 * `capacitesOutilsConnues` est le relevé de l'acquis que `refreshCatalog` reçoit désormais.
 */

const ALBERT = 'https://albert.api.etalab.gouv.fr';

function catalogue(baseUrl: string, models: {id: string; toolCalls?: boolean}[]): ProviderCatalog {
  return {baseUrl, fetchedAt: 1, models: models as ProviderCatalog['models'], degraded: false};
}

test('relève les capacités déjà mesurées', () => {
  const connues = capacitesOutilsConnues(
    [catalogue(ALBERT, [{id: 'deepseek-v4-flash', toolCalls: true}, {id: 'lightonocr-2-1b', toolCalls: false}])],
    ALBERT,
  );
  assert.equal(connues.get('deepseek-v4-flash'), true);
  assert.equal(connues.get('lightonocr-2-1b'), false, 'un false mesuré est un acquis, pas un trou');
});

test('ignore un modèle dont la capacité n’a jamais été mesurée', () => {
  const connues = capacitesOutilsConnues([catalogue(ALBERT, [{id: 'inconnu'}])], ALBERT);
  assert.equal(connues.has('inconnu'), false, 'l’indéfini doit rester indéfini, donc resondable');
});

test('ne transporte JAMAIS une capacité d’un fournisseur à un autre', () => {
  // Le même identifiant chez un autre fournisseur ne dit rien de ses capacités.
  const connues = capacitesOutilsConnues(
    [catalogue('https://api.mistral.ai', [{id: 'mistral-small-3-2-24b-instruct-2506', toolCalls: true}])],
    ALBERT,
  );
  assert.equal(connues.size, 0);
});

test('union sur tout un groupe : une seule app ayant gardé l’acquis suffit', () => {
  // Cas réel du 15/08 : pc/fr/nl… avaient perdu le champ, en/philo/hg l'avaient encore.
  const perdu = catalogue(ALBERT, [{id: 'deepseek-v4-flash'}]);
  const garde = catalogue(ALBERT, [{id: 'deepseek-v4-flash', toolCalls: true}]);
  assert.equal(capacitesOutilsConnues([perdu, garde], ALBERT).get('deepseek-v4-flash'), true);
  assert.equal(capacitesOutilsConnues([garde, perdu], ALBERT).get('deepseek-v4-flash'), true);
});

test('tolère un catalogue absent', () => {
  assert.equal(capacitesOutilsConnues([null, undefined], ALBERT).size, 0);
});
