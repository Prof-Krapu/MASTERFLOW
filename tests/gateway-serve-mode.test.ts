import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import test from 'node:test';

import {loadForkDists, loadRoutes, serveStatique} from '../server/subapps.ts';

/**
 * Gardes du mode de service des sous-apps (ajouté le 2026-07-30).
 *
 * `CORRECTOR_SERVE_MODE=static` fait servir les `dist/` des forks par la gateway
 * elle-même, au lieu de les reverse-proxyer vers 11 process Node. Mesuré : ~1,2 Go de
 * RSS au repos en mode proxy contre ~78 Mo en statique — c'est ce qui rend la suite
 * installable sur une machine à 4 Go.
 */

function avecMode<T>(valeur: string | undefined, fn: () => T): T {
  const avant = process.env.CORRECTOR_SERVE_MODE;
  if (valeur === undefined) delete process.env.CORRECTOR_SERVE_MODE;
  else process.env.CORRECTOR_SERVE_MODE = valeur;
  try {
    return fn();
  } finally {
    if (avant === undefined) delete process.env.CORRECTOR_SERVE_MODE;
    else process.env.CORRECTOR_SERVE_MODE = avant;
  }
}

test('le mode proxy reste le défaut : une variable absente ou farfelue ne bascule rien', () => {
  // Le mode statique change la façon dont 11 correcteurs sont servis. Il doit être
  // demandé explicitement, jamais déduit d'une valeur qu'on n'a pas comprise.
  assert.equal(avecMode(undefined, serveStatique), false);
  assert.equal(avecMode('', serveStatique), false);
  assert.equal(avecMode('proxy', serveStatique), false);
  assert.equal(avecMode('statique', serveStatique), false, 'le français ne doit pas basculer');
  assert.equal(avecMode('1', serveStatique), false);
});

test('« static » bascule, quelle que soit la casse ou les espaces', () => {
  // Une valeur posée à la main dans une unité systemd traîne souvent un espace.
  assert.equal(avecMode('static', serveStatique), true);
  assert.equal(avecMode('STATIC', serveStatique), true);
  assert.equal(avecMode(' static ', serveStatique), true);
});

test('forks.tsv et loadRoutes() décrivent exactement les mêmes correcteurs', () => {
  // LA garde qui manquait. `forks.tsv` pilote l'installateur (clones, builds, units) et
  // `loadRoutes()` pilote le routage HTTP. Un slug ajouté d'un seul côté donne, en mode
  // proxy, une route vers un port que rien n'écoute ; en mode statique, un correcteur
  // qui répond 503 sans qu'aucun test ne le voie.
  const desRoutes = loadRoutes().map((r) => r.app).sort();
  const duTsv = [...loadForkDists().keys()].sort();
  assert.deepEqual(duTsv, desRoutes, 'deploy/forks.tsv a divergé de loadRoutes()');
  assert.equal(desRoutes.length, 11);
});

test('chaque slug pointe sur le dist/ d’un dossier frère de API_manage', () => {
  for (const [slug, dist] of loadForkDists()) {
    assert.ok(dist.endsWith('/dist'), `${slug} : ${dist} ne finit pas par /dist`);
    // Le chemin doit sortir de API_manage : les forks sont ses FRÈRES, pas ses enfants.
    // Un chemin qui resterait sous API_manage signalerait un CORRECTORS_PARENT mal calculé.
    assert.ok(!dist.includes('/API_manage/'), `${slug} : ${dist} est sous API_manage`);
  }
});

test('le TSV reste lisible même commenté ou avec des lignes vides', () => {
  // `read_forks` côté shell saute les commentaires ; la lecture TS doit faire pareil,
  // sinon un « # » se retrouverait slug et créerait une route fantôme.
  const cles = [...loadForkDists().keys()];
  for (const k of cles) {
    assert.ok(!k.startsWith('#'), `slug commenté retenu : ${k}`);
    assert.ok(k.trim() === k && k.length > 0, `slug mal découpé : « ${k} »`);
  }
});

test('les dist/ attendus par le mode statique existent après un build', {skip: !existsSync('../API_corrector/dist')}, () => {
  // Test d'environnement, sauté sur une machine où rien n'est encore construit : sur une
  // machine installée, un dist manquant veut dire que le correcteur répondra 503.
  for (const [slug, dist] of loadForkDists()) {
    assert.ok(existsSync(dist), `${slug} : dist absent (${dist}) — deploy/install.sh --only ${slug}`);
  }
});
