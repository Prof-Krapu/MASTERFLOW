import {WebSocketServer, type WebSocket} from 'ws';
import type {IncomingMessage, Server} from 'node:http';

import type {Persona, WsServerMessage} from '@masterflow/shared';
import {WsClientMessageSchema} from '@masterflow/shared';

import {getDb} from '../../db/schema.ts';
import type {RoomInstanceRow} from '../../db/schema.ts';
import {audit} from '../../lib/audit.ts';
import {verifyToken} from '../../middleware/auth.ts';
import {getActiveBlend, getPersona, listPersonas, methodAttribution} from '../../engines/persona_engine.ts';
import {streamChat, type ChatMessage} from '../../services/llm.ts';

/**
 * WebSocket de chat — streaming token-par-token (Phase 2).
 *
 * Endpoint : `ws://host/ws/{room_instance_id}?token=<JWT>`.
 *
 * Le navigateur ne pouvant pas poser d'en-tête `Authorization` sur un upgrade WS, le
 * jeton voyage en query string. On vérifie le JWT à l'upgrade ; un jeton invalide ferme
 * la connexion avant même l'établissement.
 *
 * Invariants produit appliqués ici :
 *  - 1 SEUL porte-parole sémantique : le persona PRIMAIRE de la chimère active (ou le
 *    persona actif de la room_instance). Le secondaire ne fait que prêter sa méthode,
 *    explicitement attribuée dans `chat_end.method_attribution`.
 *  - Le LLM ne fait que proposer du texte ; aucune action, aucune écriture de canon.
 *
 * Protocole (cf. `@masterflow/shared`) :
 *   client → `{type:'chat', content}` | `{type:'ping'}`
 *   serveur → `chat_start` → n × `chat_chunk` → `chat_end` | `pong` | `error`
 */

/** Persona de repli si la room_instance n'en désigne aucun et qu'aucune chimère n'est active. */
const DEFAULT_PERSONA_ID = 'profkrapu-001';

/** Contexte résolu d'une connexion WS (utilisateur + room_instance). */
interface WsContext {
  userId: string;
  roomInstanceId: string;
}

/** Envoie un message serveur typé (sérialisé une seule fois). */
function send(ws: WebSocket, msg: WsServerMessage): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

/** Extrait `room_instance_id` du chemin `/ws/{id}` ; `null` si le chemin ne matche pas. */
function parseRoomInstanceId(url: string | undefined): string | null {
  if (!url) return null;
  const path = url.split('?')[0] ?? '';
  const m = /^\/ws\/([^/]+)\/?$/.exec(path);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

/** Extrait le `token` de la query string. */
function parseToken(url: string | undefined, headers: IncomingMessage['headers']): string | null {
  if (url) {
    const q = url.split('?')[1];
    if (q) {
      const token = new URLSearchParams(q).get('token');
      if (token) return token;
    }
  }
  // Repli : `Authorization: Bearer` (clients non-navigateur, tests).
  const auth = headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length).trim();
  return null;
}

/**
 * Résout le persona porte-parole d'une room_instance.
 * Priorité : chimère active (primaire) > persona actif de la room_instance > défaut.
 * Retourne aussi l'attribution de méthode si une chimère prête un secondaire.
 */
function resolveSpeaker(roomInstanceId: string): {speaker: Persona; methodAttr: string | null} {
  const blend = getActiveBlend(roomInstanceId);
  if (blend) {
    const methodAttr = blend.secondary_persona ? methodAttribution(blend.secondary_persona) : null;
    return {speaker: blend.primary_persona, methodAttr};
  }

  // Pas de chimère : persona actif stocké dans l'état vivant de la room_instance.
  const row = getDb()
    .prepare('SELECT * FROM room_instances WHERE id = ?')
    .get(roomInstanceId) as RoomInstanceRow | undefined;
  if (row?.widget_state_json) {
    const state = JSON.parse(row.widget_state_json) as Record<string, unknown>;
    const activeId = typeof state['active_persona'] === 'string' ? state['active_persona'] : null;
    const persona = activeId ? getPersona(activeId) : null;
    if (persona) return {speaker: persona, methodAttr: null};
  }

  const fallback = getPersona(DEFAULT_PERSONA_ID) ?? listPersonas()[0];
  if (!fallback) throw new Error('Aucun persona disponible pour le chat.');
  return {speaker: fallback, methodAttr: null};
}

/**
 * Construit le prompt système d'un persona à partir de sa voix et de sa méthode.
 * Si une méthode est empruntée à un secondaire, elle est ajoutée comme overlay attribué.
 */
function buildSystemPrompt(speaker: Persona, methodAttr: string | null): string {
  const voice = speaker.voice_config ?? {};
  const method = speaker.method_config ?? {};
  const lex = Array.isArray(voice['lexical_field']) ? (voice['lexical_field'] as string[]).join(', ') : '';
  const moves = Array.isArray(voice['signature_moves']) ? (voice['signature_moves'] as string[]).join(', ') : '';
  const cadrage = typeof method['cadrage'] === 'string' ? method['cadrage'] : '';

  const lines = [
    `Tu es ${speaker.name}, un persona pédagogique (domaine : ${speaker.domain}).`,
    cadrage ? `Cadrage : ${cadrage}.` : '',
    lex ? `Champ lexical : ${lex}.` : '',
    moves ? `Tics de méthode : ${moves}.` : '',
    methodAttr ? `Tu peux t'inspirer d'une méthode empruntée (${methodAttr}), mais tu restes l'unique porte-parole.` : '',
    'Réponds en français, de façon concise et utile. Tu proposes ; tu ne décides ni n\'exécutes rien.',
  ];
  return lines.filter(Boolean).join('\n');
}

/** Traite un message `chat` : résout le persona, streame la réponse du LLM. */
async function handleChat(ws: WebSocket, ctx: WsContext, content: string): Promise<void> {
  let speaker: Persona;
  let methodAttr: string | null;
  try {
    ({speaker, methodAttr} = resolveSpeaker(ctx.roomInstanceId));
  } catch (err) {
    send(ws, {type: 'error', message: (err as Error).message});
    return;
  }

  send(ws, {type: 'chat_start', persona_id: speaker.id, speaker: speaker.name});

  const messages: ChatMessage[] = [
    {role: 'system', content: buildSystemPrompt(speaker, methodAttr)},
    {role: 'user', content},
  ];

  try {
    for await (const chunk of streamChat({
      messages,
      userId: ctx.userId,
      personaId: speaker.id,
      roomInstanceId: ctx.roomInstanceId,
    })) {
      send(ws, {type: 'chat_chunk', content: chunk});
    }
    send(ws, {type: 'chat_end', persona_id: speaker.id, method_attribution: methodAttr});
  } catch (err) {
    send(ws, {type: 'error', message: `llm_failed: ${(err as Error).message}`});
  }
}

/**
 * Attache le serveur WebSocket de chat à un serveur HTTP existant.
 *
 * Gère uniquement les upgrades dont le chemin matche `/ws/{room_instance_id}` ; les
 * autres sont laissés tels quels (socket détruit faute d'autre handler). L'auth se fait
 * à l'upgrade : un jeton absent/invalide ferme la connexion immédiatement.
 */
export function attachChatWs(server: Server): WebSocketServer {
  const wss = new WebSocketServer({noServer: true});

  server.on('upgrade', (req, socket, head) => {
    const roomInstanceId = parseRoomInstanceId(req.url);
    if (!roomInstanceId) {
      socket.destroy();
      return;
    }

    const token = parseToken(req.url, req.headers);
    const payload = token ? verifyToken(token) : null;
    if (!payload) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const ctx: WsContext = {userId: payload.sub, roomInstanceId};
      audit({event_type: 'ws.chat.open', user_id: ctx.userId, scope: roomInstanceId});

      ws.on('message', (raw) => {
        let json: unknown;
        try {
          json = JSON.parse(raw.toString());
        } catch {
          send(ws, {type: 'error', message: 'invalid_json'});
          return;
        }

        const parsed = WsClientMessageSchema.safeParse(json);
        if (!parsed.success) {
          send(ws, {type: 'error', message: 'invalid_message'});
          return;
        }

        if (parsed.data.type === 'ping') {
          send(ws, {type: 'pong'});
          return;
        }

        // type === 'chat' — fire & forget : le streaming pousse les chunks au fil de l'eau.
        void handleChat(ws, ctx, parsed.data.content);
      });

      ws.on('close', () => {
        audit({event_type: 'ws.chat.close', user_id: ctx.userId, scope: roomInstanceId});
      });
    });
  });

  return wss;
}
