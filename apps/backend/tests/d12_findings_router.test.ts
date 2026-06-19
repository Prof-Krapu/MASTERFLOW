import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {D12MissedTriggerFindingSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createDiagnosticsRouter} from '../src/routers/diagnostics.ts';
import {listUsageLearningCandidates} from '../src/services/usage_harvester.ts';

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
  insert.run('d12-admin', 'd12-admin', 'D12 Admin', 'admin', now, now);
  insert.run('d12-teacher', 'd12-teacher', 'D12 Teacher', 'teacher', now, now);
  adminToken = signToken({id: 'd12-admin', username: 'd12-admin', role: 'admin'});
  teacherToken = signToken({id: 'd12-teacher', username: 'd12-teacher', role: 'teacher'});

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

const body = {
  source_ref: 'process_activation:test-stop',
  expected_process: 'hard_stop',
  actual_runtime_response: 'Le diagnostic signale un missed trigger mais aucun objet D12 ne le suit.',
  missing_runtime_piece: 'autonomy_finding_runtime',
  user_impact: 'MALEX doit noter manuellement le raté.',
  domain_refs: ['D12_AUTONOMY_OBSERVABILITY'],
  output_family_refs: ['factory_backflow'],
  evidence_refs: ['diagnostics:process-activation'],
  blocked_actions: ['auto_patch', 'auto_canon', 'auto_execute'],
  recommended_queue_task: {
    task: 'Créer une finding D12 observation-only',
    impact: 'Le raté devient suivable sans auto-fix.',
    risk: 'faible en observation, élevé si auto-patch',
    source_of_truth: 'D12 missed trigger finding spec',
    truth_status: 'implémentation',
    validation_required: false,
    suggested_owner: 'MALEX',
    forbidden_actions: ['auto_patch', 'auto_canon'],
  },
  severity: 'medium',
};

describe('D12 missed trigger findings', () => {
  it('reste privé admin/godmode', async () => {
    expect((await fetch(`${base}/diagnostics/d12/findings`)).status).toBe(401);
    expect((await fetch(`${base}/diagnostics/d12/findings`, {headers: auth(teacherToken)})).status).toBe(403);
    expect((await fetch(`${base}/diagnostics/d12/findings`, {
      method: 'POST',
      headers: auth(teacherToken),
      body: JSON.stringify(body),
    })).status).toBe(403);
  });

  it('crée une finding observation-only sans action ni job', async () => {
    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };

    const response = await fetch(`${base}/diagnostics/d12/findings`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify(body),
    });
    expect(response.status).toBe(201);
    const finding = D12MissedTriggerFindingSchema.parse(await response.json());

    expect(finding).toMatchObject({
      source_ref: body.source_ref,
      expected_process: 'hard_stop',
      missing_runtime_piece: 'autonomy_finding_runtime',
      status: 'observation',
      severity: 'medium',
    });
    expect(finding.audit_trace).toEqual(expect.arrayContaining(['observation_only', 'no_action', 'no_auto_fix']));
    expect(finding.blocked_actions).toEqual(expect.arrayContaining(['auto_patch', 'auto_canon']));

    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    expect(after).toEqual(before);
  });

  it('liste et filtre les findings par statut', async () => {
    const response = await fetch(`${base}/diagnostics/d12/findings?status=observation`, {
      headers: auth(adminToken),
    });
    expect(response.status).toBe(200);
    const items = await response.json() as unknown[];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((item) => D12MissedTriggerFindingSchema.parse(item).status === 'observation')).toBe(true);
  });

  it('décide une finding sans créer action, job ou canon write', async () => {
    const created = await fetch(`${base}/diagnostics/d12/findings`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({...body, source_ref: 'process_activation:decision-test'}),
    });
    expect(created.status).toBe(201);
    const finding = D12MissedTriggerFindingSchema.parse(await created.json());

    expect(listUsageLearningCandidates().some(
      (candidate) => candidate.evidence_refs.includes(`d12_finding:${finding.finding_id}`),
    )).toBe(false);

    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    const decided = await fetch(`${base}/diagnostics/d12/findings/${finding.finding_id}/decision`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({decision: 'validate_alert', note: 'confirmé par owner'}),
    });
    expect(decided.status).toBe(200);
    const bodyAfterDecision = D12MissedTriggerFindingSchema.parse(await decided.json());

    expect(bodyAfterDecision.status).toBe('validated_alert');
    expect(bodyAfterDecision.owner_decision).toMatchObject({decision: 'validate_alert'});
    const learning = listUsageLearningCandidates().find(
      (candidate) => candidate.evidence_refs.includes(`d12_finding:${finding.finding_id}`),
    );
    expect(learning).toMatchObject({
      signal_type: 'missed_trigger',
      privacy: 'do_not_export',
      canon_status: 'candidate_only',
      review_status: 'pending',
    });
    expect(learning?.domain_refs).toContain('D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT');
    expect(learning?.godmode_targets).toEqual(
      expect.arrayContaining(['AUTONOMY_STEP1', 'OBSERVABILITY']),
    );

    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
    };
    expect(after).toEqual(before);
  });

  it('archive une finding sans la supprimer', async () => {
    const created = await fetch(`${base}/diagnostics/d12/findings`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({...body, source_ref: 'process_activation:archive-test'}),
    });
    const finding = D12MissedTriggerFindingSchema.parse(await created.json());

    const archived = await fetch(`${base}/diagnostics/d12/findings/${finding.finding_id}/decision`, {
      method: 'POST',
      headers: auth(adminToken),
      body: JSON.stringify({decision: 'archive'}),
    });
    expect(archived.status).toBe(200);
    expect(D12MissedTriggerFindingSchema.parse(await archived.json()).status).toBe('archived');

    const list = await fetch(`${base}/diagnostics/d12/findings?status=archived`, {
      headers: auth(adminToken),
    });
    expect(list.status).toBe(200);
    const archivedItems = await list.json() as unknown[];
    expect(archivedItems.some((item) => D12MissedTriggerFindingSchema.parse(item).finding_id === finding.finding_id))
      .toBe(true);
  });
});
