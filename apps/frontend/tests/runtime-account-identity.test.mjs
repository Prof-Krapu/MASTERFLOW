import assert from 'node:assert/strict';
import test from 'node:test';

import {resolveAuthenticatedProfileId} from '../src/runtime-account-identity.ts';

test('l’habillage ProfKrapu reste réservé au compte godmode Vincent', () => {
  assert.equal(
    resolveAuthenticatedProfileId({display_name: 'Vincent', role: 'godmode'}),
    'profkrapu',
  );
});

test('un utilisateur ordinaire ne peut pas prendre l’habillage ProfKrapu par son nom', () => {
  assert.equal(
    resolveAuthenticatedProfileId({display_name: 'Vincent', role: 'student'}),
    'masterflex',
  );
});

test('l’habillage MALEX ne dépend d’aucune persona de Room', () => {
  assert.equal(
    resolveAuthenticatedProfileId({display_name: 'MALEX', role: 'godmode'}),
    'masterflex',
  );
});
