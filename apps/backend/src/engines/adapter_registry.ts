import {
  AdapterRegistryEntrySchema,
  ROLE_RANK,
  type AdapterRegistryEntry,
  type Role,
} from '@masterflow/shared';

import registry from '../seeds/adapter_registry_seed.v1.json';

let cache: AdapterRegistryEntry[] | null = null;
let index: Map<string, AdapterRegistryEntry> | null = null;

/** Charge et valide le registre déclaratif. Une erreur de seed doit casser le boot/test. */
export function listAdapterRegistry(): AdapterRegistryEntry[] {
  if (cache) return cache;
  const raw = (registry as {adapters: unknown[]}).adapters;
  cache = raw.map((entry) => AdapterRegistryEntrySchema.parse(entry));
  index = new Map(cache.map((entry) => [entry.adapter_id, entry]));
  return cache;
}

/** Lecture filtrée : un adapter absent du loadout de rôle n'existe pas pour l'utilisateur. */
export function listAdaptersForRole(role: Role): AdapterRegistryEntry[] {
  return listAdapterRegistry().filter(
    (entry) => ROLE_RANK[role] >= ROLE_RANK[entry.minimum_role],
  );
}

export function getAdapterForRole(
  adapterId: string,
  role: Role,
): AdapterRegistryEntry | null {
  listAdapterRegistry();
  const entry = index?.get(adapterId) ?? null;
  if (!entry || ROLE_RANK[role] < ROLE_RANK[entry.minimum_role]) return null;
  return entry;
}

/**
 * Gate défensif pour les futurs runners. PR-CB1 ne peut exécuter aucun adapter :
 * il faut un statut live, un executor réel et une surface explicitement actionable.
 */
export function requireExecutableAdapter(adapterId: string, role: Role): AdapterRegistryEntry {
  const entry = getAdapterForRole(adapterId, role);
  if (!entry) throw new Error('Adapter inconnu ou non autorisé.');
  if (entry.runtime_status !== 'live' || !entry.executor_ref || entry.ui_status !== 'actionable') {
    throw new Error(`Adapter ${adapterId} non exécutable (${entry.runtime_status}).`);
  }
  return entry;
}
