import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {InventoryDiagnosticsSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';

let server: Server;
let base: string;
let adminToken: string;
let teacherToken: string;

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run('inventory-diagnostic-admin', 'inventory-diagnostic-admin', 'Admin', 'admin', now, now);
  insertUser.run(
    'inventory-diagnostic-teacher',
    'inventory-diagnostic-teacher',
    'Teacher',
    'teacher',
    now,
    now,
  );
  insertUser.run(
    'inventory-diagnostic-owner',
    'inventory-diagnostic-owner',
    'Private owner',
    'teacher',
    now,
    now,
  );
  db.prepare(
    `INSERT OR IGNORE INTO projects
       (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('inventory-diagnostic-project', 'inventory-diagnostic-owner',
             'Private diagnostic project', 'active', 'private', ?, ?)`,
  ).run(now, now);
  db.prepare(
    `INSERT OR IGNORE INTO inventory_items
       (id, owner_id, project_id, scope_type, type, label, item_status, validation_status,
        quantity, usage_tags_json, source_refs_json, visibility_scope, created_at, updated_at)
     VALUES
       ('inventory-diagnostic-private', 'inventory-diagnostic-owner', NULL, 'user', 'custom',
        'DIAGNOSTIC_PRIVATE_LABEL', 'detected', 'candidate', 1, '[]', '[]', 'private', ?, ?),
       ('inventory-diagnostic-project-item', 'inventory-diagnostic-owner',
        'inventory-diagnostic-project', 'project', 'gear', 'DIAGNOSTIC_PROJECT_LABEL',
        'owned_confirmed', 'validated', 1, '[]', '[]', 'project', ?, ?)`,
  ).run(now, now, now, now);

  adminToken = signToken({
    id: 'inventory-diagnostic-admin',
    username: 'inventory-diagnostic-admin',
    role: 'admin',
  });
  teacherToken = signToken({
    id: 'inventory-diagnostic-teacher',
    username: 'inventory-diagnostic-teacher',
    role: 'teacher',
  });

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createDiagnosticsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function auth(token: string): {headers: {Authorization: string}} {
  return {headers: {Authorization: `Bearer ${token}`}};
}

describe('PR-INV-7 — diagnostics Inventory admin+', () => {
  it('refuse les lectures non authentifiees et teacher', async () => {
    expect((await fetch(`${base}/diagnostics/inventory`)).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/inventory`, auth(teacherToken))).status).toBe(403);
  });

  it('retourne seulement des agregats valides sans donnees privees', async () => {
    const response = await fetch(`${base}/diagnostics/inventory`, auth(adminToken));
    expect(response.status).toBe(200);
    const body = InventoryDiagnosticsSchema.parse(await response.json());

    expect(body.totals.items).toBeGreaterThanOrEqual(2);
    expect(body.validation.items.candidate).toBeGreaterThanOrEqual(1);
    expect(body.validation.items.validated).toBeGreaterThanOrEqual(1);
    expect(body.workflow.validated_project_items_without_rag).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(body)).not.toContain('DIAGNOSTIC_PRIVATE_LABEL');
    expect(JSON.stringify(body)).not.toContain('DIAGNOSTIC_PROJECT_LABEL');
    expect(JSON.stringify(body)).not.toContain('inventory-diagnostic-owner');
  });
});
