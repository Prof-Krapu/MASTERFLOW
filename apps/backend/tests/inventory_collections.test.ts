import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createCollectionMatch,
  createInventoryCollection,
  createInventoryItem,
  findInventoryDuplicateCandidates,
  listCollectionMatches,
  resolveCollectionMatch,
  setInventoryCollectionCompletion,
  validateInventoryCollection,
} from '../src/services/inventory.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const owner: AuthUser = {id: 'inv-col-owner', username: 'inv_col_owner', role: 'teacher'};
const member: AuthUser = {id: 'inv-col-member', username: 'inv_col_member', role: 'student'};
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
  const project = createProject(owner, {name: 'Collection Graph'});
  projectId = project.project_id;
  addProjectMember(owner, projectId, {user_id: member.id, role: 'participant'});
});

describe('PR-INV-4 — Collection Graph', () => {
  it('confirme ou rejette un match sans modifier ownership', () => {
    const collection = createInventoryCollection(owner, {
      project_id: projectId,
      label: 'Artbooks projet',
    });
    validateInventoryCollection(owner, collection.collection_id);
    const item = createInventoryItem(owner, {
      project_id: projectId,
      type: 'artbook',
      label: 'The Art of Test',
    });
    const match = createCollectionMatch(owner, collection.collection_id, {
      item_id: item.item_id,
      confidence: 0.84,
      source_ref: 'ocr:collection',
    });
    expect(match.match_status).toBe('candidate');
    const confirmed = resolveCollectionMatch(owner, match.match_id, {decision: 'confirmed'});
    expect(confirmed.match_status).toBe('confirmed');
    const row = getDb()
      .prepare('SELECT owner_id, collection_id FROM inventory_items WHERE id = ?')
      .get(item.item_id) as {owner_id: string; collection_id: string};
    expect(row).toEqual({owner_id: owner.id, collection_id: collection.collection_id});

    const second = createInventoryItem(owner, {
      project_id: projectId,
      type: 'artbook',
      label: 'Rejected artbook',
    });
    const rejected = resolveCollectionMatch(
      owner,
      createCollectionMatch(owner, collection.collection_id, {item_id: second.item_id}).match_id,
      {decision: 'rejected'},
    );
    expect(rejected.match_status).toBe('rejected');
  });

  it('rend la completion declarative et les matches lisibles apres validation', () => {
    const collection = createInventoryCollection(owner, {
      project_id: projectId,
      label: 'Collection selective',
    });
    validateInventoryCollection(owner, collection.collection_id);
    const updated = setInventoryCollectionCompletion(owner, collection.collection_id, {
      completion_state: 'selective',
    });
    expect(updated.completion_state).toBe('selective');
    expect(listCollectionMatches(member, collection.collection_id)).toEqual([]);
  });

  it('detecte les doublons comme candidats sans fusion automatique', () => {
    const first = createInventoryItem(owner, {
      project_id: projectId,
      type: 'book',
      label: 'Design Systems',
      creator_or_brand: 'Auteur Test',
    });
    const second = createInventoryItem(owner, {
      project_id: projectId,
      type: 'book',
      label: 'Design Systems',
      creator_or_brand: 'Auteur Test',
    });
    const duplicates = findInventoryDuplicateCandidates(owner, second.item_id);
    expect(duplicates).toContainEqual(expect.objectContaining({item_id: first.item_id}));
    const rows = getDb()
      .prepare('SELECT id FROM inventory_items WHERE id IN (?, ?)')
      .all(first.item_id, second.item_id);
    expect(rows).toHaveLength(2);
  });
});
