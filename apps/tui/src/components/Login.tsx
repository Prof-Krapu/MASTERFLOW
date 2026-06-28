import React, {useState} from 'react';
import {Box, Text} from 'ink';

import {LineEditor} from './LineEditor.tsx';

interface LoginProps {
  onSubmit: (username: string, password: string) => void;
  error: string | null;
  busy: boolean;
  defaultUsername: string;
}

/** Écran de connexion : saisie utilisateur puis mot de passe (Entrée valide chaque champ). */
export function Login({onSubmit, error, busy, defaultUsername}: LoginProps): React.ReactElement {
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState('');

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="cyan">
      <Text color="cyan" bold>
        MasterFlow TUI — connexion
      </Text>
      <Box>
        <Text>{'Utilisateur  : '}</Text>
        <LineEditor
          value={username}
          onChange={setUsername}
          onSubmit={() => setStep('password')}
          isActive={step === 'username' && !busy}
        />
      </Box>
      <Box>
        <Text>{'Mot de passe : '}</Text>
        <LineEditor
          value={password}
          onChange={setPassword}
          onSubmit={() => onSubmit(username, password)}
          isActive={step === 'password' && !busy}
          mask
        />
      </Box>
      {busy && <Text dimColor>Connexion…</Text>}
      {error && <Text color="red">Échec : {error}</Text>}
      <Text dimColor>Entrée pour valider chaque champ · Ctrl+C pour quitter</Text>
    </Box>
  );
}
