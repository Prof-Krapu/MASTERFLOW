import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {AutonomyCycleSchema, BlackboardReportSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {audit} from '../src/lib/audit.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {buildAutonomyCycle} from '../src/services/autonomy_cycle.ts';
import {buildBlackboardReport} from '../src/services/blackboard.ts';
import {createProject} from '../src/services/projects.ts';

const owner: AuthUser = {
  id: 'autonomy-cycle-owner',
  username: 'autonomy_cycle_owner',
  role: 'teacher',
};
const outsider: AuthUser = {
  id: 'autonomy-cycle-outsider',
  username: 'autonomy_cycle_outsider',
  role: 'teacher',
};
let server: Server;
let base: string;
let projectId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(owner, {name: 'Projet MAPE-K privé'});
  projectId = project.project_id;
  audit({
    event_type: 'workflow_blocked',
    user_id: owner.id,
    scope: projectId,
    detail: {reason: 'validation_required'},
  });

  const app = express();
  app.use('/api/v1', createExperienceFabricRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('Experience Fabric — cycle MAPE-K contrôlé', () => {
  it('surveille, analyse et planifie sans exécuter', () => {
    const before = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;
    const cycle = buildAutonomyCycle(owner, {project_id: projectId});
    const after = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;

    expect(cycle.execution_policy).toBe('plan_only');
    expect(cycle.monitor.snapshot.scope_id).toBe(projectId);
    expect(cycle.monitor.snapshot.open_blockers.length).toBeGreaterThan(0);
    expect(cycle.analyze.blocker_count).toBeGreaterThan(0);
    expect(cycle.plan.candidates[0]).toMatchObject({
      readiness: 'blocked',
      status: 'proposed',
      action_registry_ref: null,
    });
    expect(cycle.plan.selected_candidate_id).toBeNull();
    expect(cycle.execute).toMatchObject({
      status: 'not_executed',
      action_ids: [],
    });
    expect(cycle.knowledge.retention_policy).toBe('no_automatic_retention');
    expect(after).toBe(before);
    expect(AutonomyCycleSchema.parse(cycle)).toEqual(cycle);
  });

  it('produit un identifiant stable tant que le contexte ne change pas', () => {
    const first = buildAutonomyCycle(owner, {project_id: projectId});
    const second = buildAutonomyCycle(owner, {project_id: projectId});
    expect(second.cycle_id).toBe(first.cycle_id);
  });

  it('protège les projets privés', () => {
    expect(() =>
      buildAutonomyCycle(outsider, {project_id: projectId}),
    ).toThrow('project_not_found');
  });

  it('expose le cycle via HTTP sans créer d’action', async () => {
    const before = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(
      `${base}/experience/autonomy/cycle?project_id=${projectId}`,
      {headers},
    );
    const after = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      execution_policy: 'plan_only',
      execute: {status: 'not_executed', action_ids: []},
    });
    expect(after).toBe(before);
  });

  it('refuse une limite invalide', async () => {
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(
      `${base}/experience/autonomy/cycle?project_id=${projectId}&limit=100`,
      {headers},
    );
    expect(response.status).toBe(400);
  });
});

describe('Experience Fabric — blackboard privé', () => {
  it('consolide des contributions privées sans créer d’action', () => {
    const before = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;
    const report = buildBlackboardReport(owner, {project_id: projectId});
    const after = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;

    expect(report.execution_policy).toBe('synthesize_only');
    expect(report.guardrails).toEqual({
      private_contributions: true,
      permissions_unchanged: true,
      no_action_created: true,
      no_multi_spokesperson: true,
      no_automatic_memory_retention: true,
    });
    expect(report.synthesis.speaker_policy).toBe('single_semantic_spokesperson');
    expect(report.contributions.map((item) => item.contributor_type)).toEqual(
      expect.arrayContaining(['monitor', 'storylet', 'guardrail']),
    );
    expect(report.contributions.every((item) => item.visibility === 'cycle_private')).toBe(true);
    expect(after).toBe(before);
    expect(BlackboardReportSchema.parse(report)).toEqual(report);
  });

  it('protège le blackboard d’un projet privé', () => {
    expect(() =>
      buildBlackboardReport(outsider, {project_id: projectId}),
    ).toThrow('project_not_found');
  });

  it('expose le blackboard via HTTP sans action ni multi-porte-parole', async () => {
    const before = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(
      `${base}/experience/autonomy/blackboard?project_id=${projectId}`,
      {headers},
    );
    const after = (
      getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}
    ).count;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      execution_policy: 'synthesize_only',
      synthesis: {speaker_policy: 'single_semantic_spokesperson'},
      guardrails: {no_action_created: true, no_multi_spokesperson: true},
    });
    expect(after).toBe(before);
  });
});
