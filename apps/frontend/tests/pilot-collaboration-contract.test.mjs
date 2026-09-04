import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const componentPath = new URL('../src/pilot-conversation-workspace.tsx', import.meta.url);
const stylesPath = new URL('../src/styles.css', import.meta.url);

test('Talents Créatifs distingue le compte individuel de l’espace projet partagé', async () => {
  const source = await readFile(componentPath, 'utf8');

  assert.match(source, /journey\?\.collaboration/);
  assert.match(source, /Compte individuel/);
  assert.match(source, /Espace projet partagé/);
  assert.match(source, /aria-label="Collaboration : compte individuel dans un espace projet partagé"/);
  assert.doesNotMatch(source, /current_membership\.user_id/);
});

test('l’indicateur de collaboration reste compact', async () => {
  const styles = await readFile(stylesPath, 'utf8');

  assert.match(styles, /\.pilot-workspace__collaboration\s*\{[^}]*display:\s*inline-flex/s);
  assert.match(styles, /\.pilot-workspace__collaboration\s*\{[^}]*border-radius:\s*999px/s);
});
