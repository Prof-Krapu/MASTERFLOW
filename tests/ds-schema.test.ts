import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';

import Database from 'better-sqlite3';

import {
  formatNote,
  getAcquis,
  getConseils,
  getDifficultes,
  getExercices,
  getResults,
  getSousQuestions,
  isCorrectionIncomplete,
  validatePayload,
} from '../lib/ds-schema.ts';

/**
 * Test de contrat : valide que tous les `corrector_ds_data_*` réellement
 * stockés dans la DB passent les accesseurs défensifs de `lib/ds-schema.ts`
 * sans throw, et que les champs critiques sont présents.
 *
 * ⚠️ Ce test ne remplace pas un test unitaire du schéma sous-app : il agit
 * comme un **canari**. Si un renommage côté sous-app casse l'affichage admin,
 * ce test échoue avant même qu'on ouvre le panneau UsersPanel.
 *
 * Skip automatique si la DB locale n'existe pas (ex. CI, fork sans data).
 */

const DB_PATH = resolve(process.cwd(), 'data', 'api-manage.db');
const dbExists = existsSync(DB_PATH);

interface PayloadRow {
  user_id: string;
  app: string;
  key: string;
  value_json: string;
}

function loadAllDsPayloads(): PayloadRow[] {
  if (!dbExists) return [];
  const db = new Database(DB_PATH, {readonly: true, fileMustExist: true});
  try {
    return db
      .prepare(
        `SELECT user_id, app, key, value_json
         FROM user_storage
         WHERE key LIKE 'corrector_ds_data_%'
         ORDER BY app, user_id, key`,
      )
      .all() as PayloadRow[];
  } finally {
    db.close();
  }
}

const payloads = loadAllDsPayloads();

test('ds-schema : contrats sur DS réels en DB', {skip: !dbExists && 'DB locale absente — skip'}, () => {
  assert.ok(payloads.length > 0, 'aucun DS en DB — rien à valider');
  for (const row of payloads) {
    const label = `[${row.app}] ${row.key} (user=${row.user_id.slice(0, 8)}…)`;
    let parsed: unknown;
    try {
      parsed = JSON.parse(row.value_json);
    } catch (e) {
      assert.fail(`${label} — JSON invalide en DB : ${(e as Error).message}`);
    }

    // validatePayload ne doit pas throw et doit renvoyer un array.
    const missing = validatePayload(parsed);
    // On n'échoue PAS sur un champ manquant (l'accesseur tolère), mais on
    // logge un warning pour capter le drift. La CI reste verte, le dev voit
    // le signal dans la sortie.
    if (missing.length > 0) {
      console.warn(`[ds-schema] ${label} — champs manquants : ${missing.join(', ')}`);
    }

    // Tous les accesseurs doivent passer sans throw sur ce payload réel.
    assert.doesNotThrow(() => getExercices(parsed as never), `${label} — getExercices`);
    assert.doesNotThrow(() => getResults(parsed as never), `${label} — getResults`);
    assert.doesNotThrow(() => {
      for (const ex of getExercices(parsed as never)) getSousQuestions(ex);
    }, `${label} — getSousQuestions`);
    assert.doesNotThrow(() => {
      for (const s of getResults(parsed as never)) {
        getAcquis(s);
        getDifficultes(s);
        getConseils(s);
        isCorrectionIncomplete(s);
      }
    }, `${label} — accesseurs student`);
  }
});

test('ds-schema : validatePayload sur cas pathologiques', () => {
  assert.deepEqual(validatePayload(null), ['__root__']);
  assert.deepEqual(validatePayload(undefined), ['__root__']);
  assert.deepEqual(validatePayload('not an object'), ['__root__']);
  assert.deepEqual(validatePayload(42), ['__root__']);
  // Objet vide = tous les champs critiques manquants.
  const m = validatePayload({});
  assert.ok(m.includes('titre'), 'titre devrait être missing');
  assert.ok(m.includes('bareme'), 'bareme devrait être missing');
  assert.ok(m.includes('results/students'), 'results/students devrait être missing');
});

test('ds-schema : formatNote tolérant', () => {
  assert.equal(formatNote(15, 20), '15.00 / 20');
  assert.equal(formatNote(undefined, 20), '—');
  assert.equal(formatNote(15, undefined), '—');
  assert.equal(formatNote('pas un nombre', 20), '—');
  assert.equal(formatNote(15, 0), '—');
});

test('ds-schema : isCorrectionIncomplete détecte les 429', () => {
  assert.equal(
    isCorrectionIncomplete({grade: 0, appreciation: 'Erreur lors de la correction : Erreur API 429'}),
    true,
  );
  assert.equal(isCorrectionIncomplete({grade: 12, exercises: [{note: 12}]}), false);
  assert.equal(isCorrectionIncomplete(null), true);
});
