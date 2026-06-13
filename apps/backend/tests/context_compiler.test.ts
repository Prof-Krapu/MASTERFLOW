import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  compileRuntimeContext,
  ContextCompilationError,
} from '../src/services/context_compiler.ts';

const owner: AuthUser = {id: 'ctx-owner', username: 'ctx_owner', role: 'teacher'};
const member: AuthUser = {id: 'ctx-member', username: 'ctx_member', role: 'student'};
const outsider: AuthUser = {id: 'ctx-outsider', username: 'ctx_outsider', role: 'godmode'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, member, outsider]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  db.prepare(
    `INSERT OR IGNORE INTO projects
       (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('ctx-project', ?, 'Context project', 'active', 'private', ?, ?)`,
  ).run(owner.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
     VALUES ('ctx-project', ?, 'owner', ?), ('ctx-project', ?, 'participant', ?)`,
  ).run(owner.id, now, member.id, now);
  db.prepare(
    `INSERT OR IGNORE INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES ('ctx-room', 'Context Room', 'workspace', ?, 'ctx-project',
             '{"allowed_action_ids":["create_project","does_not_exist"]}', 0, ?, ?)`,
  ).run(owner.id, now, now);

  const insertResource = db.prepare(
    `INSERT OR IGNORE INTO resources
       (id, type, title, source, status, subjects_json, created_at)
     VALUES (?, 'document', ?, 'context-test', ?, '[]', ?)`,
  );
  insertResource.run('ctx-resource-valid', 'Validated', 'validated', now);
  insertResource.run('ctx-resource-candidate', 'Candidate secret title', 'candidate', now);
  db.prepare(
    `INSERT OR IGNORE INTO resource_scopes
       (resource_id, scope_type, scope_id, access_level, created_at)
     VALUES (?, 'project', 'ctx-project', 'read', ?), (?, 'project', 'ctx-project', 'read', ?)`,
  ).run('ctx-resource-valid', now, 'ctx-resource-candidate', now);

  db.prepare(
    `INSERT OR IGNORE INTO inventory_collections
       (id, owner_id, project_id, scope_type, label, visibility_scope, validation_status,
        completion_state, created_at, updated_at)
     VALUES
       ('ctx-collection-valid', ?, 'ctx-project', 'project', 'Validated collection',
        'project', 'validated', 'unknown', ?, ?),
       ('ctx-collection-candidate', ?, 'ctx-project', 'project', 'Private candidate collection',
        'project', 'candidate', 'unknown', ?, ?)`,
  ).run(owner.id, now, now, owner.id, now, now);
  db.prepare(
    `INSERT OR IGNORE INTO inventory_items
       (id, owner_id, project_id, collection_id, scope_type, type, label, item_status,
        validation_status, quantity, usage_tags_json, source_refs_json, visibility_scope,
        created_at, updated_at)
     VALUES
       ('ctx-inventory-valid', ?, 'ctx-project', 'ctx-collection-valid', 'project', 'gear',
        'Validated camera', 'owned_confirmed', 'validated', 1, '[]', '[]', 'project', ?, ?),
       ('ctx-inventory-candidate', ?, 'ctx-project', NULL, 'project', 'gear',
        'Private candidate camera', 'detected', 'candidate', 1, '[]', '[]', 'project', ?, ?)`,
  ).run(owner.id, now, now, owner.id, now, now);
});

describe('context compiler T1/T2', () => {
  it('compile seulement des references autorisees et validees', () => {
    const envelope = compileRuntimeContext(member, {
      purpose: 'room_bootstrap',
      requested_tier: 'T2',
      room_id: 'ctx-room',
    });

    expect(envelope.scope).toMatchObject({project_id: 'ctx-project', room_id: 'ctx-room'});
    expect(envelope.authoritative_facts).toContainEqual(
      expect.objectContaining({ref_type: 'resource', ref_id: 'ctx-resource-valid'}),
    );
    expect(envelope.authoritative_facts).not.toContainEqual(
      expect.objectContaining({ref_id: 'ctx-resource-candidate'}),
    );
    expect(envelope.trace.rejected_refs).toContainEqual({
      ref_type: 'resource',
      ref_id: 'ctx-resource-candidate',
      reason: 'resource_not_validated',
    });
    expect(JSON.stringify(envelope)).not.toContain('Candidate secret title');
  });

  it('refuse une room projet a un outsider, meme godmode', () => {
    expect(() =>
      compileRuntimeContext(outsider, {
        purpose: 'room_bootstrap',
        requested_tier: 'T1',
        room_id: 'ctx-room',
      }),
    ).toThrow(ContextCompilationError);
  });

  it('borne les tiers et le budget de contexte', () => {
    const envelope = compileRuntimeContext(owner, {
      purpose: 'deep_debug_attempt',
      requested_tier: 'T5',
      room_id: 'ctx-room',
    });
    expect(envelope.trace.granted_tier).toBe('T2');
    expect(envelope.trace.rejected_refs).toContainEqual({
      ref_type: 'context_tier',
      ref_id: 'T5',
      reason: 'runtime_tier_capped_at_T2',
    });
    expect(envelope.trace.budget.used_refs).toBeLessThanOrEqual(envelope.trace.budget.max_refs);
    expect(envelope.trace.budget.used_chars).toBeLessThanOrEqual(envelope.trace.budget.max_chars);
  });

  it('ne publie aucun pouvoir implicite et seulement un persona fallback', () => {
    const envelope = compileRuntimeContext(owner, {
      purpose: 'room_bootstrap',
      requested_tier: 'T1',
      room_id: 'ctx-room',
    });
    expect(envelope.allowed_action_ids).not.toContain('does_not_exist');
    expect(envelope.allowed_action_ids.every((id) => typeof id === 'string')).toBe(true);
    expect(envelope.allowed_persona_ids).toEqual(['masterflow-system-001']);
  });

  it('attache un pack RAG derive cite sans le confondre avec les faits', () => {
    const envelope = compileRuntimeContext(owner, {
      purpose: 'project_assistance',
      requested_tier: 'T2',
      room_id: 'ctx-room',
      rag_query: 'information absente',
    });
    expect(envelope.rag_context_pack_ref).toMatchObject({
      ref_type: 'rag_context_pack',
      authority: 'derived',
    });
    expect(envelope.authoritative_facts).not.toContainEqual(
      expect.objectContaining({ref_type: 'rag_context_pack'}),
    );
    expect(envelope.trace.uncertainty).toContain('rag:no_reliable_source');
  });

  it('charge les references Inventory validees seulement dans un contexte explicite', () => {
    const envelope = compileRuntimeContext(member, {
      purpose: 'inventory_search',
      requested_tier: 'T2',
      room_id: 'ctx-room',
      rag_query: 'camera',
    });

    expect(envelope.authoritative_facts).toContainEqual(
      expect.objectContaining({
        ref_type: 'inventory_item',
        ref_id: 'ctx-inventory-valid',
        scope_type: 'project',
      }),
    );
    expect(envelope.authoritative_facts).toContainEqual(
      expect.objectContaining({
        ref_type: 'inventory_collection',
        ref_id: 'ctx-collection-valid',
      }),
    );
    expect(JSON.stringify(envelope)).not.toContain('ctx-inventory-candidate');
    expect(JSON.stringify(envelope)).not.toContain('ctx-collection-candidate');

    const pack = getDb()
      .prepare('SELECT filters_json FROM rag_context_packs WHERE id = ?')
      .get(envelope.rag_context_pack_ref?.ref_id) as {filters_json: string};
    expect(JSON.parse(pack.filters_json)).toMatchObject({
      active_app: 'inventory',
      entity_refs: [
        'inventory_item:ctx-inventory-valid',
        'inventory_collection:ctx-collection-valid',
      ],
      sensitivity: 'internal',
    });
  });

  it('ne charge pas Inventory dans une room projet sans signal explicite', () => {
    const envelope = compileRuntimeContext(member, {
      purpose: 'room_bootstrap',
      requested_tier: 'T2',
      room_id: 'ctx-room',
    });

    expect(envelope.authoritative_facts).not.toContainEqual(
      expect.objectContaining({ref_type: 'inventory_item'}),
    );
    expect(envelope.authoritative_facts).not.toContainEqual(
      expect.objectContaining({ref_type: 'inventory_collection'}),
    );
  });
});
