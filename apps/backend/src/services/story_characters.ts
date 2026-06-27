import type {CreateStoryCharacterRequest, StoryCharacter, UpdateStoryCharacterRequest} from '@masterflow/shared';
import {StoryCharacterSchema} from '@masterflow/shared';

import {getDb, type StoryCharacterRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface WorkbenchScopeRow {
  id: string;
  owner_id: string;
  project_id: string | null;
  canon_locked: number;
}

function toDTO(row: StoryCharacterRow): StoryCharacter {
  return {
    id: row.id,
    workbench_id: row.workbench_id,
    owner_id: row.owner_id,
    name: row.name,
    aliases: JSON.parse(row.aliases_json) as string[],
    role: row.role,
    archetype: row.archetype as StoryCharacter['archetype'],
    status: row.status as StoryCharacter['status'],
    design_notes: row.design_notes,
    behavior_notes: row.behavior_notes,
    metadata: JSON.parse(row.metadata_json) as Record<string, unknown>,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function canAccessWorkbench(actor: AuthUser, row: {owner_id: string; project_id: string | null}): boolean {
  return decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'editor',
  }).allowed;
}

function requireWorkbench(actor: AuthUser, workbenchId: string): WorkbenchScopeRow {
  const row = getDb().prepare('SELECT id, owner_id, project_id, canon_locked FROM story_workbenches WHERE id = ?').get(workbenchId) as WorkbenchScopeRow | undefined;
  if (!row || !canAccessWorkbench(actor, row)) throw new Error('workbench_not_found');
  return row;
}

function assertCharacterAccess(actor: AuthUser, row: StoryCharacterRow): void {
  requireWorkbench(actor, row.workbench_id);
}

export function createCharacter(actor: AuthUser, input: CreateStoryCharacterRequest): StoryCharacter {
  const wb = requireWorkbench(actor, input.workbench_id);
  if (wb.canon_locked) throw new Error('canon_locked');
  const id = uuid();
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO story_characters (id, workbench_id, owner_id, name, aliases_json, role, archetype, status, design_notes, behavior_notes, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, input.workbench_id, actor.id, input.name,
    JSON.stringify(input.aliases ?? []), input.role, input.archetype,
    input.status ?? 'active', input.design_notes ?? null, input.behavior_notes ?? null,
    JSON.stringify(input.metadata ?? {}), now, now,
  );
  audit({event_type: 'story.character_created', user_id: actor.id, detail: {character_id: id, workbench_id: input.workbench_id}});
  return toDTO(getDb().prepare('SELECT * FROM story_characters WHERE id = ?').get(id) as StoryCharacterRow);
}

export function getCharacter(actor: AuthUser, characterId: string): StoryCharacter {
  const row = getDb().prepare('SELECT * FROM story_characters WHERE id = ?').get(characterId) as StoryCharacterRow | undefined;
  if (!row) throw new Error('character_not_found');
  assertCharacterAccess(actor, row);
  return toDTO(row);
}

export function listAllCharacters(actor: AuthUser): StoryCharacter[] {
  return (getDb().prepare(
    `SELECT sc.* FROM story_characters sc
     JOIN story_workbenches sw ON sw.id = sc.workbench_id
     WHERE sw.owner_id = ?
     ORDER BY sc.name ASC`,
  ).all(actor.id) as StoryCharacterRow[]).map(toDTO);
}

export function listCharacters(actor: AuthUser, workbenchId: string): StoryCharacter[] {
  requireWorkbench(actor, workbenchId);
  return (getDb().prepare(
    'SELECT * FROM story_characters WHERE workbench_id = ? ORDER BY name ASC',
  ).all(workbenchId) as StoryCharacterRow[]).map(toDTO);
}

export function updateCharacter(actor: AuthUser, characterId: string, input: UpdateStoryCharacterRequest): StoryCharacter {
  const row = getDb().prepare('SELECT * FROM story_characters WHERE id = ?').get(characterId) as StoryCharacterRow | undefined;
  if (!row) throw new Error('character_not_found');
  assertCharacterAccess(actor, row);
  const wb = requireWorkbench(actor, row.workbench_id);
  if (wb?.canon_locked) throw new Error('canon_locked');
  const now = Date.now();
  if (input.name !== undefined) getDb().prepare('UPDATE story_characters SET name = ?, updated_at = ? WHERE id = ?').run(input.name, now, characterId);
  if (input.aliases !== undefined) getDb().prepare('UPDATE story_characters SET aliases_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(input.aliases), now, characterId);
  if (input.role !== undefined) getDb().prepare('UPDATE story_characters SET role = ?, updated_at = ? WHERE id = ?').run(input.role, now, characterId);
  if (input.archetype !== undefined) getDb().prepare('UPDATE story_characters SET archetype = ?, updated_at = ? WHERE id = ?').run(input.archetype, now, characterId);
  if (input.status !== undefined) getDb().prepare('UPDATE story_characters SET status = ?, updated_at = ? WHERE id = ?').run(input.status, now, characterId);
  if (input.design_notes !== undefined) getDb().prepare('UPDATE story_characters SET design_notes = ?, updated_at = ? WHERE id = ?').run(input.design_notes, now, characterId);
  if (input.behavior_notes !== undefined) getDb().prepare('UPDATE story_characters SET behavior_notes = ?, updated_at = ? WHERE id = ?').run(input.behavior_notes, now, characterId);
  if (input.metadata !== undefined) getDb().prepare('UPDATE story_characters SET metadata_json = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(input.metadata), now, characterId);
  audit({event_type: 'story.character_updated', user_id: actor.id, detail: {character_id: characterId}});
  return toDTO(getDb().prepare('SELECT * FROM story_characters WHERE id = ?').get(characterId) as StoryCharacterRow);
}

export function deleteCharacter(actor: AuthUser, characterId: string): void {
  const row = getDb().prepare('SELECT * FROM story_characters WHERE id = ?').get(characterId) as StoryCharacterRow | undefined;
  if (!row) throw new Error('character_not_found');
  assertCharacterAccess(actor, row);
  const wb = requireWorkbench(actor, row.workbench_id);
  if (wb?.canon_locked) throw new Error('canon_locked');
  getDb().prepare('DELETE FROM story_characters WHERE id = ?').run(characterId);
  audit({event_type: 'story.character_deleted', user_id: actor.id, detail: {character_id: characterId}});
}
