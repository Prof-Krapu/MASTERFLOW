import {useCallback, useEffect, useMemo, useState} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {PieLabelRenderProps} from 'recharts';
import {ChevronDown, ChevronRight, Download, RefreshCw, Trash2} from 'lucide-react';

import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

interface User {
  id: string;
  username: string;
}

interface StatRow {
  user_id: string;
  app: 'pc' | 'fr' | 'nl' | 'es' | 'svt' | 'maths' | 'ses' | 'tech' | 'en' | 'philo' | 'hg';
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  first_ts: number;
  last_ts: number;
}

interface DateStatRow {
  day: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
}

interface ModelStatRow {
  model: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
}

interface TaskStatRow {
  task: string;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
}

interface UserDetailRow {
  user_id: string;
  app: string;
  model: string;
  task: string;
  ds_ref: string | null;
  ds_title: string | null;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  first_ts: number;
  last_ts: number;
}

interface DsStatRow {
  user_id: string;
  app: string;
  ds_ref: string;
  ds_title: string | null;
  events: number;
  prompt_tokens: number;
  completion_tokens: number;
  pages: number;
  cost_eur: number;
  first_ts: number;
  last_ts: number;
}

interface StatsPayload {
  stats: StatRow[];
  byDate: DateStatRow[];
  byModel: ModelStatRow[];
  byTask: TaskStatRow[];
  byUserDetail: UserDetailRow[];
  byDs: DsStatRow[];
}

type MetricKey = 'cost' | 'tokens' | 'pages' | 'events';
type AppMetrics = Record<MetricKey, number>;

interface UserChartRow {
  userId: string;
  username: string;
  apps: Record<string, AppMetrics>;
  total: AppMetrics;
}

interface MatiereRow {
  app: string;
  cost: number;
  events: number;
  tokens: number;
  pages: number;
  users: Set<string>;
  firstTs: number;
  lastTs: number;
}

interface UserSummary {
  userId: string;
  username: string;
  cost: number;
  events: number;
  tokens: number;
  pages: number;
  firstTs: number;
  lastTs: number;
  avgCostPerCall: number;
  tokensPerCall: number;
  dominantApp: string | null;
  apps: Set<string>;
  perAppCost: Record<string, number>;
}

const APPS: StatRow['app'][] = ['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg'];

const APP_COLOR: Record<string, string> = {
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

const TASK_NAME: Record<string, string> = {
  ocr: 'OCR Copies',
  bareme: 'Extraction Barème',
  correction: 'Correction LLM',
  studentChat: 'Chat Élève',
  profile: 'Configuration',
  summary: 'Synthèse',
  other: 'Autre',
};

/** Définition des métriques basculables dans les graphiques par utilisateur. */
const METRICS: {key: MetricKey; label: string; fmt: (v: number) => string}[] = [
  {key: 'cost', label: 'Coût', fmt: (v) => fmtEUR(v)},
  {key: 'tokens', label: 'Tokens', fmt: (v) => fmtTokens(v)},
  {key: 'pages', label: 'Pages', fmt: (v) => v.toLocaleString('fr-FR')},
  {key: 'events', label: 'Appels', fmt: (v) => v.toLocaleString('fr-FR')},
];

const TASK_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
];

async function fetchUsers(): Promise<User[]> {
  const r = await fetch('/api/v1/admin/users', {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return ((await r.json()) as {users: User[]}).users;
}

async function fetchStats(from?: number, to?: number): Promise<StatsPayload> {
  const params = new URLSearchParams();
  if (from !== undefined) params.set('from', String(from));
  if (to !== undefined) params.set('to', String(to));
  const query = params.toString() ? `?${params.toString()}` : '';
  const r = await fetch(`/api/v1/admin/stats${query}`, {credentials: 'include'});
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as StatsPayload;
}

async function resetStats(): Promise<{deleted: number; archive: string | null}> {
  const r = await fetch('/api/v1/admin/stats/reset', {method: 'DELETE', credentials: 'include'});
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${r.status}`);
  }
  return (await r.json()) as {deleted: number; archive: string | null};
}

function fmtEUR(v: number) {
  return v.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR', maximumFractionDigits: 4});
}

function fmtTokens(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return String(v);
}

const zeroApp = (): AppMetrics => ({cost: 0, tokens: 0, pages: 0, events: 0});

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'});
}

/** Tooltip custom pour Recharts — sombre, compact. */
function CustomTooltip({active, payload, label}: {active?: boolean; payload?: Array<{name: string; value: number; color: string}>; label?: string}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-popover px-3 py-2 text-sm shadow-lg">
      {label && <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{backgroundColor: entry.color}} />
          <span className="text-muted-foreground">{entry.name} :</span>
          <span className="font-medium tabular-nums">
            {entry.name.toLowerCase().includes('token') ? fmtTokens(entry.value) : fmtEUR(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Mini barre empilée : répartition du coût d'un user par matière. */
function MiniStack({perAppCost}: {perAppCost: Record<string, number>}) {
  const entries = Object.entries(perAppCost).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return null;
  return (
    <div className="flex h-2 w-32 overflow-hidden rounded-full bg-muted/40" title={`Total : ${fmtEUR(total)}`}>
      {entries.map(([app, v]) => (
        <div
          key={app}
          style={{width: `${(v / total) * 100}%`, backgroundColor: APP_COLOR[app] ?? '#888'}}
          title={`${APP_LABEL[app] ?? app} : ${fmtEUR(v)}`}
        />
      ))}
    </div>
  );
}

function csvEsc(v: string | number): string {
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export CSV du détail complet (user × matière × modèle × tâche). */
function exportDetailCSV(summaries: UserSummary[], detailByUser: Map<string, UserDetailRow[]>) {
  const lines: string[] = [];
  lines.push(['Utilisateur', 'Matiere', 'Modele', 'Tache', 'Appels', 'Prompt', 'Completion', 'Pages', 'Cout'].join(';'));
  for (const u of summaries) {
    const details = detailByUser.get(u.userId) ?? [];
    for (const d of details) {
      lines.push(
        [u.username, APP_LABEL[d.app] ?? d.app, d.model, TASK_NAME[d.task] ?? d.task, d.events, d.prompt_tokens, d.completion_tokens, d.pages, d.cost_eur.toFixed(6)]
          .map(csvEsc)
          .join(';'),
      );
    }
  }
  const blob = new Blob([`\ufeff${lines.join('\n')}`], {type: 'text/csv;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `monitoring-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type RangeKey = '24h' | '7d' | '30d' | 'all';

export function MonitoringPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [statsData, setStatsData] = useState<StatsPayload>({
    stats: [],
    byDate: [],
    byModel: [],
    byTask: [],
    byUserDetail: [],
    byDs: [],
  });
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [range, setRange] = useState<RangeKey>('all');
  const [metric, setMetric] = useState<MetricKey>('cost');
  const [dsMetric, setDsMetric] = useState<MetricKey>('cost');
  const [activeMatiere, setActiveMatiere] = useState<string | null>(null);
  const [activeDs, setActiveDs] = useState<{dsRef: string; userId: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((e) => setError((e as Error).message));
  }, []);

  const reloadStats = useCallback(() => {
    setError(null);
    setLoading(true);
    const now = Date.now();
    let from: number | undefined;
    let to: number | undefined;

    switch (range) {
      case '24h':
        from = now - 24 * 3600 * 1000;
        to = now;
        break;
      case '7d':
        from = now - 7 * 24 * 3600 * 1000;
        to = now;
        break;
      case '30d':
        from = now - 30 * 24 * 3600 * 1000;
        to = now;
        break;
      case 'all':
      default:
        from = undefined;
        to = undefined;
        break;
    }

    fetchStats(from, to)
      .then(setStatsData)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    reloadStats();
  }, [reloadStats]);

  const nameById = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u.username])), [users]);

  const totals = useMemo(() => {
    const acc = {events: 0, tokens: 0, pages: 0, cost: 0};
    for (const r of statsData.stats) {
      acc.events += r.events;
      acc.tokens += r.prompt_tokens + r.completion_tokens;
      acc.pages += r.pages;
      acc.cost += r.cost_eur;
    }
    return acc;
  }, [statsData.stats]);

  // Coût par matière (Lot A) — on ne garde que les matières ayant consommé (coût > 0).
  const byApp = useMemo(() => {
    const map = new Map<string, MatiereRow>();
    for (const r of statsData.stats) {
      if (r.cost_eur <= 0) continue;
      const row = map.get(r.app) ?? {app: r.app, cost: 0, events: 0, tokens: 0, pages: 0, users: new Set<string>(), firstTs: Infinity, lastTs: 0};
      row.cost += r.cost_eur;
      row.events += r.events;
      row.tokens += r.prompt_tokens + r.completion_tokens;
      row.pages += r.pages;
      row.users.add(r.user_id);
      row.firstTs = Math.min(row.firstTs, r.first_ts);
      row.lastTs = Math.max(row.lastTs, r.last_ts);
      map.set(r.app, row);
    }
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [statsData.stats]);

  // Données par utilisateur, toutes métriques par matière (Lot B).
  const chartData = useMemo(() => {
    const byUser = new Map<string, UserChartRow>();
    for (const r of statsData.stats) {
      const username = nameById[r.user_id] ?? r.user_id.slice(0, 6);
      const row = byUser.get(r.user_id) ?? {userId: r.user_id, username, apps: {}, total: zeroApp()};
      const am = row.apps[r.app] ?? zeroApp();
      am.cost += r.cost_eur;
      am.tokens += r.prompt_tokens + r.completion_tokens;
      am.pages += r.pages;
      am.events += r.events;
      row.apps[r.app] = am;
      row.total.cost += r.cost_eur;
      row.total.tokens += r.prompt_tokens + r.completion_tokens;
      row.total.pages += r.pages;
      row.total.events += r.events;
      byUser.set(r.user_id, row);
    }
    return Array.from(byUser.values()).sort((a, b) => b.total[metric] - a.total[metric]);
  }, [statsData.stats, nameById, metric]);

  const donutData = useMemo(
    () => chartData.map((r) => ({name: r.username, value: r.total[metric]})).filter((d) => d.value > 0),
    [chartData, metric],
  );

  const taskChartData = useMemo(() => {
    return statsData.byTask.map((t) => ({
      ...t,
      displayName: TASK_NAME[t.task] ?? t.task,
    }));
  }, [statsData.byTask]);

  const activeMetric = METRICS.find((m) => m.key === metric)!;

  // ------------------------------------------------------------------
  // Lot D — vue « par DS » (coût/tokens/pages par devoir, rattaché à sa
  // matière + son propriétaire). Un DS = 1 user × 1 app × 1 ds_ref.
  // ------------------------------------------------------------------
  const dsActiveMetric = METRICS.find((m) => m.key === dsMetric)!;

  interface DsRow extends DsStatRow {
    username: string;
    tokens: number;
    value: number; // valeur de la métrique active (coût/tokens/pages/appels)
    label: string; // libellé affichable (titre ou id tronqué)
  }

  const dsRows: DsRow[] = useMemo(() => {
    return statsData.byDs
      .map((r) => ({
        ...r,
        username: nameById[r.user_id] ?? r.user_id.slice(0, 6),
        tokens: r.prompt_tokens + r.completion_tokens,
        value:
          dsMetric === 'cost' ? r.cost_eur
          : dsMetric === 'tokens' ? r.prompt_tokens + r.completion_tokens
          : dsMetric === 'pages' ? r.pages
          : r.events,
        label: r.ds_title?.trim() || (r.ds_ref ? r.ds_ref.slice(0, 8) : '—'),
      }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [statsData.byDs, nameById, dsMetric]);

  const dsTotal = useMemo(
    () => dsRows.reduce((acc, r) => {
      acc.cost += r.cost_eur;
      acc.tokens += r.tokens;
      acc.pages += r.pages;
      acc.events += r.events;
      return acc;
    }, {cost: 0, tokens: 0, pages: 0, events: 0}),
    [dsRows],
  );

  // Résolution du DS sélectionné (invalidé si les données changent de période).
  const activeDsRow = activeDs
    ? dsRows.find((r) => r.ds_ref === activeDs.dsRef && r.user_id === activeDs.userId) ?? null
    : null;

  // Détail tâche × modèle du DS sélectionné (pour le drill-down).
  const activeDsDetail = useMemo(() => {
    if (!activeDs) return [];
    return statsData.byUserDetail
      .filter((d) => d.ds_ref === activeDs.dsRef && d.user_id === activeDs.userId)
      .map((d) => ({...d, tokens: d.prompt_tokens + d.completion_tokens}))
      .sort((a, b) => b.cost_eur - a.cost_eur);
  }, [statsData.byUserDetail, activeDs]);
  const activeDsDetailMax = activeDsDetail[0]?.cost_eur ?? 0;

  const matiereActive = byApp.find((b) => b.app === activeMatiere) ? activeMatiere : null;
  const matiereUsers = matiereActive
    ? statsData.stats
        .filter((r) => r.app === matiereActive && r.cost_eur > 0)
        .map((r) => ({
          userId: r.user_id,
          username: nameById[r.user_id] ?? r.user_id.slice(0, 6),
          cost: r.cost_eur,
          events: r.events,
          tokens: r.prompt_tokens + r.completion_tokens,
        }))
        .sort((a, b) => b.cost - a.cost)
    : [];
  const matiereTotal = matiereUsers.reduce((s, r) => s + r.cost, 0);
  const matiereMax = matiereUsers[0]?.cost ?? 0;

  const formatDayLabel = (d: string) => {
    if (!d) return '';
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return d;
  };

  const avgCostPerEvent = totals.events > 0 ? totals.cost / totals.events : 0;

  // Clic sur une barre utilisateur → déplie sa ligne dans la table de détail.
  const onUserBarClick = (e: {payload?: UserChartRow}) => {
    const userId = e?.payload?.userId;
    if (!userId) return;
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  };

  async function handleReset() {
    if (!window.confirm('⚠️ Supprimer TOUS les événements de monitoring ?\nUne archive CSV est déposée côté serveur (data/exports/) avant la purge.')) return;
    setResetting(true);
    try {
      const {deleted, archive} = await resetStats();
      setError(null);
      if (archive) {
        window.alert(`${deleted} événement(s) purgé(s).\nArchive : ${archive}`);
      }
      reloadStats();
    } catch (e) {
      setError(`Reset échoué : ${(e as Error).message}`);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-sm border border-border border-t-2 border-t-primary">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Coût &amp; usage
              </div>
              <CardTitle>Monitoring</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="range-select" className="text-xs font-medium text-muted-foreground">
                Période :
              </label>
              <select
                id="range-select"
                value={range}
                onChange={(e) => setRange(e.target.value as RangeKey)}
                className="rounded-sm border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Tout l'historique</option>
                <option value="24h">24 dernières heures</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
              <button
                onClick={reloadStats}
                disabled={loading || resetting}
                className="inline-flex items-center gap-1 rounded-sm border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                title="Rafraîchir"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || loading}
                className="inline-flex items-center gap-1.5 rounded-sm border border-destructive/40 bg-destructive/10 px-2.5 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                title="Remettre les compteurs à zéro"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Tokens, pages OCR et coût consommés via API_manage (mode managé uniquement — les
            corrections faites en standalone ne remontent pas ici).
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <Tile label="Évènements" value={totals.events.toLocaleString('fr-FR')} accent="--bf500" />
            <Tile label="Coût estimé" value={fmtEUR(totals.cost)} accent="--green-emeraude" />
            <Tile label="Coût moyen / appel" value={fmtEUR(avgCostPerEvent)} accent="--pc-color" />
            <Tile label="Tokens cumulés" value={totals.tokens.toLocaleString('fr-FR')} accent="--fr-color" />
            <Tile label="Pages OCR" value={totals.pages.toLocaleString('fr-FR')} accent="--nl-color" />
          </div>
        </CardContent>
      </Card>

      {/* Graphique temporel */}
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle>Évolution quotidienne des coûts</CardTitle>
          <p className="text-sm text-muted-foreground">Évolution des dépenses quotidiennes de l'instance.</p>
        </CardHeader>
        <CardContent>
          {statsData.byDate.length === 0 ? (
            <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune donnée pour cette période — les évènements arrivent dès qu'un invité corrige une copie.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsData.byDate}>
                  <defs>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--green-emeraude, #10b981)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--green-emeraude, #10b981)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #333)" />
                  <XAxis dataKey="day" tickFormatter={formatDayLabel} />
                  <YAxis yAxisId="cost" tickFormatter={(v: number) => fmtEUR(v)} width={75} />
                  <YAxis yAxisId="tokens" orientation="right" tickFormatter={(v: number) => fmtTokens(v)} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area yAxisId="cost" type="monotone" dataKey="cost_eur" stroke="var(--green-emeraude, #10b981)" fillOpacity={1} fill="url(#colorCost)" name="Coût (€)" />
                  <Line yAxisId="tokens" type="monotone" dataKey="prompt_tokens" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Prompt Tokens" />
                  <Line yAxisId="tokens" type="monotone" dataKey="completion_tokens" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Complétion Tokens" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot A — Coût par matière */}
      {byApp.length > 0 && (
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle>Coût par matière</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ventilation des dépenses par correcteur. Cliquez sur une matière pour voir le détail par utilisateur.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byApp} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v: number) => fmtEUR(v)} />
                    <YAxis dataKey="app" type="category" width={110} tick={{fontSize: 11}} tickFormatter={(a: string) => APP_LABEL[a] ?? a} />
                    <Tooltip formatter={(v) => fmtEUR(Number(v) || 0)} />
                    <Bar dataKey="cost" radius={[0, 4, 4, 0]} onClick={(e: {payload?: MatiereRow}) => e?.payload?.app && setActiveMatiere(e.payload.app)}>
                      {byApp.map((r) => (
                        <Cell key={r.app} fill={APP_COLOR[r.app] ?? '#888'} cursor="pointer" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-1.5 text-left font-medium">Matière</th>
                      <th className="px-2 py-1.5 text-right font-medium">% total</th>
                      <th className="px-2 py-1.5 text-right font-medium">Appels</th>
                      <th className="px-2 py-1.5 text-right font-medium">Tokens</th>
                      <th className="px-2 py-1.5 text-right font-medium">€/appel</th>
                      <th className="px-2 py-1.5 text-right font-medium">Users</th>
                      <th className="px-2 py-1.5 text-right font-medium">Coût</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byApp.map((r) => {
                      const isActive = r.app === matiereActive;
                      const pct = totals.cost > 0 ? (r.cost / totals.cost) * 100 : 0;
                      return (
                        <tr
                          key={r.app}
                          onClick={() => setActiveMatiere(isActive ? null : r.app)}
                          className={`cursor-pointer border-t border-border/50 hover:bg-muted/30 ${isActive ? 'bg-accent/40' : ''}`}
                          title="Clic pour voir le détail par utilisateur"
                        >
                          <td className="px-2 py-1.5">
                            <span
                              className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                              style={{backgroundColor: APP_COLOR[r.app] ?? '#666'}}
                            >
                              {r.app}
                            </span>{' '}
                            <span className="text-xs text-muted-foreground">{APP_LABEL[r.app] ?? r.app}</span>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{pct.toFixed(1)}%</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.events.toLocaleString('fr-FR')}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmtTokens(r.tokens)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.events > 0 ? fmtEUR(r.cost / r.events) : '—'}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.users.size}</td>
                          <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmtEUR(r.cost)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 text-xs font-semibold">
                      <td className="px-2 py-1.5">Total</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">100%</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{byApp.reduce((s, r) => s + r.events, 0).toLocaleString('fr-FR')}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtTokens(byApp.reduce((s, r) => s + r.tokens, 0))}</td>
                      <td className="px-2 py-1.5"></td>
                      <td className="px-2 py-1.5"></td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{fmtEUR(byApp.reduce((s, r) => s + r.cost, 0))}</td>
                    </tr>
                  </tfoot>
                </table>

                {matiereActive && (
                  <div className="mt-4 rounded-sm border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                          style={{backgroundColor: APP_COLOR[matiereActive] ?? '#666'}}
                        >
                          {matiereActive}
                        </span>
                        <span className="text-xs font-medium">{APP_LABEL[matiereActive] ?? matiereActive} — détail par utilisateur</span>
                      </div>
                      <button
                        onClick={() => setActiveMatiere(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Fermer
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {matiereUsers.map((u) => {
                        const pct = matiereTotal > 0 ? (u.cost / matiereTotal) * 100 : 0;
                        return (
                          <div key={u.userId} className="flex items-center gap-3 text-sm">
                            <span className="w-32 truncate font-medium">{u.username}</span>
                            <div className="flex-1">
                              <CostBar value={u.cost} max={matiereMax} />
                            </div>
                            <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">{pct.toFixed(1)}%</span>
                            <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">{u.events} appels</span>
                          </div>
                        );
                      })}
                      {matiereUsers.length === 0 && (
                        <div className="text-xs text-muted-foreground">Aucun utilisateur sur cette matière.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lot B — Coût par utilisateur (métrique basculable + donut + clic→détail) */}
      <Card className="rounded-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Coût par utilisateur</CardTitle>
              <p className="text-sm text-muted-foreground">Empilement par matière, trié par la métrique choisie. Cliquez une barre pour ouvrir le détail.</p>
            </div>
            <div className="inline-flex rounded-sm border border-input bg-background p-0.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMetric(m.key)}
                  className={`rounded-[2px] px-2.5 py-1 text-xs font-medium transition-colors ${
                    metric === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune donnée encore — les évènements arrivent dès qu'un invité corrige une copie.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="h-72 lg:col-span-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="username" />
                    <YAxis tickFormatter={(v: number) => activeMetric.fmt(v)} width={80} />
                    <Tooltip formatter={(v) => activeMetric.fmt(Number(v) || 0)} />
                    <Legend />
                    {APPS.map((app) => (
                      <Bar
                        key={app}
                        dataKey={(row: UserChartRow) => row.apps[app]?.[metric] ?? 0}
                        stackId="a"
                        fill={APP_COLOR[app]}
                        name={APP_LABEL[app]}
                        cursor="pointer"
                        onClick={onUserBarClick}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {donutData.map((_, i) => (
                        <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => activeMetric.fmt(Number(v) || 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lot D — Coût & tokens par DS (vue DS-centrique : matière + propriétaire) */}
      <Card className="rounded-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Coût &amp; tokens par DS</CardTitle>
              <p className="text-sm text-muted-foreground">
                Chaque devoir rattaché à sa matière et à son propriétaire. Cliquez une ligne pour le détail tâche × modèle.
              </p>
            </div>
            <div className="inline-flex rounded-sm border border-input bg-background p-0.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setDsMetric(m.key)}
                  className={`rounded-[2px] px-2.5 py-1 text-xs font-medium transition-colors ${
                    dsMetric === m.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dsRows.length === 0 ? (
            <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun DS identifié pour cette période — la dimension DS est renseignée
              par les correcteurs lors des prochaines corrections (l'historique antérieur reste non rattaché).
            </div>
          ) : (
          <div className="space-y-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dsRows} layout="vertical" margin={{top: 2, right: 16, bottom: 2, left: 4}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{fontSize: 10}} stroke="var(--muted-foreground)" tickFormatter={(v: number) => dsActiveMetric.fmt(v)} />
                  <YAxis type="category" dataKey="label" tick={{fontSize: 10}} stroke="var(--muted-foreground)" width={130} />
                  <Tooltip
                    cursor={{fill: 'var(--muted)', opacity: 0.4}}
                    contentStyle={{background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12}}
                    formatter={(v) => [dsActiveMetric.fmt(Number(v) || 0), dsActiveMetric.label]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer"
                    onClick={(e: {payload?: DsRow}) => {
                      const p = e?.payload;
                      if (p) setActiveDs({dsRef: p.ds_ref, userId: p.user_id});
                    }}>
                    {dsRows.map((r) => (
                      <Cell key={`${r.user_id}:${r.ds_ref}`} fill={APP_COLOR[r.app] ?? '#888'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-1.5 text-left font-medium">DS</th>
                    <th className="px-2 py-1.5 text-left font-medium">Matière</th>
                    <th className="px-2 py-1.5 text-left font-medium">Propriétaire</th>
                    <th className="px-2 py-1.5 text-right font-medium">Appels</th>
                    <th className="px-2 py-1.5 text-right font-medium">Tokens</th>
                    <th className="px-2 py-1.5 text-right font-medium">Pages</th>
                    <th className="px-2 py-1.5 text-right font-medium">€/appel</th>
                    <th className="px-2 py-1.5 text-right font-medium">Date</th>
                    <th className="px-2 py-1.5 text-right font-medium">Coût</th>
                  </tr>
                </thead>
                <tbody>
                  {dsRows.map((r) => {
                    const isOpen = activeDsRow?.ds_ref === r.ds_ref && activeDsRow?.user_id === r.user_id;
                    return (
                      <tr
                        key={`${r.user_id}:${r.ds_ref}`}
                        onClick={() => setActiveDs(isOpen ? null : {dsRef: r.ds_ref, userId: r.user_id})}
                        className={`cursor-pointer border-t border-border/50 hover:bg-muted/30 ${isOpen ? 'bg-accent/40' : ''}`}
                        title="Clic pour voir le détail tâche × modèle"
                      >
                        <td className="max-w-[220px] truncate px-2 py-1.5 font-medium" title={r.label}>{r.label}</td>
                        <td className="px-2 py-1.5">
                          <span
                            className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                            style={{backgroundColor: APP_COLOR[r.app] ?? '#666'}}
                          >
                            {r.app}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">{APP_LABEL[r.app] ?? r.app}</span>
                        </td>
                        <td className="px-2 py-1.5 text-xs text-muted-foreground">{r.username}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.events.toLocaleString('fr-FR')}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmtTokens(r.tokens)}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.pages > 0 ? r.pages : '—'}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{r.events > 0 ? fmtEUR(r.cost_eur / r.events) : '—'}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-muted-foreground">{fmtDate(r.last_ts)}</td>
                        <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{fmtEUR(r.cost_eur)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 text-xs font-semibold">
                    <td className="px-2 py-1.5" colSpan={3}>{dsRows.length} DS</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{dsTotal.events.toLocaleString('fr-FR')}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtTokens(dsTotal.tokens)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{dsTotal.pages > 0 ? dsTotal.pages : '—'}</td>
                    <td className="px-2 py-1.5"></td>
                    <td className="px-2 py-1.5"></td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{fmtEUR(dsTotal.cost)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Drill-down : ventilation tâche × modèle du DS sélectionné */}
            {activeDsRow && (
              <div className="rounded-sm border bg-muted/20 p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{backgroundColor: APP_COLOR[activeDsRow.app] ?? '#666'}}
                  >
                    {activeDsRow.app}
                  </span>
                  <span className="text-xs font-medium truncate">{activeDsRow.label}</span>
                  <span className="text-xs text-muted-foreground">— {activeDsRow.username}</span>
                  <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {activeDsRow.events} appels · {fmtTokens(activeDsRow.tokens)} tokens · {fmtEUR(activeDsRow.cost_eur)}
                  </span>
                  <button onClick={() => setActiveDs(null)} className="text-xs text-muted-foreground hover:text-foreground">
                    Fermer
                  </button>
                </div>
                {activeDsDetail.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Pas de détail tâche × modèle pour ce DS.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-1.5 text-left font-medium">Modèle</th>
                        <th className="px-2 py-1.5 text-left font-medium">Tâche</th>
                        <th className="px-2 py-1.5 text-right font-medium">Appels</th>
                        <th className="px-2 py-1.5 text-right font-medium">Tokens</th>
                        <th className="px-2 py-1.5 text-right font-medium">Pages</th>
                        <th className="w-1/3 px-2 py-1.5 text-right font-medium">Coût</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDsDetail.map((d, i) => (
                        <tr key={`${d.model}-${d.task}-${i}`} className="border-t border-border/50">
                          <td className="px-2 py-1.5 font-mono text-xs">{d.model}</td>
                          <td className="px-2 py-1.5">
                            <span className="inline-flex rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                              {TASK_NAME[d.task] ?? d.task}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{d.events.toLocaleString('fr-FR')}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{fmtTokens(d.tokens)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{d.pages > 0 ? d.pages : '—'}</td>
                          <td className="w-1/3 px-2 py-1.5"><CostBar value={d.cost_eur} max={activeDsDetailMax} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Modèles */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle>Usage par Modèle LLM</CardTitle>
            <p className="text-sm text-muted-foreground">Coûts générés par chaque modèle de langage.</p>
          </CardHeader>
          <CardContent>
            {statsData.byModel.length === 0 ? (
              <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune donnée.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statsData.byModel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v: number) => fmtEUR(v)} />
                    <YAxis dataKey="model" type="category" width={110} tick={{fontSize: 11}} />
                    <Tooltip formatter={(v) => fmtEUR(Number(v))} />
                    <Bar dataKey="cost_eur" fill="var(--bf500, #3b82f6)" name="Coût" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tâches — PieChart */}
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle>Répartition par Tâche</CardTitle>
            <p className="text-sm text-muted-foreground">Part du coût selon l'étape du pipeline.</p>
          </CardHeader>
          <CardContent>
            {taskChartData.length === 0 ? (
              <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
                Aucune donnée.
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskChartData}
                      dataKey="cost_eur"
                      nameKey="displayName"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={(props: PieLabelRenderProps) => {
                        const p = props as unknown as Record<string, unknown>;
                        const name = String(p.name ?? '');
                        const pct = Number(p.percent ?? 0);
                        return `${name} ${(pct * 100).toFixed(0)}%`;
                      }}
                      labelLine={false}
                    >
                      {taskChartData.map((_, i) => (
                        <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => fmtEUR(Number(v))}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lot C — Détail enrichi par utilisateur */}
      <DetailTable
        stats={statsData.stats}
        byUserDetail={statsData.byUserDetail}
        nameById={nameById}
        expandedUsers={expandedUsers}
        setExpandedUsers={setExpandedUsers}
        totalCost={totals.cost}
      />
    </div>
  );
}

function Tile({label, value, accent}: {label: string; value: string; accent: string}) {
  return (
    <div
      className="rounded-sm border border-border border-t-2 bg-card p-4"
      style={{borderTopColor: `var(${accent})`}}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold leading-none tabular-nums">{value}</div>
    </div>
  );
}

/** Barre proportionnelle visuelle. */
function CostBar({value, max}: {value: number; max: number}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-muted/50">
        <div
          className="h-2 rounded-full bg-primary/70 transition-all"
          style={{width: `${pct}%`}}
        />
      </div>
      <span className="min-w-[60px] text-right text-xs font-medium tabular-nums">
        {fmtEUR(value)}
      </span>
    </div>
  );
}

interface DetailTableProps {
  stats: StatRow[];
  byUserDetail: UserDetailRow[];
  nameById: Record<string, string>;
  expandedUsers: Set<string>;
  setExpandedUsers: React.Dispatch<React.SetStateAction<Set<string>>>;
  totalCost: number;
}

function DetailTable({stats, byUserDetail, nameById, expandedUsers, setExpandedUsers, totalCost}: DetailTableProps) {
  const userSummaries = useMemo(() => {
    const map = new Map<string, UserSummary>();
    for (const r of stats) {
      const existing = map.get(r.user_id);
      const perAppCost: Record<string, number> = existing?.perAppCost ?? {};
      perAppCost[r.app] = (perAppCost[r.app] ?? 0) + r.cost_eur;
      if (existing) {
        existing.cost += r.cost_eur;
        existing.events += r.events;
        existing.tokens += r.prompt_tokens + r.completion_tokens;
        existing.pages += r.pages;
        existing.firstTs = Math.min(existing.firstTs, r.first_ts);
        existing.lastTs = Math.max(existing.lastTs, r.last_ts);
        existing.apps.add(r.app);
        existing.perAppCost = perAppCost;
      } else {
        map.set(r.user_id, {
          userId: r.user_id,
          username: nameById[r.user_id] ?? r.user_id.slice(0, 6),
          cost: r.cost_eur,
          events: r.events,
          tokens: r.prompt_tokens + r.completion_tokens,
          pages: r.pages,
          firstTs: r.first_ts,
          lastTs: r.last_ts,
          avgCostPerCall: 0,
          tokensPerCall: 0,
          dominantApp: null,
          apps: new Set([r.app]),
          perAppCost,
        });
      }
    }
    const out = Array.from(map.values());
    for (const u of out) {
      u.avgCostPerCall = u.events > 0 ? u.cost / u.events : 0;
      u.tokensPerCall = u.events > 0 ? u.tokens / u.events : 0;
      u.dominantApp = Object.entries(u.perAppCost).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }
    return out.sort((a, b) => b.cost - a.cost);
  }, [stats, nameById]);

  const detailByUser = useMemo(() => {
    const map = new Map<string, UserDetailRow[]>();
    for (const r of byUserDetail) {
      const list = map.get(r.user_id) ?? [];
      list.push(r);
      map.set(r.user_id, list);
    }
    return map;
  }, [byUserDetail]);

  function toggleUser(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  const maxDetailCost = useMemo(() => {
    let max = 0;
    for (const r of byUserDetail) {
      if (r.cost_eur > max) max = r.cost_eur;
    }
    return max;
  }, [byUserDetail]);

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Détail complet par utilisateur</CardTitle>
            <p className="text-sm text-muted-foreground">
              Cliquez sur un utilisateur pour afficher la ventilation par matière, modèle et tâche.
              Les données proviennent des événements <code className="text-xs">token_events</code>.
            </p>
          </div>
          <button
            onClick={() => exportDetailCSV(userSummaries, detailByUser)}
            disabled={userSummaries.length === 0}
            className="inline-flex items-center gap-1.5 self-start rounded-sm border border-input bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            title="Exporter le détail complet en CSV"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {userSummaries.length === 0 ? (
          <div className="rounded-sm border border-dashed bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun évènement enregistré.
          </div>
        ) : (
          <div className="space-y-2">
            {userSummaries.map((u) => {
              const isOpen = expandedUsers.has(u.userId);
              const details = detailByUser.get(u.userId) ?? [];
              const pctOfTotal = totalCost > 0 ? ((u.cost / totalCost) * 100).toFixed(1) : '0';

              const detailsByApp = new Map<string, UserDetailRow[]>();
              for (const d of details) {
                const list = detailsByApp.get(d.app) ?? [];
                list.push(d);
                detailsByApp.set(d.app, list);
              }

              return (
                <div key={u.userId} className="overflow-hidden rounded-sm border">
                  {/* En-tête utilisateur — cliquable */}
                  <button
                    className="flex w-full items-center gap-3 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    onClick={() => toggleUser(u.userId)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="font-semibold">{u.username}</span>
                      <MiniStack perAppCost={u.perAppCost} />
                      <div className="flex gap-1">
                        {Array.from(u.apps).sort().map((app) => (
                          <span
                            key={app}
                            className="inline-flex items-center rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                            style={{backgroundColor: APP_COLOR[app] ?? '#666'}}
                          >
                            {app}
                          </span>
                        ))}
                      </div>
                      {u.dominantApp && (
                        <span className="text-[10px] text-muted-foreground">
                          matière dominante : {APP_LABEL[u.dominantApp] ?? u.dominantApp}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm tabular-nums">
                      <span className="text-muted-foreground">{u.events} appels</span>
                      <span className="text-muted-foreground">{fmtTokens(u.tokens)} tok</span>
                      {u.pages > 0 && <span className="text-muted-foreground">{u.pages} pg</span>}
                      <span className="font-bold">{fmtEUR(u.cost)}</span>
                      <span className="text-xs text-muted-foreground">({pctOfTotal}%)</span>
                    </div>
                  </button>

                  {/* Métriques dérivées (Lot C) */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1 border-t bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground">
                    <span>coût moy/appel : <strong className="text-foreground tabular-nums">{fmtEUR(u.avgCostPerCall)}</strong></span>
                    <span>tokens/appel : <strong className="text-foreground tabular-nums">{Math.round(u.tokensPerCall).toLocaleString('fr-FR')}</strong></span>
                    <span>activité : <strong className="text-foreground tabular-nums">{fmtDate(u.firstTs)} → {fmtDate(u.lastTs)}</strong></span>
                    <span>matières : <strong className="text-foreground">{u.apps.size}</strong></span>
                  </div>

                  {/* Détail déplié */}
                  {isOpen && (
                    <div className="border-t">
                      {Array.from(detailsByApp.entries()).map(([app, rows]) => {
                        const appCost = rows.reduce((s, r) => s + r.cost_eur, 0);
                        const appTokens = rows.reduce((s, r) => s + r.prompt_tokens + r.completion_tokens, 0);
                        const appPages = rows.reduce((s, r) => s + r.pages, 0);
                        const appEvents = rows.reduce((s, r) => s + r.events, 0);
                        const pctOfUser = u.cost > 0 ? (appCost / u.cost) * 100 : 0;
                        return (
                          <div key={app} className="border-b last:border-b-0">
                            {/* Sous-titre app */}
                            <div className="flex items-center gap-3 bg-accent/20 px-4 py-2">
                              <span
                                className="inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                                style={{backgroundColor: APP_COLOR[app] ?? '#666'}}
                              >
                                {app}
                              </span>
                              <span className="text-xs font-medium">{APP_LABEL[app] ?? app}</span>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {pctOfUser.toFixed(1)}% du user
                              </span>
                              <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                {appEvents} appels · {fmtTokens(appTokens)} tokens
                                {appPages > 0 ? ` · ${appPages} pages` : ''} · {fmtEUR(appCost)}
                              </span>
                            </div>
                            {/* Lignes modèle × tâche */}
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                  <th className="w-1/4 px-4 py-1.5 text-left font-medium">Modèle</th>
                                  <th className="px-2 py-1.5 text-left font-medium">Tâche</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Appels</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Prompt</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Complétion</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Pages</th>
                                  <th className="px-2 py-1.5 text-right font-medium">% user</th>
                                  <th className="w-1/4 px-2 py-1.5 text-right font-medium">Coût</th>
                                  <th className="px-2 py-1.5 text-right font-medium">Dernier</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((d, i) => {
                                  const pctU = u.cost > 0 ? (d.cost_eur / u.cost) * 100 : 0;
                                  return (
                                    <tr key={`${d.model}-${d.task}-${i}`} className="border-t border-border/50 hover:bg-muted/20">
                                      <td className="px-4 py-1.5 font-mono text-xs">{d.model}</td>
                                      <td className="px-2 py-1.5">
                                        <span className="inline-flex rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                          {TASK_NAME[d.task] ?? d.task}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1.5 text-right tabular-nums">{d.events}</td>
                                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                        {d.prompt_tokens.toLocaleString('fr-FR')}
                                      </td>
                                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                        {d.completion_tokens.toLocaleString('fr-FR')}
                                      </td>
                                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                        {d.pages > 0 ? d.pages : '—'}
                                      </td>
                                      <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                                        {pctU.toFixed(1)}%
                                      </td>
                                      <td className="w-1/4 px-2 py-1.5">
                                        <CostBar value={d.cost_eur} max={maxDetailCost} />
                                      </td>
                                      <td className="px-2 py-1.5 text-right text-xs text-muted-foreground">
                                        {fmtDate(d.last_ts)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
