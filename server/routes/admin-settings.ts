import type {Request, Response} from 'express';
import {Router} from 'express';

import {requireAdmin} from '../auth.ts';
import {
  CLES_FOURNISSEUR_SAISIES,
  PORTEE_UTILISATEURS,
  amorcerDepuisUtilisateurs,
  definirConfigPerso,
  dumpScope,
  ecrireScope,
  estCleFournisseur,
  porteeAdmin,
  supprimerConfigPerso,
  supprimerScope,
  utiliseConfigPerso,
  type ConfigScope,
} from '../config-scope.ts';
import {ensureCatalog} from '../model-catalog-service.ts';
import {modelsProbe} from '../models-probe.ts';
import {isProbeHostAllowed} from '../probe-allowlist.ts';
import {currentUser} from '../session.ts';
import {parseModelsResponse} from '../../lib/model-catalog.ts';

/** Apps autorisées comme valeur du paramètre `:app`. */
const ALLOWED_APPS = new Set(['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg']);

/**
 * Portée visée par la requête : `?scope=admin` désigne la configuration personnelle de l'admin
 * CONNECTÉ (jamais celle d'un autre), tout le reste la configuration des utilisateurs.
 *
 * Une portée `admin` sur une clé hors bloc fournisseur (tarifs, prétraitement OCR…) est
 * retombée en silence sur la portée utilisateurs : ces réglages-là restent partagés, et un
 * paramètre de trop dans une URL ne doit pas créer une config fantôme que personne ne lit.
 */
function resoudreScopeDemande(req: Request, key?: string): ConfigScope {
  if (String(req.query.scope ?? '') !== 'admin') return PORTEE_UTILISATEURS;
  if (key && !estCleFournisseur(key)) return PORTEE_UTILISATEURS;
  return porteeAdmin(currentUser(req)!.userId!);
}

/** 400 + `false` si le slug n'est pas un correcteur connu. */
function appValide(req: Request, res: Response): boolean {
  if (ALLOWED_APPS.has(req.params.app ?? '')) return true;
  res.status(400).json({error: 'invalid_app'});
  return false;
}

// `modelsProbe` a été déplacé dans `server/models-probe.ts` (module feuille) : il est
// désormais partagé avec `model-catalog-service.ts`, dont ce fichier dépend — l'y laisser
// aurait créé un cycle d'imports. Ré-export conservé pour les importateurs existants.
export {modelsProbe} from '../models-probe.ts';

/**
 * Routes de gestion des `global_settings` — la config admin partagée par tous les invités
 * (clé API, baseUrl, modèles, routing, reasoning_effort…). Admin-only.
 *
 * Modèle clé/valeur identique à celui du `lib/tauri.ts` des sous-apps :
 * les clés sont des chaînes opaques (`corrector_api_key`, `corrector_base_url`, …),
 * les valeurs sont du JSON arbitraire.
 */
export function createAdminSettingsRouter(): Router {
  const router = Router();
  router.use(requireAdmin);

  // GET /:app/config-perso — état de la configuration personnelle de l'admin connecté.
  // Déclaré AVANT `/:app/:key` : Express retient la première route qui matche, et sans cet
  // ordre `config-perso` serait lu comme un nom de clé de settings.
  router.get('/:app/config-perso', (req, res) => {
    if (!appValide(req, res)) return;
    const u = currentUser(req)!;
    const app = req.params.app!;
    const perso = dumpScope(app, porteeAdmin(u.userId!));
    res.json({
      app,
      actif: utiliseConfigPerso(u.userId!, app),
      // Une config perso déjà saisie mais désactivée doit se voir : c'est ce qui distingue
      // « réactiver la mienne » de « en créer une, copiée sur celle des utilisateurs ».
      existe: CLES_FOURNISSEUR_SAISIES.some((k) => perso[k] !== undefined),
    });
  });

  // PUT /:app/config-perso — body { actif: boolean }. Active/désactive la config perso.
  router.put('/:app/config-perso', (req, res) => {
    if (!appValide(req, res)) return;
    const u = currentUser(req)!;
    const app = req.params.app!;
    const actif = req.body?.actif === true;
    // Amorçage AVANT la bascule : on part de la config des utilisateurs, donc d'un état qui
    // fonctionne, plutôt que d'un formulaire vide qui casserait le correcteur au rechargement.
    // `seulementSiVide` protège une config perso déjà travaillée puis désactivée.
    const copiees = actif ? amorcerDepuisUtilisateurs(u.userId!, app) : [];
    definirConfigPerso(u.userId!, app, actif);
    res.json({ok: true, actif, amorcee: copiees.length > 0, cles: copiees});
  });

  // DELETE /:app/config-perso — efface la config perso de l'admin connecté sur cette app.
  router.delete('/:app/config-perso', (req, res) => {
    if (!appValide(req, res)) return;
    const u = currentUser(req)!;
    res.json({ok: true, supprimees: supprimerConfigPerso(u.userId!, req.params.app!)});
  });

  // GET /:app — dump de tous les settings d'une app, dans la portée demandée.
  router.get('/:app', (req, res) => {
    if (!appValide(req, res)) return;
    const app = req.params.app!;
    const scope = resoudreScopeDemande(req);
    const settings = dumpScope(app, PORTEE_UTILISATEURS);
    if (scope.kind === 'admin') {
      // Le socle reste la config des utilisateurs (tarifs, prétraitement OCR… ne sont pas
      // scopés), sur lequel on superpose le SEUL bloc fournisseur. Superposer tout le
      // `user_storage` de l'admin y verserait ses classes et ses DS — des kilo-octets de
      // données métier dans une réponse de configuration, à chaque changement d'onglet.
      const perso = dumpScope(app, scope);
      for (const [key, value] of Object.entries(perso)) {
        if (estCleFournisseur(key)) settings[key] = value;
      }
    }
    res.json({app, settings});
  });

  // PUT /:app/:key — upsert. Body: { value: any }
  router.put('/:app/:key', (req, res) => {
    if (!appValide(req, res)) return;
    if (!('value' in (req.body ?? {}))) {
      res.status(400).json({error: 'missing_value'});
      return;
    }
    const u = currentUser(req)!;
    const key = req.params.key!;
    ecrireScope(req.params.app!, key, req.body.value, resoudreScopeDemande(req, key), u.userId!);
    res.json({ok: true});
  });

  // POST /:app/test — pingue l'endpoint OpenAI-compatible (GET /v1/models) avec la clé fournie.
  // Body: { baseUrl, apiKey } — testée côté serveur, donc pas de CORS et la clé ne traverse pas
  // d'autres origines. Renvoie {ok, status, latency, modelCount?, detail?}.
  router.post('/:app/test', async (req, res) => {
    if (!appValide(req, res)) return;
    const baseUrl = String(req.body?.baseUrl ?? '').trim();
    const apiKey = String(req.body?.apiKey ?? '').trim();
    if (!baseUrl || !apiKey) {
      res.status(400).json({error: 'missing', hint: 'baseUrl et apiKey sont requis pour le test'});
      return;
    }
    try {
      const parsed = new URL(baseUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        res.status(400).json({error: 'invalid_url', hint: 'http(s) uniquement'});
        return;
      }
      // Anti-SSRF : le test part du serveur avec l'en-tête Authorization — on ne
      // sonde que les hôtes fournisseurs connus (+ PROBE_ALLOWED_HOSTS pour un
      // fournisseur personnalisé).
      if (!isProbeHostAllowed(parsed.hostname)) {
        res.status(400).json({
          error: 'host_not_allowed',
          hint: `Hôte non autorisé pour le test : ${parsed.hostname}. Fournisseur personnalisé ? Ajouter l'hôte à PROBE_ALLOWED_HOSTS dans le .env.`,
        });
        return;
      }
    } catch {
      res.status(400).json({error: 'invalid_url'});
      return;
    }

    // L'URL de listing et les en-têtes dépendent du fournisseur (Copilot ≠ OpenAI-compatible
    // standard) — délégué à `modelsProbe` pour rester aligné sur le client correcteur.
    const {url, headers} = modelsProbe(baseUrl, apiKey);
    const start = Date.now();
    try {
      const r = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
      const latency = Date.now() - start;
      const text = await r.text().catch(() => '');
      if (!r.ok) {
        res.json({
          ok: false,
          status: r.status,
          latency,
          detail: text.slice(0, 400) || r.statusText,
        });
        return;
      }
      // On extrait à la fois le count (rétro-compat) et la liste des IDs triés,
      // pour permettre au frontend de peupler le menu des modèles disponibles côté
      // fournisseur (évite les typos sur les noms : mistral-medium-2604, etc.).
      // Lecture déléguée à `parseModelsResponse` — partagée avec le catalogue, et testée.
      const models = parseModelsResponse(text);
      res.json({
        ok: true,
        status: r.status,
        latency,
        modelCount: models.length > 0 ? models.length : null,
        models,
      });
    } catch (e) {
      const latency = Date.now() - start;
      res.json({ok: false, latency, detail: (e as Error).message});
    }
  });

  // GET /:app/models — catalogue du fournisseur de l'app, dans la portée demandée. Servi depuis
  // la base, re-sondé paresseusement s'il a dépassé le TTL. Permet à la console de peupler ses
  // menus SANS que l'admin ait à tester la clé au préalable.
  //
  // `?scope=admin` sonde le fournisseur de la config perso : sans ça, la console proposerait à
  // l'admin les modèles du fournisseur des invités, qui n'existent pas chez le sien.
  router.get('/:app/models', async (req, res) => {
    if (!appValide(req, res)) return;
    try {
      const scope = resoudreScopeDemande(req, 'corrector_model_catalog');
      const {catalog, refreshed, applied} = await ensureCatalog(req.params.app!, {scope});
      res.json({...catalog, refreshed, applied});
    } catch (e) {
      res.status(500).json({error: 'catalog_failed', detail: (e as Error).message});
    }
  });

  // POST /:app/models/refresh — force la sonde (bouton « Rafraîchir le catalogue »).
  router.post('/:app/models/refresh', async (req, res) => {
    if (!appValide(req, res)) return;
    try {
      const scope = resoudreScopeDemande(req, 'corrector_model_catalog');
      const {catalog, applied} = await ensureCatalog(req.params.app!, {force: true, scope});
      res.json({...catalog, refreshed: true, applied});
    } catch (e) {
      res.status(500).json({error: 'catalog_failed', detail: (e as Error).message});
    }
  });

  // DELETE /:app/:key
  router.delete('/:app/:key', (req, res) => {
    if (!appValide(req, res)) return;
    const key = req.params.key!;
    if (!supprimerScope(req.params.app!, key, resoudreScopeDemande(req, key))) {
      res.status(404).json({error: 'not_found'});
      return;
    }
    res.json({ok: true});
  });

  return router;
}
