import {describe, expect, it} from 'vitest';

import {costFor} from '../src/services/llm_pricing.ts';

describe('tarification LLM déclarative', () => {
  it('calcule séparément les tokens d entrée et de sortie', () => {
    expect(costFor('gpt-4o-mini', 1_000, 1_000)).toBe(0.00071);
  });

  it('accepte un suffixe de version en conservant le modèle le plus spécifique', () => {
    expect(costFor('gpt-4o-mini-2026-01-01', 1_000, 1_000)).toBe(0.00071);
  });

  it('ne fabrique pas de coût pour un modèle inconnu', () => {
    expect(costFor('modele-inconnu', 10_000, 10_000)).toBe(0);
  });

  it('neutralise les compteurs invalides au lieu de produire un coût négatif', () => {
    expect(costFor('gpt-4o', -1, Number.NaN)).toBe(0);
  });
});
