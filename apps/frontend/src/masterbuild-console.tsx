import {AlertTriangle, GitBranch, LoaderCircle, RefreshCw, Send, ShieldCheck} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

type MasterbuildStatus = {
  generated_at: string;
  state: {
    program: {title: string; status: string};
    active_round: {
      round_id: string;
      title: string;
      stage_index: number;
      stage_label: string;
      recommended_next_action: string;
      primary_risk: string;
      blockers: string[];
    };
    domains: Array<{id: string; label: string; status: string}>;
  };
  git: {
    branch: string | null;
    sha: string | null;
    ahead: number;
    behind: number;
    dirty: boolean;
    files: Array<{status: string; path: string}>;
  };
  runtime: {available: boolean; health: {ok?: boolean; service?: string} | null};
  findings: Array<{finding_id: string; reason: string; action: string}>;
  learning: {proposals: Array<{id: string; signal: string; proposal: string; status: string}>};
};

type ChatTurn = {id: string; role: 'user' | 'masterbuild'; content: string};

const MASTERBUILD_API = '/masterbuild-api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MASTERBUILD_API}${path}`, {
    ...init,
    headers: {'Content-Type': 'application/json', ...(init?.headers ?? {})},
  });
  const body = await response.json() as T & {error?: string};
  if (!response.ok) throw new Error(body.error ?? `MasterBuild HTTP ${response.status}`);
  return body;
}

export function MasterbuildConsole({operator}: {operator: string}): ReactElement {
  const [status, setStatus] = useState<MasterbuildStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'masterbuild',
      content: 'Je transforme tes retours en propositions candidates. Rien n’est appliqué automatiquement.',
    },
  ]);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setStatus(await request<MasterbuildStatus>('/status'));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Console MasterBuild indisponible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const domainCounts = useMemo(() => status?.state.domains.reduce<Record<string, number>>((counts, domain) => {
    counts[domain.status] = (counts[domain.status] ?? 0) + 1;
    return counts;
  }, {}) ?? {}, [status]);

  const submitFeedback = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    setTurns((current) => [...current, {id: `user-${Date.now()}`, role: 'user', content: message}]);
    setInput('');
    setSending(true);
    try {
      await request('/learning/proposals', {
        method: 'POST',
        body: JSON.stringify({
          signal: `${operator} · retour Console GodMode : ${message}`,
          proposal: 'Auditer ce retour contre le canon, le code, Git et le runtime ; produire une tâche bornée avant toute modification.',
        }),
      });
      setTurns((current) => [...current, {
        id: `masterbuild-${Date.now()}`,
        role: 'masterbuild',
        content: 'Retour enregistré comme proposition candidate. Aucun code, canon, commit ou déploiement n’a été modifié.',
      }]);
      await load();
    } catch (cause) {
      setTurns((current) => [...current, {
        id: `masterbuild-error-${Date.now()}`,
        role: 'masterbuild',
        content: cause instanceof Error ? cause.message : 'Le retour n’a pas pu être enregistré.',
      }]);
    } finally {
      setSending(false);
    }
  };

  if (loading && !status) {
    return <section className="proto-masterbuild-console proto-masterbuild-console--loading"><LoaderCircle className="proto-spin" /> Orientation MasterBuild…</section>;
  }

  if (!status) {
    return (
      <section className="proto-masterbuild-console proto-masterbuild-console--unavailable">
        <AlertTriangle />
        <h2>Console MasterBuild indisponible</h2>
        <p>{error ?? 'Le service local ne répond pas.'}</p>
        <button onClick={() => void load()} type="button"><RefreshCw size={17} /> Réessayer</button>
      </section>
    );
  }

  const round = status.state.active_round;
  const gitClean = !status.git.dirty && status.git.ahead === 0 && status.git.behind === 0;

  return (
    <section className="proto-masterbuild-console" aria-label="Console MasterBuild GodMode">
      <header className="proto-masterbuild-console__header">
        <div>
          <small>GodMode · poste de contrôle</small>
          <h1>MasterBuild</h1>
          <p>{status.state.program.title}</p>
        </div>
        <button aria-label="Rafraîchir MasterBuild" onClick={() => void load()} type="button">
          <RefreshCw size={18} /> Actualiser
        </button>
      </header>

      <div className="proto-masterbuild-console__signals">
        <article>
          <ShieldCheck />
          <span><small>Round actif</small><strong>{round.round_id}</strong></span>
          <em>Étape {round.stage_index} · {round.stage_label}</em>
        </article>
        <article>
          <GitBranch />
          <span><small>Git local</small><strong>{status.git.branch ?? 'inconnu'}</strong></span>
          <em className={gitClean ? 'is-good' : 'is-warn'}>{gitClean ? 'aligné et propre' : `${status.git.files.length} changement(s) local(aux)`}</em>
        </article>
        <article>
          <span className="proto-masterbuild-console__runtime-dot" data-live={status.runtime.available} />
          <span><small>Runtime</small><strong>{status.runtime.available ? 'Disponible' : 'Indisponible'}</strong></span>
          <em>{domainCounts.implemented ?? 0} domaines implémentés · {domainCounts.partial ?? 0} partiels</em>
        </article>
      </div>

      <div className="proto-masterbuild-console__body">
        <div className="proto-masterbuild-console__orientation">
          <section>
            <small>Situation</small>
            <h2>{round.title}</h2>
            <p>{round.recommended_next_action}</p>
          </section>
          <section className="proto-masterbuild-console__risk">
            <AlertTriangle size={19} />
            <div><small>Risque principal</small><p>{round.primary_risk}</p></div>
          </section>
          <section className="proto-masterbuild-console__blockers">
            <small>Blocages et écarts</small>
            <ul>
              {round.blockers.slice(0, 3).map((blocker) => <li key={blocker}>{blocker}</li>)}
              {status.findings.slice(0, 2).map((finding) => <li key={finding.finding_id}>{finding.reason}</li>)}
            </ul>
          </section>
        </div>

        <aside className="proto-masterbuild-chat">
          <header><span><small>Retour à MasterBuild</small><strong>Chat de pilotage</strong></span><em>{status.learning.proposals.length} proposition(s)</em></header>
          <div className="proto-masterbuild-chat__turns">
            {turns.map((turn) => <p className={`is-${turn.role}`} key={turn.id}>{turn.content}</p>)}
          </div>
          <form onSubmit={(event) => void submitFeedback(event)}>
            <textarea
              aria-label="Retour pour MasterBuild"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ex. Project doit être visible dans mon compte…"
              rows={3}
              value={input}
            />
            <button disabled={sending || !input.trim()} type="submit">
              {sending ? <LoaderCircle className="proto-spin" size={18} /> : <Send size={18} />}
              Enregistrer le retour
            </button>
          </form>
          <small>Aucune application automatique · GO requis pour les actions sensibles.</small>
        </aside>
      </div>
    </section>
  );
}
