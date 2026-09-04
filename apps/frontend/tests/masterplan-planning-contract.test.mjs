import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const componentPath = new URL('../src/masterplan-planning.tsx', import.meta.url);
const stylesPath = new URL('../src/masterplan-planning.css', import.meta.url);

test('le planning est une surface MasterFlow, sans libellé de synchronisation externe', async () => {
  const source = await readFile(componentPath, 'utf8');
  assert.doesNotMatch(source, /Source Drive|projection Drive|synchronis[ée]/i);
  assert.match(source, /className="mp-school-rail"/);
  assert.match(source, /className="mp-next-toast"/);
  assert.match(source, /isoWeekInfo\(option\)/);
});

test('les débordements restent contenus dans les deux zones naturellement horizontales', async () => {
  const styles = await readFile(stylesPath, 'utf8');
  assert.match(styles, /\.mp-year-overview\s*\{[^}]*overflow-x:auto/s);
  assert.match(styles, /\.mp-schedule-viewport\s*\{[^}]*overflow:auto/s);
  assert.match(styles, /\.mp-cockpit\s*\{[^}]*overflow:\s*hidden/s);
});

test('les filtres école et personnel utilisent des cibles tactiles explicites', async () => {
  const styles = await readFile(stylesPath, 'utf8');
  assert.match(styles, /\.mp-school-button\s*\{[^}]*height:48px[^}]*width:48px/s);
  assert.match(styles, /\.mp-week-overview button\s*\{[^}]*--week-dot-size/s);
});

test('la modale Planning et le toast respectent le contrat clavier', async () => {
  const source = await readFile(componentPath, 'utf8');
  assert.match(source, /event\.key === 'Escape'/);
  assert.match(source, /event\.key !== 'Tab'/);
  assert.match(source, /eventTriggerRef\.current\?\.isConnected/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /role="region" tabIndex=\{0\}/);
});

test('les notifications Planning suivent la préférence utilisateur', async () => {
  const styles = await readFile(stylesPath, 'utf8');
  assert.match(styles, /data-masterflow-planning-notifications="disabled"/);
});
