import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const currentUi = readFileSync(new URL('../src/current-ui-demo.tsx', import.meta.url), 'utf8');
const overview = readFileSync(new URL('../src/ui-reset/runtime-persona-overview.tsx', import.meta.url), 'utf8');
const runtimeGalaxy = readFileSync(new URL('../src/ui-reset/runtime-persona-galaxy.ts', import.meta.url), 'utf8');
const registry = readFileSync(new URL('../src/ui-reset/prototype-profile-registry.ts', import.meta.url), 'utf8');
const skilltree = readFileSync(new URL('../src/ui-reset/prototype-skilltree-surface.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/current-ui-demo.css', import.meta.url), 'utf8');

test('le profil runtime sépare accueil personnel et galaxie du persona', () => {
  assert.match(currentUi, /personaView === 'overview'/);
  assert.match(currentUi, /<RuntimePersonaOverview/);
  assert.match(currentUi, /<PrototypeSkilltreeSurface/);
  assert.match(overview, /Ta progression, sans tableau de bord/);
  assert.match(overview, /Explorer la galaxie/);
});

test('les faits professionnels réels sont rendus en jauges compactes sans faux pourcentage de maîtrise', () => {
  assert.match(overview, /profile\.professional_skills/);
  assert.match(overview, /Skills cartographiés/);
  assert.match(overview, /Skills sourcés/);
  assert.match(overview, /profile\.declared_resources\.videos/);
  assert.match(overview, /proto-persona-meter__ring/);
  assert.match(styles, /conic-gradient\(/);
  assert.doesNotMatch(overview, /profile\.progression\.average_mastery/);
  assert.doesNotMatch(overview, /Maîtrise observée/);
  assert.doesNotMatch(overview, /proto-runtime-profile__facts/);
});

test('les compteurs sous MasterFlex distinguent ressources déclarées et Inventory réel', () => {
  assert.match(currentUi, /label: 'Ressources', count: runtimeUserProfile\.declared_resources\.total/);
  assert.match(currentUi, /label: 'Vidéos', count: runtimeUserProfile\.declared_resources\.videos/);
  assert.match(currentUi, /label: 'Skills', count: runtimeUserProfile\.professional_skills\.length/);
  assert.match(currentUi, /label: 'Projets', count: runtimeUserProfile\.projects_count/);
  assert.match(currentUi, /label: 'Ressources', count: '—'/);
  assert.doesNotMatch(currentUi, /label: 'Ressources', count: runtimeUserProfile\.inventory\.total/);
});

test('les pictos et compteurs restent câblés dans tous les slides Persona', () => {
  assert.match(styles, /\.proto-character-inventory__items button svg[\s\S]*background:/);
  assert.match(styles, /\.proto-character-page\.is-galaxy \.proto-character-page__profile[\s\S]*animation: none/);
  assert.match(overview, /profile\.declared_resources\.videos/);
  assert.match(overview, /attached_to_inventory/);
});

test('la galaxie conserve la maîtrise par distance et ajoute un filtre de familles', () => {
  assert.match(skilltree, /distanceFactor = \(100 - skill\.mastery\) \/ 100/);
  assert.match(skilltree, /skillFamilyFilter/);
  assert.match(skilltree, /aria-label="Filtrer les compétences par famille"/);
  assert.match(skilltree, /is-filtered-out/);
  assert.match(styles, /\.proto-skill-family-filter/);
});

test('la galaxie expose la maîtrise et une navigation clavier sans dépendre de la couleur ou de la distance', () => {
  assert.match(runtimeGalaxy, /masteryLabel: `\$\{skill\.mastery_score\}% de maîtrise`/);
  assert.match(skilltree, /aria-label={`\$\{skill\.label\}, \$\{skill\.masteryLabel/);
  assert.match(skilltree, /\{skill\.label\} — \{skill\.masteryLabel/);
  assert.match(skilltree, /Utilisez les flèches pour parcourir les compétences/);
  assert.match(skilltree, /handleFilterKeyDown/);
  assert.match(skilltree, /handleSkillNodeKeyDown/);
  assert.match(skilltree, /ArrowRight/);
  assert.match(skilltree, /ArrowLeft/);
  assert.match(skilltree, /Home/);
  assert.match(skilltree, /End/);
  assert.match(skilltree, /focus\(\{preventScroll: true\}\)/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.proto-skill-node-orbit,[\s\S]*animation: none/);
});

test('le thème utilisateur persiste et le persona ne recolore plus la homepage', () => {
  assert.match(registry, /masterflow\.theme-user-color/);
  assert.match(currentUi, /readStoredThemeUserColor/);
  assert.match(currentUi, /themeUserColorStorageKey/);
  assert.doesNotMatch(currentUi, /resolveRuntimePersonaColor/);
});

test('la galaxie connectée remplace les fixtures par les compétences professionnelles runtime', () => {
  assert.match(currentUi, /buildRuntimePersonaGalaxy\(runtimeUserProfile/);
  assert.match(currentUi, /runtimePersonaGalaxy\?\.skillArcs/);
  assert.match(runtimeGalaxy, /profile\.professional_skills/);
  assert.match(runtimeGalaxy, /mastery_score/);
  assert.match(runtimeGalaxy, /creation.*direction.*pedagogy.*structure/s);
  assert.match(overview, /professional\?\.headline/);
  assert.match(overview, /profile_status === 'user_validated'/);
});
