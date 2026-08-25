import type Database from 'better-sqlite3';

import {getDb, type GlobalSettingRow, type StorageRow} from './db.ts';
import {decryptValueJson, encryptIfSensitive} from './secrets-at-rest.ts';

/**
 * Deux portées pour la configuration fournisseur d'un correcteur.
 *
 * Jusqu'ici il n'y en avait qu'une : `global_settings(app, key)`, servie à TOUT LE MONDE par
 * `GET /api/v1/storage/:app`. Conséquence passée sous silence — quand l'admin changeait un
 * modèle depuis les Réglages d'un correcteur, `storeSet` écrivait dans cette table partagée et
 * tous les invités basculaient avec lui, sans le savoir. Il n'existait aucun endroit où essayer
 * un fournisseur sans engager les professeurs.
 *
 *   portée `users` → `global_settings(app, key)`            — le preset fourni aux invités
 *   portée `admin` → `user_storage(user_id, app, key)`      — la config perso d'UN admin
 *
 * `user_storage` porte déjà la clé primaire `(user_id, app, key)` : aucune migration de schéma.
 * Surtout, `global_settings` reste la seule table que voient les seeds, les scripts de patch, le
 * balayage du catalogue, la santé et les tarifs — c'est-à-dire tout ce qui doit continuer de
 * parler de la config DES UTILISATEURS.
 *
 * Règle « tout ou rien » : quand la config perso est active sur une matière, les clés du bloc
 * fournisseur viennent TOUTES de la portée admin. Pas de repli clé par clé, qui produirait le
 * scénario « preset Kimi retenu, clé Mistral restée en place » et son 404 silencieux.
 * L'activation recopie la config des utilisateurs, donc on part toujours d'un état qui marche.
 */

export type ConfigScope = {kind: 'users'} | {kind: 'admin'; userId: string};

export const PORTEE_UTILISATEURS: ConfigScope = {kind: 'users'};

export function porteeAdmin(userId: string): ConfigScope {
  return {kind: 'admin', userId};
}

/**
 * Le bloc fournisseur : les clés indissociables les unes des autres.
 *
 * Les deux dernières sont DÉRIVÉES (écrites par `model-catalog-service.ts`, jamais saisies) mais
 * appartiennent bien à la portée : le catalogue d'Albert n'a rien à dire des modèles de Kimi, et
 * un registre d'absences mélangeant les deux ferait basculer une config sur la foi d'une sonde
 * qui ne la concerne pas.
 *
 * Volontairement PLUS ÉTROIT que `ADMIN_CONTROLLED_KEYS` : les tarifs, le prétraitement OCR et
 * le mode d'instance ne dépendent pas du fournisseur et restent partagés.
 */
export const CLES_FOURNISSEUR = new Set([
  'corrector_base_url',
  'corrector_api_key',
  'corrector_ocr_model',
  'corrector_chat_model',
  'corrector_model_routing',
  'corrector_reasoning_effort',
  'corrector_stt_model',
  'corrector_model_catalog',
  'corrector_model_absences',
]);

/** Clés saisies dans la console, dans l'ordre où l'amorçage les recopie. */
export const CLES_FOURNISSEUR_SAISIES = [
  'corrector_base_url',
  'corrector_api_key',
  'corrector_ocr_model',
  'corrector_chat_model',
  'corrector_model_routing',
  'corrector_reasoning_effort',
  'corrector_stt_model',
] as const;

/**
 * Drapeau « j'utilise ma config perso sur cette matière », rangé dans le `user_storage` de
 * l'admin comme le reste de sa portée. RÉSERVÉ : le storage REST des sous-apps le refuse en
 * écriture, il ne se change que depuis la console admin — sinon un correcteur pourrait, par un
 * `storeSet` malencontreux, rebasculer son propriétaire sur la config des utilisateurs.
 */
export const CLE_DRAPEAU_PORTEE = 'corrector_config_scope';

export function estCleFournisseur(key: string): boolean {
  return CLES_FOURNISSEUR.has(key);
}

// ============================================================
// Lecture / écriture par portée
// ============================================================

/**
 * Déchiffre et parse une valeur stockée. `undefined` si la ligne est illisible — même
 * tolérance que les lecteurs qu'elle remplace : une valeur corrompue ne doit pas faire tomber
 * le bootstrap d'un correcteur.
 */
function parseValeur(valueJson: string): unknown {
  try {
    return JSON.parse(decryptValueJson(valueJson));
  } catch {
    return undefined;
  }
}

export function lireScope(app: string, key: string, scope: ConfigScope, d?: Database.Database): unknown {
  const db = d ?? getDb();
  if (scope.kind === 'users') {
    const r = db
      .prepare<[string, string], GlobalSettingRow>(
        'SELECT * FROM global_settings WHERE app = ? AND key = ?',
      )
      .get(app, key);
    return r ? parseValeur(r.value_json) : undefined;
  }
  const r = db
    .prepare<[string, string, string], StorageRow>(
      'SELECT * FROM user_storage WHERE user_id = ? AND app = ? AND key = ?',
    )
    .get(scope.userId, app, key);
  return r ? parseValeur(r.value_json) : undefined;
}

/**
 * `parUserId` n'a de sens que pour la portée utilisateurs (`global_settings.updated_by`, clé
 * étrangère vers `users`) : la portée admin est déjà identifiée par son `user_id`.
 *
 * Le chiffrement at-rest s'applique aux DEUX tables. Sans ça, la clé API perso serait le seul
 * secret en clair de la base — `user_storage` n'a jamais eu à en porter jusqu'ici.
 */
export function ecrireScope(
  app: string,
  key: string,
  value: unknown,
  scope: ConfigScope,
  parUserId: string,
  d?: Database.Database,
): void {
  const db = d ?? getDb();
  const stocke = encryptIfSensitive(key, JSON.stringify(value));
  const now = Date.now();
  if (scope.kind === 'users') {
    db.prepare(
      `INSERT INTO global_settings (app, key, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (app, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    ).run(app, key, stocke, now, parUserId);
    return;
  }
  db.prepare(
    `INSERT INTO user_storage (user_id, app, key, value_json, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, app, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
  ).run(scope.userId, app, key, stocke, now);
}

/** Renvoie `true` si une ligne a bien été supprimée (pour distinguer le 404). */
export function supprimerScope(
  app: string,
  key: string,
  scope: ConfigScope,
  d?: Database.Database,
): boolean {
  const db = d ?? getDb();
  const r =
    scope.kind === 'users'
      ? db.prepare('DELETE FROM global_settings WHERE app = ? AND key = ?').run(app, key)
      : db
          .prepare('DELETE FROM user_storage WHERE user_id = ? AND app = ? AND key = ?')
          .run(scope.userId, app, key);
  return r.changes > 0;
}

/** Toutes les clés d'une portée pour une app, déchiffrées et parsées. */
export function dumpScope(
  app: string,
  scope: ConfigScope,
  d?: Database.Database,
): Record<string, unknown> {
  const db = d ?? getDb();
  const rows =
    scope.kind === 'users'
      ? db
          .prepare<[string], GlobalSettingRow>('SELECT * FROM global_settings WHERE app = ?')
          .all(app)
      : db
          .prepare<[string, string], StorageRow>(
            'SELECT * FROM user_storage WHERE user_id = ? AND app = ?',
          )
          .all(scope.userId, app);
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    const v = parseValeur(r.value_json);
    if (v !== undefined) out[r.key] = v;
  }
  return out;
}

// ============================================================
// Drapeau de portée
// ============================================================

export function utiliseConfigPerso(userId: string, app: string, d?: Database.Database): boolean {
  const v = lireScope(app, CLE_DRAPEAU_PORTEE, porteeAdmin(userId), d);
  return !!v && typeof v === 'object' && (v as {personnel?: unknown}).personnel === true;
}

export function definirConfigPerso(
  userId: string,
  app: string,
  actif: boolean,
  d?: Database.Database,
): void {
  ecrireScope(app, CLE_DRAPEAU_PORTEE, {personnel: actif}, porteeAdmin(userId), userId, d);
}

/**
 * Recopie la config des utilisateurs dans la portée perso d'un admin.
 *
 * `seulementSiVide` (le défaut) protège une config perso déjà travaillée : réactiver le drapeau
 * après l'avoir coupé doit rendre SA config, pas celle des invités. Renvoie les clés recopiées.
 */
export function amorcerDepuisUtilisateurs(
  userId: string,
  app: string,
  opts: {seulementSiVide?: boolean} = {},
  d?: Database.Database,
): string[] {
  const scope = porteeAdmin(userId);
  const seulementSiVide = opts.seulementSiVide ?? true;
  const existant = dumpScope(app, scope, d);
  const dejaConfigure = CLES_FOURNISSEUR_SAISIES.some((k) => existant[k] !== undefined);
  if (seulementSiVide && dejaConfigure) return [];

  const source = dumpScope(app, PORTEE_UTILISATEURS, d);
  const copiees: string[] = [];
  for (const key of CLES_FOURNISSEUR_SAISIES) {
    const v = source[key];
    if (v === undefined) continue;
    ecrireScope(app, key, v, scope, userId, d);
    copiees.push(key);
  }
  return copiees;
}

/** Efface la portée perso d'un admin sur une app, drapeau compris. */
export function supprimerConfigPerso(userId: string, app: string, d?: Database.Database): number {
  const db = d ?? getDb();
  const cles = [...CLES_FOURNISSEUR, CLE_DRAPEAU_PORTEE];
  const stmt = db.prepare('DELETE FROM user_storage WHERE user_id = ? AND app = ? AND key = ?');
  let supprimees = 0;
  for (const key of cles) supprimees += stmt.run(userId, app, key).changes;
  return supprimees;
}

/**
 * Quelle config servir à ce compte sur cette app ?
 *
 * Un rôle `user` reçoit TOUJOURS la portée utilisateurs — sans exception ni condition, même si
 * des lignes existaient dans son `user_storage` pour ces clés. C'est la cloison qui garantit
 * qu'aucun invité ne consomme la clé API personnelle d'un admin.
 */
export function resoudrePortee(
  role: 'admin' | 'user' | undefined,
  userId: string,
  app: string,
  d?: Database.Database,
): ConfigScope {
  if (role !== 'admin') return PORTEE_UTILISATEURS;
  return utiliseConfigPerso(userId, app, d) ? porteeAdmin(userId) : PORTEE_UTILISATEURS;
}

/**
 * Admins ayant une config perso ACTIVE, avec les apps concernées. Sert au balayage périodique
 * du catalogue : sans ça, la détection de dérive fournisseur (modèle retiré par le fournisseur)
 * ne couvrirait que la config des invités, et la config perso resterait cassée jusqu'à ce que
 * son propriétaire ouvre la console.
 */
export function listerPorteesPerso(d?: Database.Database): Array<{userId: string; app: string}> {
  const db = d ?? getDb();
  const rows = db
    .prepare<[string], {user_id: string; app: string; value_json: string}>(
      `SELECT s.user_id, s.app, s.value_json
         FROM user_storage s
         JOIN users u ON u.id = s.user_id
        WHERE s.key = ? AND u.role = 'admin' AND u.active = 1`,
    )
    .all(CLE_DRAPEAU_PORTEE);
  const out: Array<{userId: string; app: string}> = [];
  for (const r of rows) {
    const v = parseValeur(r.value_json);
    if (!!v && typeof v === 'object' && (v as {personnel?: unknown}).personnel === true) {
      out.push({userId: r.user_id, app: r.app});
    }
  }
  return out;
}
