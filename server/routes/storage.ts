import {Router} from 'express';

import {canAccessApp, getUserAccess} from '../app-access.ts';
import {requireUser} from '../auth.ts';
import {
  CLE_DRAPEAU_PORTEE,
  dumpScope,
  estCleFournisseur,
  lireScope,
  PORTEE_UTILISATEURS,
  resoudrePortee,
  supprimerScope,
  ecrireScope,
} from '../config-scope.ts';
import {getDb, type StorageRow} from '../db.ts';
import {decryptValueJson} from '../secrets-at-rest.ts';
import {currentUser} from '../session.ts';

/** Apps autorisées comme valeur du paramètre `:app`. */
const ALLOWED_APPS = new Set(['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg']);

/**
 * Clés dont la VALEUR est partagée entre tous les invités et écrite UNIQUEMENT par l'admin.
 * Tout ce qui touche au provider/clé API/modèles/routing — c'est-à-dire la "config technique"
 * que l'admin pré-configure une fois pour tout le monde.
 *
 * Les autres clés (classes, DS, dashboard, history…) restent strictement par-user.
 *
 * Depuis l'ajout de la config perso d'admin (`server/config-scope.ts`), le sous-ensemble
 * « bloc fournisseur » de cette liste (`CLES_FOURNISSEUR`) n'est plus forcément lu dans
 * `global_settings` : un admin qui a activé sa config perso sur cette matière lit et écrit
 * dans SA portée. Le reste (tarifs, prétraitement OCR, mode d'instance) demeure global.
 */
const ADMIN_CONTROLLED_KEYS = new Set([
  'corrector_api_key',
  'corrector_base_url',
  'corrector_ocr_model',
  'corrector_chat_model',
  'corrector_model_routing',
  'corrector_reasoning_effort',
  'corrector_ocr_preprocess',
  'corrector_instance_config',
  'corrector_model_pricing',
  'corrector_stt_model',
  // Catalogue live du fournisseur, écrit par `model-catalog-service.ts`. Admin-only en
  // écriture, lisible par tous : c'est par le dump de bootstrap de cette route que les 11
  // correcteurs reçoivent la liste des modèles réellement servis.
  'corrector_model_catalog',
  // Registre des absences en attente de confirmation, écrit lui aussi par le service de
  // catalogue. Listé ici pour que lecture et écriture visent la même portée : c'est lui qui
  // décide si une config sera réécrite, un correcteur n'a pas à pouvoir y toucher.
  'corrector_model_absences',
]);

const INSTANCE_CONFIG_KEY = 'corrector_instance_config';

function readUserRaw(userId: string, app: string, key: string): unknown {
  const r = getDb()
    .prepare<[string, string, string], StorageRow>(
      'SELECT * FROM user_storage WHERE user_id = ? AND app = ? AND key = ?',
    )
    .get(userId, app, key);
  if (!r) return undefined;
  try {
    // `decryptValueJson` est un passthrough sur une valeur non préfixée : les lignes
    // historiques (classes, DS, dashboard…) traversent inchangées. Seules les clés du bloc
    // fournisseur d'une config perso arrivent chiffrées ici.
    return JSON.parse(decryptValueJson(r.value_json));
  } catch {
    return undefined;
  }
}

/**
 * `corrector_instance_config` est virtuel : on FORCE `mode='client'` pour tout invité,
 * ce qui verrouille leur SettingsDialog (logique déjà implémentée dans les sous-apps).
 * Pour l'admin, on retourne le contenu sauvé en global_settings, ou `mode='admin'` par défaut.
 */
function resolveInstanceConfig(role: 'admin' | 'user', app: string): unknown {
  if (role !== 'admin') return {mode: 'client'};
  const saved = lireScope(app, INSTANCE_CONFIG_KEY, PORTEE_UTILISATEURS);
  return saved ?? {mode: 'admin'};
}

/**
 * Storage REST utilisé par les sous-apps en mode "managed".
 * Arbitrage admin-controlled / user-private selon ADMIN_CONTROLLED_KEYS, puis arbitrage de
 * portée (config des utilisateurs / config perso de l'admin) pour le bloc fournisseur.
 * Toutes les routes exigent une session valide (requireUser).
 */
export function createStorageRouter(): Router {
  const router = Router();
  router.use(requireUser);

  // Verrou « un compte = un correcteur » : miroir API du gate du reverse proxy,
  // sinon un user restreint pourrait lire/écrire le storage d'une autre matière
  // en appelant directement /api/v1/storage/:app/*.
  router.use('/:app', (req, res, next) => {
    const u = currentUser(req)!;
    const access = getUserAccess(u.userId!);
    if (!access || !access.active) {
      res.status(401).json({error: 'unauthenticated'});
      return;
    }
    if (!canAccessApp(access.role, access.assigned_app, req.params.app)) {
      res.status(403).json({error: 'app_not_assigned'});
      return;
    }
    next();
  });

  // GET /:app — dump fusionné (globals + user) pour bootstrap rapide d'une sous-app.
  router.get('/:app', (req, res) => {
    const u = currentUser(req)!;
    if (!ALLOWED_APPS.has(req.params.app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const app = req.params.app;
    const portee = resoudrePortee(u.role, u.userId!, app);

    const merged: Record<string, unknown> = dumpScope(app, PORTEE_UTILISATEURS);

    const userRows = getDb()
      .prepare<[string, string], StorageRow>(
        'SELECT * FROM user_storage WHERE user_id = ? AND app = ?',
      )
      .all(u.userId!, app);
    for (const r of userRows) {
      // Le bloc fournisseur ne se superpose QUE si la config perso est active. Sans cette
      // garde, désactiver sa config perso ne changerait rien : les lignes, conservées
      // exprès pour pouvoir la réactiver telle quelle, continueraient de s'appliquer.
      if (estCleFournisseur(r.key) && portee.kind !== 'admin') continue;
      if (r.key === CLE_DRAPEAU_PORTEE) continue; // détail d'implémentation, pas une config
      try {
        merged[r.key] = JSON.parse(decryptValueJson(r.value_json));
      } catch {
        /* skip */
      }
    }

    // Toujours présent — la sous-app s'en sert pour décider du verrouillage.
    merged[INSTANCE_CONFIG_KEY] = resolveInstanceConfig(u.role!, app);

    res.json({app, settings: merged});
  });

  // GET /:app/:key — { value } ou 404.
  router.get('/:app/:key', (req, res) => {
    const u = currentUser(req)!;
    if (!ALLOWED_APPS.has(req.params.app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const app = req.params.app;
    const key = req.params.key;

    if (key === INSTANCE_CONFIG_KEY) {
      res.json({value: resolveInstanceConfig(u.role!, app)});
      return;
    }

    let val: unknown;
    if (estCleFournisseur(key)) {
      val = lireScope(app, key, resoudrePortee(u.role, u.userId!, app));
    } else if (ADMIN_CONTROLLED_KEYS.has(key)) {
      val = lireScope(app, key, PORTEE_UTILISATEURS);
    } else {
      val = readUserRaw(u.userId!, app, key);
    }

    if (val === undefined) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({value: val});
  });

  // PUT /:app/:key — body { value: any }. Admin-only pour les clés admin-controlled.
  router.put('/:app/:key', (req, res) => {
    const u = currentUser(req)!;
    if (!ALLOWED_APPS.has(req.params.app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    if (!('value' in (req.body ?? {}))) {
      res.status(400).json({error: 'missing_value'});
      return;
    }
    const app = req.params.app;
    const key = req.params.key;

    // Le drapeau de portée ne se change que depuis la console admin : un correcteur ne doit
    // pas pouvoir rebasculer son propriétaire sur la config des utilisateurs par un storeSet.
    if (key === CLE_DRAPEAU_PORTEE) {
      res.status(400).json({error: 'reserved_key', hint: 'Se règle dans Configuration API.'});
      return;
    }

    if (ADMIN_CONTROLLED_KEYS.has(key)) {
      if (u.role !== 'admin') {
        res.status(403).json({error: 'admin_only'});
        return;
      }
      // C'est ici que se joue l'étanchéité : les Réglages d'un correcteur écrivent dans la
      // config perso de l'admin dès qu'elle est active. Auparavant, changer un modèle depuis
      // un correcteur basculait TOUS les invités avec lui, sans le dire.
      const portee = estCleFournisseur(key)
        ? resoudrePortee(u.role, u.userId!, app)
        : PORTEE_UTILISATEURS;
      ecrireScope(app, key, req.body.value, portee, u.userId!);
      res.json({ok: true});
      return;
    }

    getDb()
      .prepare(
        `INSERT INTO user_storage (user_id, app, key, value_json, updated_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (user_id, app, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
      )
      .run(u.userId!, app, key, JSON.stringify(req.body.value), Date.now());
    res.json({ok: true});
  });

  // DELETE /:app/:key — même arbitrage de permissions que PUT.
  router.delete('/:app/:key', (req, res) => {
    const u = currentUser(req)!;
    if (!ALLOWED_APPS.has(req.params.app)) {
      res.status(400).json({error: 'invalid_app'});
      return;
    }
    const app = req.params.app;
    const key = req.params.key;

    if (key === CLE_DRAPEAU_PORTEE) {
      res.status(400).json({error: 'reserved_key', hint: 'Se règle dans Configuration API.'});
      return;
    }

    if (ADMIN_CONTROLLED_KEYS.has(key)) {
      if (u.role !== 'admin') {
        res.status(403).json({error: 'admin_only'});
        return;
      }
      const portee = estCleFournisseur(key)
        ? resoudrePortee(u.role, u.userId!, app)
        : PORTEE_UTILISATEURS;
      if (!supprimerScope(app, key, portee)) {
        res.status(404).json({error: 'not_found'});
        return;
      }
      res.json({ok: true});
      return;
    }

    const r = getDb()
      .prepare('DELETE FROM user_storage WHERE user_id = ? AND app = ? AND key = ?')
      .run(u.userId!, app, key);
    if (r.changes === 0) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true});
  });

  return router;
}
