/**
 * Routage LLM par tâche — miroir testable de `ModelRoutingConfig` des sous-apps
 * (`<fork>/lib/api-client.ts`).
 *
 * Extrait de `src/pages/admin/ApiConfigPanel.tsx` pour deux raisons :
 * 1. ce dépôt n'a pas de test de rendu React, donc tout ce qui n'est pas dans un module
 *    plain-TS échappe à `npm test` — c'est exactement comme ça que la clé `assistant` a pu
 *    manquer pendant des mois sans qu'aucun test ne le voie ;
 * 2. les presets et les constructeurs de routage sont de la donnée + des fonctions pures,
 *    ils n'ont rien à faire dans un composant.
 *
 * RÈGLE : les sept tâches doivent rester alignées sur `ModelRoutingTask` des sous-apps.
 * Une clé oubliée ici n'explose pas — `normalizeModelRouting()` côté sous-app la remplit
 * silencieusement à partir du modèle chat — mais elle devient inconfigurable, et pire,
 * un routage écrit d'ici ÉCRASE la surcharge posée dans les Réglages d'un correcteur.
 * `tests/model-routing.test.ts` est la garde.
 */

export interface ModelTaskPolicy {
  primary: string;
  fallbacks: string[];
}

export interface ModelRouting {
  ocr: ModelTaskPolicy;
  bareme: ModelTaskPolicy;
  correction: ModelTaskPolicy;
  studentChat: ModelTaskPolicy;
  profile: ModelTaskPolicy;
  /**
   * Sorties JSON courtes et structurées (normalisation CSV, extraction de barème).
   * SÉPARÉE de `profile` le 2026-07-30 : les deux partageaient une route, alors qu'elles
   * n'ont pas les mêmes contraintes — `structure` veut un modèle de code, `profile` rédige
   * des textes lus par des familles. Cf. le préréglage `albert`.
   */
  structure: ModelTaskPolicy;
  assistant: ModelTaskPolicy;
}

export type ModelTaskKey = keyof ModelRouting;

/**
 * Libellés repris à l'identique de `MODEL_TASKS` des sous-apps
 * (`<fork>/components/SettingsDialog.tsx`) : l'admin doit retrouver le même vocabulaire
 * dans la console et dans les Réglages d'un correcteur.
 */
export const MODEL_TASKS: Array<{key: ModelTaskKey; label: string; helper: string}> = [
  {key: 'ocr', label: 'OCR corrigé', helper: 'Lecture du corrigé et vision principale.'},
  {key: 'bareme', label: 'Préparation barème', helper: 'Extraction du barème structuré.'},
  {key: 'correction', label: 'Correction copie', helper: 'Correction principale des copies élèves.'},
  {key: 'studentChat', label: 'Chat élève', helper: 'Chat pédagogique dans le dashboard élève.'},
  {
    key: 'profile',
    label: 'Profil / évolution',
    helper: 'Synthèses, appréciations de bulletin et analyses d’évolution.',
  },
  {
    key: 'structure',
    label: 'Extraction structurée',
    helper: 'Normalisation CSV des noms et extraction de barème (sortie JSON courte).',
  },
  {
    key: 'assistant',
    label: 'Assistant pédagogique',
    helper: 'Chatbot de préparation de cours, d’évaluations et de corrigés.',
  },
];

/** De quel champ (Modèle OCR / Modèle chat) chaque tâche hérite quand elle est « par défaut ». */
export const DEFAULT_TASK_MODEL: Record<ModelTaskKey, 'ocr' | 'chat'> = {
  ocr: 'ocr',
  bareme: 'chat',
  correction: 'chat',
  studentChat: 'chat',
  profile: 'chat',
  structure: 'chat',
  assistant: 'chat',
};

export const EMPTY_TASK_OVERRIDES: Record<ModelTaskKey, boolean> = {
  ocr: false,
  bareme: false,
  correction: false,
  studentChat: false,
  profile: false,
  structure: false,
  assistant: false,
};

export const policy = (primary: string, fallbacks: string[] = []): ModelTaskPolicy => ({
  primary,
  fallbacks,
});

/** Routage « à plat » : OCR sur son modèle, les six autres tâches sur le modèle chat. */
export function buildFlatRouting(ocrModel: string, chatModel: string): ModelRouting {
  return {
    ocr: policy(ocrModel),
    bareme: policy(chatModel),
    correction: policy(chatModel),
    studentChat: policy(chatModel),
    profile: policy(chatModel),
    structure: policy(chatModel),
    assistant: policy(chatModel),
  };
}

function dedupe(models: string[], primary: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of models) {
    const t = m.trim();
    if (!t || t === primary || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function normalizePolicy(p: Partial<ModelTaskPolicy> | undefined, fallbackPrimary: string): ModelTaskPolicy {
  const primary = p?.primary?.trim() || fallbackPrimary;
  return {primary, fallbacks: dedupe(p?.fallbacks ?? [], primary)};
}

/**
 * Complète un routage partiel (ou hérité d'une version antérieure du schéma) à partir des
 * deux modèles par défaut. Même sémantique que `normalizeModelRouting()` des sous-apps —
 * les deux doivent donner le même résultat sur la même entrée.
 */
export function normalizeRouting(
  routing: Partial<ModelRouting> | undefined,
  defaults: {ocrModel: string; chatModel: string},
): ModelRouting {
  const base = buildFlatRouting(defaults.ocrModel, defaults.chatModel);
  return {
    ocr: normalizePolicy(routing?.ocr, base.ocr.primary),
    bareme: normalizePolicy(routing?.bareme, base.bareme.primary),
    correction: normalizePolicy(routing?.correction, base.correction.primary),
    studentChat: normalizePolicy(routing?.studentChat, base.studentChat.primary),
    profile: normalizePolicy(routing?.profile, base.profile.primary),
    // Un routage écrit avant le 2026-07-30 n'a pas de clé `structure` : elle hérite du
    // modèle chat, PAS de `profile`. C'est volontaire ici (fonction pure, sans contexte
    // fournisseur) ; la reprise de l'existant est le travail de
    // `scripts/migrate-routing-structure.ts`, qui sait, lui, que `profile` portait le CSV.
    structure: normalizePolicy(routing?.structure, base.structure.primary),
    assistant: normalizePolicy(routing?.assistant, base.assistant.primary),
  };
}

/**
 * Routage effectif à enregistrer : une tâche sans surcharge suit le champ par défaut
 * (et perd ses éventuels replis), une tâche surchargée garde ce que l'admin a saisi.
 * Transposition de `buildEffectiveModelRouting()` des sous-apps.
 */
export function buildEffectiveRouting(
  ocrModel: string,
  chatModel: string,
  routing: ModelRouting,
  overrides: Record<ModelTaskKey, boolean>,
): ModelRouting {
  const normalized = normalizeRouting(routing, {ocrModel, chatModel});
  const flat = buildFlatRouting(ocrModel, chatModel);
  const out = {} as ModelRouting;
  for (const {key} of MODEL_TASKS) {
    out[key] = overrides[key] ? normalized[key] : flat[key];
  }
  return out;
}

/**
 * Déduit quelles tâches portent une surcharge dans un routage déjà stocké : primaire
 * différent du modèle par défaut, ou au moins un repli. Sert à rouvrir la console dans
 * l'état où l'admin l'a laissée (ou dans l'état posé par un `seed-*.ts`).
 */
export function detectTaskOverrides(
  routing: ModelRouting | undefined,
  defaults: {ocrModel: string; chatModel: string},
): Record<ModelTaskKey, boolean> {
  if (!routing) return {...EMPTY_TASK_OVERRIDES};
  const out = {...EMPTY_TASK_OVERRIDES};
  for (const {key} of MODEL_TASKS) {
    const p = routing[key];
    if (!p) continue;
    const inherited = DEFAULT_TASK_MODEL[key] === 'ocr' ? defaults.ocrModel : defaults.chatModel;
    out[key] = (p.fallbacks?.length ?? 0) > 0 || (p.primary ?? '').trim() !== inherited.trim();
  }
  return out;
}

// ============================================================
// Presets fournisseur
// ============================================================

/**
 * Presets pour PRÉ-REMPLIR le formulaire (miroir des `PROVIDER_PRESETS` des sous-apps).
 * Purement optionnel : baseUrl et modèles restent toujours libres (n'importe quel
 * fournisseur OpenAI-compatible reste configurable à la main). La clé API n'est jamais
 * incluse dans un preset.
 *
 * - `routing` : défini UNIQUEMENT pour les fournisseurs à routage par tâche intrinsèque
 *   (Mistral 2 voies, Albert 3 voies, Kimi avec repli). Sinon `applyPreset` construit un
 *   routage à plat à partir des deux champs.
 * - `models` : catalogue d'AMORÇAGE, proposé tant que la sonde n'a rien renvoyé. La liste qui
 *   fait foi est celle du catalogue live (`server/model-catalog-service.ts`, GET /v1/models
 *   enrichi par models.dev), rafraîchie toute seule et persistée en base — un fournisseur
 *   comme OpenCode Go change périodiquement de LLM, une liste écrite ici pourrit.
 *   Saisie libre conservée dans tous les cas.
 */
export interface ProviderPreset {
  label: string;
  baseUrl: string;
  ocrModel: string;
  chatModel: string;
  sttModel?: string;
  reasoningEffort?: 'low' | 'medium' | 'high';
  routing?: ModelRouting;
  models?: string[];
}

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  github_copilot: {
    label: 'GitHub Copilot',
    baseUrl: 'https://api.githubcopilot.com',
    ocrModel: 'gpt-4o',
    chatModel: 'gpt-5',
    // Catalogue Copilot courant (cf. FALLBACK_COPILOT_MODELS des sous-apps). Le live
    // /v1/models (Tester la clé) ajoute le reste, dont gpt-5.4 si dispo sur le compte.
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-pro',
      'gpt-5.1-codex',
      'gpt-5.4',
      'o3-mini',
      'o4-mini',
      'claude-3.5-sonnet',
      'claude-sonnet-4',
      'claude-opus-4',
      'gemini-2.5-pro',
    ],
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com',
    ocrModel: 'gpt-4o',
    chatModel: 'gpt-4o',
    sttModel: 'whisper-1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-5', 'gpt-5-mini', 'o3', 'o4-mini'],
  },
  mistral: {
    label: 'Mistral AI',
    baseUrl: 'https://api.mistral.ai',
    // Id CANONIQUE daté d'OCR 3, et non l'alias `mistral-ocr-latest` : le 2026-08-04, Mistral
    // a retiré cet alias de `GET /v1/models` pendant un quart d'heure (le temps d'y publier
    // `mistral-ocr-4-0`), et la bascule automatique a réaligné les 9 correcteurs sur un
    // chat-vision. La ligne `mistral-ocr-latest` est revenue depuis — mais isolée, sans alias
    // vers une version connue : rien n'y dit QUELLE version elle sert.
    ocrModel: 'mistral-ocr-2512',
    chatModel: 'mistral-medium-2604',
    sttModel: 'voxtral-mini-latest',
    reasoningEffort: 'high',
    // Replis identiques à ceux de scripts/seed-mistral.ts : mieux vaut une correction par
    // mistral-small qu'un échec sec si mistral-medium est en 429/503/timeout (audit
    // 2026-07-11, P1 — `fallbacks: []` = point unique de panne).
    routing: {
      // Repli chat-vision volontaire : `mistral-ocr` n'existe que derrière /v1/ocr, le client
      // retombe alors sur l'OCR par chat multimodal (cf. `ocrChatCandidates` des sous-apps).
      ocr: {primary: 'mistral-ocr-2512', fallbacks: ['mistral-medium-2604']},
      bareme: {primary: 'mistral-medium-2604', fallbacks: ['mistral-small-latest']},
      correction: {primary: 'mistral-medium-2604', fallbacks: ['mistral-small-latest']},
      studentChat: {primary: 'mistral-medium-2604', fallbacks: ['mistral-small-latest']},
      profile: {primary: 'mistral-medium-2604', fallbacks: ['mistral-small-latest']},
      structure: {primary: 'mistral-medium-2604', fallbacks: ['mistral-small-latest']},
      assistant: {primary: 'mistral-medium-2604', fallbacks: ['mistral-small-latest']},
    },
    models: [
      'mistral-ocr-2512',
      'mistral-medium-2604',
      'mistral-large-latest',
      'mistral-small-latest',
      'magistral-medium-latest',
      'pixtral-large-latest',
    ],
  },
  albert: {
    label: 'Albert (DINUM/Etalab)',
    baseUrl: 'https://albert.api.etalab.gouv.fr',
    // IDs CANONIQUES relevés sur GET /v1/models le 2026-07-28. DINUM a renommé sa gamme ce
    // jour-là en gardant les anciens noms (`mistralai/Mistral-Small-3.2-…`) et des alias de
    // rôle (`openweight-medium`) fonctionnels — c'est `servedNames` de lib/model-catalog.ts
    // qui les reconnaît, pour qu'un renommage ne passe plus pour une rupture de routage.
    // On configure les ids canoniques et non les alias de rôle : un alias de rôle re-pointé
    // changerait le modèle de correction en SILENCE, sans alerte ni trace.
    ocrModel: 'mistral-small-3-2-24b-instruct-2506',
    chatModel: 'openai/gpt-oss-120b',
    sttModel: 'openai/whisper-large-v3',
    reasoningEffort: 'high',
    // Split 4 voies : OCR vision (Mistral-Small-3.2), correction/barème/chat/assistant
    // (gpt-oss-120b, raisonnement), textes rédactionnels sur l'élève (Mistral-Small-3.2),
    // extraction structurée (deepseek-v4-flash). Replis croisés sur des pools de quota
    // distincts, comme scripts/seed-albert.ts.
    routing: {
      // Repli OCR enfin possible : `ministral-3-8b-instruct-2512` est déclaré
      // `image-text-to-text` par Albert et transcrit réellement une page (sondé 2026-07-28).
      // Sa transcription est DÉGRADÉE (titre halluciné, prime perdu sur f'(x)) — c'est un
      // filet, jamais un primaire, mais un OCR imparfait vaut mieux qu'une correction qui
      // n'a pas lieu. `lightonocr-2-1b` est écarté : il recopie la consigne système dans sa
      // sortie et polluerait le texte du corrigé (cf. TRANSCRIPTION_SEULE_RE).
      ocr: {primary: 'mistral-small-3-2-24b-instruct-2506', fallbacks: ['ministral-3-8b-instruct-2512']},
      bareme: {primary: 'openai/gpt-oss-120b', fallbacks: ['mistral-small-3-2-24b-instruct-2506']},
      correction: {primary: 'openai/gpt-oss-120b', fallbacks: ['mistral-small-3-2-24b-instruct-2506']},
      studentChat: {primary: 'openai/gpt-oss-120b', fallbacks: ['mistral-small-3-2-24b-instruct-2506']},
      // Textes RÉDACTIONNELS sur l'élève, lus par des collègues et des familles :
      // appréciations de bulletin (`appreciation.ts`), synthèses de classe et d'élève
      // (`ai-summary.ts`), profil du chat élève (`student-chat.ts`).
      //
      // Sorti de deepseek-v4-flash le 2026-07-30 pour deux raisons cumulées : DINUM écrit
      // « nous ne recommandons pas d'utiliser ce modèle pour d'autres usages que le code »,
      // et deepseek est en PHASE DE TEST révocable au 2026-10-01 — mistral-small-3-2 est un
      // modèle général, hors phase de test. Mesuré 3/3 sur les trois routes aux budgets
      // RÉELS du code (3 000 / 1 500 / 800 tokens), sortie propre, aucun raisonnement.
      //
      // ⚠ Le primaire n'est SURTOUT PAS gpt-oss-120b, malgré son rang de plus gros modèle
      // servi : son raisonnement est décompté de `max_tokens`, donc il meurt sur les petits
      // budgets. Mesuré le 2026-07-30 : 2/3 sur l'appréciation de bulletin — un essai revenu
      // VIDE (`finish_reason: length`) après 8 606 caractères de raisonnement — et 0/3 sur le
      // profil du chat élève à 800 tokens. Même famille de panne que `roster.ts` ci-dessous.
      //
      // ⚠ Le repli n'est PLUS ministral-3-8b : il n'avait été validé que sur le CSV. Sur ces
      // trois routes il rend 0/3 sur `ai-summary` (trop bavard, `finish_reason: length`) et,
      // sur l'appréciation, il imbrique un objet JSON DANS le champ `appreciation` — JSON
      // valide, bulletin illisible. deepseek reste le meilleur filet mesuré (3/3 partout) :
      // gardé en repli, jamais en primaire.
      profile: {primary: 'mistral-small-3-2-24b-instruct-2506', fallbacks: ['deepseek-v4-flash']},
      // Sorties JSON COURTES et structurées : normalisation CSV des noms (`roster.ts`) et
      // extraction de barème des jumeaux (`pipeline.ts`). C'est exactement l'usage « code »
      // que DINUM recommande pour deepseek-v4-flash (524 288 de contexte, gratuit), et le seul
      // que la mesure couvre : classe de 30 noms difficiles (particules, composés,
      // diacritiques, ordres inversés), prompt et budget RÉELS de `roster.ts` — 3/3 essais
      // parfaits, 30/30 entrées, 30/30 alignées POSITIONNELLEMENT (`normalizeNamesWithLLM`
      // apparie `items[index]` par rang : un ordre non respecté assignerait silencieusement
      // le mauvais nom à un élève), 30/30 NOM en majuscules.
      //
      // ⚠ Ne JAMAIS lui envoyer `reasoning_effort` en même temps que `response_format:
      // json_object` — 3 réponses JSON valides sur 8 (accolade parasite en tête), contre 8/8
      // dès qu'on retire l'un des deux. Garde posée dans `chatDetailed` des sous-apps.
      //
      // ⚠ Le repli n'est SURTOUT PAS gpt-oss-120b : `roster.ts` alloue `200 + n × 60` tokens,
      // soit 2 000 pour une classe de 30, et le raisonnement de gpt-oss les épuise avant
      // d'écrire quoi que ce soit — mesuré 0/3, `finish_reason: length`, contenu VIDE.
      // `ministral-3-8b` n'a pas de raisonnement, répond en 2 s, et rend 29/30 (il a écrit
      // « DE VIES » pour « De Vries ») : un secours imparfait, mais un secours qui répond.
      //
      // ⚠ Révocable au 2026-10-01 (fin de phase de test DINUM). C'est la SEULE route de la
      // suite qui dépend encore d'un modèle en test — d'où la détection de rupture.
      //
      // ⚠ La BUILD change sous le même id. Le 2026-08-13, DINUM a remplacé la preview
      // d'avril par la sortie officielle `deepseek-ai/DeepSeek-V4-Flash-0731` : seuls
      // l'alias (suffixe de date) et le contexte (393 216 → 524 288) l'ont signalé. Les
      // mesures datées ci-dessus portent donc sur une build qui n'est plus servie ; celles
      // rejouées le 13/08 (bug d'accolade 2/8, correction longue) valent pour la 0731.
      // Toute annonce de redéploiement impose de re-mesurer, jamais de citer l'ancienne.
      structure: {primary: 'deepseek-v4-flash', fallbacks: ['ministral-3-8b-instruct-2512']},
      assistant: {primary: 'openai/gpt-oss-120b', fallbacks: ['mistral-small-3-2-24b-instruct-2506']},
    },
    // Modèles de CHAT servis par Albert. Les embeddings (`bge-m3`, `qwen3-vl-embedding-8b`),
    // le reranker et Whisper en sont volontairement absents : ils rendent un 400 sur
    // /chat/completions (cf. TYPES_HORS_CHAT). Liste d'amorçage — le catalogue live fait foi.
    // `qwen3-coder-30b-A3b-instruct` y reste tant qu'il est servi (un professeur peut encore
    // le choisir), mais AUCUNE route n'y pointe : DINUM va le déprécier au profit de
    // deepseek-v4-flash.
    models: [
      'mistral-small-3-2-24b-instruct-2506',
      'openai/gpt-oss-120b',
      'deepseek-v4-flash',
      'qwen3-coder-30b-A3b-instruct',
      'ministral-3-8b-instruct-2512',
      'lightonocr-2-1b',
    ],
  },
  zai: {
    label: 'Z.AI (Zhipu AI)',
    baseUrl: 'https://open.bigmodel.cn',
    ocrModel: 'glm-4.6v',
    chatModel: 'glm-5.1',
    models: ['glm-4.6v', 'glm-5.1', 'glm-4-plus'],
  },
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    ocrModel: 'deepseek-chat',
    chatModel: 'deepseek-chat',
    models: ['deepseek-chat', 'deepseek-reasoner'],
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api',
    ocrModel: 'openai/gpt-4o-mini',
    chatModel: 'openai/gpt-4o-mini',
    models: ['openai/gpt-4o', 'openai/gpt-4o-mini', 'anthropic/claude-sonnet-4', 'google/gemini-2.5-pro'],
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    ocrModel: 'llama-4-scout-17b-16e-instruct',
    chatModel: 'llama-4-scout-17b-16e-instruct',
    sttModel: 'whisper-large-v3',
    models: ['llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile'],
  },
  opencode_go: {
    label: 'OpenCode Go',
    baseUrl: 'https://opencode.ai/zen/go',
    ocrModel: 'mimo-v2-omni',
    chatModel: 'minimax-m2.7',
    // AMORÇAGE UNIQUEMENT — relevé le 2026-07-26 sur GET /zen/go/v1/models. OpenCode Go
    // change périodiquement de LLM : la liste qui fait foi est celle du catalogue live
    // (`server/model-catalog-service.ts`), celle-ci ne sert que de repli hors ligne.
    models: [
      'deepseek-v4-flash',
      'deepseek-v4-pro',
      'glm-5',
      'glm-5.1',
      'glm-5.2',
      'grok-4.5',
      'hy3',
      'hy3-preview',
      'kimi-k2.5',
      'kimi-k2.6',
      'kimi-k2.7-code',
      'kimi-k3',
      'mimo-v2-omni',
      'mimo-v2-pro',
      'mimo-v2.5',
      'mimo-v2.5-pro',
      'minimax-m2.5',
      'minimax-m2.7',
      'minimax-m3',
      'qwen3.5-plus',
      'qwen3.6-plus',
      'qwen3.7-max',
      'qwen3.7-plus',
    ],
  },
  kimi: {
    label: 'Kimi (Moonshot AI)',
    // Le segment /coding est OBLIGATOIRE (api.kimi.com/v1 -> 404) et la baseUrl reste
    // SANS /v1 : modelsProbe / getChatEndpoint ajoutent le suffixe.
    baseUrl: 'https://api.kimi.com/coding',
    // K3 multimodal : sert l'OCR/vision (schemas) ET la correction.
    ocrModel: 'k3',
    chatModel: 'k3',
    // Raisonnement toujours actif cote Kimi ; 'high' est le defaut serveur.
    reasoningEffort: 'high',
    // Repli sur K2.7 Coding (multimodal lui aussi) si K3 est sature : le quota est partage
    // entre tous les appareils/cles sur une fenetre glissante de 5 h. Aligne sur seed-kimi.ts.
    routing: {
      ocr: {primary: 'k3', fallbacks: ['kimi-for-coding']},
      bareme: {primary: 'k3', fallbacks: ['kimi-for-coding']},
      correction: {primary: 'k3', fallbacks: ['kimi-for-coding']},
      studentChat: {primary: 'k3', fallbacks: ['kimi-for-coding']},
      profile: {primary: 'k3', fallbacks: ['kimi-for-coding']},
      structure: {primary: 'k3', fallbacks: ['kimi-for-coding']},
      assistant: {primary: 'k3', fallbacks: ['kimi-for-coding']},
    },
    // kimi-for-coding-highspeed volontairement absent : 401 hors abonnement Allegretto.
    models: ['k3', 'k3-256k', 'kimi-for-coding'],
    // Pas de sttModel : supportsAudioTranscription() des sous-apps exclut Kimi.
  },
};

/** Extrait le hostname d'une baseUrl (sans schéma ni chemin) pour comparer les fournisseurs. */
export function hostFragment(url: string): string {
  return url.replace(/^https?:\/\//, '').split('/')[0] ?? url;
}

/** Devine la clé de preset correspondant à une baseUrl déjà configurée (sinon ''). */
export function inferPresetKey(baseUrl?: string): string {
  if (!baseUrl) return '';
  for (const [key, p] of Object.entries(PROVIDER_PRESETS)) {
    if (baseUrl.includes(hostFragment(p.baseUrl))) return key;
  }
  return '';
}
