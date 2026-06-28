import {
  CostPreflightRequestSchema,
  CostPreflightResultSchema,
  type CostPreflightRequest,
  type CostPreflightResult,
} from '@masterflow/shared';

/**
 * Calcule un verdict avant dépense. Aucun coût n'est réservé ni débité ici.
 * L'appelant garde la responsabilité d'une éventuelle validation et de la persistance.
 */
export function evaluateCostPreflight(input: CostPreflightRequest): CostPreflightResult {
  const request = CostPreflightRequestSchema.parse(input);
  const holdback = request.policy.total_limit * request.policy.reserve_ratio;
  const remaining = request.policy.total_limit - request.spent_cost - request.reserved_cost;
  const usableRemaining = Math.max(0, remaining - holdback);
  const projectedRemaining = usableRemaining - request.estimated_cost;
  const reasons: string[] = [];

  if (
    request.policy.require_paid_capability_approval &&
    request.estimated_cost > 0 &&
    !request.paid_capability_approved
  ) {
    reasons.push('paid_capability_not_approved');
  }
  if (request.estimated_cost > request.policy.per_action_approval_threshold) {
    reasons.push('per_action_threshold_exceeded');
  }
  if (request.estimated_cost > usableRemaining) {
    reasons.push('usable_budget_exceeded');
  }

  let verdict: CostPreflightResult['verdict'] = 'allow';
  if (reasons.length > 0) {
    if (request.policy.mode === 'observe') verdict = 'warn';
    else if (reasons.includes('usable_budget_exceeded') && request.policy.mode === 'cap') {
      verdict = 'block';
    } else {
      verdict = 'approval_required';
    }
  }

  return CostPreflightResultSchema.parse({
    verdict,
    usable_remaining: usableRemaining,
    projected_remaining: projectedRemaining,
    reasons,
  });
}
