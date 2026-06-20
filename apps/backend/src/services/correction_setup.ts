import {
  CreateInstitutionalGradingProfileRequestSchema,
  CreateRubricTemplateRequestSchema,
  CreateRubricVersionRequestSchema,
  InstitutionalGradingProfileSchema,
  ROLE_RANK,
  RubricTemplateSchema,
  RubricVersionSchema,
  type CreateInstitutionalGradingProfileRequest,
  type CreateRubricTemplateRequest,
  type CreateRubricVersionRequest,
  type InstitutionalGradingProfile,
  type RubricTemplate,
  type RubricVersion,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface RubricTemplateRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  title: string;
  subject_ref: string | null;
  current_version_ref: string | null;
  status: 'draft' | 'active' | 'deprecated';
  created_at: number;
  updated_at: number;
}

interface RubricVersionRow {
  id: string;
  template_id: string;
  version: number;
  project_id: string | null;
  project_scope: string;
  criteria_json: string;
  total_points: number;
  status: 'draft' | 'candidate' | 'validated' | 'archived';
  created_by: string;
  created_at: number;
}

interface GradingProfileRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  project_scope: string;
  version: number;
  scale_json: string;
  expected_band_json: string;
  anchors_json: string;
  calibration_mode: 'diagnostic_then_teacher_validation';
  max_global_delta: number;
  protected_thresholds_json: string;
  threshold_crossing_requires_validation: number;
  status: 'draft' | 'validated' | 'deprecated';
  created_at: number;
}

function requireTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function canManageProject(actor: AuthUser, projectId: string): boolean {
  return decideScopedPermission({
    actor,
    projectId,
    minimumProjectRole: 'editor',
  }).allowed;
}

function assertScopeAccess(actor: AuthUser, ownerId: string, projectId: string | null): void {
  if (projectId) {
    if (!canManageProject(actor, projectId)) throw new Error('project_not_found');
    return;
  }
  if (ownerId !== actor.id) throw new Error('scope_denied');
}

function resolveScope(actor: AuthUser, projectId: string | null | undefined): {
  projectId: string | null;
  projectScope: string;
} {
  if (projectId) {
    if (!canManageProject(actor, projectId)) throw new Error('project_not_found');
    return {projectId, projectScope: projectId};
  }
  return {projectId: null, projectScope: actor.id};
}

function toTemplate(row: RubricTemplateRow): RubricTemplate {
  return RubricTemplateSchema.parse({
    template_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    title: row.title,
    subject_ref: row.subject_ref,
    current_version_ref: row.current_version_ref,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toVersion(row: RubricVersionRow): RubricVersion {
  return RubricVersionSchema.parse({
    version_id: row.id,
    template_id: row.template_id,
    version: row.version,
    project_id: row.project_id,
    project_scope: row.project_scope,
    criteria: JSON.parse(row.criteria_json) as unknown,
    total_points: row.total_points,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
  });
}

function toProfile(row: GradingProfileRow): InstitutionalGradingProfile {
  return InstitutionalGradingProfileSchema.parse({
    profile_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    project_scope: row.project_scope,
    version: row.version,
    scale: JSON.parse(row.scale_json) as unknown,
    expected_cohort_band: JSON.parse(row.expected_band_json) as unknown,
    anchors: JSON.parse(row.anchors_json) as unknown,
    calibration_mode: row.calibration_mode,
    max_global_delta: row.max_global_delta,
    protected_thresholds: JSON.parse(row.protected_thresholds_json) as unknown,
    threshold_crossing_requires_validation: row.threshold_crossing_requires_validation === 1,
    status: row.status,
    created_at: row.created_at,
  });
}

function requireTemplate(actor: AuthUser, templateId: string): RubricTemplateRow {
  const row = getDb().prepare('SELECT * FROM rubric_templates WHERE id = ?').get(templateId) as
    | RubricTemplateRow
    | undefined;
  if (!row) throw new Error('rubric_template_not_found');
  assertScopeAccess(actor, row.owner_id, row.project_id);
  return row;
}

function requireVersion(actor: AuthUser, versionId: string): RubricVersionRow {
  const row = getDb().prepare(
    `SELECT rv.* FROM rubric_versions rv
     INNER JOIN rubric_templates rt ON rt.id = rv.template_id
     WHERE rv.id = ?`,
  ).get(versionId) as RubricVersionRow | undefined;
  if (!row) throw new Error('rubric_version_not_found');
  const template = requireTemplate(actor, row.template_id);
  if (template.project_id !== row.project_id || template.project_scope !== row.project_scope) {
    throw new Error('rubric_scope_mismatch');
  }
  return row;
}

function requireProfile(actor: AuthUser, profileId: string): GradingProfileRow {
  const row = getDb().prepare('SELECT * FROM institutional_grading_profiles WHERE id = ?').get(profileId) as
    | GradingProfileRow
    | undefined;
  if (!row) throw new Error('grading_profile_not_found');
  assertScopeAccess(actor, row.owner_id, row.project_id);
  return row;
}

export function listRubricTemplates(actor: AuthUser, projectId?: string | null): RubricTemplate[] {
  requireTeacher(actor);
  if (projectId) {
    if (!canManageProject(actor, projectId)) throw new Error('project_not_found');
    return (getDb().prepare(
      'SELECT * FROM rubric_templates WHERE project_id = ? ORDER BY updated_at DESC, title COLLATE NOCASE',
    ).all(projectId) as RubricTemplateRow[]).map(toTemplate);
  }
  return (getDb().prepare(
    'SELECT * FROM rubric_templates WHERE owner_id = ? AND project_id IS NULL ORDER BY updated_at DESC, title COLLATE NOCASE',
  ).all(actor.id) as RubricTemplateRow[]).map(toTemplate);
}

export function listRubricVersions(actor: AuthUser, templateId: string): RubricVersion[] {
  requireTeacher(actor);
  requireTemplate(actor, templateId);
  return (getDb().prepare(
    'SELECT * FROM rubric_versions WHERE template_id = ? ORDER BY version DESC',
  ).all(templateId) as RubricVersionRow[]).map(toVersion);
}

export function createRubricTemplate(
  actor: AuthUser,
  input: CreateRubricTemplateRequest,
): {template: RubricTemplate; version: RubricVersion} {
  requireTeacher(actor);
  const request = CreateRubricTemplateRequestSchema.parse(input);
  const scope = resolveScope(actor, request.project_id);
  const now = Date.now();
  const templateId = uuid();
  const versionId = uuid();
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO rubric_templates
         (id, owner_id, project_id, project_scope, title, subject_ref, current_version_ref, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'draft', ?, ?)`,
    ).run(templateId, actor.id, scope.projectId, scope.projectScope, request.title, request.subject_ref ?? null, now, now);
    db.prepare(
      `INSERT INTO rubric_versions
         (id, template_id, version, project_id, project_scope, criteria_json, total_points, status, created_by, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, 'draft', ?, ?)`,
    ).run(
      versionId,
      templateId,
      scope.projectId,
      scope.projectScope,
      JSON.stringify(request.criteria),
      request.total_points,
      actor.id,
      now,
    );
  })();
  audit({
    event_type: 'correction.rubric_template_created',
    user_id: actor.id,
    scope: scope.projectScope,
    detail: {template_id: templateId, version_id: versionId, project_id: scope.projectId},
  });
  return {template: toTemplate(requireTemplate(actor, templateId)), version: toVersion(requireVersion(actor, versionId))};
}

export function createRubricVersion(
  actor: AuthUser,
  templateId: string,
  input: CreateRubricVersionRequest,
): RubricVersion {
  requireTeacher(actor);
  const request = CreateRubricVersionRequestSchema.parse(input);
  const template = requireTemplate(actor, templateId);
  if (template.status === 'deprecated') throw new Error('rubric_template_deprecated');
  const db = getDb();
  const current = db.prepare(
    'SELECT COALESCE(MAX(version), 0) AS version FROM rubric_versions WHERE template_id = ?',
  ).get(templateId) as {version: number};
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO rubric_versions
       (id, template_id, version, project_id, project_scope, criteria_json, total_points, status, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
  ).run(
    id,
    templateId,
    current.version + 1,
    template.project_id,
    template.project_scope,
    JSON.stringify(request.criteria),
    request.total_points,
    actor.id,
    now,
  );
  audit({
    event_type: 'correction.rubric_version_created',
    user_id: actor.id,
    scope: template.project_scope,
    detail: {template_id: templateId, version_id: id, version: current.version + 1},
  });
  return toVersion(requireVersion(actor, id));
}

export function validateRubricVersion(actor: AuthUser, versionId: string): RubricVersion {
  requireTeacher(actor);
  const version = requireVersion(actor, versionId);
  if (version.status === 'archived') throw new Error('rubric_version_archived');
  if (version.status === 'validated') return toVersion(version);
  const now = Date.now();
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE rubric_versions SET status = 'validated' WHERE id = ?").run(versionId);
    db.prepare(
      "UPDATE rubric_templates SET current_version_ref = ?, status = 'active', updated_at = ? WHERE id = ?",
    ).run(versionId, now, version.template_id);
  })();
  audit({
    event_type: 'correction.rubric_version_validated',
    user_id: actor.id,
    scope: version.project_scope,
    detail: {template_id: version.template_id, version_id: versionId, version: version.version},
  });
  return toVersion(requireVersion(actor, versionId));
}

export function listInstitutionalGradingProfiles(
  actor: AuthUser,
  projectId?: string | null,
): InstitutionalGradingProfile[] {
  requireTeacher(actor);
  if (projectId) {
    if (!canManageProject(actor, projectId)) throw new Error('project_not_found');
    return (getDb().prepare(
      'SELECT * FROM institutional_grading_profiles WHERE project_id = ? ORDER BY version DESC',
    ).all(projectId) as GradingProfileRow[]).map(toProfile);
  }
  return (getDb().prepare(
    'SELECT * FROM institutional_grading_profiles WHERE owner_id = ? AND project_id IS NULL ORDER BY version DESC',
  ).all(actor.id) as GradingProfileRow[]).map(toProfile);
}

export function createInstitutionalGradingProfile(
  actor: AuthUser,
  input: CreateInstitutionalGradingProfileRequest,
): InstitutionalGradingProfile {
  requireTeacher(actor);
  const request = CreateInstitutionalGradingProfileRequestSchema.parse(input);
  const scope = resolveScope(actor, request.project_id);
  const db = getDb();
  const current = db.prepare(
    'SELECT COALESCE(MAX(version), 0) AS version FROM institutional_grading_profiles WHERE owner_id = ? AND project_scope = ?',
  ).get(actor.id, scope.projectScope) as {version: number};
  const id = uuid();
  const now = Date.now();
  db.prepare(
    `INSERT INTO institutional_grading_profiles
       (id, owner_id, project_id, project_scope, version, scale_json, expected_band_json,
        anchors_json, calibration_mode, max_global_delta, protected_thresholds_json,
        threshold_crossing_requires_validation, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'diagnostic_then_teacher_validation', ?, ?, ?, 'draft', ?)`,
  ).run(
    id,
    actor.id,
    scope.projectId,
    scope.projectScope,
    current.version + 1,
    JSON.stringify(request.scale),
    JSON.stringify(request.expected_cohort_band),
    JSON.stringify(request.anchors),
    request.max_global_delta,
    JSON.stringify(request.protected_thresholds),
    request.threshold_crossing_requires_validation ? 1 : 0,
    now,
  );
  audit({
    event_type: 'correction.grading_profile_created',
    user_id: actor.id,
    scope: scope.projectScope,
    detail: {profile_id: id, version: current.version + 1, project_id: scope.projectId},
  });
  return toProfile(requireProfile(actor, id));
}

export function validateInstitutionalGradingProfile(
  actor: AuthUser,
  profileId: string,
): InstitutionalGradingProfile {
  requireTeacher(actor);
  const profile = requireProfile(actor, profileId);
  if (profile.status === 'deprecated') throw new Error('grading_profile_deprecated');
  if (profile.status === 'validated') return toProfile(profile);
  getDb().prepare("UPDATE institutional_grading_profiles SET status = 'validated' WHERE id = ?").run(profileId);
  audit({
    event_type: 'correction.grading_profile_validated',
    user_id: actor.id,
    scope: profile.project_scope,
    detail: {profile_id: profileId, version: profile.version},
  });
  return toProfile(requireProfile(actor, profileId));
}
