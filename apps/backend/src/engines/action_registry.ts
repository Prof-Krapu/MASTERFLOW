import {ActionRegistryEntrySchema} from '@masterflow/shared';
import type {ActionRegistryEntry, RiskLevel} from '@masterflow/shared';
import registry from '../seeds/action_registry_seed.v1.json';

/**
 * Registre d'actions — source statique des métadonnées d'action.
 *
 * Charge `action_registry_seed.v1.json` une seule fois (mémoïsé), normalise chaque
 * entrée via `ActionRegistryEntrySchema`, puis expose des lectures simples. Le registre
 * est *déclaratif* : il dit ce qu'une action EST (risque, préflight, validation, surface UI),
 * jamais ce qu'un utilisateur PEUT faire (cela relève de `permission_runtime`).
 *
 * Invariant : `risk_level` et `validation_required` viennent d'ici (statiques), pas du LLM.
 */

/** Niveaux de risque valides du contrat partagé — sert à mapper la chaîne du seed. */
const RISK_LEVELS: readonly RiskLevel[] = ['low', 'medium', 'medium_high', 'high', 'variable'];

/** Cache du parse — le seed est immuable au runtime. */
let cache: ActionRegistryEntry[] | null = null;
let index: Map<string, ActionRegistryEntry> | null = null;

/**
 * Charge et valide le registre depuis le seed. Mémoïsé : le parse Zod n'a lieu
 * qu'au premier appel. Lève si le seed est malformé (échec au boot = voulu).
 */
export function listRegistry(): ActionRegistryEntry[] {
  if (cache) return cache;
  const raw = (registry as {actions: unknown[]}).actions;
  cache = raw.map((entry) => ActionRegistryEntrySchema.parse(entry));
  index = new Map(cache.map((e) => [e.action_id, e]));
  return cache;
}

/** Retourne l'entrée correspondant à `actionId`, ou `null` si inconnue. */
export function getRegistryEntry(actionId: string): ActionRegistryEntry | null {
  listRegistry();
  return index?.get(actionId) ?? null;
}

/**
 * Niveau de risque statique d'une action, mappé depuis la chaîne du seed.
 * `'variable'` par défaut si l'action est inconnue ou la valeur hors contrat
 * (prudence : un risque non reconnu n'est jamais traité comme `'low'`).
 */
export function riskLevelFor(actionId: string): RiskLevel {
  const entry = getRegistryEntry(actionId);
  if (!entry) return 'variable';
  return RISK_LEVELS.includes(entry.risk_level as RiskLevel)
    ? (entry.risk_level as RiskLevel)
    : 'variable';
}

/**
 * Une action est sensible si elle exige une validation humaine OU si son risque
 * est élevé (`high` / `medium_high`). `validation_required` peut valoir
 * `'depends_on_preflight'` : dans ce cas, la décision finale revient au préflight,
 * donc on ne la considère pas sensible *par le seul registre*.
 */
export function isSensitive(entry: ActionRegistryEntry): boolean {
  if (entry.validation_required === true) return true;
  return entry.risk_level === 'high' || entry.risk_level === 'medium_high';
}
