/**
 * Hook React de chat temps réel (WebSocket) pour le PoC.
 *
 * Ouvre une connexion vers `/ws/{room_instance_id}` (proxifiée par Vite vers le backend
 * `:8000`), décode les messages serveur du contrat `@masterflow/shared` et expose un état
 * de chat prêt pour l'UI : liste des messages, porte-parole courant, attribution de méthode,
 * statut de connexion, et un `send()` pour émettre un message utilisateur.
 *
 * Cycle de streaming : `chat_start` (ouvre un message assistant vide) →
 * `chat_chunk` (accumule le texte) → `chat_end` (fige le message + `method_attribution`).
 * Pas de reconnexion automatique (PoC) ; la socket est fermée proprement au démontage.
 */

import {useCallback, useEffect, useRef, useState} from 'react';
import type {WsClientMessage, WsServerMessage} from '@masterflow/shared';

/** Rôle de l'émetteur d'un message affiché. */
export type ChatRole = 'user' | 'assistant';

/** Statut de la connexion WebSocket exposé à l'UI. */
export type ChatStatus = 'connecting' | 'open' | 'closed' | 'error';

/** Un message affichable dans le fil de discussion. */
export interface ChatMessage {
  /** Identifiant local stable (clé de rendu React). */
  id: string;
  /** Émetteur : utilisateur ou assistant (persona). */
  role: ChatRole;
  /** Texte du message (accumulé pendant le streaming pour l'assistant). */
  content: string;
  /** Persona porte-parole (assistant uniquement), si connu. */
  persona_id?: string;
  /** Nom du porte-parole annoncé à `chat_start` (assistant uniquement). */
  speaker?: string;
  /** Attribution de méthode figée à la fin du streaming (assistant uniquement). */
  method_attribution?: string | null;
  /** `true` tant que le message assistant reçoit encore des chunks. */
  streaming: boolean;
}

/** Valeur de retour du hook {@link useChatWs}. */
export interface UseChatWs {
  /** Fil de discussion complet (ordre chronologique). */
  messages: ChatMessage[];
  /** Nom/identifiant du porte-parole courant (depuis `chat_start`), ou `null`. */
  currentSpeaker: string | null;
  /** Dernière attribution de méthode reçue (depuis `chat_end`), ou `null`. */
  methodAttribution: string | null;
  /** Émet un message utilisateur sur la socket. */
  send: (content: string) => void;
  /** Statut courant de la connexion. */
  status: ChatStatus;
}

/** Génère un identifiant local unique pour un message. */
function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook de chat WebSocket consommant le vrai backend MasterFlow.
 *
 * @param roomInstanceId Identifiant de la room instance à rejoindre, ou `null` pour
 *   ne pas ouvrir de connexion (ex. avant login / sélection du contexte).
 * @param token Token JWT d'authentification, ou `null` pour ne pas se connecter.
 * @returns L'état de chat et l'émetteur {@link UseChatWs}.
 */
export function useChatWs(
  roomInstanceId: string | null,
  token: string | null,
): UseChatWs {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [methodAttribution, setMethodAttribution] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>('closed');

  /** Référence vers la socket active (pour `send` et le cleanup). */
  const socketRef = useRef<WebSocket | null>(null);
  /** Id du message assistant en cours de streaming (cible des chunks). */
  const streamingIdRef = useRef<string | null>(null);

  /**
   * Applique un message serveur décodé à l'état local.
   * Isolé pour rester lisible et typé exhaustivement sur l'union discriminée.
   */
  const handleServerMessage = useCallback((msg: WsServerMessage): void => {
    switch (msg.type) {
      case 'chat_start': {
        // Ouvre un nouveau message assistant vide qui recevra les chunks.
        const id = makeId();
        streamingIdRef.current = id;
        setCurrentSpeaker(msg.speaker);
        setMessages((prev) => [
          ...prev,
          {
            id,
            role: 'assistant',
            content: '',
            persona_id: msg.persona_id,
            speaker: msg.speaker,
            method_attribution: null,
            streaming: true,
          },
        ]);
        break;
      }
      case 'chat_chunk': {
        // Accumule le texte dans le message en cours de streaming.
        const targetId = streamingIdRef.current;
        if (targetId === null) break;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId ? {...m, content: m.content + msg.content} : m,
          ),
        );
        break;
      }
      case 'chat_end': {
        // Fige le message : fin du streaming + attribution de méthode.
        const targetId = streamingIdRef.current;
        streamingIdRef.current = null;
        setMethodAttribution(msg.method_attribution);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  persona_id: msg.persona_id,
                  method_attribution: msg.method_attribution,
                  streaming: false,
                }
              : m,
          ),
        );
        break;
      }
      case 'error': {
        // Surface l'erreur serveur comme un message assistant dédié.
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: 'assistant',
            content: `[erreur] ${msg.message}`,
            method_attribution: null,
            streaming: false,
          },
        ]);
        break;
      }
      case 'pong':
        // Réponse au keepalive : aucun effet sur l'état.
        break;
      default:
        // Autres messages (blend_update, room_update, validation_required,
        // job_completed) non gérés par le PoC chat — ignorés silencieusement.
        break;
    }
  }, []);

  useEffect(() => {
    // Pas de room ou pas de token : on n'ouvre rien.
    if (!roomInstanceId || !token) {
      setStatus('closed');
      return;
    }

    // Construit l'URL WS via le proxy : ws(s)://<host>/ws/<id>?token=<jwt>.
    const scheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${scheme}://${window.location.host}/ws/${roomInstanceId}?token=${encodeURIComponent(
      token,
    )}`;

    setStatus('connecting');
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = (): void => {
      setStatus('open');
    };

    socket.onmessage = (event: MessageEvent<string>): void => {
      try {
        const parsed = JSON.parse(event.data) as WsServerMessage;
        handleServerMessage(parsed);
      } catch {
        // Message non-JSON ou malformé : ignoré (le PoC reste tolérant).
      }
    };

    socket.onerror = (): void => {
      setStatus('error');
    };

    socket.onclose = (): void => {
      setStatus('closed');
      streamingIdRef.current = null;
    };

    // Cleanup : ferme proprement la socket au démontage / changement de deps.
    return (): void => {
      socketRef.current = null;
      streamingIdRef.current = null;
      // Détache les handlers pour éviter une mise à jour d'état après démontage.
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close();
      }
    };
  }, [roomInstanceId, token, handleServerMessage]);

  /**
   * Émet un message utilisateur sur la socket et l'ajoute optimistement au fil.
   * @param content Texte saisi par l'utilisateur (ignoré si vide).
   */
  const send = useCallback((content: string): void => {
    const trimmed = content.trim();
    if (trimmed.length === 0) return;

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // Ajout optimiste du message utilisateur au fil.
    setMessages((prev) => [
      ...prev,
      {id: makeId(), role: 'user', content: trimmed, streaming: false},
    ]);

    const payload: WsClientMessage = {type: 'chat', content: trimmed};
    socket.send(JSON.stringify(payload));
  }, []);

  return {messages, currentSpeaker, methodAttribution, send, status};
}
