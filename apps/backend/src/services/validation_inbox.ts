import type {
  Action,
  DecideValidationInboxItemRequest,
  ValidationDecisionValue,
  ValidationInboxItem,
  ValidationInboxItemType,
  ValidationInboxRiskLevel,
  ValidationPrivacyScope,
} from '@masterflow/shared';

import {getDb, type ValidationInboxItemRow} from '../db/schema.ts';
import {getRegistryEntry} from '../engines/action_registry.ts';
import {listPending, validateAction} from '../engines/action_engine.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';

const ACTION_ITEM_PREFIX = 'validation_action_';

function parseJsonArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
}

function parseDecision(value: string | null): ValidationInboxItem['decision'] {
  if (!value) return null;
  return JSON.parse(value) as ValidationInboxItem['decision'];
}

function toDTO(row: ValidationInboxItemRow): ValidationInboxItem {
  return {
    item_id: row.id,
    item_type: row.item_type as ValidationInboxItemType,
    title: row.title,
    summary: row.summary,
    domain_refs: parseJsonArray(row.domain_refs_json),
    object_refs: parseJsonArray(row.object_refs_json),
    source_refs: parseJsonArray(row.source_refs_json),
    requester: row.requester_id,
    owner: row.owner_id,
    required_validator: row.required_validator,
    current_status: row.status as ValidationInboxItem['current_status'],
    risk_level: row.risk_level as ValidationInboxRiskLevel,
    privacy_scope: row.privacy_scope as ValidationPrivacyScope,
    source_truth_state: row.source_truth_state as ValidationInboxItem['source_truth_state'],
    output_readiness_state: row.output_readiness_state as ValidationInboxItem['output_readiness_state'],
    proposed_action: row.proposed_action,
    impact_summary: row.impact_summary,
    blocked_actions: parseJsonArray(row.blocked_actions_json),
    allowed_actions: parseJsonArray(row.allowed_actions_json),
    conflicts: parseJsonArray(row.conflicts_json),
    open_questions: parseJsonArray(row.open_questions_json),
    recommended_decision: row.recommended_decision as ValidationDecisionValue | null,
    decision_options: parseJsonArray(row.decision_options_json) as ValidationDecisionValue[],
    decision: parseDecision(row.decision_json),
    audit_trace: parseJsonArray(row.audit_trace_json),
    source_kind: row.source_kind,
    source_id: row.source_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRisk(action: Action): ValidationInboxRiskLevel {
  switch (action.risk_level) {
    case 'high':
      return 'high';
    case 'medium_high':
      return 'high';
    case 'medium':
      return 'medium';
    case 'variable':
      return 'medium';
    case 'low':
    default:
      return 'low';
  }
}

function mapItemType(action: Action): ValidationInboxItemType {
  if (action.registry_id === 'set_user_role') return 'permission_change';
  if (action.object_type === 'inventory_item') return 'inventory_candidate';
  if (action.object_type.includes('asset')) return 'generated_asset_candidate';
  if (action.object_type.includes('export')) return 'public_export';
  if (action.object_type.includes('quote')) return 'quote_send';
  if (action.object_type.includes('canon')) return 'canon_delta';
  return 'output_candidate';
}

function privacyScopeFor(action: Action): ValidationPrivacyScope {
  if (action.project_id) return 'project';
  if (action.registry_id === 'set_global_setting' || action.registry_id === 'set_user_role') {
    return 'admin_only';
  }
  return 'private';
}

function actionItemId(actionId: string): string {
  return `${ACTION_ITEM_PREFIX}${actionId}`;
}

function buildActionProjection(action: Action): Omit<ValidationInboxItem, 'created_at' | 'updated_at'> {
  const entry = action.registry_id ? getRegistryEntry(action.registry_id) : null;
  const validator = action.preflight?.validator_role ?? entry?.validator_role ?? 'teacher';
  const label = entry?.label ?? action.intent;
  const sourceRef = action.registry_id ? `action_registry:${action.registry_id}` : `action:${action.id}`;

  return {
    item_id: actionItemId(action.id),
    item_type: mapItemType(action),
    title: label,
    summary: `Action sensible en attente de validation humaine : ${action.intent}.`,
    domain_refs: ['actions'],
    object_refs: [`action:${action.id}`, `object:${action.object_type}`],
    source_refs: [sourceRef],
    requester: action.user_id,
    owner: action.user_id,
    required_validator: validator,
    current_status: 'needs_review',
    risk_level: mapRisk(action),
    privacy_scope: privacyScopeFor(action),
    source_truth_state: action.preflight?.permission_check === 'passed' ? 'source_verified' : 'unknown',
    output_readiness_state: 'blocked',
    proposed_action: action.intent,
    impact_summary: 'La validation débloque l’exécution de cette action. Sans validation, aucun effet runtime.',
    blocked_actions: ['execute_action'],
    allowed_actions: ['approve', 'reject'],
    conflicts: action.error ? [action.error] : [],
    open_questions: [],
    recommended_decision: 'approve',
    decision_options: ['approve', 'reject'],
    decision: null,
    audit_trace: [`action:${action.id}`, 'preflight'],
    source_kind: 'action',
    source_id: action.id,
  };
}

export function syncValidationInboxItemForAction(action: Action): ValidationInboxItem {
  const projected = buildActionProjection(action);
  const now = Date.now();

  getDb()
    .prepare(
      `INSERT INTO validation_inbox_items
         (id, item_type, title, summary, domain_refs_json, object_refs_json, source_refs_json,
          requester_id, owner_id, required_validator, status, risk_level, privacy_scope,
          source_truth_state, output_readiness_state, proposed_action, impact_summary,
          blocked_actions_json, allowed_actions_json, conflicts_json, open_questions_json,
          recommended_decision, decision_options_json, decision_json, audit_trace_json,
          source_kind, source_id, created_at, updated_at)
       VALUES
         (@id, @item_type, @title, @summary, @domain_refs_json, @object_refs_json, @source_refs_json,
          @requester_id, @owner_id, @required_validator, @status, @risk_level, @privacy_scope,
          @source_truth_state, @output_readiness_state, @proposed_action, @impact_summary,
          @blocked_actions_json, @allowed_actions_json, @conflicts_json, @open_questions_json,
          @recommended_decision, @decision_options_json, NULL, @audit_trace_json,
          'action', @source_id, @created_at, @updated_at)
       ON CONFLICT(source_kind, source_id) DO UPDATE SET
          item_type = excluded.item_type,
          title = excluded.title,
          summary = excluded.summary,
          domain_refs_json = excluded.domain_refs_json,
          object_refs_json = excluded.object_refs_json,
          source_refs_json = excluded.source_refs_json,
          required_validator = excluded.required_validator,
          status = excluded.status,
          risk_level = excluded.risk_level,
          privacy_scope = excluded.privacy_scope,
          source_truth_state = excluded.source_truth_state,
          output_readiness_state = excluded.output_readiness_state,
          proposed_action = excluded.proposed_action,
          impact_summary = excluded.impact_summary,
          blocked_actions_json = excluded.blocked_actions_json,
          allowed_actions_json = excluded.allowed_actions_json,
          conflicts_json = excluded.conflicts_json,
          open_questions_json = excluded.open_questions_json,
          recommended_decision = excluded.recommended_decision,
          decision_options_json = excluded.decision_options_json,
          audit_trace_json = excluded.audit_trace_json,
          updated_at = excluded.updated_at`,
    )
    .run({
      id: projected.item_id,
      item_type: projected.item_type,
      title: projected.title,
      summary: projected.summary,
      domain_refs_json: JSON.stringify(projected.domain_refs),
      object_refs_json: JSON.stringify(projected.object_refs),
      source_refs_json: JSON.stringify(projected.source_refs),
      requester_id: projected.requester,
      owner_id: projected.owner,
      required_validator: projected.required_validator,
      status: projected.current_status,
      risk_level: projected.risk_level,
      privacy_scope: projected.privacy_scope,
      source_truth_state: projected.source_truth_state,
      output_readiness_state: projected.output_readiness_state,
      proposed_action: projected.proposed_action,
      impact_summary: projected.impact_summary,
      blocked_actions_json: JSON.stringify(projected.blocked_actions),
      allowed_actions_json: JSON.stringify(projected.allowed_actions),
      conflicts_json: JSON.stringify(projected.conflicts),
      open_questions_json: JSON.stringify(projected.open_questions),
      recommended_decision: projected.recommended_decision,
      decision_options_json: JSON.stringify(projected.decision_options),
      audit_trace_json: JSON.stringify(projected.audit_trace),
      source_id: projected.source_id,
      created_at: now,
      updated_at: now,
    });

  return getValidationInboxItemById(projected.item_id);
}

export function getValidationInboxItemById(itemId: string): ValidationInboxItem {
  const row = getDb()
    .prepare('SELECT * FROM validation_inbox_items WHERE id = ?')
    .get(itemId) as ValidationInboxItemRow | undefined;
  if (!row) throw new Error('validation_inbox_item_not_found');
  return toDTO(row);
}

export function listValidationInboxItems(actor: AuthUser): ValidationInboxItem[] {
  return listPending(actor).map(syncValidationInboxItemForAction);
}

export function getValidationInboxItemFor(actor: AuthUser, itemId: string): ValidationInboxItem | null {
  const allowed = listValidationInboxItems(actor).find((item) => item.item_id === itemId);
  return allowed ?? null;
}

export function decideValidationInboxItem(
  actor: AuthUser,
  itemId: string,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  const item = getValidationInboxItemFor(actor, itemId);
  if (!item) throw new Error('validation_inbox_item_not_found');
  if (item.source_kind !== 'action') throw new Error('validation_inbox_source_not_supported');
  if (request.decision !== 'approve' && request.decision !== 'reject') {
    throw new Error('validation_inbox_decision_not_supported_for_action');
  }

  const decision = request.decision === 'approve' ? 'approved' : 'rejected';
  const decidedAction = validateAction(actor, item.source_id, {decision, note: request.note});
  const now = Date.now();
  const decisionValue: ValidationInboxItem['decision'] = {
    value: request.decision,
    decided_by: actor.id,
    decided_at: now,
    rationale: request.note ?? null,
  };

  getDb()
    .prepare(
      `UPDATE validation_inbox_items
          SET status = ?, output_readiness_state = ?, decision_json = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(
      request.decision === 'approve' ? 'approved' : 'rejected',
      request.decision === 'approve' ? 'ready' : 'blocked',
      JSON.stringify(decisionValue),
      now,
      itemId,
    );

  audit({
    event_type: 'validation_inbox_decision',
    user_id: actor.id,
    action_id: decidedAction.id,
    scope: item.item_type,
    detail: {item_id: itemId, decision: request.decision},
  });

  return getValidationInboxItemById(itemId);
}
