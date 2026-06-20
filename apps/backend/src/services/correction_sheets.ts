import {
  CorrectionSheetDraftSchema,
  ROLE_RANK,
  SyncCorrectionSheetDraftRequestSchema,
  UpdateCorrectionSheetDraftRequestSchema,
  ValidateCorrectionSheetDraftRequestSchema,
  type CorrectionSheetDerivedFields,
  type CorrectionSheetDraft,
  type SubjectManifest,
  type SyncCorrectionSheetDraftRequest,
  type UpdateCorrectionSheetDraftRequest,
  type ValidateCorrectionSheetDraftRequest,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface CorrectionSheetRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  assignment_id: string;
  source_subject_version_id: string;
  version: number;
  subject_snapshot_json: string;
  derived_fields_json: string;
  teacher_fields_json: string;
  locked_teacher_fields_json: string;
  sync_status: 'synced' | 'needs_teacher_review';
  status: 'draft' | 'validated' | 'archived';
  created_by: string;
  created_at: number;
  updated_at: number;
  validated_by: string | null;
  validated_at: number | null;
  validation_ref: string | null;
}

interface AssignmentRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  source_subject_version_id: string;
  subject_snapshot_json: string;
}

interface SubjectVersionRow {
  id: string;
  template_id: string;
  project_id: string | null;
  project_scope: string;
  manifest_json: string;
  status: 'draft' | 'validated' | 'archived';
}

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function assertAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}): void {
  if (row.project_id) {
    const decision = decideScopedPermission({
      actor,
      projectId: row.project_id,
      minimumProjectRole: 'editor',
    });
    if (!decision.allowed) throw new Error('correction_sheet_not_found');
  } else if (row.owner_id !== actor.id) {
    throw new Error('correction_sheet_not_found');
  }
}

export function deriveCorrectionSheetFields(manifest: SubjectManifest): CorrectionSheetDerivedFields {
  return {
    mission: manifest.mission,
    observable_deliverables: manifest.observable_deliverables,
    proofs_of_understanding: manifest.proofs_of_understanding,
    progression_levels: manifest.progression_levels,
    resource_refs: manifest.resource_refs,
  };
}

function toDto(row: CorrectionSheetRow): CorrectionSheetDraft {
  return CorrectionSheetDraftSchema.parse({
    correction_sheet_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    assignment_id: row.assignment_id,
    source_subject_version_id: row.source_subject_version_id,
    version: row.version,
    subject_snapshot: JSON.parse(row.subject_snapshot_json),
    derived_fields: JSON.parse(row.derived_fields_json),
    teacher_fields: JSON.parse(row.teacher_fields_json),
    locked_teacher_fields: JSON.parse(row.locked_teacher_fields_json),
    sync_status: row.sync_status,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    validated_by: row.validated_by,
    validated_at: row.validated_at,
    validation_ref: row.validation_ref,
  });
}

function requireSheet(actor: AuthUser, id: string): CorrectionSheetRow {
  const row = getDb().prepare('SELECT * FROM correction_sheet_drafts WHERE id = ?').get(id) as
    | CorrectionSheetRow
    | undefined;
  if (!row) throw new Error('correction_sheet_not_found');
  assertAccess(actor, row);
  return row;
}

export function createCorrectionSheetDraftForAssignment(
  actor: AuthUser,
  assignment: AssignmentRow,
): CorrectionSheetDraft {
  const manifest = JSON.parse(assignment.subject_snapshot_json) as SubjectManifest;
  const now = Date.now();
  const id = uuid();
  getDb().prepare(`
    INSERT INTO correction_sheet_drafts (
      id, owner_id, project_id, project_scope, assignment_id, source_subject_version_id,
      version, subject_snapshot_json, derived_fields_json, teacher_fields_json,
      locked_teacher_fields_json, sync_status, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, '{}', '[]', 'synced', 'draft', ?, ?, ?)
  `).run(
    id,
    assignment.owner_id,
    assignment.project_id,
    assignment.project_scope,
    assignment.id,
    assignment.source_subject_version_id,
    assignment.subject_snapshot_json,
    JSON.stringify(deriveCorrectionSheetFields(manifest)),
    actor.id,
    now,
    now,
  );
  audit({
    event_type: 'correction_sheet.draft_created',
    user_id: actor.id,
    scope: assignment.project_scope,
    detail: {correction_sheet_id: id, assignment_id: assignment.id, grade_created: false},
  });
  return toDto(getDb().prepare('SELECT * FROM correction_sheet_drafts WHERE id = ?').get(id) as CorrectionSheetRow);
}

export function listCorrectionSheetDrafts(actor: AuthUser, assignmentId: string): CorrectionSheetDraft[] {
  requireTeacher(actor);
  const assignment = getDb().prepare('SELECT * FROM subject_assignments WHERE id = ?').get(assignmentId) as
    | AssignmentRow
    | undefined;
  if (!assignment) throw new Error('assignment_not_found');
  assertAccess(actor, assignment);
  return (getDb().prepare(`
    SELECT * FROM correction_sheet_drafts WHERE assignment_id = ? ORDER BY version DESC
  `).all(assignmentId) as CorrectionSheetRow[]).map(toDto);
}

export function updateCorrectionSheetDraft(
  actor: AuthUser,
  id: string,
  input: UpdateCorrectionSheetDraftRequest,
): CorrectionSheetDraft {
  requireTeacher(actor);
  const body = UpdateCorrectionSheetDraftRequestSchema.parse(input);
  const row = requireSheet(actor, id);
  if (row.status !== 'draft') throw new Error('correction_sheet_not_draft');
  const unknownLock = body.locked_teacher_fields.find((field) => !(field in body.teacher_fields));
  if (unknownLock) throw new Error('locked_teacher_field_missing');
  const now = Date.now();
  getDb().prepare(`
    UPDATE correction_sheet_drafts
    SET teacher_fields_json = ?, locked_teacher_fields_json = ?, updated_at = ?
    WHERE id = ?
  `).run(JSON.stringify(body.teacher_fields), JSON.stringify([...new Set(body.locked_teacher_fields)]), now, id);
  return toDto(getDb().prepare('SELECT * FROM correction_sheet_drafts WHERE id = ?').get(id) as CorrectionSheetRow);
}

export function syncCorrectionSheetDraft(
  actor: AuthUser,
  id: string,
  input: SyncCorrectionSheetDraftRequest,
): CorrectionSheetDraft {
  requireTeacher(actor);
  const body = SyncCorrectionSheetDraftRequestSchema.parse(input);
  const current = requireSheet(actor, id);
  const db = getDb();
  const source = db.prepare('SELECT * FROM subject_versions WHERE id = ?').get(body.source_subject_version_id) as
    | SubjectVersionRow
    | undefined;
  const currentSource = db.prepare('SELECT * FROM subject_versions WHERE id = ?').get(current.source_subject_version_id) as
    | SubjectVersionRow
    | undefined;
  if (
    !source || source.status !== 'validated' || !currentSource ||
    source.template_id !== currentSource.template_id ||
    source.project_id !== current.project_id || source.project_scope !== current.project_scope
  ) throw new Error('validated_subject_version_not_found');
  if (source.id === current.source_subject_version_id) throw new Error('correction_sheet_already_synced');

  const max = db.prepare(`
    SELECT COALESCE(MAX(version), 0) AS version FROM correction_sheet_drafts WHERE assignment_id = ?
  `).get(current.assignment_id) as {version: number};
  const now = Date.now();
  const nextId = uuid();
  const manifest = JSON.parse(source.manifest_json) as SubjectManifest;
  db.prepare(`
    INSERT INTO correction_sheet_drafts (
      id, owner_id, project_id, project_scope, assignment_id, source_subject_version_id,
      version, subject_snapshot_json, derived_fields_json, teacher_fields_json,
      locked_teacher_fields_json, sync_status, status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'needs_teacher_review', 'draft', ?, ?, ?)
  `).run(
    nextId,
    current.owner_id,
    current.project_id,
    current.project_scope,
    current.assignment_id,
    source.id,
    max.version + 1,
    source.manifest_json,
    JSON.stringify(deriveCorrectionSheetFields(manifest)),
    current.teacher_fields_json,
    current.locked_teacher_fields_json,
    actor.id,
    now,
    now,
  );
  audit({
    event_type: 'correction_sheet.synced_for_review',
    user_id: actor.id,
    scope: current.project_scope,
    detail: {previous_sheet_id: current.id, correction_sheet_id: nextId, locked_fields_preserved: true},
  });
  return toDto(db.prepare('SELECT * FROM correction_sheet_drafts WHERE id = ?').get(nextId) as CorrectionSheetRow);
}

export function validateCorrectionSheetDraft(
  actor: AuthUser,
  id: string,
  input: ValidateCorrectionSheetDraftRequest,
): CorrectionSheetDraft {
  requireTeacher(actor);
  const body = ValidateCorrectionSheetDraftRequestSchema.parse(input);
  const row = requireSheet(actor, id);
  if (row.status !== 'draft') throw new Error('correction_sheet_not_draft');
  const now = Date.now();
  getDb().prepare(`
    UPDATE correction_sheet_drafts
    SET status = 'validated', sync_status = 'synced', validated_by = ?, validated_at = ?,
        validation_ref = ?, updated_at = ? WHERE id = ?
  `).run(actor.id, now, body.validation_ref, now, id);
  audit({
    event_type: 'correction_sheet.validated',
    user_id: actor.id,
    scope: row.project_scope,
    detail: {correction_sheet_id: id, grade_created: false, publication: false},
  });
  return toDto(getDb().prepare('SELECT * FROM correction_sheet_drafts WHERE id = ?').get(id) as CorrectionSheetRow);
}
