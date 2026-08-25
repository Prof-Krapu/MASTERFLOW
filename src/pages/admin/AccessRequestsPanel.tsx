import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Mail,
  Mails,
  Megaphone,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {
  adminAddSubscriber,
  adminApproveRequest,
  adminDeleteRequest,
  adminDeleteSubscriber,
  adminListMailing,
  adminListRequests,
  adminPatchRequest,
  adminRejectRequest,
  adminSetSubscriberActive,
  type AccessRequest,
  type MailingSubscriber,
} from '@/lib/access';

type StatusFilter = '' | 'pending' | 'approved' | 'rejected';

const STATUS_LABEL: Record<AccessRequest['status'], string> = {
  pending: 'En attente',
  approved: 'Approuvée',
  rejected: 'Refusée',
};

const STATUS_BADGE: Record<AccessRequest['status'], string> = {
  pending: 'bg-primary/15 text-primary',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-destructive/15 text-destructive',
};

function fmtDate(ts: number) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function registerUrl(code: string): string {
  return `${window.location.origin}/register?invite=${encodeURIComponent(code)}`;
}

/** Message d'invitation complet, réutilisé par le mailto et le bouton copier. */
function inviteMessage(code: string): string {
  return (
    `Bonjour,\n\nVotre demande d'accès à la bêta CORRECTORS a été acceptée.\n\n` +
    `Créez votre compte ici : ${registerUrl(code)}\n` +
    `(ou saisissez le code ${code} sur la page d'inscription)\n\nÀ bientôt !`
  );
}

function inviteMailto(email: string, code: string): string {
  const subject = 'Votre accès à la bêta CORRECTORS';
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inviteMessage(code))}`;
}

/**
 * Les données des deux sous-vues vivent ici : les compteurs des boutons segmentés
 * restent justes quel que soit l'écran affiché, et approuver une demande opt-in
 * rafraîchit aussi la liste de diffusion (un seul reload partagé).
 */
export function AccessRequestsPanel({
  view,
  onViewChange,
  onOpenNews,
}: {
  view: 'requests' | 'mailing';
  onViewChange: (view: 'requests' | 'mailing') => void;
  onOpenNews: () => void;
}) {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [subscribers, setSubscribers] = useState<MailingSubscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([adminListRequests(), adminListMailing()])
      .then(([reqs, subs]) => {
        setRequests(reqs);
        setSubscribers(subs);
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);
  const activeCount = useMemo(() => subscribers.filter((s) => s.active).length, [subscribers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex overflow-hidden rounded-sm border">
          <SegmentButton
            active={view === 'requests'}
            onClick={() => onViewChange('requests')}
            Icon={UserPlus}
            label="Demandes"
            count={pendingCount}
            countTitle={`${pendingCount} demande(s) en attente`}
          />
          <SegmentButton
            active={view === 'mailing'}
            onClick={() => onViewChange('mailing')}
            Icon={Mails}
            label="Liste de diffusion"
            count={activeCount}
            countTitle={`${activeCount} abonné(s) actif(s)`}
            withBorder
          />
        </div>
        <button
          onClick={reload}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-sm border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          title="Rafraîchir demandes et liste de diffusion"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {view === 'requests' ? (
        <RequestsView
          requests={requests}
          setRequests={setRequests}
          reload={reload}
          error={error}
          setError={setError}
        />
      ) : (
        <MailingView
          subscribers={subscribers}
          reload={reload}
          error={error}
          setError={setError}
          onOpenNews={onOpenNews}
        />
      )}
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  Icon,
  label,
  count,
  countTitle,
  withBorder,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof UserPlus;
  label: string;
  count: number;
  countTitle: string;
  withBorder?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${withBorder ? 'border-l' : ''} ${
        active ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted/50'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      {count > 0 && (
        <span
          title={countTitle}
          className={`inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-4 tabular-nums ${
            active ? 'bg-primary-foreground/25 text-primary-foreground' : 'bg-primary/10 text-primary'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Tuile statistique cliquable — sert à la fois d'indicateur et de filtre. */
function StatTile({
  label,
  value,
  accent,
  active,
  onClick,
  title,
}: {
  label: string;
  value: number;
  accent: string;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-sm border border-t-2 bg-card p-3 text-left transition-colors ${
        active ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted/30'
      }`}
      style={{borderTopColor: `var(${accent})`}}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold leading-none tabular-nums">{value}</div>
    </button>
  );
}

function RequestsView({
  requests,
  setRequests,
  reload,
  error,
  setError,
}: {
  requests: AccessRequest[];
  setRequests: React.Dispatch<React.SetStateAction<AccessRequest[]>>;
  reload: () => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let unread = 0;
    for (const r of requests) {
      if (r.status === 'pending') pending++;
      else if (r.status === 'approved') approved++;
      else rejected++;
      if (!r.read) unread++;
    }
    return {pending, approved, rejected, unread, total: requests.length};
  }, [requests]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (unreadOnly && r.read) return false;
      if (q && ![r.email, r.name ?? '', r.message ?? ''].some((v) => v.toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [requests, statusFilter, unreadOnly, search]);

  const filtered = statusFilter !== '' || unreadOnly || search.trim() !== '';

  function resetFilters() {
    setStatusFilter('');
    setUnreadOnly(false);
    setSearch('');
  }

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Ouvrir une demande non-lue la marque lue (optimiste).
    const r = requests.find((x) => x.id === id);
    if (r && !r.read) {
      setRequests((prev) => prev.map((x) => (x.id === id ? {...x, read: 1} : x)));
      adminPatchRequest(id, {read: true}).catch((e) => {
        setError((e as Error).message);
        reload();
      });
    }
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied((c) => (c === value ? null : c)), 1800);
    } catch {
      // Pas de retour si le clipboard est indisponible (HTTP non sécurisé p. ex.).
    }
  }

  async function handleApprove(r: AccessRequest) {
    setError(null);
    try {
      const code = await adminApproveRequest(r.id);
      setRequests((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {...x, status: 'approved', invite_code: code, processed_at: Date.now(), read: 1}
            : x,
        ),
      );
      // L'approbation d'un opt-in inscrit aussi l'email côté mailing → resynchroniser.
      if (r.mailing_opt_in) reload();
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  }

  async function handleReject(r: AccessRequest) {
    setError(null);
    try {
      await adminRejectRequest(r.id);
      setRequests((prev) =>
        prev.map((x) => (x.id === r.id ? {...x, status: 'rejected', processed_at: Date.now(), read: 1} : x)),
      );
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  }

  async function handleDelete(r: AccessRequest) {
    if (!window.confirm(`Supprimer la demande de « ${r.email} » ?\n\nAction irréversible.`)) return;
    setRequests((prev) => prev.filter((x) => x.id !== r.id));
    try {
      await adminDeleteRequest(r.id);
    } catch (e) {
      setError((e as Error).message);
      reload();
    }
  }

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Accès bêta
            </div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Demandes d'accès
            </CardTitle>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher (email, nom, message)"
              className="h-8 w-64 pl-8"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Demandes envoyées depuis le lien « Demander un accès » de la page de connexion.
          Cliquez une tuile pour filtrer, une demande pour la traiter.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="En attente"
            value={counts.pending}
            accent="--bf500"
            active={statusFilter === 'pending'}
            onClick={() => setStatusFilter((s) => (s === 'pending' ? '' : 'pending'))}
            title="N'afficher que les demandes en attente"
          />
          <StatTile
            label="Approuvées"
            value={counts.approved}
            accent="--green-emeraude"
            active={statusFilter === 'approved'}
            onClick={() => setStatusFilter((s) => (s === 'approved' ? '' : 'approved'))}
            title="N'afficher que les demandes approuvées"
          />
          <StatTile
            label="Refusées"
            value={counts.rejected}
            accent="--destructive"
            active={statusFilter === 'rejected'}
            onClick={() => setStatusFilter((s) => (s === 'rejected' ? '' : 'rejected'))}
            title="N'afficher que les demandes refusées"
          />
          <StatTile
            label="Non-lues"
            value={counts.unread}
            accent="--nl-color"
            active={unreadOnly}
            onClick={() => setUnreadOnly((v) => !v)}
            title="N'afficher que les demandes non-lues"
          />
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-12 text-center">
            <UserPlus className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">Aucune demande pour l'instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Elles arrivent dès qu'un visiteur remplit le formulaire d'accès bêta.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune demande ne correspond aux filtres.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered && (
              <p className="text-xs text-muted-foreground">
                {visible.length} demande(s) affichée(s) sur {counts.total}.
              </p>
            )}
            {visible.map((r) => (
              <RequestRow
                key={r.id}
                r={r}
                open={expanded.has(r.id)}
                copied={copied}
                onToggle={() => toggle(r.id)}
                onApprove={() => handleApprove(r)}
                onReject={() => handleReject(r)}
                onDelete={() => handleDelete(r)}
                onCopy={copy}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RequestRow({
  r,
  open,
  copied,
  onToggle,
  onApprove,
  onReject,
  onDelete,
  onCopy,
}: {
  r: AccessRequest;
  open: boolean;
  copied: string | null;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onCopy: (value: string) => void;
}) {
  return (
    <div className={`overflow-hidden rounded-sm border ${r.read ? '' : 'border-l-2 border-l-primary'}`}>
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
          className={`inline-flex shrink-0 items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[r.status]}`}
        >
          {STATUS_LABEL[r.status]}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className={`truncate text-sm ${r.read ? 'font-medium' : 'font-semibold'}`}>
            {r.name || r.email}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {r.name ? `${r.email} · ` : ''}
            {r.message || '(sans message)'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {r.mailing_opt_in ? (
            <span
              className="inline-flex items-center gap-1 rounded-sm bg-muted px-1.5 py-0.5 font-semibold"
              title="Souhaite être informé(e) des évolutions par email"
            >
              <Mails className="h-3 w-3" /> mailing
            </span>
          ) : null}
          <span className="tabular-nums">{fmtDate(r.created_at)}</span>
        </div>
      </button>

      {open && (
        <div className="border-t bg-muted/20 px-4 py-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <Field label="Email" value={r.email} />
            <Field label="Nom" value={r.name ?? '—'} />
            <Field label="Reçue le" value={fmtDate(r.created_at)} />
            <Field label="Mailing list" value={r.mailing_opt_in ? 'Oui (opt-in)' : 'Non'} />
            <Field label="Statut" value={STATUS_LABEL[r.status]} />
            <Field label="Traitée le" value={r.processed_at ? fmtDate(r.processed_at) : '—'} />
          </dl>

          {r.message && (
            <div className="mt-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Message
              </div>
              <p className="mt-1 whitespace-pre-wrap rounded-sm border bg-background px-3 py-2">
                {r.message}
              </p>
            </div>
          )}

          {r.status === 'approved' && r.invite_code && (
            <div className="mt-3 rounded-sm border border-l-4 border-l-primary bg-accent/40 p-3">
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                Invitation prête — à envoyer à {r.email}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-sm bg-card px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-foreground">
                  {r.invite_code}
                </code>
                <Button
                  size="sm"
                  onClick={() => {
                    window.location.href = inviteMailto(r.email, r.invite_code!);
                  }}
                >
                  <Mail className="mr-1 h-3.5 w-3.5" />
                  Ouvrir l'email pré-rempli
                </Button>
                <CopyButton value={r.invite_code} label="Copier le code" copied={copied} onCopy={onCopy} />
                <CopyButton
                  value={registerUrl(r.invite_code)}
                  label="Copier l'URL d'inscription"
                  copied={copied}
                  onCopy={onCopy}
                />
                <CopyButton
                  value={inviteMessage(r.invite_code)}
                  label="Copier le message complet"
                  copied={copied}
                  onCopy={onCopy}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                L'envoi est manuel : le bouton ouvre votre client mail avec le message pré-rempli.
              </p>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {r.status !== 'approved' && (
              <button
                onClick={onApprove}
                className="inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                <Check className="h-3.5 w-3.5" />
                Approuver
              </button>
            )}
            {r.status === 'pending' && (
              <button
                onClick={onReject}
                className="inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Refuser
              </button>
            )}
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              title="Supprimer cette demande"
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

function CopyButton({
  value,
  label,
  copied,
  onCopy,
}: {
  value: string;
  label: string;
  copied: string | null;
  onCopy: (value: string) => void;
}) {
  return (
    <Button variant="outline" size="sm" onClick={() => onCopy(value)}>
      {copied === value ? (
        <>
          <Check className="mr-1 h-3.5 w-3.5" /> Copié
        </>
      ) : (
        <>
          <Copy className="mr-1 h-3.5 w-3.5" /> {label}
        </>
      )}
    </Button>
  );
}

const SOURCE_LABEL: Record<MailingSubscriber['source'], string> = {
  access_request: 'Demande bêta',
  admin: 'Ajout manuel',
};

function MailingView({
  subscribers,
  reload,
  error,
  setError,
  onOpenNews,
}: {
  subscribers: MailingSubscriber[];
  reload: () => void;
  error: string | null;
  setError: (e: string | null) => void;
  onOpenNews: () => void;
}) {
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'inactive'>('');
  const [sourceFilter, setSourceFilter] = useState<'' | MailingSubscriber['source']>('');
  const [copiedAll, setCopiedAll] = useState(false);

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let beta = 0;
    let manual = 0;
    for (const s of subscribers) {
      if (s.active) active++;
      else inactive++;
      if (s.source === 'admin') manual++;
      else beta++;
    }
    return {active, inactive, beta, manual, total: subscribers.length};
  }, [subscribers]);

  const activeEmails = useMemo(
    () => subscribers.filter((s) => s.active).map((s) => s.email),
    [subscribers],
  );

  // Actifs d'abord, puis des plus récents aux plus anciens.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subscribers
      .filter((s) => {
        if (statusFilter === 'active' && !s.active) return false;
        if (statusFilter === 'inactive' && s.active) return false;
        if (sourceFilter && s.source !== sourceFilter) return false;
        if (q && !s.email.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => Number(b.active) - Number(a.active) || b.subscribed_at - a.subscribed_at);
  }, [subscribers, search, statusFilter, sourceFilter]);

  const filtered = statusFilter !== '' || sourceFilter !== '' || search.trim() !== '';

  function resetFilters() {
    setStatusFilter('');
    setSourceFilter('');
    setSearch('');
  }

  async function handleAdd() {
    const email = newEmail.trim();
    if (!email || adding) return;
    setError(null);
    setAdding(true);
    try {
      await adminAddSubscriber(email);
      setNewEmail('');
      reload();
    } catch (e) {
      setError((e as Error).message.includes('400') ? 'Adresse email invalide.' : (e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(s: MailingSubscriber) {
    setError(null);
    try {
      await adminSetSubscriberActive(s.email, !s.active);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleDelete(s: MailingSubscriber) {
    if (!window.confirm(`Effacer définitivement « ${s.email} » de la liste ?`)) return;
    setError(null);
    try {
      await adminDeleteSubscriber(s.email);
      reload();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(activeEmails.join(', '));
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      // Clipboard indisponible : pas de retour.
    }
  }

  function exportCsv() {
    const header = 'email,inscrit_le,source,actif';
    const lines = subscribers.map(
      (s) =>
        `${s.email},${new Date(s.subscribed_at).toISOString()},${s.source},${s.active ? 'oui' : 'non'}`,
    );
    const blob = new Blob([[header, ...lines].join('\n')], {type: 'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mailing-list.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Communication
            </div>
            <CardTitle className="flex items-center gap-2">
              <Mails className="h-5 w-5" />
              Liste de diffusion
            </CardTitle>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une adresse"
              className="h-8 w-64 pl-8"
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Adresses collectées via l'opt-in du formulaire d'accès bêta ou ajoutées à la main.
          Cliquez une tuile pour filtrer. Pour écrire aux abonnés, rédigez une annonce :
          le brouillon email s'ouvre avec tous les actifs en Cci.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Abonnés actifs"
            value={stats.active}
            accent="--green-emeraude"
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter((s) => (s === 'active' ? '' : 'active'))}
            title="N'afficher que les abonnés actifs"
          />
          <StatTile
            label="Désinscrits"
            value={stats.inactive}
            accent="--muted-foreground"
            active={statusFilter === 'inactive'}
            onClick={() => setStatusFilter((s) => (s === 'inactive' ? '' : 'inactive'))}
            title="N'afficher que les adresses désinscrites"
          />
          <StatTile
            label="Via demande bêta"
            value={stats.beta}
            accent="--bf500"
            active={sourceFilter === 'access_request'}
            onClick={() => setSourceFilter((s) => (s === 'access_request' ? '' : 'access_request'))}
            title="N'afficher que les adresses issues du formulaire d'accès bêta"
          />
          <StatTile
            label="Ajouts manuels"
            value={stats.manual}
            accent="--pc-color"
            active={sourceFilter === 'admin'}
            onClick={() => setSourceFilter((s) => (s === 'admin' ? '' : 'admin'))}
            title="N'afficher que les adresses ajoutées à la main"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-sm border bg-muted/30 px-3 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <UserPlus className="h-3.5 w-3.5" /> Ajouter
          </span>
          <Input
            aria-label="Adresse email à ajouter"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
            }}
            placeholder="collegue@exemple.fr"
            className="h-8 min-w-52 flex-1"
          />
          <Button size="sm" onClick={handleAdd} disabled={!newEmail.trim() || adding}>
            Ajouter
          </Button>
        </div>

        {error && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyAll} disabled={activeEmails.length === 0}>
            {copiedAll ? (
              <>
                <Check className="mr-1 h-3.5 w-3.5" /> Copiées
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3.5 w-3.5" /> Copier toutes les adresses (Cci)
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={subscribers.length === 0}>
            <Download className="mr-1 h-3.5 w-3.5" /> Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenNews}>
            <Megaphone className="mr-1 h-3.5 w-3.5" /> Rédiger une annonce
          </Button>
        </div>

        {subscribers.length === 0 ? (
          <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-12 text-center">
            <Mails className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">Aucun abonné pour l'instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les adresses arrivent via l'opt-in du formulaire de demande d'accès — ou
              ajoutez-les à la main ci-dessus.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune adresse ne correspond aux filtres.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-sm border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Inscrit le</th>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((s) => (
                    <tr
                      key={s.email}
                      className={`border-t transition-colors hover:bg-muted/30 ${s.active ? '' : 'opacity-60'}`}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{s.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(s.subscribed_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${
                            s.source === 'admin' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                          }`}
                        >
                          {SOURCE_LABEL[s.source]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {s.active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-sm bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-700" /> Actif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Désinscrit
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggle(s)}
                            title={
                              s.active
                                ? 'Retirer des prochains envois (l\'adresse reste dans la liste)'
                                : 'Réintégrer aux prochains envois'
                            }
                          >
                            {s.active ? (
                              <>
                                <UserMinus className="mr-1 h-3.5 w-3.5" /> Désinscrire
                              </>
                            ) : (
                              <>
                                <UserCheck className="mr-1 h-3.5 w-3.5" /> Réinscrire
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(s)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            title="Effacer définitivement l'adresse (RGPD)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered
                ? `${visible.length} adresse(s) affichée(s) sur ${stats.total}`
                : `${stats.total} adresse(s)`}{' '}
              · {stats.active} active(s) · {stats.inactive} désinscrite(s).
            </p>
          </>
        )}
      </CardContent>
    </Card>
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
