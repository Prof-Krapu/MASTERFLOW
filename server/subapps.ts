import {existsSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/**
 * Câblage des sous-apps : où elles sont, et comment la gateway les sert.
 *
 * Extrait de `routes/proxy.ts` le 2026-07-30, pour la même raison que
 * `lib/model-routing.ts` l'avait été de `ApiConfigPanel.tsx` : ce sont des fonctions
 * PURES, et tant qu'elles vivaient dans le routeur, les tester importait `session.ts`,
 * qui refuse de se charger sans `SESSION_SECRET`. Résultat : elles n'étaient pas
 * testées du tout, et la divergence `forks.tsv` ↔ `loadRoutes()` — celle que le
 * README-DEPLOY signale en toutes lettres — n'avait aucune garde.
 */

const ICI = dirname(fileURLToPath(import.meta.url));
/** …/API_manage (ce fichier est dans server/). */
const RACINE_MANAGE = resolve(ICI, '..');
/** Même source de vérité que l'installateur : un slug ajouté là l'est partout. */
const FORKS_TSV = process.env.FORKS_TSV ?? join(RACINE_MANAGE, 'deploy', 'forks.tsv');
/** Les forks sont des FRÈRES de API_manage (cf. deploy/lib.sh, même défaut). */
const PARENT = process.env.CORRECTORS_PARENT ?? resolve(RACINE_MANAGE, '..');

export interface SubappRoute {
  app: 'pc' | 'fr' | 'nl' | 'es' | 'svt' | 'maths' | 'ses' | 'tech' | 'en' | 'philo' | 'hg';
  target: string;
}

/** Source de vérité des cibles loopback du mode proxy. */
export function loadRoutes(): SubappRoute[] {
  return [
    {app: 'pc', target: process.env.PC_TARGET ?? 'http://127.0.0.1:3001'},
    {app: 'fr', target: process.env.FR_TARGET ?? 'http://127.0.0.1:3005'},
    {app: 'nl', target: process.env.NL_TARGET ?? 'http://127.0.0.1:3009'},
    {app: 'es', target: process.env.ES_TARGET ?? 'http://127.0.0.1:3013'},
    {app: 'svt', target: process.env.SVT_TARGET ?? 'http://127.0.0.1:3021'},
    {app: 'maths', target: process.env.MATHS_TARGET ?? 'http://127.0.0.1:3025'},
    {app: 'ses', target: process.env.SES_TARGET ?? 'http://127.0.0.1:3029'},
    {app: 'tech', target: process.env.TECH_TARGET ?? 'http://127.0.0.1:3033'},
    {app: 'en', target: process.env.EN_TARGET ?? 'http://127.0.0.1:3037'},
    {app: 'philo', target: process.env.PHILO_TARGET ?? 'http://127.0.0.1:3041'},
    {app: 'hg', target: process.env.HG_TARGET ?? 'http://127.0.0.1:3045'},
  ];
}

/**
 * Mode de service des sous-apps. Tout ce qui n'est pas exactement `static` reste le
 * proxy historique : basculer 11 correcteurs doit être demandé, jamais deviné.
 */
export function serveStatique(): boolean {
  return (process.env.CORRECTOR_SERVE_MODE ?? 'proxy').trim().toLowerCase() === 'static';
}

/**
 * slug → chemin du `dist/` du fork, lu depuis `deploy/forks.tsv`.
 *
 * Lire le TSV plutôt que redéclarer la table : c'est déjà la source de vérité de
 * `install.sh` et des unités systemd, et une 3e copie finirait par diverger — c'est
 * exactement ce qui était arrivé entre `seed-albert.ts` et le préréglage Albert.
 */
export function loadForkDists(): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(FORKS_TSV)) return out;
  for (const ligne of readFileSync(FORKS_TSV, 'utf8').split('\n')) {
    const l = ligne.trim();
    if (!l || l.startsWith('#')) continue;
    const [slug, dossier] = l.split('\t');
    if (!slug || !dossier) continue;
    out.set(slug.trim(), join(PARENT, dossier.trim(), 'dist'));
  }
  return out;
}
