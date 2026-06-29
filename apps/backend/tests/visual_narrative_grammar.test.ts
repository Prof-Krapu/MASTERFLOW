import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {VisualNarrativeGrammarReportSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {buildVisualNarrativeGrammarReport} from '../src/services/visual_narrative_grammar.ts';
import {createVisualManifest, createVisualReference} from '../src/services/visual_manifests.ts';

const owner: AuthUser = {id: 'visual-grammar-owner', username: 'visual_grammar_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'visual-grammar-outsider', username: 'visual_grammar_outsider', role: 'teacher'};
const projectId = 'visual-grammar-project';
const workbenchId = 'visual-grammar-workbench';
const nodeId = 'visual-grammar-node';
let server: Server;
let base: string;
let canonicalManifestId: string;
let weakManifestId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb().exec(`
    DELETE FROM visual_manifests WHERE owner_id IN ('${owner.id}', '${outsider.id}');
    DELETE FROM visual_references WHERE owner_id IN ('${owner.id}', '${outsider.id}');
    DELETE FROM narrative_events WHERE workbench_id = '${workbenchId}';
    DELETE FROM story_characters WHERE workbench_id = '${workbenchId}';
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
     VALUES (?, 'Visual Grammar', 'active', 'private', ?, ?, ?)`,
  ).run(projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES (?, ?, 'owner', ?)`,
  ).run(projectId, owner.id, now);
  getDb().prepare(
    `INSERT INTO story_workbenches
       (id, owner_id, project_id, project_scope, title, source_ref, intake_mode,
        source_truth_state, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'project', 'Visual Grammar Workbench', 'test://visual-grammar',
       'draft_workbench', 'USER_PROVIDED', 'workshop_ready', ?, ?, ?)`,
  ).run(workbenchId, owner.id, projectId, owner.id, now, now);
  getDb().prepare(
    `INSERT INTO story_nodes
       (id, workbench_id, parent_id, owner_id, node_type, title, summary, sort_order,
        spoiler_level, status, metadata_json, created_at, updated_at)
     VALUES
       (?, ?, NULL, ?, 'scene', 'Naissance du compagnon', 'Le compagnon visuel apparaît en version V0.',
        1, 'none', 'active', '{}', ?, ?),
       ('visual-grammar-payoff', ?, NULL, ?, 'beat', 'Évolution révélée', 'Le motif doré devient un signe de progression.',
        2, 'major', 'locked', '{}', ?, ?)`,
  ).run(nodeId, workbenchId, owner.id, now + 20, now + 20, workbenchId, owner.id, now + 30, now + 30);

  const reference = createVisualReference(owner, {
    project_id: projectId,
    label: 'Canon compagnon V0',
    source_ref: 'drive://visual/canon-compagnon-v0',
    reference_status: 'poster_energy',
    provenance_state: 'validated',
    privacy_scope: 'project_private',
  });
  const canonicalManifest = createVisualManifest(owner, {
    project_id: projectId,
    request_title: 'Compagnon V0',
    intent: 'Expliquer le premier visuel du compagnon et son rôle narratif.',
    privacy_scope: 'project_private',
    canon_entity_refs: [`story_node:${nodeId}`],
    da_root_ref: 'theme:ours-dor',
    active_layers: ['golden_lore', 'companion_intro'],
    filters: ['no_unverified_reference'],
    output_family: 'visual_manifest_candidate',
    output_template: 'event_spread',
    source_truth_summary: 'Référence canon validée par le créateur.',
    reference_ids: [reference.reference_id],
    workbench_id: workbenchId,
    node_id: nodeId,
  });
  const weakManifest = createVisualManifest(owner, {
    project_id: projectId,
    request_title: 'Évolution sans preuve',
    intent: 'Evolution visuelle candidate sans référence suffisante.',
    privacy_scope: 'project_private',
    canon_entity_refs: [],
    da_root_ref: 'theme:ours-dor',
    active_layers: ['mutation_shadow'],
    filters: ['no_silent_style_drift'],
    output_family: 'visual_manifest_candidate',
    output_template: 'badge_reward',
    source_truth_summary: 'Hypothèse à vérifier avant génération.',
    reference_ids: [],
    workbench_id: workbenchId,
    node_id: null,
  });
  canonicalManifestId = canonicalManifest.manifest_id;
  weakManifestId = weakManifest.manifest_id;

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

describe('Visual Narrative Grammar', () => {
  it('projette D08, canon narratif et thème sans exécuter de génération', () => {
    const report = buildVisualNarrativeGrammarReport(owner, {workbench_id: workbenchId});
    expect(report.execution_policy).toBe('explain_only');
    expect(report.manifest_refs).toEqual(
      expect.arrayContaining([`visual_manifest:${canonicalManifestId}`, `visual_manifest:${weakManifestId}`]),
    );
    expect(report.narrative_fact_refs).toContain(`fact:story_node:${nodeId}`);
    expect(report.grammar.theme_ref).toBe('theme:ours-dor');
    expect(report.grammar.visual_elements.map((element) => element.label)).toEqual(
      expect.arrayContaining(['event_spread', 'golden_lore', 'companion_intro']),
    );
    expect(report.grammar.emotional_arc.length).toBeGreaterThan(0);
    expect(report.diagnostics.missing_continuity_refs).toContain(`visual_manifest:${weakManifestId}`);
    expect(report.diagnostics.unjustified_evolution).toContain(`visual_manifest:${weakManifestId}`);
    expect(report.diagnostics.decorative_motif_without_function).toHaveLength(0);
    expect(VisualNarrativeGrammarReportSchema.parse(report)).toMatchObject({execution_policy: 'explain_only'});
  });

  it('explique un manifest isolé sans nécessiter le project_id côté UI', () => {
    const report = buildVisualNarrativeGrammarReport(owner, {manifest_id: canonicalManifestId});
    expect(report.manifest_refs).toEqual([`visual_manifest:${canonicalManifestId}`]);
    expect(report.explanation_cards[0]?.title).toContain('Compagnon V0');
    expect(report.grammar.scope_ref).toBe(`story_workbench:${workbenchId}`);
  });

  it('protège les workbenches privés', () => {
    expect(() => buildVisualNarrativeGrammarReport(outsider, {workbench_id: workbenchId})).toThrow('workbench_not_found');
  });

  it('expose le rapport via HTTP', async () => {
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(`${base}/experience/visual-grammar?workbench_id=${workbenchId}`, {headers});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({execution_policy: 'explain_only'});
  });

  it('refuse une requête sans workbench ni manifest', async () => {
    const headers = {Authorization: `Bearer ${signToken(owner)}`};
    const response = await fetch(`${base}/experience/visual-grammar`, {headers});
    expect(response.status).toBe(400);
  });
});
