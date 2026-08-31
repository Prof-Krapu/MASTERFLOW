import {afterEach, describe, expect, it} from 'vitest';

import {resolveSeedProfile} from '../src/db/seed.ts';

const previousProfile = process.env.MASTERFLOW_SEED_PROFILE;

afterEach(() => {
  if (previousProfile === undefined) delete process.env.MASTERFLOW_SEED_PROFILE;
  else process.env.MASTERFLOW_SEED_PROFILE = previousProfile;
});

describe('profils de seed MasterFlow', () => {
  it.each(['development', 'preview', 'production'] as const)(
    'accepte le profil %s',
    (profile) => {
      process.env.MASTERFLOW_SEED_PROFILE = profile;
      expect(resolveSeedProfile()).toBe(profile);
    },
  );

  it('refuse un profil inconnu', () => {
    process.env.MASTERFLOW_SEED_PROFILE = 'legacy';
    expect(() => resolveSeedProfile()).toThrow('MASTERFLOW_SEED_PROFILE invalide');
  });
});
