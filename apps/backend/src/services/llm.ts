import {getDb} from '../db/schema.ts';
import {env} from '../lib/env.ts';

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
}

/** Tâche déclarée dans `token_events` — fixe pour ce service de chat. */
const TOKEN_TASK = 'chat';

/**
 * Estimation grossière du nombre de tokens d'un texte (~ mots × 1.3).
 * Suffisant pour le suivi en dev / mode mock ; le vrai comptage vient du
 * provider quand il renvoie `usage` (non géré ici, on reste sur l'estimation).
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
  promptTokens: number;
  completionTokens: number;
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
        TOKEN_TASK,
        input.promptTokens,
        input.completionTokens,
        0,
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

  logTokenEvent({
    model: 'mock',
    promptTokens: estimatePromptTokens(p.messages),
    completionTokens: estimateTokens(emitted),
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
async function* streamOpenAICompat(p: LLMStreamParams): AsyncGenerator<string> {
  const {baseUrl, apiKey, model} = env.llm;
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
          };
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

  logTokenEvent({
    model: model || env.llm.provider,
    promptTokens: estimatePromptTokens(p.messages),
    completionTokens: estimateTokens(emitted),
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
  if (env.llm.provider === 'mock') {
    yield* streamMock(p);
    return;
  }
  yield* streamOpenAICompat(p);
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
