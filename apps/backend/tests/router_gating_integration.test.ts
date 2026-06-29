import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';
import {createAdminRouter} from '../src/routers/admin.ts';
import {createPedagogicalAssistanceRouter} from '../src/routers/pedagogical_assistance.ts';
import {createProjectsRouter} from '../src/routers/projects.ts';

/**
 * Régression : ordre de montage des routeurs racine.
 *
 * `diagnostics` et `admin` sont montés à la racine `/api/v1` AVANT `projects`. Un
 * `router.use(requireRole('admin'))` SANS path y bloquait jadis TOUTE requête traversante
 * (dont `POST /projects` par un teacher) → 403. Les gates doivent être scopés à `/diagnostics`
 * et `/admin` pour laisser le reste tomber dans les routeurs suivants.
 *
 * Ce test monte les routeurs DANS L'ORDRE de `index.ts` (ce que les tests unitaires
 * isolés ne faisaient pas) et prouve qu'un teacher atteint bien `projects` et
 * qu'un student atteint les surfaces read-only pédagogiques.
 */

let server: Server;
let base: string;
let teacherToken: string;
let studentToken: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const db = getDb();
  db.prepare(
      `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES ('gating-teacher', 'gating_teacher', 'Gating Teacher', 'x', 'teacher', 1, ?, ?)`,
    )
    .run(now, now);
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES ('gating-student', 'gating_student', 'Gating Student', 'x', 'student', 1, ?, ?)`,
  ).run(now, now);
  teacherToken = signToken({id: 'gating-teacher', username: 'gating_teacher', role: 'teacher'});
  studentToken = signToken({id: 'gating-student', username: 'gating_student', role: 'student'});

  const app = express();
  app.use(express.json());
  // Même ordre que index.ts : diagnostics + admin (gated admin) AVANT projects.
  app.use('/api/v1', createDiagnosticsRouter());
  app.use('/api/v1', createAdminRouter());
  app.use('/api/v1', createPedagogicalAssistanceRouter());
  app.use('/api/v1', createProjectsRouter());

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

const auth = (t: string) => ({headers: {Authorization: `Bearer ${t}`}});

describe('ordre de montage : les gates admin ne bloquent pas projects', () => {
  it('un teacher peut POST /projects (pas bloqué par le gate de diagnostics/admin)', async () => {
    const res = await fetch(`${base}/projects`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...auth(teacherToken).headers},
      body: JSON.stringify({name: 'Projet via stack complète'}),
    });
    expect(res.status).toBe(201);
  });

  it('les gates restent actifs : student → 403 sur /diagnostics/token-usage et /admin/users', async () => {
    expect((await fetch(`${base}/diagnostics/token-usage`, auth(studentToken))).status).toBe(403);
    expect((await fetch(`${base}/admin/users`, auth(studentToken))).status).toBe(403);
  });

  it('un student peut POST /pedagogical-assistance/classify malgré les gates admin précédents', async () => {
    const res = await fetch(`${base}/pedagogical-assistance/classify`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', ...auth(studentToken).headers},
      body: JSON.stringify({
        active_mode: 'learn',
        request_type: 'understand_concept',
      }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      assistance_kind: 'explain',
      permissions_unchanged: true,
    });
  });
});
