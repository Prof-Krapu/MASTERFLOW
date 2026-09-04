import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/masterflow-intro.css', import.meta.url), 'utf8');

test('l’application est montée dans la scène coordonnée avec le splash', () => {
  assert.match(main, /className="masterflow-stage"/);
  assert.match(styles, /@keyframes masterflow-stage-arrive/);
});

test('le splash possède une sortie distincte avant la révélation de l’application', () => {
  assert.match(styles, /@keyframes masterflow-lockup-leave/);
  assert.match(styles, /clip-path: inset\(49\.8% 0 49\.8% 0 round 999px\)/);
});

test('la préférence de mouvement réduit neutralise les deux transitions', () => {
  const reducedMotion = styles.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]+)\}\s*$/)?.[1] ?? '';
  assert.match(reducedMotion, /\.masterflow-stage/);
  assert.match(reducedMotion, /\.masterflow-intro__lockup/);
  assert.match(reducedMotion, /animation: none/);
});
