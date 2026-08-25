import {existsSync} from 'node:fs';
import {extname, join, resolve} from 'node:path';

import type {NextFunction, Request, Response} from 'express';
import express, {Router} from 'express';
import {createProxyMiddleware} from 'http-proxy-middleware';

import {canAccessApp, getUserAccess} from '../app-access.ts';
import {currentUser} from '../session.ts';
import {loadForkDists, loadRoutes, serveStatique} from '../subapps.ts';
import {createForkApiRouter} from './fork-api.ts';

export {loadForkDists, loadRoutes, serveStatique, type SubappRoute} from '../subapps.ts';

/**
 * Reverse proxy vers les 4 sous-apps tournant sur loopback :
 *   /app/pc/*  → http://127.0.0.1:3001
 *   /app/fr/*  → http://127.0.0.1:3005
 *   /app/nl/*  → http://127.0.0.1:3009
 *   /app/es/*  → http://127.0.0.1:3013
 *   /app/svt/* → http://127.0.0.1:3021
 *   /app/maths/* → http://127.0.0.1:3025
 *   /app/ses/* → http://127.0.0.1:3029
 *   /app/tech/* → http://127.0.0.1:3033
 *   /app/en/* → http://127.0.0.1:3037
 *   /app/philo/* → http://127.0.0.1:3041
 *   /app/hg/*    → http://127.0.0.1:3045
 *
 * - Gate cookie de session : non loggé → redirect 302 /login?next=… (PAS 401 JSON,
 *   c'est de la navigation browser). Compte inactif → /login ; compte rattaché à un
 *   autre correcteur (users.assigned_app) → redirect 302 / (landing).
 * - Header X-Subapp injecté (utile au cas où la sous-app voudrait débrancher de
 *   l'inférence URL-based de detectManagedApp).
 * - Aucun rewrite du body — la sous-app sert son SPA déjà buildé avec
 *   VITE_BASE_PATH=/app/{pc,fr,nl,es}/, donc les assets sont rewrités côté Vite.
 *
 * ─── DEUX MODES ────────────────────────────────────────────────────────────────
 *
 * `CORRECTOR_SERVE_MODE=proxy` (défaut) : le câblage ci-dessus, 12 process Node.
 *
 * `CORRECTOR_SERVE_MODE=static` : la gateway sert elle-même le `dist/` de chaque
 * fork, et les 11 process disparaissent. Mesuré sur le poste de dev : 1 214 Mo de
 * RSS au repos en mode proxy (~100 Mo par fork, dominés par le `tsx`/esbuild
 * résident, pas par l'applicatif — le serveur d'un fork fait 44 lignes et ne sert
 * que des fichiers) contre 78 Mo au démarrage en mode statique. C'est ce qui rend la suite
 * installable sur une machine à 4 Go.
 *
 * Ce mode est transparent pour les sous-apps : `detectManagedApp()` déduit le slug
 * de `window.location.pathname`, pas d'un en-tête ni d'une variable de build. Le
 * navigateur voit exactement la même URL `/app/<slug>/…` dans les deux modes, donc
 * la même scope de stockage. La gate de session, elle, est STRICTEMENT la même :
 * `requireAppAccessOrRedirect` est monté avant, dans les deux cas.
 */

/**
 * Gate par sous-app : session requise + compte actif + correcteur assigné.
 * L'état est relu en DB à chaque requête (better-sqlite3, ~µs) pour qu'une
 * désactivation ou une réassignation admin prenne effet sans attendre
 * l'expiration du cookie (30 jours).
 */
function requireAppAccessOrRedirect(app: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const u = currentUser(req);
    if (!u?.userId) {
      const next_ = encodeURIComponent(req.originalUrl);
      res.redirect(302, `/login?next=${next_}`);
      return;
    }
    const access = getUserAccess(u.userId);
    if (!access || !access.active) {
      res.redirect(302, '/login');
      return;
    }
    if (!canAccessApp(access.role, access.assigned_app, app)) {
      // Compte rattaché à un autre correcteur → retour landing (qui n'affiche
      // que le correcteur assigné).
      res.redirect(302, '/');
      return;
    }
    next();
  };
}

/** Types servis pré-compressés. `send` déduirait `application/gzip` du `.gz` : on impose. */
const MIME_PRECOMPRESSE: Record<string, string> = {
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=UTF-8',
};

/**
 * Sert `<fichier>.gz` quand il existe et que le client accepte gzip.
 *
 * Le bundle principal d'un correcteur pèse 3,9 Mo brut pour 1,5 Mo gzippé : sur un accès
 * navigateur depuis un lycée à travers un tunnel Tailscale, c'est le poste dominant du
 * premier chargement. Les `.gz` sont produits UNE fois par `deploy/install.sh`, donc
 * zéro compression à l'exécution — le mode statique vise une machine modeste, pas une
 * machine qui regzippe 4 Mo à chaque visiteur.
 *
 * Dégradation naturelle : sans `.gz` à côté du fichier, on passe la main à
 * `express.static` et le contenu est servi tel quel.
 */
function servirPrecompresse(dist: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const type = MIME_PRECOMPRESSE[extname(req.path)];
    if (!type) return next();
    if (!/\bgzip\b/.test(String(req.headers['accept-encoding'] ?? ''))) return next();

    // Confinement : `req.path` vient du client. Sans cette vérification, un `..` sortirait
    // du dist et servirait un fichier arbitraire du disque.
    const cible = resolve(dist, `.${req.path}.gz`);
    if (cible !== dist && !cible.startsWith(dist + '/')) return next();
    if (!existsSync(cible)) return next();

    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('Content-Type', type); // posé AVANT sendFile, qui ne l'écrase pas.
    res.setHeader(
      'Cache-Control',
      /[\\/]assets[\\/]/.test(req.path) ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
    );
    res.sendFile(cible, (err) => {
      if (err) next(err);
    });
  };
}

/**
 * Sert le SPA d'un fork depuis son `dist/`, en mode statique.
 *
 * `index: false` + repli explicite, et non l'index automatique d'`express.static` :
 * sinon `index.html` serait servi avec le `Cache-Control` des assets, et un navigateur
 * garderait un an une page qui doit changer à chaque déploiement.
 */
function servirDist(dist: string) {
  const fichiers = express.static(dist, {
    index: false,
    setHeaders: (res, chemin) => {
      // Les fichiers d'`assets/` portent un hash de contenu dans leur nom : leur URL
      // change à chaque build, ils sont donc immuables. Le reste (ce que Vite recopie
      // de public/ : polices, favicon, manifeste) garde un nom STABLE et ne doit
      // surtout pas être figé un an.
      const immuable = /[\\/]assets[\\/]/.test(chemin);
      res.setHeader(
        'Cache-Control',
        immuable ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
      );
    },
  });

  const index = join(dist, 'index.html');
  const repliSPA = (req: Request, res: Response, next: NextFunction): void => {
    // Repli SPA : toute route cliente (/app/pc/dashboard…) rend index.html. Réservé
    // à GET/HEAD — un POST sur une URL inconnue doit rester un 404, pas une page.
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(index, (err) => {
      if (err) next(err);
    });
  };

  return [servirPrecompresse(dist), fichiers, repliSPA] as const;
}

export function createReverseProxyRouter(): Router {
  const router = Router();
  const statique = serveStatique();
  const dists = statique ? loadForkDists() : new Map<string, string>();
  // Mode statique : les process des forks n'existent plus, donc leurs routes
  // serveur non plus. La gateway les porte — un SEUL routeur réutilisé par les
  // 11 préfixes, pour partager les verrous de compilation LaTeX. Voir
  // routes/fork-api.ts pour le détail et la mesure qui a motivé ce montage.
  const forkApi = statique ? createForkApiRouter() : null;

  for (const {app, target} of loadRoutes()) {
    const prefix = `/${app}`; // monté sous /app, donc l'effet final est /app/pc, etc.

    if (!statique) {
      router.use(
        prefix,
        requireAppAccessOrRedirect(app),
        createProxyMiddleware({
          target,
          changeOrigin: false,
          ws: false,
          pathRewrite: {[`^${prefix}`]: ''},
          headers: {'X-Subapp': app},
        }),
      );
      continue;
    }

    const dist = dists.get(app);
    if (!dist || !existsSync(join(dist, 'index.html'))) {
      // Panne EXPLICITE plutôt qu'un 404 muet. En mode statique, un dist absent ne
      // signifie qu'une chose : le build de ce fork n'a pas été fait sur cette
      // machine. Le message doit donner la commande, pas laisser chercher.
      console.warn(
        `[gateway] mode statique : dist introuvable pour « ${app} » ` +
          `(${dist ?? 'slug absent de forks.tsv'}) — ce correcteur répondra 503.`,
      );
      router.use(prefix, requireAppAccessOrRedirect(app), (_req: Request, res: Response) => {
        res
          .status(503)
          .type('text/plain; charset=utf-8')
          .send(
            `Correcteur « ${app} » non construit sur cette machine.\n` +
              `Construire : deploy/install.sh --only ${app}\n`,
          );
      });
      continue;
    }

    // forkApi AVANT servirDist : le repli SPA de servirDist répond à tout, il
    // avalerait /api/* et rendrait du HTML là où le client attend du JSON.
    router.use(prefix, requireAppAccessOrRedirect(app), forkApi!, ...servirDist(dist));
  }

  return router;
}
