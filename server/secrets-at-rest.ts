import {createCipheriv, createDecipheriv, randomBytes, scryptSync} from 'node:crypto';

import type Database from 'better-sqlite3';

/**
 * Chiffrement applicatif at-rest des secrets stockés dans `global_settings`
 * (audit 2026-07-11, P2 « clés API en clair en base »).
 *
 * - AES-256-GCM, clé dérivée (scrypt) de STORAGE_ENC_SECRET si présent, sinon
 *   de SESSION_SECRET. Format stocké : `encv1:` + base64(iv ‖ tag ‖ ciphertext).
 * - Seules les clés listées dans SENSITIVE_GLOBAL_KEYS sont chiffrées : la config
 *   non sensible (baseUrl, modèles, routing…) reste lisible dans la DB pour le
 *   debug. Le déchiffrement est un passthrough sur les valeurs non préfixées,
 *   donc une ligne héritée en clair reste servie normalement (la migration au
 *   boot la chiffre à la première occasion).
 * - ATTENTION rotation : changer STORAGE_ENC_SECRET/SESSION_SECRET rend les
 *   valeurs chiffrées illisibles → relancer les seeds (seed-mistral/seed-albert)
 *   ou re-saisir les clés dans l'admin APRÈS la rotation. Documenté dans suivi.md.
 * - Volontairement sans import de session.ts (qui jette à l'import sans
 *   SESSION_SECRET) : la dérivation est paresseuse, les tests posent l'env avant.
 */

const PREFIX = 'encv1:';
const IV_LEN = 12; // nonce GCM recommandé
const TAG_LEN = 16;
const SCRYPT_SALT = 'api-manage/secrets-at-rest/v1';

/** Clés de global_settings dont la valeur est un secret à chiffrer at-rest. */
export const SENSITIVE_GLOBAL_KEYS = new Set(['corrector_api_key']);

export function isSensitiveGlobalKey(key: string): boolean {
  return SENSITIVE_GLOBAL_KEYS.has(key);
}

export function isEncrypted(stored: string): boolean {
  return stored.startsWith(PREFIX);
}

let cachedKey: Buffer | null = null;
let cachedSecret: string | null = null;

function deriveKey(): Buffer {
  const secret = process.env.STORAGE_ENC_SECRET || process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'Chiffrement at-rest impossible : STORAGE_ENC_SECRET ou SESSION_SECRET requis (32 chars min).',
    );
  }
  if (cachedKey && cachedSecret === secret) return cachedKey;
  cachedKey = scryptSync(secret, SCRYPT_SALT, 32);
  cachedSecret = secret;
  return cachedKey;
}

/** Chiffre un value_json. Idempotent : une valeur déjà chiffrée est renvoyée telle quelle. */
export function encryptValueJson(valueJson: string): string {
  if (isEncrypted(valueJson)) return valueJson;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', deriveKey(), iv);
  const data = Buffer.concat([cipher.update(valueJson, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, data]).toString('base64');
}

/**
 * Déchiffre un value_json stocké. Passthrough sur une valeur non préfixée
 * (ligne héritée en clair). Erreur explicite si la valeur est préfixée mais
 * indéchiffrable (secret changé sans re-seed, ou base corrompue).
 */
export function decryptValueJson(stored: string): string {
  if (!isEncrypted(stored)) return stored;
  let raw: Buffer;
  try {
    raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
    const data = raw.subarray(IV_LEN + TAG_LEN);
    const decipher = createDecipheriv('aes-256-gcm', deriveKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  } catch {
    throw new Error(
      'Secret at-rest indéchiffrable — STORAGE_ENC_SECRET/SESSION_SECRET a-t-il changé ? ' +
        'Relancer les seeds ou re-saisir la clé dans l’admin.',
    );
  }
}

/** À l'écriture : chiffre si la clé de settings est sensible, sinon renvoie tel quel. */
export function encryptIfSensitive(key: string, valueJson: string): string {
  return isSensitiveGlobalKey(key) ? encryptValueJson(valueJson) : valueJson;
}

/**
 * Migration au boot (idempotente) : chiffre en place les valeurs sensibles encore
 * en clair. Renvoie le nombre de lignes migrées.
 *
 * Couvre les DEUX tables porteuses de config : `global_settings` (config des
 * utilisateurs) et `user_storage` (config perso d'un admin, cf.
 * `server/config-scope.ts`). Le chemin nominal chiffre déjà à l'écriture ; ce
 * filet rattrape une ligne posée hors de ce chemin — un script, une reprise de
 * sauvegarde — plutôt que de la laisser en clair indéfiniment.
 */
export function migrateSecretsAtRest(db: Database.Database): number {
  const keys = [...SENSITIVE_GLOBAL_KEYS];
  const placeholders = keys.map(() => '?').join(', ');
  let migrated = 0;

  const globals = db
    .prepare<string[], {app: string; key: string; value_json: string}>(
      `SELECT app, key, value_json FROM global_settings WHERE key IN (${placeholders})`,
    )
    .all(...keys);
  const updateGlobal = db.prepare(
    'UPDATE global_settings SET value_json = ? WHERE app = ? AND key = ?',
  );
  for (const row of globals) {
    if (isEncrypted(row.value_json)) continue;
    updateGlobal.run(encryptValueJson(row.value_json), row.app, row.key);
    migrated++;
  }

  // `user_storage` peut ne pas exister dans une base de test montée à la main : on
  // ne migre cette table que si elle est là.
  const aUserStorage = db
    .prepare<[], {name: string}>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'user_storage'")
    .get();
  if (!aUserStorage) return migrated;

  const persos = db
    .prepare<string[], {user_id: string; app: string; key: string; value_json: string}>(
      `SELECT user_id, app, key, value_json FROM user_storage WHERE key IN (${placeholders})`,
    )
    .all(...keys);
  const updatePerso = db.prepare(
    'UPDATE user_storage SET value_json = ? WHERE user_id = ? AND app = ? AND key = ?',
  );
  for (const row of persos) {
    if (isEncrypted(row.value_json)) continue;
    updatePerso.run(encryptValueJson(row.value_json), row.user_id, row.app, row.key);
    migrated++;
  }
  return migrated;
}
