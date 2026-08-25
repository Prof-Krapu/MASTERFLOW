/**
 * Catalogue de modèles fournisseur — détection automatique.
 *
 * Pourquoi ce module existe : le catalogue d'OpenCode Go change périodiquement, et il était
 * figé en dur des deux côtés (`PROVIDER_PRESETS.opencode_go.models` ici, `lib/opencode-models.ts`
 * dans les sous-apps). Le fichier des sous-apps affirmait même que « L'API OpenCode Go ne
 * fournit pas d'endpoint /models » — sondé le 2026-07-26, c'est FAUX :
 * `GET https://opencode.ai/zen/go/v1/models` répond 200 et renvoie 23 modèles.
 *
 * Trois couches, par ordre de confiance décroissant :
 *   1. disponibilité — `GET {baseUrl}/v1/models` (via `modelsProbe`) : la seule source qui dise
 *      ce que le plan sert RÉELLEMENT aujourd'hui, mais qui ne donne que des ids ;
 *   2. capacités — `models.dev/api.json`, le registre officiel d'OpenCode : vision, reasoning,
 *      température réglable, contexte, coût ;
 *   3. repli — heuristique de nom, pour qu'un catalogue ne soit JAMAIS vide (un menu vide
 *      rendrait les Réglages d'un correcteur inutilisables).
 *
 * Module plain-TS sans dépendance Express/DB : c'est ce qui le rend testable par `npm test`
 * (cf. l'en-tête de `lib/model-routing.ts` — ce dépôt n'a pas de test de rendu React).
 * Les entrées/sorties réseau vivent dans `server/model-catalog-service.ts`.
 */

import {MODEL_TASKS, type ModelRouting, type ModelTaskKey} from './model-routing.ts';

// ============================================================
// Types
// ============================================================

/** D'où vient l'information de capacité, de la plus sûre à la moins sûre. */
export type ModelInfoSource = 'models.dev' | 'sonde' | 'heuristique';

export interface ModelInfo {
  id: string;
  name?: string;
  /**
   * Autres noms sous lesquels le fournisseur accepte CE modèle. Albert en publie deux familles :
   * l'ancien id complet (`mistralai/Mistral-Small-3.2-24B-Instruct-2506`) et un alias de rôle
   * (`openweight-medium`). Sans eux, un simple renommage côté fournisseur ferait passer une
   * configuration parfaitement valide pour une rupture de routage — vérifié le 2026-07-28, où
   * DINUM a renommé six modèles en gardant les anciens noms fonctionnels.
   */
  aliases?: string[];
  vision: boolean;
  reasoning: boolean;
  /**
   * Appels d'outils natifs (API `tools`). Renseigné UNIQUEMENT quand une source le DÉCLARE
   * (models.dev `tool_call`) — jamais par heuristique de nom, contrairement à `vision` : un
   * faux positif coûterait un 400 à chaque tour, alors qu'un modèle non déclaré retombe
   * simplement sur le protocole textuel, qui fonctionne partout.
   *
   * `undefined` = la source ne l'a pas déclaré (≠ « déclaré non supporté ») ; les deux
   * mènent au transport textuel, mais la distinction reste lisible à l'inspection.
   */
  toolCalls?: boolean;
  /**
   * `false` = le modèle NE répond PAS à `/chat/completions` : il a un endpoint dédié
   * (`mistral-ocr` → `/v1/ocr`, embeddings, transcription, modération). Renseigné uniquement
   * quand le fournisseur le déclare (`capabilities.completion_chat`). `undefined` = inconnu,
   * traité comme « probablement conversationnel », à charge pour l'heuristique de nom
   * (`TRANSCRIPTION_SEULE_RE`) de rattraper les cas connus.
   */
  chat?: boolean;
  /**
   * `false` = la température n'est pas réglable côté fournisseur. Piège vérifié sur Kimi K3 :
   * toute valeur ≠ 1 renvoie 400. models.dev expose l'information, on la propage.
   */
  temperature: boolean;
  contextLimit?: number;
  outputLimit?: number;
  /** Dollars par million de tokens, tels que publiés par models.dev. */
  cost?: {input: number; output: number};
  source: ModelInfoSource;
}

export interface ProviderCatalog {
  baseUrl: string;
  fetchedAt: number;
  models: ModelInfo[];
  /**
   * `true` = la sonde de disponibilité a échoué, le contenu vient du repli statique. Un
   * catalogue dégradé ne dit RIEN de fiable sur ce que le fournisseur sert : il ne doit
   * déclencher ni bascule automatique, ni avertissement « modèle inconnu ».
   */
  degraded: boolean;
}

/** Sous-ensemble utilisé de `models.dev/api.json` (le reste des champs est ignoré). */
export interface ModelsDevModel {
  id?: string;
  name?: string;
  reasoning?: boolean;
  /** Appels d'outils natifs (champ `tool_call` de models.dev). */
  tool_call?: boolean;
  temperature?: boolean;
  modalities?: {input?: string[]; output?: string[]};
  limit?: {context?: number; input?: number; output?: number};
  cost?: {input?: number; output?: number};
}

export interface ModelsDevProvider {
  id?: string;
  name?: string;
  api?: string | null;
  models?: Record<string, ModelsDevModel>;
}

export type ModelsDevIndex = Record<string, ModelsDevProvider>;

// ============================================================
// Couche 1 — lecture de la réponse /v1/models
// ============================================================

/**
 * Ce qu'une réponse `GET /v1/models` dit d'un modèle, au-delà de son seul id.
 *
 * Tous les champs sauf `id` sont optionnels : la plupart des fournisseurs OpenAI-compatibles
 * ne renvoient que `{id, object, owned_by}`. Albert, lui, publie `type`, `aliases` et
 * `max_context_length` — c'est-à-dire une information de CAPACITÉ de première main, alors
 * qu'Albert est justement absent de models.dev et n'avait donc que l'heuristique de nom.
 */
export interface ProbeModel {
  id: string;
  aliases: string[];
  /** Vocabulaire Hugging Face repris par Albert : `text-generation`, `image-text-to-text`… */
  type?: string;
  contextLimit?: number;
  /** Capacités déclarées modèle par modèle (bloc `capabilities` de Mistral). */
  capabilities?: ProbeCapabilities;
}

/**
 * Capacités qu'un fournisseur déclare LUI-MÊME dans `GET /v1/models`.
 *
 * Relevé sur Mistral le 2026-08-04 : chaque modèle porte un bloc `capabilities`
 * (`completion_chat`, `vision`, `ocr`, `reasoning`, `function_calling`…). C'est la source la
 * plus sûre qui existe — plus sûre que models.dev, qui ne connaît pas la moitié du catalogue,
 * et sans commune mesure avec un motif de nom.
 *
 * `chat: false` est l'information décisive : elle identifie les modèles à ENDPOINT DÉDIÉ
 * (`mistral-ocr` → `/v1/ocr`, `mistral-embed`, `voxtral`, la modération). Ce sont exactement
 * ceux qu'un `/chat/completions` renvoie en 400, et ceux qu'une substitution automatique ne
 * doit jamais confondre avec un modèle de conversation, dans un sens comme dans l'autre.
 */
export interface ProbeCapabilities {
  /** Le modèle répond-il à `/chat/completions` ? `false` = endpoint dédié. */
  chat?: boolean;
  vision?: boolean;
  reasoning?: boolean;
  toolCalls?: boolean;
  /** Le fournisseur expose un endpoint OCR dédié pour ce modèle. */
  ocr?: boolean;
}

/**
 * Types de modèles qui ne sont pas des modèles de CHAT : les envoyer à `/chat/completions`
 * échoue, exactement comme `mistral-ocr` chez Mistral. Ils n'ont donc rien à faire dans un
 * catalogue qui sert à peupler les menus « modèle » et les listes de candidats.
 */
const TYPES_HORS_CHAT = new Set([
  'text-embeddings-inference',
  'text-classification',
  'automatic-speech-recognition',
]);

/** Types qui acceptent une image EN ENTRÉE. */
const TYPES_VISION = new Set(['image-text-to-text', 'image-to-text', 'any-to-any']);

/** Types texte-seul du même vocabulaire — déclarés, donc pas de vision à deviner. */
const TYPES_TEXTE = new Set(['text-generation', 'text2text-generation', 'text-to-text']);

/**
 * Le `type` de la sonde relève-t-il du vocabulaire Hugging Face qu'on sait lire ?
 *
 * Garde-fou vérifié le 2026-08-04 : Mistral renvoie `type: "base"` sur ses 51 modèles — une
 * taxinomie d'ENTRAÎNEMENT (base / fine-tuned), pas de tâche. Interprété comme un type HF, il
 * signifiait « pas de vision » pour tout modèle absent de models.dev, `mistral-ocr` compris —
 * l'une des raisons pour lesquelles la bascule du 2026-08-04 a écarté tous les OCR.
 * Hors vocabulaire connu, le champ est ignoré : on retombe sur l'heuristique de nom.
 */
function typeExploitable(type: string | undefined): type is string {
  return !!type && (TYPES_VISION.has(type) || TYPES_TEXTE.has(type) || TYPES_HORS_CHAT.has(type));
}

/**
 * Lit une réponse `GET /v1/models` en conservant tout ce qu'elle porte, triée et dédupliquée
 * par id. Accepte `{data: [...]}` comme un tableau nu : GitHub Copilot renvoie l'une ou
 * l'autre forme selon les jours (cf. `fetchCopilotModels` des sous-apps).
 * Ne jette jamais : un corps non-JSON donne une liste vide, à l'appelant d'en tirer les
 * conséquences (statut HTTP 2xx mais catalogue vide = fournisseur exotique, pas une panne).
 */
/**
 * Traduit le bloc `capabilities` d'une réponse `/v1/models` (nommage Mistral) en champs
 * internes. Ne retient que les booléens réellement présents : un champ absent doit rester
 * `undefined` (= « le fournisseur n'a rien dit »), jamais `false`.
 */
function lireCapacites(brut: unknown): ProbeCapabilities | undefined {
  if (!brut || typeof brut !== 'object') return undefined;
  const c = brut as Record<string, unknown>;
  const bool = (k: string): boolean | undefined => (typeof c[k] === 'boolean' ? (c[k] as boolean) : undefined);
  const caps: ProbeCapabilities = {
    chat: bool('completion_chat'),
    vision: bool('vision'),
    reasoning: bool('reasoning'),
    toolCalls: bool('function_calling'),
    ocr: bool('ocr'),
  };
  return Object.values(caps).some((v) => v !== undefined) ? caps : undefined;
}

export function parseModelsCatalog(text: string): ProbeModel[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as {data?: unknown})?.data)
      ? ((parsed as {data: unknown[]}).data)
      : [];
  const parId = new Map<string, ProbeModel>();
  for (const row of rows) {
    const brut = row as {
      id?: unknown;
      aliases?: unknown;
      type?: unknown;
      max_context_length?: unknown;
      capabilities?: unknown;
    };
    const id = typeof brut?.id === 'string' ? brut.id.trim() : '';
    if (!id || parId.has(id)) continue;
    parId.set(id, {
      id,
      aliases: Array.isArray(brut.aliases)
        ? brut.aliases.filter((a): a is string => typeof a === 'string' && a.trim() !== '').map((a) => a.trim())
        : [],
      type: typeof brut.type === 'string' && brut.type.trim() ? brut.type.trim() : undefined,
      contextLimit:
        typeof brut.max_context_length === 'number' && brut.max_context_length > 0
          ? brut.max_context_length
          : undefined,
      capabilities: lireCapacites(brut.capabilities),
    });
  }
  return [...parId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Ids seuls — pour les appelants qui n'ont besoin que de « qu'est-ce qui est servi ». */
export function parseModelsResponse(text: string): string[] {
  return parseModelsCatalog(text).map((m) => m.id);
}

// ============================================================
// Couche 2 — correspondance vers models.dev
// ============================================================

/**
 * baseUrl → identifiant de fournisseur dans `models.dev/api.json`.
 *
 * Table EXPLICITE, et non dérivée du champ `api` de models.dev, pour deux raisons vérifiées :
 *   - `api` vaut `null` chez mistral, openai, groq et google — la dérivation les raterait tous ;
 *   - `opencode.ai` porte DEUX fournisseurs distincts : `/zen/go/v1` (plan Go, 23 modèles) et
 *     `/zen/v1` (plan complet, 59 modèles). D'où l'ordre : préfixes de chemin d'abord, du plus
 *     spécifique au moins spécifique, puis correspondance par hôte.
 *
 * `albert.api.etalab.gouv.fr` est volontairement absent : Albert n'est pas référencé par
 * models.dev, ses capacités relèvent donc de la couche 3.
 */
const MODELS_DEV_BY_PATH: Array<{prefix: string; provider: string}> = [
  {prefix: 'https://opencode.ai/zen/go', provider: 'opencode-go'},
  {prefix: 'https://opencode.ai/zen', provider: 'opencode'},
];

const MODELS_DEV_BY_HOST: Record<string, string> = {
  'api.kimi.com': 'kimi-for-coding',
  'api.githubcopilot.com': 'github-copilot',
  'api.mistral.ai': 'mistral',
  'api.openai.com': 'openai',
  'api.groq.com': 'groq',
  'api.deepseek.com': 'deepseek',
  'openrouter.ai': 'openrouter',
  'open.bigmodel.cn': 'zhipuai',
};

export function resolveModelsDevProvider(baseUrl: string): string | null {
  const stripped = baseUrl.trim().replace(/\/+$/, '').toLowerCase();
  if (!stripped) return null;
  for (const {prefix, provider} of MODELS_DEV_BY_PATH) {
    if (stripped === prefix || stripped.startsWith(`${prefix}/`)) return provider;
  }
  let hostname: string;
  try {
    hostname = new URL(stripped).hostname;
  } catch {
    return null;
  }
  return MODELS_DEV_BY_HOST[hostname] ?? null;
}

// ============================================================
// Couche 3 — heuristiques de nom (dernier recours)
// ============================================================

/**
 * Miroir de `VISION_MODEL_RE` des sous-apps (`lib/api-client.ts`), à ceci près que `minimax`
 * en est RETIRÉ : models.dev confirme que `minimax-m2.5` et `m2.7` sont texte seul, seul `m3`
 * est multimodal — la regex des sous-apps les classait tous vision, à tort.
 * `\bk3\b` couvre Kimi K3, multimodal mais dont l'id ne contient pas « kimi ».
 */
// `mistral-small-[23]` et non `mistral-small-2` : Albert sert
// `mistralai/Mistral-Small-3.2-24B-Instruct-2506`, bel et bien multimodal, que l'ancien
// motif ratait — Albert etant absent de models.dev, l'heuristique est son seul recours.
const VISION_HEURISTIC =
  /gpt-4o|gpt-4\.1|gpt-5|chatgpt-4o|o3|o4|mistral-(medium|large)|mistral-small-[23]|pixtral|magistral|gemini|glm-4\.?\d*v|claude-(3|4|sonnet|opus|fable)|llama-4|grok|qwen[\d.]*-?(vl|plus|max)|minimax-m3|kimi|mimo-v2-omni|mimo-v2\.5\b|\bk3\b/;

// `gpt-oss` : le modèle de correction d'Albert renvoie bel et bien un champ `reasoning` et
// accepte `reasoning_effort` (sondé le 2026-07-28) — il était classé « sans raisonnement »
// alors que les correcteurs lui envoient `reasoning_effort: high` depuis le premier jour.
const REASONING_HEURISTIC =
  /o3|o4|gpt-5|gpt-oss|reasoning|thinking|magistral|deepseek-(r|v4)|glm-[5-9]|minimax|kimi|mimo|qwen[\d.]*-?(plus|max)|grok|claude-(opus|sonnet|fable)|\bk3\b/;

export function guessVision(modelId: string): boolean {
  return VISION_HEURISTIC.test(modelId.toLowerCase());
}

export function guessReasoning(modelId: string): boolean {
  return REASONING_HEURISTIC.test(modelId.toLowerCase());
}

// ============================================================
// Distillation
// ============================================================

/** Vision au sens strict : le modèle accepte une image EN ENTRÉE. */
function modelsDevVision(m: ModelsDevModel): boolean {
  return (m.modalities?.input ?? []).includes('image');
}

/**
 * Construit le catalogue à partir des couches disponibles.
 *
 * Ordre de confiance, du plus sûr au moins sûr :
 *   1. le bloc `capabilities` de la sonde, quand le fournisseur le publie (Mistral) : c'est
 *      lui qui parle de ses propres modèles, modèle par modèle. Il est appliqué EN DERNIER,
 *      par-dessus les autres couches, pour ne pas perdre les coûts et les limites de
 *      models.dev tout en corrigeant les capacités ;
 *   2. models.dev, quand le fournisseur y est référencé ;
 *   3. le champ `type` de la sonde, s'il relève du vocabulaire Hugging Face (Albert) ;
 *   4. l'heuristique de nom, dernier recours.
 *
 * Les modèles dont le `type` n'est pas conversationnel (embeddings, reranker, transcription)
 * sont ÉCARTÉS : ce catalogue peuple les menus « modèle » et les listes de candidats chat,
 * et un embedding proposé pour une correction ne peut produire qu'un 400.
 *
 * @param live      modèles renvoyés par la sonde (couche 1), en `ProbeModel` ou en simples ids.
 *                  Fait autorité sur la DISPONIBILITÉ : un modèle absent d'ici n'apparaît pas,
 *                  même si models.dev le connaît.
 * @param devModels bloc `models` du fournisseur models.dev (couche 2), ou `null`.
 * @param fallback  catalogue statique du fournisseur (couche 3), utilisé pour les noms lisibles
 *                  et comme source unique quand `live` est vide.
 */
export function distillCatalog(
  live: Array<string | ProbeModel>,
  devModels: Record<string, ModelsDevModel> | null,
  fallback: ModelInfo[] = [],
): ModelInfo[] {
  const fallbackById = new Map(fallback.map((m) => [m.id, m]));
  const sondes: ProbeModel[] =
    live.length > 0
      ? live.map((m) => (typeof m === 'string' ? {id: m, aliases: []} : m))
      : fallback.map((m) => ({id: m.id, aliases: m.aliases ?? []}));

  return sondes
    .filter((s) => !(s.type && TYPES_HORS_CHAT.has(s.type)))
    .map((sonde) => appliquerCapacites(distillerUn(sonde, devModels, fallbackById), sonde.capabilities))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Un modèle sondé, résolu par les couches models.dev / type / heuristique. */
function distillerUn(
  sonde: ProbeModel,
  devModels: Record<string, ModelsDevModel> | null,
  fallbackById: Map<string, ModelInfo>,
): ModelInfo {
  const {id, aliases, type, contextLimit} = sonde;
  const alias = aliases.length > 0 ? {aliases} : {};
  const dev = devModels?.[id];
  if (dev) {
    return {
      id,
      ...alias,
      name: dev.name || fallbackById.get(id)?.name || id,
      vision: modelsDevVision(dev),
      reasoning: dev.reasoning === true,
      toolCalls: dev.tool_call === true,
      // Absent chez certains fournisseurs : on considère la température réglable par
      // défaut, c'est le comportement OpenAI-compatible standard.
      temperature: dev.temperature !== false,
      contextLimit: dev.limit?.context ?? contextLimit,
      outputLimit: dev.limit?.output,
      cost:
        typeof dev.cost?.input === 'number' && typeof dev.cost?.output === 'number'
          ? {input: dev.cost.input, output: dev.cost.output}
          : undefined,
      source: 'models.dev',
    };
  }
  // Couche 1 bis : le fournisseur a déclaré un type QU'ON SAIT LIRE. Il ne dit rien du
  // raisonnement, qui reste heuristique — mais sur la vision, sa parole vaut mieux qu'un
  // motif de nom. Un type hors vocabulaire (`base` chez Mistral) ne dit rien : cf.
  // `typeExploitable`.
  if (typeExploitable(type)) {
    return {
      id,
      ...alias,
      name: fallbackById.get(id)?.name || id,
      vision: TYPES_VISION.has(type),
      reasoning: guessReasoning(id),
      // Le fournisseur ne dit rien des outils : inconnu = transport textuel.
      temperature: true,
      contextLimit,
      source: 'sonde',
    };
  }
  // Modèle servi mais inconnu du registre (vérifié : `hy3-preview` est dans ce cas).
  // On ne le fait surtout pas disparaître du menu : on le dégrade proprement.
  const known = fallbackById.get(id);
  if (known) {
    return {
      ...known,
      ...alias,
      contextLimit: known.contextLimit ?? contextLimit,
      source: known.source === 'models.dev' ? 'sonde' : known.source,
    };
  }
  return {
    id,
    ...alias,
    name: id,
    vision: guessVision(id),
    reasoning: guessReasoning(id),
    temperature: true,
    contextLimit,
    source: 'heuristique',
  };
}

/**
 * Applique par-dessus tout ce que le fournisseur a DÉCLARÉ pour ce modèle précis.
 *
 * Écrase même models.dev : sur `mistral-medium-3.5` ou `mistral-ocr-2512`, absents du
 * registre, c'est la seule source exacte. Un champ que le fournisseur n'a pas renseigné
 * laisse la valeur déjà calculée intacte.
 */
function appliquerCapacites(info: ModelInfo, caps: ProbeCapabilities | undefined): ModelInfo {
  if (!caps) return info;
  const declare = caps.vision !== undefined || caps.reasoning !== undefined || caps.chat !== undefined;
  return {
    ...info,
    vision: caps.vision ?? info.vision,
    reasoning: caps.reasoning ?? info.reasoning,
    toolCalls: caps.toolCalls ?? info.toolCalls,
    chat: caps.chat ?? info.chat,
    source: declare && info.source === 'heuristique' ? 'sonde' : info.source,
  };
}

/**
 * Tous les noms sous lesquels le fournisseur accepte les modèles de ce catalogue : ids ET alias.
 *
 * C'est la clé de comparaison à utiliser partout où l'on se demande « ce modèle configuré
 * est-il encore servi ? ». Comparer au seul `id` ferait passer un renommage pour une
 * disparition (2026-07-28 sur Albert).
 */
export function servedNames(catalog: ProviderCatalog): Set<string> {
  const noms = new Set<string>();
  for (const m of catalog.models) {
    noms.add(m.id);
    for (const a of m.aliases ?? []) noms.add(a);
  }
  return noms;
}

/**
 * Le catalogue indexé par nom accepté — ids d'abord, alias ensuite et SANS écraser un id.
 *
 * L'ordre n'est pas cosmétique. Chez Mistral, `mistral-medium-2604` est à la fois un id
 * (multimodal, décrit par models.dev) et un alias d'une demi-douzaine d'autres lignes
 * (`mistral-vibe-cli-with-tools`…, décrites par la seule heuristique). En une seule passe,
 * la dernière ligne alphabétique l'emportait : le 2026-08-04, le repli OCR pourtant
 * parfaitement valide `mistral-medium-2604` a été rejeté comme « pas multimodal », et la
 * substitution est allée chercher `mistral-large-2512` beaucoup plus loin.
 */
export function indexServed(catalog: ProviderCatalog): Map<string, ModelInfo> {
  const parNom = new Map<string, ModelInfo>();
  for (const m of catalog.models) parNom.set(m.id, m);
  for (const m of catalog.models) {
    for (const a of m.aliases ?? []) if (!parNom.has(a)) parNom.set(a, m);
  }
  return parNom;
}

// ============================================================
// Dérive
// ============================================================

export interface CatalogDiff {
  added: string[];
  removed: string[];
}

export function diffCatalog(previous: ProviderCatalog | null, next: ProviderCatalog): CatalogDiff {
  const before = new Set((previous?.models ?? []).map((m) => m.id));
  const after = new Set(next.models.map((m) => m.id));
  return {
    added: [...after].filter((id) => !before.has(id)).sort(),
    removed: [...before].filter((id) => !after.has(id)).sort(),
  };
}

export interface RoutingBreakage {
  task: ModelTaskKey;
  /** Modèle primaire configuré, qui n'est plus servi. */
  model: string;
  /** La tâche envoie-t-elle des images ? Contraint le choix du substitut. */
  needsVision: boolean;
}

/** Les tâches qui envoient des images : le substitut DOIT être multimodal. */
const VISION_TASKS: ReadonlySet<ModelTaskKey> = new Set<ModelTaskKey>(['ocr', 'correction']);

/**
 * Modèles qui transcrivent au lieu d'obéir : ils ne distinguent pas la consigne du contenu.
 *
 * Sondé le 2026-07-28 sur `lightonocr-2-1b` (alias `openweight-ocr` chez Albert) : la
 * transcription est bonne et rapide, mais la réponse RECOPIE la consigne système en tête.
 * Or la route OCR des correcteurs porte désormais les consignes `[SCHEMA]` / `[CROQUIS]` :
 * ce modèle les injecterait dans le texte du corrigé et de la copie. Même mode de défaut que
 * l'endpoint dédié `/v1/ocr` de Mistral, qui ne lit aucune consigne.
 *
 * Ils restent visibles dans le catalogue — un professeur peut vouloir en choisir un
 * délibérément — mais ne doivent jamais être élus AUTOMATIQUEMENT comme substitut.
 */
const TRANSCRIPTION_SEULE_RE = /lightonocr|mistral-ocr|whisper/i;

/**
 * Tâches dont le modèle primaire a disparu du catalogue — c'est-à-dire dont les appels
 * partent déjà en erreur côté fournisseur.
 *
 * Renvoie systématiquement `[]` sur un catalogue dégradé : quand la sonde a échoué, on ne
 * sait pas ce qui est servi, et réécrire une configuration sur cette base ferait plus de
 * dégâts que la panne qu'on prétend réparer.
 */
export function detectRoutingBreakage(
  routing: ModelRouting | undefined,
  catalog: ProviderCatalog,
): RoutingBreakage[] {
  if (!routing || catalog.degraded || catalog.models.length === 0) return [];
  const served = servedNames(catalog);
  const out: RoutingBreakage[] = [];
  for (const {key} of MODEL_TASKS) {
    const primary = routing[key]?.primary?.trim();
    if (!primary || served.has(primary)) continue;
    out.push({task: key, model: primary, needsVision: VISION_TASKS.has(key)});
  }
  return out;
}

// ============================================================
// Confirmation d'absence
// ============================================================

/** Modèles configurés constatés absents, et depuis quand : `{modèle: date du 1er constat}`. */
export type AbsenceLedger = Readonly<Record<string, number>>;

/**
 * Deux constats successifs avant toute réécriture de configuration.
 *
 * Une réponse `/v1/models` n'est pas un contrat : le 2026-08-04 à 11:31, Mistral a servi 50
 * modèles sans `mistral-ocr-latest`, et 51 avec quinze minutes plus tard. Une seule réponse
 * HTTP avait suffi à réécrire irréversiblement la configuration de 9 correcteurs.
 *
 * Un modèle absent pour la première fois est ENREGISTRÉ et signalé, sans rien changer ; il
 * n'est réputé retiré qu'au constat suivant. Un modèle revenu sort du registre — l'incident
 * s'est refermé tout seul et ne doit pas compter comme premier constat la fois d'après.
 *
 * @returns `confirmes` = ceux dont l'absence est établie, `ledger` = registre à persister.
 */
export function confirmAbsences(
  connues: AbsenceLedger,
  absents: readonly string[],
  now: number,
): {confirmes: Set<string>; ledger: AbsenceLedger} {
  const confirmes = new Set<string>();
  const ledger: Record<string, number> = {};
  for (const model of absents) {
    const depuis = connues[model];
    ledger[model] = depuis ?? now;
    if (depuis !== undefined) confirmes.add(model);
  }
  return {confirmes, ledger};
}

// ============================================================
// Substitution
// ============================================================

/**
 * Famille d'un modèle : le préfixe alphabétique avant le premier chiffre.
 * `kimi-k2.5` et `kimi-k3` → `kimi-k` ; `mimo-v2-omni` et `mimo-v2.5` → `mimo-v` ;
 * `glm-5.1` → `glm`. La valeur absolue importe peu, seule sa stabilité compte : elle sert
 * uniquement à préférer un successeur de la même lignée.
 *
 * Le suffixe mouvant (`-latest`, `-preview`) est retiré d'abord : sans cela
 * `mistral-ocr-latest`, qui ne contient aucun chiffre, formait sa propre famille et n'était
 * apparenté ni à `mistral-ocr-2512` ni à `mistral-ocr-4-0` (incident du 2026-08-04).
 */
export function modelFamily(id: string): string {
  const lower = id.toLowerCase().replace(/[-._](latest|preview)$/, '');
  const cut = lower.search(/\d/);
  return (cut === -1 ? lower : lower.slice(0, cut)).replace(/[-._]+$/, '');
}

/** Numéros de version présents dans l'id, comparés composante par composante. */
function versionKey(id: string): number[] {
  return (id.toLowerCase().match(/\d+/g) ?? []).map(Number);
}

function compareVersions(a: string, b: string): number {
  const va = versionKey(a);
  const vb = versionKey(b);
  for (let i = 0; i < Math.max(va.length, vb.length); i += 1) {
    const diff = (vb[i] ?? -1) - (va[i] ?? -1);
    if (diff !== 0) return diff; // décroissant : la version la plus récente d'abord
  }
  return 0;
}

/**
 * Modèle à ENDPOINT DÉDIÉ : il ne répond pas à `/chat/completions`.
 *
 * Deux sources, dans cet ordre : ce que le fournisseur déclare (`capabilities.completion_chat`,
 * publié par Mistral), puis le motif de nom pour ceux qui ne déclarent rien (Albert).
 */
function estEndpointDedie(info: ModelInfo): boolean {
  return info.chat === false || TRANSCRIPTION_SEULE_RE.test(info.id);
}

/**
 * Choisit un remplaçant pour un modèle disparu.
 *
 * Deux mondes qui ne communiquent PAS : les modèles de conversation et ceux à endpoint dédié
 * (`mistral-ocr` → `/v1/ocr`, transcription, embeddings). Remplacer l'un par l'autre change le
 * protocole d'appel, donc le comportement — c'est ce qui s'est produit le 2026-08-04, où
 * `mistral-ocr-latest` (momentanément absent de la liste Mistral) a été remplacé par
 * `mistral-large-2512`, abandonnant l'endpoint OCR au profit d'un chat-vision plus cher.
 *
 * Ordre de préférence pour un modèle de conversation :
 *   1. un repli déjà configuré pour la tâche, s'il est encore servi (c'est le choix de l'admin) ;
 *   2. sinon, la version la plus récente de la MÊME famille, à capacité suffisante ;
 *   3. sinon, le modèle de plus grand contexte parmi ceux qui ont la capacité requise.
 *
 * Pour un modèle à endpoint dédié : uniquement un autre modèle dédié de la même lignée, la
 * version la plus récente. Rien d'autre — `null` sinon.
 *
 * `null` si rien ne convient — l'appelant doit alors alerter SANS rien réécrire.
 */
export function pickSubstitute(
  model: string,
  catalog: ProviderCatalog,
  opts: {needsVision: boolean; fallbacks?: string[]},
): string | null {
  if (catalog.degraded) return null;
  const family = modelFamily(model);

  // Modèle à endpoint dédié disparu : seul un autre modèle dédié de la même lignée le
  // remplace. `needsVision` est délibérément ignoré — un modèle OCR n'est pas un modèle de
  // chat multimodal, et exiger de lui le drapeau vision reviendrait à n'accepter personne
  // chez les fournisseurs qui ne déclarent pas leurs capacités.
  if (TRANSCRIPTION_SEULE_RE.test(model)) {
    const memeLignee = catalog.models.filter(
      (m) => m.id !== model && estEndpointDedie(m) && modelFamily(m.id) === family,
    );
    if (memeLignee.length === 0) return null;
    return [...memeLignee].sort((a, b) => compareVersions(a.id, b.id))[0]!.id;
  }

  // Indexé par id ET par alias : un repli configuré sous l'ancien nom du fournisseur reste
  // un repli valide, et on renvoie alors l'id canonique.
  const served = indexServed(catalog);

  for (const candidate of opts.fallbacks ?? []) {
    const info = served.get(candidate.trim());
    if (info && !estEndpointDedie(info) && (!opts.needsVision || info.vision)) return info.id;
  }

  const eligible = catalog.models.filter(
    (m) => m.id !== model && (!opts.needsVision || m.vision) && !estEndpointDedie(m),
  );
  if (eligible.length === 0) return null;

  const sameFamily = eligible.filter((m) => modelFamily(m.id) === family);
  if (sameFamily.length > 0) {
    return [...sameFamily].sort((a, b) => compareVersions(a.id, b.id))[0]!.id;
  }

  return [...eligible].sort(
    (a, b) => (b.contextLimit ?? 0) - (a.contextLimit ?? 0) || a.id.localeCompare(b.id),
  )[0]!.id;
}

// ============================================================
// Péremption
// ============================================================

/** 6 h : le catalogue d'un fournisseur bouge à l'échelle de la semaine, pas de la minute. */
export const DEFAULT_CATALOG_TTL_MS = 6 * 60 * 60_000;

export function isCatalogStale(
  catalog: ProviderCatalog | null,
  now: number,
  ttlMs: number = DEFAULT_CATALOG_TTL_MS,
): boolean {
  if (!catalog) return true;
  // Un catalogue dégradé est toujours périmé : on retente à la première occasion.
  if (catalog.degraded) return true;
  return now - catalog.fetchedAt >= ttlMs;
}
