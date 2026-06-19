import {
  FactoryBackflowIntakeSchema,
  FactoryBackflowCandidateUpdateSchema,
  type CreateFactoryBackflowIntakeRequest,
  type FactoryBackflowCandidateUpdate,
  type FactoryCandidateRoutingRecommendation,
  type FactoryBackflowIntake,
  type FactoryBackflowIntakeReviewStatus,
} from '@masterflow/shared';

import {
  getDb,
  type FactoryBackflowCandidateUpdateRow,
  type FactoryBackflowIntakeRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  return JSON.parse(value) as T;
}

function parseReasons(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string') : [];
}

function toIntake(row: FactoryBackflowIntakeRow): FactoryBackflowIntake {
  return FactoryBackflowIntakeSchema.parse({
    intake_id: row.id,
    owner_id: row.owner_id,
    factory_id: row.factory_id,
    factory_version: row.factory_version,
    target_platform: row.target_platform,
    export_id: row.export_id,
    export_type: row.export_type,
    source_session_ref: row.source_session_ref,
    summary: row.summary,
    candidate_count: row.candidate_count,
    passport: parseJson(row.passport_json),
    backflow_export: parseJson(row.backflow_export_json),
    quarantine_reasons: parseReasons(row.quarantine_reasons_json),
    intake_status: row.intake_status,
    review_status: row.review_status,
    reviewer_id: row.reviewer_id,
    review_note: row.review_note,
    canon_status: row.canon_status,
    audit_trace: [
      'factory_backflow_intake_v6c',
      'manual_json_only',
      'no_zip_no_file_no_url',
      'candidate_only',
      'no_runtime_activation',
      'no_canon_write',
    ],
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toCandidateUpdate(row: FactoryBackflowCandidateUpdateRow): FactoryBackflowCandidateUpdate {
  return FactoryBackflowCandidateUpdateSchema.parse({
    candidate_update_id: row.id,
    intake_id: row.intake_id,
    owner_id: row.owner_id,
    factory_id: row.factory_id,
    source_candidate_id: row.source_candidate_id,
    summary: row.summary,
    classification: row.classification,
    routing_status: row.routing_status,
    target_domain: row.target_domain,
    candidate_status: row.candidate_status,
    canon_status: row.canon_status,
    routing_recommendation: routingRecommendation(row.classification),
    audit_trace: [
      `factory_backflow_intake:${row.intake_id}`,
      'factory_backflow_candidate_update_v6d',
      'approved_owner_review_only',
      'unrouted',
      'candidate_only',
      'no_canon_write',
      'no_runtime_activation',
    ],
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

/** Proposition canonique en lecture seule : elle ne renseigne jamais target_domain. */
function routingRecommendation(
  classification: FactoryBackflowCandidateUpdate['classification'],
): FactoryCandidateRoutingRecommendation {
  if (classification === 'DA') {
    return {recommended_domains: ['D08_DA_VISUAL_ASSETS'], status: 'owner_decision_required', reason: 'Le canon D11 route les sorties visuelles vers D08.'};
  }
  if (classification === 'PROJECT_LORE') {
    return {recommended_domains: ['D09_MASTERSTORY'], status: 'owner_decision_required', reason: 'Le canon D11 route les sorties narratives vers D09.'};
  }
  if (classification === 'PEDAGOGY') {
    return {recommended_domains: ['D05_PEDAGOGY', 'D06_CORRECTION_FEEDBACK_EVALUATION'], status: 'owner_decision_required', reason: 'Le canon D11 exige un arbitrage humain entre pédagogie et correction.'};
  }
  return {recommended_domains: [], status: 'no_safe_recommendation', reason: 'Aucune correspondance canonique univoque : une décision owner est requise avant routage.'};
}

function missing(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/** Défauts explicites du canon : conserver le dossier, mais le bloquer. */
function quarantineReasons(input: CreateFactoryBackflowIntakeRequest): string[] {
  const passport = input.factory_passport;
  const backflow = input.factory_backflow_export;
  const reasons: string[] = [];

  if (!passport) {
    reasons.push('missing_factory_passport');
  } else {
    if (missing(passport.factory_id)) reasons.push('missing_factory_id');
    if (missing(passport.factory_version)) reasons.push('missing_factory_version');
    if (missing(passport.target_platform)) reasons.push('missing_target_platform');
    if (missing(passport.mission)) reasons.push('missing_factory_mission');
    if (missing(passport.owner_scope)) reasons.push('missing_owner_scope');
    if (!passport.source_manifest?.length) reasons.push('missing_source_manifest');
    if (!passport.capability_profile?.length) reasons.push('missing_capability_profile');
    if (!passport.output_routes?.length) reasons.push('missing_output_routes');
    if (!passport.validation_gates?.length) reasons.push('missing_validation_gates');
    if (missing(passport.backflow_target)) reasons.push('missing_backflow_target');
    if (missing(passport.privacy_classification)) reasons.push('missing_privacy_classification');
    if (passport.security_preflight_status !== 'passed') reasons.push('security_preflight_not_passed');
    if (passport.simulation_status !== 'passed') reasons.push('simulation_not_passed');
  }

  if (!backflow) {
    reasons.push('missing_factory_backflow_export');
  } else {
    if (missing(backflow.export_id)) reasons.push('missing_export_id');
    if (missing(backflow.factory_id)) reasons.push('missing_export_factory_id');
    if (missing(backflow.factory_version)) reasons.push('missing_export_factory_version');
    if (missing(backflow.source_session_ref)) reasons.push('missing_source_session_ref');
    if (missing(backflow.export_type)) reasons.push('missing_export_type');
    if (missing(backflow.summary)) reasons.push('missing_export_summary');
    if (!backflow.candidates?.length) reasons.push('missing_candidate_classification');
    if (backflow.private_content_removed !== true) reasons.push('private_content_not_removed');
    if (missing(backflow.source_truth)) reasons.push('missing_source_truth');
    if (backflow.validation_required !== true) reasons.push('validation_not_required');
    if (missing(backflow.target_masterflow_owner)) reasons.push('missing_target_masterflow_owner');
    if (missing(backflow.recommended_next_action)) reasons.push('missing_recommended_next_action');
  }

  if (passport?.factory_id && backflow?.factory_id && passport.factory_id !== backflow.factory_id) {
    reasons.push('factory_id_mismatch');
  }
  if (passport?.factory_version && backflow?.factory_version && passport.factory_version !== backflow.factory_version) {
    reasons.push('factory_version_mismatch');
  }
  return [...new Set(reasons)];
}

export function createFactoryBackflowIntake(
  actor: AuthUser,
  input: CreateFactoryBackflowIntakeRequest,
): FactoryBackflowIntake {
  const now = Date.now();
  const id = uuid();
  const reasons = quarantineReasons(input);
  const passport = input.factory_passport ?? null;
  const backflow = input.factory_backflow_export ?? null;
  const intakeStatus = reasons.length === 0 ? 'candidate' : 'quarantined';

  getDb().prepare(
    `INSERT INTO factory_backflow_intakes
       (id, owner_id, factory_id, factory_version, target_platform, export_id, export_type,
        source_session_ref, summary, candidate_count, passport_json, backflow_export_json,
        quarantine_reasons_json, intake_status, review_status, reviewer_id, review_note,
        canon_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, 'candidate_only', ?, ?)`,
  ).run(
    id,
    actor.id,
    passport?.factory_id ?? backflow?.factory_id ?? null,
    passport?.factory_version ?? backflow?.factory_version ?? null,
    passport?.target_platform ?? null,
    backflow?.export_id ?? null,
    backflow?.export_type ?? null,
    backflow?.source_session_ref ?? null,
    backflow?.summary ?? null,
    backflow?.candidates?.length ?? 0,
    passport ? JSON.stringify(passport) : null,
    backflow ? JSON.stringify(backflow) : null,
    JSON.stringify(reasons),
    intakeStatus,
    now,
    now,
  );

  audit({
    event_type: 'factory_backflow_intake_created',
    user_id: actor.id,
    scope: 'D11_FACTORIES_BACKFLOW',
    detail: {
      intake_id: id,
      intake_status: intakeStatus,
      quarantine_reasons: reasons,
      manual_json_only: true,
      no_external_fetch: true,
      no_runtime_activation: true,
      no_canon_write: true,
    },
  });
  return getFactoryBackflowIntake(id);
}

export function getFactoryBackflowIntake(intakeId: string): FactoryBackflowIntake {
  const row = getDb().prepare('SELECT * FROM factory_backflow_intakes WHERE id = ?')
    .get(intakeId) as FactoryBackflowIntakeRow | undefined;
  if (!row) throw new Error('factory_backflow_intake_not_found');
  return toIntake(row);
}

export function listPendingFactoryBackflowIntakes(): FactoryBackflowIntake[] {
  const rows = getDb().prepare(
    "SELECT * FROM factory_backflow_intakes WHERE review_status = 'pending' ORDER BY updated_at ASC",
  ).all() as FactoryBackflowIntakeRow[];
  return rows.map(toIntake);
}

export function listFactoryBackflowCandidateUpdates(): FactoryBackflowCandidateUpdate[] {
  const rows = getDb().prepare(
    'SELECT * FROM factory_backflow_candidate_updates ORDER BY updated_at ASC',
  ).all() as FactoryBackflowCandidateUpdateRow[];
  return rows.map(toCandidateUpdate);
}

function materializeCandidateUpdates(intake: FactoryBackflowIntake, now: number): number {
  const candidates = intake.backflow_export?.candidates ?? [];
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO factory_backflow_candidate_updates
       (id, intake_id, owner_id, factory_id, source_candidate_id, summary, classification,
        routing_status, target_domain, candidate_status, canon_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'unrouted', NULL, 'approved_candidate', 'candidate_only', ?, ?)`,
  );
  let created = 0;
  for (const candidate of candidates) {
    const result = insert.run(
      uuid(),
      intake.intake_id,
      intake.owner_id,
      intake.factory_id,
      candidate.candidate_id,
      candidate.summary,
      candidate.classification,
      now,
      now,
    );
    created += result.changes;
  }
  return created;
}

export function decideFactoryBackflowIntake(
  actor: AuthUser,
  intakeId: string,
  decision: 'approve' | 'park' | 'reject' | 'archive' | 'request_precision',
  note?: string,
): FactoryBackflowIntake {
  const intake = getFactoryBackflowIntake(intakeId);
  if (intake.review_status !== 'pending') throw new Error('factory_backflow_intake_already_decided');
  if (intake.intake_status === 'quarantined' && decision === 'approve') {
    throw new Error('factory_backflow_intake_quarantine_requires_precision');
  }
  if (!['approve', 'park', 'reject', 'archive', 'request_precision'].includes(decision)) {
    throw new Error('factory_backflow_intake_decision_not_supported');
  }
  const reviewStatus: FactoryBackflowIntakeReviewStatus = decision === 'approve'
    ? 'approved'
    : decision === 'park' || decision === 'request_precision'
      ? 'parked'
      : decision === 'reject'
        ? 'rejected'
        : 'archived';
  const now = Date.now();
  let candidateUpdatesCreated = 0;
  getDb().transaction(() => {
    getDb().prepare(
      `UPDATE factory_backflow_intakes
          SET review_status = ?, reviewer_id = ?, review_note = ?, updated_at = ?
        WHERE id = ?`,
    ).run(reviewStatus, actor.id, note ?? null, now, intakeId);
    if (decision === 'approve') candidateUpdatesCreated = materializeCandidateUpdates(intake, now);
  })();
  audit({
    event_type: 'factory_backflow_intake_decided',
    user_id: actor.id,
    scope: 'D11_FACTORIES_BACKFLOW',
    detail: {
      intake_id: intakeId,
      decision,
      review_status: reviewStatus,
      intake_status: intake.intake_status,
      candidate_updates_created: candidateUpdatesCreated,
      no_domain_routing: true,
      no_runtime_activation: true,
      no_canon_write: true,
      no_external_action: true,
    },
  });
  return getFactoryBackflowIntake(intakeId);
}
