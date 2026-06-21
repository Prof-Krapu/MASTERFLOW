import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {createVisualManifest, createVisualReference, listVisualManifests} from '../src/services/visual_manifests.ts';

const owner: AuthUser = {id: 'd08-owner', username: 'd08_owner', role: 'teacher'};
const outsider: AuthUser = {id: 'd08-outsider', username: 'd08_outsider', role: 'godmode'};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare("INSERT OR IGNORE INTO users(id,username,display_name,password_hash,role,active,created_at,updated_at)VALUES(?,?,?,'x',?,1,?,?)");
  insert.run(owner.id, owner.username, owner.username, owner.role, now, now);
  insert.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);
});

describe('D08 manifest-first', () => {
  it('conserve une référence privée et produit un manifest bloqué sans provider', () => {
    const reference = createVisualReference(owner, {
      label: 'Affiche de rythme', source_ref: 'drive://visual/affiche-01', reference_status: 'poster_energy',
      provenance_state: 'declared', privacy_scope: 'private',
    });
    const manifest = createVisualManifest(owner, {
      request_title: 'Diagnostic de campagne', intent: 'Préparer un diagnostic visuel structuré.', privacy_scope: 'private',
      canon_entity_refs: ['canon://campaign/alpha'], da_root_ref: 'da://masterflow-core', active_layers: ['editorial'], filters: ['densité basse'],
      output_family: 'visual_diagnostic', output_template: 'Diagnostic vertical', source_truth_summary: 'Référence fournie par l’owner.',
      reference_ids: [reference.reference_id],
    });
    expect(manifest.status).toBe('generation_blocked_tech_pending');
    expect(manifest.action_ready_report).toMatchObject({final_state: 'generation_blocked_tech_pending'});
    expect(manifest.action_ready_report.generation_blockers).toContain('provider_generation_forbidden');
    expect(Object.keys(manifest)).not.toContain('generated_asset_candidate');
    expect(listVisualManifests(outsider)).toHaveLength(0);
  });
});
