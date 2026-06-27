import type {PersonalLearningProfile, HelpContextSnapshot, UpsertProfileRequest, RecordHelpContextRequest} from '@masterflow/shared';

import {
  getDb,
  type PersonalLearningProfileRow,
  type HelpContextSnapshotRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

function parseJson(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function toProfileDTO(row: PersonalLearningProfileRow): PersonalLearningProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    help_style: row.help_style,
    help_format: row.help_format,
    help_density: row.help_density,
    preferred_personas: JSON.parse(row.preferred_personas_json) as string[],
    learning_state: parseJson(row.learning_state_json),
    professional_self: parseJson(row.professional_self_json),
    guidance_mode: row.guidance_mode,
    profile_status: row.profile_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toSnapshotDTO(row: HelpContextSnapshotRow): HelpContextSnapshot {
  return {
    id: row.id,
    user_id: row.user_id,
    profile_id: row.profile_id,
    project_id: row.project_id,
    detected_need: row.detected_need,
    confidence: row.confidence,
    recommended_mode: row.recommended_mode,
    recommended_persona: row.recommended_persona,
    context: parseJson(row.context_json),
    resolved_at: row.resolved_at,
    created_at: row.created_at,
  };
}

function canAccessProfile(actor: AuthUser, row: {owner_id: string; user_id: string; project_id: string | null}): boolean {
  if (row.user_id === actor.id) return true;
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function assertProfileAccess(actor: AuthUser, row: {owner_id: string; user_id: string; project_id: string | null}): void {
  if (!canAccessProfile(actor, row)) throw new Error('profile_not_found');
}

export function getProfile(actor: AuthUser, userId: string, projectId?: string | null): PersonalLearningProfile {
  let row: PersonalLearningProfileRow | undefined;
  if (projectId) {
    row = getDb().prepare('SELECT * FROM personal_learning_profiles WHERE user_id = ? AND project_id = ?').get(userId, projectId) as PersonalLearningProfileRow | undefined;
  } else {
    row = getDb().prepare('SELECT * FROM personal_learning_profiles WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId) as PersonalLearningProfileRow | undefined;
  }
  if (!row) throw new Error('profile_not_found');
  assertProfileAccess(actor, row);
  return toProfileDTO(row);
}

export function upsertProfile(actor: AuthUser, data: UpsertProfileRequest): PersonalLearningProfile {
  const existing = getDb().prepare('SELECT * FROM personal_learning_profiles WHERE user_id = ? AND project_id IS ?').get(data.user_id, data.project_id ?? null) as PersonalLearningProfileRow | undefined;
  if (existing) assertProfileAccess(actor, existing);

  const id = existing?.id ?? uuid();
  const now = Date.now();
  const preferredPersonas = data.preferred_personas ?? (existing ? JSON.parse(existing.preferred_personas_json) as string[] : []);
  const learningState = data.learning_state ?? (existing ? parseJson(existing.learning_state_json) : {});
  const professionalSelf = data.professional_self ?? (existing ? parseJson(existing.professional_self_json) : {});
  const guidanceMode = data.guidance_mode ?? existing?.guidance_mode ?? 'auto';
  const helpStyle = data.help_style !== undefined ? data.help_style : existing?.help_style ?? null;
  const helpFormat = data.help_format !== undefined ? data.help_format : existing?.help_format ?? null;
  const helpDensity = data.help_density !== undefined ? data.help_density : existing?.help_density ?? null;

  if (existing) {
    getDb().prepare(`
      UPDATE personal_learning_profiles SET
        help_style = ?, help_format = ?, help_density = ?,
        preferred_personas_json = ?, learning_state_json = ?, professional_self_json = ?,
        guidance_mode = ?, updated_at = ?
      WHERE id = ?
    `).run(
      helpStyle, helpFormat, helpDensity,
      JSON.stringify(preferredPersonas), JSON.stringify(learningState), JSON.stringify(professionalSelf),
      guidanceMode, now, existing.id,
    );
  } else {
    getDb().prepare(`
      INSERT INTO personal_learning_profiles (id, user_id, owner_id, project_id, help_style, help_format, help_density, preferred_personas_json, learning_state_json, professional_self_json, guidance_mode, profile_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).run(
      id, data.user_id, actor.id, data.project_id ?? null,
      helpStyle, helpFormat, helpDensity,
      JSON.stringify(preferredPersonas), JSON.stringify(learningState), JSON.stringify(professionalSelf),
      guidanceMode, now, now,
    );
  }

  audit({event_type: 'learning_profile.upserted', user_id: actor.id, detail: {profile_id: id, user_id: data.user_id}});
  return toProfileDTO(getDb().prepare('SELECT * FROM personal_learning_profiles WHERE id = ?').get(id) as PersonalLearningProfileRow);
}

export function updateProfileStatus(actor: AuthUser, profileId: string, status: PersonalLearningProfile['profile_status']): PersonalLearningProfile {
  const row = getDb().prepare('SELECT * FROM personal_learning_profiles WHERE id = ?').get(profileId) as PersonalLearningProfileRow | undefined;
  if (!row) throw new Error('profile_not_found');
  assertProfileAccess(actor, row);
  const now = Date.now();
  getDb().prepare('UPDATE personal_learning_profiles SET profile_status = ?, updated_at = ? WHERE id = ?').run(status, now, profileId);
  audit({event_type: 'learning_profile.status_updated', user_id: row.user_id, detail: {profile_id: profileId, status}});
  return toProfileDTO(getDb().prepare('SELECT * FROM personal_learning_profiles WHERE id = ?').get(profileId) as PersonalLearningProfileRow);
}

export function recordHelpContext(actor: AuthUser, data: RecordHelpContextRequest): HelpContextSnapshot {
  const id = uuid();
  const now = Date.now();

  // Lier au profil existant si présent
  const profile = getDb().prepare('SELECT * FROM personal_learning_profiles WHERE user_id = ? AND project_id IS ?').get(data.user_id, data.project_id ?? null) as PersonalLearningProfileRow | undefined;
  if (profile) assertProfileAccess(actor, profile);
  else if (data.user_id !== actor.id) throw new Error('profile_not_found');

  getDb().prepare(`
    INSERT INTO help_context_snapshots (id, user_id, profile_id, project_id, detected_need, confidence, recommended_mode, recommended_persona, context_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.user_id, profile?.id ?? null, data.project_id ?? null,
    data.detected_need, data.confidence, data.recommended_mode,
    data.recommended_persona ?? null, JSON.stringify(data.context ?? {}), now,
  );

  return toSnapshotDTO(getDb().prepare('SELECT * FROM help_context_snapshots WHERE id = ?').get(id) as HelpContextSnapshotRow);
}

export function listHelpContext(actor: AuthUser, userId: string, limit = 20): HelpContextSnapshot[] {
  if (userId !== actor.id) {
    const profile = getDb().prepare('SELECT * FROM personal_learning_profiles WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1').get(userId) as PersonalLearningProfileRow | undefined;
    if (!profile) throw new Error('profile_not_found');
    assertProfileAccess(actor, profile);
  }
  return (getDb().prepare('SELECT * FROM help_context_snapshots WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit) as HelpContextSnapshotRow[]).map(toSnapshotDTO);
}
