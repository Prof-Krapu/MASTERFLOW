import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import type {CreateFactoryBackflowIntakeRequest} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createFactoryBackflowRouter} from '../src/routers/factory_backflow.ts';
import {
  createFactoryBackflowIntake,
  getFactoryBackflowIntake,
  listFactoryBackflowCandidateUpdates,
} from '../src/services/factory_backflow_intake.ts';
import {
  decideValidationInboxItem,
  listValidationInboxItems,
} from '../src/services/validation_inbox.ts';

const admin: AuthUser = {id: 'factory-backflow-admin', username: 'factory_backflow_admin', role: 'admin'};
const teacher: AuthUser = {id: 'factory-backflow-teacher', username: 'factory_backflow_teacher', role: 'teacher'};

let server: Server;
let base = '';
let adminToken = '';
let teacherToken = '';

function insertUser(user: AuthUser): void {
  const now = Date.now();
  getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(user.id, user.username, user.username, user.role, now, now);
}

function completeBackflow(suffix: string): CreateFactoryBackflowIntakeRequest {
  return {
    factory_passport: {
      factory_id: `factory-${suffix}`,
      factory_version: '1.0.0',
      target_platform: 'Claude Project',
      mission: 'Synthétiser des retours d’usage sans exposer de contenu privé.',
      owner_scope: 'owner:factory-admin',
      source_manifest: ['manifest:factory', 'prompt:system'],
      capability_profile: ['usage_harvest'],
      output_routes: ['backflow_inbox'],
      validation_gates: ['privacy', 'owner_review'],
      backflow_target: 'D11_FACTORIES_BACKFLOW',
      security_preflight_status: 'passed',
      simulation_status: 'passed',
      privacy_classification: 'PRIVATE',
    },
    factory_backflow_export: {
      export_id: `export-${suffix}`,
      factory_id: `factory-${suffix}`,
      factory_version: '1.0.0',
      source_session_ref: `session:${suffix}`,
      export_type: 'usage_harvester_backflow',
      summary: 'Deux ajustements anonymisés à revoir.',
      candidates: [
        {
          candidate_id: `candidate-${suffix}`,
          summary: 'Clarifier une garde de validation avant publication.',
          classification: 'SYSTEM',
        },
      ],
      private_content_removed: true,
      source_truth: 'portable_factory_export',
      validation_required: true,
      target_masterflow_owner: 'GODMODE_ROUTER',
      blocked_actions: ['auto_canon', 'runtime_activation'],
      recommended_next_action: 'Revoir le candidat dans la Validation Inbox.',
    },
  };
}

beforeAll(async () => {
  await seedAll();
  insertUser(admin);
  insertUser(teacher);
  adminToken = signToken(admin);
  teacherToken = signToken(teacher);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createFactoryBackflowRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('adresse serveur de test illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

describe('D11 — Factory Backflow Intake V6C', () => {
  it('reçoit un manifeste complet comme candidat Inbox admin-only, sans activer le runtime', () => {
    const intake = createFactoryBackflowIntake(admin, completeBackflow('complete'));
    expect(intake).toMatchObject({
      intake_status: 'candidate',
      review_status: 'pending',
      canon_status: 'candidate_only',
      candidate_count: 1,
    });

    const item = listValidationInboxItems(admin).find(
      (entry) => entry.source_kind === 'factory_backflow_intake' && entry.source_id === intake.intake_id,
    );
    expect(item).toMatchObject({
      item_type: 'factory_backflow',
      current_status: 'needs_review',
      privacy_scope: 'admin_only',
      output_readiness_state: 'blocked',
      decision_options: ['approve', 'park', 'reject', 'archive'],
    });
    expect(item?.blocked_actions).toEqual(expect.arrayContaining([
      'factory_zip_import',
      'external_url_fetch',
      'runtime_activation',
      'auto_canon',
    ]));
    expect(listValidationInboxItems(teacher).some((entry) => entry.source_id === intake.intake_id)).toBe(false);
  });

  it('met les dossiers incomplets ou non nettoyés en quarantaine et interdit leur approbation', () => {
    const intake = createFactoryBackflowIntake(admin, {
      factory_backflow_export: {
        export_id: 'export-private',
        private_content_removed: false,
      },
    });
    expect(intake.intake_status).toBe('quarantined');
    expect(intake.quarantine_reasons).toEqual(expect.arrayContaining([
      'missing_factory_passport',
      'private_content_not_removed',
      'missing_candidate_classification',
    ]));

    const item = listValidationInboxItems(admin).find(
      (entry) => entry.source_kind === 'factory_backflow_intake' && entry.source_id === intake.intake_id,
    );
    expect(item).toMatchObject({
      current_status: 'blocked',
      decision_options: ['request_precision', 'park', 'reject', 'archive'],
    });
    if (!item) throw new Error('item factory quarantined introuvable');
    expect(() => decideValidationInboxItem(admin, item.item_id, {decision: 'approve'})).toThrow(
      'factory_backflow_intake_quarantine_requires_precision',
    );
    expect(decideValidationInboxItem(admin, item.item_id, {
      decision: 'request_precision',
      note: 'Passeport, simulation et nettoyage privé requis.',
    }).current_status).toBe('blocked');
    expect(getFactoryBackflowIntake(intake.intake_id).review_status).toBe('parked');
  });

  it('n’accepte que le JSON structuré admin : ni ZIP/URL implicite, ni accès teacher', async () => {
    const teacherResponse = await fetch(`${base}/backflow/intake`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}`},
      body: JSON.stringify(completeBackflow('teacher')),
    });
    expect(teacherResponse.status).toBe(403);

    const invalidResponse = await fetch(`${base}/backflow/intake`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`},
      body: JSON.stringify({factory_archive_url: 'https://example.test/factory.zip'}),
    });
    expect(invalidResponse.status).toBe(400);

    const validResponse = await fetch(`${base}/backflow/intake`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}`},
      body: JSON.stringify(completeBackflow('http')),
    });
    expect(validResponse.status).toBe(201);
    expect((await validResponse.json()) as {intake_status: string}).toMatchObject({intake_status: 'candidate'});

    const teacherUpdates = await fetch(`${base}/backflow/candidate-updates`, {
      headers: {Authorization: `Bearer ${teacherToken}`},
    });
    expect(teacherUpdates.status).toBe(403);
  });

  it('matérialise seulement des candidate updates non routées après approbation', async () => {
    const intake = createFactoryBackflowIntake(admin, completeBackflow('decision'));
    const item = listValidationInboxItems(admin).find(
      (entry) => entry.source_kind === 'factory_backflow_intake' && entry.source_id === intake.intake_id,
    );
    if (!item) throw new Error('item factory candidat introuvable');
    const before = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
      usageLearning: (getDb().prepare('SELECT COUNT(*) AS count FROM usage_learning_candidates').get() as {count: number}).count,
    };
    const decided = decideValidationInboxItem(admin, item.item_id, {
      decision: 'approve',
      note: 'Candidat classé, sans import.',
    });
    const after = {
      actions: (getDb().prepare('SELECT COUNT(*) AS count FROM actions').get() as {count: number}).count,
      jobs: (getDb().prepare('SELECT COUNT(*) AS count FROM jobs').get() as {count: number}).count,
      usageLearning: (getDb().prepare('SELECT COUNT(*) AS count FROM usage_learning_candidates').get() as {count: number}).count,
    };

    expect(decided).toMatchObject({current_status: 'approved', output_readiness_state: 'blocked'});
    expect(getFactoryBackflowIntake(intake.intake_id)).toMatchObject({review_status: 'approved'});
    expect(listFactoryBackflowCandidateUpdates()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        intake_id: intake.intake_id,
        source_candidate_id: 'candidate-decision',
        classification: 'SYSTEM',
        routing_status: 'unrouted',
        target_domain: null,
        candidate_status: 'approved_candidate',
        canon_status: 'candidate_only',
      }),
    ]));
    const updates = await fetch(`${base}/backflow/candidate-updates`, {
      headers: {Authorization: `Bearer ${adminToken}`},
    });
    expect(updates.status).toBe(200);
    expect((await updates.json()) as Array<{intake_id: string}>).toEqual(expect.arrayContaining([
      expect.objectContaining({intake_id: intake.intake_id}),
    ]));
    expect(after).toEqual(before);
  });
});
