import {
  ExpressiveBehaviorConfigSchema,
  type ExpressiveBehaviorConfig,
  type StyleMirrorProfile,
  type UpsertStyleMirrorRequest,
} from '@masterflow/shared';

import {
  getDb,
  type StyleMirrorProfileRow,
} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

const EXPRESSIVE_CANON_VALIDATION_VERSION = 'expressive_canon_p1';
const STYLE_INSTRUCTION_LIMIT = 1_200;

function parseStringArray(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
}

function parseBehaviorConfig(raw: string): ExpressiveBehaviorConfig {
  return ExpressiveBehaviorConfigSchema.parse(JSON.parse(raw || '{}'));
}

function cleanStringArray(values: string[] | undefined, limit: number): string[] {
  return [...new Set((values ?? []).map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

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
    lexical_overrides: parseStringArray(row.lexical_overrides_json),
    signature_moves_override: parseStringArray(row.signature_moves_override_json),
    tone_rules: parseStringArray(row.tone_rules_json),
    behavior_config: parseBehaviorConfig(row.behavior_config_json),
    source_refs: parseStringArray(row.source_refs_json),
    consent_status: row.consent_status,
    consent_ref: row.consent_ref,
    consent_granted_at: row.consent_granted_at,
    consent_revoked_at: row.consent_revoked_at,
    validated_by: row.validated_by,
    validated_at: row.validated_at,
    validation_version: row.validation_version,
    visual_canon_ref: row.visual_canon_ref,
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

function canCreateProfile(actor: AuthUser, data: UpsertStyleMirrorRequest): boolean {
  if (data.user_id === actor.id) return true;
  if (actor.role === 'admin' || actor.role === 'godmode') return true;
  if (actor.role !== 'teacher') return false;
  if (!data.project_id) return true; // compat historique : proposition professeur globale, activation sujet requise.
  return decideScopedPermission({
    actor,
    ownerId: actor.id,
    projectId: data.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

export function upsertProfile(actor: AuthUser, data: UpsertStyleMirrorRequest): StyleMirrorProfile {
  const existing = getDb().prepare(
    'SELECT * FROM style_mirror_profiles WHERE user_id = ? AND project_id IS ? AND persona_id IS ?',
  ).get(data.user_id, data.project_id ?? null, data.persona_id ?? null) as StyleMirrorProfileRow | undefined;
  if (existing) assertProfileAccess(actor, existing);
  if (!existing && !canCreateProfile(actor, data)) throw new Error('profile_create_denied');

  const id = existing?.id ?? uuid();
  const now = Date.now();
  const intensity = data.mirror_intensity ?? existing?.mirror_intensity ?? 0.5;
  const registerTarget = data.register_target !== undefined ? data.register_target : existing?.register_target ?? null;
  const energyTarget = data.energy_target !== undefined ? data.energy_target : existing?.energy_target ?? null;
  const lexComp = data.lexical_complexity !== undefined ? data.lexical_complexity : existing?.lexical_complexity ?? null;
  const lexOverrides = cleanStringArray(
    data.lexical_overrides ?? (existing ? parseStringArray(existing.lexical_overrides_json) : []),
    20,
  );
  const movesOverride = cleanStringArray(
    data.signature_moves_override ?? (existing ? parseStringArray(existing.signature_moves_override_json) : []),
    5,
  );
  const toneRules = cleanStringArray(
    data.tone_rules ?? (existing ? parseStringArray(existing.tone_rules_json) : []),
    10,
  );
  const behaviorConfig = data.behavior_config
    ? ExpressiveBehaviorConfigSchema.parse(data.behavior_config)
    : existing
      ? parseBehaviorConfig(existing.behavior_config_json)
      : ExpressiveBehaviorConfigSchema.parse({});
  const sourceRefs = cleanStringArray(
    data.source_refs ?? (existing ? parseStringArray(existing.source_refs_json) : []),
    30,
  );
  const visualCanonRef = data.visual_canon_ref !== undefined
    ? data.visual_canon_ref
    : existing?.visual_canon_ref ?? null;

  if (existing) {
    getDb().prepare(`
      UPDATE style_mirror_profiles SET
        register_target = ?, energy_target = ?, lexical_complexity = ?,
        mirror_intensity = ?,
        lexical_overrides_json = ?, signature_moves_override_json = ?, tone_rules_json = ?,
        behavior_config_json = ?, source_refs_json = ?, visual_canon_ref = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      registerTarget, energyTarget, lexComp, intensity,
      JSON.stringify(lexOverrides), JSON.stringify(movesOverride), JSON.stringify(toneRules),
      JSON.stringify(behaviorConfig), JSON.stringify(sourceRefs), visualCanonRef,
      now, existing.id,
    );
  } else {
    getDb().prepare(`
      INSERT INTO style_mirror_profiles
        (id, user_id, owner_id, project_id, persona_id, register_target, energy_target, lexical_complexity, mirror_intensity, lexical_overrides_json, signature_moves_override_json, tone_rules_json, behavior_config_json, source_refs_json, visual_canon_ref, profile_status, consent_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'pending', ?, ?)
    `).run(
      id, data.user_id, actor.id, data.project_id ?? null, data.persona_id ?? null,
      registerTarget, energyTarget, lexComp, intensity,
      JSON.stringify(lexOverrides), JSON.stringify(movesOverride), JSON.stringify(toneRules),
      JSON.stringify(behaviorConfig), JSON.stringify(sourceRefs), visualCanonRef,
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
  if (status === 'active') {
    if (actor.id !== row.user_id) throw new Error('style_mirror_subject_consent_required');
    getDb().prepare(`
      UPDATE style_mirror_profiles
      SET profile_status = 'active',
          consent_status = 'granted',
          consent_ref = ?,
          consent_granted_at = ?,
          consent_revoked_at = NULL,
          validated_by = ?,
          validated_at = ?,
          validation_version = ?,
          updated_at = ?
      WHERE id = ?
    `).run(`subject:${actor.id}:style_mirror`, now, actor.id, now, EXPRESSIVE_CANON_VALIDATION_VERSION, now, profileId);
  } else if (status === 'archived' && actor.id === row.user_id) {
    getDb().prepare(`
      UPDATE style_mirror_profiles
      SET profile_status = 'archived',
          consent_status = 'revoked',
          consent_revoked_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(now, now, profileId);
  } else {
    getDb().prepare('UPDATE style_mirror_profiles SET profile_status = ?, updated_at = ? WHERE id = ?').run(status, now, profileId);
  }
  audit({event_type: 'style_mirror.status_updated', user_id: actor.id, detail: {profile_id: profileId, subject_user_id: row.user_id, status}});
  return toDTO(getDb().prepare('SELECT * FROM style_mirror_profiles WHERE id = ?').get(profileId) as StyleMirrorProfileRow);
}

function selectInjectableProfile(userId: string, personaId: string, projectId?: string | null): StyleMirrorProfileRow | undefined {
  const queries: Array<[string | null, string | null]> = projectId
    ? [[personaId, projectId], [null, projectId], [personaId, null], [null, null]]
    : [[personaId, null], [null, null]];
  for (const [candidatePersonaId, candidateProjectId] of queries) {
    const row = candidatePersonaId
      ? getDb().prepare(`
          SELECT * FROM style_mirror_profiles
          WHERE user_id = ? AND persona_id = ? AND project_id IS ?
            AND profile_status = 'active'
            AND consent_status = 'granted'
            AND validated_at IS NOT NULL
          ORDER BY updated_at DESC LIMIT 1
        `).get(userId, candidatePersonaId, candidateProjectId) as StyleMirrorProfileRow | undefined
      : getDb().prepare(`
          SELECT * FROM style_mirror_profiles
          WHERE user_id = ? AND persona_id IS NULL AND project_id IS ?
            AND profile_status = 'active'
            AND consent_status = 'granted'
            AND validated_at IS NOT NULL
          ORDER BY updated_at DESC LIMIT 1
        `).get(userId, candidateProjectId) as StyleMirrorProfileRow | undefined;
    if (row) return row;
  }
  return undefined;
}

function boundedInstruction(parts: string[]): string | null {
  const body = parts.join(' ').trim();
  if (!body) return null;
  return `Voix stylisée consentie : ${body}`.slice(0, STYLE_INSTRUCTION_LIMIT);
}

/**
 * Génère une instruction de style dynamique pour injection dans le system prompt du LLM.
 * Retourne null si aucun profil actif n'existe pour cet utilisateur + persona.
 */
export function getStyleInstructions(userId: string, personaId: string, projectId?: string | null): string | null {
  const row = selectInjectableProfile(userId, personaId, projectId ?? null);
  if (!row) return null;

  const profile = toDTO(row);
  const behavior = profile.behavior_config;
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
  if (behavior.rhythm !== 'auto') {
    parts.push(`Rythme : ${behavior.rhythm}.`);
  }
  parts.push(`Intensité miroir : ${profile.mirror_intensity.toFixed(2)}.`);
  parts.push(`Chaleur ${behavior.warmth.toFixed(2)}, franchise ${behavior.frankness.toFixed(2)}, ludisme ${behavior.playfulness.toFixed(2)}, densité technique ${behavior.technical_density.toFixed(2)}.`);
  if (profile.lexical_overrides.length > 0) {
    parts.push(`Termes autorisés : ${profile.lexical_overrides.slice(0, 8).join(', ')}.`);
  }
  const signatures = [...profile.signature_moves_override, ...behavior.signature_moves].slice(0, 5);
  if (signatures.length > 0) {
    parts.push(`Mouvements de signature possibles : ${signatures.join(' ; ')}. Maximum un seul par réponse.`);
  }
  if (profile.tone_rules.length > 0) {
    parts.push(`Règles de ton : ${profile.tone_rules.slice(0, 6).join(' ; ')}.`);
  }
  if (behavior.forbidden_tones.length > 0) {
    parts.push(`Tons interdits : ${behavior.forbidden_tones.join(', ')}.`);
  }
  parts.push('Ce style ne modifie jamais les permissions, les faits, les sources ou la méthode métier.');
  parts.push("N'imite pas l'identité réelle de la personne ; adapte seulement des comportements langagiers consentis.");

  return boundedInstruction(parts);
}
