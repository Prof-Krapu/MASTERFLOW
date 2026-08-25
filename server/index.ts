import 'dotenv/config';
import './types.d.ts';

import cookieParser from 'cookie-parser';
import express from 'express';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';

import {startCatalogSweep} from './catalog-sweep.ts';
import {getDb} from './db.ts';
import {refreshAllCatalogs} from './model-catalog-service.ts';
import {migrateSecretsAtRest} from './secrets-at-rest.ts';
import {createAccessRequestsRouter, createAdminAccessRequestsRouter} from './routes/access-requests.ts';
import {createAdminCopilotRouter} from './routes/admin-copilot.ts';
import {createAdminFeedbackRouter} from './routes/admin-feedback.ts';
import {createAdminSettingsRouter} from './routes/admin-settings.ts';
import {createAdminStorageRouter} from './routes/admin-storage.ts';
import {createAdminUsersRouter} from './routes/admin-users.ts';
import {createAuthRouter} from './routes/auth.ts';
import {createFeedbackRouter} from './routes/feedback.ts';
import {createHealthRouter} from './routes/health.ts';
import {createInvitesRouter} from './routes/invites.ts';
import {createAdminNewsRouter, createNewsRouter} from './routes/news.ts';
import {createReverseProxyRouter} from './routes/proxy.ts';
import {createStorageRouter} from './routes/storage.ts';
import {createTelemetryRouter} from './routes/telemetry.ts';
import {seedAdmin} from './seed.ts';
import {sessionMiddleware} from './session.ts';

/**
 * Backend API_manage — Express.
 *
 * - En dev : `npm run dev:server` (port 3100, accédé via le proxy Vite sur :3000).
 * - En prod : `npm run serve` (port 3000, sert aussi le bundle Vite buildé dans dist/).
 *
 * À ce stade (tâche #2) : auth complète, seed admin au boot, routes invites admin-only.
 * Le storage REST, le reverse proxy et l'UI viennent dans les tâches suivantes.
 */

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT ?? (isProd ? 3000 : 3100));
const DIST_DIR = resolve(process.cwd(), 'dist');

async function main() {
  getDb(); // force migrations au boot pour échouer vite.

  // Chiffrement at-rest : migre les secrets encore en clair (idempotent, audit P2).
  const encrypted = migrateSecretsAtRest(getDb());
  if (encrypted > 0) {
    console.log(`[API_manage] secrets at-rest : ${encrypted} valeur(s) chiffrée(s) en base.`);
  }

  const seedResult = await seedAdmin();
  if (seedResult.action !== 'skipped') {
    console.log(`[API_manage] admin ${seedResult.action}: ${seedResult.username}`);
  } else {
    console.warn('[API_manage] ADMIN_USERNAME absent — aucun admin seedé. Configurer .env.');
  }

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // pour rate-limit derrière reverse proxy / Funnel.

  // cookie + session AVANT le reverse proxy (le gate requireUserOrRedirect en a besoin),
  // mais express.json() APRÈS — sinon il consomme le body et le proxy n'a plus rien à streamer
  // vers les sous-apps (cassait /api/proxy POST côté PC/FR/NL, dont le device-flow GitHub).
  app.use(cookieParser());
  app.use(sessionMiddleware);

  app.get('/healthz', (_req, res) => res.json({ok: true, ts: Date.now()}));

  // Reverse proxy vers les 3 sous-apps. Gated par requireUserOrRedirect.
  // Monté AVANT express.json() pour préserver le body brut des POST proxifiés.
  app.use('/app', createReverseProxyRouter());

  app.use(express.json({limit: '5mb'}));

  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1/admin/invites', createInvitesRouter());
  app.use('/api/v1/admin/global-settings', createAdminSettingsRouter());
  app.use('/api/v1/admin/copilot', createAdminCopilotRouter());
  app.use('/api/v1/admin/health', createHealthRouter());
  app.use('/api/v1/admin', createAdminUsersRouter());
  app.use('/api/v1/admin', createAdminStorageRouter());
  app.use('/api/v1/admin', createAdminFeedbackRouter());
  app.use('/api/v1/admin', createAdminAccessRequestsRouter());
  app.use('/api/v1/storage', createStorageRouter());
  app.use('/api/v1/news', createNewsRouter());
  app.use('/api/v1/admin/news', createAdminNewsRouter());
  app.use('/api/v1/telemetry', createTelemetryRouter());
  app.use('/api/v1/feedback', createFeedbackRouter());
  app.use('/api/v1/access-requests', createAccessRequestsRouter());

  // Bouchon pour routes pas encore implémentées.
  app.use('/api/v1', (_req, res) => res.status(501).json({error: 'not_implemented'}));

  if (isProd) {
    if (!existsSync(DIST_DIR)) {
      console.warn(`[API_manage] dist/ absent — exécuter \`npm run build:web\` avant \`npm run serve\`.`);
    } else {
      app.use(express.static(DIST_DIR));

      // index.html est servi via un gabarit en mémoire plutôt qu'en sendFile : les
      // robots d'aperçu de lien (messageries, réseaux) exigent une og:image en URL
      // ABSOLUE et ignorent souvent un chemin relatif. On ne peut pas l'écrire en dur
      // dans le HTML — l'URL publique dépend du tailnet de chaque installation — on la
      // reconstruit donc depuis la requête. Le funnel Tailscale termine le TLS et
      // transmet X-Forwarded-Proto ; `trust proxy` doit rester actif pour req.protocol.
      const gabaritIndex = readFileSync(resolve(DIST_DIR, 'index.html'), 'utf8');
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/') || req.path.startsWith('/app/')) return next();
        const origine = `${req.protocol}://${req.get('host') ?? ''}`;
        res
          .type('html')
          .send(
            gabaritIndex
              .replaceAll('content="/og-corrector.png"', `content="${origine}/og-corrector.png"`)
              .replace('<meta property="og:type"', `<meta property="og:url" content="${origine}${req.originalUrl}" />\n    <meta property="og:type"`),
          );
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    const mode = isProd ? 'prod' : 'dev';
    console.log(`[API_manage] (${mode}) listening on http://0.0.0.0:${PORT}`);
    console.log(`[API_manage] DB at ${resolve(process.cwd(), 'data', 'api-manage.db')}`);

    // Catalogue de modèles : sonde best-effort APRÈS l'ouverture du port — les fournisseurs
    // changent périodiquement de LLM (OpenCode Go en tête), et une détection au démarrage
    // évite d'attendre qu'un admin ouvre la console. Jamais bloquant, jamais fatal.
    const signalerDerive = (apps: string[]) =>
      console.warn(
        `[API_manage] catalogue : modèle(s) retiré(s) par le fournisseur, config réalignée pour ${apps.join(', ')} (ticket ouvert dans l'Inbox).`,
      );

    void refreshAllCatalogs()
      .then((drift) => {
        const apps = Object.keys(drift);
        if (apps.length > 0) signalerDerive(apps);
      })
      .catch((e) => console.warn('[API_manage] catalogue : sonde initiale échouée —', (e as Error).message));

    // …puis un balayage de fond : le service tourne des semaines, et le TTL de 6 h n'est
    // évalué que lorsqu'un admin ouvre la console. Sans ça, une rotation de LLM passe
    // inaperçue jusqu'au prochain redémarrage.
    const balayage = startCatalogSweep(refreshAllCatalogs, {
      onDrift: signalerDerive,
      onError: (e) => console.warn('[API_manage] catalogue : balayage échoué —', e.message),
    });
    console.log(
      `[API_manage] catalogue : balayage tous les ${Math.round(balayage.intervalMs / 3_600_000)} h`,
    );
  });
}

main().catch((e) => {
  console.error('[API_manage] fatal:', e);
  process.exit(1);
});
