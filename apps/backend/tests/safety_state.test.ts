import {describe, expect, it} from 'vitest';

import type {TrustFabricSnapshot} from '@masterflow/shared';

import {projectSafetyState} from '../src/services/safety_state.ts';

const trust = (
  state: TrustFabricSnapshot['user_risk_signal']['state'],
  reasonCodes: string[] = [],
): TrustFabricSnapshot['user_risk_signal'] => ({
  state,
  reason_codes: reasonCodes,
  evidence_refs: [],
  observed_at: 1_000,
  expires_at: 2_000,
  reversible: true,
  event_count: reasonCodes.length,
  scope_ref: 'owner:test',
});

describe('Safety State — projection pure', () => {
  it.each([
    ['clear', [], false, false, 'normal'],
    ['observe', ['security_prompt_override'], false, false, 'recadrage'],
    ['observe', ['security_secret_extraction'], false, false, 'suspicious'],
    ['observe', ['security_tool_misuse'], false, false, 'suspicious'],
    ['step_up', ['security_prompt_override'], false, false, 'suspicious'],
    ['human_review', [], false, false, 'closed'],
    ['clear', [], true, false, 'recovered'],
    ['clear', [], false, true, 'hard_stop'],
  ] as const)('projette %s vers %s', (trustState, reasons, recovery, hardStop, expected) => {
    const result = projectSafetyState({
      now: 1_500,
      scope_ref: 'owner:test',
      trust: trust(trustState, [...reasons]),
      recovery_candidate: recovery,
      hard_stop_active: hardStop,
    });
    expect(result.state).toBe(expected);
    expect(result.affects_permissions).toBe(false);
    expect(result.automatic_sanction).toBe(false);
    expect(result.class_projection_anonymous).toBe(true);
  });

  it('ne transforme jamais une panne provider en état utilisateur', () => {
    const result = projectSafetyState({
      now: 1_500,
      scope_ref: 'owner:test',
      trust: trust('clear'),
      recovery_candidate: false,
      hard_stop_active: false,
    });
    expect(result).toMatchObject({
      state: 'normal',
      persona_reaction_key: 'neutral',
      godmode_alert: 'none',
    });
  });

  it('donne toujours priorité au hard-stop réel sur les autres signaux', () => {
    const result = projectSafetyState({
      now: 1_500,
      scope_ref: 'room:critical',
      trust: trust('human_review', ['security_scope_escape']),
      recovery_candidate: true,
      hard_stop_active: true,
    });

    expect(result).toMatchObject({
      state: 'hard_stop',
      reason_codes: ['hard_stop_active'],
      persona_reaction_key: 'sealed',
      godmode_alert: 'immediate',
      affects_permissions: false,
      automatic_sanction: false,
    });
  });
});
