import {describe, expect, it} from 'vitest';

import {
  analyzeLanguageMessage,
  DEFAULT_LANGUAGE_OVERLAY_INTENSITY,
  deriveCollectiveStylePreview,
  deriveIndividualStylePreview,
  emptyLanguageAggregate,
  MAX_LANGUAGE_OVERLAY_INTENSITY,
  mergeLanguageAnalysis,
} from '../src/services/language_style_learning.ts';

function aggregate(messages: string[]) {
  return messages.reduce(
    (state, message) => mergeLanguageAnalysis(state, analyzeLanguageMessage(message)),
    emptyLanguageAggregate(),
  );
}

describe('language_style_learning', () => {
  it('rejette code, secrets, URL dominantes et citations longues', () => {
    expect(analyzeLanguageMessage('```ts\nconst secret = 1\n```')).toEqual({eligible: false, reason: 'code_block'});
    expect(analyzeLanguageMessage('api_key = TEST_SECRET_VALUE')).toEqual({eligible: false, reason: 'secret_like'});
    expect(analyzeLanguageMessage('https://a.test https://b.test https://c.test')).toEqual({eligible: false, reason: 'url_dominated'});
    expect(analyzeLanguageMessage('> texte copié\n> encore copié\n> toujours copié')).toEqual({eligible: false, reason: 'quoted_content'});
  });

  it('ne retourne jamais le message brut', () => {
    const source = 'Franchement, du coup on va faire simple et propre, tu vois ?';
    const result = analyzeLanguageMessage(source);
    expect(result.eligible).toBe(true);
    expect(JSON.stringify(result)).not.toContain(source);
    if (result.eligible) {
      expect(result.expression_candidates.every((candidate) => candidate.length <= 40)).toBe(true);
      expect(Object.keys(result)).not.toEqual(expect.arrayContaining(['content', 'message', 'raw']));
    }
  });

  it('ne retient une expression individuelle qu’après trois messages', () => {
    const state = aggregate([
      'En vrai on garde cette idée et on avance.',
      'En vrai on garde le rythme et on avance.',
      'En vrai on garde la structure et on avance.',
    ]);
    const preview = deriveIndividualStylePreview(state);
    expect(preview.recurring_expressions).toContain('en vrai');
    expect(preview.readiness).toBe('learning');
  });

  it('exige trois contributeurs et deux usages distincts pour le collectif', () => {
    const shared = [
      'Du coup on vérifie le projet ensemble.',
      'Du coup on vérifie le rendu ensemble.',
      'Du coup on vérifie la suite ensemble.',
    ];
    const first = aggregate(shared);
    const second = aggregate(shared);
    const third = aggregate([
      'On commence calmement avec une étape claire.',
      'On continue calmement avec une étape claire.',
      'On termine calmement avec une étape claire.',
    ]);
    expect(deriveCollectiveStylePreview([first, second]).readiness).toBe('learning');
    const collective = deriveCollectiveStylePreview([first, second, third]);
    expect(collective.contributor_count).toBe(3);
    expect(collective.transitions).toContain('du coup');
  });

  it('verrouille l’intensité produit', () => {
    expect(DEFAULT_LANGUAGE_OVERLAY_INTENSITY).toBe(0.3);
    expect(MAX_LANGUAGE_OVERLAY_INTENSITY).toBe(0.4);
  });

  it('ne mélange jamais les agrégats de deux locuteurs', () => {
    const alice = aggregate([
      'Franchement alors on garde cette piste claire.',
      'Franchement alors on garde ce rythme clair.',
      'Franchement alors on garde cette structure claire.',
    ]);
    const bob = aggregate([
      'En vrai du coup on avance sans détour.',
      'En vrai du coup on vérifie sans détour.',
      'En vrai du coup on termine sans détour.',
    ]);
    const alicePreview = deriveIndividualStylePreview(alice);
    const bobPreview = deriveIndividualStylePreview(bob);
    expect(alicePreview.transitions).toEqual(expect.arrayContaining(['franchement', 'alors']));
    expect(alicePreview.transitions).not.toEqual(expect.arrayContaining(['en vrai', 'du coup']));
    expect(bobPreview.transitions).toEqual(expect.arrayContaining(['en vrai', 'du coup']));
    expect(bobPreview.transitions).not.toEqual(expect.arrayContaining(['franchement', 'alors']));
  });
});
