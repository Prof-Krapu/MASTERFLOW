import type {StyleMirrorProfile, UpsertStyleMirrorRequest} from '@masterflow/shared';

import {
  getDb,
  type StyleMirrorProfileRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

function toDTO(row: StyleMirrorProfileRow): StyleMirrorProfile {
  return {
    id: row.id,
    user_id: row.user_id,
    owner_id: row.owner_id,
    project_id: row.project_id,
    persona_id: row.persona_id,
    register_target: row.register_target,
    energy_target: row.energy_target,
    lexical_complexity: row.lexical_complexity,
    mirror_intensity: row.mirror_intensity,
    lexical_overrides: JSON.parse(row.lexical_overrides_json) as string[],
    signature_moves_override: JSON.parse(row.signature_moves_override_json) as string[],
    tone_rules: JSON.parse(row.tone_rules_json) as string[],
    profile_status: row.profile_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
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

export function upsertProfile(actor: AuthUser, data: UpsertStyleMirrorRequest): StyleMirrorProfile {
  const existing = getDb().prepare(
    'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND project_id IS ? AND persona_id IS ?',
  ).get(data.user_id, data.project_id ?? null, data.persona_id ?? null) as StyleMirrorProfileRow | undefined;
  if (existing) assertProfileAccess(actor, existing);

  const id = existing?.id ?? uuid();
  const now = Date.now();
  const intensity = data.mirror_intensity ?? existing?.mirror_intensity ?? 0.5;
  const registerTarget = data.register_target !== undefined ? data.register_target : existing?.register_target ?? null;
  const energyTarget = data.energy_target !== undefined ? data.energy_target : existing?.energy_target ?? null;
  const lexComp = data.lexical_complexity !== undefined ? data.lexical_complexity : existing?.lexical_complexity ?? null;
  const lexOverrides = data.lexical_overrides ?? (existing ? JSON.parse(existing.lexical_overrides_json) as string[] : []);
  const movesOverride = data.signature_moves_override ?? (existing ? JSON.parse(existing.signature_moves_override_json) as string[] : []);
  const toneRules = data.tone_rules ?? (existing ? JSON.parse(existing.tone_rules_json) as string[] : []);

  if (existing) {
    getDb().prepare(`
      UPDATE style_mirror_profiles SET
        register_target = ?, energy_target = ?, lexical_complexity = ?,
        mirror_intensity = ?,
        lexical_overrides_json = ?, signature_moves_override_json = ?, tone_rules_json = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      registerTarget, energyTarget, lexComp, intensity,
      JSON.stringify(lexOverrides), JSON.stringify(movesOverride), JSON.stringify(toneRules),
      now, existing.id,
    );
  } else {
    getDb().prepare(`
      INSERT INTO style_mirror_profiles
        (id, user_id, owner_id, project_id, persona_id, register_target, energy_target, lexical_complexity, mirror_intensity, lexical_overrides_json, signature_moves_override_json, tone_rules_json, profile_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).run(
      id, data.user_id, actor.id, data.project_id ?? null, data.persona_id ?? null,
      registerTarget, energyTarget, lexComp, intensity,
      JSON.stringify(lexOverrides), JSON.stringify(movesOverride), JSON.stringify(toneRules),
      now, now,
    );
  }

  audit({event_type: 'style_mirror.upserted', user_id: actor.id, detail: {profile_id: id, user_id: data.user_id}});
  return toDTO(getDb().prepare('SELECT * FROM style_mirror_profiles WHERE id = ?').get(id) as StyleMirrorProfileRow);
}

export function getProfile(actor: AuthUser, userId: string, personaId?: string | null, projectId?: string | null): StyleMirrorProfile {
  let row: StyleMirrorProfileRow | undefined;
  if (personaId) {
    row = getDb().prepare(
      'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND persona_id = ? AND project_id IS ?',
    ).get(userId, personaId, projectId ?? null) as StyleMirrorProfileRow | undefined;
    if (!row) {
      row = getDb().prepare(
        'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND persona_id IS NULL AND project_id IS ? ORDER BY updated_at DESC LIMIT 1',
      ).get(userId, projectId ?? null) as StyleMirrorProfileRow | undefined;
    }
  } else {
    row = getDb().prepare(
      'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND persona_id IS NULL AND project_id IS ? ORDER BY updated_at DESC LIMIT 1',
    ).get(userId, projectId ?? null) as StyleMirrorProfileRow | undefined;
  }
  if (!row) throw new Error('profile_not_found');
  assertProfileAccess(actor, row);
  return toDTO(row);
}

export function updateProfileStatus(actor: AuthUser, profileId: string, status: StyleMirrorProfile['profile_status']): StyleMirrorProfile {
  const row = getDb().prepare('SELECT * FROM style_mirror_profiles WHERE id = ?').get(profileId) as StyleMirrorProfileRow | undefined;
  if (!row) throw new Error('profile_not_found');
  assertProfileAccess(actor, row);
  const now = Date.now();
  getDb().prepare('UPDATE style_mirror_profiles SET profile_status = ?, updated_at = ? WHERE id = ?').run(status, now, profileId);
  audit({event_type: 'style_mirror.status_updated', user_id: row.user_id, detail: {profile_id: profileId, status}});
  return toDTO(getDb().prepare('SELECT * FROM style_mirror_profiles WHERE id = ?').get(profileId) as StyleMirrorProfileRow);
}

/**
 * Génère une instruction de style dynamique pour injection dans le system prompt du LLM.
 * Retourne null si aucun profil actif n'existe pour cet utilisateur + persona.
 */
export function getStyleInstructions(userId: string, personaId: string, projectId?: string | null): string | null {
  let row = getDb().prepare(
    'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND persona_id = ? AND project_id IS ? AND profile_status = ? ORDER BY updated_at DESC LIMIT 1',
  ).get(userId, personaId, projectId ?? null, 'active') as StyleMirrorProfileRow | undefined;

  if (!row) {
    row = getDb().prepare(
      'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND persona_id IS NULL AND project_id IS ? AND profile_status = ? ORDER BY updated_at DESC LIMIT 1',
    ).get(userId, projectId ?? null, 'active') as StyleMirrorProfileRow | undefined;
  }

  if (!row) return null;

  const profile = toDTO(row);
  const parts: string[] = [];

  if (profile.register_target && profile.register_target !== 'auto') {
    parts.push(`Registre : ${profile.register_target}.`);
  }
  if (profile.energy_target && profile.energy_target !== 'auto') {
    parts.push(`Énergie : ${profile.energy_target}.`);
  }
  if (profile.lexical_complexity && profile.lexical_complexity !== 'auto') {
    const map = {simple: 'simplifié', balanced: 'standard', rich: 'soutenu'};
    parts.push(`Vocabulaire : ${map[profile.lexical_complexity]}.`);
  }
  if (profile.lexical_overrides.length > 0) {
    parts.push(`Termes à utiliser : ${profile.lexical_overrides.join(', ')}.`);
  }
  if (profile.tone_rules.length > 0) {
    parts.push(...profile.tone_rules.map((rule) => `${rule}.`));
  }

  if (parts.length === 0) return null;
  return `Style adapté : ${parts.join(' ')}`;
}
