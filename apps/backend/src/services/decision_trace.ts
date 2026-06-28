import {DecisionTraceSchema, type DecisionTrace} from '@masterflow/shared';

import {audit} from '../lib/audit.ts';

/**
 * Écrit une décision structurée dans l'audit immuable existant.
 * La trace ne transforme jamais une décision `pending` en approbation.
 */
export function recordDecisionTrace(input: {
  trace: DecisionTrace;
  user_id?: string | null;
  action_id?: string | null;
  scope?: string | null;
}): DecisionTrace {
  const trace = DecisionTraceSchema.parse(input.trace);
  audit({
    event_type: 'decision.recorded',
    user_id: input.user_id,
    action_id: input.action_id,
    scope: input.scope,
    detail: trace,
  });
  return trace;
}
