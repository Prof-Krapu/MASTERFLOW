import {useCallback, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {FeedbackTicketKind, FeedbackTicket} from '@masterflow/shared';

import {createFeedbackTicket, listMyFeedbackTickets} from './api.ts';

/**
 * Signalement utilisateur (bug / retour / autre) — portage du système de tickets
 * feedback d'API_manage côté utilisateur. Les tickets ouverts sont gérés par
 * l'admin dans la console (admin-console.tsx).
 */

const KINDS: {value: FeedbackTicketKind; label: string}[] = [
  {value: 'bug', label: 'Bug'},
  {value: 'retour', label: 'Retour / suggestion'},
  {value: 'autre', label: 'Autre'},
];

interface FeedbackFormProps {
  token: string;
}

export function FeedbackForm({token}: FeedbackFormProps): ReactElement {
  const [kind, setKind] = useState<FeedbackTicketKind>('bug');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [mine, setMine] = useState<FeedbackTicket[]>([]);

  const refreshMine = useCallback(async (): Promise<void> => {
    try {
      setMine(await listMyFeedbackTickets(token));
    } catch {
      // Affichage secondaire : ne bloque pas l'envoi.
    }
  }, [token]);

  const handleSubmit = useCallback(
    async (e: FormEvent): Promise<void> => {
      e.preventDefault();
      if (!message.trim()) return;
      setStatus('sending');
      try {
        await createFeedbackTicket({kind, message}, token);
        setMessage('');
        setStatus('sent');
        await refreshMine();
      } catch {
        setStatus('failed');
      }
    },
    [kind, message, token, refreshMine],
  );

  return (
    <article className="panel panel--wide feedback-form">
      <div className="panel-header">
        <h2>Signaler un problème</h2>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Type
          <select onChange={(e) => setKind(e.target.value as FeedbackTicketKind)} value={kind}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Message
          <textarea
            maxLength={8000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décrivez le problème ou votre suggestion…"
            rows={3}
            value={message}
          />
        </label>
        <button disabled={status === 'sending' || !message.trim()} type="submit">
          Envoyer
        </button>
        {status === 'sent' ? (
          <span className="feedback-status" style={{color: '#2E7D32'}}>
            Ticket envoyé, merci !
          </span>
        ) : null}
        {status === 'failed' ? (
          <span className="feedback-status" style={{color: '#A83232'}}>
            Échec de l’envoi.
          </span>
        ) : null}
      </form>

      {mine.length > 0 ? (
        <details>
          <summary>Mes signalements ({mine.length})</summary>
          <ul>
            {mine.map((t) => (
              <li key={t.id}>
                <strong>{KINDS.find((k) => k.value === t.kind)?.label ?? t.kind}</strong> — {t.message}{' '}
                <em className="admin-muted">
                  {t.status === 'resolved'
                    ? `résolu${t.resolution_note ? ` : ${t.resolution_note}` : ''}`
                    : 'en attente'}
                </em>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <button className="secondary" onClick={() => void refreshMine()} type="button">
          Voir mes signalements
        </button>
      )}
    </article>
  );
}
