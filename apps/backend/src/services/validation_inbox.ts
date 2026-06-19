import type {
  Action,
  CorrectionExportPreview,
  D12MissedTriggerFinding,
  DecideValidationInboxItemRequest,
  FeedbackDraft,
  UsageLearningCandidate,
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
import {
  decideD12MissedTriggerFinding,
  listD12MissedTriggerFindings,
} from './d12_findings.ts';
import {
  listPendingCorrectionExportPreviewsForValidation,
  listPendingFeedbackDraftsForValidation,
  reviewCorrectionExportPreview,
  reviewFeedbackDraft,
} from './feedback_exports.ts';
import {
  decideUsageLearningCandidate,
  listUsageLearningCandidates,
} from './usage_harvester.ts';

const ACTION_ITEM_PREFIX = 'validation_action_';
const FEEDBACK_DRAFT_ITEM_PREFIX = 'validation_feedback_draft_';
const EXPORT_PREVIEW_ITEM_PREFIX = 'validation_correction_export_preview_';
const D12_FINDING_ITEM_PREFIX = 'validation_d12_finding_';
const USAGE_LEARNING_ITEM_PREFIX = 'validation_usage_learning_';

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

function feedbackDraftItemId(feedbackId: string): string {
  return `${FEEDBACK_DRAFT_ITEM_PREFIX}${feedbackId}`;
}

function exportPreviewItemId(exportId: string): string {
  return `${EXPORT_PREVIEW_ITEM_PREFIX}${exportId}`;
}

function d12FindingItemId(findingId: string): string {
  return `${D12_FINDING_ITEM_PREFIX}${findingId}`;
}

function usageLearningItemId(candidateId: string): string {
  return `${USAGE_LEARNING_ITEM_PREFIX}${candidateId}`;
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

function buildFeedbackDraftProjection(
  feedback: FeedbackDraft,
): Omit<ValidationInboxItem, 'created_at' | 'updated_at'> {
  return {
    item_id: feedbackDraftItemId(feedback.feedback_id),
    item_type: 'feedback_review',
    title: 'Feedback à valider',
    summary: 'Brouillon de feedback étudiant en attente de validation professeur.',
    domain_refs: ['D06_CORRECTION_FEEDBACK_EVALUATION'],
    object_refs: [
      `feedback_draft:${feedback.feedback_id}`,
      `pre_correction_run:${feedback.run_id}`,
      `submission:${feedback.submission_id}`,
    ],
    source_refs: ['feedback_drafts', ...feedback.evidence_refs.map((ref) => `evidence:${ref}`)],
    requester: feedback.owner_id,
    owner: feedback.owner_id,
    required_validator: 'teacher_owner',
    current_status: 'needs_review',
    risk_level: 'high',
    privacy_scope: feedback.project_id ? 'project' : 'private',
    source_truth_state: 'source_verified',
    output_readiness_state: 'blocked',
    proposed_action: 'approve_student_safe_feedback',
    impact_summary:
      "L'approbation rend le feedback utilisable comme source d'une preview privée ; elle ne l'envoie pas.",
    blocked_actions: ['create_correction_export_preview', 'student_send'],
    allowed_actions: ['approve', 'reject'],
    conflicts: [],
    open_questions: [],
    recommended_decision: null,
    decision_options: ['approve', 'reject'],
    decision: null,
    audit_trace: [`feedback_draft:${feedback.feedback_id}`, `pre_correction_run:${feedback.run_id}`],
    source_kind: 'feedback_draft',
    source_id: feedback.feedback_id,
  };
}

function buildCorrectionExportPreviewProjection(
  preview: CorrectionExportPreview,
): Omit<ValidationInboxItem, 'created_at' | 'updated_at'> {
  return {
    item_id: exportPreviewItemId(preview.export_id),
    item_type: 'public_export',
    title: "Preview privée d'export D06 à valider",
    summary: "Preview privée de correction en attente de validation professeur. Ce n'est pas un envoi.",
    domain_refs: ['D06_CORRECTION_FEEDBACK_EVALUATION'],
    object_refs: [
      `correction_export_preview:${preview.export_id}`,
      `correction_batch:${preview.batch_id}`,
    ],
    source_refs: [
      ...preview.source_feedback_refs.map((ref) => `feedback_draft:${ref}`),
      ...preview.source_run_refs.map((ref) => `pre_correction_run:${ref}`),
    ],
    requester: preview.owner_id,
    owner: preview.owner_id,
    required_validator: 'teacher_owner',
    current_status: 'needs_review',
    risk_level: 'high',
    privacy_scope: preview.project_id ? 'project' : 'private',
    source_truth_state: 'source_verified',
    output_readiness_state: 'blocked',
    proposed_action: 'approve_private_correction_export_preview',
    impact_summary:
      "L'approbation rend la preview éligible à un futur job privé séparé. Elle ne crée aucun fichier et n'envoie rien.",
    blocked_actions: ['export_prepare_job', 'student_send', 'publication'],
    allowed_actions: ['approve', 'reject'],
    conflicts: [],
    open_questions: [],
    recommended_decision: null,
    decision_options: ['approve', 'reject'],
    decision: null,
    audit_trace: [
      `correction_export_preview:${preview.export_id}`,
      `correction_batch:${preview.batch_id}`,
    ],
    source_kind: 'correction_export_preview',
    source_id: preview.export_id,
  };
}

function buildD12FindingProjection(
  finding: D12MissedTriggerFinding,
): Omit<ValidationInboxItem, 'created_at' | 'updated_at'> {
  return {
    item_id: d12FindingItemId(finding.finding_id),
    item_type: 'autonomy_proposal',
    title: `Finding D12 : ${finding.expected_process}`,
    summary: finding.user_impact,
    domain_refs: finding.domain_refs.length > 0
      ? finding.domain_refs
      : ['D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT'],
    object_refs: [
      `d12_finding:${finding.finding_id}`,
      `expected_process:${finding.expected_process}`,
      `missing_runtime_piece:${finding.missing_runtime_piece}`,
    ],
    source_refs: [finding.source_ref, ...finding.evidence_refs],
    requester: finding.owner_id,
    owner: finding.owner_id,
    required_validator: 'admin_owner',
    current_status: 'needs_review',
    risk_level: finding.severity,
    privacy_scope: 'admin_only',
    source_truth_state: finding.evidence_refs.length > 0 ? 'source_verified' : 'unknown',
    output_readiness_state: 'blocked',
    proposed_action: 'review_d12_finding',
    impact_summary:
      "La décision classe l'alerte D12 uniquement. Elle ne corrige rien, ne crée aucune action et ne modifie pas le canon.",
    blocked_actions: [
      ...finding.blocked_actions,
      'auto_fix',
      'auto_patch',
      'auto_canon',
      'auto_deploy',
    ],
    allowed_actions: ['approve', 'park', 'reject', 'archive'],
    conflicts: [],
    open_questions: [
      `Pièce runtime manquante : ${finding.missing_runtime_piece}`,
      `Réponse réellement observée : ${finding.actual_runtime_response}`,
    ],
    recommended_decision: 'park',
    decision_options: ['approve', 'park', 'reject', 'archive'],
    decision: null,
    audit_trace: [`d12_finding:${finding.finding_id}`, ...finding.audit_trace],
    source_kind: 'd12_finding',
    source_id: finding.finding_id,
  };
}

function buildUsageLearningProjection(
  candidate: UsageLearningCandidate,
): Omit<ValidationInboxItem, 'created_at' | 'updated_at'> {
  return {
    item_id: usageLearningItemId(candidate.candidate_id),
    item_type: 'autonomy_proposal',
    title: `Apprentissage d'usage : ${candidate.affected_process}`,
    summary: candidate.summary,
    domain_refs: candidate.domain_refs,
    object_refs: [
      `usage_learning_candidate:${candidate.candidate_id}`,
      `process:${candidate.affected_process}`,
      `output_family:${candidate.affected_output_family}`,
    ],
    source_refs: candidate.evidence_refs,
    requester: candidate.owner_id,
    owner: candidate.owner_id,
    required_validator: `godmode:${candidate.godmode_targets.join('|')}`,
    current_status: 'needs_review',
    risk_level: candidate.status === 'contradiction' ? 'high' : 'medium',
    privacy_scope: 'admin_only',
    source_truth_state: candidate.evidence_refs.length > 0 ? 'source_verified' : 'unknown',
    output_readiness_state: 'blocked',
    proposed_action: 'review_usage_learning_candidate',
    impact_summary:
      "La décision classe un apprentissage candidat. Elle ne modifie ni processus validé, ni canon, ni système externe.",
    blocked_actions: ['auto_process_update', 'auto_canon', 'auto_patch', 'auto_deploy', 'external_send'],
    allowed_actions: ['approve', 'park', 'reject', 'archive'],
    conflicts: candidate.status === 'contradiction' ? ['Contradiction à arbitrer avant toute promotion.'] : [],
    open_questions: candidate.routing_status === 'ambiguous'
      ? ['Plusieurs propriétaires fonctionnels doivent arbitrer ce candidat partagé.']
      : [],
    recommended_decision: 'park',
    decision_options: ['approve', 'park', 'reject', 'archive'],
    decision: null,
    audit_trace: [`usage_learning_candidate:${candidate.candidate_id}`, ...candidate.audit_trace],
    source_kind: 'usage_learning_candidate',
    source_id: candidate.candidate_id,
  };
}

function persistValidationInboxProjection(
  projected: Omit<ValidationInboxItem, 'created_at' | 'updated_at'>,
): ValidationInboxItem {
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
          @source_kind, @source_id, @created_at, @updated_at)
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
      source_kind: projected.source_kind,
      source_id: projected.source_id,
      created_at: now,
      updated_at: now,
    });

  return getValidationInboxItemById(projected.item_id);
}

export function syncValidationInboxItemForAction(action: Action): ValidationInboxItem {
  return persistValidationInboxProjection(buildActionProjection(action));
}

export function syncValidationInboxItemForFeedbackDraft(feedback: FeedbackDraft): ValidationInboxItem {
  return persistValidationInboxProjection(buildFeedbackDraftProjection(feedback));
}

export function syncValidationInboxItemForCorrectionExportPreview(
  preview: CorrectionExportPreview,
): ValidationInboxItem {
  return persistValidationInboxProjection(buildCorrectionExportPreviewProjection(preview));
}

export function syncValidationInboxItemForD12Finding(finding: D12MissedTriggerFinding): ValidationInboxItem {
  return persistValidationInboxProjection(buildD12FindingProjection(finding));
}

export function syncValidationInboxItemForUsageLearningCandidate(
  candidate: UsageLearningCandidate,
): ValidationInboxItem {
  return persistValidationInboxProjection(buildUsageLearningProjection(candidate));
}

export function getValidationInboxItemById(itemId: string): ValidationInboxItem {
  const row = getDb()
    .prepare('SELECT * FROM validation_inbox_items WHERE id = ?')
    .get(itemId) as ValidationInboxItemRow | undefined;
  if (!row) throw new Error('validation_inbox_item_not_found');
  return toDTO(row);
}

export function listValidationInboxItems(actor: AuthUser): ValidationInboxItem[] {
  const actionItems = listPending(actor).map(syncValidationInboxItemForAction);
  const feedbackItems = listPendingFeedbackDraftsForValidation(actor).map(syncValidationInboxItemForFeedbackDraft);
  const exportPreviewItems = listPendingCorrectionExportPreviewsForValidation(actor)
    .map(syncValidationInboxItemForCorrectionExportPreview);
  const d12FindingItems = actor.role === 'admin' || actor.role === 'godmode'
    ? listD12MissedTriggerFindings()
      .filter((finding) => finding.status !== 'validated_alert'
        && finding.status !== 'stale'
        && finding.status !== 'archived'
        && finding.owner_decision === null)
      .map(syncValidationInboxItemForD12Finding)
    : [];
  const usageLearningItems = actor.role === 'admin' || actor.role === 'godmode'
    ? listUsageLearningCandidates({reviewStatus: 'pending'})
      .map(syncValidationInboxItemForUsageLearningCandidate)
    : [];
  return [...actionItems, ...feedbackItems, ...exportPreviewItems, ...d12FindingItems, ...usageLearningItems]
    .sort((a, b) => a.updated_at - b.updated_at);
}

export function getValidationInboxItemFor(actor: AuthUser, itemId: string): ValidationInboxItem | null {
  const allowed = listValidationInboxItems(actor).find((item) => item.item_id === itemId);
  return allowed ?? null;
}

function getExistingOwnedItem(actor: AuthUser, itemId: string): ValidationInboxItem | null {
  const row = getDb()
    .prepare('SELECT * FROM validation_inbox_items WHERE id = ? AND owner_id = ?')
    .get(itemId, actor.id) as ValidationInboxItemRow | undefined;
  return row ? toDTO(row) : null;
}

function updateDecision(
  item: ValidationInboxItem,
  actor: AuthUser,
  request: DecideValidationInboxItemRequest,
  outputReadinessState: ValidationInboxItem['output_readiness_state'],
): ValidationInboxItem {
  const now = Date.now();
  const inboxStatus: ValidationInboxItem['current_status'] = request.decision === 'approve'
    ? 'approved'
    : request.decision === 'park'
      ? 'parked'
      : request.decision === 'archive'
        ? 'archived'
        : 'rejected';
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
      inboxStatus,
      outputReadinessState,
      JSON.stringify(decisionValue),
      now,
      item.item_id,
    );

  return getValidationInboxItemById(item.item_id);
}

function decideActionItem(
  actor: AuthUser,
  item: ValidationInboxItem,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  if (request.decision !== 'approve' && request.decision !== 'reject') {
    throw new Error('validation_inbox_decision_not_supported_for_action');
  }

  const decision = request.decision === 'approve' ? 'approved' : 'rejected';
  const decidedAction = validateAction(actor, item.source_id, {decision, note: request.note});
  const decidedItem = updateDecision(
    item,
    actor,
    request,
    request.decision === 'approve' ? 'ready' : 'blocked',
  );

  audit({
    event_type: 'validation_inbox_decision',
    user_id: actor.id,
    action_id: decidedAction.id,
    scope: item.item_type,
    detail: {item_id: item.item_id, source_kind: item.source_kind, decision: request.decision},
  });

  return decidedItem;
}

function decideFeedbackDraftItem(
  actor: AuthUser,
  item: ValidationInboxItem,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  if (request.decision !== 'approve' && request.decision !== 'reject') {
    throw new Error('validation_inbox_decision_not_supported_for_feedback_draft');
  }

  const now = Date.now();
  const feedbackDecision = request.decision === 'approve' ? 'approved' : 'rejected';
  const validationRef = `validation_inbox:${item.item_id}:${request.decision}:${now}`;
  reviewFeedbackDraft(actor, item.source_id, feedbackDecision, validationRef);
  const decidedItem = updateDecision(
    item,
    actor,
    request,
    request.decision === 'approve' ? 'ready' : 'blocked',
  );

  audit({
    event_type: 'validation_inbox_decision',
    user_id: actor.id,
    scope: item.item_type,
    detail: {
      item_id: item.item_id,
      source_kind: item.source_kind,
      source_id: item.source_id,
      decision: request.decision,
      validation_ref: validationRef,
    },
  });

  return decidedItem;
}

function decideCorrectionExportPreviewItem(
  actor: AuthUser,
  item: ValidationInboxItem,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  if (request.decision !== 'approve' && request.decision !== 'reject') {
    throw new Error('validation_inbox_decision_not_supported_for_correction_export_preview');
  }

  const now = Date.now();
  const exportDecision = request.decision === 'approve' ? 'approved_for_export' : 'rejected';
  const validationRef = `validation_inbox:${item.item_id}:${request.decision}:${now}`;
  reviewCorrectionExportPreview(actor, item.source_id, exportDecision, validationRef);
  const decidedItem = updateDecision(
    item,
    actor,
    request,
    request.decision === 'approve' ? 'ready' : 'blocked',
  );

  audit({
    event_type: 'validation_inbox_decision',
    user_id: actor.id,
    scope: item.item_type,
    detail: {
      item_id: item.item_id,
      source_kind: item.source_kind,
      source_id: item.source_id,
      decision: request.decision,
      validation_ref: validationRef,
      publication_allowed: false,
      external_effects: [],
    },
  });

  return decidedItem;
}

function decideD12FindingItem(
  actor: AuthUser,
  item: ValidationInboxItem,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  const decisionMap = {
    approve: 'validate_alert',
    park: 'keep_observation',
    reject: 'mark_stale',
    archive: 'archive',
  } as const;
  if (!(request.decision in decisionMap)) {
    throw new Error('validation_inbox_decision_not_supported_for_d12_finding');
  }

  const d12Decision = decisionMap[request.decision as keyof typeof decisionMap];
  decideD12MissedTriggerFinding(actor, item.source_id, {
    decision: d12Decision,
    note: request.note,
  });
  const decidedItem = updateDecision(
    item,
    actor,
    request,
    request.decision === 'approve' ? 'ready' : 'blocked',
  );

  audit({
    event_type: 'validation_inbox_decision',
    user_id: actor.id,
    scope: item.item_type,
    detail: {
      item_id: item.item_id,
      source_kind: item.source_kind,
      source_id: item.source_id,
      decision: request.decision,
      d12_decision: d12Decision,
      external_effects: [],
      no_auto_fix: true,
      no_canon_write: true,
    },
  });

  return decidedItem;
}

function decideUsageLearningItem(
  actor: AuthUser,
  item: ValidationInboxItem,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  decideUsageLearningCandidate(actor, item.source_id, request);
  const decidedItem = updateDecision(
    item,
    actor,
    request,
    request.decision === 'approve' ? 'ready' : 'blocked',
  );

  audit({
    event_type: 'validation_inbox_decision',
    user_id: actor.id,
    scope: item.item_type,
    detail: {
      item_id: item.item_id,
      source_kind: item.source_kind,
      source_id: item.source_id,
      decision: request.decision,
      external_effects: [],
      no_process_update: true,
      no_auto_canon: true,
    },
  });
  return decidedItem;
}

export function decideValidationInboxItem(
  actor: AuthUser,
  itemId: string,
  request: DecideValidationInboxItemRequest,
): ValidationInboxItem {
  const item = getValidationInboxItemFor(actor, itemId);
  if (!item) {
    const existing = getExistingOwnedItem(actor, itemId);
    if (existing && existing.current_status !== 'needs_review') {
      throw new Error('validation_inbox_item_already_decided');
    }
    throw new Error('validation_inbox_item_not_found');
  }
  if (item.current_status !== 'needs_review') throw new Error('validation_inbox_item_already_decided');

  if (item.source_kind === 'action') return decideActionItem(actor, item, request);
  if (item.source_kind === 'feedback_draft') return decideFeedbackDraftItem(actor, item, request);
  if (item.source_kind === 'correction_export_preview') {
    return decideCorrectionExportPreviewItem(actor, item, request);
  }
  if (item.source_kind === 'd12_finding') return decideD12FindingItem(actor, item, request);
  if (item.source_kind === 'usage_learning_candidate') {
    return decideUsageLearningItem(actor, item, request);
  }
  throw new Error('validation_inbox_source_not_supported');
}
