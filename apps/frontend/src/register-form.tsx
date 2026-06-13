import {useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {AuthResponse} from '@masterflow/shared';

import {register} from './api.ts';

/**
 * Inscription SUR INVITATION (PoC) — démontre le register invite-only de bout en bout.
 * Sans code valide, le backend répond 403 (`invite_required`). Le rôle du compte est
 * porté par le code, jamais choisi par le client.
 */
export function RegisterWithCode({onAuthed}: {onAuthed: (auth: AuthResponse) => void}): ReactElement {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const auth = await register({
        username,
        display_name: displayName,
        password,
        invite_code: code.trim(),
      });
      onAuthed(auth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="secondary" type="button" onClick={() => setOpen(true)}>
        S’inscrire avec un code d’accès
      </button>
    );
  }

  return (
    <form className="panel register" onSubmit={handleSubmit}>
      <p className="eyebrow">Inscription sur invitation</p>
      <label>
        Code d’accès
        <input type="text" value={code} onChange={(e) => setCode(e.target.value)} required />
      </label>
      <label>
        Identifiant
        <input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label>
        Nom affiché
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      <label>
        Mot de passe
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      <button disabled={busy} type="submit">
        {busy ? 'Création…' : 'Créer le compte'}
      </button>
      <button className="secondary" type="button" onClick={() => setOpen(false)}>
        Annuler
      </button>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
