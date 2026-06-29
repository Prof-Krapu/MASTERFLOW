import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {ThemeStudioAssetPackPreviewSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {buildThemeStudioAssetPackPreview} from '../src/services/theme_studio.ts';
import {createVisualManifest, createVisualReference} from '../src/services/visual_manifests.ts';

const owner: AuthUser = {id: 'theme-studio-owner', username: 'theme_studio_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'theme-studio-outsider', username: 'theme_studio_outsider', role: 'teacher'};
const projectId = 'theme-studio-project';
const workbenchId = 'theme-studio-workbench';
const nodeId = 'theme-studio-node';
let manifestId: string;
let server: Server;
let base: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb().exec(`
    DELETE FROM visual_manifests WHERE owner_id IN ('${owner.id}', '${outsider.id}');
    DELETE FROM visual_references WHERE owner_id IN ('${owner.id}', '${outsider.id}');
    DELETE FROM story_nodes WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_workbenches WHERE id = '${workbenchId}';
    DELETE FROM project_members WHERE project_id = '${projectId}';
    DELETE FROM projects WHERE id = '${projectId}';
  `);
  const insertUser = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insertUser.run(owner.id, owner.username, owner.username, owner.role, now, now);
  insertUser.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
  getDb().prepare(
    `INSERT INTO projects (id, name, status, visibility, owner_id, created_at, updated_at)
     VALUES (?, 'Theme Studio', 'active', 'private', ?, ?, ?)`,
  ).run(projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES (?, ?, 'owner', ?)`,
  ).run(projectId, owner.id, now);
  getDb().prepare(
    `INSERT INTO story_workbenches
       (id, owner_id, project_id, project_scope, title, source_ref, intake_mode,
        source_truth_state, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'project', 'Ours d’Or Theme Studio', 'test://theme-studio',
       'draft_workbench', 'USER_PROVIDED', 'workshop_ready', ?, ?, ?)`,
  ).run(workbenchId, owner.id, projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO story_nodes
       (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order,
        spoiler_level, status, metadata_json, created_at, updated_at)
     VALUES (?, ?, NULL, ?, 'scene', 'Naissance Ours d’Or', 'Le monstre-idée apparaît dans le lore Ours d’Or.',
        1, 'none', 'active', '{}', ?, ?)`,
  ).run(nodeId, workbenchId, owner.id, now + 10, now + 10);
  const reference = createVisualReference(owner, {
    project_id: projectId,
    label: 'Référence Ours d’Or',
    source_ref: 'drive://ours-dor/reference',
    reference_status: 'poster_energy',
    provenance_state: 'validated',
    privacy_scope: 'project_private',
  });
  const manifest = createVisualManifest(owner, {
    project_id: projectId,
    request_title: 'Pack Ours d’Or',
    intent: 'Préparer un pack thème événementiel Ours d’Or sans génération automatique.',
    privacy_scope: 'project_private',
    canon_entity_refs: [`story_node:${nodeId}`],
    da_root_ref: 'theme:ours-dor',
    active_layers: ['golden_lore', 'monster_progression'],
    filters: ['no_unverified_reference'],
    output_family: 'visual_manifest_candidate',
    output_template: 'event_spread',
    source_truth_summary: 'Référence validée par le créateur.',
    reference_ids: [reference.reference_id],
    workbench_id: workbenchId,
    node_id: nodeId,
  });
  manifestId = manifest.manifest_id;

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

describe('Theme Studio asset pack preview', () => {
  it('projette un pack candidat sans application ni génération', () => {
    const preview = buildThemeStudioAssetPackPreview(owner, {manifest_id: manifestId, project_id: projectId});
    expect(preview.application_policy).toBe('preview_only');
    expect(preview.theme_pack.status).toBe('candidate');
    expect(preview.theme_pack.label).toContain('Ours');
    expect(preview.theme_pack.scope).toBe('project');
    expect(preview.lint_report.valid).toBe(true);
    expect(preview.locked_actions).toEqual(
      expect.arrayContaining(['apply_theme_pack', 'generate_asset', 'canonize_asset']),
    );
    expect(preview.asset_groups.map((group) => group.group_id)).toEqual(
      expect.arrayContaining(['identity', 'interface', 'event-lore', 'proofs']),
    );
    expect(ThemeStudioAssetPackPreviewSchema.parse(preview)).toMatchObject({application_policy: 'preview_only'});
  });

  it('protège le manifest privé', () => {
    expect(() => buildThemeStudioAssetPackPreview(outsider, {manifest_id: manifestId})).toThrow('visual_manifest_not_found');
  });

  it('expose le preview derrière authentification', async () => {
    const response = await fetch(`${base}/experience/theme-studio/asset-pack?manifest_id=${manifestId}`, {
      headers: {Authorization: `Bearer ${signToken(owner)}`},
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({application_policy: 'preview_only'});
  });
});
