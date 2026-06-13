import {
  ROLE_RANK,
  UserRuntimeLoadoutSchema,
  type ActionRegistryEntry,
  type Role,
  type UserRuntimeLoadout,
} from '@masterflow/shared';

import {getDb, type PersonaRow, type RoomInstanceRow, type RoomRow} from '../db/schema.ts';
import {listRegistry} from '../engines/action_registry.ts';
import {getActiveBlend} from '../engines/persona_engine.ts';
import type {AuthUser} from '../middleware/auth.ts';

function parseContext(room: RoomRow): Record<string, unknown> {
  try {
    const value = JSON.parse(room.context_json ?? '{}') as unknown;
    return value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

function roleAllows(actorRole: Role, entry: ActionRegistryEntry): boolean {
  return ROLE_RANK[actorRole] >= ROLE_RANK[entry.minimum_role];
}

function uiMode(mode: string): string {
  const aliases: Record<string, string> = {
    course: 'teaching',
    workspace: 'project',
    narrative: 'story',
  };
  return aliases[mode] ?? mode;
}

function resolvePersonaIds(instance: RoomInstanceRow, context: Record<string, unknown>): string[] {
  const configured = stringList(context['allowed_persona_ids']);
  const activePersona = typeof context['active_persona'] === 'string' ? context['active_persona'] : null;
  const blend = getActiveBlend(instance.id);
  const requested = [
    ...configured,
    activePersona,
    blend?.primary_persona.id ?? null,
    blend?.secondary_persona?.id ?? null,
  ].filter((id): id is string => id !== null);

  const activeIds = new Set(
    (getDb()
      .prepare("SELECT id FROM personas WHERE status = 'active'")
      .all() as Array<Pick<PersonaRow, 'id'>>).map((row) => row.id),
  );
  const resolved = [...new Set(requested)].filter((id) => activeIds.has(id));
  if (resolved.length > 0) return resolved.slice(0, 3);

  const fallback = getDb()
    .prepare(
      `SELECT id FROM personas
        WHERE status = 'active'
        ORDER BY CASE WHEN id = 'masterflow-system-001' THEN 0 ELSE 1 END, id
        LIMIT 1`,
    )
    .get() as Pick<PersonaRow, 'id'> | undefined;
  return fallback ? [fallback.id] : [];
}

export function deriveUserRuntimeLoadout(
  actor: AuthUser,
  room: RoomRow,
  instance: RoomInstanceRow,
): UserRuntimeLoadout {
  const context = parseContext(room);
  const configuredActionIds = stringList(context['allowed_action_ids']);
  const configured = configuredActionIds.length > 0 ? new Set(configuredActionIds) : null;
  const registry = listRegistry();

  const available = registry.filter(
    (entry) =>
      entry.status === 'live' &&
      roleAllows(actor.role, entry) &&
      (configured === null || configured.has(entry.action_id)),
  );
  const availableIds = available.map((entry) => entry.action_id);
  const availableSet = new Set(availableIds);
  const requestedDefaults = stringList(context['default_action_ids']);
  const defaults = (requestedDefaults.length > 0 ? requestedDefaults : availableIds).filter((id) =>
    availableSet.has(id),
  );

  const canInspectLocked = ROLE_RANK[actor.role] >= ROLE_RANK.admin;
  const locked = canInspectLocked
    ? registry
        .filter(
          (entry) =>
            entry.status === 'future' &&
            roleAllows(actor.role, entry) &&
            (configured === null || configured.has(entry.action_id)),
        )
        .map((entry) => ({
          capability_id: entry.action_id,
          reason: 'capability_not_live',
        }))
    : [];
  const disabledReasonMap = Object.fromEntries(
    locked.map((item) => [item.capability_id, item.reason]),
  );

  const explicitModes = stringList(context['active_mode_cycle']).map(uiMode);
  const shortcuts = stringList(context['available_shortcuts']);
  const quickPalette = stringList(context['quick_palette_action_ids']).filter((id) =>
    availableSet.has(id),
  );
  const launcher = stringList(context['create_launcher_action_ids']).filter((id) =>
    availableSet.has(id),
  );
  const apps = [...new Set(available.map((entry) => entry.ui_surface))];

  return UserRuntimeLoadoutSchema.parse({
    user_id: actor.id,
    room_id: room.id,
    project_id: room.project_id,
    available_apps: apps,
    available_persona_ids: resolvePersonaIds(instance, context),
    available_action_ids: availableIds,
    locked_capabilities: locked,
    default_action_ids: defaults.slice(0, 5),
    quick_palette_action_ids: (quickPalette.length > 0 ? quickPalette : defaults).slice(0, 5),
    create_launcher_action_ids: launcher.slice(0, 8),
    available_shortcuts: shortcuts.slice(0, 12),
    active_mode_cycle: (explicitModes.length > 0 ? explicitModes : [uiMode(room.type)]).slice(0, 6),
    command_center_scope: room.project_id ? 'project' : 'room',
    suggested_first_action_ids: defaults.slice(0, 3),
    simplified_support_action_ids: defaults.slice(0, 3),
    disabled_reason_map: disabledReasonMap,
  });
}
