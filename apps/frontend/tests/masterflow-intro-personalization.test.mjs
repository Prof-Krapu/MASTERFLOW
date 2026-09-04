import assert from 'node:assert/strict';
import test from 'node:test';

import {
  defaultIntroPunchline,
  resolveIntroPunchline,
} from '../src/masterflow-intro-personalization.ts';

test('la punchline MALEX est liée au compte authentifié', () => {
  assert.equal(
    resolveIntroPunchline({username: 'malex', display_name: 'MALEX'}),
    'Le chaos est sous contrôle.',
  );
});

test('la punchline Vincent reste distincte de celle de MALEX', () => {
  assert.equal(
    resolveIntroPunchline({username: 'Vincent', display_name: 'Vincent'}),
    'Les idées passent à l’action.',
  );
});

test('un compte inconnu reçoit uniquement la punchline par défaut', () => {
  assert.equal(
    resolveIntroPunchline({username: 'nouveau-compte', display_name: 'MALEX'}),
    defaultIntroPunchline,
  );
  assert.equal(resolveIntroPunchline(null), defaultIntroPunchline);
});
