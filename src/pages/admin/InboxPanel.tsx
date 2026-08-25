import {useCallback, useEffect, useMemo, useState} from 'react';
import {AlertTriangle, Check, ChevronDown, ChevronRight, Inbox, MessageSquare, RefreshCw, Trash2} from 'lucide-react';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

interface FeedbackTicket {
  id: number;
  user_id: string;
  username: string | null;
  app: 'pc' | 'fr' | 'nl' | 'es' | 'svt' | 'maths' | 'ses' | 'tech' | 'en' | 'philo' | 'hg';
  kind: 'error' | 'feedback';
  ts: number;
  matiere: string | null;
  ds_titre: string | null;
  niveau: string | null;
  step: string | null;
  model: string | null;
  status_code: number | null;
  satisfaction: string | null;
  category: string | null;
  message: string | null;
  context_json: string | null;
  read: number;
  resolved: number;
}

const APP_COLOR: Record<FeedbackTicket['app'], string> = {
  pc: 'var(--pc-color)',
  fr: 'var(--fr-color)',
  nl: 'var(--nl-color)',
  es: 'var(--es-color)',
  svt: 'var(--svt-color)',
  maths: 'var(--maths-color)',
  ses: 'var(--ses-color)',
  tech: 'var(--tech-color)',
  en: 'var(--en-color)',
  philo: 'var(--philo-color)',
  hg: 'var(--hg-color)',
};

const APP_LABEL: Record<string, string> = {
  pc: 'Physique-Chimie',
  fr: 'Français',
  nl: 'Néerlandais',
  es: 'Espagnol',
  svt: 'SVT',
  maths: 'Mathématiques',
  ses: 'Sciences Économiques et Sociales',
  tech: 'Technologie',
  en: 'Anglais',
  philo: 'Philosophie',
  hg: 'Histoire-Géographie',
};

const STEP_LABEL: Record<string, string> = {
  extraction_bareme: 'Extraction barème',
  ocr_corrige: 'OCR corrigé',
  ocr_copie: 'OCR copie',
  correction: 'Correction',
  resultats: 'Résultats',
};

const CATEGORY_LABEL: Record<string, string> = {
  note_injuste: 'Note injuste',
  hallucination: 'Hallucination',
  ocr_rate: 'OCR raté',
  bareme: 'Barème',
  autre: 'Autre',
};

type KindFilter = 'all' | 'error' | 'feedback';

async function fetchTickets(kind: KindFilter, app: string, unreadOnly: boolean): Promise<FeedbackTicket[]> {
  const params = new URLSearchParams();
  if (kind !== 'all') params.set('kind', kind);
  if (app) params.set('app', app);
  if (unreadOnly) params.set('unread', '1');
  const query = params.toString() ? `?${params.toString()}` : '';
  const r = await fetch(`/api/v1/admin/feedback${query}`, {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {tickets: FeedbackTicket[]}).tickets;
}

async function patchTicket(id: number, patch: {read?: boolean; resolved?: boolean}): Promise<void> {
  const r = await fetch(`/api/v1/admin/feedback/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

async function deleteTicket(id: number): Promise<void> {
  const r = await fetch(`/api/v1/admin/feedback/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}

async function deleteResolved(kind: KindFilter, app: string): Promise<number> {
  const params = new URLSearchParams();
  if (kind !== 'all') params.set('kind', kind);
  if (app) params.set('app', app);
  const query = params.toString() ? `?${params.toString()}` : '';
  const r = await fetch(`/api/v1/admin/feedback/resolved${query}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {deleted: number}).deleted;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InboxPanel() {
  const [tickets, setTickets] = useState<FeedbackTicket[]>([]);
  const [kind, setKind] = useState<KindFilter>('all');
  const [app, setApp] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTickets(kind, app, unreadOnly)
      .then(setTickets)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [kind, app, unreadOnly]);

  useEffect(() => {
    reload();
  }, [reload]);

  const counts = useMemo(() => {
    let errors = 0;
    let feedbacks = 0;
    let unread = 0;
    let resolved = 0;
    for (const t of tickets) {
      if (t.kind === 'error') errors++;
      else feedbacks++;
      if (!t.read) unread++;
      if (t.resolved) resolved++;
    }
    return {errors, feedbacks, unread, resolved, total: tickets.length};
  }, [tickets]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Ouvrir un ticket non-lu le marque lu.
    const t = tickets.find((x) => x.id === id);
    if (t && !t.read) {
      void mutate(id, {read: true});
    }
  }

  async function mutate(id: number, patch: {read?: boolean; resolved?: boolean}) {
    // Optimiste : on met à jour localement, puis on persiste.
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              read: patch.read !== undefined ? (patch.read ? 1 : 0) : t.read,
              resolved: patch.resolved !== undefined ? (patch.resolved ? 1 : 0) : t.resolved,
            }
          : t,
      ),
    );
    try {
      await patchTicket(id, patch);
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  }

  async function handleDeleteResolved() {
    const n = counts.resolved;
    if (n === 0) return;
    const ok = window.confirm(
      `Supprimer ${n} ticket${n > 1 ? 's' : ''} résolu${n > 1 ? 's' : ''} ?\n\n` +
        `Seuls les tickets de la vue filtrée actuelle sont concernés. Action irréversible.`,
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await deleteResolved(kind, app);
      reload();
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  async function handleDeleteOne(t: FeedbackTicket) {
    const titre = t.ds_titre || t.matiere || APP_LABEL[t.app] || t.app;
    const ok = window.confirm(
      `Supprimer ce ticket « ${titre} » ?\n\nAction irréversible.`,
    );
    if (!ok) return;
    // Optimiste : on retire localement puis on persiste.
    setTickets((prev) => prev.filter((x) => x.id !== t.id));
    setExpanded((prev) => {
      if (!prev.has(t.id)) return prev;
      const next = new Set(prev);
      next.delete(t.id);
      return next;
    });
    try {
      await deleteTicket(t.id);
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-sm border border-border border-t-2 border-t-primary">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Tickets &amp; erreurs
              </div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Boîte de réception
              </CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as KindFilter)}
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tous les types</option>
                <option value="error">Erreurs</option>
                <option value="feedback">Retours</option>
              </select>
              <select
                value={app}
                onChange={(e) => setApp(e.target.value)}
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Toutes matières</option>
                {Object.entries(APP_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={unreadOnly}
                  onChange={(e) => setUnreadOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Non-lus
              </label>
              <button
                onClick={handleDeleteResolved}
                disabled={loading || counts.resolved === 0}
                className="inline-flex items-center gap-1 rounded-sm border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                title={
                  counts.resolved === 0
                    ? 'Aucun ticket résolu dans la vue actuelle'
                    : 'Supprimer les tickets résolus (vue filtrée)'
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Supprimer les résolus</span>
                {counts.resolved > 0 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px] font-bold leading-4 tabular-nums">
                    {counts.resolved}
                  </span>
                )}
              </button>
              <button
                onClick={reload}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-sm border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Retours des utilisateurs et erreurs de pipeline auto-signalées par les correcteurs
            (mode managé uniquement). {counts.total} ticket(s) · {counts.errors} erreur(s) ·{' '}
            {counts.feedbacks} retour(s) · {counts.unread} non-lu(s) · {counts.resolved} résolu(s).
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {tickets.length === 0 ? (
            <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-12 text-center text-sm text-muted-foreground">
              Aucun ticket pour ces filtres — les retours et erreurs arrivent dès qu'un invité
              corrige une copie.
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <TicketRow
                  key={t.id}
                  t={t}
                  open={expanded.has(t.id)}
                  onToggle={() => toggle(t.id)}
                  onResolve={(v) => mutate(t.id, {resolved: v})}
                  onRead={(v) => mutate(t.id, {read: v})}
                  onDelete={() => handleDeleteOne(t)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TicketRow({
  t,
  open,
  onToggle,
  onResolve,
  onRead,
  onDelete,
}: {
  t: FeedbackTicket;
  open: boolean;
  onToggle: () => void;
  onResolve: (v: boolean) => void;
  onRead: (v: boolean) => void;
  onDelete: () => void;
}) {
  const isError = t.kind === 'error';
  let context: Record<string, unknown> | null = null;
  if (t.context_json) {
    try {
      context = JSON.parse(t.context_json) as Record<string, unknown>;
    } catch {
      context = null;
    }
  }

  return (
    <div className={`overflow-hidden rounded-sm border ${t.read ? '' : 'border-l-2 border-l-primary'}`}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        onClick={onToggle}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isError
              ? 'bg-destructive/15 text-destructive'
              : 'bg-primary/15 text-primary'
          }`}
        >
          {isError ? <AlertTriangle className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
          {isError ? 'Erreur' : 'Retour'}
        </span>
        <span
          className="inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
          style={{backgroundColor: APP_COLOR[t.app] ?? '#666'}}
          title={APP_LABEL[t.app] ?? t.app}
        >
          {t.app}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-sm ${t.read ? 'font-medium' : 'font-semibold'}`}>
            {t.ds_titre || t.matiere || APP_LABEL[t.app] || t.app}
            {isError && t.status_code ? ` — HTTP ${t.status_code}` : ''}
            {!isError && t.satisfaction === 'non_satisfait' ? ' — pas satisfait' : ''}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {t.message || '(sans message)'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {t.resolved ? (
            <span className="inline-flex items-center gap-1 rounded-sm bg-[var(--green-emeraude,#10b981)]/15 px-1.5 py-0.5 font-semibold text-[var(--green-emeraude,#10b981)]">
              <Check className="h-3 w-3" /> Résolu
            </span>
          ) : null}
          <span className="tabular-nums">{fmtDate(t.ts)}</span>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <Field label="Utilisateur" value={t.username ?? t.user_id.slice(0, 8)} />
            <Field label="Matière" value={t.matiere ?? APP_LABEL[t.app] ?? t.app} />
            <Field label="DS" value={t.ds_titre ?? '—'} />
            <Field label="Niveau" value={t.niveau ?? '—'} />
            <Field label="Étape" value={t.step ? STEP_LABEL[t.step] ?? t.step : '—'} />
            <Field label="Modèle" value={t.model ?? '—'} />
            {isError && <Field label="Code HTTP" value={t.status_code ? String(t.status_code) : '—'} />}
            {!isError && (
              <Field
                label="Satisfaction"
                value={t.satisfaction === 'satisfait' ? 'Satisfait' : t.satisfaction === 'non_satisfait' ? 'Pas satisfait' : '—'}
              />
            )}
            {!isError && (
              <Field label="Catégorie" value={t.category ? CATEGORY_LABEL[t.category] ?? t.category : '—'} />
            )}
          </dl>

          {t.message && (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Message
              </div>
              <p className="mt-1 whitespace-pre-wrap rounded-sm border bg-background px-3 py-2">
                {t.message}
              </p>
            </div>
          )}

          {context && Object.keys(context).length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Contexte
              </div>
              <pre className="mt-1 overflow-x-auto rounded-sm border bg-background px-3 py-2 text-xs">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onResolve(!t.resolved)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
            >
              <Check className="h-3.5 w-3.5" />
              {t.resolved ? 'Rouvrir' : 'Marquer résolu'}
            </button>
            <button
              onClick={() => onRead(!t.read)}
              className="inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t.read ? 'Marquer non-lu' : 'Marquer lu'}
            </button>
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              title="Supprimer ce ticket"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </div>
  );
}
