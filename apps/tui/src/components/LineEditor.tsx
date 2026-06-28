import React from 'react';
import {Text, useInput} from 'ink';

interface LineEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  isActive?: boolean;
  mask?: boolean;
  placeholder?: string;
}

/**
 * Champ texte mono-ligne minimal, sans dépendance externe (capture clavier via `useInput`).
 * Seul le champ `isActive` reçoit les frappes : on évite ainsi tout conflit entre plusieurs
 * éditeurs montés simultanément.
 */
export function LineEditor({
  value,
  onChange,
  onSubmit,
  isActive = true,
  mask = false,
  placeholder,
}: LineEditorProps): React.ReactElement {
  useInput(
    (input, key) => {
      if (key.return) {
        onSubmit(value);
        return;
      }
      if (key.backspace || key.delete) {
        onChange(value.slice(0, -1));
        return;
      }
      // On ignore les touches de contrôle/navigation : entrée texte simple uniquement.
      if (
        key.ctrl ||
        key.meta ||
        key.tab ||
        key.escape ||
        key.upArrow ||
        key.downArrow ||
        key.leftArrow ||
        key.rightArrow
      ) {
        return;
      }
      if (input) onChange(value + input);
    },
    {isActive},
  );

  const cursor = isActive ? '▌' : '';
  if (!value && placeholder) {
    return (
      <Text dimColor>
        {placeholder}
        {cursor}
      </Text>
    );
  }
  return (
    <Text>
      {mask ? '*'.repeat(value.length) : value}
      {cursor}
    </Text>
  );
}
