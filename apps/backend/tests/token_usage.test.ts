import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';

/**
 * PR-1 — Diagnostic d'usage tokens (`GET /diagnostics/token-usage`).
 *
 * Invariants couverts :
 *  - lecture **gated admin/godmode** : 401 sans token, 403 pour student/teacher ;
 *  - agrégation correcte de `token_events` (par modèle, par tâche) ;
 *  - surface privée, sans effet sur le runtime user.
 */

let server: Server;
let base: string;
let godmodeToken: string;
let adminToken: string;
let teacherToken: string;
let studentToken: string;

const MODEL = 'pr1-test-model';
const TASK = 'pr1-test-task';

beforeAll(async () => {
  await seedAll();
  const db = getDb();

  const v = db
    .prepare("SELECT id, username, role FROM users WHERE username = 'vincent'")
    .get() as {id: string; username: string; role: 'godmode'};
  godmodeToken = signToken({id: v.id, username: v.username, role: v.role});
  // Rôles fabriqués : signToken signe n'importe quel rôle (jti frais, non révoqué) ;
  // requireRole tranche sur le rôle du jeton, sans exiger de rangée user.
  adminToken = signToken({id: 'test-admin', username: 'test-admin', role: 'admin'});
  teacherToken = signToken({id: 'test-teacher', username: 'test-teacher', role: 'teacher'});
  studentToken = signToken({id: 'test-student', username: 'test-student', role: 'student'});

  // Deux événements traçables sous un modèle/tâche uniques → assertions exactes,
  // robustes à d'éventuelles autres lignes en base.
  const ins = db.prepare(
    `INSERT INTO token_events
       (user_id, ts, model, task, prompt_tokens, completion_tokens, cost_eur, persona_id, room_instance_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const now = Date.now();
  ins.run(null, now, MODEL, TASK, 10, 5, 0.001, null, null);
  ins.run(null, now, MODEL, TASK, 20, 7, 0.002, null, null);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createDiagnosticsRouter());

  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((e) => (e ? reject(e) : resolve())));
});

const auth = (token: string) => ({headers: {Authorization: `Bearer ${token}`}});

interface Report {
  group_by: string;
  totals: {prompt_tokens: number; completion_tokens: number; cost_eur: number; events: number};
  rows: Array<{group: string; prompt_tokens: number; completion_tokens: number; cost_eur: number; events: number}>;
}

describe('diagnostics/token-usage — gated admin/godmode', () => {
  it('sans token → 401', async () => {
    const res = await fetch(`${base}/diagnostics/token-usage`);
    expect(res.status).toBe(401);
  });

  it('student et teacher → 403 (jamais teacher/student)', async () => {
    expect((await fetch(`${base}/diagnostics/token-usage`, auth(studentToken))).status).toBe(403);
    expect((await fetch(`${base}/diagnostics/token-usage`, auth(teacherToken))).status).toBe(403);
  });

  it('admin → 200 et agrège par modèle', async () => {
    const res = await fetch(`${base}/diagnostics/token-usage?group_by=model`, auth(adminToken));
    expect(res.status).toBe(200);
    const report = (await res.json()) as Report;
    expect(report.group_by).toBe('model');

    const row = report.rows.find((r) => r.group === MODEL);
    expect(row).toBeDefined();
    expect(row?.prompt_tokens).toBe(30);
    expect(row?.completion_tokens).toBe(12);
    expect(row?.events).toBe(2);
    expect(row?.cost_eur).toBeCloseTo(0.003, 6);

    // Les totaux englobent au moins nos deux événements.
    expect(report.totals.events).toBeGreaterThanOrEqual(2);
  });

  it('godmode → 200 et agrège par tâche', async () => {
    const res = await fetch(`${base}/diagnostics/token-usage?group_by=task`, auth(godmodeToken));
    expect(res.status).toBe(200);
    const report = (await res.json()) as Report;
    expect(report.group_by).toBe('task');
    expect(report.rows.find((r) => r.group === TASK)?.prompt_tokens).toBe(30);
  });

  it('group_by inconnu → fallback sur model (pas d_erreur SQL)', async () => {
    const res = await fetch(`${base}/diagnostics/token-usage?group_by=DROP`, auth(adminToken));
    expect(res.status).toBe(200);
    expect(((await res.json()) as Report).group_by).toBe('model');
  });

  it('refuse les bornes temporelles invalides ou inversées', async () => {
    for (const query of ['from=abc', 'to=-1', 'from=20&to=10']) {
      const res = await fetch(`${base}/diagnostics/token-usage?${query}`, auth(adminToken));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({error: 'invalid_time_range'});
    }
  });

  it('crée un index composite stable pour les lectures user + période', () => {
    const columns = getDb()
      .prepare("PRAGMA index_info('idx_token_events_user_ts')")
      .all() as Array<{seqno: number; name: string}>;

    expect(columns.map((column) => column.name)).toEqual(['user_id', 'ts']);
  });
});
