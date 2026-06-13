import {getDb} from '../db/schema.ts';
import {env} from '../lib/env.ts';
import {costFor} from './llm_pricing.ts';
import {resolveLLMRoute, type ResolvedLLMRoute} from './llm_routing.ts';

/**
 * Service LLM de MasterFlow — abstraction unique du modèle de langage.
 *
 * Doctrine : « le backend décide, le LLM ne fait que proposer ». Ce service ne
 * fait QUE produire du texte ; il n'exécute aucune action, n'écrit jamais de
 * canon, ne valide rien. Il est volontairement simple : un fichier = une
 * responsabilité (parler au modèle).
 *
 * Deux modes, pilotés par `env.llm.provider` :
 *  - `mock` (défaut) : réponse simulée en français, streamée mot à mot, AUCUN
 *    appel réseau. Permet de développer sans clé API.
 *  - tout autre provider : appel OpenAI-compatible (POST {baseUrl}/chat/completions,
 *    `stream: true`), parsing du flux SSE (`data:` …), yield des `delta.content`.
 *
 * À la fin de chaque génération, une ligne est inscrite dans `token_events`
 * (suivi des coûts/usages). En mode mock, les tokens sont estimés (~mots × 1.3).
 *
 * Réf. de patterns SSE (lecture seule, NON importée) :
 *   API_corrector/lib/api-client.ts
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamParams {
  messages: ChatMessage[];
  userId?: string | null;
  personaId?: string | null;
  roomInstanceId?: string | null;
  /** Tâche LLM (OCR, barème, correction, chat…). Inscrite dans `token_events`. */
  task?: string;
}

/** Tâche par défaut si l'appelant n'en déclare pas une. */
const DEFAULT_TASK = 'chat';

/**
 * Estimation grossière du nombre de tokens d'un texte (~ mots × 1.3).
 * Suffisant pour le suivi en dev / mode mock ; le vrai comptage vient du
 * provider quand il renvoie un objet `usage` valide.
 */
function estimateTokens(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.ceil(words * 1.3);
}

/**
 * Inscrit une ligne dans `token_events` (best-effort : ne fait jamais échouer
 * une génération réussie). `model` reflète le provider mock ou le modèle réel.
 */
function logTokenEvent(input: {
  model: string;
  task: string;
  promptTokens: number;
  completionTokens: number;
  costEur: number;
  userId?: string | null;
  personaId?: string | null;
  roomInstanceId?: string | null;
}): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO token_events
           (user_id, ts, model, task, prompt_tokens, completion_tokens, cost_eur, persona_id, room_instance_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.userId ?? null,
        Date.now(),
        input.model,
        input.task,
        input.promptTokens,
        input.completionTokens,
        input.costEur,
        input.personaId ?? null,
        input.roomInstanceId ?? null,
      );
  } catch (err) {
    // Le suivi des tokens ne doit jamais casser la réponse à l'utilisateur.
    console.warn('[llm] échec du log token_events (ignoré) :', err);
  }
}

/** Somme des tokens estimés sur tous les messages du prompt. */
function estimatePromptTokens(messages: ChatMessage[]): number {
  let total = 0;
  for (const m of messages) total += estimateTokens(m.content);
  return total;
}

/** Accepte uniquement un compteur provider entier et positif, sinon conserve l'estimation. */
function normalizeUsageCount(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

/**
 * Génère une réponse simulée plausible en français à partir du dernier message
 * utilisateur. Aucune intelligence : on reformule pour rester lisible en dev.
 */
function buildMockReply(messages: ChatMessage[]): string {
  let lastUser = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user') {
      lastUser = m.content.trim();
      break;
    }
  }

  if (!lastUser) {
    return 'Bonjour ! Je suis prêt à vous aider. Posez-moi votre question et nous avancerons pas à pas.';
  }

  // Extrait court de la demande pour donner l'illusion d'une prise en compte.
  const echo = lastUser.length > 120 ? `${lastUser.slice(0, 117)}…` : lastUser;
  return (
    `Bonne question. Si je comprends bien, vous souhaitez : « ${echo} ». ` +
    'Voici une réponse simulée (mode mock, sans appel réseau) pour valider le flux de bout en bout. ' +
    'En production, un vrai modèle prendrait le relais ici, en respectant le persona actif et ses garde-fous. ' +
    'Avançons étape par étape : dites-moi si vous voulez que je détaille un point en particulier.'
  );
}

/**
 * Génère et streame une réponse mot à mot, sans réseau. Chaque `yield` rend un
 * fragment (mot + espace) pour imiter un flux token-par-token côté client.
 */
async function* streamMock(p: LLMStreamParams): AsyncGenerator<string> {
  const reply = buildMockReply(p.messages);
  const tokens = reply.split(/(\s+)/).filter((t) => t.length > 0);

  let emitted = '';
  for (const tok of tokens) {
    emitted += tok;
    // Petit délai pour rendre le streaming visible côté UI (dev only).
    await new Promise((r) => setTimeout(r, 12));
    yield tok;
  }

  const promptTokens = estimatePromptTokens(p.messages);
  const completionTokens = estimateTokens(emitted);
  logTokenEvent({
    model: 'mock',
    task: p.task ?? DEFAULT_TASK,
    promptTokens,
    completionTokens,
    costEur: costFor('mock', promptTokens, completionTokens),
    userId: p.userId,
    personaId: p.personaId,
    roomInstanceId: p.roomInstanceId,
  });
}

/**
 * Appel OpenAI-compatible en streaming. POST {baseUrl}/chat/completions avec
 * `stream: true`, parsing du flux SSE : chaque ligne `data: {…}` contient un
 * `choices[0].delta.content` à émettre. `data: [DONE]` termine le flux.
 */
async function* streamOpenAICompat(
  p: LLMStreamParams,
  route: ResolvedLLMRoute,
): AsyncGenerator<string> {
  const {baseUrl, apiKey, model} = route;
  if (!baseUrl || !apiKey) throw new Error('llm_route_incomplete_provider_config');
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: p.messages,
      stream: true,
      // Demande au provider le décompte réel des tokens dans le chunk SSE final.
      stream_options: {include_usage: true},
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    throw new Error(`[llm] erreur provider ${res.status}: ${detail.slice(0, 500)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let emitted = '';
  // Décompte réel renvoyé par le provider (chunk SSE final via stream_options.include_usage).
  let usage: {prompt_tokens?: number; completion_tokens?: number} | null = null;

  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream: true});

      // Le SSE sépare les événements par double saut de ligne ; on traite ligne à ligne.
      let nl = buffer.indexOf('\n');
      while (nl !== -1) {
        const rawLine = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf('\n');

        if (!rawLine || !rawLine.startsWith('data:')) continue;
        const data = rawLine.slice(5).trim();
        if (data === '[DONE]') {
          buffer = '';
          break;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices?: {delta?: {content?: string | null}}[];
            usage?: {prompt_tokens?: number; completion_tokens?: number} | null;
          };
          // Le chunk d'usage arrive en fin de flux (souvent avec `choices: []`).
          if (parsed.usage) usage = parsed.usage;
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            emitted += delta;
            yield delta;
          }
        } catch {
          // Fragment JSON incomplet ou ligne de keep-alive : on ignore.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Compteurs réels du provider si disponibles, sinon estimation (fallback).
  const usedModel = model || route.provider;
  const promptTokens = normalizeUsageCount(usage?.prompt_tokens, estimatePromptTokens(p.messages));
  const completionTokens = normalizeUsageCount(usage?.completion_tokens, estimateTokens(emitted));
  logTokenEvent({
    model: usedModel,
    task: p.task ?? DEFAULT_TASK,
    promptTokens,
    completionTokens,
    costEur: costFor(usedModel, promptTokens, completionTokens),
    userId: p.userId,
    personaId: p.personaId,
    roomInstanceId: p.roomInstanceId,
  });
}

/**
 * Streame une réponse du LLM, fragment par fragment.
 * Aiguille vers le mock (défaut) ou le provider OpenAI-compatible.
 */
export async function* streamChat(p: LLMStreamParams): AsyncGenerator<string> {
  const route = resolveLLMRoute(p.task ?? DEFAULT_TASK, env.llm);
  if (route.provider === 'mock') {
    yield* streamMock(p);
    return;
  }
  yield* streamOpenAICompat(p, route);
}

/**
 * Variante non-streamée : concatène l'intégralité du flux `streamChat`.
 * Pratique pour les usages serveur qui veulent la réponse complète d'un coup.
 */
export async function chat(p: LLMStreamParams): Promise<string> {
  let out = '';
  for await (const chunk of streamChat(p)) out += chunk;
  return out;
}
