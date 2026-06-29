import {
  ConversationGuideSchema,
  CreateGuideRequestSchema,
  CreateGuidedSessionRequestSchema,
  GuidedContributionSchema,
  GuidedProgressSchema,
  GuidedQuestionSchema,
  GuidedSessionParticipantSchema,
  GuidedSessionSchema,
  ROLE_RANK,
  SubmitGuidedAnswerRequestSchema,
  UpdateGuideRequestSchema,
  type ConversationGuide,
  type CreateGuideRequest,
  type CreateGuidedSessionRequest,
  type GuidedContribution,
  type GuidedProgress,
  type GuidedQuestion,
  type GuidedSession,
  type GuidedSessionParticipant,
  type SchemaTemplate,
  type SubmitGuidedAnswerRequest,
  type UpdateGuideRequest,
} from '@masterflow/shared';

import {
  getDb,
  type ConversationGuideRow,
  type GuidedContributionRow,
  type GuidedSessionParticipantRow,
  type GuidedSessionRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';
import {getSchemaTemplate} from './schema_templates.ts';

function isAdmin(actor: AuthUser): boolean {
  return ROLE_RANK[actor.role] >= ROLE_RANK.admin;
}

function assertTeacher(actor: AuthUser): void {
  if (ROLE_RANK[actor.role] < ROLE_RANK.teacher) throw new Error('permission_denied');
}

function assertAdmin(actor: AuthUser): void {
  if (!isAdmin(actor)) throw new Error('permission_denied');
}

function parseObject(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  const parsed = JSON.parse(raw) as unknown;
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') return {};
  return parsed as Record<string, unknown>;
}

function parseQuestions(raw: string): GuidedQuestion[] {
  return (JSON.parse(raw) as unknown[]).map((item) => GuidedQuestionSchema.parse(item));
}

function consentRequired(policy: Record<string, unknown>): boolean {
  return policy['required'] === true;
}

function assertConsent(policy: Record<string, unknown>, consent: Record<string, unknown>): void {
  if (consentRequired(policy) && consent['accepted'] !== true) {
    throw new Error('guided_consent_required');
  }
}

function guideFromSession(row: GuidedSessionRow): ConversationGuide {
  if (row.guide_snapshot_json) {
    return ConversationGuideSchema.parse(JSON.parse(row.guide_snapshot_json) as unknown);
  }
  const guideRow = getGuideRow(row.guide_id);
  if (!guideRow) throw new Error('guided_guide_not_found');
  return toGuide(guideRow);
}

function schemaFromSession(row: GuidedSessionRow): SchemaTemplate {
  if (row.schema_snapshot_json) {
    const parsed = JSON.parse(row.schema_snapshot_json) as SchemaTemplate;
    return parsed;
  }
  return getSchemaTemplate(
    {id: row.owner_id, username: 'session-owner', role: 'godmode'},
    row.target_schema_id,
  );
}

function validateQuestionValue(question: GuidedQuestion, value: unknown): void {
  const invalid =
    (question.kind === 'text' && typeof value !== 'string') ||
    (question.kind === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) ||
    (question.kind === 'boolean' && typeof value !== 'boolean') ||
    (question.kind === 'choice' &&
      (typeof value !== 'string' || !question.options?.includes(value))) ||
    (question.kind === 'multi_choice' &&
      (!Array.isArray(value) ||
        value.some((item) => typeof item !== 'string' || !question.options?.includes(item))));
  if (invalid) throw new Error('guided_answer_invalid');
}

function validateSchemaValue(schema: Record<string, unknown>, field: string, value: unknown): void {
  const properties = schema['properties'];
  if (!properties || Array.isArray(properties) || typeof properties !== 'object') {
    throw new Error('guided_target_schema_invalid');
  }
  const definition = (properties as Record<string, unknown>)[field];
  if (!definition || Array.isArray(definition) || typeof definition !== 'object') {
    throw new Error('guided_question_target_unknown');
  }
  const type = (definition as Record<string, unknown>)['type'];
  const valid =
    type === undefined ||
    (type === 'string' && typeof value === 'string') ||
    (type === 'number' && typeof value === 'number' && Number.isFinite(value)) ||
    (type === 'integer' && typeof value === 'number' && Number.isInteger(value)) ||
    (type === 'boolean' && typeof value === 'boolean') ||
    (type === 'array' && Array.isArray(value)) ||
    (type === 'object' && value !== null && !Array.isArray(value) && typeof value === 'object');
  if (!valid) throw new Error('guided_answer_schema_invalid');
}

function validateStructuredRecord(template: SchemaTemplate, record: Record<string, unknown>): void {
  for (const field of template.required_fields) {
    if (!(field in record)) throw new Error('guided_session_incomplete');
  }
  for (const [field, value] of Object.entries(record)) {
    validateSchemaValue(template.schema_json, field, value);
  }
}

function toGuide(row: ConversationGuideRow): ConversationGuide {
  return ConversationGuideSchema.parse({
    guide_id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    name: row.name,
    purpose: row.purpose,
    domain: row.domain,
    status: row.status,
    target_schema_id: row.target_schema_id,
    target_schema_version: row.target_schema_version,
    question_flow: parseQuestions(row.question_flow_json),
    completion_rules: parseObject(row.completion_rules_json),
    functional_persona_id: row.functional_persona_id,
    lore_persona_id: row.lore_persona_id,
    ui_manifest: row.ui_manifest_json ? parseObject(row.ui_manifest_json) : null,
    analytics_policy: parseObject(row.analytics_policy_json),
    consent_policy: parseObject(row.consent_policy_json),
    version: row.version,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function toParticipant(row: GuidedSessionParticipantRow): GuidedSessionParticipant {
  return GuidedSessionParticipantSchema.parse({
    session_id: row.session_id,
    user_id: row.user_id,
    guest_id: row.guest_id,
    role: row.role,
    display_name: row.display_name,
    consent: parseObject(row.consent_json),
    joined_at: row.joined_at,
    last_seen_at: row.last_seen_at,
  });
}

function toContribution(row: GuidedContributionRow): GuidedContribution {
  return GuidedContributionSchema.parse({
    contribution_id: row.id,
    session_id: row.session_id,
    participant_ref: row.participant_ref,
    question_id: row.question_id,
    target_field: row.target_field,
    value: JSON.parse(row.value_json) as unknown,
    source: row.source,
    status: row.status,
    supersedes_id: row.supersedes_id,
    created_at: row.created_at,
  });
}

function toSession(row: GuidedSessionRow): GuidedSession {
  return GuidedSessionSchema.parse({
    session_id: row.id,
    guide_id: row.guide_id,
    guide_version: row.guide_version,
    owner_id: row.owner_id,
    project_id: row.project_id,
    room_id: row.room_id,
    access_mode: row.access_mode,
    status: row.status,
    current_question_id: row.current_question_id,
    target_schema_id: row.target_schema_id,
    target_schema_version: row.target_schema_version,
    progress: GuidedProgressSchema.parse(parseObject(row.progress_json)),
    structured_record: parseObject(row.structured_record_json),
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

function getGuideRow(guideId: string): ConversationGuideRow | undefined {
  return getDb().prepare('SELECT * FROM conversation_guides WHERE id = ?').get(guideId) as
    | ConversationGuideRow
    | undefined;
}

function getSessionRow(sessionId: string): GuidedSessionRow | undefined {
  return getDb().prepare('SELECT * FROM guided_sessions WHERE id = ?').get(sessionId) as
    | GuidedSessionRow
    | undefined;
}

function getParticipantRow(sessionId: string, userId: string): GuidedSessionParticipantRow | undefined {
  return getDb()
    .prepare('SELECT * FROM guided_session_participants WHERE session_id = ? AND user_id = ?')
    .get(sessionId, userId) as GuidedSessionParticipantRow | undefined;
}

function canReadGuide(actor: AuthUser, row: ConversationGuideRow): boolean {
  if (isAdmin(actor) || row.owner_id === actor.id) return true;
  if (!row.project_id) return false;
  return decideScopedPermission({actor, projectId: row.project_id}).allowed;
}

function canManageGuide(actor: AuthUser, row: ConversationGuideRow): boolean {
  if (isAdmin(actor) || row.owner_id === actor.id) return true;
  if (!row.project_id) return false;
  return decideScopedPermission({actor, projectId: row.project_id, minimumProjectRole: 'editor'}).allowed;
}

function canReadSession(actor: AuthUser, row: GuidedSessionRow): boolean {
  return isAdmin(actor) || row.owner_id === actor.id || getParticipantRow(row.id, actor.id) !== undefined;
}

function canManageSession(actor: AuthUser, row: GuidedSessionRow): boolean {
  const participant = getParticipantRow(row.id, actor.id);
  return isAdmin(actor) || row.owner_id === actor.id || participant?.role === 'facilitator';
}

function assertSessionActive(row: GuidedSessionRow): void {
  if (row.status !== 'active') throw new Error('guided_session_not_active');
  if (row.expires_at !== null && row.expires_at <= Date.now()) throw new Error('guided_session_expired');
}

function validateQuestions(input: CreateGuideRequest | UpdateGuideRequest, guide?: ConversationGuide): GuidedQuestion[] {
  const questions = input.question_flow ?? guide?.question_flow;
  if (!questions || questions.length === 0) throw new Error('guided_question_flow_invalid');
  const targetSchemaId = 'target_schema_id' in input ? input.target_schema_id : guide?.target_schema_id;
  if (!targetSchemaId) throw new Error('guided_target_schema_missing');
  const template = getSchemaTemplate({id: 'system', username: 'system', role: 'godmode'}, targetSchemaId);
  const properties = template.schema_json.properties;
  if (properties === null || Array.isArray(properties) || typeof properties !== 'object') {
    throw new Error('guided_target_schema_invalid');
  }
  const propertyNames = new Set(Object.keys(properties));
  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.question_id)) throw new Error('guided_question_duplicate');
    ids.add(question.question_id);
    if (!propertyNames.has(question.target_field)) throw new Error('guided_question_target_unknown');
  }
  return questions;
}

function getContributions(sessionId: string): GuidedContribution[] {
  const rows = getDb()
    .prepare('SELECT * FROM guided_contributions WHERE session_id = ? ORDER BY created_at, id')
    .all(sessionId) as GuidedContributionRow[];
  return rows.map(toContribution);
}

function valueKey(value: unknown): string {
  return JSON.stringify(value);
}

function computeProgress(guide: ConversationGuide, contributions: GuidedContribution[]): {
  progress: GuidedProgress;
  structuredRecord: Record<string, unknown>;
} {
  const required = new Set(guide.question_flow.filter((q) => q.required).map((q) => q.target_field));
  const byField = new Map<string, GuidedContribution[]>();
  for (const contribution of contributions.filter((item) => item.status !== 'superseded')) {
    const list = byField.get(contribution.target_field) ?? [];
    list.push(contribution);
    byField.set(contribution.target_field, list);
  }

  const structuredRecord: Record<string, unknown> = {};
  const contradictionFields = new Set<string>();
  const contradictions = [...byField.entries()].flatMap(([field, items]) => {
    const distinct = new Map<string, GuidedContribution>();
    for (const item of items) distinct.set(valueKey(item.value), item);
    const values = [...distinct.values()];
    if (values.length < 2) {
      const last = items.at(-1);
      if (last) structuredRecord[field] = last.value;
      return [];
    }
    contradictionFields.add(field);
    structuredRecord[field] = items.at(-1)?.value;
    return [
      {
        target_field: field,
        values: values.map((item) => item.value),
        contribution_ids: values.map((item) => item.contribution_id),
      },
    ];
  });

  const completedFields = [...required].filter((field) => byField.has(field) && !contradictionFields.has(field));
  const missingFields = [...required].filter((field) => !completedFields.includes(field));
  return {
    structuredRecord,
    progress: GuidedProgressSchema.parse({
      required_fields: [...required],
      completed_fields: completedFields,
      missing_fields: missingFields,
      completion_ratio: required.size === 0 ? 1 : completedFields.length / required.size,
      contradictions,
    }),
  };
}

function firstMissingQuestion(guide: ConversationGuide, progress: GuidedProgress): string | null {
  const missing = new Set(progress.missing_fields);
  return guide.question_flow.find((question) => missing.has(question.target_field))?.question_id ?? null;
}

function refreshSessionState(sessionId: string): GuidedSession {
  const row = getSessionRow(sessionId);
  if (!row) throw new Error('guided_session_not_found');
  const guide = guideFromSession(row);
  const contributions = getContributions(sessionId);
  const {progress, structuredRecord} = computeProgress(guide, contributions);
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE guided_sessions
       SET progress_json = ?, structured_record_json = ?, current_question_id = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(JSON.stringify(progress), JSON.stringify(structuredRecord), firstMissingQuestion(guide, progress), now, sessionId);
  return getGuidedSession({id: row.owner_id, username: 'owner', role: 'godmode'}, sessionId);
}

function syncContributionStatus(sessionId: string, targetField: string): void {
  const rows = getDb()
    .prepare(
      `SELECT * FROM guided_contributions
       WHERE session_id = ? AND target_field = ? AND status <> 'superseded'
       ORDER BY created_at, id`,
    )
    .all(sessionId, targetField) as GuidedContributionRow[];
  const distinct = new Set(rows.map((row) => row.value_json));
  const status = distinct.size > 1 ? 'contradiction' : 'accepted';
  getDb()
    .prepare(
      `UPDATE guided_contributions
       SET status = ?
       WHERE session_id = ? AND target_field = ? AND status <> 'superseded'`,
    )
    .run(status, sessionId, targetField);
}

export function createGuide(actor: AuthUser, input: CreateGuideRequest): ConversationGuide {
  assertTeacher(actor);
  const request = CreateGuideRequestSchema.parse(input);
  const template = getSchemaTemplate(actor, request.target_schema_id);
  if (template.domain !== request.domain) throw new Error('guided_template_domain_mismatch');
  if (request.project_id) {
    const allowed = decideScopedPermission({
      actor,
      projectId: request.project_id,
      minimumProjectRole: 'editor',
    }).allowed;
    if (!allowed) throw new Error('project_not_found');
  }
  const questions = validateQuestions(request);
  const now = Date.now();
  const guideId = uuid();
  getDb()
    .prepare(
      `INSERT INTO conversation_guides
         (id, owner_id, project_id, name, purpose, domain, status, target_schema_id,
          target_schema_version, question_flow_json, completion_rules_json,
          functional_persona_id, lore_persona_id, ui_manifest_json, analytics_policy_json,
          consent_policy_json, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
    .run(
      guideId,
      actor.id,
      request.project_id ?? null,
      request.name,
      request.purpose,
      request.domain,
      template.template_id,
      template.version,
      JSON.stringify(questions),
      JSON.stringify(request.completion_rules),
      request.functional_persona_id ?? null,
      request.lore_persona_id ?? null,
      request.ui_manifest === undefined || request.ui_manifest === null ? null : JSON.stringify(request.ui_manifest),
      JSON.stringify(request.analytics_policy),
      JSON.stringify(request.consent_policy),
      now,
      now,
    );
  audit({
    event_type: 'guided.guide_created',
    user_id: actor.id,
    scope: guideId,
    detail: {guide_id: guideId, target_schema_id: template.template_id, target_schema_version: template.version},
  });
  return getGuide(actor, guideId);
}

export function listGuides(actor: AuthUser): ConversationGuide[] {
  const rows = getDb()
    .prepare('SELECT * FROM conversation_guides WHERE status <> ? ORDER BY updated_at DESC')
    .all('archived') as ConversationGuideRow[];
  return rows.filter((row) => canReadGuide(actor, row)).map(toGuide);
}

export function getGuide(actor: AuthUser, guideId: string): ConversationGuide {
  const row = getGuideRow(guideId);
  if (!row || !canReadGuide(actor, row)) throw new Error('guided_guide_not_found');
  return toGuide(row);
}

export function updateGuide(actor: AuthUser, guideId: string, input: UpdateGuideRequest): ConversationGuide {
  const row = getGuideRow(guideId);
  if (!row || !canManageGuide(actor, row)) throw new Error('guided_guide_not_found');
  if (row.status !== 'draft') throw new Error('guided_guide_not_editable');
  const current = toGuide(row);
  const request = UpdateGuideRequestSchema.parse(input);
  const questions = validateQuestions(request, current);
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE conversation_guides
       SET name = ?, purpose = ?, question_flow_json = ?, completion_rules_json = ?,
           ui_manifest_json = ?, version = version + 1, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      request.name ?? current.name,
      request.purpose ?? current.purpose,
      JSON.stringify(questions),
      JSON.stringify(request.completion_rules ?? current.completion_rules),
      request.ui_manifest === undefined
        ? row.ui_manifest_json
        : request.ui_manifest === null
          ? null
          : JSON.stringify(request.ui_manifest),
      now,
      guideId,
    );
  audit({event_type: 'guided.guide_updated', user_id: actor.id, scope: guideId, detail: {guide_id: guideId}});
  return getGuide(actor, guideId);
}

export function validateGuide(actor: AuthUser, guideId: string): ConversationGuide {
  assertAdmin(actor);
  const row = getGuideRow(guideId);
  if (!row) throw new Error('guided_guide_not_found');
  if (row.status === 'archived') throw new Error('guided_guide_not_editable');
  const template = getSchemaTemplate(actor, row.target_schema_id);
  if (template.status !== 'validated') throw new Error('guided_source_not_validated');
  getDb()
    .prepare("UPDATE conversation_guides SET status = 'validated', updated_at = ? WHERE id = ?")
    .run(Date.now(), guideId);
  audit({
    event_type: 'guided.guide_validated',
    user_id: actor.id,
    scope: guideId,
    detail: {guide_id: guideId, version: row.version, target_schema_version: row.target_schema_version},
  });
  return getGuide(actor, guideId);
}

export function createGuidedSession(actor: AuthUser, input: CreateGuidedSessionRequest): GuidedSession {
  assertTeacher(actor);
  const request = CreateGuidedSessionRequestSchema.parse(input);
  const guide = getGuide(actor, request.guide_id);
  const template = getSchemaTemplate(actor, guide.target_schema_id);
  if (!request.preview && (guide.status !== 'validated' || template.status !== 'validated')) {
    throw new Error('guided_source_not_validated');
  }
  if (request.preview && guide.owner_id !== actor.id && !isAdmin(actor)) {
    throw new Error('guided_preview_owner_required');
  }
  assertConsent(guide.consent_policy, request.consent);
  const now = Date.now();
  const empty = computeProgress(guide, []);
  const sessionId = uuid();
  const db = getDb();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO guided_sessions
         (id, guide_id, guide_version, owner_id, project_id, room_id, access_mode, status,
          current_question_id, target_schema_id, target_schema_version, guide_snapshot_json,
          schema_snapshot_json, consent_policy_json, progress_json, structured_record_json,
          expires_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'private', 'active', ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?)`,
    ).run(
      sessionId,
      guide.guide_id,
      guide.version,
      actor.id,
      guide.project_id,
      request.room_id ?? null,
      firstMissingQuestion(guide, empty.progress),
      guide.target_schema_id,
      guide.target_schema_version,
      JSON.stringify(guide),
      JSON.stringify(template),
      JSON.stringify(guide.consent_policy),
      JSON.stringify(empty.progress),
      request.expires_at ?? null,
      now,
      now,
    );
    addGuidedSessionParticipant(actor, sessionId, actor.id, 'owner', request.consent);
  })();
  audit({
    event_type: 'guided.session_created',
    user_id: actor.id,
    scope: sessionId,
    detail: {session_id: sessionId, guide_id: guide.guide_id, guide_version: guide.version},
  });
  return getGuidedSession(actor, sessionId);
}

export function listGuidedSessions(actor: AuthUser): GuidedSession[] {
  const rows = getDb()
    .prepare('SELECT * FROM guided_sessions ORDER BY updated_at DESC, id DESC')
    .all() as GuidedSessionRow[];
  return rows.filter((row) => canReadSession(actor, row)).map(toSession);
}

export function addGuidedSessionParticipant(
  actor: AuthUser,
  sessionId: string,
  userId: string,
  role: 'facilitator' | 'participant' | 'owner' = 'participant',
  consent: Record<string, unknown> = {},
): GuidedSessionParticipant {
  const row = getSessionRow(sessionId);
  if (!row || !canManageSession(actor, row)) throw new Error('guided_session_not_found');
  const user = getDb().prepare('SELECT id FROM users WHERE id = ?').get(userId) as {id: string} | undefined;
  if (!user) throw new Error('guided_participant_not_found');
  const isSessionOwnerSelf = role === 'owner' && userId === row.owner_id && actor.id === row.owner_id;
  if (row.project_id && !isSessionOwnerSelf) {
    const allowed = decideScopedPermission({actor: {id: userId, username: 'participant', role: 'student'}, projectId: row.project_id}).allowed;
    if (!allowed) throw new Error('guided_participant_scope_denied');
  }
  const policy = parseObject(row.consent_policy_json);
  assertConsent(policy, consent);
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO guided_session_participants
         (session_id, user_id, guest_id, role, display_name, consent_json, joined_at, last_seen_at)
       VALUES (?, ?, NULL, ?, NULL, ?, ?, ?)
       ON CONFLICT(session_id, user_id, guest_id) DO UPDATE SET
         role = excluded.role, consent_json = excluded.consent_json, last_seen_at = excluded.last_seen_at`,
    )
    .run(sessionId, userId, role, JSON.stringify(consent), now, now);
  audit({
    event_type: 'guided.participant_added',
    user_id: actor.id,
    scope: sessionId,
    detail: {session_id: sessionId, participant_user_id: userId, role},
  });
  const participant = getParticipantRow(sessionId, userId);
  if (!participant) throw new Error('guided_participant_not_found');
  return toParticipant(participant);
}

export function getGuidedSession(actor: AuthUser, sessionId: string): GuidedSession {
  const row = getSessionRow(sessionId);
  if (!row || !canReadSession(actor, row)) throw new Error('guided_session_not_found');
  if (row.expires_at !== null && row.expires_at <= Date.now() && row.status === 'active') {
    getDb().prepare("UPDATE guided_sessions SET status = 'expired', updated_at = ? WHERE id = ?").run(Date.now(), sessionId);
    throw new Error('guided_session_expired');
  }
  return toSession(getSessionRow(sessionId) ?? row);
}

export function getGuidedSessionContext(
  actor: AuthUser,
  sessionId: string,
): {
  session: GuidedSession;
  guide: ConversationGuide;
  contributions: GuidedContribution[];
} {
  const session = getGuidedSession(actor, sessionId);
  const row = getSessionRow(sessionId);
  if (!row || !canReadSession(actor, row)) throw new Error('guided_session_not_found');
  return {
    session,
    guide: guideFromSession(row),
    contributions: getContributions(sessionId),
  };
}

export function submitGuidedAnswer(
  actor: AuthUser,
  sessionId: string,
  input: SubmitGuidedAnswerRequest,
): GuidedContribution {
  const row = getSessionRow(sessionId);
  if (!row || !canReadSession(actor, row)) throw new Error('guided_session_not_found');
  assertSessionActive(row);
  const guide = guideFromSession(row);
  const template = schemaFromSession(row);
  const request = SubmitGuidedAnswerRequestSchema.parse(input);
  const question = guide.question_flow.find((item) => item.question_id === request.question_id);
  if (!question) throw new Error('guided_question_not_found');
  const participant = getParticipantRow(sessionId, actor.id);
  if (!participant) throw new Error('guided_participant_required');
  assertConsent(parseObject(row.consent_policy_json), parseObject(participant.consent_json));
  validateQuestionValue(question, request.value);
  validateSchemaValue(template.schema_json, question.target_field, request.value);

  const contributionId = uuid();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT INTO guided_contributions
         (id, session_id, participant_ref, question_id, target_field, value_json, source, status, supersedes_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'accepted', NULL, ?)`,
    )
    .run(
      contributionId,
      sessionId,
      actor.id,
      question.question_id,
      question.target_field,
      JSON.stringify(request.value),
      participant.role === 'participant' ? 'user' : 'facilitator',
      now,
    );
  syncContributionStatus(sessionId, question.target_field);
  refreshSessionState(sessionId);
  audit({
    event_type: 'guided.answer_submitted',
    user_id: actor.id,
    scope: sessionId,
    detail: {session_id: sessionId, question_id: question.question_id, target_field: question.target_field},
  });
  const rowAfter = getDb().prepare('SELECT * FROM guided_contributions WHERE id = ?').get(contributionId) as
    | GuidedContributionRow
    | undefined;
  if (!rowAfter) throw new Error('guided_contribution_not_found');
  return toContribution(rowAfter);
}

export function advanceGuidedSession(actor: AuthUser, sessionId: string): GuidedSession {
  const row = getSessionRow(sessionId);
  if (!row || !canManageSession(actor, row)) throw new Error('guided_session_not_found');
  assertSessionActive(row);
  const session = refreshSessionState(sessionId);
  audit({
    event_type: 'guided.session_advanced',
    user_id: actor.id,
    scope: sessionId,
    detail: {session_id: sessionId, current_question_id: session.current_question_id},
  });
  return session;
}

export function completeGuidedSession(actor: AuthUser, sessionId: string): GuidedSession {
  const row = getSessionRow(sessionId);
  if (!row || !canManageSession(actor, row)) throw new Error('guided_session_not_found');
  assertSessionActive(row);
  const session = refreshSessionState(sessionId);
  if (session.progress.missing_fields.length > 0) throw new Error('guided_session_incomplete');
  validateStructuredRecord(schemaFromSession(row), session.structured_record);
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE guided_sessions
       SET status = 'completed', current_question_id = NULL, updated_at = ?
       WHERE id = ?`,
    )
    .run(now, sessionId);
  audit({
    event_type: 'guided.session_completed',
    user_id: actor.id,
    scope: sessionId,
    detail: {session_id: sessionId, external_effects: []},
  });
  return getGuidedSession(actor, sessionId);
}
