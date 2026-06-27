import type {
  BadgeDefinition,
  UserBadge,
  UserProgressionEvent,
  AwardBadgeRequest,
  ProgressionSummary,
} from '@masterflow/shared';

import {
  getDb,
  type BadgeDefinitionRow,
  type UserBadgeRow,
  type UserProgressionEventRow,
  type UserCompetencyProgressRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

// ─── Badge Definitions ───

function toBadgeDefDTO(row: BadgeDefinitionRow): BadgeDefinition {
  return {
    id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    code: row.code,
    label: row.label,
    description: row.description,
    badge_type: row.badge_type,
    icon: row.icon,
    criteria_json: row.criteria_json,
    unlock_conditions_json: row.unlock_conditions_json,
    reward_type: row.reward_type,
    reward_ref: row.reward_ref,
    visibility: row.visibility,
    saturation_risk: row.saturation_risk,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function canAccessScoped(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function assertScopedAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}, error = 'badge_definition_not_found'): void {
  if (!canAccessScoped(actor, row)) throw new Error(error);
}

export function listBadgeDefinitions(actor: AuthUser, projectId?: string): BadgeDefinition[] {
  let sql = 'SELECT * FROM badge_definitions WHERE owner_id = ?';
  const params: unknown[] = [actor.id];
  if (projectId) { sql += ' AND project_id = ?'; params.push(projectId); }
  sql += ' ORDER BY label ASC';
  return (getDb().prepare(sql).all(...params) as BadgeDefinitionRow[]).map(toBadgeDefDTO);
}

export function getBadgeDefinition(actor: AuthUser, badgeId: string): BadgeDefinition {
  const row = getDb().prepare('SELECT * FROM badge_definitions WHERE id = ?').get(badgeId) as BadgeDefinitionRow | undefined;
  if (!row) throw new Error('badge_definition_not_found');
  assertScopedAccess(actor, row);
  return toBadgeDefDTO(row);
}

export function createBadgeDefinition(
  actor: AuthUser,
  data: {
    code: string;
    label: string;
    description?: string;
    badge_type: BadgeDefinition['badge_type'];
    icon?: string;
    criteria_json?: string;
    unlock_conditions_json?: string;
    reward_type?: BadgeDefinition['reward_type'];
    reward_ref?: string | null;
    visibility?: BadgeDefinition['visibility'];
    saturation_risk?: number;
    project_id?: string | null;
  },
): BadgeDefinition {
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO badge_definitions (id, owner_id, project_id, code, label, description, badge_type, icon, criteria_json, unlock_conditions_json, reward_type, reward_ref, visibility, saturation_risk, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, actor.id, data.project_id ?? null, data.code, data.label, data.description ?? null,
    data.badge_type, data.icon ?? null, data.criteria_json ?? '{}', data.unlock_conditions_json ?? '[]',
    data.reward_type ?? null, data.reward_ref ?? null, data.visibility ?? 'private', data.saturation_risk ?? 0,
    now, now,
  );
  audit({event_type: 'badge_definition.created', user_id: actor.id, detail: {badge_id: id, code: data.code}});
  return getBadgeDefinition(actor, id);
}

export function updateBadgeDefinition(
  actor: AuthUser,
  badgeId: string,
  data: {
    label?: string;
    description?: string;
    icon?: string;
    criteria_json?: string;
    unlock_conditions_json?: string;
    visibility?: BadgeDefinition['visibility'];
    saturation_risk?: number;
    status?: 'active' | 'archived';
  },
): BadgeDefinition {
  const existing = getBadgeDefinition(actor, badgeId);
  const now = Date.now();
  const label = data.label ?? existing.label;
  const description = data.description ?? existing.description;
  const icon = data.icon !== undefined ? data.icon : existing.icon;
  const criteria_json = data.criteria_json ?? existing.criteria_json;
  const unlock_conditions_json = data.unlock_conditions_json ?? existing.unlock_conditions_json;
  const visibility = data.visibility ?? existing.visibility;
  const saturation_risk = data.saturation_risk ?? existing.saturation_risk;
  const status = data.status ?? existing.status;
  getDb().prepare(`
    UPDATE badge_definitions SET label = ?, description = ?, icon = ?, criteria_json = ?, unlock_conditions_json = ?, visibility = ?, saturation_risk = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(label, description, icon, criteria_json, unlock_conditions_json, visibility, saturation_risk, status, now, badgeId);
  audit({event_type: 'badge_definition.updated', user_id: actor.id, detail: {badge_id: badgeId}});
  return getBadgeDefinition(actor, badgeId);
}

// ─── User Badges ───

function toUserBadgeDTO(row: UserBadgeRow): UserBadge {
  return {
    id: row.id,
    user_id: row.user_id,
    badge_id: row.badge_id,
    project_id: row.project_id,
    awarded_by: row.awarded_by,
    reason: row.reason,
    evidence_ref: row.evidence_ref,
    visibility: row.visibility,
    status: row.status,
    awarded_at: row.awarded_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function awardBadge(actor: AuthUser, data: AwardBadgeRequest): {badge: UserBadge; event: UserProgressionEvent} {
  const definition = getBadgeDefinition(actor, data.badge_id);
  if (definition.project_id !== (data.project_id ?? null)) throw new Error('badge_definition_not_found');

  // Vérifier doublon
  const existing = getDb().prepare('SELECT * FROM user_badges WHERE user_id = ? AND badge_id = ?').get(data.user_id, data.badge_id) as UserBadgeRow | undefined;
  if (existing && existing.status !== 'revoked') throw new Error('badge_already_awarded');

  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO user_badges (id, user_id, badge_id, project_id, awarded_by, reason, evidence_ref, visibility, status, awarded_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'awarded', ?, ?, ?)
  `).run(id, data.user_id, data.badge_id, data.project_id ?? null, actor.id, data.reason ?? null, data.evidence_ref ?? null, data.visibility ?? 'private', now, now, now);

  // Enregistrer l'événement de progression
  const event = recordProgressionEvent(data.user_id, {
    project_id: data.project_id ?? null,
    event_type: 'badge_awarded',
    ref_type: 'badge_definition',
    ref_id: data.badge_id,
    detail_json: JSON.stringify({badge_id: data.badge_id, awarded_by: actor.id, reason: data.reason}),
  });

  audit({event_type: 'badge.awarded', user_id: actor.id, detail: {badge_id: data.badge_id, user_id: data.user_id}});
  return {
    badge: toUserBadgeDTO(getDb().prepare('SELECT * FROM user_badges WHERE id = ?').get(id) as UserBadgeRow),
    event,
  };
}

export function getUserBadges(actor: AuthUser, userId: string, projectId?: string | null): UserBadge[] {
  if (userId !== actor.id && !projectId) throw new Error('user_badges_not_found');
  if (projectId && !decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed) throw new Error('user_badges_not_found');
  if (projectId) {
    return (getDb().prepare('SELECT * FROM user_badges WHERE user_id = ? AND project_id = ? ORDER BY awarded_at DESC').all(userId, projectId) as UserBadgeRow[]).map(toUserBadgeDTO);
  }
  return (getDb().prepare('SELECT * FROM user_badges WHERE user_id = ? ORDER BY awarded_at DESC').all(userId) as UserBadgeRow[]).map(toUserBadgeDTO);
}

export function revokeBadge(actor: AuthUser, userBadgeId: string): UserBadge {
  const row = getDb().prepare('SELECT * FROM user_badges WHERE id = ?').get(userBadgeId) as UserBadgeRow | undefined;
  if (!row) throw new Error('user_badge_not_found');
  if (row.project_id) {
    if (!decideScopedPermission({actor, projectId: row.project_id, minimumProjectRole: 'editor'}).allowed) throw new Error('user_badge_not_found');
  } else if (row.awarded_by !== actor.id && row.user_id !== actor.id) {
    throw new Error('user_badge_not_found');
  }
  const now = Date.now();
  getDb().prepare("UPDATE user_badges SET status = 'revoked', updated_at = ? WHERE id = ?").run(now, userBadgeId);
  audit({event_type: 'badge.revoked', user_id: actor.id, detail: {user_badge_id: userBadgeId, user_id: row.user_id, badge_id: row.badge_id}});
  return toUserBadgeDTO(getDb().prepare('SELECT * FROM user_badges WHERE id = ?').get(userBadgeId) as UserBadgeRow);
}

// ─── Progression Events ───

function toEventDTO(row: UserProgressionEventRow): UserProgressionEvent {
  return {
    id: row.id,
    user_id: row.user_id,
    project_id: row.project_id,
    event_type: row.event_type,
    ref_type: row.ref_type,
    ref_id: row.ref_id,
    detail_json: row.detail_json,
    created_at: row.created_at,
  };
}

export function recordProgressionEvent(
  userId: string,
  data: {
    project_id: string | null;
    event_type: UserProgressionEvent['event_type'];
    ref_type?: string | null;
    ref_id?: string | null;
    detail_json?: string;
  },
): UserProgressionEvent {
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO user_progression_events (id, user_id, project_id, event_type, ref_type, ref_id, detail_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, userId, data.project_id, data.event_type, data.ref_type ?? null, data.ref_id ?? null, data.detail_json ?? '{}', now);
  return toEventDTO(getDb().prepare('SELECT * FROM user_progression_events WHERE id = ?').get(id) as UserProgressionEventRow);
}

export function listProgressionEvents(actor: AuthUser, userId: string, limit = 50): UserProgressionEvent[] {
  if (userId !== actor.id) throw new Error('progression_events_not_found');
  return (getDb().prepare('SELECT * FROM user_progression_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as UserProgressionEventRow[]).map(toEventDTO);
}

// ─── Résumé de progression ───

export function getProgressionSummary(actor: AuthUser, userId: string, projectId?: string | null): ProgressionSummary {
  if (userId !== actor.id && !projectId) throw new Error('progression_not_found');
  if (projectId && !decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed) throw new Error('progression_not_found');
  const badgeCount = projectId
    ? (getDb().prepare("SELECT COUNT(*) as count FROM user_badges WHERE user_id = ? AND project_id = ? AND status = 'awarded'").get(userId, projectId) as {count: number}).count
    : (getDb().prepare("SELECT COUNT(*) as count FROM user_badges WHERE user_id = ? AND status = 'awarded'").get(userId) as {count: number}).count;

  const signalCount = projectId
    ? (getDb().prepare("SELECT COUNT(*) as count FROM user_competency_signals WHERE user_id = ? AND project_id = ? AND status = 'validated'").get(userId, projectId) as {count: number}).count
    : (getDb().prepare("SELECT COUNT(*) as count FROM user_competency_signals WHERE user_id = ? AND status = 'validated'").get(userId) as {count: number}).count;

  const milestoneCount = projectId
    ? (getDb().prepare("SELECT COUNT(*) as count FROM user_progression_events WHERE user_id = ? AND project_id = ? AND event_type = 'milestone_reached'").get(userId, projectId) as {count: number}).count
    : (getDb().prepare("SELECT COUNT(*) as count FROM user_progression_events WHERE user_id = ? AND event_type = 'milestone_reached'").get(userId) as {count: number}).count;

  const progressRows = projectId
    ? getDb().prepare('SELECT * FROM user_competency_progress WHERE user_id = ? AND project_id = ?').all(userId, projectId) as UserCompetencyProgressRow[]
    : getDb().prepare('SELECT * FROM user_competency_progress WHERE user_id = ?').all(userId) as UserCompetencyProgressRow[];

  const averageMastery = progressRows.length > 0
    ? progressRows.reduce((sum, r) => {
        const masteryVals: Record<string, number> = {unknown: 0, discovering: 0.2, guided: 0.4, practicing: 0.6, autonomous: 0.8, mentor_ready: 1};
        return sum + (masteryVals[r.current_mastery] ?? 0);
      }, 0) / progressRows.length
    : 0;

  const recentEvents = projectId
    ? (getDb().prepare('SELECT * FROM user_progression_events WHERE user_id = ? AND project_id = ? ORDER BY created_at DESC LIMIT 20').all(userId, projectId) as UserProgressionEventRow[]).map(toEventDTO)
    : (getDb().prepare('SELECT * FROM user_progression_events WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(userId) as UserProgressionEventRow[]).map(toEventDTO);

  // Vérifier les risques de saturation
  const saturationWarnings: {badge_id?: string; reason: string}[] = [];
  const highSaturationBadges = getDb().prepare("SELECT * FROM badge_definitions WHERE saturation_risk > 0 AND status = 'active'").all() as BadgeDefinitionRow[];
  for (const badge of highSaturationBadges) {
    const count = (getDb().prepare("SELECT COUNT(*) as count FROM user_badges WHERE badge_id = ? AND user_id = ? AND status = 'awarded'").get(badge.id, userId) as {count: number}).count;
    if (count >= badge.saturation_risk) {
      saturationWarnings.push({badge_id: badge.id, reason: `Badge "${badge.label}" atteint son seuil de saturation (${count}/${badge.saturation_risk})`});
    }
  }

  return {
    user_id: userId,
    project_id: projectId ?? null,
    badges_count: badgeCount,
    signals_count: signalCount,
    milestone_count: milestoneCount,
    average_mastery: averageMastery,
    current_milestone: null,
    saturation_warnings: saturationWarnings,
    recent_events: recentEvents,
  };
}
