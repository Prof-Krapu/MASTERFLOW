import test from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as sleep} from 'node:timers/promises';

import {DEFAULT_SWEEP_MS, resolveSweepMs, startCatalogSweep} from '../server/catalog-sweep.ts';

test('resolveSweepMs : défaut hebdomadaire, env respectée, valeurs absurdes rattrapées', () => {
  assert.equal(resolveSweepMs(undefined), DEFAULT_SWEEP_MS);
  assert.equal(DEFAULT_SWEEP_MS, 7 * 24 * 60 * 60_000, 'cadence retenue : 7 jours');

  // Une env valide fait foi (ici 2 h).
  assert.equal(resolveSweepMs('7200000'), 7_200_000);

  // Absurdes → défaut, jamais un intervalle nul qui martèlerait les API fournisseurs.
  for (const raw of ['', '0', '-1', 'chaque semaine', 'NaN']) {
    assert.equal(resolveSweepMs(raw), DEFAULT_SWEEP_MS, `env « ${raw} »`);
  }

  // Trop petite → relevée au plancher d'1 min.
  assert.equal(resolveSweepMs('1'), 60_000);
  assert.equal(resolveSweepMs('59999'), 60_000);
});

test('startCatalogSweep : rappelle le travail à chaque tour, et s’arrête sur stop()', async () => {
  let passages = 0;
  const balayage = startCatalogSweep(
    async () => {
      passages += 1;
      return {};
    },
    {intervalMs: 5},
  );
  assert.equal(balayage.intervalMs, 5);

  await sleep(60);
  balayage.stop();
  const apresArret = passages;
  assert.ok(apresArret >= 2, `au moins 2 passages en 60 ms, vu ${apresArret}`);

  await sleep(40);
  assert.equal(passages, apresArret, 'plus aucun passage après stop()');
});

test('startCatalogSweep : pas de sonde immédiate — le démarrage s’en charge déjà', async () => {
  let passages = 0;
  const balayage = startCatalogSweep(
    async () => {
      passages += 1;
      return {};
    },
    {intervalMs: 10_000},
  );
  await sleep(20);
  balayage.stop();
  assert.equal(passages, 0);
});

test('startCatalogSweep : dérive signalée avec la liste des apps réalignées', async () => {
  const signale: string[][] = [];
  const balayage = startCatalogSweep(async () => ({pc: [], fr: []}), {
    intervalMs: 5,
    onDrift: (apps) => signale.push(apps),
  });
  await sleep(40);
  balayage.stop();
  assert.ok(signale.length >= 1);
  assert.deepEqual(signale[0], ['pc', 'fr']);
});

test('startCatalogSweep : un passage en échec est signalé sans tuer le balayage', async () => {
  const erreurs: string[] = [];
  let passages = 0;
  const balayage = startCatalogSweep(
    async () => {
      passages += 1;
      throw new Error('fournisseur injoignable');
    },
    {intervalMs: 5, onError: (e) => erreurs.push(e.message)},
  );
  await sleep(50);
  balayage.stop();
  assert.ok(passages >= 2, 'le balayage survit à un échec');
  assert.equal(erreurs[0], 'fournisseur injoignable');
});

test('startCatalogSweep : un passage lent ne se superpose pas au suivant', async () => {
  let enVol = 0;
  let maxSimultanes = 0;
  const balayage = startCatalogSweep(
    async () => {
      enVol += 1;
      maxSimultanes = Math.max(maxSimultanes, enVol);
      await sleep(40); // plus long que l'intervalle : les tours suivants doivent être sautés
      enVol -= 1;
      return {};
    },
    {intervalMs: 5},
  );
  await sleep(120);
  balayage.stop();
  await sleep(50); // laisse le dernier passage se terminer
  assert.equal(maxSimultanes, 1, 'jamais deux sondes en vol en même temps');
});
