import {
  EvidenceEventSchema,
  PedagogicalSignalSchema,
  ROLE_RANK,
  TaskModelProfileSchema,
  TeacherDecisionDeltaSchema,
  type EvidenceEvent,
  type PedagogicalSignal,
  type TaskModelProfile,
  type TeacherDecisionDelta,
} from '@masterflow/shared';

import {
  getDb,
  type EvidenceEventRow,
  type PedagogicalSignalRow,
  type TaskModelProfileRow,
  type TeacherDecisionDeltaRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

/**
 * Dépôt interne PR-CB0.
 *
 * Il persiste des objets déjà validés par les schémas partagés, sans exposer de
 * route HTTP. Les objets avec `project_id` utilisent Project/Scope. Les anciens
 * objets sans `project_id` gardent la règle conservatrice owner-only.
 */

function requireMinimumRole(actor: AuthUser, minimum: 'teacher' | 'admin'): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK[minimum]) {
    throw new Error('permission_denied');
  }
}

function assertOwnedByActor(actor: AuthUser, ownerId: string): void {
  if (actor.role === 'teacher' && actor.id !== ownerId) {
    throw new Error('scope_denied');
  }
}

function assertProjectAccess(
  actor: AuthUser,
  projectId: string,
  minimumProjectRole?: 'viewer' | 'participant' | 'editor' | 'admin' | 'owner',
): void {
  const decision = decideScopedPermission({
    actor,
    projectId,
    minimumProjectRole,
  });
  if (!decision.allowed) throw new Error('scope_denied');
}

function assertProjectBridge(projectScope: string, projectId: string | null | undefined): void {
  if (projectId && projectScope !== projectId) {
    throw new Error('project_scope_mismatch');
  }
}

function toEvidenceDTO(row: EvidenceEventRow): EvidenceEvent {
  return EvidenceEventSchema.parse({
    evidence_id: row.id,
    source_type: row.source_type,
    adapter_id: row.adapter_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    target_refs: JSON.parse(row.target_refs_json) as unknown,
    payload_ref: row.payload_ref,
    extraction_confidence: row.extraction_confidence,
    privacy_level: row.privacy_level,
    occurred_at: row.occurred_at,
    status: row.status,
  });
}

function toSignalDTO(row: PedagogicalSignalRow): PedagogicalSignal {
  return PedagogicalSignalSchema.parse({
    signal_id: row.id,
    signal_type: row.signal_type,
    level: row.level,
    project_id: row.project_id,
    project_scope: row.project_scope,
    evidence_refs: JSON.parse(row.evidence_refs_json) as unknown,
    recurrence: row.recurrence,
    contradiction_refs: JSON.parse(row.contradiction_refs_json) as unknown,
    confidence: row.confidence,
    sensitivity: row.sensitivity,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toDeltaDTO(row: TeacherDecisionDeltaRow): TeacherDecisionDelta {
  return TeacherDecisionDeltaSchema.parse({
    delta_id: row.id,
    object_type: row.object_type,
    object_ref: row.object_ref,
    ai_proposal_ref: row.ai_proposal_ref,
    human_decision_ref: row.human_decision_ref,
    changed_fields: JSON.parse(row.changed_fields_json) as unknown,
    reason_code: row.reason_code,
    free_note_ref: row.free_note_ref,
    teacher_id: row.teacher_id,
    context_refs: JSON.parse(row.context_refs_json) as unknown,
    created_at: row.created_at,
  });
}

function toTaskModelProfileDTO(row: TaskModelProfileRow): TaskModelProfile {
  return TaskModelProfileSchema.parse({
    profile_id: row.id,
    task: row.task,
    allowed_providers: JSON.parse(row.allowed_providers_json) as unknown,
    fallback_order: JSON.parse(row.fallback_order_json) as unknown,
    privacy_mode: row.privacy_mode,
    max_cost_eur: row.max_cost_eur,
    max_latency_ms: row.max_latency_ms,
    status: row.status,
  });
}

export function captureEvidence(actor: AuthUser, input: EvidenceEvent): EvidenceEvent {
  requireMinimumRole(actor, 'teacher');
  const evidence = EvidenceEventSchema.parse(input);
  assertOwnedByActor(actor, evidence.owner_id);
  assertProjectBridge(evidence.project_scope, evidence.project_id);
  if (evidence.project_id) {
    assertProjectAccess(actor, evidence.project_id, 'editor');
  }

  getDb()
    .prepare(
      `INSERT INTO evidence_events
         (id, source_type, adapter_id, owner_id, project_id, project_scope, target_refs_json,
          payload_ref, extraction_confidence, privacy_level, occurred_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      evidence.evidence_id,
      evidence.source_type,
      evidence.adapter_id,
      evidence.owner_id,
      evidence.project_id ?? null,
      evidence.project_scope,
      JSON.stringify(evidence.target_refs),
      evidence.payload_ref,
      evidence.extraction_confidence,
      evidence.privacy_level,
      evidence.occurred_at,
      evidence.status,
      Date.now(),
    );

  audit({
    event_type: 'evidence.captured',
    user_id: actor.id,
    scope: evidence.project_scope,
    detail: {
      evidence_id: evidence.evidence_id,
      source_type: evidence.source_type,
      status: evidence.status,
      privacy_level: evidence.privacy_level,
    },
  });
  return getEvidenceOrThrow(evidence.evidence_id);
}

export function listEvidence(
  actor: AuthUser,
  projectScope: string,
  projectId?: string | null,
): EvidenceEvent[] {
  requireMinimumRole(actor, 'teacher');
  assertProjectBridge(projectScope, projectId);
  const db = getDb();
  if (projectId) {
    assertProjectAccess(actor, projectId);
    const rows = db
      .prepare(
        `SELECT * FROM evidence_events
         WHERE project_id = ?
         ORDER BY occurred_at DESC`,
      )
      .all(projectId) as EvidenceEventRow[];
    return rows.map(toEvidenceDTO);
  }
  const rows =
    actor.role === 'teacher'
      ? (db
          .prepare(
            `SELECT * FROM evidence_events
             WHERE project_scope = ? AND owner_id = ?
             ORDER BY occurred_at DESC`,
          )
          .all(projectScope, actor.id) as EvidenceEventRow[])
      : (db
          .prepare(
            `SELECT * FROM evidence_events
             WHERE project_scope = ?
             ORDER BY occurred_at DESC`,
          )
          .all(projectScope) as EvidenceEventRow[]);
  return rows.map(toEvidenceDTO);
}

export function recordPedagogicalSignal(
  actor: AuthUser,
  input: PedagogicalSignal,
): PedagogicalSignal {
  requireMinimumRole(actor, 'teacher');
  const signal = PedagogicalSignalSchema.parse(input);
  assertProjectBridge(signal.project_scope, signal.project_id);
  if (signal.project_id) {
    assertProjectAccess(actor, signal.project_id, 'editor');
  }
  assertEvidenceScope(actor, signal.project_scope, signal.evidence_refs, signal.project_id);

  getDb()
    .prepare(
      `INSERT INTO pedagogical_signals
         (id, signal_type, level, project_id, project_scope, evidence_refs_json, recurrence,
          contradiction_refs_json, confidence, sensitivity, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      signal.signal_id,
      signal.signal_type,
      signal.level,
      signal.project_id ?? null,
      signal.project_scope,
      JSON.stringify(signal.evidence_refs),
      signal.recurrence,
      JSON.stringify(signal.contradiction_refs),
      signal.confidence,
      signal.sensitivity,
      signal.status,
      signal.created_at,
      signal.updated_at,
    );

  audit({
    event_type: 'signal.observed',
    user_id: actor.id,
    scope: signal.project_scope,
    detail: {
      signal_id: signal.signal_id,
      signal_type: signal.signal_type,
      level: signal.level,
      status: signal.status,
    },
  });
  return getSignalOrThrow(signal.signal_id);
}

export function recordTeacherDecisionDelta(
  actor: AuthUser,
  input: TeacherDecisionDelta,
): TeacherDecisionDelta {
  requireMinimumRole(actor, 'teacher');
  const delta = TeacherDecisionDeltaSchema.parse(input);
  assertOwnedByActor(actor, delta.teacher_id);

  getDb()
    .prepare(
      `INSERT INTO teacher_decision_deltas
         (id, object_type, object_ref, ai_proposal_ref, human_decision_ref,
          changed_fields_json, reason_code, free_note_ref, teacher_id,
          context_refs_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      delta.delta_id,
      delta.object_type,
      delta.object_ref,
      delta.ai_proposal_ref,
      delta.human_decision_ref,
      JSON.stringify(delta.changed_fields),
      delta.reason_code,
      delta.free_note_ref,
      delta.teacher_id,
      JSON.stringify(delta.context_refs),
      delta.created_at,
    );

  audit({
    event_type: 'teacher_delta.recorded',
    user_id: actor.id,
    scope: delta.context_refs[0] ?? null,
    detail: {
      delta_id: delta.delta_id,
      object_type: delta.object_type,
      object_ref: delta.object_ref,
      changed_fields: delta.changed_fields,
    },
  });
  return getDeltaOrThrow(delta.delta_id);
}

export function saveTaskModelProfileDraft(
  actor: AuthUser,
  input: TaskModelProfile,
): TaskModelProfile {
  requireMinimumRole(actor, 'admin');
  const profile = TaskModelProfileSchema.parse(input);
  if (profile.status !== 'draft') {
    throw new Error('task_model_profile_requires_validation');
  }

  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO task_model_profiles
         (id, task, allowed_providers_json, fallback_order_json, privacy_mode,
          max_cost_eur, max_latency_ms, status, created_at, updated_at, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         task = excluded.task,
         allowed_providers_json = excluded.allowed_providers_json,
         fallback_order_json = excluded.fallback_order_json,
         privacy_mode = excluded.privacy_mode,
         max_cost_eur = excluded.max_cost_eur,
         max_latency_ms = excluded.max_latency_ms,
         status = 'draft',
         updated_at = excluded.updated_at,
         updated_by = excluded.updated_by`,
    )
    .run(
      profile.profile_id,
      profile.task,
      JSON.stringify(profile.allowed_providers),
      JSON.stringify(profile.fallback_order),
      profile.privacy_mode,
      profile.max_cost_eur,
      profile.max_latency_ms,
      now,
      now,
      actor.id,
    );

  audit({
    event_type: 'model_profile.proposed',
    user_id: actor.id,
    scope: 'task_model_profiles',
    detail: {
      profile_id: profile.profile_id,
      task: profile.task,
      privacy_mode: profile.privacy_mode,
      status: 'draft',
    },
  });
  return getTaskModelProfileOrThrow(profile.profile_id);
}

function assertEvidenceScope(
  actor: AuthUser,
  projectScope: string,
  evidenceRefs: string[],
  projectId?: string | null,
): void {
  const placeholders = evidenceRefs.map(() => '?').join(',');
  const rows = getDb()
    .prepare(
      `SELECT id, owner_id, project_id, project_scope FROM evidence_events
       WHERE id IN (${placeholders})`,
    )
    .all(...evidenceRefs) as Array<{
    id: string;
    owner_id: string;
    project_id: string | null;
    project_scope: string;
  }>;

  if (rows.length !== evidenceRefs.length) throw new Error('evidence_not_found');
  if (rows.some((row) => row.project_scope !== projectScope)) throw new Error('scope_mismatch');
  if (projectId && rows.some((row) => row.project_id !== projectId)) {
    throw new Error('scope_mismatch');
  }
  if (!projectId && actor.role === 'teacher' && rows.some((row) => row.owner_id !== actor.id)) {
    throw new Error('scope_denied');
  }
}

function getEvidenceOrThrow(id: string): EvidenceEvent {
  const row = getDb().prepare('SELECT * FROM evidence_events WHERE id = ?').get(id) as
    | EvidenceEventRow
    | undefined;
  if (!row) throw new Error(`Evidence introuvable: ${id}`);
  return toEvidenceDTO(row);
}

function getSignalOrThrow(id: string): PedagogicalSignal {
  const row = getDb().prepare('SELECT * FROM pedagogical_signals WHERE id = ?').get(id) as
    | PedagogicalSignalRow
    | undefined;
  if (!row) throw new Error(`Signal introuvable: ${id}`);
  return toSignalDTO(row);
}

function getDeltaOrThrow(id: string): TeacherDecisionDelta {
  const row = getDb().prepare('SELECT * FROM teacher_decision_deltas WHERE id = ?').get(id) as
    | TeacherDecisionDeltaRow
    | undefined;
  if (!row) throw new Error(`Delta professeur introuvable: ${id}`);
  return toDeltaDTO(row);
}

function getTaskModelProfileOrThrow(id: string): TaskModelProfile {
  const row = getDb().prepare('SELECT * FROM task_model_profiles WHERE id = ?').get(id) as
    | TaskModelProfileRow
    | undefined;
  if (!row) throw new Error(`Profil de tâche introuvable: ${id}`);
  return toTaskModelProfileDTO(row);
}
