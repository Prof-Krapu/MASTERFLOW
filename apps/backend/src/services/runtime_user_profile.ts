import type {RuntimeUserProfile, User} from '@masterflow/shared';

import {getDb, type UserRow} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getUserProgress} from './competency_engine.ts';
import {getProgressionSummary} from './gamification_engine.ts';
import {getProfile} from './learning_mirror_engine.ts';
import {listSkillTree} from './skill_tree.ts';

type ProfessionalSkillRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  domain: string;
  icon: string | null;
  current_mastery: RuntimeUserProfile['professional_skills'][number]['mastery_level'];
  current_autonomy: RuntimeUserProfile['professional_skills'][number]['autonomy_level'];
  confidence: number;
  signal_count: number;
  evidence_ref: string | null;
  signal_status: 'candidate' | 'validated' | null;
};

const masteryScores: Record<ProfessionalSkillRow['current_mastery'], number> = {
  unknown: 0,
  discovering: 24,
  guided: 42,
  practicing: 62,
  autonomous: 82,
  mentor_ready: 96,
};

function configuredDeclaredResourceSources(actor: AuthUser): string[] {
  const raw = process.env.MASTERFLOW_DECLARED_RESOURCE_SOURCES_JSON;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const mapping = parsed as Record<string, unknown>;
    const configured = mapping[actor.id] ?? mapping[actor.username];
    return Array.isArray(configured)
      ? [...new Set(configured.filter((value): value is string => typeof value === 'string' && value.length > 0))]
      : [];
  } catch {
    return [];
  }
}

function declaredResourceSummary(actor: AuthUser): RuntimeUserProfile['declared_resources'] {
  const sources = configuredDeclaredResourceSources(actor);
  if (sources.length === 0) {
    return {total: 0, videos: 0, links: 0, documents: 0, attached_to_inventory: 0, pending_inventory: 0};
  }
  const resources = getDb().prepare(`
    SELECT id, type
    FROM resources
    WHERE status = 'validated' AND source IN (${sources.map(() => '?').join(',')})
    ORDER BY id
  `).all(...sources) as Array<{id: string; type: string}>;
  const inventoryRows = getDb().prepare(`
    SELECT source_refs_json
    FROM inventory_items
    WHERE owner_id = ? AND scope_type = 'user' AND validation_status != 'archived'
  `).all(actor.id) as Array<{source_refs_json: string}>;
  const attachedRefs = new Set(inventoryRows.flatMap((row) => {
    try {
      return JSON.parse(row.source_refs_json) as string[];
    } catch {
      return [];
    }
  }));
  const attached = resources.filter((resource) => attachedRefs.has(`resource:${resource.id}`)).length;
  return {
    total: resources.length,
    videos: resources.filter((resource) => ['video', 'tutorial_video'].includes(resource.type)).length,
    links: resources.filter((resource) => resource.type === 'link').length,
    documents: resources.filter((resource) => ['book', 'comic', 'manga', 'artbook', 'archive', 'note', 'document'].includes(resource.type)).length,
    attached_to_inventory: attached,
    pending_inventory: Math.max(0, resources.length - attached),
  };
}

function listProfessionalSkills(actor: AuthUser): RuntimeUserProfile['professional_skills'] {
  const rows = getDb().prepare(`
    SELECT
      cd.id,
      cd.code,
      cd.label,
      cd.description,
      cd.icon,
      cf.domain,
      ucp.current_mastery,
      ucp.current_autonomy,
      ucp.confidence,
      ucp.signal_count,
      (
        SELECT signal.evidence_ref
        FROM user_competency_signals signal
        WHERE signal.user_id = ucp.user_id AND signal.competency_id = cd.id
        ORDER BY CASE signal.status WHEN 'validated' THEN 0 ELSE 1 END, signal.updated_at DESC
        LIMIT 1
      ) AS evidence_ref,
      (
        SELECT signal.status
        FROM user_competency_signals signal
        WHERE signal.user_id = ucp.user_id AND signal.competency_id = cd.id
          AND signal.status IN ('candidate', 'validated')
        ORDER BY CASE signal.status WHEN 'validated' THEN 0 ELSE 1 END, signal.updated_at DESC
        LIMIT 1
      ) AS signal_status
    FROM user_competency_progress ucp
    JOIN competency_definitions cd ON cd.id = ucp.competency_id AND cd.status = 'active'
    JOIN competency_frameworks cf ON cf.id = cd.framework_id AND cf.status = 'active'
    WHERE ucp.user_id = ? AND ucp.project_id IS NULL AND cf.owner_id = ?
      AND cf.domain LIKE 'masterflex.%'
    ORDER BY cd.sort_order ASC, cd.label ASC
  `).all(actor.id, actor.id) as ProfessionalSkillRow[];

  return rows.flatMap((row) => {
    const arc = row.domain.slice('masterflex.'.length);
    const family = row.icon?.startsWith('family:') ? row.icon.slice('family:'.length) : '';
    if (!['creation', 'direction', 'pedagogy', 'structure'].includes(arc)) return [];
    if (!['image', 'volume', 'system', 'story', 'soft'].includes(family)) return [];
    return [{
      id: row.id,
      code: row.code,
      label: row.label,
      description: row.description,
      arc: arc as RuntimeUserProfile['professional_skills'][number]['arc'],
      family: family as RuntimeUserProfile['professional_skills'][number]['family'],
      mastery_level: row.current_mastery,
      mastery_score: masteryScores[row.current_mastery],
      autonomy_level: row.current_autonomy,
      confidence: row.confidence,
      signal_count: row.signal_count,
      evidence_refs: row.evidence_ref?.split('|').filter(Boolean) ?? [],
      validation_status: row.signal_status === 'validated' ? 'validated' as const : 'candidate' as const,
    }];
  });
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    email: row.email,
    role: row.role,
  };
}

/**
 * Assemble le profil privé de l'utilisateur authentifié à partir des moteurs
 * existants. Aucune donnée d'un autre utilisateur ne peut entrer dans cette vue.
 */
export function getRuntimeUserProfile(actor: AuthUser): RuntimeUserProfile {
  const db = getDb();
  const userRow = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(actor.id) as UserRow | undefined;
  if (!userRow) throw new Error('profile_not_found');

  let learningProfile: RuntimeUserProfile['learning_profile'] = null;
  try {
    learningProfile = getProfile(actor, actor.id);
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'profile_not_found') throw error;
  }

  const inventory = db.prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN validation_status = 'candidate' THEN 1 ELSE 0 END) AS candidates,
      SUM(CASE WHEN validation_status = 'validated' THEN 1 ELSE 0 END) AS validated,
      SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) AS videos,
      SUM(CASE WHEN type = 'link' THEN 1 ELSE 0 END) AS links,
      SUM(CASE WHEN type IN ('book','comic','manga','artbook','archive','note') THEN 1 ELSE 0 END) AS documents
    FROM inventory_items
    WHERE owner_id = ? AND scope_type = 'user' AND validation_status != 'archived'
  `).get(actor.id) as Record<keyof RuntimeUserProfile['inventory'], number | null>;

  const projectCount = db.prepare(`
    SELECT COUNT(*) AS count FROM (
      SELECT id FROM projects WHERE owner_id = ? AND status = 'active'
      UNION
      SELECT p.id
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ? AND p.status = 'active'
    )
  `).get(actor.id, actor.id) as {count: number};

  return {
    user: toUser(userRow),
    learning_profile: learningProfile,
    progression: getProgressionSummary(actor, actor.id),
    competency_progress: getUserProgress(actor, actor.id),
    professional_skills: listProfessionalSkills(actor),
    skill_tree: listSkillTree(actor)
      .filter((node) => node.owner_id === actor.id && node.visible_to_user === 1),
    inventory: {
      total: inventory.total ?? 0,
      candidates: inventory.candidates ?? 0,
      validated: inventory.validated ?? 0,
      videos: inventory.videos ?? 0,
      links: inventory.links ?? 0,
      documents: inventory.documents ?? 0,
    },
    declared_resources: declaredResourceSummary(actor),
    projects_count: projectCount.count,
    generated_at: Date.now(),
  };
}
