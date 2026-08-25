import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TASK_MODEL,
  EMPTY_TASK_OVERRIDES,
  MODEL_TASKS,
  PROVIDER_PRESETS,
  buildEffectiveRouting,
  buildFlatRouting,
  detectTaskOverrides,
  inferPresetKey,
  normalizeRouting,
  type ModelTaskKey,
} from '../lib/model-routing.ts';

// ============================================================
// Routage par tâche — miroir de ModelRoutingConfig des sous-apps
// ============================================================
// La garde qui manquait : la clé `assistant` a été ajoutée aux sous-apps sans être
// répercutée ici, si bien que la console (a) ne permettait pas de choisir le modèle de
// l'Assistant pédagogique et (b) ÉCRASAIT la surcharge posée dans les Réglages d'un
// correcteur dès qu'un preset était appliqué. Rien ne cassait visiblement :
// normalizeModelRouting() côté sous-app remplit la clé manquante en silence.

/** Source de vérité : les tâches de `ModelRoutingTask` des sous-apps. */
const TASK_KEYS: ModelTaskKey[] = [
  'ocr',
  'bareme',
  'correction',
  'studentChat',
  'profile',
  'structure',
  'assistant',
];

test('MODEL_TASKS couvre exactement les sept tâches des sous-apps', () => {
  assert.deepEqual(
    MODEL_TASKS.map((t) => t.key).sort(),
    [...TASK_KEYS].sort(),
    'toute divergence rend une tâche inconfigurable ET écrase sa surcharge',
  );
  assert.deepEqual(Object.keys(DEFAULT_TASK_MODEL).sort(), [...TASK_KEYS].sort());
  assert.deepEqual(Object.keys(EMPTY_TASK_OVERRIDES).sort(), [...TASK_KEYS].sort());
  // Seul l'OCR hérite du champ « Modèle OCR » ; tout le reste suit le modèle chat.
  assert.equal(DEFAULT_TASK_MODEL.ocr, 'ocr');
  for (const key of TASK_KEYS.filter((k) => k !== 'ocr')) {
    assert.equal(DEFAULT_TASK_MODEL[key], 'chat', key);
  }
});

test('chaque preset à routage intrinsèque déclare les sept tâches', () => {
  const withRouting = Object.entries(PROVIDER_PRESETS).filter(([, p]) => p.routing);
  assert.ok(withRouting.length >= 3, 'mistral, albert et kimi ont un routage intrinsèque');
  for (const [name, preset] of withRouting) {
    assert.deepEqual(
      Object.keys(preset.routing!).sort(),
      [...TASK_KEYS].sort(),
      `preset « ${name} » : une tâche manquante serait écrasée à l'enregistrement`,
    );
    for (const key of TASK_KEYS) {
      const p = preset.routing![key];
      assert.ok(p.primary.trim(), `${name}.${key} : primaire vide`);
      assert.ok(Array.isArray(p.fallbacks), `${name}.${key} : fallbacks doit être un tableau`);
      assert.ok(!p.fallbacks.includes(p.primary), `${name}.${key} : repli identique au primaire`);
    }
  }
});

test('les presets à routage proposent un secours partout, SANS exception', () => {
  // `fallbacks: []` = point unique de panne (audit 2026-07-11, P1). L'OCR d'Albert en était
  // la dernière exception, faute de second modèle à vision. Elle a disparu le 2026-07-28 :
  // Albert sert `ministral-3-8b-instruct-2512`, déclaré `image-text-to-text` et vérifié en
  // live sur une page manuscrite.
  for (const name of ['mistral', 'albert', 'kimi']) {
    const routing = PROVIDER_PRESETS[name]!.routing!;
    for (const key of TASK_KEYS) {
      assert.ok(
        routing[key].fallbacks.length > 0,
        `${name}.${key} devrait avoir au moins un modèle de secours`,
      );
    }
  }
  assert.deepEqual(PROVIDER_PRESETS.albert!.routing!.ocr.fallbacks, ['ministral-3-8b-instruct-2512']);
});

test('les modèles cités par un routing figurent dans le catalogue du preset', () => {
  for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (!preset.routing || !preset.models) continue;
    const known = new Set(preset.models);
    for (const key of TASK_KEYS) {
      for (const m of [preset.routing[key].primary, ...preset.routing[key].fallbacks]) {
        assert.ok(known.has(m), `${name}.${key} : « ${m} » absent de preset.models`);
      }
    }
  }
});

test('les modèles par défaut figurent dans le catalogue, routing ou pas', () => {
  // Le test ci-dessus saute les presets sans `routing` — c'est-à-dire justement
  // `opencode_go`, dont le catalogue avait silencieusement divergé de celui des sous-apps
  // (3 ids ici, 7 autres là-bas, aucun recouvrement complet) sans qu'aucune garde ne le voie.
  for (const [name, preset] of Object.entries(PROVIDER_PRESETS)) {
    if (!preset.models) continue;
    const known = new Set(preset.models);
    assert.ok(known.has(preset.ocrModel), `${name}.ocrModel : « ${preset.ocrModel} » hors catalogue`);
    assert.ok(known.has(preset.chatModel), `${name}.chatModel : « ${preset.chatModel} » hors catalogue`);
  }
});

test('preset kimi : /coding obligatoire, K3 partout, repli K2.7', () => {
  const kimi = PROVIDER_PRESETS.kimi!;
  assert.equal(kimi.baseUrl, 'https://api.kimi.com/coding', 'sans /coding -> 404 nginx');
  assert.ok(!kimi.baseUrl.endsWith('/v1'), 'modelsProbe ajoute /v1 lui-même');
  assert.equal(kimi.routing!.assistant.primary, 'k3');
  assert.deepEqual(kimi.routing!.assistant.fallbacks, ['kimi-for-coding']);
  // supportsAudioTranscription() des sous-apps exclut Kimi : un champ STT serait inopérant.
  assert.equal(kimi.sttModel, undefined);
});

test('normalizeRouting : une config héritée sans `assistant` est complétée, pas perdue', () => {
  // Exactement ce que la console écrivait avant le correctif.
  const legacy = {
    ocr: {primary: 'mistral-ocr-2512', fallbacks: []},
    bareme: {primary: 'mistral-medium-2604', fallbacks: []},
    correction: {primary: 'mistral-medium-2604', fallbacks: []},
    studentChat: {primary: 'mistral-medium-2604', fallbacks: []},
    profile: {primary: 'mistral-medium-2604', fallbacks: []},
  };
  const out = normalizeRouting(legacy, {ocrModel: 'ocr-x', chatModel: 'chat-x'});
  assert.deepEqual(Object.keys(out).sort(), [...TASK_KEYS].sort());
  assert.equal(out.assistant.primary, 'chat-x', 'la tâche manquante hérite du modèle chat');
  assert.equal(out.ocr.primary, 'mistral-ocr-2512', 'les tâches présentes ne bougent pas');
});

test('normalizeRouting : replis dédupliqués, vidés et purgés du primaire', () => {
  const out = normalizeRouting(
    {correction: {primary: 'a', fallbacks: ['b', '  ', 'b', 'a', 'c']}},
    {ocrModel: 'o', chatModel: 'c0'},
  );
  assert.deepEqual(out.correction.fallbacks, ['b', 'c']);
});

test('buildEffectiveRouting : sans surcharge tout suit les champs, avec surcharge rien ne bouge', () => {
  const routing = normalizeRouting(
    {assistant: {primary: 'kimi-for-coding', fallbacks: ['k3']}},
    {ocrModel: 'k3', chatModel: 'k3'},
  );
  const overrides = {...EMPTY_TASK_OVERRIDES, assistant: true};

  const out = buildEffectiveRouting('ocr-neuf', 'chat-neuf', routing, overrides);
  assert.equal(out.ocr.primary, 'ocr-neuf');
  assert.equal(out.correction.primary, 'chat-neuf');
  assert.equal(out.assistant.primary, 'kimi-for-coding', 'la surcharge survit au changement');
  assert.deepEqual(out.assistant.fallbacks, ['k3']);

  // Sans surcharge, la tâche redevient un alias du champ chat et perd ses replis.
  const sansSurcharge = buildEffectiveRouting('ocr-neuf', 'chat-neuf', routing, {
    ...EMPTY_TASK_OVERRIDES,
  });
  assert.equal(sansSurcharge.assistant.primary, 'chat-neuf');
  assert.deepEqual(sansSurcharge.assistant.fallbacks, []);
});

test('buildFlatRouting : les six tâches, OCR à part', () => {
  const flat = buildFlatRouting('vision-1', 'chat-1');
  assert.deepEqual(Object.keys(flat).sort(), [...TASK_KEYS].sort());
  assert.equal(flat.ocr.primary, 'vision-1');
  assert.equal(flat.assistant.primary, 'chat-1');
  assert.deepEqual(flat.assistant.fallbacks, []);
});

test('Albert : aucune route ne pointe sur Qwen, que DINUM va déprécier', () => {
  const routing = PROVIDER_PRESETS.albert!.routing!;
  for (const key of TASK_KEYS) {
    for (const m of [routing[key].primary, ...routing[key].fallbacks]) {
      assert.ok(!/qwen/i.test(m), `${key} pointe encore sur Qwen (« ${m} »)`);
    }
  }
  // L'extraction structuree (CSV, bareme) passe sur deepseek-v4-flash : verifie le 2026-07-28
  // sur une classe de 30 noms difficiles, avec le prompt et le budget reels de roster.ts —
  // 3/3 essais parfaits (30/30 entrees, 30/30 alignees, 30/30 NOM en majuscules).
  assert.equal(routing.structure.primary, 'deepseek-v4-flash');
});

test('Albert : aucun texte rédactionnel ne part sur deepseek en PRIMAIRE', () => {
  // DINUM : « Nous ne recommandons pas d'utiliser ce modele pour d'autres usages que le code. »
  // Or la route `profile` porte les appreciations de bulletin (`appreciation.ts`), les
  // syntheses de classe et d'eleve (`ai-summary.ts`) et le profil du chat eleve
  // (`student-chat.ts`) — des textes lus par des collegues et des familles, pas du code.
  // deepseek est aussi en phase de TEST revocable au 2026-10-01 ; mistral-small-3-2 est un
  // modele general, hors phase de test. Mesure du 2026-07-30 : 3/3 sur les trois routes, aux
  // budgets reels (3 000 / 1 500 / 800 tokens).
  //
  // Le repli, lui, PEUT etre deepseek : un filet mesure 3/3 vaut mieux que ministral, qui rend
  // 0/3 sur `ai-summary` et imbrique un objet JSON dans le champ `appreciation`.
  const routing = PROVIDER_PRESETS.albert!.routing!;
  assert.ok(
    !/deepseek/i.test(routing.profile.primary),
    `profile est redactionnel, il ne doit pas etre sur deepseek (« ${routing.profile.primary} »)`,
  );
  assert.equal(routing.profile.primary, 'mistral-small-3-2-24b-instruct-2506');
});

test('Albert : ni profile ni structure ne tournent sur un modèle à raisonnement', () => {
  // Le raisonnement est decompte de `max_tokens`, et ces deux routes ont les plus PETITS
  // budgets de sortie de la suite : 800 (profil du chat eleve), 1 500 et 2 000 (syntheses),
  // 3 000 (appreciation), `200 + n × 60` (CSV — 2 000 pour une classe de 30). Un modele a
  // raisonnement les epuise AVANT d'ecrire : gpt-oss-120b rend 0/3 sur roster.ts et 0/3 sur le
  // profil du chat eleve, `finish_reason: length`, contenu VIDE ; 2/3 sur l'appreciation, dont
  // un essai vide apres 8 606 caracteres de raisonnement. Un modele qui ne peut
  // structurellement pas repondre n'est pas un repli — c'est une panne silencieuse de plus.
  const routing = PROVIDER_PRESETS.albert!.routing!;
  for (const task of ['profile', 'structure'] as const) {
    for (const m of [routing[task].primary, ...routing[task].fallbacks]) {
      assert.ok(
        !/gpt-oss|magistral|deepseek-r/i.test(m),
        `${task} : « ${m} » est un modele a raisonnement, budget de sortie trop petit`,
      );
    }
  }
});

test('detectTaskOverrides : rouvre la console dans l’état laissé', () => {
  const albert = PROVIDER_PRESETS.albert!;
  const detected = detectTaskOverrides(albert.routing, {
    ocrModel: albert.ocrModel,
    chatModel: albert.chatModel,
  });
  // Profil = mistral-small et structure = deepseek (tous deux ≠ chatModel), les autres portent
  // des replis → surcharge visible partout.
  assert.equal(detected.profile, true, 'la route rédactionnelle d’Albert doit rester repérée');
  assert.equal(detected.structure, true, 'le split CSV d’Albert doit rester repéré');
  assert.equal(detected.correction, true, 'un repli suffit à marquer la surcharge');
  // L'OCR d'Albert a gagné un repli le 2026-07-28 (ministral-3-8b) : il est donc lui aussi
  // une surcharge, et la console doit le rouvrir déplié.
  assert.equal(detected.ocr, true, 'OCR = ocrModel AVEC repli → surcharge');

  // La règle de fond reste : une route réduite au modèle de tête, sans repli, n'est pas une
  // surcharge — c'est ce que vérifie le routage à plat ci-dessous.
  assert.equal(
    detectTaskOverrides(buildFlatRouting(albert.ocrModel, albert.chatModel), {
      ocrModel: albert.ocrModel,
      chatModel: albert.chatModel,
    }).ocr,
    false,
  );

  // Routage à plat : aucune surcharge.
  assert.deepEqual(
    detectTaskOverrides(buildFlatRouting('o', 'c'), {ocrModel: 'o', chatModel: 'c'}),
    EMPTY_TASK_OVERRIDES,
  );
  assert.deepEqual(detectTaskOverrides(undefined, {ocrModel: 'o', chatModel: 'c'}), EMPTY_TASK_OVERRIDES);
});

test('inferPresetKey : résout les baseUrl connues, dont Kimi, sans ambiguïté', () => {
  assert.equal(inferPresetKey('https://api.kimi.com/coding'), 'kimi');
  assert.equal(inferPresetKey('https://api.mistral.ai'), 'mistral');
  assert.equal(inferPresetKey('https://albert.api.etalab.gouv.fr'), 'albert');
  assert.equal(inferPresetKey('https://opencode.ai/zen/go'), 'opencode_go');
  assert.equal(inferPresetKey('https://exemple.invalid'), '');
  assert.equal(inferPresetKey(undefined), '');
});
