import assert from 'node:assert/strict';
import test from 'node:test';

import {expressiveVoiceDisclosureText} from '../src/expressive-voice-disclosure.ts';

test('la transparence expose le profil, la source, l’intensité et la confiance', () => {
  assert.equal(
    expressiveVoiceDisclosureText({
      profile_used: true,
      label: 'Marqueurs de Malex',
      source: 'represented_user',
      intensity: 0.3,
      confidence: 0.84,
    }),
    'Style expressif · Marqueurs de Malex · source : personne représentée · intensité : 30 % · confiance : 84 %',
  );
});

test('la source collective est nommée sans prétendre utiliser une identité collective', () => {
  assert.match(expressiveVoiceDisclosureText({
    profile_used: true,
    label: 'Marqueurs partagés',
    source: 'project_collective',
    intensity: 0.2,
  }), /source : collectif du projet/);
});

test('un profil explicitement non utilisé reste transparent', () => {
  assert.equal(
    expressiveVoiceDisclosureText({profile_used: false, label: 'Inactif'}),
    'Style expressif · aucun profil appliqué',
  );
  assert.equal(expressiveVoiceDisclosureText(undefined), null);
});
