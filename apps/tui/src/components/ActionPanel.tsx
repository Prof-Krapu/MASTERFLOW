import React from 'react';
import {Box, Text} from 'ink';

import type {Action} from '@masterflow/shared';

interface ActionPanelProps {
  action: Action | null;
  hint: string | null;
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'gray',
  candidate: 'gray',
  preflight: 'yellow',
  pending_validation: 'yellow',
  approved: 'green',
  executing: 'cyan',
  completed: 'green',
  rejected: 'red',
  failed: 'red',
  stale: 'gray',
};

/** Panneau du cycle d'action en cours : état, preflight, résultat/erreur, prochaine commande. */
export function ActionPanel({action, hint}: ActionPanelProps): React.ReactElement | null {
  if (!action) return null;
  const color = STATUS_COLOR[action.status] ?? 'white';
  const pf = action.preflight;
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text>
        {'Action '}
        <Text bold>{action.registry_id ?? action.intent}</Text>
        {'  ·  état '}
        <Text color={color} bold>
          {action.status}
        </Text>
        {action.risk_level ? <Text dimColor>{'  ·  risque '}{action.risk_level}</Text> : null}
      </Text>
      {pf ? (
        <Text dimColor>
          {`preflight: permission=${pf.permission_check}, validation_requise=${String(
            pf.requires_validation,
          )}${pf.context_locks.length ? `, locks=${pf.context_locks.join(',')}` : ''}`}
        </Text>
      ) : null}
      {action.error ? <Text color="red">{'erreur: '}{action.error}</Text> : null}
      {action.result ? (
        <Text color="green">{'résultat: '}{JSON.stringify(action.result)}</Text>
      ) : null}
      {hint ? <Text color="yellow">{hint}</Text> : null}
    </Box>
  );
}
