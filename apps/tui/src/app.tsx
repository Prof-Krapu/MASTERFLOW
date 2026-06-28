import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Box, Text, useApp} from 'ink';

import type {Action, CurrentContext, WsServerMessage} from '@masterflow/shared';

import {ActionPanel} from './components/ActionPanel.tsx';
import {ChatView, type ChatTurn} from './components/ChatView.tsx';
import {LineEditor} from './components/LineEditor.tsx';
import {Login} from './components/Login.tsx';
import {StatusBar} from './components/StatusBar.tsx';
import {HELP_LINES, hintForAction, listLiveActions, parseCommand} from './lib/agent-loop.ts';
import {ApiError, MasterFlowClient} from './lib/client.ts';
import {loadConfig} from './lib/config.ts';
import {openChatSocket, type ChatSocket, type ChatState} from './lib/ws.ts';

const config = loadConfig();

/** Application TUI : connexion → contexte/loadout → chat streamé + cycle d'actions. */
export function App(): React.ReactElement {
  const {exit} = useApp();
  const clientRef = useRef<MasterFlowClient>(new MasterFlowClient(config.apiBase));
  const socketRef = useRef<ChatSocket | null>(null);
  const turnSeq = useRef(0);
  const streamingId = useRef<number | null>(null);

  const [phase, setPhase] = useState<'login' | 'ready'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginBusy, setLoginBusy] = useState(false);

  const [context, setContext] = useState<CurrentContext | null>(null);
  const [speaker, setSpeaker] = useState<string | null>(null);
  const [chatState, setChatState] = useState<ChatState>('closed');

  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');

  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);

  const addTurn = useCallback((turn: Omit<ChatTurn, 'id'>): number => {
    const id = ++turnSeq.current;
    setTurns((prev) => [...prev, {...turn, id}]);
    return id;
  }, []);

  const addSystem = useCallback((text: string): void => {
    addTurn({role: 'system', text});
  }, [addTurn]);

  // ── WebSocket : flux de chat streamé token-par-token ──────────────────────────
  const onWsMessage = useCallback(
    (msg: WsServerMessage): void => {
      switch (msg.type) {
        case 'chat_start': {
          setSpeaker(msg.speaker);
          const id = ++turnSeq.current;
          streamingId.current = id;
          setTurns((prev) => [
            ...prev,
            {id, role: 'persona', speaker: msg.speaker, text: '', streaming: true},
          ]);
          break;
        }
        case 'chat_chunk': {
          const id = streamingId.current;
          if (id !== null) {
            setTurns((prev) =>
              prev.map((t) => (t.id === id ? {...t, text: t.text + msg.content} : t)),
            );
          }
          break;
        }
        case 'chat_end': {
          const id = streamingId.current;
          if (id !== null) {
            setTurns((prev) =>
              prev.map((t) =>
                t.id === id ? {...t, streaming: false, attribution: msg.method_attribution} : t,
              ),
            );
          }
          streamingId.current = null;
          break;
        }
        case 'blend_update':
          setSpeaker(msg.blend.primary_persona.name);
          break;
        case 'validation_required':
          addSystem(`validation requise (action ${msg.action_id}) : ${msg.summary}`);
          break;
        case 'job_completed':
          addSystem(`job ${msg.job_id} : ${msg.status}`);
          break;
        case 'error':
          addSystem(`erreur WS : ${msg.message}`);
          break;
        case 'room_update':
        case 'pong':
          break;
      }
    },
    [addSystem],
  );

  // ── Connexion : login → contexte → ouverture du WS ────────────────────────────
  const handleLogin = useCallback(
    async (username: string, password: string): Promise<void> => {
      setLoginBusy(true);
      setLoginError(null);
      try {
        const client = clientRef.current;
        await client.login(username, password);
        const ctx = await client.currentContext();
        setContext(ctx);
        setSpeaker(ctx.active_blend?.primary_persona.name ?? ctx.personas[0]?.name ?? null);
        setPhase('ready');

        const token = client.bearer;
        if (token) {
          socketRef.current = openChatSocket(config.wsBase, ctx.room_instance.id, token, {
            onMessage: onWsMessage,
            onState: setChatState,
          });
        }
        addSystem(
          `connecté : ${ctx.user.username} (${ctx.user.role}) — room ${ctx.room.name}. Tape /help.`,
        );
      } catch (err) {
        setLoginError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoginBusy(false);
      }
    },
    [addSystem, onWsMessage],
  );

  useEffect(() => () => socketRef.current?.close(), []);

  // ── Cycle d'action : exécute un appel et reflète le nouvel état + l'indice suivant ──
  const runAction = useCallback(
    async (fn: () => Promise<Action>): Promise<void> => {
      try {
        const action = await fn();
        setCurrentAction(action);
        setActionHint(hintForAction(action));
      } catch (err) {
        const message =
          err instanceof ApiError ? `${err.message} (HTTP ${err.status})` : String(err);
        addSystem(`action : ${message}`);
      }
    },
    [addSystem],
  );

  // ── Boucle de commandes (entrée conversationnelle unique) ─────────────────────
  const handleSubmit = useCallback(
    (raw: string): void => {
      setInput('');
      const cmd = parseCommand(raw);
      const client = clientRef.current;
      const ctx = context;

      switch (cmd.kind) {
        case 'empty':
          return;
        case 'help':
          HELP_LINES.forEach((line) => addSystem(line));
          return;
        case 'quit':
          socketRef.current?.close();
          exit();
          return;
        case 'context':
          if (ctx) {
            addSystem(
              `room ${ctx.room.name} · persona ${speaker ?? '—'} · rôle ${ctx.user.role} · room_instance ${ctx.room_instance.id}`,
            );
          }
          return;
        case 'actions': {
          if (!ctx) return;
          const live = listLiveActions(ctx);
          if (!live.length) {
            addSystem('aucune action live dans ton loadout.');
            return;
          }
          addSystem(`${live.length} action(s) live :`);
          live.forEach((a) =>
            addSystem(
              `  ${a.action_id} — ${a.label} [${a.risk_level}${
                a.validation_required === true ? ', validation' : ''
              }]`,
            ),
          );
          return;
        }
        case 'chat':
          if (!socketRef.current || chatState !== 'open') {
            addSystem('chat indisponible (WS non connecté).');
            return;
          }
          addTurn({role: 'user', text: cmd.content});
          socketRef.current.send({type: 'chat', content: cmd.content});
          return;
        case 'act': {
          if (!ctx) return;
          const entry = ctx.available_actions.find((a) => a.action_id === cmd.registryId);
          void runAction(() =>
            client
              .createAction({
                registry_id: cmd.registryId,
                intent: cmd.intent || entry?.label || cmd.registryId,
                object_type: entry?.ui_surface ?? 'generic',
                room_id: ctx.room.id,
                payload: {},
              })
              .then((created) => client.preflight(created.id)),
          );
          return;
        }
        case 'approve':
        case 'reject': {
          if (!currentAction) {
            addSystem('aucune action en cours à valider.');
            return;
          }
          const decision = cmd.kind === 'approve' ? 'approved' : 'rejected';
          void runAction(() => client.validate(currentAction.id, {decision, note: cmd.note}));
          return;
        }
        case 'exec':
          if (!currentAction) {
            addSystem('aucune action en cours à exécuter.');
            return;
          }
          void runAction(() => client.execute(currentAction.id));
          return;
        case 'unknown':
          addSystem(`commande inconnue : /${cmd.name} (voir /help)`);
          return;
      }
    },
    [addSystem, addTurn, chatState, context, currentAction, exit, runAction, speaker],
  );

  if (phase === 'login') {
    return (
      <Login
        onSubmit={(u, p) => void handleLogin(u, p)}
        error={loginError}
        busy={loginBusy}
        defaultUsername={config.defaultUsername}
      />
    );
  }

  return (
    <Box flexDirection="column">
      <StatusBar
        username={context?.user.username ?? '—'}
        role={context?.user.role ?? '—'}
        roomName={context?.room.name ?? '—'}
        speaker={speaker}
        chatState={chatState}
      />
      <ChatView turns={turns} />
      <ActionPanel action={currentAction} hint={actionHint} />
      <Box paddingX={1}>
        <Text color="cyan">{'» '}</Text>
        <LineEditor
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          isActive={phase === 'ready'}
          placeholder="message ou /commande (ex. /help)"
        />
      </Box>
    </Box>
  );
}
