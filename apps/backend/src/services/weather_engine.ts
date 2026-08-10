import type {PedagogicalSignal, PedagogicalWeather, ProjectMemberRole} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {PedagogicalSignalRow, UserProgressionEventRow} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface ProgressRow {
  trajectory: string | null;
  confidence: number;
  current_mastery: string;
}

interface SignalCountRow {
  signal_type: string;
  cnt: number;
}

function toSignalDTO(row: PedagogicalSignalRow): PedagogicalSignal {
  return {
    signal_id: row.id,
    signal_type: row.signal_type as PedagogicalSignal['signal_type'],
    level: row.level as PedagogicalSignal['level'],
    project_id: row.project_id,
    project_scope: row.project_scope,
    evidence_refs: JSON.parse(row.evidence_refs_json) as string[],
    recurrence: row.recurrence,
    contradiction_refs: JSON.parse(row.contradiction_refs_json) as string[],
    confidence: row.confidence,
    sensitivity: row.sensitivity,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listSignals(projectScope: string, limit = 50): PedagogicalSignal[] {
  return (getDb().prepare(
    'SELECT * FROM pedagogical_signals WHERE project_scope = ? AND status != ? ORDER BY updated_at DESC LIMIT ?',
  ).all(projectScope, 'archived', limit) as PedagogicalSignalRow[]).map(toSignalDTO);
}

/** Vérifie qu'un acteur peut lire les signaux pédagogiques d'un scope explicite. */
export function assertPedagogicalScopeAccess(
  actor: AuthUser,
  projectScope: string,
  minimumProjectRole: ProjectMemberRole = 'editor',
): void {
  if (projectScope === actor.id) return;
  if (!decideScopedPermission({actor, projectId: projectScope, minimumProjectRole}).allowed) {
    throw new Error('pedagogical_scope_denied');
  }
}

/**
 * La météo individuelle est privée. Un professeur ne peut lire celle d'un autre compte
 * que dans un projet qu'il édite et auquel ce compte appartient réellement.
 */
export function assertWeatherAccess(actor: AuthUser, userId: string, projectScope?: string): void {
  if (actor.id === userId) {
    if (projectScope) assertPedagogicalScopeAccess(actor, projectScope, 'viewer');
    return;
  }
  if (!projectScope) throw new Error('weather_access_denied');
  assertPedagogicalScopeAccess(actor, projectScope);
  const member = getDb().prepare(
    'SELECT 1 AS hit FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
  ).get(projectScope, userId) as {hit: number} | undefined;
  if (!member) throw new Error('weather_access_denied');
}

/**
 * Calcule la météo pédagogique d'un utilisateur à partir de :
 *  - ses progressions (user_competency_progress)
 *  - les signaux pédagogiques (pedagogical_signals) liés à son scope projet
 *  - les événements de progression (user_progression_events)
 */
export function computeWeather(userId: string, projectScope?: string): PedagogicalWeather {
  const now = Date.now();
  const since = now - 7 * 24 * 60 * 60 * 1000; // 7 jours

  // 1. Progression des compétences
  const progressRows = getDb().prepare(
    `SELECT trajectory, confidence, current_mastery FROM user_competency_progress WHERE user_id = ?`,
  ).all(userId) as ProgressRow[];

  const blockedCount = progressRows.filter((r) => r.trajectory === 'blocked').length;
  const needsReviewCount = progressRows.filter((r) => r.trajectory === 'needs_review').length;
  const improvingCount = progressRows.filter((r) => r.trajectory === 'consolidating' || r.trajectory === 'transferred').length;
  const avgConfidence = progressRows.length > 0
    ? progressRows.reduce((s, r) => s + r.confidence, 0) / progressRows.length
    : 0;

  // 2. Signaux pédagogiques récents du projet explicitement autorisé.
  const signalRows: SignalCountRow[] = [];
  if (projectScope) {
    signalRows.push(...getDb().prepare(
      `SELECT signal_type, COUNT(*) as cnt FROM pedagogical_signals
       WHERE project_scope = ? AND created_at >= ? AND status != 'archived'
       GROUP BY signal_type`,
    ).all(projectScope, since) as SignalCountRow[]);
  }

  const signalMap = new Map(signalRows.map((r) => [r.signal_type, r.cnt]));
  const progressionCount = signalMap.get('progression') ?? 0;
  const blockageCount = signalMap.get('blockage') ?? 0;
  const overloadCount = signalMap.get('overload') ?? 0;
  const driftCount = signalMap.get('drift') ?? 0;
  const confusionCount = signalMap.get('confusion') ?? 0;

  // 3. Événements de progression récents (saturation, milestones)
  const saturationEvents = getDb().prepare(
    `SELECT COUNT(*) as cnt FROM user_progression_events
     WHERE user_id = ? AND event_type = 'saturation_detected' AND created_at >= ?`,
  ).get(userId, since) as {cnt: number};
  const milestoneEvents = getDb().prepare(
    `SELECT COUNT(*) as cnt FROM user_progression_events
     WHERE user_id = ? AND event_type = 'milestone_reached' AND created_at >= ?`,
  ).get(userId, since) as {cnt: number};

  // 4. Composite score (0-100)
  let score = 50; // neutre
  score += improvingCount * 5;
  score -= blockedCount * 10;
  score -= needsReviewCount * 5;
  score -= overloadCount * 8;
  score -= confusionCount * 5;
  score -= blockageCount * 6;
  score -= driftCount * 4;
  score += progressionCount * 3;
  score += milestoneEvents.cnt * 5;
  score -= saturationEvents.cnt * 15;
  score = Math.max(0, Math.min(100, score));

  // 5. Weather type
  const weather: PedagogicalWeather['weather'] =
    score >= 70 ? 'sunny'
    : score >= 45 ? 'cloudy'
    : score >= 25 ? 'rainy'
    : 'stormy';

  // 6. Trend (signals + competency trajectory)
  const decliningSignals = blockageCount + confusionCount + overloadCount * 2 + driftCount;
  const positiveSignals = progressionCount + milestoneEvents.cnt + improvingCount;
  const decliningTrajectory = blockedCount + needsReviewCount + saturationEvents.cnt;
  const trend: PedagogicalWeather['trend'] =
    positiveSignals > decliningSignals && avgConfidence > 0.4 ? 'improving'
    : decliningTrajectory > improvingCount ? 'declining'
    : 'stable';

  // 7. Suggested guidance mode
  const suggestedMode: PedagogicalWeather['suggested_guidance_mode'] =
    weather === 'stormy' ? 'structured'
    : weather === 'rainy' ? 'mentor'
    : weather === 'cloudy' ? 'challenge'
    : 'discovery';

  // 8. Saturation warnings
  const saturationWarnings: string[] = [];
  if (saturationEvents.cnt > 0) saturationWarnings.push('Surcharge détectée — réduire le rythme');
  if (overloadCount > 2) saturationWarnings.push('Signaux de saturation récurrents — envisager une pause');
  if (score < 20) saturationWarnings.push('Urgence pédagogique — intervention recommandée');

  return {
    weather,
    trend,
    composite_score: score,
    signals_summary: {
      total_recent: signalRows.reduce((s, r) => s + r.cnt, 0),
      progression: progressionCount,
      blockages: blockageCount,
      overloads: overloadCount,
      drift: driftCount,
    },
    saturation_warnings: saturationWarnings,
    suggested_guidance_mode: suggestedMode,
    generated_at: now,
  };
}
