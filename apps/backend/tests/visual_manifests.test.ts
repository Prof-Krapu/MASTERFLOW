import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createVisualManifest,
  getVisualManifest,
  listVisualManifests,
} from '../src/services/visual_manifests.ts';

const owner: AuthUser = {id: 'visual-owner', username: 'visual_owner', role: 'teacher'};
const otherGodmode: AuthUser = {id: 'visual-other-godmode', username: 'visual_other_godmode', role: 'godmode'};

function insertUser(user: AuthUser): void {
  const now = Date.now();
  getDb().prepare(
    `INSERT OR IGNORE INTO users
      (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(user.id, user.username, user.username, user.role, now, now);
}

beforeAll(async () => {
  await seedAll();
  insertUser(owner);
  insertUser(otherGodmode);
});

describe('D08 Visual Manifest manifest-first', () => {
  it('garde un cadrage incomplet sans prétendre être action ready', () => {
    const manifest = createVisualManifest(owner, {
      request_title: 'Portrait test',
      intent: 'Préparer un portrait sans génération.',
    });

    expect(manifest.ui_state).toBe('CADRAGE');
    expect(manifest.output_readiness).toBe('incomplete');
    expect(manifest.action_ready).toBe(false);
    expect(manifest.gate_report.da_resolution_gate).toBe('missing');
    expect(manifest.gate_report.queue_gate).toBe('blocked');
  });

  it('bloque techniquement la génération même quand le manifeste est complet', () => {
    const jobsBefore = (getDb().prepare('SELECT COUNT(*) AS n FROM jobs').get() as {n: number}).n;
    const manifest = createVisualManifest(owner, {
      request_title: 'Portrait canon cadré',
      intent: 'Portrait de référence pour revue privée.',
      canon_entity_refs: ['entity:visual-owner'],
      da_root_ref: 'da:masterflow-core',
      active_layers: ['portrait_editorial'],
      filters: ['contrast_controlled'],
      output_template: 'template:portrait-4x5',
      provider_target: 'openrouter',
      references: [{reference_ref: 'resource:portrait-source', status: 'expression_only'}],
    });
    const jobsAfter = (getDb().prepare('SELECT COUNT(*) AS n FROM jobs').get() as {n: number}).n;

    expect(manifest.action_ready).toBe(true);
    expect(manifest.output_readiness).toBe('manifest_ready');
    expect(manifest.ui_state).toBe('GENERATION_BLOCKED_TECH_PENDING');
    expect(manifest.gate_report.completion_gate).toBe('pass');
    expect(manifest.gate_report.queue_gate).toBe('blocked');
    expect(manifest.validation_item_ref).toBeNull();
    expect(jobsAfter).toBe(jobsBefore);
  });

  it('ne laisse pas un autre godmode traverser un manifeste privé', () => {
    const manifest = createVisualManifest(owner, {
      request_title: 'Référence privée',
      intent: 'Conserver ce cadrage dans le scope propriétaire.',
    });

    expect(() => getVisualManifest(otherGodmode, manifest.manifest_id)).toThrow('visual_manifest_not_found');
    expect(listVisualManifests(otherGodmode).some((item) => item.manifest_id === manifest.manifest_id)).toBe(false);
  });
});
