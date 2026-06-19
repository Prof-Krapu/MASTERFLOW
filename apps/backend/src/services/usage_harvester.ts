import {createHash} from 'node:crypto';

import {
  UsageLearningCandidateSchema,
  type DecideValidationInboxItemRequest,
  type D12MissedTriggerFinding,
  type TeacherDecisionDelta,
  type UsageLearningCandidate,
  type UsageLearningCandidateStatus,
  type UsageLearningPrivacy,
  type UsageLearningRoutingStatus,
  type UsageLearningSignalType,
  type WorkflowEvent,
} from '@masterflow/shared';

import {getDb, type UsageLearningCandidateRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

type UsageLearningSignal = {
  owner_id: string;
  project_id: string | null;
  source_environment: 'masterflow_native' | 'portable_factory';
  source_factory_id: string | null;
  source_session_or_event: string;
  signal_type: UsageLearningSignalType;
  summary: string;
  affected_process: string;
  affected_output_family: string;
  evidence_summary: string;
  evidence_refs: string[];
  privacy: UsageLearningPrivacy;
  scope: string;
  domain_refs?: string[];
};

const DOMAIN_OWNERS: Record<string, string[]> = {
  D01_IDENTITY_ACCESS_OWNERSHIP: ['PERMISSION_ENGINE', 'PROJECT_RUNTIME', 'AUTHORITY_KERNEL'],
  D02_RUNTIME_CONTEXT_MEMORY_RAG: ['CONTEXT_COMPILER', 'RESOURCE_TRUTH_ENGINE', 'RAG', 'MEMORY_RUNTIME'],
  D03_ROOM_OS: ['UI_RUNTIME', 'ROOM_OS', 'ACTION_READY', 'SESSION_ENGINE'],
  D04_PERSONAS_CONTEXTUAL_BOTS: ['PERSONA_RUNTIME', 'GUIDED_RUNTIME', 'PERMISSION_ENGINE'],
  D05_PEDAGOGY: ['PEDAGOGY_ENGINE', 'SUBJECT_COMPILER', 'GUIDED_RUNTIME', 'RESOURCE_TRUTH_ENGINE'],
  D06_CORRECTION_FEEDBACK_EVALUATION: ['CORRECTOR_RUNTIME', 'PEDAGOGY_ENGINE', 'PERMISSION_ENGINE'],
  D07_INVENTORY_OCR_COLLECTIONS: ['MASTERINVENTORY', 'RESOURCE_TRUTH_ENGINE', 'PERMISSION_ENGINE'],
  D08_DA_VISUAL_ASSETS: ['MASTERLAB', 'MASTERFLEX_DA_AUTHORITY', 'ASSET_RUNTIME', 'MASTERCOMFY', 'ACTION_READY'],
  D09_MASTERSTORY: ['MASTERSTORY', 'NARRATIVE_ENGINE', 'RESOURCE_TRUTH_ENGINE'],
  D10_EVENTS_QUOTES_PUBLIC: ['EVENT_RUNTIME', 'QUOTE_ENGINE', 'PERMISSION_ENGINE', 'RESOURCE_TRUTH_ENGINE'],
  D11_FACTORIES_BACKFLOW: ['FACTORY_SYSTEM', 'BACKFLOW_INTAKE', 'AUTHORITY_KERNEL'],
  D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT: ['AUTONOMY_STEP1', 'OBSERVABILITY', 'DEPLOYMENT_BRIDGE', 'MALEX'],
};

const DOMAIN_PATTERNS: Array<{domain: string; patterns: RegExp[]}> = [
  {domain: 'D06_CORRECTION_FEEDBACK_EVALUATION', patterns: [/correction/, /feedback/, /rubric/, /grading/, /grade/]},
  {domain: 'D05_PEDAGOGY', patterns: [/guided/, /teaching/, /subject/, /pedagog/, /cdc/]},
  {domain: 'D07_INVENTORY_OCR_COLLECTIONS', patterns: [/inventory/, /ocr/, /collection/, /resource_deck/]},
  {domain: 'D08_DA_VISUAL_ASSETS', patterns: [/visual/, /image/, /asset/, /render/, /comfy/]},
  {domain: 'D09_MASTERSTORY', patterns: [/story/, /narrative/, /lore/, /spoiler/]},
  {domain: 'D10_EVENTS_QUOTES_PUBLIC', patterns: [/quote/, /devis/, /event/, /public_intake/]},
  {domain: 'D11_FACTORIES_BACKFLOW', patterns: [/factory/, /backflow/, /portable/]},
  {domain: 'D01_IDENTITY_ACCESS_OWNERSHIP', patterns: [/permission/, /identity/, /invitation/, /ownership/]},
  {domain: 'D02_RUNTIME_CONTEXT_MEMORY_RAG', patterns: [/context/, /memory/, /rag/]},
  {domain: 'D03_ROOM_OS', patterns: [/room/, /command/, /widget/]},
  {domain: 'D04_PERSONAS_CONTEXTUAL_BOTS', patterns: [/persona/, /blend/, /bot/]},
];

function parseArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

function toCandidate(row: UsageLearningCandidateRow): UsageLearningCandidate {
  return UsageLearningCandidateSchema.parse({
    candidate_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    source_environment: row.source_environment,
    source_factory_id: row.source_factory_id,
    source_session_or_event: row.source_session_or_event,
    detected_at: row.detected_at,
    signal_type: row.signal_type,
    summary: row.summary,
    affected_process: row.affected_process,
    affected_output_family: row.affected_output_family,
    domain_refs: parseArray(row.domain_refs_json),
    evidence_summary: row.evidence_summary,
    evidence_refs: parseArray(row.evidence_refs_json),
    repetition_count: row.repetition_count,
    confidence: row.confidence,
    status: row.status,
    privacy: row.privacy,
    scope: row.scope,
    godmode_targets: parseArray(row.godmode_targets_json),
    routing_status: row.routing_status,
    canon_status: row.canon_status,
    review_status: row.review_status,
    reviewer_id: row.reviewer_id,
    review_note: row.review_note,
    dedupe_key: row.dedupe_key,
    audit_trace: [
      'usage_harvester_v1',
      'minimum_evidence_only',
      'no_raw_conversation',
      'no_auto_canon',
      'no_external_action',
    ],
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

export function resolveGodModeTargets(input: {
  domainRefs?: string[];
  affectedProcess: string;
  affectedOutputFamily: string;
}): {domainRefs: string[]; godmodeTargets: string[]; routingStatus: UsageLearningRoutingStatus} {
  const explicit = unique(input.domainRefs ?? []).filter((domain) => DOMAIN_OWNERS[domain] !== undefined);
  const haystack = `${input.affectedProcess} ${input.affectedOutputFamily}`.toLowerCase();
  const inferred = DOMAIN_PATTERNS
    .filter((entry) => entry.patterns.some((pattern) => pattern.test(haystack)))
    .map((entry) => entry.domain);
  const domainRefs = unique([...explicit, ...inferred]);

  if (domainRefs.length === 0) {
    return {
      domainRefs: ['D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT'],
      godmodeTargets: ['AUTONOMY_STEP1', 'OBSERVABILITY'],
      routingStatus: 'ambiguous',
    };
  }

  return {
    domainRefs,
    godmodeTargets: unique(domainRefs.flatMap((domain) => DOMAIN_OWNERS[domain] ?? [])),
    routingStatus: domainRefs.length === 1 ? 'routed' : 'ambiguous',
  };
}

function confidenceFor(repetitionCount: number): UsageLearningCandidate['confidence'] {
  if (repetitionCount >= 5) return 'high';
  if (repetitionCount >= 2) return 'medium';
  return 'low';
}

function statusFor(signalType: UsageLearningSignalType, repetitionCount: number): UsageLearningCandidateStatus {
  if (signalType === 'contradiction') return 'contradiction';
  return repetitionCount >= 2 ? 'hypothesis' : 'observation';
}

function dedupeKey(input: UsageLearningSignal, domainRefs: string[]): string {
  const payload = [
    input.owner_id,
    input.project_id ?? '',
    input.source_environment,
    input.signal_type,
    input.affected_process,
    input.affected_output_family,
    input.scope,
    ...domainRefs,
  ].join('|').toLowerCase();
  return createHash('sha256').update(payload).digest('hex');
}

export function harvestUsageSignal(input: UsageLearningSignal): UsageLearningCandidate {
  const routing = resolveGodModeTargets({
    domainRefs: input.domain_refs,
    affectedProcess: input.affected_process,
    affectedOutputFamily: input.affected_output_family,
  });
  const key = dedupeKey(input, routing.domainRefs);
  const existing = getDb()
    .prepare('SELECT * FROM usage_learning_candidates WHERE dedupe_key = ?')
    .get(key) as UsageLearningCandidateRow | undefined;

  if (existing) {
    const currentEvidenceRefs = parseArray(existing.evidence_refs_json);
    const evidenceRefs = unique([...currentEvidenceRefs, ...input.evidence_refs]);
    if (evidenceRefs.length === currentEvidenceRefs.length) return toCandidate(existing);
    const repetitionCount = existing.repetition_count + 1;
    const nextStatus = existing.status === 'user_confirmed_rule'
      ? existing.status
      : statusFor(input.signal_type, repetitionCount);
    const now = Date.now();
    getDb()
      .prepare(
        `UPDATE usage_learning_candidates
            SET evidence_refs_json = ?, evidence_summary = ?, repetition_count = ?, confidence = ?,
                status = ?, updated_at = ?
          WHERE id = ?`,
      )
      .run(
        JSON.stringify(evidenceRefs.slice(-20)),
        input.evidence_summary,
        repetitionCount,
        confidenceFor(repetitionCount),
        nextStatus,
        now,
        existing.id,
      );
    return getUsageLearningCandidate(existing.id);
  }

  const id = uuid();
  const now = Date.now();
  const initialStatus = statusFor(input.signal_type, 1);
  getDb()
    .prepare(
      `INSERT INTO usage_learning_candidates
         (id, owner_id, project_id, source_environment, source_factory_id,
          source_session_or_event, signal_type, summary, affected_process,
          affected_output_family, domain_refs_json, evidence_summary, evidence_refs_json,
          repetition_count, confidence, status, privacy, scope, godmode_targets_json,
          routing_status, canon_status, review_status, reviewer_id, review_note,
          dedupe_key, detected_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'low', ?, ?, ?, ?, ?,
               'candidate_only', 'pending', NULL, NULL, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.owner_id,
      input.project_id,
      input.source_environment,
      input.source_factory_id,
      input.source_session_or_event,
      input.signal_type,
      input.summary,
      input.affected_process,
      input.affected_output_family,
      JSON.stringify(routing.domainRefs),
      input.evidence_summary,
      JSON.stringify(unique(input.evidence_refs).slice(-20)),
      initialStatus,
      input.privacy,
      input.scope,
      JSON.stringify(routing.godmodeTargets),
      routing.routingStatus,
      key,
      now,
      now,
      now,
    );

  audit({
    event_type: 'usage_learning_candidate_created',
    user_id: input.owner_id,
    scope: input.scope,
    detail: {
      candidate_id: id,
      signal_type: input.signal_type,
      routing_status: routing.routingStatus,
      godmode_targets: routing.godmodeTargets,
      privacy: input.privacy,
      no_raw_conversation: true,
      no_auto_canon: true,
      no_external_action: true,
    },
  });
  return getUsageLearningCandidate(id);
}

export function getUsageLearningCandidate(candidateId: string): UsageLearningCandidate {
  const row = getDb()
    .prepare('SELECT * FROM usage_learning_candidates WHERE id = ?')
    .get(candidateId) as UsageLearningCandidateRow | undefined;
  if (!row) throw new Error('usage_learning_candidate_not_found');
  return toCandidate(row);
}

export function listUsageLearningCandidates(options: {
  reviewStatus?: UsageLearningCandidate['review_status'];
} = {}): UsageLearningCandidate[] {
  const rows = options.reviewStatus
    ? getDb()
      .prepare('SELECT * FROM usage_learning_candidates WHERE review_status = ? ORDER BY updated_at DESC')
      .all(options.reviewStatus) as UsageLearningCandidateRow[]
    : getDb()
      .prepare('SELECT * FROM usage_learning_candidates ORDER BY updated_at DESC')
      .all() as UsageLearningCandidateRow[];
  return rows.map(toCandidate);
}

export function decideUsageLearningCandidate(
  actor: AuthUser,
  candidateId: string,
  request: DecideValidationInboxItemRequest,
): UsageLearningCandidate {
  const candidate = getUsageLearningCandidate(candidateId);
  if (candidate.review_status !== 'pending') throw new Error('usage_learning_candidate_already_decided');
  if (!['approve', 'park', 'reject', 'archive'].includes(request.decision)) {
    throw new Error('usage_learning_candidate_decision_not_supported');
  }

  const reviewStatus = request.decision === 'approve'
    ? 'approved'
    : request.decision === 'park'
      ? 'parked'
      : request.decision === 'archive'
        ? 'archived'
        : 'rejected';
  const status = request.decision === 'approve' ? 'user_confirmed_rule' : candidate.status;
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE usage_learning_candidates
          SET review_status = ?, status = ?, reviewer_id = ?, review_note = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(reviewStatus, status, actor.id, request.note ?? null, now, candidateId);

  audit({
    event_type: 'usage_learning_candidate_decided',
    user_id: actor.id,
    scope: candidate.scope,
    detail: {
      candidate_id: candidateId,
      decision: request.decision,
      review_status: reviewStatus,
      no_process_update: true,
      no_auto_canon: true,
      no_external_action: true,
    },
  });
  return getUsageLearningCandidate(candidateId);
}

function signalTypeForWorkflowEvent(event: WorkflowEvent): UsageLearningSignalType | null {
  if (event.event_type === 'validation_rejected') return 'repeated_correction';
  if (event.event_type === 'workflow_failed' || event.event_type === 'job_failed') return 'failure_or_rework';
  if (
    event.event_type === 'workflow_blocked'
    || event.event_type === 'resource_missing'
    || event.event_type === 'permission_denied'
  ) return 'recurring_exception';
  return null;
}

/**
 * Extraction native bornée : uniquement depuis des métadonnées workflow déjà nettoyées.
 * Aucun contenu de conversation, payload métier ou secret n'est lu.
 */
export function harvestUsageFromWorkflowEvent(event: WorkflowEvent): UsageLearningCandidate | null {
  const signalType = signalTypeForWorkflowEvent(event);
  if (!signalType) return null;
  const projectId = event.project_id && getDb().prepare('SELECT 1 FROM projects WHERE id = ?').get(event.project_id)
    ? event.project_id
    : null;
  const scope = event.project_id
    ? `project:${event.project_id}`
    : event.room_id
      ? `room:${event.room_id}`
      : `owner:${event.owner_id}`;
  return harvestUsageSignal({
    owner_id: event.owner_id,
    project_id: projectId,
    source_environment: 'masterflow_native',
    source_factory_id: null,
    source_session_or_event: event.workflow_id,
    signal_type: signalType,
    summary: `Signal ${signalType} détecté sur ${event.workflow_type}/${event.capability_id}.`,
    affected_process: event.workflow_type,
    affected_output_family: event.capability_id,
    evidence_summary: `Métadonnée workflow ${event.event_type}; contenu brut non collecté.`,
    evidence_refs: [`workflow_event:${event.event_id}`],
    privacy: 'do_not_export',
    scope,
  });
}

function domainsForTeacherDelta(delta: TeacherDecisionDelta): string[] {
  if (['feedback', 'criterion_score', 'rubric', 'calibration'].includes(delta.object_type)) {
    return ['D06_CORRECTION_FEEDBACK_EVALUATION'];
  }
  return ['D05_PEDAGOGY'];
}

/**
 * Apprend d'une décision professeur déjà structurée, sans lire la proposition, la décision
 * humaine ou la note libre pointées par leurs références.
 */
export function harvestUsageFromTeacherDecisionDelta(
  delta: TeacherDecisionDelta,
): UsageLearningCandidate {
  const scope = delta.project_id
    ? `project:${delta.project_id}`
    : `owner:${delta.teacher_id}`;
  return harvestUsageSignal({
    owner_id: delta.teacher_id,
    project_id: delta.project_id ?? null,
    source_environment: 'masterflow_native',
    source_factory_id: null,
    source_session_or_event: delta.delta_id,
    signal_type: 'repeated_correction',
    summary: `Décision professeur sur ${delta.object_type}; ${delta.changed_fields.length} champ(s) ajusté(s).`,
    affected_process: `teacher_decision_${delta.object_type}`,
    affected_output_family: delta.object_type,
    evidence_summary: 'Delta humain structuré distinct de la proposition IA; contenus référencés non lus.',
    evidence_refs: [
      `teacher_decision_delta:${delta.delta_id}`,
      `object:${delta.object_ref}`,
      `ai_proposal_ref:${delta.ai_proposal_ref}`,
      `human_decision_ref:${delta.human_decision_ref}`,
    ],
    privacy: 'do_not_export',
    scope,
    domain_refs: domainsForTeacherDelta(delta),
  });
}

/**
 * Convertit uniquement une finding explicitement validée en apprentissage candidat.
 * Une observation, hypothèse ou finding archivée ne traverse jamais cette frontière.
 */
export function harvestUsageFromValidatedD12Finding(
  finding: D12MissedTriggerFinding,
): UsageLearningCandidate | null {
  if (finding.status !== 'validated_alert') return null;
  const scope = finding.project_id
    ? `project:${finding.project_id}`
    : `owner:${finding.owner_id}`;
  return harvestUsageSignal({
    owner_id: finding.owner_id,
    project_id: finding.project_id,
    source_environment: 'masterflow_native',
    source_factory_id: null,
    source_session_or_event: finding.finding_id,
    signal_type: 'missed_trigger',
    summary: `Finding D12 validée pour le processus ${finding.expected_process}.`,
    affected_process: finding.expected_process,
    affected_output_family: finding.output_family_refs[0] ?? 'process_activation',
    evidence_summary: `Alerte ${finding.severity} validée par un owner; contenu source non recopié.`,
    evidence_refs: [
      `d12_finding:${finding.finding_id}`,
      finding.source_ref,
      ...finding.evidence_refs,
    ],
    privacy: 'do_not_export',
    scope,
    domain_refs: unique([
      'D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT',
      ...finding.domain_refs,
    ]),
  });
}
