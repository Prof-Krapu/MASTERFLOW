import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

/**
 * `server/fork-api/*.ts` sont des copies conformes des fichiers de même nom à la
 * racine des correcteurs. La gateway les monte en mode économe (un seul process
 * sert les 11 fronts ET leurs routes serveur) : si une copie dérive de l'original,
 * le correcteur et la gateway ne se comportent plus pareil sur la même URL, et le
 * symptôme serait déroutant — l'aperçu PDF marcherait en mode complet et pas en
 * mode économe, ou l'inverse.
 *
 * Le test compare octet à octet. Il ne s'exécute que si les forks sont clonés à
 * côté (disposition de `deploy/bootstrap.sh` et du poste de dev) : sur une
 * machine où seule la gateway est déployée, il n'y a rien à comparer et le test
 * est ignoré plutôt que rouge à tort.
 */

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = resolve(ICI, '..');
const COPIES = join(RACINE, 'server', 'fork-api');
const PARENT = process.env.CORRECTORS_PARENT ?? resolve(RACINE, '..');

/** Correcteurs présents à côté, lus depuis forks.tsv (source unique du déploiement). */
function forksPresents(): {slug: string; dossier: string}[] {
  const tsv = join(RACINE, 'deploy', 'forks.tsv');
  if (!existsSync(tsv)) return [];
  const out: {slug: string; dossier: string}[] = [];
  for (const ligne of readFileSync(tsv, 'utf8').split('\n')) {
    const l = ligne.trim();
    if (!l || l.startsWith('#')) continue;
    const [slug, dossier] = l.split('\t');
    if (!slug || !dossier) continue;
    if (existsSync(join(PARENT, dossier.trim()))) {
      out.push({slug: slug.trim(), dossier: dossier.trim()});
    }
  }
  return out;
}

const FICHIERS = readdirSync(COPIES).filter((f) => f.endsWith('.ts')).sort();

test('server/fork-api : la copie n’est pas vide (garde-fou du garde-fou)', () => {
  assert.ok(FICHIERS.length > 0, 'aucun fichier dans server/fork-api — le montage économe serait mort');
  for (const attendu of ['latex-routes.ts', 'proxy-routes.ts', 'search-routes.ts']) {
    assert.ok(FICHIERS.includes(attendu), `${attendu} manquant dans server/fork-api`);
  }
});

test('server/fork-api : chaque copie est byte-identique à celle des correcteurs', (t) => {
  const forks = forksPresents();
  if (forks.length === 0) {
    t.skip('aucun correcteur cloné à côté — rien à comparer');
    return;
  }

  const divergences: string[] = [];
  for (const fichier of FICHIERS) {
    const copie = readFileSync(join(COPIES, fichier));
    for (const {slug, dossier} of forks) {
      const source = join(PARENT, dossier, fichier);
      // Un fork peut légitimement ne pas avoir le fichier (jumeaux Albert sans
      // assistant) : on ne compare que ce qui existe des deux côtés.
      if (!existsSync(source)) continue;
      if (!readFileSync(source).equals(copie)) {
        divergences.push(`${fichier} ≠ ${slug} (${dossier})`);
      }
    }
  }

  assert.deepEqual(
    divergences,
    [],
    'Copie dérivée. Éditer le fichier DANS le correcteur, puis recopier :\n' +
      '  cp ../API_corrector/<fichier> server/fork-api/<fichier>\n' +
      'Divergences : ' + divergences.join(', '),
  );
});
