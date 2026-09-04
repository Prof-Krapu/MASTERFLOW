import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const styles = fs.readFileSync(new URL('../src/current-ui-demo.css', import.meta.url), 'utf8');
const homeSurface = fs.readFileSync(new URL('../src/ui-reset/prototype-product-surfaces.tsx', import.meta.url), 'utf8');
const homeStyles = styles.slice(
  styles.indexOf('.proto-entry-greeting {'),
  styles.indexOf('.proto-canvas-empty > .pilot-workspace'),
);

test('la homepage suit la palette active et non la nuance personnelle', () => {
  assert.match(homeStyles, /\.proto-home-wordmark[\s\S]*background: var\(--proto-accent\)/);
  assert.doesNotMatch(homeStyles, /--proto-user-color|--persona-color/);
  assert.doesNotMatch(homeStyles, /#e84f8a|#ff72a6|#9f285c/i);
});

test('les accès et pilotes restent fonctionnels sans blocs décoratifs', () => {
  assert.match(homeSurface, /onClick=\{\(\) => onSelectPilot\?\.\(pilot\.id\)\}/);
  assert.match(homeSurface, /onClick=\{\(\) => mode\.resume && onResume \? onResume\(\) : onSelectMode\(mode\.id\)\}/);
  assert.match(homeStyles, /--pilot-entry-accent: var\(--proto-support, var\(--mf-support\)\)/);
  assert.match(homeStyles, /\.proto-home-pilot--coral[\s\S]*--pilot-entry-accent: var\(--proto-accent\)/);
});
