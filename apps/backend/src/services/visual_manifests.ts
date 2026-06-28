import {
  CreateVisualManifestRequestSchema,
  CreateVisualReferenceRequestSchema,
  UpdateVisualReferenceRequestSchema,
  ROLE_RANK,
  VisualManifestSchema,
  VisualReferenceSchema,
  type CreateVisualManifestRequest,
  type CreateVisualReferenceRequest,
  type UpdateVisualReferenceRequest,
  type VisualManifest,
  type VisualReference,
  type OutputPromise,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';
import {syncValidationInboxItemForVisualManifest} from './validation_inbox.ts';

interface VisualReferenceRow {
  id: string; owner_id: string; project_id: string | null; project_scope: string; label: string;
  source_ref: string; reference_status: VisualReference['reference_status'];
  provenance_state: VisualReference['provenance_state']; privacy_scope: VisualReference['privacy_scope'];
  created_by: string; created_at: number; updated_at: number;
}
interface VisualManifestRow {
  id: string; owner_id: string; project_id: string | null; project_scope: string; request_title: string;
  intent: string; privacy_scope: VisualManifest['privacy_scope']; canon_entity_refs_json: string;
  da_root_ref: string | null; active_layers_json: string; filters_json: string; output_family: VisualManifest['output_family'];
  output_template: string; source_truth_summary: string; reference_ids_json: string; status: VisualManifest['status'];
  created_by: string; created_at: number; updated_at: number;
  workbench_id: string | null; node_id: string | null;
  output_promise_json: string | null;
}

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}
function canAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  if (!row.project_id) return row.owner_id === actor.id;
  return decideScopedPermission({actor, projectId: row.project_id, minimumProjectRole: 'editor'}).allowed;
}
function assertAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}, error: string): void {
  if (!canAccess(actor, row)) throw new Error(error);
}
function jsonArray(raw: string): string[] {
  const value = JSON.parse(raw) as unknown;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
function defaultOutputPromise(
  manifestId: string,
  outputFamily: VisualManifest['output_family'],
): OutputPromise {
  return {
    promise_id: `${manifestId}:output-promise`,
    output_family: outputFamily === 'visual_diagnostic' ? 'dataviz' : 'visual_static',
    quality_floor: 'reviewable',
    required_evidence: ['reference_provenance', 'owner_visual_review'],
    forbidden_fallbacks: ['silent_style_downgrade', 'unverified_reference'],
    approved_fallbacks: [],
    status: 'candidate',
    user_approved: false,
  };
}
function outputPromise(row: VisualManifestRow): OutputPromise {
  if (!row.output_promise_json) return defaultOutputPromise(row.id, row.output_family);
  try {
    return JSON.parse(row.output_promise_json) as OutputPromise;
  } catch {
    return defaultOutputPromise(row.id, row.output_family);
  }
}
function report(row: VisualManifestRow): VisualManifest['action_ready_report'] {
  const missing: string[] = [];
  if (!row.request_title.trim() || !row.intent.trim()) missing.push('intent');
  if (!row.da_root_ref || jsonArray(row.active_layers_json).length === 0) missing.push('da_resolution');
  if (jsonArray(row.reference_ids_json).length === 0) missing.push('references');
  if (!row.output_template.trim()) missing.push('output_template');
  if (!row.source_truth_summary.trim()) missing.push('source_truth');
  const promise = outputPromise(row);
  const promiseBlocked = promise.status === 'candidate' || !promise.user_approved;
  if (row.status === 'parked') return {final_state: 'parked', missing_items: missing, generation_blockers: ['manifest_parked']};
  if (missing.length > 0) return {final_state: 'not_ready', missing_items: missing, generation_blockers: ['provider_generation_forbidden']};
  return {
    final_state: 'generation_blocked_tech_pending',
    missing_items: [],
    generation_blockers: [
      ...(promiseBlocked ? ['output_promise_not_locked'] : []),
      'visual_storage_absent',
      'generated_asset_lifecycle_absent',
      'd08_validation_review_absent',
      'provider_generation_forbidden',
    ],
  };
}
function manifestStatus(input: CreateVisualManifestRequest): VisualManifest['status'] {
  if (input.reference_ids.length === 0) return 'references_to_classify';
  if (!input.da_root_ref || input.active_layers.length === 0) return 'da_to_resolve';
  return 'generation_blocked_tech_pending';
}
function referenceDto(row: VisualReferenceRow): VisualReference {
  return VisualReferenceSchema.parse({
    reference_id: row.id, owner_id: row.owner_id, project_id: row.project_id, project_scope: row.project_scope,
    label: row.label, source_ref: row.source_ref, reference_status: row.reference_status,
    provenance_state: row.provenance_state, privacy_scope: row.privacy_scope, created_by: row.created_by,
    created_at: row.created_at, updated_at: row.updated_at,
  });
}
function manifestDto(row: VisualManifestRow): VisualManifest {
  return VisualManifestSchema.parse({
    manifest_id: row.id, owner_id: row.owner_id, project_id: row.project_id, project_scope: row.project_scope,
    request_title: row.request_title, intent: row.intent, privacy_scope: row.privacy_scope,
    canon_entity_refs: jsonArray(row.canon_entity_refs_json), da_root_ref: row.da_root_ref,
    active_layers: jsonArray(row.active_layers_json), filters: jsonArray(row.filters_json),
    output_family: row.output_family, output_template: row.output_template, source_truth_summary: row.source_truth_summary,
    reference_ids: jsonArray(row.reference_ids_json), output_promise: outputPromise(row),
    status: row.status, action_ready_report: report(row),
    workbench_id: row.workbench_id, node_id: row.node_id,
    created_by: row.created_by, created_at: row.created_at, updated_at: row.updated_at,
  });
}

export function createVisualReference(actor: AuthUser, input: CreateVisualReferenceRequest): VisualReference {
  requireTeacher(actor);
  const request = CreateVisualReferenceRequestSchema.parse(input);
  if (request.project_id) assertAccess(actor, {owner_id: actor.id, project_id: request.project_id}, 'project_not_found');
  const scope = request.project_id ?? actor.id;
  if (request.project_id === null || request.project_id === undefined ? request.privacy_scope !== 'private' : request.privacy_scope !== 'project_private') throw new Error('visual_reference_privacy_scope_invalid');
  const now = Date.now(); const id = uuid();
  getDb().prepare(`INSERT INTO visual_references VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    id, actor.id, request.project_id ?? null, scope, request.label, request.source_ref, request.reference_status,
    request.provenance_state, request.privacy_scope, actor.id, now, now,
  );
  audit({event_type: 'visual_reference.created', user_id: actor.id, scope, detail: {reference_id: id, provider_call: false}});
  return referenceDto(getDb().prepare('SELECT * FROM visual_references WHERE id=?').get(id) as VisualReferenceRow);
}
export function listVisualReferences(actor: AuthUser, projectId?: string): VisualReference[] {
  requireTeacher(actor);
  const rows = projectId
    ? getDb().prepare('SELECT * FROM visual_references WHERE project_id=? ORDER BY updated_at DESC').all(projectId) as VisualReferenceRow[]
    : getDb().prepare('SELECT * FROM visual_references WHERE owner_id=? AND project_id IS NULL ORDER BY updated_at DESC').all(actor.id) as VisualReferenceRow[];
  return rows.filter((row) => canAccess(actor, row)).map(referenceDto);
}
export function updateVisualReference(actor: AuthUser, id: string, input: UpdateVisualReferenceRequest): VisualReference {
  requireTeacher(actor);
  const request = UpdateVisualReferenceRequestSchema.parse(input);
  const row = getDb().prepare('SELECT * FROM visual_references WHERE id=?').get(id) as VisualReferenceRow | undefined;
  if (!row) throw new Error('visual_reference_not_found');
  assertAccess(actor, row, 'visual_reference_not_found');
  const now = Date.now();
  getDb().prepare('UPDATE visual_references SET reference_status=?, provenance_state=?, updated_at=? WHERE id=?').run(request.reference_status, request.provenance_state, now, id);
  audit({event_type: 'visual_reference.classified', user_id: actor.id, scope: row.project_scope, detail: {reference_id: id, reference_status: request.reference_status}});
  return referenceDto(getDb().prepare('SELECT * FROM visual_references WHERE id=?').get(id) as VisualReferenceRow);
}
export function createVisualManifest(actor: AuthUser, input: CreateVisualManifestRequest): VisualManifest {
  requireTeacher(actor);
  const request = CreateVisualManifestRequestSchema.parse(input);
  if (request.project_id) assertAccess(actor, {owner_id: actor.id, project_id: request.project_id}, 'project_not_found');
  const scope = request.project_id ?? actor.id;
  if (request.project_id === null || request.project_id === undefined ? request.privacy_scope !== 'private' : request.privacy_scope !== 'project_private') throw new Error('visual_manifest_privacy_scope_invalid');
  const references = request.reference_ids.map((referenceId) => getDb().prepare('SELECT * FROM visual_references WHERE id=?').get(referenceId) as VisualReferenceRow | undefined);
  if (references.some((reference) => !reference || !canAccess(actor, reference) || reference.project_id !== (request.project_id ?? null))) throw new Error('visual_reference_not_found');
  const now = Date.now(); const id = uuid(); const status = manifestStatus(request);
  const promise = request.output_promise ?? defaultOutputPromise(id, request.output_family);
  getDb().prepare(`
    INSERT INTO visual_manifests
      (id, owner_id, project_id, project_scope, request_title, intent, privacy_scope,
       canon_entity_refs_json, da_root_ref, active_layers_json, filters_json, output_family,
       output_template, source_truth_summary, reference_ids_json, status, created_by,
       created_at, updated_at, workbench_id, node_id, output_promise_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(id, actor.id, request.project_id ?? null, scope, request.request_title, request.intent, request.privacy_scope,
    JSON.stringify(request.canon_entity_refs), request.da_root_ref ?? null, JSON.stringify(request.active_layers), JSON.stringify(request.filters),
    request.output_family, request.output_template, request.source_truth_summary, JSON.stringify(request.reference_ids), status, actor.id, now, now,
    request.workbench_id ?? null, request.node_id ?? null, JSON.stringify(promise));
  audit({event_type: 'visual_manifest.created', user_id: actor.id, scope, detail: {manifest_id: id, status, output_promise_status: promise.status, provider_call: false, generation_blocked: true}});
  return manifestDto(getDb().prepare('SELECT * FROM visual_manifests WHERE id=?').get(id) as VisualManifestRow);
}
export function listVisualManifests(actor: AuthUser, params?: {projectId?: string; workbenchId?: string; nodeId?: string}): VisualManifest[] {
  requireTeacher(actor);
  const {projectId, workbenchId, nodeId} = params ?? {};
  let sql = 'SELECT * FROM visual_manifests WHERE 1=1';
  const binds: unknown[] = [];
  if (projectId) { sql += ' AND project_id=?'; binds.push(projectId); }
  else { sql += ' AND owner_id=? AND project_id IS NULL'; binds.push(actor.id); }
  if (workbenchId) { sql += ' AND workbench_id=?'; binds.push(workbenchId); }
  if (nodeId) { sql += ' AND node_id=?'; binds.push(nodeId); }
  sql += ' ORDER BY updated_at DESC';
  const rows = getDb().prepare(sql).all(...binds) as VisualManifestRow[];
  return rows.filter((row) => canAccess(actor, row)).map(manifestDto);
}
export function approveVisualManifest(actor: AuthUser, id: string): VisualManifest {
  requireTeacher(actor);
  const row = getDb().prepare('SELECT * FROM visual_manifests WHERE id=?').get(id) as VisualManifestRow | undefined;
  if (!row) throw new Error('visual_manifest_not_found');
  assertAccess(actor, row, 'visual_manifest_not_found');
  const now = Date.now();
  const promise = outputPromise(row);
  const lockedPromise: OutputPromise = {
    ...promise,
    status: 'locked',
    user_approved: true,
  };
  getDb().prepare(
    'UPDATE visual_manifests SET status=?, output_promise_json=?, updated_at=? WHERE id=?',
  ).run('approved', JSON.stringify(lockedPromise), now, id);
  audit({event_type: 'visual_manifest.approved', user_id: actor.id, detail: {manifest_id: id}});
  const manifest = manifestDto(getDb().prepare('SELECT * FROM visual_manifests WHERE id=?').get(id) as VisualManifestRow);
  syncValidationInboxItemForVisualManifest(manifest);
  return manifest;
}

export function rejectVisualManifest(actor: AuthUser, id: string): VisualManifest {
  requireTeacher(actor);
  const row = getDb().prepare('SELECT * FROM visual_manifests WHERE id=?').get(id) as VisualManifestRow | undefined;
  if (!row) throw new Error('visual_manifest_not_found');
  assertAccess(actor, row, 'visual_manifest_not_found');
  const now = Date.now();
  getDb().prepare('UPDATE visual_manifests SET status=?, updated_at=? WHERE id=?').run('rejected', now, id);
  audit({event_type: 'visual_manifest.rejected', user_id: actor.id, detail: {manifest_id: id}});
  const manifest = manifestDto(getDb().prepare('SELECT * FROM visual_manifests WHERE id=?').get(id) as VisualManifestRow);
  syncValidationInboxItemForVisualManifest(manifest);
  return manifest;
}

export function getVisualManifest(actor: AuthUser, id: string): VisualManifest {
  requireTeacher(actor);
  const row = getDb().prepare('SELECT * FROM visual_manifests WHERE id=?').get(id) as VisualManifestRow | undefined;
  if (!row) throw new Error('visual_manifest_not_found');
  assertAccess(actor, row, 'visual_manifest_not_found');
  return manifestDto(row);
}
