import {
  TrustFabricSnapshotSchema,
  type TrustFabricSnapshot,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {env} from '../lib/env.ts';
import type {AuthUser} from '../middleware/auth.ts';

const WINDOW_MS = 15 * 60 * 1000;

interface CountRow {
  count: number;
}

interface SumRow {
  events: number;
  cost_eur: number;
}

interface WorkflowHealthRow {
  events: number;
  failed_or_blocked: number;
}

interface SecurityAuditRow {
  detail_json: string | null;
  created_at: number;
}

function safeAuditCode(detailJson: string | null): string | null {
  if (!detailJson) return null;
  try {
    const detail = JSON.parse(detailJson) as Record<string, unknown>;
    const code = detail['audit_code'];
    return typeof code === 'string' && code.length <= 120 ? code : null;
  } catch {
    return null;
  }
}

function countRag(where: string, params: unknown[] = []): number {
  const row = getDb()
    .prepare(`SELECT COUNT(*) AS count FROM rag_resources WHERE ${where}`)
    .get(...params) as CountRow;
  return row.count;
}

/**
 * Projette quatre dimensions indépendantes depuis les données runtime existantes.
 *
 * Aucun score composite, aucune écriture et aucun effet sur les permissions.
 */
export function getTrustFabricSnapshot(
  actor: AuthUser,
  now = Date.now(),
): TrustFabricSnapshot {
  const from = Math.max(0, now - WINDOW_MS);
  const sourceCounts = {
    total: countRag('owner_id = ?', [actor.id]),
    unverified: countRag("owner_id = ? AND trust_status = 'unverified'", [actor.id]),
    source_verified: countRag("owner_id = ? AND trust_status = 'source_verified'", [actor.id]),
    canonical: countRag("owner_id = ? AND trust_status = 'canonical'", [actor.id]),
    private_reference: countRag("owner_id = ? AND trust_status = 'private_reference'", [actor.id]),
    revoked: countRag("owner_id = ? AND status = 'revoked'", [actor.id]),
  };
  const sourceState = sourceCounts.total === 0
    ? 'unknown'
    : sourceCounts.unverified > 0
      ? 'attention'
      : 'verified';

  const securityEvents = getDb()
    .prepare(
      `SELECT detail_json, created_at
       FROM audit_logs
       WHERE user_id = ? AND event_type LIKE 'security.%' AND created_at BETWEEN ? AND ?
       ORDER BY created_at DESC
       LIMIT 100`,
    )
    .all(actor.id, from, now) as SecurityAuditRow[];
  const reasonCodes = [
    ...new Set(
      securityEvents
        .map((event) => safeAuditCode(event.detail_json))
        .filter((code): code is string => code !== null),
    ),
  ].slice(0, 20);
  const userRiskState = securityEvents.length >= 3
    ? 'step_up'
    : securityEvents.length > 0
      ? 'observe'
      : 'clear';
  const latestSecurityEvent = securityEvents[0]?.created_at ?? null;

  const workflows = getDb()
    .prepare(
      `SELECT COUNT(*) AS events,
              COALESCE(SUM(CASE WHEN status IN ('failed','blocked') THEN 1 ELSE 0 END), 0)
                AS failed_or_blocked
       FROM workflow_events WHERE created_at BETWEEN ? AND ?`,
    )
    .get(from, now) as WorkflowHealthRow;
  const tokens = getDb()
    .prepare(
      `SELECT COUNT(*) AS events, COALESCE(SUM(cost_eur), 0) AS cost_eur
       FROM token_events WHERE ts BETWEEN ? AND ?`,
    )
    .get(from, now) as SumRow;
  const runtimeState = workflows.events === 0
    ? 'unknown'
    : workflows.failed_or_blocked > 0
      ? 'degraded'
      : 'healthy';
  const runtimeReasons = [
    ...(workflows.events === 0 ? ['runtime_no_recent_workflow_evidence'] : []),
    ...(workflows.failed_or_blocked > 0 ? ['runtime_failed_or_blocked_workflows'] : []),
    ...(env.releaseSha === null ? ['runtime_release_unverified'] : []),
  ];

  return TrustFabricSnapshotSchema.parse({
    generated_at: now,
    window: {from, to: now},
    source_trust: {
      state: sourceState,
      reason_codes: sourceCounts.total === 0
        ? ['source_no_owned_runtime_evidence']
        : sourceCounts.unverified > 0
          ? ['source_unverified_present']
          : ['source_provenance_verified'],
      evidence_refs: ['rag_resources:owner_aggregate'],
      observed_at: now,
      expires_at: null,
      reversible: true,
      counts: sourceCounts,
    },
    artifact_integrity: {
      state: 'unknown',
      reason_codes: ['artifact_common_passport_absent'],
      evidence_refs: [],
      observed_at: now,
      expires_at: null,
      reversible: true,
      checked_artifacts: 0,
    },
    user_risk_signal: {
      state: userRiskState,
      reason_codes: reasonCodes,
      evidence_refs: securityEvents.length > 0 ? ['audit_logs:security_window'] : [],
      observed_at: latestSecurityEvent ?? now,
      expires_at: latestSecurityEvent === null ? null : latestSecurityEvent + WINDOW_MS,
      reversible: true,
      event_count: securityEvents.length,
      scope_ref: `owner:${actor.id}`,
    },
    runtime_health: {
      state: runtimeState,
      reason_codes: runtimeReasons,
      evidence_refs: ['workflow_events:window', 'token_events:window'],
      observed_at: now,
      expires_at: now + WINDOW_MS,
      reversible: true,
      workflow_events: workflows.events,
      failed_or_blocked: workflows.failed_or_blocked,
      token_events: tokens.events,
      cost_eur: tokens.cost_eur,
      provider: env.llm.provider,
      release_verification: env.releaseSha === null ? 'unverified' : 'reported',
    },
    invariants: {
      composite_score: false,
      affects_permissions: false,
      automatic_sanction: false,
      raw_payload_exposed: false,
    },
  });
}
