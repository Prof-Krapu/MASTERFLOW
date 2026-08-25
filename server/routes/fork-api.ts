import express from 'express';
import {registerLatexRoutes} from '../fork-api/latex-routes.ts';
import {registerProxyRoutes} from '../fork-api/proxy-routes.ts';
import {registerSearchRoutes} from '../fork-api/search-routes.ts';

/**
 * Routes serveur des correcteurs, servies par la GATEWAY en mode économe.
 *
 * ─── Pourquoi ──────────────────────────────────────────────────────────────────
 *
 * En `CORRECTOR_SERVE_MODE=static`, les 11 process des forks disparaissent et la
 * gateway sert leurs `dist/`. Mais un fork n'est pas qu'un SPA : son Express
 * expose aussi `/api/proxy` (relais LLM), `/api/latex/*` (PDF, DOCX, éditeur
 * Word) et `/api/search` (SearXNG). Sans eux, `/app/<slug>/api/…` tombait dans
 * le repli SPA — MESURÉ : `/api/latex/health` renvoyait `200 text/html` au lieu
 * de JSON, et `/api/proxy` un 404. Le mode économe ne servait donc qu'une
 * interface morte : ni aperçu PDF, ni recherche web, ni même correction, parce
 * que `rewriteBrowserProxyRequest` (lib/tauri.ts des forks) fait passer TOUS les
 * appels LLM du navigateur par `/app/<slug>/api/proxy`.
 *
 * On monte donc ces routes ici, UNE SEULE FOIS, et le même routeur est réutilisé
 * pour les 11 préfixes. Les verrous de `latex-routes.ts` (une compilation à la
 * fois, file d'attente de 3) sont au niveau module : les partager donne une file
 * unique pour toute la suite, ce qui est exactement le comportement voulu quand
 * il n'y a qu'un process — xelatex est gourmand, et 11 files indépendantes
 * feraient s'écrouler une machine à 4 Go.
 *
 * ─── Contraintes de montage ────────────────────────────────────────────────────
 *
 * - AVANT `servirDist` : sinon le repli SPA avale `/api/*` (c'était le bug).
 * - AVANT `express.json()` : ces handlers lisent le flux brut eux-mêmes. C'est
 *   déjà le cas — le routeur `/app` est monté avant `express.json()` dans
 *   `server/index.ts`, précisément pour préserver le body des POST proxifiés.
 * - APRÈS la gate `requireAppAccessOrRedirect` : mêmes droits qu'en mode proxy,
 *   un correcteur non assigné ne doit pas atteindre le relais LLM.
 *
 * ─── Provenance du code ────────────────────────────────────────────────────────
 *
 * `server/fork-api/*.ts` sont des COPIES conformes des fichiers de même nom à la
 * racine des forks (vérifié : byte-identiques sur les 11). Ne pas les modifier
 * ici — éditer côté fork puis recopier, comme pour les autres fichiers partagés
 * de la suite. `tests/fork-api-parite.test.ts` échoue si une copie dérive.
 */
export function createForkApiRouter(): express.Router {
  const router = express.Router();
  registerProxyRoutes(router);
  registerLatexRoutes(router);
  registerSearchRoutes(router);
  return router;
}
