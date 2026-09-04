import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  getStyleLearningSnapshot,
  observeAuthenticatedLanguage,
  proposePersonaRepresentation,
  resetStyleLearning,
  updatePersonaRepresentationStatus,
  updateStyleLearningPreferences,
} from '../src/services/style_learning_engine.ts';
import {resolvePersonaStyleOverlay} from '../src/services/style_mirror_engine.ts';

const godmode: AuthUser = {id: 'style-learn-god', username: 'style_learn_god', role: 'godmode'};
const alice: AuthUser = {id: 'style-learn-alice', username: 'style_learn_alice', role: 'student'};
const bob: AuthUser = {id: 'style-learn-bob', username: 'style_learn_bob', role: 'student'};
const charlie: AuthUser = {id: 'style-learn-charlie', username: 'style_learn_charlie', role: 'student'};
const projectId = 'style-learn-project';
const otherProjectId = 'style-learn-other-project';
const humanPersonaId = 'style-learn-human-persona';
const groupPersonaId = 'style-learn-group-persona';

function observeMany(actor: AuthUser, prefix: string, count = 20, project = projectId): void {
  for (let index = 0; index < count; index += 1) {
    observeAuthenticatedLanguage(
      actor,
      `${prefix} on garde une étape claire et utile numéro ${index}.`,
      project,
    );
  }
}

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insertUser = getDb().prepare(`
    INSERT OR IGNORE INTO users
      (id, username, display_name, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, 'x', ?, 1, ?, ?)
  `);
  for (const actor of [godmode, alice, bob, charlie]) {
    insertUser.run(actor.id, actor.username, actor.username.replaceAll('_', ' '), actor.role, now, now);
  }
  getDb().prepare(`
    INSERT OR IGNORE INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
    VALUES (?, ?, 'Projet style collectif', 'active', 'private', ?, ?)
  `).run(projectId, godmode.id, now, now);
  getDb().prepare(`
    INSERT OR IGNORE INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
    VALUES (?, ?, 'Autre projet', 'active', 'private', ?, ?)
  `).run(otherProjectId, godmode.id, now, now);
  const member = getDb().prepare(`
    INSERT OR IGNORE INTO project_members (project_id, user_id, role, created_at)
    VALUES (?, ?, 'participant', ?)
  `);
  for (const actor of [alice, bob, charlie]) member.run(projectId, actor.id, now);
  const persona = getDb().prepare(`
    INSERT OR IGNORE INTO personas
      (id, name, owner_type, domain, status, voice_config_json, method_config_json, visual_config_json, permissions_json, created_at)
    VALUES (?, ?, 'persona', 'test', 'active', '{}', '{}', '{}', '{}', ?)
  `);
  persona.run(humanPersonaId, 'Persona humain style test', now);
  persona.run(groupPersonaId, 'Persona groupe style test', now);
});

beforeEach(() => {
  getDb().prepare('DELETE FROM persona_representation_links WHERE persona_id IN (?, ?)')
    .run(humanPersonaId, groupPersonaId);
  getDb().prepare('DELETE FROM style_learning_aggregates WHERE subject_user_id IN (?, ?, ?)')
    .run(alice.id, bob.id, charlie.id);
  getDb().prepare('DELETE FROM style_learning_preferences WHERE user_id IN (?, ?, ?)')
    .run(alice.id, bob.id, charlie.id);
});

describe('style_learning_engine', () => {
  it('active l’apprentissage par défaut sans conserver le message brut', () => {
    const message = 'En vrai on garde cette formulation confidentielle uniquement comme signal.';
    expect(observeAuthenticatedLanguage(alice, message, projectId)).toEqual({observed: true, raw_message_stored: false});
    const row = getDb().prepare(`
      SELECT metrics_json, expressions_json, transitions_json, source_hashes_json
      FROM style_learning_aggregates
      WHERE aggregate_scope = 'user' AND subject_user_id = ?
    `).get(alice.id) as Record<string, string>;
    expect(JSON.stringify(row)).not.toContain(message);
    const columns = getDb().prepare('PRAGMA table_info(style_learning_aggregates)')
      .all() as Array<{name: string}>;
    expect(columns.map((column) => column.name)).not.toEqual(expect.arrayContaining([
      'content', 'message', 'raw_message', 'conversation', 'transcript',
    ]));
    expect(JSON.parse(row.source_hashes_json ?? '[]')).toEqual([
      expect.stringMatching(/^[a-f0-9]{64}$/),
    ]);
    expect(getStyleLearningSnapshot(alice).preferences.learning_enabled).toBe(true);
  });

  it('compose le canon du persona avec les marqueurs de la personne représentée, jamais ceux de A', () => {
    observeMany(bob, 'En vrai du coup');
    observeMany(alice, 'Franchement alors');
    const proposed = proposePersonaRepresentation(godmode, humanPersonaId, bob.id);
    expect(proposed.status).toBe('pending');
    updatePersonaRepresentationStatus(bob, proposed.id, 'active');

    const overlay = resolvePersonaStyleOverlay(humanPersonaId, null);
    expect(overlay?.metadata.source).toBe('represented_user');
    expect(overlay?.metadata.label).toContain('style learn bob');
    expect(overlay?.instructions).toContain('en vrai');
    expect(overlay?.instructions).not.toContain('franchement');
    expect(overlay?.instructions).toContain('parle toujours en son propre nom');

    expect(() => proposePersonaRepresentation(godmode, humanPersonaId, alice.id))
      .toThrow('representation_conflict');
    expect(resolvePersonaStyleOverlay(humanPersonaId, null)?.metadata.label).toContain('style learn bob');
  });

  it('utilise uniquement un collectif de trois membres et ne traverse pas les projets', () => {
    observeMany(alice, 'Du coup ensemble');
    observeMany(bob, 'Du coup ensemble');
    expect(resolvePersonaStyleOverlay(groupPersonaId, projectId)).toBeNull();
    observeMany(charlie, 'En vrai collectif');

    const overlay = resolvePersonaStyleOverlay(groupPersonaId, projectId);
    expect(overlay?.metadata.source).toBe('project_collective');
    expect(overlay?.instructions).toContain('Du coup'.toLocaleLowerCase('fr'));
    expect(resolvePersonaStyleOverlay(groupPersonaId, otherProjectId)).toBeNull();
  });

  it('isole la matrice utilisateurs A/B et personas X/Y sans croisement de style', () => {
    observeMany(alice, 'Franchement alors');
    observeMany(bob, 'En vrai du coup');
    const linkX = proposePersonaRepresentation(alice, humanPersonaId, alice.id);
    const linkY = proposePersonaRepresentation(bob, groupPersonaId, bob.id);
    expect(linkX.status).toBe('active');
    expect(linkY.status).toBe('active');

    const personaX = resolvePersonaStyleOverlay(humanPersonaId, null);
    const personaY = resolvePersonaStyleOverlay(groupPersonaId, null);
    expect(personaX?.metadata.label).toContain('style learn alice');
    expect(personaX?.instructions).toContain('franchement');
    expect(personaX?.instructions).not.toContain('en vrai');
    expect(personaY?.metadata.label).toContain('style learn bob');
    expect(personaY?.instructions).toContain('en vrai');
    expect(personaY?.instructions).not.toContain('franchement');
  });

  it('coupe l’injection au tour suivant après désactivation ou révocation', () => {
    observeMany(bob, 'En vrai du coup');
    const link = proposePersonaRepresentation(bob, humanPersonaId, bob.id);
    expect(resolvePersonaStyleOverlay(humanPersonaId, null)).not.toBeNull();
    updateStyleLearningPreferences(bob, {learning_enabled: false});
    expect(resolvePersonaStyleOverlay(humanPersonaId, null)).toBeNull();
    updateStyleLearningPreferences(bob, {learning_enabled: true});
    updatePersonaRepresentationStatus(bob, link.id, 'revoked');
    expect(resolvePersonaStyleOverlay(humanPersonaId, null)).toBeNull();
  });

  it('réserve activation et révocation au sujet sans modifier identité ni permissions', () => {
    observeMany(bob, 'En vrai du coup');
    const beforeUser = getDb().prepare('SELECT id, username, role, active FROM users WHERE id = ?')
      .get(bob.id);
    const beforePersona = getDb().prepare('SELECT permissions_json FROM personas WHERE id = ?')
      .get(humanPersonaId);
    const link = proposePersonaRepresentation(godmode, humanPersonaId, bob.id);
    expect(link.status).toBe('pending');
    expect(() => updatePersonaRepresentationStatus(alice, link.id, 'active'))
      .toThrow('representation_not_found');
    expect(() => updatePersonaRepresentationStatus(godmode, link.id, 'active'))
      .toThrow('representation_not_found');
    updatePersonaRepresentationStatus(bob, link.id, 'active');
    expect(resolvePersonaStyleOverlay(humanPersonaId, null)).not.toBeNull();
    updatePersonaRepresentationStatus(bob, link.id, 'revoked');
    expect(resolvePersonaStyleOverlay(humanPersonaId, null)).toBeNull();
    expect(getDb().prepare('SELECT id, username, role, active FROM users WHERE id = ?').get(bob.id))
      .toEqual(beforeUser);
    expect(getDb().prepare('SELECT permissions_json FROM personas WHERE id = ?').get(humanPersonaId))
      .toEqual(beforePersona);
  });

  it('empêche B de reprendre le persona X déjà activement lié à A', () => {
    const link = proposePersonaRepresentation(alice, humanPersonaId, alice.id);
    expect(link.status).toBe('active');
    expect(() => proposePersonaRepresentation(bob, humanPersonaId, bob.id))
      .toThrow('representation_conflict');
    const stored = getDb().prepare(
      'SELECT represented_user_id, status FROM persona_representation_links WHERE persona_id = ?',
    ).get(humanPersonaId);
    expect(stored).toEqual({represented_user_id: alice.id, status: 'active'});
  });

  it('plafonne la couche composite à 40 pour cent', () => {
    observeMany(bob, 'En vrai du coup');
    updateStyleLearningPreferences(bob, {overlay_intensity: 0.4});
    proposePersonaRepresentation(bob, humanPersonaId, bob.id);
    const overlay = resolvePersonaStyleOverlay(humanPersonaId, null);
    expect(overlay?.metadata.intensity).toBe(0.4);
    expect(overlay?.instructions).toContain('Intensité secondaire 0.40');
    expect(overlay?.instructions).not.toMatch(/Intensité secondaire (?:0\.[5-9]|1\.)/);
  });

  it('remet à zéro uniquement les marqueurs dérivés du sujet', () => {
    observeMany(alice, 'En vrai du coup');
    observeMany(bob, 'Franchement alors');
    expect(getStyleLearningSnapshot(alice).preview.sample_count).toBe(20);
    const reset = resetStyleLearning(alice);
    expect(reset.preview.sample_count).toBe(0);
    expect(getStyleLearningSnapshot(bob).preview.sample_count).toBe(20);
  });
});
