import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  archiveInventoryItem,
  createInventoryItem,
  indexInventoryItem,
  validateInventoryItem,
} from '../src/services/inventory.ts';
import {getRagContextPack, queryRag} from '../src/services/rag.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const owner: AuthUser = {id: 'inv-rag-owner', username: 'inv_rag_owner', role: 'teacher'};
const member: AuthUser = {id: 'inv-rag-member', username: 'inv_rag_member', role: 'student'};
let projectId = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, member]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(owner, {name: 'Inventory RAG project'});
  projectId = project.project_id;
  addProjectMember(owner, projectId, {user_id: member.id, role: 'participant'});
});

describe('PR-INV-3 — Inventory RAG derive', () => {
  it('refuse une candidate et indexe explicitement un item valide', () => {
    const item = createInventoryItem(owner, {
      project_id: projectId,
      type: 'tool',
      label: 'Perceuse de precision',
      creator_or_brand: 'Proxxon',
      usage_tags: ['maquette', 'atelier'],
    });
    expect(() => indexInventoryItem(owner, item.item_id)).toThrow(
      'inventory_item_not_validated',
    );

    validateInventoryItem(owner, item.item_id);
    const rag = indexInventoryItem(owner, item.item_id);
    expect(rag).toMatchObject({
      source_type: 'inventory_item',
      status: 'validated',
      trust_status: 'private_reference',
      scope_type: 'project',
      scope_id: projectId,
    });

    const response = queryRag(member, {
      query: 'perceuse precision maquette',
      project_id: projectId,
      purpose: 'inventory',
      active_app: 'inventory',
    });
    expect(response.refusal_reason).toBeNull();
    expect(response.context_pack.citations).toContainEqual(
      expect.objectContaining({
        resource_id: rag.rag_resource_id,
        source_uri: `inventory://item/${item.item_id}`,
        scope_id: projectId,
      }),
    );
  });

  it('archive l item et rend le pack existant stale', () => {
    const item = createInventoryItem(owner, {
      project_id: projectId,
      type: 'art_supply',
      label: 'Pigment outremer rare',
    });
    validateInventoryItem(owner, item.item_id);
    indexInventoryItem(owner, item.item_id);
    const response = queryRag(member, {
      query: 'pigment outremer rare',
      project_id: projectId,
      purpose: 'inventory',
    });
    expect(response.context_pack.status).toBe('active');

    archiveInventoryItem(owner, item.item_id);
    expect(getRagContextPack(member, response.context_pack.pack_id).status).toBe('stale');
    const indexed = getDb()
      .prepare(`SELECT status, indexed_at FROM rag_resources WHERE resource_id = ?`)
      .get(`inventory-item:${item.item_id}`) as {status: string; indexed_at: number | null};
    expect(indexed).toEqual({status: 'archived', indexed_at: null});
  });
});
