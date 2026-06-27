import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createNarrativeRuntimeRouter} from '../src/routers/narrative_runtime.ts';
import {createNode} from '../src/services/narrative_runtime.ts';
import type {AuthUser} from '../src/middleware/auth.ts';

let server: Server;
let base = '';
let token = '';
let nodeId = '';
const teacher: AuthUser = {id: 'nr-router-teacher', username: 'nr_router_teacher', role: 'teacher'};
const now = Date.now();

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(teacher.id, teacher.username, teacher.username, teacher.role, now, now);
  db.prepare(`
    INSERT OR IGNORE INTO story_workbenches (id, owner_id, project_id, project_scope, title, source_ref, intake_mode, source_truth_state, status, created_by, created_at, updated_at)
    VALUES (?, ?, NULL, 'router-test', 'Router Workbench', 'src://router-test', 'draft_workbench', 'USER_PROVIDED', 'draft', ?, ?, ?)
  `).run('nr-router-wb', teacher.id, teacher.id, now, now);
  const node = createNode(teacher, {
    workbench_id: 'nr-router-wb',
    node_type: 'scene',
    title: 'Scène visuelle',
    summary: 'Le mentor enseigne un principe visuel important',
  });
  nodeId = node.id;
  token = signToken(teacher);

  const app = express();
  app.use(express.json({limit: '2mb'}));
  app.use('/api/v1', createNarrativeRuntimeRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

describe('narrative runtime router', () => {
  it('bloque generate-visual sur le gate action sans créer de job image', async () => {
    const before = getDb().prepare(
      "SELECT COUNT(*) AS count FROM jobs WHERE type = 'asset_prepare'",
    ).get() as {count: number};

    const response = await fetch(`${base}/narrative/nodes/${nodeId}/generate-visual`, {
      method: 'POST',
      headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({additional_prompt: 'composition noir et blanc'}),
    });

    expect(response.status).toBe(202);
    const body = await response.json() as {
      status: string;
      manifest_id: string | null;
      prompt: string;
      next_action: string;
    };
    expect(body.status).toBe('generation_blocked_action_gate');
    expect(body.manifest_id).toBeTruthy();
    expect(body.prompt).toContain('noir et blanc');
    expect(body.next_action).toBe('submit_approved_create_render_manifest_action');

    const after = getDb().prepare(
      "SELECT COUNT(*) AS count FROM jobs WHERE type = 'asset_prepare'",
    ).get() as {count: number};
    expect(after.count).toBe(before.count);
  });
});
