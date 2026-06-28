import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {signToken} from '../src/middleware/auth.ts';
import {createMemoryRouter} from '../src/routers/memory.ts';
import {
  createMemoryCard,
  createMemoryCardLink,
  decideMemoryCardLink,
  getMemoryCard,
  getMemoryGraphHealth,
  invalidateMemoryCard,
  listActiveMemoryCardRefs,
  listMemoryCardLinks,
  listMemoryCards,
  validateMemoryCard,
} from '../src/services/memory_cards.ts';

const owner: AuthUser = {id: 'memory-owner', username: 'memory_owner', role: 'student'};
const outsider: AuthUser = {id: 'memory-outsider', username: 'memory_outsider', role: 'godmode'};
let server: Server;
let base: string;
let ownerToken: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  insert.run(owner.id, owner.username, owner.username, owner.role, now, now);
  insert.run(outsider.id, outsider.username, outsider.username, outsider.role, now, now);

  ownerToken = signToken(owner);
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createMemoryRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

describe('memory cards L2/L3', () => {
  it('cree seulement une carte L2 candidate, jamais une memoire active automatique', () => {
    const card = createMemoryCard(owner, {
      type: 'preference',
      source_ref: 'conversation://turn/12',
      extracted_signal: 'Prefere des reponses courtes.',
      distilled_value: 'verbosity=short',
      confidence: 'high',
      privacy: 'private',
      affects: ['persona', 'output'],
      invalidation_rule: 'user_changes_preference',
      next_action: null,
    });
    expect(card).toMatchObject({status: 'candidate', compression_level: 'L2'});
    expect(listActiveMemoryCardRefs(owner, null)).toEqual([]);
  });

  it('promeut explicitement une carte validee en L3 puis l invalide', () => {
    const card = createMemoryCard(owner, {
      type: 'user_trait',
      source_ref: 'profile://self',
      extracted_signal: 'Travaille mieux avec une prochaine action.',
      distilled_value: 'show_next_action=true',
      confidence: 'medium',
      privacy: 'private',
      affects: ['persona'],
      invalidation_rule: 'owner_revokes',
      next_action: null,
    });
    const active = validateMemoryCard(owner, card.memory_card_id, 'active');
    expect(active).toMatchObject({
      status: 'active',
      compression_level: 'L3',
      confidence: 'validated',
      validated_by: owner.id,
    });
    expect(listActiveMemoryCardRefs(owner, null)).toContainEqual({
      id: card.memory_card_id,
      scope: 'user',
      scopeId: owner.id,
    });
    expect(invalidateMemoryCard(owner, card.memory_card_id).status).toBe('stale');
  });

  it('ne revele pas une carte privee a un autre compte, meme godmode', () => {
    const card = createMemoryCard(owner, {
      type: 'idea',
      source_ref: 'note://private',
      extracted_signal: 'Idee privee.',
      distilled_value: 'private=true',
      confidence: 'low',
      privacy: 'private',
      affects: ['output'],
      invalidation_rule: 'owner_revokes',
      next_action: null,
    });
    expect(() => getMemoryCard(outsider, card.memory_card_id)).toThrow('memory_card_not_found');
  });

  it('refuse les secrets dans une carte', () => {
    expect(() =>
      createMemoryCard(owner, {
        type: 'bug',
        source_ref: '.env',
        extracted_signal: 'API_KEY=secret',
        distilled_value: 'credential leak',
        confidence: 'high',
        privacy: 'restricted',
        affects: ['backend'],
        invalidation_rule: 'rotate_secret',
        next_action: null,
      }),
    ).toThrow('memory_secret_detected');
  });

  it('relie deux cartes en candidat sourcé puis active explicitement la relation', () => {
    const source = createMemoryCard(owner, {
      type: 'rule',
      source_ref: 'conversation://decision/1',
      extracted_signal: 'Les sorties IA restent candidates.',
      distilled_value: 'candidate_before_validation=true',
      confidence: 'high',
      privacy: 'private',
      affects: ['backend'],
      invalidation_rule: 'owner_changes_validation_policy',
      next_action: null,
    });
    const target = createMemoryCard(owner, {
      type: 'canon_candidate',
      source_ref: 'legacy://graph-os/invariant',
      extracted_signal: 'Un nœud sans source ne vaut pas vérité.',
      distilled_value: 'source_required_for_truth=true',
      confidence: 'high',
      privacy: 'private',
      affects: ['resource_routing'],
      invalidation_rule: 'source_truth_contract_changes',
      next_action: null,
    });
    validateMemoryCard(owner, source.memory_card_id, 'active');
    validateMemoryCard(owner, target.memory_card_id, 'active');

    const link = createMemoryCardLink(owner, source.memory_card_id, {
      target_card_id: target.memory_card_id,
      relation_type: 'supports',
      rationale: 'La validation exige une provenance vérifiable.',
      source_ref: 'audit://knowledge-fabric/1',
      confidence: 'high',
    });
    expect(link).toMatchObject({
      status: 'candidate',
      relation_family: 'semantic',
      directionality: 'directed',
      validated_by: null,
    });
    expect(getMemoryGraphHealth(owner)).toMatchObject({
      active_links: 0,
      candidate_links: 1,
      orphan_active_cards: 2,
    });

    const active = decideMemoryCardLink(owner, link.link_id, 'active');
    expect(active).toMatchObject({
      status: 'active',
      confidence: 'validated',
      validated_by: owner.id,
    });
    expect(listMemoryCardLinks(owner, source.memory_card_id)).toHaveLength(1);
    expect(getMemoryGraphHealth(owner)).toMatchObject({
      active_links: 1,
      candidate_links: 0,
      orphan_active_cards: 0,
    });
    expect(listMemoryCards(owner, {status: 'active'})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({memory_card_id: source.memory_card_id}),
        expect.objectContaining({memory_card_id: target.memory_card_id}),
      ]),
    );
    expect(() => listMemoryCardLinks(outsider, source.memory_card_id)).toThrow(
      'memory_card_not_found',
    );
    expect(() =>
      createMemoryCardLink(owner, source.memory_card_id, {
        target_card_id: target.memory_card_id,
        relation_type: 'references',
        rationale: 'API_KEY=secret',
        source_ref: 'audit://knowledge-fabric/secret',
        confidence: 'high',
      }),
    ).toThrow('memory_secret_detected');
  });

  it('refuse les auto-liens et ne mélange pas provenance et sémantique', () => {
    const card = createMemoryCard(owner, {
      type: 'idea',
      source_ref: 'conversation://idea/graph',
      extracted_signal: 'Créer une vue locale du graphe.',
      distilled_value: 'local_graph_view=true',
      confidence: 'medium',
      privacy: 'private',
      affects: ['output'],
      invalidation_rule: 'ui_contract_changes',
      next_action: null,
    });
    expect(() =>
      createMemoryCardLink(owner, card.memory_card_id, {
        target_card_id: card.memory_card_id,
        relation_type: 'derived_from',
        rationale: 'Une carte ne peut pas être sa propre source.',
        source_ref: 'audit://knowledge-fabric/self-link',
        confidence: 'high',
      }),
    ).toThrow('memory_card_self_link');
  });

  it('expose la liste et la santé du graphe sans jargon interne supplémentaire', async () => {
    const headers = {Authorization: `Bearer ${ownerToken}`};
    const listResponse = await fetch(`${base}/memory/cards?scope=user`, {headers});
    expect(listResponse.status).toBe(200);
    expect(Array.isArray(await listResponse.json())).toBe(true);

    const healthResponse = await fetch(`${base}/memory/health`, {headers});
    expect(healthResponse.status).toBe(200);
    expect(await healthResponse.json()).toMatchObject({
      scope: 'user',
      scope_id: owner.id,
      active_links: 1,
    });

    const invalidProjectScope = await fetch(`${base}/memory/cards?scope=project`, {headers});
    expect(invalidProjectScope.status).toBe(400);
  });
});
