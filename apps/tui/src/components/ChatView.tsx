import React from 'react';
import {Box, Text} from 'ink';

/** Un tour de conversation affiché : utilisateur, persona (streamé), ou message système. */
export interface ChatTurn {
  id: number;
  role: 'user' | 'persona' | 'system';
  speaker?: string;
  text: string;
  attribution?: string | null;
  streaming?: boolean;
}

interface ChatViewProps {
  turns: ChatTurn[];
  maxVisible?: number;
}

/** Fil de conversation. Affiche au plus `maxVisible` derniers tours (viewport terminal). */
export function ChatView({turns, maxVisible = 14}: ChatViewProps): React.ReactElement {
  const visible = turns.slice(-maxVisible);
  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      {turns.length === 0 && (
        <Text dimColor>Parle à ton persona, ou tape /help pour les commandes.</Text>
      )}
      {visible.map((turn) => (
        <TurnLine key={turn.id} turn={turn} />
      ))}
    </Box>
  );
}

function TurnLine({turn}: {turn: ChatTurn}): React.ReactElement {
  if (turn.role === 'system') {
    return <Text dimColor>· {turn.text}</Text>;
  }
  const label = turn.role === 'user' ? 'toi' : turn.speaker ?? 'persona';
  const color = turn.role === 'user' ? 'cyan' : 'magenta';
  return (
    <Box flexDirection="column">
      <Text>
        <Text color={color} bold>
          {label}
        </Text>
        <Text>{' › '}</Text>
        <Text>
          {turn.text}
          {turn.streaming ? '▌' : ''}
        </Text>
      </Text>
      {turn.attribution ? <Text dimColor>{'  ↳ '}{turn.attribution}</Text> : null}
    </Box>
  );
}
