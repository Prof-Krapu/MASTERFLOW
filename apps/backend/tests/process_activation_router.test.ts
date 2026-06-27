import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {ProcessActivationReadModelSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';

let server: Server;
let base = '';
let adminToken = '';
let teacherToken = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run('process-admin', 'process-admin', 'Process Admin', 'admin', now, now);
  insert.run('process-teacher', 'process-teacher', 'Process Teacher', 'teacher', now, now);
  adminToken = signToken({id: 'process-admin', username: 'process-admin', role: 'admin'});
  teacherToken = signToken({id: 'process-teacher', username: 'process-teacher', role: 'teacher'});

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
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

const auth = (token: string) => ({Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'});

async function diagnose(signal: string, tier = 'T1'): Promise<Response> {
  return fetch(`${base}/diagnostics/process-activation`, {
    method: 'POST',
    headers: auth(adminToken),
    body: JSON.stringify({signal, active_mode: 'home', loaded_context_tier: tier}),
  });
}

describe('Process activation read-model', () => {
  it('reste privé admin/godmode', async () => {
    expect((await fetch(`${base}/diagnostics/process-activation`, {method: 'POST'})).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/process-activation`, {
      method: 'POST',
      headers: auth(teacherToken),
      body: JSON.stringify({signal: 'corrige'}),
    })).status).toBe(403);
  });

  it('route correction vers D05-D06 mais demande le contexte T2', async () => {
    const response = await diagnose('Corrige ce travail et prépare un feedback', 'T1');
    expect(response.status).toBe(200);
    const body = ProcessActivationReadModelSchema.parse(await response.json());
    expect(body).toMatchObject({
      detected_domains: ['D05_PEDAGOGY', 'D06_CORRECTION_FEEDBACK_EVALUATION'],
      output_family_candidates: ['correction_feedback'],
      required_context_tier: 'T2',
      status: 'missing_context',
    });
    expect(body.blocked_actions).toContain('student_send');
  });

  it('bloque génération/provider D08 sans créer action ou job', async () => {
    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    const body = ProcessActivationReadModelSchema.parse(await (await diagnose('Génère une image DA', 'T2')).json());
    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    expect(body).toMatchObject({status: 'blocked_by_gate', output_family_candidates: ['visual_manifest']});
    expect(body.blocked_actions).toEqual(expect.arrayContaining(['provider_generation', 'image_generation']));
    expect(after).toEqual(before);
  });

  it('diagnostique stop sans l’appliquer automatiquement', async () => {
    const body = ProcessActivationReadModelSchema.parse(await (await diagnose('Stop, ne génère pas', 'T1')).json());
    expect(body.status).toBe('diagnostic_only');
    expect(body.process_candidates[0]?.runtime_status).toBe('implemented');
    expect(body.missed_trigger_candidate).toBeNull();
    expect(body.next_safe_action.label).toContain('activer explicitement');
    expect(body.next_safe_action.required_validation).toBe(true);
    expect(body.next_safe_action.forbidden_followups).toContain('auto_cancel');
  });

  it('reconnaît la finding D12 avec détection automatique active et renvoie le prochain gap', async () => {
    const body = ProcessActivationReadModelSchema.parse(
      await (await diagnose('Cette règle a échoué et le processus a été raté', 'T2')).json(),
    );
    expect(body.process_candidates[0]).toMatchObject({
      process_id: 'd12_backflow_finding',
      runtime_status: 'implemented',
    });
    expect(body.next_safe_action.kind).toBe('route_to_validation_inbox');
    expect(body.missed_trigger_candidate?.missing_runtime_piece).toBe('automatic_recovery_or_escalation');
    expect(body.next_safe_action.forbidden_followups).toEqual(expect.arrayContaining(['auto_patch', 'auto_canon']));
  });

  it('ne route rien si le signal est insuffisant', async () => {
    const body = ProcessActivationReadModelSchema.parse(await (await diagnose('bonjour', 'T1')).json());
    expect(body).toMatchObject({status: 'diagnostic_only', confidence: 0.2});
    expect(body.process_candidates).toEqual([]);
  });
});
