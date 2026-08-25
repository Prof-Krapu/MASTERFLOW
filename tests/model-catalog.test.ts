import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CATALOG_TTL_MS,
  detectRoutingBreakage,
  diffCatalog,
  distillCatalog,
  guessVision,
  isCatalogStale,
  modelFamily,
  parseModelsCatalog,
  parseModelsResponse,
  pickSubstitute,
  confirmAbsences,
  resolveModelsDevProvider,
  servedNames,
  type ModelInfo,
  type ModelsDevModel,
  type ProviderCatalog,
} from '../lib/model-catalog.ts';
import {buildFlatRouting, policy, type ModelRouting} from '../lib/model-routing.ts';

// ============================================================
// Fixtures — figées d'après les sondes réelles du 2026-07-26.
// Aucun test ne touche le réseau : le catalogue d'OpenCode change, pas les fixtures.
// ============================================================

/** Réponse réelle de GET https://opencode.ai/zen/go/v1/models (extrait représentatif). */
const REPONSE_OPENCODE = JSON.stringify({
  object: 'list',
  data: [
    {id: 'minimax-m3', object: 'model', owned_by: 'opencode'},
    {id: 'minimax-m2.7', object: 'model', owned_by: 'opencode'},
    {id: 'kimi-k3', object: 'model', owned_by: 'opencode'},
    {id: 'kimi-k2.5', object: 'model', owned_by: 'opencode'},
    {id: 'mimo-v2-omni', object: 'model', owned_by: 'opencode'},
    {id: 'mimo-v2-pro', object: 'model', owned_by: 'opencode'},
    {id: 'hy3-preview', object: 'model', owned_by: 'opencode'},
  ],
});

/**
 * Réponse réelle de GET https://albert.api.etalab.gouv.fr/v1/models, relevée le 2026-07-28.
 *
 * Albert est le seul fournisseur de la suite à renvoyer `type`, `aliases` et
 * `max_context_length` — et le seul absent de models.dev. C'est donc la fixture qui garde la
 * couche 1 bis honnête. Ce jour-là DINUM a renommé six modèles en conservant les anciens noms
 * comme alias : `mistralai/Mistral-Small-3.2-24B-Instruct-2506` est devenu
 * `mistral-small-3-2-24b-instruct-2506`, etc.
 */
const REPONSE_ALBERT = JSON.stringify({
  object: 'list',
  data: [
    {id: 'openai/gpt-oss-120b', type: 'text-generation', aliases: ['openweight-large'], max_context_length: 131_072},
    {
      id: 'qwen3-coder-30b-A3b-instruct',
      type: 'text-generation',
      aliases: ['Qwen/Qwen3-Coder-30B-A3B-Instruct', 'openweight-code'],
      max_context_length: 262_144,
    },
    {
      id: 'ministral-3-8b-instruct-2512',
      type: 'image-text-to-text',
      aliases: ['mistralai/Ministral-3-8B-Instruct-2512', 'openweight-small'],
      max_context_length: 262_144,
    },
    {id: 'bge-m3', type: 'text-embeddings-inference', aliases: ['BAAI/bge-m3', 'openweight-embeddings'], max_context_length: 8192},
    {id: 'bge-reranker-v2-m3', type: 'text-classification', aliases: ['BAAI/bge-reranker-v2-m3', 'openweight-rerank'], max_context_length: 8192},
    {
      id: 'mistral-small-3-2-24b-instruct-2506',
      type: 'image-text-to-text',
      aliases: ['mistralai/Mistral-Small-3.2-24B-Instruct-2506', 'openweight-medium'],
      max_context_length: 128_000,
    },
    {id: 'whisper-large-v3', type: 'automatic-speech-recognition', aliases: ['openai/whisper-large-v3', 'openweight-audio'], max_context_length: null},
    {id: 'lightonocr-2-1b', type: 'image-text-to-text', aliases: ['lightonai/LightOnOCR-2-1B', 'openweight-ocr'], max_context_length: 16_384},
    {
      id: 'deepseek-v4-flash',
      type: 'text-generation',
      aliases: ['deepseek-ai/DeepSeek-V4-Flash', 'openweight-code-2'],
      max_context_length: 393_216,
    },
    {id: 'qwen3-vl-embedding-8b', type: 'text-embeddings-inference', aliases: [], max_context_length: 32_768},
  ],
});

/** Bloc `models` du fournisseur `opencode-go` de models.dev (mêmes valeurs qu'en ligne). */
const MODELS_DEV_OPENCODE: Record<string, ModelsDevModel> = {
  'minimax-m3': {
    name: 'MiniMax M3',
    reasoning: true,
    temperature: true,
    modalities: {input: ['text', 'image'], output: ['text']},
    limit: {context: 1_000_000, output: 131_072},
    cost: {input: 0.3, output: 1.2},
  },
  'minimax-m2.7': {
    name: 'MiniMax M2.7',
    reasoning: true,
    temperature: true,
    modalities: {input: ['text'], output: ['text']},
    limit: {context: 204_800, output: 131_072},
    cost: {input: 0.3, output: 1.2},
  },
  'kimi-k3': {
    name: 'Kimi K3',
    reasoning: true,
    // Piège documenté : la température n'est pas réglable, toute valeur ≠ 1 renvoie 400.
    temperature: false,
    modalities: {input: ['text', 'image'], output: ['text']},
    limit: {context: 1_048_576, output: 131_072},
    cost: {input: 3, output: 15},
  },
  'kimi-k2.5': {
    name: 'Kimi K2.5',
    reasoning: true,
    temperature: true,
    modalities: {input: ['text', 'image'], output: ['text']},
    limit: {context: 262_144, output: 65_536},
    cost: {input: 0.6, output: 3},
  },
  'mimo-v2-omni': {
    name: 'MiMo-V2-Omni',
    reasoning: true,
    temperature: true,
    modalities: {input: ['text', 'image'], output: ['text']},
    limit: {context: 262_144, output: 128_000},
    cost: {input: 0.4, output: 2},
  },
  'mimo-v2-pro': {
    name: 'MiMo-V2-Pro',
    reasoning: true,
    temperature: true,
    // Texte SEUL — la liste statique des sous-apps le déclarait vision, à tort.
    modalities: {input: ['text'], output: ['text']},
    limit: {context: 1_048_576, output: 128_000},
    cost: {input: 1, output: 3},
  },
};

function catalogue(models: ModelInfo[], degraded = false): ProviderCatalog {
  return {baseUrl: 'https://opencode.ai/zen/go', fetchedAt: 1_000, models, degraded};
}

// ============================================================
// Couche 1 — parseModelsResponse
// ============================================================

test('parseModelsResponse : forme {data:[…]} — ids triés et dédupliqués', () => {
  assert.deepEqual(parseModelsResponse(REPONSE_OPENCODE), [
    'hy3-preview',
    'kimi-k2.5',
    'kimi-k3',
    'mimo-v2-omni',
    'mimo-v2-pro',
    'minimax-m2.7',
    'minimax-m3',
  ]);
});

test('parseModelsResponse : tableau nu — GitHub Copilot renvoie les deux formes', () => {
  assert.deepEqual(parseModelsResponse('[{"id":"gpt-4o"},{"id":"gpt-5"}]'), ['gpt-4o', 'gpt-5']);
});

test('parseModelsResponse : corps illisible ou vide → liste vide, jamais de jet', () => {
  assert.deepEqual(parseModelsResponse('<html>502</html>'), []);
  assert.deepEqual(parseModelsResponse(''), []);
  assert.deepEqual(parseModelsResponse('{"data":[{"id":""},{"nope":1}]}'), []);
});

// ============================================================
// Couche 2 — resolveModelsDevProvider
// ============================================================

test('resolveModelsDevProvider : /zen/go et /zen sont DEUX fournisseurs distincts', () => {
  // Le piège central : le plan Go sert 23 modèles, le plan complet 59. Une résolution
  // par hôte seul donnerait le mauvais catalogue (et donc les mauvaises capacités).
  assert.equal(resolveModelsDevProvider('https://opencode.ai/zen/go'), 'opencode-go');
  assert.equal(resolveModelsDevProvider('https://opencode.ai/zen/go/v1'), 'opencode-go');
  assert.equal(resolveModelsDevProvider('https://opencode.ai/zen/go/'), 'opencode-go');
  assert.equal(resolveModelsDevProvider('https://opencode.ai/zen'), 'opencode');
  assert.equal(resolveModelsDevProvider('https://opencode.ai/zen/v1'), 'opencode');
});

test('resolveModelsDevProvider : correspondance par hôte pour les autres fournisseurs', () => {
  assert.equal(resolveModelsDevProvider('https://api.mistral.ai'), 'mistral');
  assert.equal(resolveModelsDevProvider('https://api.kimi.com/coding'), 'kimi-for-coding');
  assert.equal(resolveModelsDevProvider('https://api.githubcopilot.com'), 'github-copilot');
});

test('resolveModelsDevProvider : Albert et URL invalide → null (couche 3 seule)', () => {
  // Albert n'est pas référencé par models.dev : ses capacités viennent de la sonde elle-même
  // (champ `type`, cf. couche 1 bis) puis de l'heuristique.
  assert.equal(resolveModelsDevProvider('https://albert.api.etalab.gouv.fr'), null);
  assert.equal(resolveModelsDevProvider('pas-une-url'), null);
  assert.equal(resolveModelsDevProvider(''), null);
});

// ============================================================
// Couche 1 bis — ce que la sonde déclare elle-même (Albert)
// ============================================================

test('parseModelsCatalog : type, aliases et contexte sont conservés', () => {
  const modeles = parseModelsCatalog(REPONSE_ALBERT);
  const petit = modeles.find((m) => m.id === 'ministral-3-8b-instruct-2512');
  assert.ok(petit, 'ministral doit être présent');
  assert.equal(petit.type, 'image-text-to-text');
  assert.equal(petit.contextLimit, 262_144);
  assert.deepEqual(petit.aliases, ['mistralai/Ministral-3-8B-Instruct-2512', 'openweight-small']);

  // Un fournisseur qui ne renvoie que des ids reste lu sans perte : aliases vide, type absent.
  const nus = parseModelsCatalog('[{"id":"gpt-4o"}]');
  assert.deepEqual(nus, [
    {id: 'gpt-4o', aliases: [], type: undefined, contextLimit: undefined, capabilities: undefined},
  ]);
});

test('distillCatalog : le `type` d’Albert prime sur l’heuristique de nom', () => {
  const modeles = distillCatalog(parseModelsCatalog(REPONSE_ALBERT), null);
  const par = (id: string) => modeles.find((m) => m.id === id);

  // Vérifié en live le 2026-07-28 : ministral-3-8b transcrit bel et bien une page. Le motif
  // `mistral-small-[23]` ne l'attrape pas — sans le type, il serait classé texte seul et ne
  // pourrait jamais servir de repli à l'OCR.
  assert.equal(par('ministral-3-8b-instruct-2512')?.vision, true);
  assert.equal(par('ministral-3-8b-instruct-2512')?.source, 'sonde');
  assert.equal(par('mistral-small-3-2-24b-instruct-2506')?.vision, true);
  // …et l'inverse : deepseek-v4-flash répond « is not a multimodal model » (400).
  assert.equal(par('deepseek-v4-flash')?.vision, false);
  assert.equal(par('deepseek-v4-flash')?.contextLimit, 393_216);
  // gpt-oss renvoie un champ `reasoning` et accepte reasoning_effort : il doit être marqué.
  assert.equal(par('openai/gpt-oss-120b')?.reasoning, true);
});

test('distillCatalog : embeddings, reranker et transcription sont exclus du catalogue de chat', () => {
  const ids = distillCatalog(parseModelsCatalog(REPONSE_ALBERT), null).map((m) => m.id);
  for (const exclu of ['bge-m3', 'bge-reranker-v2-m3', 'whisper-large-v3', 'qwen3-vl-embedding-8b']) {
    assert.ok(!ids.includes(exclu), `${exclu} n’est pas un modèle de chat, il ne doit pas être proposé`);
  }
  // `qwen3-vl-embedding-8b` est le cas critique : l'heuristique le classait VISION (motif
  // `qwen…vl`), donc pickSubstitute pouvait l'élire comme substitut OCR.
  assert.ok(ids.includes('openai/gpt-oss-120b') && ids.includes('lightonocr-2-1b'));
});

// ============================================================
// Distillation
// ============================================================

test('distillCatalog : models.dev fait autorité sur la vision', () => {
  const models = distillCatalog(parseModelsResponse(REPONSE_OPENCODE), MODELS_DEV_OPENCODE);
  const par = new Map(models.map((m) => [m.id, m]));

  // Les deux erreurs que la liste statique des sous-apps portait :
  assert.equal(par.get('mimo-v2-pro')!.vision, false, 'mimo-v2-pro est texte seul');
  assert.equal(par.get('minimax-m2.7')!.vision, false, 'seul minimax-m3 est multimodal');
  assert.equal(par.get('minimax-m3')!.vision, true);
  assert.equal(par.get('kimi-k3')!.vision, true);
  for (const m of models) {
    if (m.id !== 'hy3-preview') assert.equal(m.source, 'models.dev', `${m.id} enrichi`);
  }
});

test('distillCatalog : température non réglable propagée (piège Kimi K3)', () => {
  const models = distillCatalog(parseModelsResponse(REPONSE_OPENCODE), MODELS_DEV_OPENCODE);
  const par = new Map(models.map((m) => [m.id, m]));
  assert.equal(par.get('kimi-k3')!.temperature, false, 'température ≠ 1 → 400 sur K3');
  assert.equal(par.get('kimi-k2.5')!.temperature, true);
});

test('distillCatalog : un modèle servi mais inconnu du registre reste au menu', () => {
  // Cas réel : hy3-preview est servi par le plan Go mais absent de models.dev. Le faire
  // disparaître du menu serait pire que de deviner ses capacités.
  const models = distillCatalog(parseModelsResponse(REPONSE_OPENCODE), MODELS_DEV_OPENCODE);
  const hy3 = models.find((m) => m.id === 'hy3-preview');
  assert.ok(hy3, 'hy3-preview doit rester listé');
  assert.equal(hy3.source, 'heuristique');
  assert.equal(hy3.temperature, true, 'réglable par défaut, comportement OpenAI standard');
});

test('distillCatalog : la sonde fait autorité sur la disponibilité', () => {
  // glm-5 est connu du registre mais absent de la sonde → il ne doit PAS apparaître.
  const devAvecGlm = {...MODELS_DEV_OPENCODE, 'glm-5': {name: 'GLM-5', modalities: {input: ['text']}}};
  const models = distillCatalog(['kimi-k3'], devAvecGlm);
  assert.deepEqual(models.map((m) => m.id), ['kimi-k3']);
});

test('distillCatalog : sonde vide → repli statique, catalogue jamais vide', () => {
  const repli: ModelInfo[] = [
    {id: 'mimo-v2-omni', name: 'MiMo-V2-Omni', vision: true, reasoning: true, temperature: true, source: 'heuristique'},
  ];
  const models = distillCatalog([], null, repli);
  assert.deepEqual(models.map((m) => m.id), ['mimo-v2-omni']);
});

test('guessVision : heuristique alignée sur la réalité models.dev', () => {
  assert.equal(guessVision('minimax-m3'), true);
  assert.equal(guessVision('minimax-m2.7'), false, 'la regex des sous-apps le classait vision');
  assert.equal(guessVision('kimi-k3'), true);
  assert.equal(guessVision('mistral-medium-2604'), true);
  assert.equal(guessVision('glm-5.1'), false);
});

// ============================================================
// Dérive
// ============================================================

test('diffCatalog : ajouts et retraits, premier passage compris', () => {
  const avant = catalogue([
    {id: 'kimi-k2.5', vision: true, reasoning: true, temperature: true, source: 'models.dev'},
    {id: 'glm-5', vision: false, reasoning: true, temperature: true, source: 'models.dev'},
  ]);
  const apres = catalogue([
    {id: 'kimi-k2.5', vision: true, reasoning: true, temperature: true, source: 'models.dev'},
    {id: 'kimi-k3', vision: true, reasoning: true, temperature: false, source: 'models.dev'},
  ]);
  assert.deepEqual(diffCatalog(avant, apres), {added: ['kimi-k3'], removed: ['glm-5']});
  assert.deepEqual(diffCatalog(null, apres), {added: ['kimi-k2.5', 'kimi-k3'], removed: []});
});

// ============================================================
// Rupture de routage
// ============================================================

const CATALOGUE_VIVANT = catalogue([
  {id: 'kimi-k3', vision: true, reasoning: true, temperature: false, contextLimit: 1_048_576, source: 'models.dev'},
  {id: 'mimo-v2-omni', vision: true, reasoning: true, temperature: true, contextLimit: 262_144, source: 'models.dev'},
  {id: 'minimax-m2.7', vision: false, reasoning: true, temperature: true, contextLimit: 204_800, source: 'models.dev'},
  {id: 'glm-5.2', vision: false, reasoning: true, temperature: true, contextLimit: 1_000_000, source: 'models.dev'},
]);

test('detectRoutingBreakage : signale les primaires disparus, et eux seuls', () => {
  const routing: ModelRouting = {
    ...buildFlatRouting('mimo-v2-omni', 'minimax-m2.7'),
    ocr: policy('mimo-v1-fantome'),
    correction: policy('glm-5-fantome'),
  };
  const ruptures = detectRoutingBreakage(routing, CATALOGUE_VIVANT);
  assert.deepEqual(
    ruptures.map((r) => [r.task, r.model, r.needsVision]),
    [
      ['ocr', 'mimo-v1-fantome', true],
      ['correction', 'glm-5-fantome', true],
    ],
  );
});

test('detectRoutingBreakage : routage sain → aucune rupture', () => {
  const routing = buildFlatRouting('mimo-v2-omni', 'minimax-m2.7');
  assert.deepEqual(detectRoutingBreakage(routing, CATALOGUE_VIVANT), []);
});

test('detectRoutingBreakage : un modèle RENOMMÉ n’est pas une rupture', () => {
  // Le cas réel du 2026-07-28 : DINUM renomme ses modèles et garde les anciens noms comme
  // alias. Le routage en base pointe encore sur l'ancien nom, et cet appel répond 200. Sans
  // la prise en compte des alias, `applyBreakage` réécrivait `global_settings` et ouvrait un
  // ticket Inbox pour une configuration parfaitement fonctionnelle.
  const albert = catalogue(distillCatalog(parseModelsCatalog(REPONSE_ALBERT), null));
  const routing: ModelRouting = {
    ...buildFlatRouting('mistralai/Mistral-Small-3.2-24B-Instruct-2506', 'openai/gpt-oss-120b'),
    profile: policy('Qwen/Qwen3-Coder-30B-A3B-Instruct'),
  };
  assert.deepEqual(detectRoutingBreakage(routing, albert), []);

  // Un modèle réellement retiré reste, lui, une rupture.
  const disparu: ModelRouting = {...routing, ocr: policy('mistralai/Mistral-Small-3.1-24B')};
  assert.deepEqual(
    detectRoutingBreakage(disparu, albert).map((r) => r.task),
    ['ocr'],
  );
});

test('pickSubstitute : lightonocr n’est JAMAIS élu automatiquement pour l’OCR', () => {
  // Il est bien multimodal (type image-text-to-text) et serait donc éligible — mais il
  // recopie la consigne système dans sa sortie (sondé le 2026-07-28), ce qui polluerait
  // corrigeText/copieText avec le texte des consignes [SCHEMA]/[CROQUIS].
  const albert = catalogue(distillCatalog(parseModelsCatalog(REPONSE_ALBERT), null));
  const choix = pickSubstitute('modele-vision-fantome', albert, {needsVision: true});
  assert.ok(choix !== 'lightonocr-2-1b', `substitut inattendu : ${choix}`);
  assert.ok(
    choix === 'mistral-small-3-2-24b-instruct-2506' || choix === 'ministral-3-8b-instruct-2512',
    `le substitut doit être un modèle qui suit les consignes, reçu ${choix}`,
  );
  // …mais il reste proposé dans le catalogue, pour un choix délibéré en Réglages.
  assert.ok(albert.models.some((m) => m.id === 'lightonocr-2-1b'));
});

test('servedNames / pickSubstitute : un repli configuré sous un alias reste valide', () => {
  const albert = catalogue(distillCatalog(parseModelsCatalog(REPONSE_ALBERT), null));
  const noms = servedNames(albert);
  assert.ok(noms.has('mistral-small-3-2-24b-instruct-2506'), 'id canonique');
  assert.ok(noms.has('mistralai/Mistral-Small-3.2-24B-Instruct-2506'), 'ancien id');
  assert.ok(noms.has('openweight-medium'), 'alias de rôle');

  // Le repli est écrit sous l'ancien nom : il doit être retenu, et rendu sous l'id canonique.
  assert.equal(
    pickSubstitute('modele-fantome', albert, {
      needsVision: true,
      fallbacks: ['mistralai/Mistral-Small-3.2-24B-Instruct-2506'],
    }),
    'mistral-small-3-2-24b-instruct-2506',
  );
});

test('detectRoutingBreakage : catalogue dégradé → JAMAIS de rupture', () => {
  // Garde-fou central de la bascule automatique : sonde en échec = on ne sait rien.
  // Sans ce court-circuit, une coupure réseau réécrirait la config des 11 apps.
  const routing = buildFlatRouting('mimo-v2-omni', 'minimax-m2.7');
  const dégradé = catalogue([], true);
  assert.deepEqual(detectRoutingBreakage(routing, dégradé), []);
  assert.deepEqual(detectRoutingBreakage(routing, catalogue(CATALOGUE_VIVANT.models, true)), []);
});

// ============================================================
// Substitution
// ============================================================

test('modelFamily : stable au sein d’une lignée', () => {
  assert.equal(modelFamily('kimi-k2.5'), modelFamily('kimi-k3'));
  assert.equal(modelFamily('mimo-v2-omni'), modelFamily('mimo-v2.5-pro'));
  assert.equal(modelFamily('glm-5.1'), 'glm');
  assert.notEqual(modelFamily('kimi-k2.5'), modelFamily('glm-5.1'));
});

test('pickSubstitute : un repli configuré encore servi est prioritaire', () => {
  const choix = pickSubstitute('mimo-v1-fantome', CATALOGUE_VIVANT, {
    needsVision: true,
    fallbacks: ['mort', 'mimo-v2-omni', 'kimi-k3'],
  });
  assert.equal(choix, 'mimo-v2-omni', 'le choix de l’admin passe avant l’automatisme');
});

test('pickSubstitute : un repli non multimodal est ignoré pour une tâche vision', () => {
  const choix = pickSubstitute('mimo-v1-fantome', CATALOGUE_VIVANT, {
    needsVision: true,
    fallbacks: ['minimax-m2.7'],
  });
  // Si le repli avait été retenu, on aurait `minimax-m2.7` — texte seul, incapable de lire
  // une copie. Il est écarté, et la règle de famille prend le relais (mimo-v1 → mimo-v2).
  assert.equal(choix, 'mimo-v2-omni', 'minimax-m2.7 écarté : il ne peut pas lire une copie');
});

test('pickSubstitute : à défaut de repli, la version la plus récente de la famille', () => {
  const choix = pickSubstitute('kimi-k2.1', CATALOGUE_VIVANT, {needsVision: true});
  assert.equal(choix, 'kimi-k3');
});

test('pickSubstitute : hors famille, le plus grand contexte à capacité requise', () => {
  assert.equal(
    pickSubstitute('llama-fantome', CATALOGUE_VIVANT, {needsVision: false}),
    'kimi-k3',
    'plus grand contexte (1 048 576)',
  );
  // Le même classement, mais avec le plus grand contexte porté par un modèle texte seul :
  // la contrainte vision doit primer sur la taille de contexte.
  const contexteTrompeur = catalogue([
    {id: 'glm-5.2', vision: false, reasoning: true, temperature: true, contextLimit: 1_000_000, source: 'models.dev'},
    {id: 'mimo-v2-omni', vision: true, reasoning: true, temperature: true, contextLimit: 262_144, source: 'models.dev'},
  ]);
  assert.equal(pickSubstitute('llama-fantome', contexteTrompeur, {needsVision: false}), 'glm-5.2');
  assert.equal(
    pickSubstitute('llama-fantome', contexteTrompeur, {needsVision: true}),
    'mimo-v2-omni',
    'la vision prime sur la taille de contexte',
  );
});

test('pickSubstitute : aucun modèle multimodal servi → null (cas Albert)', () => {
  // Cas rencontré en simulation sur la base de production : Albert ne sert aucun modèle
  // que l'heuristique classe multimodal. Un OCR casse → aucun remplaçant possible → il
  // FAUT alerter au lieu de substituer n'importe quoi. `applyBreakage` le reporte alors
  // dans `unresolved`, et un ticket part quand même dans l'Inbox.
  const albert = catalogue([
    {id: 'openai/gpt-oss-120b', vision: false, reasoning: true, temperature: true, source: 'heuristique'},
    {id: 'Qwen/Qwen3-Coder-30B-A3B-Instruct', vision: false, reasoning: true, temperature: true, source: 'heuristique'},
  ]);
  assert.equal(pickSubstitute('mimo-v1-fantome', albert, {needsVision: true}), null);
  assert.equal(pickSubstitute('mimo-v1-fantome', albert, {needsVision: false}), 'openai/gpt-oss-120b');
});

test('guessVision : Mistral Small 3.x d’Albert reconnu multimodal', () => {
  // Albert est absent de models.dev : l'heuristique est sa seule source de capacités.
  // L'ancien motif `mistral-small-2` ratait `Mistral-Small-3.2-24B-Instruct-2506`.
  assert.equal(guessVision('mistralai/Mistral-Small-3.2-24B-Instruct-2506'), true);
  assert.equal(guessVision('openai/gpt-oss-120b'), false);
  assert.equal(guessVision('Qwen/Qwen3-Coder-30B-A3B-Instruct'), false);
});

test('pickSubstitute : rien d’éligible ou catalogue dégradé → null', () => {
  const texteSeul = catalogue([
    {id: 'glm-5.2', vision: false, reasoning: true, temperature: true, source: 'models.dev'},
  ]);
  assert.equal(pickSubstitute('mimo-v1', texteSeul, {needsVision: true}), null);
  assert.equal(pickSubstitute('mimo-v1', catalogue(CATALOGUE_VIVANT.models, true), {needsVision: true}), null);
});

// ============================================================
// Péremption
// ============================================================

test('isCatalogStale : TTL, absence et dégradation', () => {
  const frais: ProviderCatalog = {baseUrl: 'x', fetchedAt: 1_000_000, models: [], degraded: false};
  assert.equal(isCatalogStale(frais, 1_000_000 + DEFAULT_CATALOG_TTL_MS - 1), false);
  assert.equal(isCatalogStale(frais, 1_000_000 + DEFAULT_CATALOG_TTL_MS), true);
  assert.equal(isCatalogStale(null, 0), true);
  // Un catalogue dégradé se retente à la première occasion, sans attendre le TTL.
  assert.equal(isCatalogStale({...frais, degraded: true}, 1_000_001), true);
});

// ============================================================
// Incident du 2026-08-04 — retrait passager de `mistral-ocr-latest`
//
// Ce jour-là à 11:31, `GET https://api.mistral.ai/v1/models` a renvoyé 50 modèles SANS la
// ligne `mistral-ocr-latest` ; à 11:46, 51 modèles avec. Entre les deux, la bascule
// automatique avait remplacé l'OCR des 9 correcteurs Mistral par `mistral-large-2512` —
// c'est-à-dire abandonné l'endpoint dédié `/v1/ocr` pour un chat-vision plus cher.
// Fixtures relevées sur la sonde réelle.
// ============================================================

/** Extrait fidèle de la réponse Mistral : bloc `capabilities`, `type: base`, alias croisés. */
const REPONSE_MISTRAL = JSON.stringify({
  object: 'list',
  data: [
    {
      id: 'mistral-large-2512',
      type: 'base',
      max_context_length: 262_144,
      aliases: ['mistral-large-latest'],
      capabilities: {completion_chat: true, vision: true, ocr: false, reasoning: false, function_calling: true},
    },
    {
      id: 'mistral-medium-3.5',
      type: 'base',
      max_context_length: 262_144,
      aliases: ['mistral-medium-2604'],
      capabilities: {completion_chat: true, vision: true, ocr: false, reasoning: true, function_calling: true},
    },
    {
      id: 'mistral-ocr-2512',
      type: 'base',
      max_context_length: 16_384,
      aliases: ['mistral-ocr-3-0', 'mistral-ocr-3'],
      capabilities: {completion_chat: false, vision: true, ocr: true, reasoning: false, function_calling: true},
    },
    {
      id: 'mistral-ocr-4-0',
      type: 'base',
      max_context_length: 16_384,
      aliases: [],
      capabilities: {completion_chat: false, vision: true, ocr: true, reasoning: false, function_calling: true},
    },
    {
      id: 'mistral-embed',
      type: 'base',
      max_context_length: 8_192,
      aliases: [],
      capabilities: {completion_chat: false, vision: false, ocr: false, reasoning: false, function_calling: false},
    },
  ],
});

test('parseModelsCatalog : le bloc `capabilities` de Mistral est conservé', () => {
  const par = (id: string) => parseModelsCatalog(REPONSE_MISTRAL).find((m) => m.id === id);
  assert.deepEqual(par('mistral-ocr-2512')?.capabilities, {
    chat: false,
    vision: true,
    reasoning: false,
    toolCalls: true,
    ocr: true,
  });
  // Un fournisseur qui ne publie pas ce bloc reste lu sans perte.
  assert.equal(parseModelsCatalog(REPONSE_ALBERT)[0]?.capabilities, undefined);
});

test('distillCatalog : `type: base` (Mistral) ne dit RIEN de la vision', () => {
  // Le piège : `base` est une taxinomie d'entraînement, pas une tâche Hugging Face. Pris pour
  // un type HF, il classait texte-seul tout modèle absent de models.dev — mistral-ocr compris.
  const sansCapacites = parseModelsCatalog(REPONSE_MISTRAL).map((m) => ({...m, capabilities: undefined}));
  const par = (id: string) => distillCatalog(sansCapacites, null).find((m) => m.id === id);
  assert.equal(par('mistral-large-2512')?.vision, true, 'l’heuristique de nom doit reprendre la main');
  assert.equal(par('mistral-medium-3.5')?.vision, true);
  assert.equal(par('mistral-large-2512')?.source, 'heuristique');
});

test('distillCatalog : les capacités déclarées priment sur tout le reste', () => {
  const par = (id: string) => distillCatalog(parseModelsCatalog(REPONSE_MISTRAL), null).find((m) => m.id === id);
  // Mistral déclare `mistral-ocr` multimodal ET hors chat : les deux comptent.
  assert.equal(par('mistral-ocr-2512')?.vision, true);
  assert.equal(par('mistral-ocr-2512')?.chat, false);
  assert.equal(par('mistral-ocr-2512')?.source, 'sonde');
  assert.equal(par('mistral-embed')?.chat, false);
  assert.equal(par('mistral-large-2512')?.chat, true);
  // …y compris contre l'heuristique : `mistral-medium` la passerait pour raisonnante ou non,
  // le fournisseur trancherait.
  assert.equal(par('mistral-medium-3.5')?.reasoning, true);
});

test('modelFamily : `-latest` ne forme pas une famille à part', () => {
  assert.equal(modelFamily('mistral-ocr-latest'), modelFamily('mistral-ocr-2512'));
  assert.equal(modelFamily('mistral-large-latest'), modelFamily('mistral-large-2512'));
  assert.notEqual(modelFamily('mistral-ocr-latest'), modelFamily('mistral-large-2512'));
});

/** Le catalogue tel qu'il était à 11:31 : `mistral-ocr-latest` manquant. */
const MISTRAL_11H31 = {
  ...catalogue(distillCatalog(parseModelsCatalog(REPONSE_MISTRAL), null)),
  baseUrl: 'https://api.mistral.ai',
};

test('pickSubstitute : un modèle à endpoint dédié est remplacé DANS SA LIGNÉE', () => {
  // Le cœur de l'incident : /v1/ocr et /chat/completions sont deux protocoles différents.
  assert.equal(
    pickSubstitute('mistral-ocr-latest', MISTRAL_11H31, {
      needsVision: true,
      fallbacks: ['mistral-medium-2604'],
    }),
    'mistral-ocr-2512',
    'le repli chat configuré ne doit pas détourner un OCR vers /chat/completions',
  );
});

test('pickSubstitute : pas de lignée dédiée servie → null, JAMAIS un modèle de chat', () => {
  const sansOcr = catalogue(MISTRAL_11H31.models.filter((m) => !m.id.startsWith('mistral-ocr')));
  assert.equal(pickSubstitute('mistral-ocr-latest', sansOcr, {needsVision: true}), null);
});

test('pickSubstitute : un modèle de chat n’est jamais remplacé par un endpoint dédié', () => {
  // `mistral-embed` et `mistral-ocr` sont multimodaux ou volumineux : sans le drapeau `chat`,
  // rien n'empêchait de les élire pour une correction.
  const choix = pickSubstitute('mistral-medium-fantome', MISTRAL_11H31, {needsVision: true});
  assert.ok(choix && !choix.startsWith('mistral-ocr') && choix !== 'mistral-embed', `vu ${choix}`);
});

test('pickSubstitute : un id canonique n’est plus masqué par un alias homonyme', () => {
  // Chez Mistral, `mistral-medium-2604` est à la fois un id (multimodal) et un alias d'autres
  // lignes. Indexé en une seule passe, l'alias écrasait l'id : le repli configuré passait pour
  // texte-seul et la substitution partait chercher `mistral-large-2512` (même contexte, id
  // alphabétiquement antérieur). C'est ce qui a fait perdre le repli le 2026-08-04.
  const cat = catalogue([
    {id: 'mistral-large-2512', vision: true, reasoning: false, temperature: true, contextLimit: 262_144, source: 'models.dev'},
    {id: 'mistral-medium-2604', vision: true, reasoning: true, temperature: true, contextLimit: 262_144, source: 'models.dev'},
    {
      id: 'mistral-vibe-cli-with-tools',
      aliases: ['mistral-medium-2604'],
      vision: false,
      reasoning: false,
      temperature: true,
      contextLimit: 262_144,
      source: 'heuristique',
    },
  ]);
  assert.equal(
    pickSubstitute('modele-fantome', cat, {needsVision: true, fallbacks: ['mistral-medium-2604']}),
    'mistral-medium-2604',
  );
});

test('confirmAbsences : une absence isolée ne fait RIEN réécrire', () => {
  // 1er constat : enregistré, mais pas confirmé — c'est tout l'objet de la règle.
  const t1 = confirmAbsences({}, ['mistral-ocr-latest'], 1_000);
  assert.equal(t1.confirmes.has('mistral-ocr-latest'), false);
  assert.deepEqual(t1.ledger, {'mistral-ocr-latest': 1_000});

  // 2e constat : confirmé, et la DATE DU PREMIER constat est conservée.
  const t2 = confirmAbsences(t1.ledger, ['mistral-ocr-latest'], 9_000);
  assert.equal(t2.confirmes.has('mistral-ocr-latest'), true);
  assert.deepEqual(t2.ledger, {'mistral-ocr-latest': 1_000});
});

test('confirmAbsences : un modèle revenu sort du registre', () => {
  const t1 = confirmAbsences({}, ['mistral-ocr-latest'], 1_000);
  // Le modèle est de retour (cas réel du 2026-08-04, 15 min plus tard) : plus rien en attente.
  const t2 = confirmAbsences(t1.ledger, [], 9_000);
  assert.deepEqual(t2.ledger, {});
  // …et une absence ultérieure repart bien d'un premier constat, sans réécriture.
  assert.equal(confirmAbsences(t2.ledger, ['mistral-ocr-latest'], 20_000).confirmes.size, 0);
});

test('confirmAbsences : chaque modèle a son propre compteur', () => {
  const t1 = confirmAbsences({}, ['a'], 1_000);
  const t2 = confirmAbsences(t1.ledger, ['a', 'b'], 2_000);
  assert.deepEqual([...t2.confirmes], ['a'], 'b vient seulement d’être constaté');
  assert.deepEqual(t2.ledger, {a: 1_000, b: 2_000});
});
