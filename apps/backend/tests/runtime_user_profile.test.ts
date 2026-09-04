import {randomUUID} from 'node:crypto';

import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createInventoryItem, validateInventoryItem} from '../src/services/inventory.ts';
import {createProject} from '../src/services/projects.ts';
import {getRuntimeUserProfile} from '../src/services/runtime_user_profile.ts';
import {createSkillTreeNode} from '../src/services/skill_tree.ts';

const actor: AuthUser = {
  id: `runtime-profile-${randomUUID()}`,
  username: `runtime_profile_${randomUUID()}`,
  role: 'teacher',
};

beforeAll(() => {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, 'Profil dynamique', 'x', ?, 1, ?, ?)
  `).run(actor.id, actor.username, actor.role, now, now);
});

describe('profil runtime privé', () => {
  it('agrège uniquement les données réelles du compte authentifié', () => {
    const video = createInventoryItem(actor, {
      type: 'video',
      label: 'Vidéo du profil',
      item_status: 'owned_declared',
      source_refs: ['https://example.test/video'],
    });
    validateInventoryItem(actor, video.item_id);
    createProject(actor, {name: 'Projet du profil'});
    createSkillTreeNode(actor, {
      label: 'Capacité personnelle visible',
      node_type: 'capability',
      status: 'available',
    });

    const profile = getRuntimeUserProfile(actor);
    expect(profile.user).toMatchObject({id: actor.id, display_name: 'Profil dynamique'});
    expect(profile.inventory).toMatchObject({total: 1, videos: 1, validated: 1});
    expect(profile.declared_resources).toEqual({
      total: 0,
      videos: 0,
      links: 0,
      documents: 0,
      attached_to_inventory: 0,
      pending_inventory: 0,
    });
    expect(profile.projects_count).toBe(1);
    expect(profile.skill_tree).toHaveLength(1);
    expect(profile.skill_tree[0]).toMatchObject({owner_id: actor.id, label: 'Capacité personnelle visible'});
    expect(profile.learning_profile).toBeNull();
  });

  it('projette les 49 vidéos déclarées de MALEX sans les inventer dans Inventory', () => {
    const declaredSource = 'canon:MASTERFLOW_ROUTING_PEDAGO:2.1';
    const previousSources = process.env.MASTERFLOW_DECLARED_RESOURCE_SOURCES_JSON;
    process.env.MASTERFLOW_DECLARED_RESOURCE_SOURCES_JSON = JSON.stringify({malex: [declaredSource]});
    const declaredCount = getDb().prepare(
      'SELECT COUNT(*) AS count FROM resources WHERE source = ?',
    ).get(declaredSource) as {count: number};
    const insertedResourceIds: string[] = [];
    if (declaredCount.count === 0) {
      const insertResource = getDb().prepare(`
        INSERT INTO resources (id, type, title, url, source, status, subjects_json, created_at)
        VALUES (?, 'tutorial_video', ?, NULL, ?, 'validated', '[]', ?)
      `);
      const now = Date.now();
      for (let index = 1; index <= 49; index += 1) {
        const id = `runtime-profile-declared-video-${index}`;
        insertResource.run(id, `Vidéo déclarée ${index}`, declaredSource, now);
        insertedResourceIds.push(id);
      }
    }
    let malex = getDb().prepare(
      "SELECT id, username, role FROM users WHERE username = 'malex' AND active = 1",
    ).get() as AuthUser | undefined;
    if (!malex) {
      const id = `runtime-profile-malex-${randomUUID()}`;
      const now = Date.now();
      getDb().prepare(`
        INSERT INTO users (id, username, display_name, password_hash, role, active, created_at, updated_at)
        VALUES (?, 'malex', 'MALEX', 'x', 'teacher', 1, ?, ?)
      `).run(id, now, now);
      malex = {id, username: 'malex', role: 'teacher'};
    }
    expect(malex).toBeDefined();
    try {
      const profile = getRuntimeUserProfile(malex!);
      expect(profile.declared_resources).toMatchObject({
        total: 49,
        videos: 49,
        attached_to_inventory: 0,
        pending_inventory: 49,
      });
      expect(profile.inventory.total).toBe(0);
    } finally {
      if (previousSources === undefined) delete process.env.MASTERFLOW_DECLARED_RESOURCE_SOURCES_JSON;
      else process.env.MASTERFLOW_DECLARED_RESOURCE_SOURCES_JSON = previousSources;
      if (insertedResourceIds.length > 0) {
        getDb().prepare(`
          DELETE FROM resources
          WHERE id IN (${insertedResourceIds.map(() => '?').join(',')})
        `).run(...insertedResourceIds);
      }
    }
  });
});
