import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createInventoryItem,
  createInventoryProjectNeed,
  matchInventoryProjectNeed,
  searchInventory,
  validateInventoryItem,
} from '../src/services/inventory.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';

const owner: AuthUser = {id: 'inv-search-owner', username: 'inv_search_owner', role: 'teacher'};
const member: AuthUser = {id: 'inv-search-member', username: 'inv_search_member', role: 'student'};
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
  const project = createProject(owner, {name: 'Inventory needs'});
  projectId = project.project_id;
  addProjectMember(owner, projectId, {user_id: member.id, role: 'participant'});
});

describe('PR-INV-5 — recherche et besoins projet', () => {
  it('recherche uniquement les items valides et ne garantit jamais la disponibilite', () => {
    const candidate = createInventoryItem(owner, {
      project_id: projectId,
      type: 'gear',
      label: 'Camera cinema candidate',
      item_status: 'owned_declared',
    });
    const validated = createInventoryItem(owner, {
      project_id: projectId,
      type: 'gear',
      label: 'Camera cinema validee',
      item_status: 'owned_confirmed',
      usage_tags: ['tournage'],
    });
    validateInventoryItem(owner, validated.item_id);
    const results = searchInventory(member, {
      query: 'camera cinema tournage',
      project_id: projectId,
    });
    expect(results).toContainEqual(
      expect.objectContaining({
        item: expect.objectContaining({item_id: validated.item_id}),
        availability_state: 'candidate_available',
        availability_guaranteed: false,
      }),
    );
    expect(results).not.toContainEqual(
      expect.objectContaining({item: expect.objectContaining({item_id: candidate.item_id})}),
    );
  });

  it('retourne unknown sans inventaire complet et missing seulement sur declaration explicite', () => {
    const need = createInventoryProjectNeed(owner, {
      project_id: projectId,
      label: 'Objectif anamorphique introuvable',
      required_tags: ['anamorphique'],
    });
    expect(
      matchInventoryProjectNeed(member, need.need_id, {
        inventory_complete_declared: false,
      }).coverage_state,
    ).toBe('unknown');
    expect(
      matchInventoryProjectNeed(member, need.need_id, {
        inventory_complete_declared: true,
      }).coverage_state,
    ).toBe('missing');
  });
});
