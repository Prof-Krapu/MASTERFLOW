import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createMemoryCard,
  getMemoryCard,
  invalidateMemoryCard,
  listActiveMemoryCardRefs,
  validateMemoryCard,
} from '../src/services/memory_cards.ts';

const owner: AuthUser = {id: 'memory-owner', username: 'memory_owner', role: 'student'};
const outsider: AuthUser = {id: 'memory-outsider', username: 'memory_outsider', role: 'godmode'};

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
});
