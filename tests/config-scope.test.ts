import assert from 'node:assert/strict';
import {test} from 'node:test';

import Database from 'better-sqlite3';

process.env.STORAGE_ENC_SECRET ??= 'test-secret-pour-le-chiffrement-at-rest-32+';

import {
  CLE_DRAPEAU_PORTEE,
  CLES_FOURNISSEUR_SAISIES,
  PORTEE_UTILISATEURS,
  amorcerDepuisUtilisateurs,
  definirConfigPerso,
  dumpScope,
  ecrireScope,
  estCleFournisseur,
  lireScope,
  listerPorteesPerso,
  porteeAdmin,
  resoudrePortee,
  supprimerConfigPerso,
  supprimerScope,
  utiliseConfigPerso,
} from '../server/config-scope.ts';
import {isEncrypted} from '../server/secrets-at-rest.ts';

/**
 * Étanchéité des deux portées de configuration (cf. server/config-scope.ts).
 *
 * Base montée à la main en mémoire — comme tests/secrets-at-rest.test.ts : `getDb()` ouvrirait
 * `data/api-manage.db`, et ces tests ÉCRIVENT. Un test qui salit la base de production n'est
 * pas un test.
 */
function baseDeTest(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','user')), active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL);
    CREATE TABLE global_settings (
      app TEXT NOT NULL, key TEXT NOT NULL, value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL, PRIMARY KEY (app, key));
    CREATE TABLE user_storage (
      user_id TEXT NOT NULL, app TEXT NOT NULL, key TEXT NOT NULL, value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, app, key));
  `);
  const u = db.prepare('INSERT INTO users (id, username, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, 0)');
  u.run('admin-1', 'vincent', 'x', 'admin');
  u.run('admin-2', 'autre-admin', 'x', 'admin');
  u.run('user-1', 'invite', 'x', 'user');
  return db;
}

/** Config « utilisateurs » d'une matière, telle que la poserait un seed. */
function seedUtilisateurs(db: Database.Database, app: string) {
  ecrireScope(app, 'corrector_base_url', 'https://albert.api.etalab.gouv.fr', PORTEE_UTILISATEURS, 'admin-1', db);
  ecrireScope(app, 'corrector_api_key', 'cle-des-invites', PORTEE_UTILISATEURS, 'admin-1', db);
  ecrireScope(app, 'corrector_ocr_model', 'mistral-small-3-2-24b-instruct-2506', PORTEE_UTILISATEURS, 'admin-1', db);
  ecrireScope(app, 'corrector_chat_model', 'openai/gpt-oss-120b', PORTEE_UTILISATEURS, 'admin-1', db);
  ecrireScope(app, 'corrector_model_routing', {correction: {primary: 'openai/gpt-oss-120b', fallbacks: []}}, PORTEE_UTILISATEURS, 'admin-1', db);
}

test('estCleFournisseur : le bloc fournisseur, et rien d’autre', () => {
  for (const k of CLES_FOURNISSEUR_SAISIES) assert.ok(estCleFournisseur(k), k);
  assert.ok(estCleFournisseur('corrector_model_catalog'));
  assert.ok(estCleFournisseur('corrector_model_absences'));
  // Ces réglages-là restent partagés : ils ne dépendent pas du fournisseur.
  for (const k of ['corrector_model_pricing', 'corrector_ocr_preprocess', 'corrector_instance_config', 'classes', 'ds']) {
    assert.equal(estCleFournisseur(k), false, k);
  }
});

test('drapeau inactif : l’admin lit la config des utilisateurs (non-régression)', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');

  const portee = resoudrePortee('admin', 'admin-1', 'fr', db);
  assert.equal(portee.kind, 'users');
  assert.equal(lireScope('fr', 'corrector_chat_model', portee, db), 'openai/gpt-oss-120b');
  assert.equal(utiliseConfigPerso('admin-1', 'fr', db), false);
});

test('drapeau actif : l’admin lit sa portée, la config des utilisateurs reste intacte', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  amorcerDepuisUtilisateurs('admin-1', 'fr', {}, db);
  definirConfigPerso('admin-1', 'fr', true, db);

  const portee = resoudrePortee('admin', 'admin-1', 'fr', db);
  assert.deepEqual(portee, {kind: 'admin', userId: 'admin-1'});

  // L'admin bascule sur un autre fournisseur, avec sa propre clé.
  ecrireScope('fr', 'corrector_base_url', 'https://api.kimi.com/coding', portee, 'admin-1', db);
  ecrireScope('fr', 'corrector_api_key', 'ma-cle-kimi', portee, 'admin-1', db);
  ecrireScope('fr', 'corrector_chat_model', 'k3', portee, 'admin-1', db);

  assert.equal(lireScope('fr', 'corrector_chat_model', portee, db), 'k3');
  assert.equal(lireScope('fr', 'corrector_api_key', portee, db), 'ma-cle-kimi');

  // …et rien n'a bougé pour les invités. C'est TOUTE la feature.
  assert.equal(lireScope('fr', 'corrector_chat_model', PORTEE_UTILISATEURS, db), 'openai/gpt-oss-120b');
  assert.equal(lireScope('fr', 'corrector_api_key', PORTEE_UTILISATEURS, db), 'cle-des-invites');
  assert.equal(lireScope('fr', 'corrector_base_url', PORTEE_UTILISATEURS, db), 'https://albert.api.etalab.gouv.fr');
});

test('un invité ne voit JAMAIS la portée admin, même avec des lignes à son nom', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  // Cas tordu mais c'est le seul qui compte : des lignes du bloc fournisseur existent dans le
  // user_storage d'un invité, et son drapeau est même posé à true.
  ecrireScope('fr', 'corrector_api_key', 'cle-volee', porteeAdmin('user-1'), 'user-1', db);
  definirConfigPerso('user-1', 'fr', true, db);

  const portee = resoudrePortee('user', 'user-1', 'fr', db);
  assert.equal(portee.kind, 'users');
  assert.equal(lireScope('fr', 'corrector_api_key', portee, db), 'cle-des-invites');
});

test('la portée d’un admin est étanche à celle d’un autre admin', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  ecrireScope('fr', 'corrector_chat_model', 'k3', porteeAdmin('admin-1'), 'admin-1', db);
  definirConfigPerso('admin-1', 'fr', true, db);

  assert.equal(resoudrePortee('admin', 'admin-2', 'fr', db).kind, 'users');
  assert.equal(lireScope('fr', 'corrector_chat_model', porteeAdmin('admin-2'), db), undefined);
});

test('la clé API perso est chiffrée at-rest dans user_storage', () => {
  const db = baseDeTest();
  ecrireScope('fr', 'corrector_api_key', 'ma-cle-kimi', porteeAdmin('admin-1'), 'admin-1', db);
  ecrireScope('fr', 'corrector_base_url', 'https://api.kimi.com/coding', porteeAdmin('admin-1'), 'admin-1', db);

  const rows = db
    .prepare('SELECT key, value_json FROM user_storage WHERE user_id = ?')
    .all('admin-1') as Array<{key: string; value_json: string}>;
  const cle = rows.find((r) => r.key === 'corrector_api_key')!;
  const url = rows.find((r) => r.key === 'corrector_base_url')!;
  assert.ok(isEncrypted(cle.value_json), 'la clé API doit être chiffrée');
  assert.ok(!isEncrypted(url.value_json), 'la baseUrl reste lisible pour le debug');
  // …et relue en clair par le lecteur scopé.
  assert.equal(lireScope('fr', 'corrector_api_key', porteeAdmin('admin-1'), db), 'ma-cle-kimi');
});

test('désactiver rend la config des utilisateurs SANS perdre la config perso', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  amorcerDepuisUtilisateurs('admin-1', 'fr', {}, db);
  definirConfigPerso('admin-1', 'fr', true, db);
  ecrireScope('fr', 'corrector_chat_model', 'k3', porteeAdmin('admin-1'), 'admin-1', db);

  definirConfigPerso('admin-1', 'fr', false, db);
  assert.equal(resoudrePortee('admin', 'admin-1', 'fr', db).kind, 'users');
  assert.equal(lireScope('fr', 'corrector_chat_model', PORTEE_UTILISATEURS, db), 'openai/gpt-oss-120b');

  // Réactiver rend la config telle qu'elle avait été laissée : l'amorçage ne réécrase pas.
  amorcerDepuisUtilisateurs('admin-1', 'fr', {}, db);
  definirConfigPerso('admin-1', 'fr', true, db);
  assert.equal(lireScope('fr', 'corrector_chat_model', porteeAdmin('admin-1'), db), 'k3');
});

test('amorcerDepuisUtilisateurs : copie les clés saisies, ignore les absentes', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr'); // pas de corrector_stt_model ni de reasoning_effort
  const copiees = amorcerDepuisUtilisateurs('admin-1', 'fr', {}, db);

  assert.deepEqual(copiees.sort(), [
    'corrector_api_key',
    'corrector_base_url',
    'corrector_chat_model',
    'corrector_model_routing',
    'corrector_ocr_model',
  ].sort());
  const perso = dumpScope('fr', porteeAdmin('admin-1'), db);
  const users = dumpScope('fr', PORTEE_UTILISATEURS, db);
  for (const k of copiees) assert.deepEqual(perso[k], users[k], k);
  assert.equal(perso.corrector_stt_model, undefined);
});

test('amorcerDepuisUtilisateurs : ne réécrase pas une config perso déjà travaillée', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  ecrireScope('fr', 'corrector_chat_model', 'k3', porteeAdmin('admin-1'), 'admin-1', db);

  assert.deepEqual(amorcerDepuisUtilisateurs('admin-1', 'fr', {}, db), []);
  assert.equal(lireScope('fr', 'corrector_chat_model', porteeAdmin('admin-1'), db), 'k3');

  // …sauf demande explicite.
  const copiees = amorcerDepuisUtilisateurs('admin-1', 'fr', {seulementSiVide: false}, db);
  assert.ok(copiees.includes('corrector_chat_model'));
  assert.equal(lireScope('fr', 'corrector_chat_model', porteeAdmin('admin-1'), db), 'openai/gpt-oss-120b');
});

test('les portées sont indépendantes matière par matière', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  seedUtilisateurs(db, 'pc');
  definirConfigPerso('admin-1', 'fr', true, db);

  assert.equal(resoudrePortee('admin', 'admin-1', 'fr', db).kind, 'admin');
  assert.equal(resoudrePortee('admin', 'admin-1', 'pc', db).kind, 'users');
});

test('supprimerConfigPerso : efface la portée et son drapeau, laisse le reste du user_storage', () => {
  const db = baseDeTest();
  seedUtilisateurs(db, 'fr');
  amorcerDepuisUtilisateurs('admin-1', 'fr', {}, db);
  definirConfigPerso('admin-1', 'fr', true, db);
  // Donnée métier de l'admin dans la même table : elle ne doit pas partir avec.
  ecrireScope('fr', 'classes', [{nom: '1re G'}], porteeAdmin('admin-1'), 'admin-1', db);

  assert.ok(supprimerConfigPerso('admin-1', 'fr', db) >= 6);
  assert.equal(utiliseConfigPerso('admin-1', 'fr', db), false);
  assert.equal(resoudrePortee('admin', 'admin-1', 'fr', db).kind, 'users');
  assert.deepEqual(lireScope('fr', 'classes', porteeAdmin('admin-1'), db), [{nom: '1re G'}]);
});

test('listerPorteesPerso : les admins actifs au drapeau posé, eux seuls', () => {
  const db = baseDeTest();
  definirConfigPerso('admin-1', 'fr', true, db);
  definirConfigPerso('admin-1', 'pc', false, db); // drapeau posé mais inactif
  definirConfigPerso('user-1', 'fr', true, db); // pas un admin
  definirConfigPerso('admin-2', 'hg', true, db);
  db.prepare("UPDATE users SET active = 0 WHERE id = 'admin-2'").run(); // admin désactivé

  assert.deepEqual(listerPorteesPerso(db), [{userId: 'admin-1', app: 'fr'}]);
});

test('supprimerScope : 404 discriminé (false) quand il n’y avait rien', () => {
  const db = baseDeTest();
  ecrireScope('fr', 'corrector_chat_model', 'k3', porteeAdmin('admin-1'), 'admin-1', db);
  assert.equal(supprimerScope('fr', 'corrector_chat_model', porteeAdmin('admin-1'), db), true);
  assert.equal(supprimerScope('fr', 'corrector_chat_model', porteeAdmin('admin-1'), db), false);
});

test('le drapeau porte bien la clé attendue par la garde du storage REST', () => {
  const db = baseDeTest();
  definirConfigPerso('admin-1', 'fr', true, db);
  const row = db
    .prepare('SELECT key FROM user_storage WHERE user_id = ? AND app = ?')
    .get('admin-1', 'fr') as {key: string};
  assert.equal(row.key, CLE_DRAPEAU_PORTEE);
});
