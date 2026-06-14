import {beforeAll, describe, expect, it} from 'vitest';

import {getRegistryEntry, isSensitive, listRegistry, riskLevelFor} from '../src/engines/action_registry.ts';
import type {ActionRegistryEntry} from '@masterflow/shared';

/**
 * Tests du registre d'actions — liste, recherche, risque et sensibilité.
 *
 * Le registre est chargé depuis le seed {@link action_registry_seed.v1.json}
 * et validé via {@link ActionRegistryEntrySchema} (Zod). Ces tests vérifient
 * le contrat de lecture exposé aux engines et aux routers.
 */

beforeAll(async () => {
  const {seedAll} = await import('../src/db/seed.ts');
  await seedAll();
});

describe('listRegistry', () => {
  it("retourne un tableau non vide d'entrées valides", () => {
    const entries = listRegistry();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    entries.forEach((e) => {
      expect(typeof e.action_id).toBe('string');
      expect(e.action_id.length).toBeGreaterThan(0);
    });
  });
});

describe('getRegistryEntry', () => {
  it("retourne l'entrée pour un action_id connu", () => {
    const entry = getRegistryEntry('get_current_context');
    expect(entry).not.toBeNull();
    expect(entry!.action_id).toBe('get_current_context');
  });

  it("retourne null pour un action_id inconnu", () => {
    expect(getRegistryEntry('action_inexistante_xyz')).toBeNull();
  });
});

describe('riskLevelFor', () => {
  it("retourne le bon risk_level pour une action connue", () => {
    expect(riskLevelFor('get_current_context')).toBe('low');
  });

  it("retourne 'variable' pour une action inconnue", () => {
    expect(riskLevelFor('action_inexistante_xyz')).toBe('variable');
  });
});

describe('isSensitive', () => {
  const makeEntry = (overrides: Partial<ActionRegistryEntry> = {}): ActionRegistryEntry => ({
    action_id: 'test_action',
    label: 'Test',
    endpoint: 'GET /test',
    risk_level: 'low',
    preflight_required: false,
    validation_required: false,
    minimum_role: 'student',
    ui_surface: 'none',
    status: 'live',
    ...overrides,
  });

  it("retourne true si validation_required === true", () => {
    expect(isSensitive(makeEntry({validation_required: true}))).toBe(true);
  });

  it("retourne false si validation_required === 'depends_on_preflight' (décision au préflight)", () => {
    expect(isSensitive(makeEntry({validation_required: 'depends_on_preflight'}))).toBe(false);
  });

  it("retourne true si risk_level === 'high'", () => {
    expect(isSensitive(makeEntry({risk_level: 'high'}))).toBe(true);
  });

  it("retourne true si risk_level === 'medium_high'", () => {
    expect(isSensitive(makeEntry({risk_level: 'medium_high'}))).toBe(true);
  });

  it("retourne false pour une action à risque bas sans validation", () => {
    expect(isSensitive(makeEntry({risk_level: 'low', validation_required: false}))).toBe(false);
  });
});
