import {beforeAll, describe, expect, it} from 'vitest';

import {proposeResource, searchResources, validateResource} from '../src/engines/resource_truth.ts';
import {seedAll} from '../src/db/seed.ts';

/**
 * Anti-hallucination : le Resource Truth Engine ne sert JAMAIS de ressource non validée.
 *
 * Invariant produit : par défaut, `searchResources()` ne renvoie que `status = 'validated'`.
 * Une proposition (humaine ou IA) entre en `'candidate'` et reste invisible tant qu'elle
 * n'a pas été validée explicitement. Tolérance à l'hallucination : 0.
 */

beforeAll(async () => {
  await seedAll();
});

describe('resource truth — anti-hallucination', () => {
  it('searchResources() par défaut ne rend QUE des ressources validées', () => {
    const results = searchResources();
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.status).toBe('validated');
    }
  });

  it('une proposition entre en candidate et reste invisible par défaut, puis devient servable après validation', () => {
    // ── Proposition (ex. émanant de l'IA) → status 'candidate'.
    const proposed = proposeResource({
      type: 'link',
      title: 'Test IA',
      source: 'ai_proposal',
      subjects: [],
    });
    expect(proposed.status).toBe('candidate');

    // ── Invisible dans la recherche par défaut (anti-hallucination).
    const defaultResults = searchResources();
    expect(defaultResults.some((r) => r.id === proposed.id)).toBe(false);

    // ── Visible uniquement via includeAll (usage admin / inbox de validation).
    const allResults = searchResources(undefined, true);
    expect(allResults.some((r) => r.id === proposed.id)).toBe(true);

    // ── Validation explicite → promotion au canon.
    const validated = validateResource(proposed.id);
    expect(validated.status).toBe('validated');

    // ── Désormais servie par la recherche par défaut.
    const afterValidation = searchResources();
    expect(afterValidation.some((r) => r.id === proposed.id)).toBe(true);
  });
});
