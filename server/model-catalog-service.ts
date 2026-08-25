/**
 * Rafraîchissement du catalogue de modèles — entrées/sorties.
 *
 * La logique pure (distillation, dérive, substitution) vit dans `lib/model-catalog.ts` et est
 * couverte par `tests/model-catalog.test.ts` ; ici on ne fait que du réseau et de la base.
 *
 * Persistance ET distribution : `global_settings` clé `corrector_model_catalog`, une ligne par
 * app. C'est volontairement la même table que le reste de la config, parce que
 * `GET /api/v1/storage/:app` en fait déjà un dump fusionné au bootstrap des sous-apps — les 11
 * correcteurs reçoivent donc le catalogue sans une ligne de plomberie supplémentaire.
 * `fetchedAt` étant dans le JSON, le TTL survit à un redémarrage du service.
 */

import {
  DEFAULT_CATALOG_TTL_MS,
  confirmAbsences,
  detectRoutingBreakage,
  distillCatalog,
  guessReasoning,
  guessVision,
  isCatalogStale,
  parseModelsCatalog,
  pickSubstitute,
  resolveModelsDevProvider,
  servedNames,
  type AbsenceLedger,
  type ModelInfo,
  type ProbeModel,
  type ModelsDevIndex,
  type ModelsDevModel,
  type ProviderCatalog,
} from '../lib/model-catalog.ts';
import {
  PROVIDER_PRESETS,
  inferPresetKey,
  normalizeRouting,
  type ModelRouting,
  type ModelTaskKey,
} from '../lib/model-routing.ts';
import {
  PORTEE_UTILISATEURS,
  ecrireScope,
  lireScope,
  listerPorteesPerso,
  porteeAdmin,
  type ConfigScope,
} from './config-scope.ts';
import {getDb, type GlobalSettingRow} from './db.ts';
import {dedupeProviderConfigs, type ProviderConfig} from './health-core.ts';
import {isProbeHostAllowed} from './probe-allowlist.ts';
import {decryptValueJson} from './secrets-at-rest.ts';
import {modelsProbe} from './models-probe.ts';
import {sondageApplicable, sonderOutils} from './tools-probe.ts';

export const CATALOG_KEY = 'corrector_model_catalog';

/**
 * Absences en attente de confirmation : `{modèle: date du premier constat}`.
 *
 * Une liste `/v1/models` n'est pas un contrat stable. Le 2026-08-04 à 11:31, Mistral a répondu
 * 50 modèles sans `mistral-ocr-latest` ; à 11:46, 51 modèles avec. Entre les deux, la bascule
 * automatique avait réécrit la configuration des 9 correcteurs Mistral — irréversiblement, sur
 * la foi d'UNE réponse HTTP. On exige donc désormais deux constats successifs avant toute
 * réécriture. Le premier ouvre un ticket et ne touche à rien : l'app continue de tourner (le
 * client bascule seul sur son repli au moment de l'appel), et une absence passagère se referme
 * toute seule.
 */
export const ABSENCES_KEY = 'corrector_model_absences';

const PROBE_TIMEOUT_MS = 15_000;
const MODELS_DEV_URL = 'https://models.dev/api.json';
/** Le registre bouge à l'échelle de la semaine, et pèse ~3 Mo : on le garde 24 h en mémoire. */
const MODELS_DEV_TTL_MS = 24 * 60 * 60_000;

function ttlMs(): number {
  const raw = Number(process.env.MODEL_CATALOG_TTL_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CATALOG_TTL_MS;
}

// ============================================================
// Couche 2 — registre models.dev
// ============================================================

let modelsDevCache: {fetchedAt: number; index: ModelsDevIndex} | null = null;

/**
 * Récupère `models.dev/api.json` (~3 Mo). Jamais servi tel quel à un navigateur : seul le
 * sous-ensemble distillé du fournisseur concerné est persisté puis distribué.
 * Ne jette jamais — l'absence de capacités dégrade le catalogue, elle ne le supprime pas.
 */
async function loadModelsDev(force = false): Promise<ModelsDevIndex | null> {
  if (!force && modelsDevCache && Date.now() - modelsDevCache.fetchedAt < MODELS_DEV_TTL_MS) {
    return modelsDevCache.index;
  }
  try {
    const res = await fetch(MODELS_DEV_URL, {
      headers: {Accept: 'application/json'},
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return modelsDevCache?.index ?? null;
    const index = (await res.json()) as ModelsDevIndex;
    modelsDevCache = {fetchedAt: Date.now(), index};
    return index;
  } catch {
    // Réseau coupé : on garde le dernier registre connu s'il y en a un.
    return modelsDevCache?.index ?? null;
  }
}

// ============================================================
// Couche 3 — repli statique
// ============================================================

/**
 * Catalogue de secours d'un fournisseur, construit à partir du `models` de son preset.
 * Garantit qu'un menu de modèles n'est jamais vide, même sonde et registre en échec.
 */
function fallbackCatalog(baseUrl: string): ModelInfo[] {
  const preset = PROVIDER_PRESETS[inferPresetKey(baseUrl) ?? ''];
  return (preset?.models ?? []).map((id) => ({
    id,
    name: id,
    vision: guessVision(id),
    reasoning: guessReasoning(id),
    temperature: true,
    source: 'heuristique' as const,
  }));
}

// ============================================================
// Rafraîchissement
// ============================================================

/**
 * Sonde un fournisseur et construit son catalogue.
 * `degraded: true` signifie « la sonde n'a rien donné » — aucune bascule automatique ne doit
 * être déclenchée sur cette base (cf. `detectRoutingBreakage`).
 */
export async function refreshCatalog(
  baseUrl: string,
  apiKey: string,
  connues: Map<string, boolean> = new Map(),
): Promise<ProviderCatalog> {
  const fallback = fallbackCatalog(baseUrl);
  const providerId = resolveModelsDevProvider(baseUrl);
  const devModels = async (): Promise<Record<string, ModelsDevModel> | null> => {
    if (!providerId) return null;
    const index = await loadModelsDev();
    return index?.[providerId]?.models ?? null;
  };
  // Repli : la DISPONIBILITÉ est inconnue, mais les capacités de la liste de secours peuvent
  // quand même venir du registre — mieux vaut un « vision » exact qu'un « vision » deviné.
  const degrade = async (): Promise<ProviderCatalog> => ({
    baseUrl,
    fetchedAt: Date.now(),
    models: reporterOutils(distillCatalog([], await devModels(), fallback), connues),
    degraded: true,
  });

  let hostname: string;
  try {
    const parsed = new URL(baseUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return degrade();
    hostname = parsed.hostname;
  } catch {
    return degrade();
  }
  // Même garde anti-SSRF que le test de clé : la sonde part du serveur avec l'en-tête
  // Authorization, on ne l'envoie qu'aux hôtes fournisseurs connus.
  if (!isProbeHostAllowed(hostname)) return degrade();

  // `ProbeModel[]` et non de simples ids : Albert publie `type`, `aliases` et
  // `max_context_length`, et c'est le seul fournisseur de la suite absent de models.dev —
  // jeter ces champs, c'est le condamner à l'heuristique de nom (cf. `distillCatalog`).
  let live: ProbeModel[] = [];
  try {
    const {url, headers} = modelsProbe(baseUrl, apiKey);
    const res = await fetch(url, {headers, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS)});
    if (!res.ok) return degrade();
    live = parseModelsCatalog(await res.text());
  } catch {
    return degrade();
  }
  if (live.length === 0) return degrade();

  const models = await completerOutils(
    baseUrl,
    apiKey,
    reporterOutils(distillCatalog(live, await devModels(), fallback), connues),
  );

  return {
    baseUrl,
    fetchedAt: Date.now(),
    models,
    degraded: false,
  };
}

/**
 * Remplit `toolCalls` pour les modèles dont PERSONNE n'a déclaré la capacité.
 *
 * Sans ça, un fournisseur muet sur ce point (Albert : rien dans `GET /v1/models`, et absent de
 * models.dev) voit tous ses modèles classés « sans outils », et les sous-apps servent
 * l'Assistant en transport TEXTUEL. Coût mesuré le 2026-08-13 : gpt-oss-120b y rate la
 * recherche web (2 cas sur 4), contre 3 sur 4 en natif.
 *
 * On ne sonde QUE l'inconnu : models.dev et les capacités déclarées par le fournisseur gardent
 * la main, et une sonde qui ne conclut pas laisse la valeur indéfinie — donc le textuel,
 * c'est-à-dire le comportement d'avant. Aucun risque non plus côté client : un modèle qui
 * refuserait le champ `tools` malgré la sonde déclenche le repli 400 déjà mémoïsé
 * (`disableToolsFor` de `lib/api-client.ts`), qui rejoue sans le champ.
 */
/**
 * Reporte les capacités d'outils DÉJÀ MESURÉES sur le catalogue reconstruit.
 *
 * Un rafraîchissement rebâtit `models[]` de zéro depuis `GET /v1/models`, qui chez Albert ne dit
 * rien des outils. `completerOutils` ne sonde ensuite QUE l'inconnu — et laisse la valeur
 * indéfinie quand la sonde n'aboutit pas. Sans ce report, une sonde en échec (quota, délai,
 * 429 en rafale pendant le balayage) EFFACE donc une capacité mesurée la veille, et l'Assistant
 * repart en transport textuel — où il raconte qu'il appelle les outils et invente les résultats.
 *
 * Constaté le 2026-08-15 : les 8 apps rafraîchies ce jour-là avaient perdu `toolCalls`, les 3
 * non rafraîchies l'avaient gardé. Le report ne fait que REMPLIR l'indéfini : une capacité
 * fraîchement déclarée par le fournisseur ou models.dev garde toujours la main.
 */
function reporterOutils(models: ModelInfo[], connues: Map<string, boolean>): ModelInfo[] {
  if (connues.size === 0) return models;
  return models.map((m) => {
    if (m.toolCalls !== undefined) return m;
    const v = connues.get(m.id);
    return v === undefined ? m : {...m, toolCalls: v, source: m.source === 'heuristique' ? 'sonde' : m.source};
  });
}

/**
 * Capacités d'outils déjà connues, relevées sur des catalogues précédents.
 *
 * Le filtre sur `baseUrl` est essentiel : une capacité mesurée chez un fournisseur ne dit RIEN
 * du même identifiant de modèle chez un autre.
 */
export function capacitesOutilsConnues(
  precedents: (ProviderCatalog | null | undefined)[],
  baseUrl: string,
): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const cat of precedents) {
    if (!cat || cat.baseUrl !== baseUrl) continue;
    for (const m of cat.models) {
      if (m.toolCalls !== undefined && !out.has(m.id)) out.set(m.id, m.toolCalls);
    }
  }
  return out;
}

async function completerOutils(
  baseUrl: string,
  apiKey: string,
  models: ModelInfo[],
): Promise<ModelInfo[]> {
  const aSonder = models.filter((m) => m.toolCalls === undefined && m.chat !== false).map((m) => m.id);
  if (aSonder.length === 0 || !sondageApplicable(baseUrl)) return models;

  let verdicts: Map<string, boolean | undefined>;
  try {
    verdicts = await sonderOutils(baseUrl, apiKey, aSonder);
  } catch {
    // Le catalogue vaut mieux sans cette capacité qu'avec une erreur : on rend tel quel.
    return models;
  }
  return models.map((m) => {
    const v = verdicts.get(m.id);
    return v === undefined ? m : {...m, toolCalls: v, source: m.source === 'heuristique' ? 'sonde' : m.source};
  });
}

// ============================================================
// Persistance
// ============================================================

/**
 * Lectures et écritures scopées : la même mécanique sert la config des utilisateurs
 * (`global_settings`) et la config perso d'un admin (`user_storage`). C'est indispensable ici et
 * pas seulement cosmétique — sonder le catalogue du fournisseur perso d'un admin en écrivant,
 * lui, dans `global_settings` réalignerait la configuration DES INVITÉS sur un fournisseur qui
 * n'est pas le leur, via la bascule automatique sur rupture ci-dessous.
 */
function readSetting(app: string, key: string, scope: ConfigScope = PORTEE_UTILISATEURS): unknown {
  return lireScope(app, key, scope);
}

function writeSetting(
  app: string,
  key: string,
  value: unknown,
  userId: string,
  scope: ConfigScope = PORTEE_UTILISATEURS,
): void {
  ecrireScope(app, key, value, scope, userId);
}

export function readCatalog(
  app: string,
  scope: ConfigScope = PORTEE_UTILISATEURS,
): ProviderCatalog | null {
  const raw = readSetting(app, CATALOG_KEY, scope) as ProviderCatalog | undefined;
  if (!raw || !Array.isArray(raw.models) || typeof raw.fetchedAt !== 'number') return null;
  return raw;
}

/**
 * Auteur des écritures automatiques : le plus ancien admin. La colonne `updated_by` de
 * `global_settings` et `user_id` de `feedback_tickets` sont des clés étrangères vers `users`,
 * un rafraîchissement au démarrage n'a donc pas le choix. `null` si aucun admin n'existe
 * encore (base fraîche) — dans ce cas on ne persiste rien plutôt que d'échouer.
 */
function systemUserId(): string | null {
  const row = getDb()
    .prepare<[], {id: string}>(
      "SELECT id FROM users WHERE role = 'admin' AND active = 1 ORDER BY created_at ASC LIMIT 1",
    )
    .get();
  return row?.id ?? null;
}

// ============================================================
// Bascule automatique sur rupture
// ============================================================

export interface AppliedSubstitution {
  task: ModelTaskKey | 'ocrModel' | 'chatModel';
  from: string;
  to: string;
}

/**
 * Rupture qu'on ne sait PAS réparer : le modèle configuré a disparu et aucun modèle servi
 * n'a la capacité requise (cas réel : un OCR sur Albert, dont aucun modèle n'est déclaré
 * multimodal). Silence interdit ici — sans alerte, l'app reste cassée sans que personne
 * ne le sache.
 */
export interface UnresolvedBreakage {
  task: ModelTaskKey | 'ocrModel' | 'chatModel';
  model: string;
  needsVision: boolean;
}

/**
 * Absence constatée pour la PREMIÈRE fois : signalée, mais rien n'est réécrit tant qu'une
 * seconde sonde ne l'a pas confirmée (cf. `ABSENCES_KEY`).
 */
export interface PendingBreakage {
  task: ModelTaskKey | 'ocrModel' | 'chatModel';
  model: string;
}

export interface BreakageOutcome {
  applied: AppliedSubstitution[];
  unresolved: UnresolvedBreakage[];
  pending: PendingBreakage[];
}

/**
 * Réaligne la configuration d'une app dont un modèle configuré n'est plus servi.
 *
 * Les deux champs de tête (`corrector_ocr_model`, `corrector_chat_model`) sont traités AVANT le
 * routage : une tâche sans surcharge en hérite (`buildFlatRouting`), donc corriger le routage
 * seul laisserait un champ de tête périmé que la console réappliquerait au prochain preset.
 *
 * Ne fait rien si le catalogue est dégradé : `detectRoutingBreakage` renvoie alors `[]`.
 */
export function applyBreakage(
  app: string,
  catalog: ProviderCatalog,
  userId: string,
  scope: ConfigScope = PORTEE_UTILISATEURS,
): BreakageOutcome {
  if (catalog.degraded || catalog.models.length === 0) {
    return {applied: [], unresolved: [], pending: []};
  }
  // Ids ET alias : un modèle simplement renommé par le fournisseur reste servi sous son
  // ancien nom, et n'a donc rien à réécrire (cf. `servedNames`).
  const served = servedNames(catalog);
  const applied: AppliedSubstitution[] = [];
  const unresolved: UnresolvedBreakage[] = [];
  const pending: PendingBreakage[] = [];

  let ocrModel = String(readSetting(app, 'corrector_ocr_model', scope) ?? '').trim();
  let chatModel = String(readSetting(app, 'corrector_chat_model', scope) ?? '').trim();
  const stored = readSetting(app, 'corrector_model_routing', scope) as
    | Partial<ModelRouting>
    | undefined;

  // Tout ce qui est configuré et plus servi, champs de tête ET routage — la liste doit être
  // complète AVANT la moindre réécriture, puisque c'est elle qui décide si l'on réécrit.
  const configures = [ocrModel, chatModel, ...Object.values(stored ?? {}).map((p) => p?.primary ?? '')];
  const absents = [...new Set(configures.filter((m) => m && !served.has(m)))];

  // Absences déjà constatées lors d'une sonde PRÉCÉDENTE ; celles qui ne sont pas reconduites
  // sortent du registre — le modèle est revenu, l'incident s'est refermé seul.
  const connues = readAbsences(app, scope);
  const {confirmes, ledger} = confirmAbsences(connues, absents, Date.now());

  /** Absence CONFIRMÉE ? Sinon on la signale et on ne touche à rien ce tour-ci. */
  const confirmee = (model: string, task: PendingBreakage['task']): boolean => {
    if (confirmes.has(model)) return true;
    pending.push({task, model});
    return false;
  };

  if (ocrModel && !served.has(ocrModel) && confirmee(ocrModel, 'ocrModel')) {
    const to = pickSubstitute(ocrModel, catalog, {needsVision: true});
    if (to) {
      applied.push({task: 'ocrModel', from: ocrModel, to});
      ocrModel = to;
      writeSetting(app, 'corrector_ocr_model', to, userId, scope);
    } else {
      unresolved.push({task: 'ocrModel', model: ocrModel, needsVision: true});
    }
  }
  if (chatModel && !served.has(chatModel) && confirmee(chatModel, 'chatModel')) {
    const to = pickSubstitute(chatModel, catalog, {needsVision: false});
    if (to) {
      applied.push({task: 'chatModel', from: chatModel, to});
      chatModel = to;
      writeSetting(app, 'corrector_chat_model', to, userId, scope);
    } else {
      unresolved.push({task: 'chatModel', model: chatModel, needsVision: false});
    }
  }

  if (!stored && applied.length === 0 && unresolved.length === 0) {
    writeAbsences(app, connues, ledger, userId, scope);
    return {applied, unresolved, pending};
  }

  const routing = normalizeRouting(stored, {
    ocrModel: ocrModel || catalog.models[0]!.id,
    chatModel: chatModel || catalog.models[0]!.id,
  });
  const next: ModelRouting = {...routing};
  let routingChanged = false;

  for (const rupture of detectRoutingBreakage(routing, catalog)) {
    if (!confirmee(rupture.model, rupture.task)) continue;
    const to = pickSubstitute(rupture.model, catalog, {
      needsVision: rupture.needsVision,
      fallbacks: routing[rupture.task].fallbacks,
    });
    if (!to) {
      unresolved.push({task: rupture.task, model: rupture.model, needsVision: rupture.needsVision});
      continue;
    }
    next[rupture.task] = {
      primary: to,
      // Un repli qui n'est plus servi n'a plus rien à faire dans la chaîne.
      fallbacks: routing[rupture.task].fallbacks.filter((f) => served.has(f) && f !== to),
    };
    applied.push({task: rupture.task, from: rupture.model, to});
    routingChanged = true;
  }

  if (routingChanged || (applied.length > 0 && stored)) {
    writeSetting(app, 'corrector_model_routing', next, userId, scope);
  }
  writeAbsences(app, connues, ledger, userId, scope);
  return {applied, unresolved, pending};
}

/** Absences déjà constatées pour cette app, purgées de tout contenu illisible. */
function readAbsences(app: string, scope: ConfigScope): AbsenceLedger {
  const brut = readSetting(app, ABSENCES_KEY, scope);
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return {};
  const out: Record<string, number> = {};
  for (const [model, ts] of Object.entries(brut as Record<string, unknown>)) {
    if (typeof ts === 'number' && Number.isFinite(ts)) out[model] = ts;
  }
  return out;
}

/** N'écrit que si l'ensemble a changé — inutile de réveiller `updated_at` à chaque sonde. */
function writeAbsences(
  app: string,
  avant: AbsenceLedger,
  apres: AbsenceLedger,
  userId: string,
  scope: ConfigScope,
): void {
  const memes =
    Object.keys(avant).length === Object.keys(apres).length &&
    Object.keys(apres).every((k) => avant[k] === apres[k]);
  if (memes) return;
  writeSetting(app, ABSENCES_KEY, apres, userId, scope);
}

/**
 * Ouvre un ticket dans l'Inbox admin existante. Réservé aux ruptures : la dérive simple
 * (nouveaux modèles, capacité modifiée) s'affiche dans la console et n'a pas à saturer
 * la boîte de réception des retours utilisateurs.
 *
 * Couvre les DEUX cas — réparé automatiquement, et non réparable. Le second est le plus
 * important : l'app est cassée et rien ne peut la réparer sans arbitrage humain.
 */
function openDriftTicket(
  app: string,
  userId: string,
  outcome: BreakageOutcome,
  scope: ConfigScope = PORTEE_UTILISATEURS,
): void {
  const {applied, unresolved, pending} = outcome;
  const parts: string[] = [];
  // Sans cette mention, un ticket de dérive sur la config PERSO d'un admin serait lu comme une
  // panne côté invités — et on irait chercher le problème dans la mauvaise configuration.
  if (scope.kind === 'admin') parts.push('sur une configuration personnelle d’admin');
  if (pending.length > 0) {
    parts.push(
      `absence CONSTATÉE, rien n'a été modifié — ${pending
        .map((p) => `${p.task} : ${p.model}`)
        .join(' ; ')} → confirmation attendue à la prochaine sonde (une liste de modèles peut ` +
        'être passagèrement incomplète)',
    );
  }
  if (applied.length > 0) {
    parts.push(
      `réalignés automatiquement — ${applied.map((s) => `${s.task} : ${s.from} → ${s.to}`).join(' ; ')}`,
    );
  }
  if (unresolved.length > 0) {
    parts.push(
      `SANS REMPLAÇANT POSSIBLE — ${unresolved
        .map((u) => `${u.task} : ${u.model}${u.needsVision ? ' (aucun modèle multimodal servi)' : ''}`)
        .join(' ; ')} → intervention requise`,
    );
  }
  getDb()
    .prepare(
      `INSERT INTO feedback_tickets
         (user_id, app, kind, ts, step, model, category, message, context_json)
       VALUES (?, ?, 'error', ?, 'catalogue-modeles', ?, 'derive-fournisseur', ?, ?)`,
    )
    .run(
      userId,
      app,
      Date.now(),
      (applied[0]?.to ?? unresolved[0]?.model ?? pending[0]?.model ?? '').slice(0, 120),
      `Modèle(s) retiré(s) par le fournisseur : ${parts.join(' | ')}`.slice(0, 4000),
      JSON.stringify(outcome).slice(0, 4000),
    );
}

// ============================================================
// Orchestration
// ============================================================

/** Y a-t-il quelque chose à porter à la connaissance de l'admin ? */
function aSignaler(o: BreakageOutcome): boolean {
  return o.applied.length > 0 || o.unresolved.length > 0 || o.pending.length > 0;
}

export interface EnsureResult {
  catalog: ProviderCatalog;
  refreshed: boolean;
  applied: AppliedSubstitution[];
  unresolved: UnresolvedBreakage[];
  pending: PendingBreakage[];
}

/**
 * Catalogue d'une app : celui en base s'il est frais, sinon une sonde.
 * `force` court-circuite le TTL (bouton « Rafraîchir » de la console).
 */
export async function ensureCatalog(
  app: string,
  opts: {force?: boolean; scope?: ConfigScope} = {},
): Promise<EnsureResult> {
  const scope = opts.scope ?? PORTEE_UTILISATEURS;
  const cached = readCatalog(app, scope);
  if (!opts.force && !isCatalogStale(cached, Date.now(), ttlMs())) {
    return {catalog: cached!, refreshed: false, applied: [], unresolved: [], pending: []};
  }

  const baseUrl = String(readSetting(app, 'corrector_base_url', scope) ?? '').trim();
  const apiKey = String(readSetting(app, 'corrector_api_key', scope) ?? '').trim();
  if (!baseUrl || !apiKey) {
    return {
      catalog: cached ?? {baseUrl, fetchedAt: Date.now(), models: [], degraded: true},
      refreshed: false,
      applied: [],
      unresolved: [],
      pending: [],
    };
  }

  // Le catalogue en cache porte les capacités d'outils déjà mesurées : on les transmet pour
  // qu'une sonde en échec ne les efface pas (cf. `reporterOutils`).
  const catalog = await refreshCatalog(baseUrl, apiKey, capacitesOutilsConnues([cached], baseUrl));
  // L'écriture d'une portée perso est signée par son propriétaire ; celle de la portée
  // utilisateurs par le plus ancien admin (`global_settings.updated_by` est une clé étrangère).
  const userId = scope.kind === 'admin' ? scope.userId : systemUserId();
  if (!userId) return {catalog, refreshed: true, applied: [], unresolved: [], pending: []};

  writeSetting(app, CATALOG_KEY, catalog, userId, scope);
  const outcome = applyBreakage(app, catalog, userId, scope);
  if (aSignaler(outcome)) openDriftTicket(app, userId, outcome, scope);
  return {catalog, refreshed: true, ...outcome};
}

/**
 * Une cible de balayage : une app ET la portée à laquelle appartient sa configuration.
 * `dedupeProviderConfigs` raisonne sur un `app: string` — on y encode donc la portée, puis on la
 * redécode à l'écriture. Deux portées sur le même fournisseur ne comptent ainsi que pour UNE
 * sonde, ce qui est tout l'intérêt du regroupement.
 */
function encodeCible(app: string, scope: ConfigScope): string {
  return scope.kind === 'users' ? app : `${app} ${scope.userId}`;
}

function decodeCible(cible: string): {app: string; scope: ConfigScope} {
  const i = cible.indexOf(' ');
  if (i < 0) return {app: cible, scope: PORTEE_UTILISATEURS};
  return {app: cible.slice(0, i), scope: porteeAdmin(cible.slice(i + 1))};
}

/**
 * Rafraîchit toutes les configurations en service : les 11 apps côté utilisateurs, plus les
 * configurations personnelles d'admin actives. Les 11 correcteurs ne pointent en pratique que
 * sur 2-3 fournisseurs distincts : on sonde une fois par couple (baseUrl, clé) — regroupement
 * déjà écrit et testé pour la route santé — puis on écrit le résultat sur chaque cible du groupe.
 *
 * Les clés du résultat sont des slugs d'app : une dérive constatée sur une config perso remonte
 * donc sous le nom de sa matière, et son ticket précise la portée.
 */
export async function refreshAllCatalogs(): Promise<Record<string, BreakageOutcome>> {
  const rows = getDb()
    .prepare<[], GlobalSettingRow>(
      "SELECT * FROM global_settings WHERE key IN ('corrector_base_url', 'corrector_api_key')",
    )
    .all();
  const parCible = new Map<string, {baseUrl?: string; apiKey?: string}>();
  for (const row of rows) {
    const entry = parCible.get(row.app) ?? {};
    try {
      const value = JSON.parse(decryptValueJson(row.value_json)) as string;
      if (row.key === 'corrector_base_url') entry.baseUrl = value;
      else entry.apiKey = value;
    } catch {
      /* valeur illisible : app ignorée */
    }
    parCible.set(row.app, entry);
  }

  for (const {userId, app} of listerPorteesPerso()) {
    const scope = porteeAdmin(userId);
    const baseUrl = readSetting(app, 'corrector_base_url', scope);
    const apiKey = readSetting(app, 'corrector_api_key', scope);
    if (typeof baseUrl !== 'string' || typeof apiKey !== 'string') continue;
    parCible.set(encodeCible(app, scope), {baseUrl, apiKey});
  }

  const configs: ProviderConfig[] = [...parCible.entries()].map(([cible, cfg]) => ({
    app: cible,
    baseUrl: cfg.baseUrl ?? '',
    apiKey: cfg.apiKey ?? '',
  }));

  const systeme = systemUserId();
  const out: Record<string, BreakageOutcome> = {};
  if (!systeme) return out;

  for (const group of dedupeProviderConfigs(configs)) {
    // On relève l'acquis sur TOUTES les cibles du groupe, pas seulement la première : il suffit
    // qu'une app ait gardé la capacité mesurée pour que le groupe entier en profite.
    const precedents = group.apps.map((cible) => {
      const {app, scope} = decodeCible(cible);
      return readCatalog(app, scope);
    });
    const catalog = await refreshCatalog(
      group.baseUrl,
      group.apiKey,
      capacitesOutilsConnues(precedents, group.baseUrl),
    );
    for (const cible of group.apps) {
      const {app, scope} = decodeCible(cible);
      const userId = scope.kind === 'admin' ? scope.userId : systeme;
      writeSetting(app, CATALOG_KEY, catalog, userId, scope);
      const outcome = applyBreakage(app, catalog, userId, scope);
      if (aSignaler(outcome)) {
        openDriftTicket(app, userId, outcome, scope);
        out[app] = outcome;
      }
    }
  }
  return out;
}
