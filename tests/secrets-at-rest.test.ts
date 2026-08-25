import test from 'node:test';
import assert from 'node:assert/strict';

// L'env DOIT être posé avant l'import (dérivation paresseuse, mais autant être
// explicite) — même contrainte que session.ts pour le serveur réel.
process.env.SESSION_SECRET = 'secret-de-test-suffisamment-long-0123456789';

const {
  decryptValueJson,
  encryptIfSensitive,
  encryptValueJson,
  isEncrypted,
  isSensitiveGlobalKey,
  migrateSecretsAtRest,
} = await import('../server/secrets-at-rest.ts');

test('encrypt/decrypt : aller-retour intact sur un value_json réaliste', () => {
  const valueJson = JSON.stringify('csqQmFakeKey1234567890');
  const stored = encryptValueJson(valueJson);
  assert.ok(isEncrypted(stored));
  assert.ok(stored.startsWith('encv1:'));
  assert.notEqual(stored, valueJson);
  assert.ok(!stored.includes('FakeKey'), 'le secret ne doit pas apparaître dans le stocké');
  assert.equal(decryptValueJson(stored), valueJson);
});

test('encryptValueJson : idempotent sur une valeur déjà chiffrée', () => {
  const once = encryptValueJson('"abc"');
  assert.equal(encryptValueJson(once), once);
});

test('decryptValueJson : passthrough sur une valeur héritée en clair', () => {
  assert.equal(decryptValueJson('"cle-en-clair"'), '"cle-en-clair"');
  assert.equal(decryptValueJson('{"mode":"admin"}'), '{"mode":"admin"}');
});

test('decryptValueJson : valeur préfixée corrompue → erreur explicite (pas de silence)', () => {
  const stored = encryptValueJson('"abc"');
  const tampered = stored.slice(0, -4) + 'AAAA';
  assert.throws(() => decryptValueJson(tampered), /indéchiffrable/);
});

test('deux chiffrements du même clair diffèrent (IV aléatoire) mais déchiffrent pareil', () => {
  const a = encryptValueJson('"meme-valeur"');
  const b = encryptValueJson('"meme-valeur"');
  assert.notEqual(a, b);
  assert.equal(decryptValueJson(a), decryptValueJson(b));
});

test('encryptIfSensitive : ne chiffre que corrector_api_key', () => {
  assert.ok(isSensitiveGlobalKey('corrector_api_key'));
  assert.ok(!isSensitiveGlobalKey('corrector_base_url'));
  assert.ok(isEncrypted(encryptIfSensitive('corrector_api_key', '"k"')));
  assert.equal(encryptIfSensitive('corrector_base_url', '"https://api.mistral.ai"'), '"https://api.mistral.ai"');
  assert.equal(encryptIfSensitive('corrector_model_routing', '{"ocr":{}}'), '{"ocr":{}}');
});

test('migrateSecretsAtRest : chiffre les clés sensibles en clair, idempotent, ne touche pas le reste', async () => {
  const {default: Database} = await import('better-sqlite3');
  const db = new Database(':memory:');
  db.exec(`CREATE TABLE global_settings (
    app TEXT NOT NULL, key TEXT NOT NULL, value_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL, updated_by TEXT NOT NULL, PRIMARY KEY (app, key));`);
  const ins = db.prepare('INSERT INTO global_settings VALUES (?, ?, ?, 0, \'admin\')');
  ins.run('pc', 'corrector_api_key', '"cle-pc-en-clair"');
  ins.run('fr', 'corrector_api_key', encryptValueJson('"cle-fr-deja-chiffree"'));
  ins.run('pc', 'corrector_base_url', '"https://api.mistral.ai"');

  assert.equal(migrateSecretsAtRest(db), 1); // seule la ligne pc en clair
  assert.equal(migrateSecretsAtRest(db), 0); // idempotent

  const rows = db.prepare('SELECT * FROM global_settings').all() as {key: string; value_json: string}[];
  for (const r of rows) {
    if (r.key === 'corrector_api_key') {
      assert.ok(isEncrypted(r.value_json));
      assert.match(decryptValueJson(r.value_json), /^"cle-/);
    } else {
      assert.ok(!isEncrypted(r.value_json), 'baseUrl doit rester en clair');
    }
  }
  db.close();
});
