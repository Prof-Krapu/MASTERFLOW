import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/ui-reset/prototype-shell-components.tsx', import.meta.url),
  'utf8',
);

test('les overlays ferment avec Escape et piègent Tab', () => {
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /event\.shiftKey/);
});

test('les overlays posent puis restituent le focus', () => {
  assert.match(source, /previouslyFocused/);
  assert.match(source, /querySelector<HTMLElement>\('\[role="dialog"\]'/);
  assert.match(source, /previouslyFocused\?\.isConnected/);
});
