import WebSocket from 'ws';

import {
  WsServerMessageSchema,
  type WsClientMessage,
  type WsServerMessage,
} from '@masterflow/shared';

/** État de la connexion de chat, projeté dans la barre de statut. */
export type ChatState = 'connecting' | 'open' | 'closed' | 'error';

export interface ChatSocketHandlers {
  onMessage: (msg: WsServerMessage) => void;
  onState: (state: ChatState) => void;
}

export interface ChatSocket {
  send: (msg: WsClientMessage) => void;
  close: () => void;
}

/**
 * Ouvre la connexion WS de chat sur `ws://host/ws/{room_instance_id}?token=<JWT>`.
 * Chaque trame entrante est parsée en `WsServerMessage` (Zod) ; les trames invalides
 * sont ignorées silencieusement plutôt que de casser le flux.
 */
export function openChatSocket(
  wsBase: string,
  roomInstanceId: string,
  token: string,
  handlers: ChatSocketHandlers,
): ChatSocket {
  const url = `${wsBase}/ws/${encodeURIComponent(roomInstanceId)}?token=${encodeURIComponent(token)}`;
  handlers.onState('connecting');
  const socket = new WebSocket(url);

  socket.on('open', () => handlers.onState('open'));
  socket.on('close', () => handlers.onState('closed'));
  socket.on('error', () => handlers.onState('error'));
  socket.on('message', (data: WebSocket.RawData) => {
    let payload: unknown;
    try {
      payload = JSON.parse(data.toString());
    } catch {
      return;
    }
    const parsed = WsServerMessageSchema.safeParse(payload);
    if (parsed.success) handlers.onMessage(parsed.data);
  });

  return {
    send: (msg) => {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
    },
    close: () => {
      try {
        socket.close();
      } catch {
        /* socket déjà fermé */
      }
    },
  };
}
