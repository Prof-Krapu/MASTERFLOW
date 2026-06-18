import {
  CreateVisualManifestRequestSchema,
  VisualManifestSchema,
  type CreateVisualManifestRequest,
  type D08GateReport,
  type ParsedCreateVisualManifestRequest,
  type ProjectMemberRole,
  type VisualManifest,
} from '@masterflow/shared';

import {getDb, type VisualManifestRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

const PROJECT_EDITOR: ProjectMemberRole = 'editor';

function parseArray(value: string): unknown[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed : [];
}

function canRead(actor: AuthUser, row: VisualManifestRow): boolean {
  if (row.owner_id === actor.id) return true;
  return Boolean(row.project_id && decideScopedPermission({actor, projectId: row.project_id}).allowed);
}

function assertCanCreate(actor: AuthUser, input: ParsedCreateVisualManifestRequest): void {
  if (input.privacy_scope === 'project' && !input.project_id) {
    throw new Error('visual_manifest_project_required');
  }
  if (input.project_id) {
    const decision = decideScopedPermission({
      actor,
      projectId: input.project_id,
      minimumProjectRole: PROJECT_EDITOR,
    });
    if (!decision.allowed) throw new Error('visual_manifest_scope_denied');
  }
}

function gateReport(input: ParsedCreateVisualManifestRequest): D08GateReport {
  const referencesReady = input.references.length > 0 && input.references.every((ref) => ref.status !== 'rejected');
  const mandatoryReady = Boolean(
    input.intent &&
    input.da_root_ref &&
    input.active_layers.length > 0 &&
    input.canon_entity_refs.length > 0 &&
    referencesReady &&
    input.output_template,
  );

  return {
    intent_gate: input.intent ? 'pass' : 'missing',
    owner_gate: 'pass',
    da_resolution_gate: input.da_root_ref ? 'pass' : 'missing',
    da_stack_gate: input.active_layers.length > 0 ? 'pass' : 'missing',
    canon_gate: input.canon_entity_refs.length > 0 ? 'pass' : 'missing',
    source_truth_gate: referencesReady ? 'pass' : 'missing',
    output_gate: input.output_template ? 'pass' : 'missing',
    permission_gate: 'pass',
    completion_gate: mandatoryReady ? 'pass' : 'missing',
    queue_gate: 'blocked',
    human_gate: 'blocked',
  };
}

function toDTO(row: VisualManifestRow): VisualManifest {
  return VisualManifestSchema.parse({
    manifest_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    room_id: row.room_id,
    request_title: row.request_title,
    intent: row.intent,
    privacy_scope: row.privacy_scope,
    canon_entity_refs: parseArray(row.canon_entity_refs_json),
    da_root_ref: row.da_root_ref,
    active_layers: parseArray(row.active_layers_json),
    filters: parseArray(row.filters_json),
    output_template: row.output_template,
    provider_target: row.provider_target,
    references: parseArray(row.references_json),
    gate_report: JSON.parse(row.gate_report_json) as unknown,
    output_readiness: row.output_readiness,
    ui_state: row.ui_state,
    action_ready: row.action_ready === 1,
    validation_item_ref: row.validation_item_ref,
    audit_trace: parseArray(row.audit_trace_json),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

export function createVisualManifest(actor: AuthUser, raw: CreateVisualManifestRequest): VisualManifest {
  const input = CreateVisualManifestRequestSchema.parse(raw);
  assertCanCreate(actor, input);
  const report = gateReport(input);
  const actionReady = report.completion_gate === 'pass';
  const id = uuid();
  const now = Date.now();
  const auditTrace = [`visual_manifest:${id}`, 'manifest_created', 'provider_generation_blocked'];

  getDb().prepare(
    `INSERT INTO visual_manifests
      (id, owner_id, project_id, room_id, request_title, intent, privacy_scope,
       canon_entity_refs_json, da_root_ref, active_layers_json, filters_json, output_template,
       provider_target, references_json, gate_report_json, output_readiness, ui_state,
       action_ready, validation_item_ref, audit_trace_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
  ).run(
    id,
    actor.id,
    input.project_id ?? null,
    input.room_id ?? null,
    input.request_title,
    input.intent,
    input.privacy_scope,
    JSON.stringify(input.canon_entity_refs),
    input.da_root_ref ?? null,
    JSON.stringify(input.active_layers),
    JSON.stringify(input.filters),
    input.output_template ?? null,
    input.provider_target ?? null,
    JSON.stringify(input.references),
    JSON.stringify(report),
    actionReady ? 'manifest_ready' : 'incomplete',
    actionReady ? 'GENERATION_BLOCKED_TECH_PENDING' : 'CADRAGE',
    actionReady ? 1 : 0,
    JSON.stringify(auditTrace),
    now,
    now,
  );

  audit({
    event_type: 'visual_manifest_created',
    user_id: actor.id,
    scope: input.project_id ?? actor.id,
    detail: {manifest_id: id, action_ready: actionReady, provider_execution: false},
  });
  return getVisualManifest(actor, id);
}

export function listVisualManifests(actor: AuthUser): VisualManifest[] {
  const rows = getDb().prepare('SELECT * FROM visual_manifests ORDER BY updated_at DESC').all() as VisualManifestRow[];
  return rows.filter((row) => canRead(actor, row)).map(toDTO);
}

export function getVisualManifest(actor: AuthUser, id: string): VisualManifest {
  const row = getDb().prepare('SELECT * FROM visual_manifests WHERE id = ?').get(id) as VisualManifestRow | undefined;
  if (!row || !canRead(actor, row)) throw new Error('visual_manifest_not_found');
  return toDTO(row);
}
