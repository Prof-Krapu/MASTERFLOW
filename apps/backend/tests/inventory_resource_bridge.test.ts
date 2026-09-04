import {randomUUID} from 'node:crypto';

import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {proposeResource} from '../src/engines/resource_truth.ts';
import {audit} from '../src/lib/audit.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  importPersonalResourceProposals,
  mirrorResourceProposalIntoInventory,
  shareInventoryItemToProject,
  validateInventoryItem,
} from '../src/services/inventory.ts';
import {createProject} from '../src/services/projects.ts';

const actor: AuthUser = {
  id: `resource-bridge-${randomUUID()}`,
  username: `resource_bridge_${randomUUID()}`,
  role: 'teacher',
};

beforeAll(() => {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, 'Resource bridge', 'x', ?, 1, ?, ?)
  `).run(actor.id, actor.username, actor.role, now, now);
});

describe('Resource personnel → Inventory → projet → Link Engine', () => {
  it('miroite une vidéo personnelle de façon idempotente puis la partage au projet', () => {
    const resource = proposeResource({
      type: 'video',
      title: 'Référence vidéo personnelle',
      url: 'https://www.youtube.com/watch?v=masterflow',
      source: 'test_owner_input',
      subjects: ['motion'],
    });
    const first = mirrorResourceProposalIntoInventory(actor, resource);
    const second = mirrorResourceProposalIntoInventory(actor, resource);
    expect(first.created).toBe(true);
    expect(second).toMatchObject({created: false, item: {item_id: first.item.item_id}});
    expect(first.item).toMatchObject({
      owner_id: actor.id,
      project_id: null,
      type: 'video',
      scope_type: 'user',
      visibility_scope: 'private',
    });

    validateInventoryItem(actor, first.item.item_id);
    const project = createProject(actor, {name: 'Projet ressources multiples'});
    const secondProject = createProject(actor, {name: 'Second projet ressources multiples'});
    const shared = shareInventoryItemToProject(actor, first.item.item_id, project.project_id);
    const repeated = shareInventoryItemToProject(actor, first.item.item_id, project.project_id);
    const sharedAgain = shareInventoryItemToProject(actor, first.item.item_id, secondProject.project_id);

    expect(shared).toMatchObject({
      created: true,
      item: {
        project_id: project.project_id,
        type: 'video',
        validation_status: 'validated',
        visibility_scope: 'project',
      },
    });
    expect(repeated).toMatchObject({created: false, item: {item_id: shared.item.item_id}});
    expect(sharedAgain).toMatchObject({
      created: true,
      item: {project_id: secondProject.project_id, type: 'video'},
    });
    expect(sharedAgain.item.item_id).not.toBe(shared.item.item_id);
    expect(getDb().prepare(
      "SELECT scope_type, scope_id, status FROM rag_resources WHERE resource_id = ?",
    ).get(`inventory-item:${shared.item.item_id}`)).toEqual({
      scope_type: 'project',
      scope_id: project.project_id,
      status: 'validated',
    });
  });

  it('récupère les anciennes propositions attribuées à l’utilisateur par l’audit', () => {
    const resource = proposeResource({
      type: 'link',
      title: 'Ancienne ressource personnelle',
      url: 'https://example.test/reference',
      source: 'legacy_frontend_proposal',
      subjects: ['création'],
    });
    audit({
      event_type: 'resource.proposed',
      user_id: actor.id,
      scope: 'resource',
      detail: {resource_id: resource.id},
    });

    const imported = importPersonalResourceProposals(actor);
    const repeated = importPersonalResourceProposals(actor);
    expect(imported.imported).toBeGreaterThanOrEqual(1);
    expect(imported.items).toContainEqual(expect.objectContaining({
      owner_id: actor.id,
      label: resource.title,
      type: 'link',
    }));
    expect(repeated.already_present).toBeGreaterThanOrEqual(1);
  });
});
