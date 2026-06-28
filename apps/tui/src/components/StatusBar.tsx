import React from 'react';
import {Box, Text} from 'ink';

import type {ChatState} from '../lib/ws.ts';

interface StatusBarProps {
  username: string;
  role: string;
  roomName: string;
  speaker: string | null;
  chatState: ChatState;
}

const STATE_LABEL: Record<ChatState, string> = {
  connecting: 'connexion…',
  open: 'connecté',
  closed: 'fermé',
  error: 'erreur',
};

const STATE_COLOR: Record<ChatState, string> = {
  connecting: 'yellow',
  open: 'green',
  closed: 'gray',
  error: 'red',
};

/** Barre de statut : identité/rôle, room, persona porte-parole, état du WS de chat. */
export function StatusBar({
  username,
  role,
  roomName,
  speaker,
  chatState,
}: StatusBarProps): React.ReactElement {
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
      <Text>
        <Text color="cyan" bold>
          {username}
        </Text>{' '}
        <Text dimColor>({role})</Text>
        {'  ·  room '}
        <Text bold>{roomName}</Text>
        {'  ·  persona '}
        <Text color="magenta">{speaker ?? '—'}</Text>
      </Text>
      <Text>
        {'WS '}
        <Text color={STATE_COLOR[chatState]}>{STATE_LABEL[chatState]}</Text>
      </Text>
    </Box>
  );
}
