import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';
import {
  getRagContextPack,
  queryRag,
  registerRagResource,
  requestRagReindex,
  revokeRagResource,
} from '../src/services/rag.ts';

const teacher: AuthUser = {id: 'rag-service-teacher', username: 'rag_service_teacher', role: 'teacher'};
const student: AuthUser = {id: 'rag-service-student', username: 'rag_service_student', role: 'student'};
const outsider: AuthUser = {id: 'rag-service-outsider', username: 'rag_service_outsider', role: 'student'};
const admin: AuthUser = {id: 'rag-service-admin', username: 'rag_service_admin', role: 'admin'};

let projectId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, outsider, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(teacher, {name: 'Projet RAG PR-7'});
  projectId = project.project_id;
  addProjectMember(teacher, projectId, {user_id: student.id, role: 'participant'});

  const insertResource = getDb().prepare(
    `INSERT OR IGNORE INTO resources
       (id, type, title, url, source, status, subjects_json, created_at)
     VALUES (?, 'document', ?, ?, 'rag-test', ?, '[]', ?)`,
  );
  insertResource.run(
    'resource-rag-validated',
    'Guide MasterFlow fiable',
    'storage://verified/masterflow.md',
    'validated',
    now,
  );
  insertResource.run(
    'resource-rag-candidate',
    'Guide candidat non valide',
    'storage://candidate/masterflow.md',
    'candidate',
    now,
  );
});

describe('PR-7 — service RAG permissionne', () => {
  it('retrouve une source validee du projet avec citation et audit hashe', () => {
    const resource = registerRagResource(teacher, {
      resource_id: 'resource-rag-validated',
      project_id: projectId,
      source_type: 'markdown',
      source_uri: 'storage://verified/masterflow.md',
      chunks: [
        'MasterFlow utilise des projets prives et des templates versionnes.',
        'Les context packs doivent toujours contenir des citations.',
      ],
    });

    const response = queryRag(student, {query: 'templates versionnes', project_id: projectId, limit: 5});
    expect(response.refusal_reason).toBeNull();
    expect(response.context_pack.citations).toContainEqual(
      expect.objectContaining({
        resource_id: resource.rag_resource_id,
        title: 'Guide MasterFlow fiable',
        source_uri: 'storage://verified/masterflow.md',
        status: 'validated',
        trust_status: 'source_verified',
        scope_type: 'project',
        scope_id: projectId,
      }),
    );

    const event = getDb()
      .prepare('SELECT query_hash, result_count FROM rag_query_events WHERE user_id = ? ORDER BY created_at DESC')
      .get(student.id) as {query_hash: string; result_count: number};
    expect(event.query_hash).toHaveLength(64);
    expect(event.query_hash).not.toContain('templates');
    expect(event.result_count).toBeGreaterThan(0);
  });

  it('refuse hors scope sans fuite de titre, snippet ou score', () => {
    const response = queryRag(outsider, {query: 'MasterFlow templates', project_id: projectId});
    expect(response.refusal_reason).toBe('scope_denied');
    expect(response.context_pack.citations).toEqual([]);
    expect(JSON.stringify(response)).not.toContain('Guide MasterFlow fiable');
  });

  it('ne sert pas une candidate comme source fiable', () => {
    registerRagResource(teacher, {
      resource_id: 'resource-rag-candidate',
      project_id: projectId,
      source_type: 'markdown',
      source_uri: 'storage://candidate/masterflow.md',
      chunks: ['Information candidate spectaculaire jamais validee.'],
    });
    const response = queryRag(student, {
      query: 'spectaculaire jamais validee',
      project_id: projectId,
    });
    expect(response.refusal_reason).toBe('no_reliable_source');
    expect(response.context_pack.citations).toEqual([]);
  });

  it('refuse les secrets avant creation de chunk', () => {
    expect(() =>
      registerRagResource(teacher, {
        resource_id: 'resource-rag-validated',
        source_type: 'text',
        source_uri: '.env',
        chunks: ['API_KEY=super-secret'],
      }),
    ).toThrow('rag_secret_detected');
  });

  it('revoque la ressource et rend les context packs existants stale', () => {
    const source = getDb()
      .prepare(
        `SELECT id FROM rag_resources
         WHERE resource_id = 'resource-rag-validated' AND project_id = ?`,
      )
      .get(projectId) as {id: string};
    const before = queryRag(student, {query: 'context packs citations', project_id: projectId});
    expect(before.context_pack.status).toBe('active');

    const revoked = revokeRagResource(admin, source.id);
    expect(revoked.status).toBe('revoked');
    expect(getRagContextPack(student, before.context_pack.pack_id).status).toBe('stale');

    const after = queryRag(student, {query: 'context packs citations', project_id: projectId});
    expect(after.refusal_reason).toBe('no_reliable_source');
  });

  it('cree un job rag_reindex et retire temporairement les chunks du retrieval', () => {
    getDb()
      .prepare(
        `INSERT OR IGNORE INTO resources
           (id, type, title, url, source, status, subjects_json, created_at)
         VALUES ('resource-rag-reindex', 'document', 'Ressource reindex',
                 'storage://verified/reindex.md', 'rag-test', 'validated', '[]', ?)`,
      )
      .run(Date.now());
    const resource = registerRagResource(teacher, {
      resource_id: 'resource-rag-reindex',
      project_id: projectId,
      source_type: 'markdown',
      source_uri: 'storage://verified/reindex.md',
      chunks: ['Reindex lexical permissionne test.'],
    });
    const job = requestRagReindex(teacher, resource.rag_resource_id);
    expect(job).toMatchObject({type: 'rag_reindex', status: 'queued', scope_id: projectId});

    const response = queryRag(student, {query: 'reindex lexical', project_id: projectId});
    expect(response.context_pack.citations).not.toContainEqual(
      expect.objectContaining({resource_id: resource.rag_resource_id}),
    );
  });
});
