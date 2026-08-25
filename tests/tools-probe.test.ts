/**
 * La sonde de capacité « appels d'outils » ne doit jamais AFFIRMER sans preuve.
 *
 * Contexte : Albert ne déclare pas `tool_call` et est absent de models.dev, ce qui classait
 * tous ses modèles « sans outils » et servait l'Assistant en transport textuel — où gpt-oss
 * rate la recherche web (mesuré le 2026-08-13). La sonde comble ce trou, mais l'inconnu doit
 * rester inconnu : une valeur inventée mettrait un modèle incapable en transport natif.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {chatEndpoint, sondageApplicable, sonderOutils, sonderOutilsModele} from '../server/tools-probe.ts';

const BASE = 'https://albert.api.etalab.gouv.fr';

function reponse(status: number, corps: unknown): Response {
  return new Response(typeof corps === 'string' ? corps : JSON.stringify(corps), {
    status,
    headers: {'content-type': 'application/json'},
  });
}

const AVEC_APPEL = {
  choices: [{finish_reason: 'tool_calls', message: {tool_calls: [{id: '1', function: {name: 'ping'}}]}}],
};
const SANS_APPEL = {choices: [{finish_reason: 'stop', message: {content: 'Il est midi.'}}]};

test('endpoint : idempotent sur un suffixe /vN déjà présent', () => {
  assert.equal(chatEndpoint('https://albert.api.etalab.gouv.fr'), 'https://albert.api.etalab.gouv.fr/v1/chat/completions');
  assert.equal(chatEndpoint('https://api.mistral.ai/v1'), 'https://api.mistral.ai/v1/chat/completions');
  assert.equal(chatEndpoint('https://x.test/'), 'https://x.test/v1/chat/completions');
});

test('un tool_calls émis vaut preuve de support', async () => {
  const vu: Record<string, unknown>[] = [];
  const res = await sonderOutilsModele(BASE, 'k', 'm', async (_u, init) => {
    vu.push(JSON.parse(String(init.body)));
    return reponse(200, AVEC_APPEL);
  });
  assert.equal(res, true);
  assert.equal(vu.length, 1, 'un seul essai suffit quand la preuve arrive');
  assert.equal(vu[0]?.tool_choice, 'required', "on force l'appel : en 'auto' un modèle capable peut légitimement s'abstenir");
});

test('400 explicite sur les DEUX modes = preuve de non-support', async () => {
  const modes: unknown[] = [];
  const res = await sonderOutilsModele(BASE, 'k', 'm', async (_u, init) => {
    modes.push(JSON.parse(String(init.body)).tool_choice);
    return reponse(400, {error: {message: 'tools is not supported for this model'}});
  });
  assert.equal(res, false);
  assert.deepEqual(modes, ['required', 'auto'], "un refus de 'required' doit être rejoué en 'auto' avant de conclure");
});

test("refus de 'required' seul, puis appel réussi en 'auto' = support", async () => {
  let n = 0;
  const res = await sonderOutilsModele(BASE, 'k', 'm', async () => {
    n += 1;
    return n === 1 ? reponse(400, {error: 'tool_choice required is not supported'}) : reponse(200, AVEC_APPEL);
  });
  assert.equal(res, true);
});

test('silence du modèle en auto : INCONNU, jamais false', async () => {
  let n = 0;
  const res = await sonderOutilsModele(BASE, 'k', 'm', async () => {
    n += 1;
    return n === 1 ? reponse(400, {error: 'tool_choice not supported'}) : reponse(200, SANS_APPEL);
  });
  assert.equal(res, undefined, "un modèle qui choisit de ne pas appeler n'est pas un modèle incapable");
});

test('400 qui ne parle pas d’outils : INCONNU', async () => {
  const res = await sonderOutilsModele(BASE, 'k', 'm', async () =>
    reponse(400, {error: {message: 'model not found'}}),
  );
  assert.equal(res, undefined, 'un 400 sur le nom du modèle ne dit rien des outils');
});

test('panne réseau ou 500 : INCONNU', async () => {
  assert.equal(await sonderOutilsModele(BASE, 'k', 'm', async () => { throw new Error('ECONNRESET'); }), undefined);
  assert.equal(await sonderOutilsModele(BASE, 'k', 'm', async () => reponse(503, {error: 'busy'})), undefined);
});

test('Copilot déclare lui-même ses capacités : jamais sondé', async () => {
  assert.equal(sondageApplicable('https://api.githubcopilot.com'), false);
  let appels = 0;
  const m = await sonderOutils('https://api.githubcopilot.com', 'k', ['gpt-4o'], async () => {
    appels += 1;
    return reponse(200, AVEC_APPEL);
  });
  assert.equal(appels, 0);
  assert.equal(m.size, 0);
});

test('aléa isolé : une reprise, et le verdict correct est retenu', async () => {
  let n = 0;
  const res = await sonderOutilsModele(BASE, 'k', 'm', async () => {
    n += 1;
    if (n === 1) throw new Error('ECONNRESET'); // panne transitoire
    return reponse(200, AVEC_APPEL);
  });
  assert.equal(res, true, "un aléa ne doit pas condamner le modèle au transport textuel jusqu'au prochain balayage");
  assert.equal(n, 2);
});

test('panne persistante : une seule reprise, puis on renonce', async () => {
  let n = 0;
  const res = await sonderOutilsModele(BASE, 'k', 'm', async () => {
    n += 1;
    throw new Error('ECONNRESET');
  });
  assert.equal(res, undefined);
  assert.equal(n, 2, 'exactement deux tentatives : pas de martèlement du fournisseur');
});

test('verdict net : jamais rejoué', async () => {
  let n = 0;
  await sonderOutilsModele(BASE, 'k', 'm', async () => { n += 1; return reponse(200, AVEC_APPEL); });
  assert.equal(n, 1, 'un support prouvé ne se rejoue pas');
  n = 0;
  await sonderOutilsModele(BASE, 'k', 'm', async () => { n += 1; return reponse(400, {error: 'tools unsupported'}); });
  assert.equal(n, 2, 'un refus prouvé coûte required + auto, et rien de plus');
});

test('plusieurs modèles : en série, un verdict par modèle', async () => {
  const ordre: string[] = [];
  const m = await sonderOutils(BASE, 'k', ['a', 'b'], async (_u, init) => {
    const corps = JSON.parse(String(init.body)) as {model: string};
    ordre.push(corps.model);
    return corps.model === 'a' ? reponse(200, AVEC_APPEL) : reponse(400, {error: 'tools unsupported'});
  });
  assert.equal(m.get('a'), true);
  assert.equal(m.get('b'), false);
  assert.deepEqual(ordre, ['a', 'b', 'b'], 'b est rejoué en auto avant de conclure');
});
