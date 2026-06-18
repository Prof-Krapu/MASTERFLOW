import {
  CreateD12MissedTriggerFindingSchema,
  D12MissedTriggerFindingSchema,
  type CreateD12MissedTriggerFinding,
  type D12MissedTriggerFinding,
  type D12FindingStatus,
} from '@masterflow/shared';

import {getDb, type D12MissedTriggerFindingRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

function parseJsonArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

function toFinding(row: D12MissedTriggerFindingRow): D12MissedTriggerFinding {
  return D12MissedTriggerFindingSchema.parse({
    finding_id: row.id,
    detected_at: row.detected_at,
    owner_id: row.owner_id,
    project_id: row.project_id,
    source_ref: row.source_ref,
    expected_process: row.expected_process,
    actual_runtime_response: row.actual_runtime_response,
    missing_runtime_piece: row.missing_runtime_piece,
    user_impact: row.user_impact,
    domain_refs: parseJsonArray(row.domain_refs_json),
    output_family_refs: parseJsonArray(row.output_family_refs_json),
    evidence_refs: parseJsonArray(row.evidence_refs_json),
    blocked_actions: parseJsonArray(row.blocked_actions_json),
    recommended_queue_task: JSON.parse(row.recommended_queue_task_json),
    severity: row.severity,
    status: row.status,
    audit_trace: ['d12_finding_runtime_v1', 'observation_only', 'no_action', 'no_auto_fix'],
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

/** Crée une finding D12 observation-only. Ne crée aucune action, aucun patch, aucune écriture canon. */
export function createD12MissedTriggerFinding(
  actor: AuthUser,
  input: CreateD12MissedTriggerFinding,
): D12MissedTriggerFinding {
  const request = CreateD12MissedTriggerFindingSchema.parse(input);
  const now = Date.now();
  const id = uuid();

  getDb()
    .prepare(
      `INSERT INTO d12_missed_trigger_findings
         (id, owner_id, project_id, source_ref, expected_process, actual_runtime_response,
          missing_runtime_piece, user_impact, domain_refs_json, output_family_refs_json,
          evidence_refs_json, blocked_actions_json, recommended_queue_task_json, severity,
          status, detected_at, created_at, updated_at)
       VALUES
         (@id, @owner_id, @project_id, @source_ref, @expected_process, @actual_runtime_response,
          @missing_runtime_piece, @user_impact, @domain_refs_json, @output_family_refs_json,
          @evidence_refs_json, @blocked_actions_json, @recommended_queue_task_json, @severity,
          'observation', @detected_at, @created_at, @updated_at)`,
    )
    .run({
      id,
      owner_id: actor.id,
      project_id: request.project_id ?? null,
      source_ref: request.source_ref,
      expected_process: request.expected_process,
      actual_runtime_response: request.actual_runtime_response,
      missing_runtime_piece: request.missing_runtime_piece,
      user_impact: request.user_impact,
      domain_refs_json: JSON.stringify(request.domain_refs),
      output_family_refs_json: JSON.stringify(request.output_family_refs),
      evidence_refs_json: JSON.stringify(request.evidence_refs),
      blocked_actions_json: JSON.stringify(request.blocked_actions),
      recommended_queue_task_json: JSON.stringify(request.recommended_queue_task),
      severity: request.severity,
      detected_at: now,
      created_at: now,
      updated_at: now,
    });

  audit({
    event_type: 'd12_missed_trigger_finding_created',
    user_id: actor.id,
    scope: request.expected_process,
    detail: {
      finding_id: id,
      severity: request.severity,
      missing_runtime_piece: request.missing_runtime_piece,
      blocked_actions: request.blocked_actions,
      no_auto_fix: true,
    },
  });

  const row = getDb()
    .prepare('SELECT * FROM d12_missed_trigger_findings WHERE id = ?')
    .get(id) as D12MissedTriggerFindingRow | undefined;
  if (!row) throw new Error('[d12_findings] finding introuvable après création');
  return toFinding(row);
}

/** Liste privée owner/admin des findings D12. */
export function listD12MissedTriggerFindings(options: {
  status?: D12FindingStatus;
} = {}): D12MissedTriggerFinding[] {
  const rows = options.status
    ? getDb()
      .prepare('SELECT * FROM d12_missed_trigger_findings WHERE status = ? ORDER BY updated_at DESC')
      .all(options.status) as D12MissedTriggerFindingRow[]
    : getDb()
      .prepare('SELECT * FROM d12_missed_trigger_findings ORDER BY updated_at DESC')
      .all() as D12MissedTriggerFindingRow[];
  return rows.map(toFinding);
}
