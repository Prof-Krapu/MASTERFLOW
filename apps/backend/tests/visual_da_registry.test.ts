import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {VisualDaResolverPreviewSchema, VISUAL_DA_REGISTRY_API} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {buildVisualDaResolverPreview, listVisualDaRegistry} from '../src/services/visual_da_registry.ts';

const owner: AuthUser = {id: 'visual-da-owner', username: 'visual_da_owner', role: 'teacher'};
let server: Server;
let base = '';

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(owner.id, owner.username, owner.username, owner.role, now, now);
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

describe('Visual DA Registry resolver preview', () => {
  it('reconstitue MasterFlex en état suspicieux sans provider image ni canonisation', () => {
    const preview = buildVisualDaResolverPreview(owner, {
      entity_id: 'masterflex-001',
      context: 'ui_chat',
      output_surface: 'ui_state_pack',
      active_mode: 'home',
      emotional_state: 'suspicious',
    });

    expect(preview.execution_policy).toBe('preview_only');
    expect(preview.resolution_status).toBe('ready_for_manifest_preview');
    expect(preview.d08_manifest_preview).toMatchObject({
      da_root_ref: 'masterflow_core',
      output_template: 'ui_state_pack',
      status: 'action_ready_preview',
      generation_allowed: false,
      canon_promotion_allowed: false,
    });
    expect(preview.da_stack.map((item) => item.stack_ref)).toEqual(
      expect.arrayContaining(['masterflow_core', 'masterflex-001', 'ui_state_pack']),
    );
    expect(preview.narrative_acting_payload).toMatchObject({
      state_id: 'suspicious',
      emotional_state: 'suspicious_amused',
    });
    expect(preview.reference_boards.map((board) => board.board_id)).toEqual(
      expect.arrayContaining(['masterflex_canon', 'masterflex_expressions', 'masterflex_antipattern']),
    );
    expect(preview.negative_locks.join(' ')).toContain('no_heroic_pose');
    expect(preview.source_refs.join(' ')).toContain('MASTERFLEX_GRAPHIC_CANON');
    expect(VisualDaResolverPreviewSchema.parse(preview)).toMatchObject({execution_policy: 'preview_only'});
  });

  it('garde Ours d’Or comme couche événementielle, jamais comme racine', () => {
    const preview = buildVisualDaResolverPreview(owner, {
      entity_id: 'masterflex-001',
      context: 'event_competition',
      output_surface: 'avatar_fullbody',
      active_mode: 'theme_studio',
      optional_event_layer: 'event_layer_ours_dor',
    });

    expect(preview.d08_manifest_preview.da_root_ref).toBe('masterflow_core');
    expect(preview.d08_manifest_preview.active_layers).toContain('event_layer_ours_dor');
    expect(preview.da_stack).toEqual(
      expect.arrayContaining([
        expect.objectContaining({stack_ref: 'event_layer_ours_dor', stack_type: 'layer'}),
      ]),
    );
    expect(preview.da_stack.find((item) => item.stack_ref === 'event_layer_ours_dor')).not.toMatchObject({
      stack_type: 'root',
    });
  });

  it('n’utilise pas une planche expression comme référence morphologique', () => {
    const preview = buildVisualDaResolverPreview(owner, {
      entity_id: 'masterflex-001',
      context: 'ui_chat',
      output_surface: 'ui_state_pack',
      active_mode: 'home',
      emotional_state: 'amused',
    });
    const expressionBoard = preview.reference_boards.find((board) => board.board_id === 'masterflex_expressions');

    expect(expressionBoard).toMatchObject({role: 'expression_only'});
    expect(expressionBoard?.forbidden_use.join(' ')).toContain('morphology');
  });

  it('résout ProfKrapu comme entité dédiée avec acting science-pulp et morpho privée non biométrique', () => {
    const preview = buildVisualDaResolverPreview(owner, {
      entity_id: 'prof-krapu-001',
      context: 'teaching_science',
      output_surface: 'avatar_badge',
      active_mode: 'theme_studio',
      emotional_state: 'troll_trap',
    });

    expect(preview.resolution_status).toBe('ready_for_manifest_preview');
    expect(preview.da_stack.map((item) => item.stack_ref)).toEqual(
      expect.arrayContaining(['masterflow_core', 'prof-krapu-001', 'prof_krapu_layer', 'avatar_badge']),
    );
    expect(preview.narrative_acting_payload).toMatchObject({state_id: 'troll_trap'});
    expect(preview.activated_bricks.map((brick) => brick.brick_id)).toEqual(
      expect.arrayContaining([
        'PK_STYLIZED_MORPHOLOGY_LOCK',
        'PK_MOLECULE_EMBROIDERY_LOCK',
        'PK_SCIENCE_PULP_ESCALATION_LOCK',
      ]),
    );
    expect(preview.negative_locks.join(' ')).toContain('biometric likeness');
    expect(preview.visual_gauges.map((gauge) => gauge.gauge_id)).toContain('science_pulp');
  });

  it('conserve le badge Ours d’Or comme conteneur modulaire avec logo non improvisé', () => {
    const preview = buildVisualDaResolverPreview(owner, {
      entity_id: 'masterflex-001',
      context: 'ours_dor_badge',
      output_surface: 'badge_container',
      active_mode: 'theme_studio',
      optional_event_layer: 'event_layer_ours_dor',
    });

    const badgeSlice = listVisualDaRegistry().pipeline_slices.find((slice) => slice.slice_id === 'OURS_DOR_BADGE_CONTAINER');
    expect(preview.resolution_status).toBe('ready_for_manifest_preview');
    expect(preview.reference_boards.map((board) => board.board_id)).toContain('ours_badge_container');
    expect(badgeSlice?.container_parts).toEqual(
      expect.arrayContaining(['frame', 'background', 'content', 'topper', 'banner', 'footer', 'narrative_ports']),
    );
    expect(badgeSlice?.logo_policy).toContain('never ask an image model to invent a fake logo');
    expect(preview.visual_gauges.map((gauge) => gauge.gauge_id)).toEqual(
      expect.arrayContaining(['readability', 'strangeness', 'filter_strength']),
    );
  });

  it('déclare les rôles Ours d’Or fins avec pouvoir et étrangeté contrôlés', () => {
    const classes = listVisualDaRegistry().class_profiles;
    const finalist = classes.find((profile) => profile.class_id === 'student_finalist');
    const goldBear = classes.find((profile) => profile.class_id === 'gold_bear');
    const incubator = classes.find((profile) => profile.class_id === 'incubator_entity');

    expect(finalist).toMatchObject({role_power: 3, strangeness: 1, badge_level: 'signature'});
    expect(goldBear).toMatchObject({role_power: 7, visual_weight: 'ceremonial', badge_level: 'legendary'});
    expect(goldBear?.forbidden_uses).toContain('casual_use');
    expect(incubator?.required_brick_refs).toContain('OD_INCUBATOR_ONE_EYE_NO_MOUTH');
  });

  it('bloque proprement si le profil visuel est absent', () => {
    const preview = buildVisualDaResolverPreview(owner, {
      entity_id: 'unknown-persona',
      context: 'ui_chat',
      output_surface: 'ui_state_pack',
      active_mode: 'home',
    });

    expect(preview.resolution_status).toBe('blocked');
    expect(preview.missing_items).toContain('entity_profile:unknown-persona');
    expect(preview.d08_manifest_preview.generation_allowed).toBe(false);
    expect(preview.negative_locks).toContain('no_invention_from_missing_entity');
  });

  it('expose le preview derrière authentification', async () => {
    const url = new URL(`${base}/experience/da-registry/preview`);
    url.searchParams.set('entity_id', 'masterflex-001');
    url.searchParams.set('context', 'ui_chat');
    url.searchParams.set('output_surface', 'ui_state_pack');
    url.searchParams.set('active_mode', 'home');
    url.searchParams.set('emotional_state', 'closed');

    const response = await fetch(url, {
      headers: {Authorization: `Bearer ${signToken(owner)}`},
    });
    expect(response.status).toBe(200);
    const payload = VisualDaResolverPreviewSchema.parse(await response.json());
    expect(payload.narrative_acting_payload?.state_id).toBe('closed');
    expect(VISUAL_DA_REGISTRY_API.preview).toBe('/api/v1/experience/da-registry/preview');
  });
});
