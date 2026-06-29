import {
  SafetyStateSnapshotSchema,
  type SafetyStateSnapshot,
  type TrustFabricSnapshot,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getActiveHardStopForOwnerRoom} from './hard_stop.ts';
import {getTrustFabricSnapshot} from './trust_fabric.ts';

const RECOVERY_WINDOW_MS = 30 * 60 * 1000;

interface ProjectionInput {
  now: number;
  scope_ref: string;
  trust: TrustFabricSnapshot['user_risk_signal'];
  hard_stop_active: boolean;
  recovery_candidate: boolean;
}

function hasSensitiveReason(reasons: string[]): boolean {
  return reasons.some((reason) =>
    /(secret|scope_escape|tool_misuse|unsafe_markup|obfuscation)/.test(reason),
  );
}

/** Projection pure : elle explique un gate existant et ne crée aucun effet métier. */
export function projectSafetyState(input: ProjectionInput): SafetyStateSnapshot {
  let state: SafetyStateSnapshot['state'] = 'normal';
  if (input.hard_stop_active) state = 'hard_stop';
  else if (input.trust.state === 'human_review') state = 'closed';
  else if (input.trust.state === 'step_up') state = 'suspicious';
  else if (input.trust.state === 'observe') {
    state = hasSensitiveReason(input.trust.reason_codes) ? 'suspicious' : 'recadrage';
  } else if (input.recovery_candidate) state = 'recovered';

  const presentation = {
    normal: ['neutral', 'normal', 'none'],
    vigilant: ['attentive', 'clarify', 'none'],
    recadrage: ['amused_firm', 'reframe', 'grouped'],
    suspicious: ['suspicious', 'refuse_briefly', 'grouped'],
    closed: ['outraged_closed', 'explain_restriction', 'immediate'],
    hard_stop: ['sealed', 'explain_restriction', 'immediate'],
    recovered: ['relieved', 'recovery', 'none'],
  } as const;
  const [personaReaction, messageStrategy, godmodeAlert] = presentation[state];

  return SafetyStateSnapshotSchema.parse({
    generated_at: input.now,
    state,
    scope_ref: input.scope_ref,
    reason_codes: input.hard_stop_active ? ['hard_stop_active'] : input.trust.reason_codes,
    source_refs: [
      'trust_fabric:user_risk_signal',
      ...(input.hard_stop_active ? ['hard_stop:active'] : []),
    ],
    persona_reaction_key: personaReaction,
    message_strategy: messageStrategy,
    godmode_alert: godmodeAlert,
    expires_at: input.hard_stop_active ? null : input.trust.expires_at,
    class_projection_anonymous: true,
    affects_permissions: false,
    automatic_sanction: false,
  });
}

export function getSafetyStateSnapshot(
  actor: AuthUser,
  roomId?: string,
  now = Date.now(),
): SafetyStateSnapshot {
  const trust = getTrustFabricSnapshot(actor, now).user_risk_signal;
  const lastSecurityEvent = getDb()
    .prepare(
      `SELECT created_at FROM audit_logs
       WHERE user_id = ? AND event_type LIKE 'security.%'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(actor.id) as {created_at: number} | undefined;
  const recoveryCandidate =
    trust.state === 'clear' &&
    lastSecurityEvent !== undefined &&
    lastSecurityEvent.created_at >= now - RECOVERY_WINDOW_MS;
  const hardStopActive = roomId
    ? getActiveHardStopForOwnerRoom(actor.id, roomId) !== null
    : false;
  return projectSafetyState({
    now,
    scope_ref: roomId ? `room:${roomId}` : `owner:${actor.id}`,
    trust,
    hard_stop_active: hardStopActive,
    recovery_candidate: recoveryCandidate,
  });
}
