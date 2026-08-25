import test from 'node:test';
import assert from 'node:assert/strict';

import {computeCostEUR, type ModelPricing} from '../server/pricing-core.ts';

const PRICING: ModelPricing[] = [
  {model: 'gpt-4o', inputPer1M: 2.0, outputPer1M: 8.0},
  {model: 'gpt-4o-mini', inputPer1M: 0.15, outputPer1M: 0.6},
  {model: 'mistral-small', inputPer1M: 0.09, outputPer1M: 0.26},
  {model: 'mistral-ocr', inputPer1M: 0, outputPer1M: 0, perPage: 0.00172},
  {model: 'default', inputPer1M: 1.0, outputPer1M: 3.0},
];

test('sous-chaîne la plus longue : gpt-4o-mini ne facture pas au tarif gpt-4o', () => {
  const mini = computeCostEUR('gpt-4o-mini-2024', 1_000_000, 0, 0, PRICING);
  assert.equal(mini, 0.15);
  const gros = computeCostEUR('gpt-4o', 1_000_000, 0, 0, PRICING);
  assert.equal(gros, 2.0);
});

test('modèles préfixés éditeur (Albert) : mistralai/Mistral-Small-3.2… → mistral-small', () => {
  const cost = computeCostEUR('mistralai/Mistral-Small-3.2-24B-Instruct-2506', 2_000_000, 1_000_000, 0, PRICING);
  assert.equal(cost, 2 * 0.09 + 1 * 0.26);
});

test('OCR facturé à la page, tokens à zéro', () => {
  const cost = computeCostEUR('mistral-ocr-2512', 0, 0, 10, PRICING);
  assert.ok(cost !== null && Math.abs(cost - 0.0172) < 1e-9);
});

test('modèle inconnu → entrée default ; table vide → null (repli valeur cliente)', () => {
  assert.equal(computeCostEUR('modele-mystere', 1_000_000, 0, 0, PRICING), 1.0);
  assert.equal(computeCostEUR('gpt-4o', 1_000_000, 0, 0, []), null);
});

test('table sans default ni correspondance → null', () => {
  const sansDefault: ModelPricing[] = [{model: 'gpt-4o', inputPer1M: 2, outputPer1M: 8}];
  assert.equal(computeCostEUR('claude-sonnet', 1000, 1000, 0, sansDefault), null);
});
