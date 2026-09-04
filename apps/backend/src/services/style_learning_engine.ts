import {createHash} from 'node:crypto';

import type {
  LanguageStylePreview,
  PersonaRepresentationLink,
  StyleLearningPreferences,
  StyleLearningSnapshot,
  UpdateStyleLearningPreferencesRequest,
} from '@masterflow/shared';

import {
  getDb,
  type PersonaRepresentationLinkRow,
  type StyleLearningAggregateRow,
  type StyleLearningPreferenceRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {
  analyzeLanguageMessage,
  DEFAULT_LANGUAGE_OVERLAY_INTENSITY,
  deriveCollectiveStylePreview,
  deriveIndividualStylePreview,
  emptyLanguageAggregate,
  type LanguageAggregateState,
  mergeLanguageAnalysis,
} from './language_style_learning.ts';

const SOURCE_HASH_LIMIT = 64;

function parseRecord(raw: string): Record<string, number> {
  const value = JSON.parse(raw || '{}') as unknown;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
}

function parseStringArray(raw: string): string[] {
  const value = JSON.parse(raw || '[]') as unknown;
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function aggregateState(row?: StyleLearningAggregateRow): LanguageAggregateState {
  if (!row) return emptyLanguageAggregate();
  const metrics = JSON.parse(row.metrics_json || '{}') as Partial<LanguageAggregateState['metrics']>;
  const empty = emptyLanguageAggregate();
  return {
    sample_count: row.sample_count,
    metrics: {
      chars: metrics.chars ?? 0,
      words: metrics.words ?? 0,
      sentences: metrics.sentences ?? 0,
      questions: metrics.questions ?? 0,
      exclamations: metrics.exclamations ?? 0,
      ellipses: metrics.ellipses ?? 0,
      emojis: metrics.emojis ?? 0,
      uppercase_words: metrics.uppercase_words ?? 0,
    },
    expression_counts: row ? parseRecord(row.expressions_json) : empty.expression_counts,
    transition_counts: row ? parseRecord(row.transitions_json) : empty.transition_counts,
  };
}

function preferenceDTO(row: StyleLearningPreferenceRow): StyleLearningPreferences {
  return {
    learning_enabled: row.learning_enabled === 1,
    collective_contribution_enabled: row.collective_contribution_enabled === 1,
    notice_seen: row.notice_seen === 1,
    overlay_intensity: row.overlay_intensity,
    reset_at: row.reset_at,
    updated_at: row.updated_at,
  };
}

function getOrCreatePreferences(userId: string): StyleLearningPreferenceRow {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM style_learning_preferences WHERE user_id = ?')
    .get(userId) as StyleLearningPreferenceRow | undefined;
  if (existing) return existing;
  const now = Date.now();
  db.prepare(`
    INSERT INTO style_learning_preferences
      (user_id, learning_enabled, collective_contribution_enabled, notice_seen, overlay_intensity, created_at, updated_at)
    VALUES (?, 1, 1, 0, ?, ?, ?)
  `).run(userId, DEFAULT_LANGUAGE_OVERLAY_INTENSITY, now, now);
  return db.prepare('SELECT * FROM style_learning_preferences WHERE user_id = ?')
    .get(userId) as StyleLearningPreferenceRow;
}

function previewDTO(row?: StyleLearningAggregateRow): LanguageStylePreview {
  const preview = deriveIndividualStylePreview(aggregateState(row));
  return {
    sample_count: preview.sample_count,
    confidence: preview.confidence,
    readiness: preview.readiness,
    rhythm: preview.rhythm,
    recurring_expressions: preview.recurring_expressions,
    transitions: preview.transitions,
    last_updated_at: row?.updated_at ?? null,
  };
}

export function getStyleLearningSnapshot(actor: AuthUser): StyleLearningSnapshot {
  const preference = getOrCreatePreferences(actor.id);
  const aggregate = getDb().prepare(`
    SELECT * FROM style_learning_aggregates
    WHERE aggregate_scope = 'user' AND subject_user_id = ? AND project_id IS NULL
  `).get(actor.id) as StyleLearningAggregateRow | undefined;
  return {preferences: preferenceDTO(preference), preview: previewDTO(aggregate)};
}

export function updateStyleLearningPreferences(
  actor: AuthUser,
  input: UpdateStyleLearningPreferencesRequest,
): StyleLearningSnapshot {
  const previous = getOrCreatePreferences(actor.id);
  const now = Date.now();
  getDb().prepare(`
    UPDATE style_learning_preferences SET
      learning_enabled = ?,
      collective_contribution_enabled = ?,
      notice_seen = ?,
      overlay_intensity = ?,
      updated_at = ?
    WHERE user_id = ?
  `).run(
    input.learning_enabled === undefined ? previous.learning_enabled : Number(input.learning_enabled),
    input.collective_contribution_enabled === undefined
      ? previous.collective_contribution_enabled
      : Number(input.collective_contribution_enabled),
    input.notice_seen === undefined ? previous.notice_seen : Number(input.notice_seen),
    input.overlay_intensity ?? previous.overlay_intensity,
    now,
    actor.id,
  );
  audit({
    event_type: 'style_learning.preferences_updated',
    user_id: actor.id,
    detail: {
      learning_enabled: input.learning_enabled,
      collective_contribution_enabled: input.collective_contribution_enabled,
      notice_seen: input.notice_seen,
      overlay_intensity: input.overlay_intensity,
    },
  });
  return getStyleLearningSnapshot(actor);
}

export function resetStyleLearning(actor: AuthUser): StyleLearningSnapshot {
  const now = Date.now();
  getDb().transaction(() => {
    getDb().prepare('DELETE FROM style_learning_aggregates WHERE subject_user_id = ?').run(actor.id);
    getDb().prepare(`
      UPDATE style_learning_preferences
      SET reset_at = ?, updated_at = ?
      WHERE user_id = ?
    `).run(now, now, actor.id);
  })();
  audit({event_type: 'style_learning.reset', user_id: actor.id, detail: {derived_markers_deleted: true, raw_messages_stored: false}});
  return getStyleLearningSnapshot(actor);
}

function aggregateRow(
  scope: StyleLearningAggregateRow['aggregate_scope'],
  userId: string,
  projectId: string | null,
): StyleLearningAggregateRow | undefined {
  return getDb().prepare(`
    SELECT * FROM style_learning_aggregates
    WHERE aggregate_scope = ? AND subject_user_id = ? AND project_id IS ?
  `).get(scope, userId, projectId) as StyleLearningAggregateRow | undefined;
}

function persistAnalysis(
  scope: StyleLearningAggregateRow['aggregate_scope'],
  userId: string,
  projectId: string | null,
  content: string,
): boolean {
  const analysis = analyzeLanguageMessage(content);
  if (!analysis.eligible) return false;
  const hash = createHash('sha256').update(content, 'utf8').digest('hex');
  const row = aggregateRow(scope, userId, projectId);
  const previousHashes = row ? parseStringArray(row.source_hashes_json) : [];
  if (previousHashes.includes(hash)) return false;
  const next = mergeLanguageAnalysis(aggregateState(row), analysis);
  const preview = deriveIndividualStylePreview(next);
  const sourceHashes = [...previousHashes, hash].slice(-SOURCE_HASH_LIMIT);
  const now = Date.now();
  if (row) {
    getDb().prepare(`
      UPDATE style_learning_aggregates SET
        metrics_json = ?, expressions_json = ?, transitions_json = ?, source_hashes_json = ?,
        sample_count = ?, confidence = ?, updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(next.metrics), JSON.stringify(next.expression_counts),
      JSON.stringify(next.transition_counts), JSON.stringify(sourceHashes),
      next.sample_count, preview.confidence, now, row.id,
    );
  } else {
    getDb().prepare(`
      INSERT INTO style_learning_aggregates
        (id, aggregate_scope, subject_user_id, project_id, metrics_json, expressions_json,
         transitions_json, source_hashes_json, sample_count, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(), scope, userId, projectId, JSON.stringify(next.metrics),
      JSON.stringify(next.expression_counts), JSON.stringify(next.transition_counts),
      JSON.stringify(sourceHashes), next.sample_count, preview.confidence, now, now,
    );
  }
  return true;
}

/** Observe uniquement un message écrit par l'utilisateur authentifié. */
export function observeAuthenticatedLanguage(
  actor: AuthUser,
  content: string,
  projectId?: string | null,
): {observed: boolean; raw_message_stored: false} {
  const preference = getOrCreatePreferences(actor.id);
  if (preference.learning_enabled !== 1) return {observed: false, raw_message_stored: false};
  const observed = persistAnalysis('user', actor.id, null, content);
  if (observed && projectId && preference.collective_contribution_enabled === 1) {
    const member = getDb().prepare(`
      SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?
    `).get(projectId, actor.id);
    if (member) persistAnalysis('project_contributor', actor.id, projectId, content);
  }
  return {observed, raw_message_stored: false};
}

export function getLearnedUserStyle(userId: string): {
  preview: LanguageStylePreview;
  intensity: number;
  enabled: boolean;
} {
  const preference = getOrCreatePreferences(userId);
  const row = aggregateRow('user', userId, null);
  return {
    preview: previewDTO(row),
    intensity: preference.overlay_intensity,
    enabled: preference.learning_enabled === 1,
  };
}

export function getCollectiveProjectStyle(projectId: string): {
  preview: LanguageStylePreview & {contributor_count: number};
  intensity: number;
} {
  const rows = getDb().prepare(`
    SELECT a.*
    FROM style_learning_aggregates a
    INNER JOIN style_learning_preferences p ON p.user_id = a.subject_user_id
    INNER JOIN project_members m ON m.project_id = a.project_id AND m.user_id = a.subject_user_id
    WHERE a.aggregate_scope = 'project_contributor'
      AND a.project_id = ?
      AND p.learning_enabled = 1
      AND p.collective_contribution_enabled = 1
  `).all(projectId) as StyleLearningAggregateRow[];
  const derived = deriveCollectiveStylePreview(rows.map(aggregateState));
  const intensity = rows.length === 0
    ? DEFAULT_LANGUAGE_OVERLAY_INTENSITY
    : rows.reduce((sum, row) => sum + getOrCreatePreferences(row.subject_user_id).overlay_intensity, 0) / rows.length;
  return {
    preview: {
      sample_count: derived.sample_count,
      contributor_count: derived.contributor_count,
      confidence: derived.confidence,
      readiness: derived.readiness,
      rhythm: derived.rhythm,
      recurring_expressions: derived.recurring_expressions,
      transitions: derived.transitions,
      last_updated_at: rows.length > 0 ? Math.max(...rows.map((row) => row.updated_at)) : null,
    },
    intensity: Math.min(0.4, intensity),
  };
}

function representationDTO(row: PersonaRepresentationLinkRow): PersonaRepresentationLink {
  return {
    id: row.id,
    persona_id: row.persona_id,
    represented_user_id: row.represented_user_id,
    status: row.status,
    activated_at: row.activated_at,
    revoked_at: row.revoked_at,
    updated_at: row.updated_at,
  };
}

export function proposePersonaRepresentation(
  actor: AuthUser,
  personaId: string,
  representedUserId: string,
): PersonaRepresentationLink {
  const persona = getDb().prepare('SELECT id FROM personas WHERE id = ? AND status = ?').get(personaId, 'active');
  const subject = getDb().prepare('SELECT id FROM users WHERE id = ? AND active = 1').get(representedUserId);
  if (!persona || !subject) throw new Error('representation_target_not_found');
  if (actor.id !== representedUserId && actor.role !== 'admin' && actor.role !== 'godmode') {
    throw new Error('representation_proposal_denied');
  }
  const previous = getDb().prepare('SELECT * FROM persona_representation_links WHERE persona_id = ?')
    .get(personaId) as PersonaRepresentationLinkRow | undefined;
  if (previous && previous.represented_user_id !== representedUserId && previous.status !== 'revoked') {
    throw new Error('representation_conflict');
  }
  const now = Date.now();
  const status = actor.id === representedUserId
    ? 'active'
    : previous?.represented_user_id === representedUserId && previous.status === 'active'
      ? 'active'
      : 'pending';
  const id = previous?.id ?? uuid();
  if (previous) {
    getDb().prepare(`
      UPDATE persona_representation_links SET
        represented_user_id = ?, proposed_by = ?, status = ?, activated_at = ?, revoked_at = NULL, updated_at = ?
      WHERE id = ?
    `).run(representedUserId, actor.id, status, status === 'active' ? now : null, now, id);
  } else {
    getDb().prepare(`
      INSERT INTO persona_representation_links
        (id, persona_id, represented_user_id, proposed_by, status, activated_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, personaId, representedUserId, actor.id, status, status === 'active' ? now : null, now, now);
  }
  audit({event_type: 'persona.representation_proposed', user_id: actor.id, detail: {persona_id: personaId, represented_user_id: representedUserId, status}});
  return representationDTO(getDb().prepare('SELECT * FROM persona_representation_links WHERE id = ?').get(id) as PersonaRepresentationLinkRow);
}

export function updatePersonaRepresentationStatus(
  actor: AuthUser,
  linkId: string,
  status: 'active' | 'revoked',
): PersonaRepresentationLink {
  const row = getDb().prepare('SELECT * FROM persona_representation_links WHERE id = ?')
    .get(linkId) as PersonaRepresentationLinkRow | undefined;
  if (!row || row.represented_user_id !== actor.id) throw new Error('representation_not_found');
  const now = Date.now();
  getDb().prepare(`
    UPDATE persona_representation_links SET
      status = ?, activated_at = ?, revoked_at = ?, updated_at = ?
    WHERE id = ?
  `).run(status, status === 'active' ? now : row.activated_at, status === 'revoked' ? now : null, now, linkId);
  audit({event_type: 'persona.representation_status_updated', user_id: actor.id, detail: {persona_id: row.persona_id, status}});
  return representationDTO(getDb().prepare('SELECT * FROM persona_representation_links WHERE id = ?').get(linkId) as PersonaRepresentationLinkRow);
}

export function getActivePersonaRepresentation(personaId: string): PersonaRepresentationLinkRow | undefined {
  return getDb().prepare(`
    SELECT * FROM persona_representation_links
    WHERE persona_id = ? AND status = 'active'
  `).get(personaId) as PersonaRepresentationLinkRow | undefined;
}
