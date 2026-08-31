import type {ConversationTurnRoute} from '@masterflow/shared';

export interface ConversationEvalObservation {
  case_id: string;
  expected_route: ConversationTurnRoute;
  actual_route: ConversationTurnRoute;
  rejected_source_count: number;
  expected_source_rejection: boolean;
}

export interface ConversationEvalMetrics {
  total_cases: number;
  route_error_rate: number;
  overactivation_rate: number;
  unnecessary_clarification_rate: number;
  scope_leak_rate: number;
  abstention_rate: number;
}

/** Agrège un corpus rejouable sans transformer une métrique en décision produit automatique. */
export function scoreConversationEval(
  observations: ConversationEvalObservation[],
): ConversationEvalMetrics {
  const total = observations.length;
  if (total === 0) {
    return {
      total_cases: 0,
      route_error_rate: 0,
      overactivation_rate: 0,
      unnecessary_clarification_rate: 0,
      scope_leak_rate: 0,
      abstention_rate: 0,
    };
  }
  const activationRoutes = new Set<ConversationTurnRoute>([
    'prepare_action',
    'await_approval',
    'execute_approved',
  ]);
  const abstentionRoutes = new Set<ConversationTurnRoute>(['clarify', 'escalate', 'handoff']);
  const count = (predicate: (item: ConversationEvalObservation) => boolean) =>
    observations.filter(predicate).length / total;
  return {
    total_cases: total,
    route_error_rate: count((item) => item.actual_route !== item.expected_route),
    overactivation_rate: count((item) =>
      activationRoutes.has(item.actual_route) && !activationRoutes.has(item.expected_route)),
    unnecessary_clarification_rate: count((item) =>
      item.actual_route === 'clarify' && item.expected_route !== 'clarify'),
    scope_leak_rate: count((item) =>
      item.expected_source_rejection && item.rejected_source_count === 0),
    abstention_rate: count((item) => abstentionRoutes.has(item.actual_route)),
  };
}
