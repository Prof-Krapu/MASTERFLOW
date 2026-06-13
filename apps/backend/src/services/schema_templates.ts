import {
  CreateSchemaTemplateRequestSchema,
  ROLE_RANK,
  SchemaTemplateSchema,
  type CreateSchemaTemplateRequest,
  type SchemaTemplate,
} from '@masterflow/shared';

import {getDb, type SchemaTemplateRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

function parseJsonObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as unknown;
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return null;
  return parsed as Record<string, unknown>;
}

function parseJsonArray(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is string => typeof item === 'string');
}

function toTemplate(row: SchemaTemplateRow): SchemaTemplate {
  return SchemaTemplateSchema.parse({
    template_id: row.id,
    domain: row.domain,
    name: row.name,
    status: row.status,
    version: row.version,
    owner_id: row.owner_id,
    schema_json: parseJsonObject(row.schema_json) ?? {},
    required_fields: parseJsonArray(row.required_fields_json),
    validation_rules: parseJsonObject(row.validation_rules_json) ?? {},
    ui_hints: parseJsonObject(row.ui_hints_json),
    changelog: row.changelog,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function isAdmin(actor: AuthUser): boolean {
  return ROLE_RANK[actor.role] >= ROLE_RANK.admin;
}

function assertTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function assertAdmin(actor: AuthUser): void {
  if (!isAdmin(actor)) throw new Error('permission_denied');
}

function canReadTemplate(actor: AuthUser, row: SchemaTemplateRow): boolean {
  return isAdmin(actor) || row.owner_id === null || row.owner_id === actor.id;
}

function getTemplateRow(templateId: string): SchemaTemplateRow | undefined {
  return getDb().prepare('SELECT * FROM schema_templates WHERE id = ?').get(templateId) as
    | SchemaTemplateRow
    | undefined;
}

function assertValidTemplateShape(input: CreateSchemaTemplateRequest): void {
  const schema = input.schema_json;
  if (schema.type !== 'object') throw new Error('template_schema_invalid');
  const properties = schema.properties;
  if (properties === null || Array.isArray(properties) || typeof properties !== 'object') {
    throw new Error('template_schema_invalid');
  }
  const propertyNames = new Set(Object.keys(properties));
  if (propertyNames.size === 0) throw new Error('template_schema_invalid');
  for (const field of input.required_fields) {
    if (!propertyNames.has(field)) throw new Error('template_required_field_unknown');
  }
}

export function listSchemaTemplates(
  actor: AuthUser,
  options: {includeAll?: boolean; includeDeprecated?: boolean} = {},
): SchemaTemplate[] {
  const includeAll = options.includeAll === true && isAdmin(actor);
  const includeDeprecated = options.includeDeprecated === true && isAdmin(actor);
  const rows = includeAll
    ? (getDb().prepare('SELECT * FROM schema_templates ORDER BY updated_at DESC, name').all() as SchemaTemplateRow[])
    : (getDb()
        .prepare(
          `SELECT * FROM schema_templates
           WHERE (owner_id IS NULL OR owner_id = ?)
             AND (? = 1 OR status NOT IN ('deprecated','archived'))
           ORDER BY updated_at DESC, name`,
        )
        .all(actor.id, includeDeprecated ? 1 : 0) as SchemaTemplateRow[]);
  return rows.filter((row) => canReadTemplate(actor, row)).map(toTemplate);
}

export function getSchemaTemplate(actor: AuthUser, templateId: string): SchemaTemplate {
  const row = getTemplateRow(templateId);
  if (!row || !canReadTemplate(actor, row)) throw new Error('schema_template_not_found');
  if (!isAdmin(actor) && row.status === 'archived') throw new Error('schema_template_not_found');
  return toTemplate(row);
}

export function createSchemaTemplate(actor: AuthUser, input: CreateSchemaTemplateRequest): SchemaTemplate {
  assertTeacher(actor);
  const request = CreateSchemaTemplateRequestSchema.parse(input);
  assertValidTemplateShape(request);

  const duplicate = getDb()
    .prepare(
      `SELECT id FROM schema_templates
       WHERE domain = ? AND name = ? AND version = ? AND owner_id = ?`,
    )
    .get(request.domain, request.name, request.version, actor.id) as {id: string} | undefined;
  if (duplicate) throw new Error('schema_template_version_exists');

  const now = Date.now();
  const templateId = uuid();
  getDb()
    .prepare(
      `INSERT INTO schema_templates
         (id, domain, name, status, version, owner_id, schema_json, required_fields_json,
          validation_rules_json, ui_hints_json, changelog, created_at, updated_at)
       VALUES (?, ?, ?, 'candidate', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      templateId,
      request.domain,
      request.name,
      request.version,
      actor.id,
      JSON.stringify(request.schema_json),
      JSON.stringify(request.required_fields),
      JSON.stringify(request.validation_rules),
      request.ui_hints === undefined || request.ui_hints === null ? null : JSON.stringify(request.ui_hints),
      request.changelog,
      now,
      now,
    );
  audit({
    event_type: 'schema_template.created',
    user_id: actor.id,
    scope: templateId,
    detail: {template_id: templateId, domain: request.domain, status: 'candidate'},
  });
  return getSchemaTemplate(actor, templateId);
}

export function validateSchemaTemplate(actor: AuthUser, templateId: string): SchemaTemplate {
  assertAdmin(actor);
  const row = getTemplateRow(templateId);
  if (!row) throw new Error('schema_template_not_found');
  if (row.status === 'archived') throw new Error('schema_template_archived');
  if (row.status === 'deprecated') throw new Error('schema_template_deprecated');

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE schema_templates
       SET status = 'validated', updated_at = ?
       WHERE id = ?`,
    )
    .run(now, templateId);
  audit({
    event_type: 'schema_template.validated',
    user_id: actor.id,
    scope: templateId,
    detail: {template_id: templateId, previous_status: row.status, version: row.version},
  });
  return getSchemaTemplate(actor, templateId);
}
