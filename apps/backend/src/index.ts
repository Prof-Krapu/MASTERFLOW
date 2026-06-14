import {createServer} from 'node:http';

import express from 'express';

import {dbPath, getDb} from './db/schema.ts';
import {seedAll} from './db/seed.ts';
import {env} from './lib/env.ts';
import {createAuthRouter} from './routers/auth.ts';
import {createContextRouter} from './routers/context.ts';
import {createRoomsRouter} from './routers/rooms.ts';
import {createPersonasRouter} from './routers/personas.ts';
import {createActionsRouter} from './routers/actions.ts';
import {createResourcesRouter} from './routers/resources.ts';
import {createDiagnosticsRouter} from './routers/diagnostics.ts';
import {createAdminRouter} from './routers/admin.ts';
import {createJobsRouter} from './routers/jobs.ts';
import {createProjectsRouter} from './routers/projects.ts';
import {createSchemaTemplatesRouter} from './routers/schema_templates.ts';
import {createGuidedRuntimeRouter} from './routers/guided_runtime.ts';
import {createRagRouter} from './routers/rag.ts';
import {createMemoryRouter} from './routers/memory.ts';
import {createInventoryRouter} from './routers/inventory.ts';
import {createValidationInboxRouter} from './routers/validation_inbox.ts';
import {attachChatWs} from './routers/ws/chat.ts';

/**
 * Bootstrap du backend MasterFlow (Express + WebSocket).
 *
 * Ordre de boot : migrations (échouer vite) → seed idempotent → routers REST →
 * WebSocket chat → écoute. Base d'API : `env.apiBase` (/api/v1). Le WS s'attache au
 * même serveur HTTP (`/ws/{room_instance_id}`).
 *
 * Montage : `auth`, `context`, `rooms`, `resources` sont montés sous leur sous-chemin ;
 * `personas` et `actions` sont auto-préfixés (leurs routes incluent `/personas…` et
 * `/actions…`) et se montent donc à la racine de l'API.
 */

async function main(): Promise<void> {
  getDb(); // force les migrations au boot.

  const seeded = await seedAll();
  console.log(
    `[masterflow] seed → users:${seeded.users} personas:${seeded.personas} rooms:${seeded.rooms} resources:${seeded.resources} schemaTemplates:${seeded.schemaTemplates}`,
  );

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({limit: '5mb'}));

  // Health check — ne dépend pas de l'auth.
  app.get('/health', (_req, res) => {
    const db = getDb();
    const counts = {
      users: (db.prepare('SELECT COUNT(*) AS n FROM users').get() as {n: number}).n,
      personas: (db.prepare('SELECT COUNT(*) AS n FROM personas').get() as {n: number}).n,
      rooms: (db.prepare('SELECT COUNT(*) AS n FROM rooms').get() as {n: number}).n,
      resources: (db.prepare('SELECT COUNT(*) AS n FROM resources').get() as {n: number}).n,
      schemaTemplates: (db.prepare('SELECT COUNT(*) AS n FROM schema_templates').get() as {n: number}).n,
    };
    res.json({ok: true, service: 'masterflow-backend', ts: Date.now(), counts});
  });

  // Routers /api/v1.
  const api = env.apiBase;
  app.use(`${api}/auth`, createAuthRouter());
  app.use(`${api}/context`, createContextRouter());
  app.use(`${api}/rooms`, createRoomsRouter());
  app.use(`${api}/resources`, createResourcesRouter());
  // Auto-préfixés (routes /personas… /actions… /diagnostics…) → racine de l'API.
  app.use(api, createPersonasRouter());
  app.use(api, createActionsRouter());
  app.use(api, createDiagnosticsRouter());
  app.use(api, createAdminRouter());
  app.use(api, createJobsRouter());
  app.use(api, createProjectsRouter());
  app.use(api, createSchemaTemplatesRouter());
  app.use(api, createGuidedRuntimeRouter());
  app.use(api, createRagRouter());
  app.use(api, createMemoryRouter());
  app.use(api, createInventoryRouter());
  app.use(api, createValidationInboxRouter());

  // Filet pour les routes /api/v1 inconnues (après tous les routers).
  app.use(api, (_req, res) => res.status(404).json({error: 'not_found'}));

  const server = createServer(app);

  // WebSocket chat (streaming) — `ws://host/ws/{room_instance_id}?token=<JWT>`.
  attachChatWs(server);

  server.listen(env.port, () => {
    console.log(`[masterflow] backend ${env.isProd ? 'prod' : 'dev'} → http://localhost:${env.port}`);
    console.log(`[masterflow] API base ${api} · WS /ws/{room_instance_id} · DB ${dbPath()}`);
  });
}

main().catch((e) => {
  console.error('[masterflow] fatal :', e);
  process.exit(1);
});
