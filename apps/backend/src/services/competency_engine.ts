import type {
  CompetencyFramework,
  CompetencyDefinition,
  UserCompetencySignal,
  UserCompetencyProgress,
  IngestCompetencySignalRequest,
} from '@masterflow/shared';

import {
  getDb,
  type CompetencyFrameworkRow,
  type CompetencyDefinitionRow,
  type UserCompetencySignalRow,
  type UserCompetencyProgressRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

// ─── Frameworks ───

function toFrameworkDTO(row: CompetencyFrameworkRow): CompetencyFramework {
  return {
    id: row.id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    label: row.label,
    description: row.description,
    domain: row.domain,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function canAccessFramework(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function assertFrameworkAccess(actor: AuthUser, row: {owner_id: string; project_id: string | null}): void {
  if (!canAccessFramework(actor, row)) throw new Error('framework_not_found');
}

export function listFrameworks(actor: AuthUser, projectId?: string): CompetencyFramework[] {
  let sql = 'SELECT * FROM competency_frameworks WHERE owner_id = ?';
  const params: unknown[] = [actor.id];
  if (projectId) { sql += ' AND project_id = ?'; params.push(projectId); }
  sql += ' ORDER BY label ASC';
  return (getDb().prepare(sql).all(...params) as CompetencyFrameworkRow[]).map(toFrameworkDTO);
}

export function getFramework(actor: AuthUser, frameworkId: string): CompetencyFramework {
  const row = getDb().prepare('SELECT * FROM competency_frameworks WHERE id = ?').get(frameworkId) as CompetencyFrameworkRow | undefined;
  if (!row) throw new Error('framework_not_found');
  assertFrameworkAccess(actor, row);
  return toFrameworkDTO(row);
}

export function createFramework(
  actor: AuthUser,
  data: {label: string; description?: string; domain: string; project_id?: string | null},
): CompetencyFramework {
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO competency_frameworks (id, owner_id, project_id, label, description, domain, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, actor.id, data.project_id ?? null, data.label, data.description ?? null, data.domain, now, now);
  audit({event_type: 'competency_framework.created', user_id: actor.id, detail: {framework_id: id, label: data.label}});
  return getFramework(actor, id);
}

export function updateFramework(
  actor: AuthUser,
  frameworkId: string,
  data: {label?: string; description?: string; domain?: string; status?: 'active' | 'archived'},
): CompetencyFramework {
  const existing = getFramework(actor, frameworkId);
  const now = Date.now();
  const label = data.label ?? existing.label;
  const description = data.description ?? existing.description;
  const domain = data.domain ?? existing.domain;
  const status = data.status ?? existing.status;
  getDb().prepare(`
    UPDATE competency_frameworks SET label = ?, description = ?, domain = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(label, description, domain, status, now, frameworkId);
  audit({event_type: 'competency_framework.updated', user_id: actor.id, detail: {framework_id: frameworkId}});
  return getFramework(actor, frameworkId);
}

// ─── Définitions ───

function toDefinitionDTO(row: CompetencyDefinitionRow): CompetencyDefinition {
  return {
    id: row.id,
    framework_id: row.framework_id,
    parent_id: row.parent_id,
    code: row.code,
    label: row.label,
    description: row.description,
    bloom_level: row.bloom_level,
    icon: row.icon,
    sort_order: row.sort_order,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function listDefinitions(actor: AuthUser, frameworkId?: string): CompetencyDefinition[] {
  if (frameworkId) {
    getFramework(actor, frameworkId);
    return (getDb().prepare('SELECT * FROM competency_definitions WHERE framework_id = ? ORDER BY sort_order ASC').all(frameworkId) as CompetencyDefinitionRow[]).map(toDefinitionDTO);
  }
  return (getDb().prepare('SELECT cd.* FROM competency_definitions cd JOIN competency_frameworks cf ON cf.id = cd.framework_id WHERE cf.owner_id = ? ORDER BY cd.sort_order ASC').all(actor.id) as CompetencyDefinitionRow[]).map(toDefinitionDTO);
}

export function getDefinition(actor: AuthUser, definitionId: string): CompetencyDefinition {
  const row = getDb().prepare('SELECT * FROM competency_definitions WHERE id = ?').get(definitionId) as CompetencyDefinitionRow | undefined;
  if (!row) throw new Error('definition_not_found');
  getFramework(actor, row.framework_id);
  return toDefinitionDTO(row);
}

export function createDefinition(
  actor: AuthUser,
  data: {
    framework_id: string;
    parent_id?: string | null;
    code: string;
    label: string;
    description?: string;
    bloom_level?: CompetencyDefinition['bloom_level'];
    icon?: string;
    sort_order?: number;
  },
): CompetencyDefinition {
  const framework = getFramework(actor, data.framework_id);
  void framework;
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO competency_definitions (id, framework_id, parent_id, code, label, description, bloom_level, icon, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.framework_id, data.parent_id ?? null, data.code, data.label, data.description ?? null, data.bloom_level ?? null, data.icon ?? null, data.sort_order ?? 0, now, now);
  audit({event_type: 'competency_definition.created', user_id: actor.id, detail: {definition_id: id, code: data.code}});
  return getDefinition(actor, id);
}

export function updateDefinition(
  actor: AuthUser,
  definitionId: string,
  data: {
    label?: string;
    description?: string;
    bloom_level?: CompetencyDefinition['bloom_level'];
    icon?: string;
    sort_order?: number;
    status?: 'active' | 'archived';
  },
): CompetencyDefinition {
  const existing = getDefinition(actor, definitionId);
  const now = Date.now();
  const label = data.label ?? existing.label;
  const description = data.description ?? existing.description;
  const bloom_level = data.bloom_level !== undefined ? data.bloom_level : existing.bloom_level;
  const icon = data.icon !== undefined ? data.icon : existing.icon;
  const sort_order = data.sort_order ?? existing.sort_order;
  const status = data.status ?? existing.status;
  getDb().prepare(`
    UPDATE competency_definitions SET label = ?, description = ?, bloom_level = ?, icon = ?, sort_order = ?, status = ?, updated_at = ? WHERE id = ?
  `).run(label, description, bloom_level, icon, sort_order, status, now, definitionId);
  audit({event_type: 'competency_definition.updated', user_id: actor.id, detail: {definition_id: definitionId}});
  return getDefinition(actor, definitionId);
}

// ─── Signaux ───

function toSignalDTO(row: UserCompetencySignalRow): UserCompetencySignal {
  return {
    id: row.id,
    user_id: row.user_id,
    competency_id: row.competency_id,
    project_id: row.project_id,
    evidence_ref: row.evidence_ref,
    source: row.source,
    mastery_level: row.mastery_level,
    autonomy_level: row.autonomy_level,
    confidence: row.confidence,
    observation: row.observation,
    validation_required: row.validation_required,
    validator_id: row.validator_id,
    validated_at: row.validated_at,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function ingestSignal(actor: AuthUser, data: IngestCompetencySignalRequest & {validation_required?: number}): UserCompetencySignal {
  const definition = getDefinition(actor, data.competency_id);
  void definition;
  const id = uuid();
  const now = Date.now();
  const validationRequired = data.validation_required ?? 1;
  getDb().prepare(`
    INSERT INTO user_competency_signals (id, user_id, competency_id, project_id, evidence_ref, source, mastery_level, autonomy_level, confidence, observation, validation_required, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)
  `).run(id, data.user_id, data.competency_id, data.project_id ?? null, data.evidence_ref ?? null, data.source, data.mastery_level, data.autonomy_level ?? null, data.confidence, data.observation ?? null, validationRequired, now, now);

  // Mettre à jour la progression agrégée
  recalculateProgress(data.user_id, data.competency_id, data.project_id ?? null);

  audit({event_type: 'competency_signal.ingested', user_id: actor.id, detail: {
    signal_id: id,
    user_id: data.user_id,
    competency_id: data.competency_id,
    mastery_level: data.mastery_level,
  }});

  return toSignalDTO(getDb().prepare('SELECT * FROM user_competency_signals WHERE id = ?').get(id) as UserCompetencySignalRow);
}

export function listSignals(actor: AuthUser, options?: {userId?: string; competencyId?: string; status?: string}): UserCompetencySignal[] {
  let sql = 'SELECT * FROM user_competency_signals WHERE 1=1';
  const params: unknown[] = [];
  if (options?.userId) { sql += ' AND user_id = ?'; params.push(options.userId); }
  if (options?.competencyId) { sql += ' AND competency_id = ?'; params.push(options.competencyId); }
  if (options?.status) { sql += ' AND status = ?'; params.push(options.status); }
  sql += ' ORDER BY created_at DESC';
  return (getDb().prepare(sql).all(...params) as UserCompetencySignalRow[])
    .filter((row) => {
      const definition = getDb().prepare('SELECT cd.framework_id FROM competency_definitions cd WHERE cd.id = ?').get(row.competency_id) as {framework_id: string} | undefined;
      if (!definition) return false;
      try { getFramework(actor, definition.framework_id); return true; } catch { return false; }
    })
    .map(toSignalDTO);
}

export function validateSignal(actor: AuthUser, signalId: string, decision: 'validated' | 'rejected'): UserCompetencySignal {
  const row = getDb().prepare('SELECT * FROM user_competency_signals WHERE id = ?').get(signalId) as UserCompetencySignalRow | undefined;
  if (!row) throw new Error('signal_not_found');
  getDefinition(actor, row.competency_id);
  if (row.status !== 'candidate') throw new Error('signal_already_decided');
  const now = Date.now();
  getDb().prepare(`
    UPDATE user_competency_signals SET status = ?, validator_id = ?, validated_at = ?, updated_at = ? WHERE id = ?
  `).run(decision, actor.id, now, now, signalId);

  // Recalculer progression
  recalculateProgress(row.user_id, row.competency_id, row.project_id);

  audit({event_type: 'competency_signal.decided', user_id: actor.id, detail: {
    signal_id: signalId,
    decision,
    user_id: row.user_id,
    competency_id: row.competency_id,
  }});

  return toSignalDTO(getDb().prepare('SELECT * FROM user_competency_signals WHERE id = ?').get(signalId) as UserCompetencySignalRow);
}

// ─── Progression ───

function toProgressDTO(row: UserCompetencyProgressRow): UserCompetencyProgress {
  return {
    id: row.id,
    user_id: row.user_id,
    competency_id: row.competency_id,
    project_id: row.project_id,
    current_mastery: row.current_mastery,
    current_autonomy: row.current_autonomy,
    confidence: row.confidence,
    signal_count: row.signal_count,
    last_signal_at: row.last_signal_at,
    trajectory: row.trajectory,
    validation_required: row.validation_required,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const MASTERY_ORDER: Record<string, number> = {
  unknown: 0, discovering: 1, guided: 2, practicing: 3, autonomous: 4, mentor_ready: 5,
};

function recalculateProgress(userId: string, competencyId: string, projectId: string | null): void {
  const validatedSignals = getDb().prepare(`
    SELECT * FROM user_competency_signals
    WHERE user_id = ? AND competency_id = ? AND project_id IS ? AND status = 'validated'
    ORDER BY created_at DESC
  `).all(userId, competencyId, projectId) as UserCompetencySignalRow[];

  // Si aucun signal validé, utiliser les candidats comme provision
  const signals = validatedSignals.length > 0
    ? validatedSignals
    : getDb().prepare(`
      SELECT * FROM user_competency_signals
      WHERE user_id = ? AND competency_id = ? AND project_id IS ? AND status = 'candidate'
      ORDER BY created_at DESC
    `).all(userId, competencyId, projectId) as UserCompetencySignalRow[];

  const signalCount = signals.length;
  const lastSignalAt = signalCount > 0 ? signals[0]!.created_at : null;

  if (signalCount === 0) {
    // Réinitialiser si plus aucun signal
    getDb().prepare(`
      INSERT INTO user_competency_progress (id, user_id, competency_id, project_id, current_mastery, current_autonomy, confidence, signal_count, last_signal_at, validation_required, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'unknown', 'unknown', 0, 0, NULL, 1, ?, ?)
      ON CONFLICT(user_id, competency_id, project_id) DO UPDATE SET
        current_mastery = 'unknown',
        current_autonomy = 'unknown',
        confidence = 0,
        signal_count = 0,
        last_signal_at = NULL,
        updated_at = excluded.updated_at
    `).run(uuid(), userId, competencyId, projectId, Date.now(), Date.now());
    return;
  }

  // Calculer le niveau modal (le plus fréquent parmi les récents, pondéré par confidence)
  const masteryScores: Record<string, {count: number; totalConfidence: number}> = {};
  for (const s of signals) {
    if (!masteryScores[s.mastery_level]) masteryScores[s.mastery_level] = {count: 0, totalConfidence: 0};
    masteryScores[s.mastery_level]!.count++;
    masteryScores[s.mastery_level]!.totalConfidence += s.confidence;
  }
  const bestMastery = Object.entries(masteryScores).reduce((a, b) =>
    (MASTERY_ORDER[a[0]] ?? 0) > (MASTERY_ORDER[b[0]] ?? 0) ? a : b,
  )[0];

  // Confiance agrégée
  const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signalCount;

  // Trajectoire simple
  let trajectory: UserCompetencyProgress['trajectory'] = null;
  if (signalCount >= 3) {
    const recent = signals.slice(0, 3);
    const firstIdx = MASTERY_ORDER[recent[2]!.mastery_level] ?? 0;
    const lastIdx = MASTERY_ORDER[recent[0]!.mastery_level] ?? 0;
    if (lastIdx > firstIdx + 1) trajectory = 'emerging';
    else if (lastIdx > firstIdx) trajectory = 'consolidating';
    else if (lastIdx === firstIdx) trajectory = 'consolidating';
    else trajectory = 'unstable';
  }

  const now = Date.now();
  getDb().prepare(`
    INSERT INTO user_competency_progress (id, user_id, competency_id, project_id, current_mastery, current_autonomy, confidence, signal_count, last_signal_at, trajectory, validation_required, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    ON CONFLICT(user_id, competency_id, project_id) DO UPDATE SET
      current_mastery = excluded.current_mastery,
      confidence = excluded.confidence,
      signal_count = excluded.signal_count,
      last_signal_at = excluded.last_signal_at,
      trajectory = excluded.trajectory,
      updated_at = excluded.updated_at
  `).run(uuid(), userId, competencyId, projectId, bestMastery, null, avgConfidence, signalCount, lastSignalAt, trajectory, now, now);
}

export function getUserProgress(actor: AuthUser, userId: string, projectId?: string | null): UserCompetencyProgress[] {
  if (userId !== actor.id && !projectId) throw new Error('progress_not_found');
  if (projectId && !decideScopedPermission({actor, projectId, minimumProjectRole: 'editor'}).allowed) throw new Error('progress_not_found');
  if (projectId) {
    return (getDb().prepare('SELECT * FROM user_competency_progress WHERE user_id = ? AND project_id = ? ORDER BY updated_at DESC').all(userId, projectId) as UserCompetencyProgressRow[]).map(toProgressDTO);
  }
  return (getDb().prepare('SELECT * FROM user_competency_progress WHERE user_id = ? ORDER BY updated_at DESC').all(userId) as UserCompetencyProgressRow[]).map(toProgressDTO);
}
