import {describe, expect, it} from 'vitest';

import {evaluateCostPreflight} from '../src/engines/cost_governance.ts';

const policy = {
  currency: 'EUR' as const,
  total_limit: 10,
  reserve_ratio: 0.1,
  per_action_approval_threshold: 0.5,
  require_paid_capability_approval: true,
  mode: 'cap' as const,
};

describe('cost governance preflight', () => {
  it('soustrait dépenses, réservations et réserve de sécurité', () => {
    const result = evaluateCostPreflight({
      capability_id: 'image-provider',
      estimated_cost: 1,
      spent_cost: 3,
      reserved_cost: 2,
      paid_capability_approved: true,
      policy: {...policy, per_action_approval_threshold: 2},
    });
    expect(result).toMatchObject({
      verdict: 'allow',
      usable_remaining: 4,
      projected_remaining: 3,
    });
  });

  it('demande une approbation pour une capacité payante inconnue', () => {
    const result = evaluateCostPreflight({
      capability_id: 'new-paid-tool',
      estimated_cost: 0.2,
      spent_cost: 0,
      reserved_cost: 0,
      paid_capability_approved: false,
      policy,
    });
    expect(result.verdict).toBe('approval_required');
    expect(result.reasons).toContain('paid_capability_not_approved');
  });

  it('bloque réellement un dépassement en mode cap', () => {
    const result = evaluateCostPreflight({
      capability_id: 'expensive-tool',
      estimated_cost: 2,
      spent_cost: 8,
      reserved_cost: 1,
      paid_capability_approved: true,
      policy: {...policy, per_action_approval_threshold: 10},
    });
    expect(result.verdict).toBe('block');
    expect(result.reasons).toContain('usable_budget_exceeded');
  });

  it('observe sans prétendre avoir réservé ou approuvé', () => {
    const result = evaluateCostPreflight({
      capability_id: 'expensive-tool',
      estimated_cost: 20,
      spent_cost: 0,
      reserved_cost: 0,
      paid_capability_approved: false,
      policy: {...policy, mode: 'observe'},
    });
    expect(result.verdict).toBe('warn');
    expect(result.projected_remaining).toBeLessThan(0);
  });
});
