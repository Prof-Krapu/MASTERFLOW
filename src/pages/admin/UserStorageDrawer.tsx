import {useEffect, useState} from 'react';
import {ChevronLeft, ChevronRight, X} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
  formatNote,
  formatDate,
  getAcquis,
  getConseils,
  getDifficultes,
  getExercices,
  getResults,
  getSousQuestions,
  isCorrectionIncomplete,
  type BaremeExercice,
  type DsPayload,
  type DsIndexEntry,
  type StudentResult,
} from '@/lib/ds-schema';

/**
 * Panneau d'inspection read-only du `user_storage` d'un invité.
 *
 * - Prop `userId` non-null = drawer ouvert.
 * - Onglets par app (pc, fr, nl, es, svt, maths) — ne montre que celles ayant des données.
 * - Liste des DS (depuis `corrector_ds_index`), clic → détail complet
 *   (depuis `corrector_ds_data_<id>`).
 * - Lecture seule : aucune écriture, juste de l'affichage via accesseurs
 *   défensifs de `lib/ds-schema.ts`.
 *
 * Routes consommées (admin-storage.ts) :
 *   GET /api/v1/admin/users/:userId/storage/:app           → liste des clés
 *   GET /api/v1/admin/users/:userId/storage/:app/:key      → valeur parsée
 */

type AppSlug = 'pc' | 'fr' | 'nl' | 'es' | 'svt' | 'maths' | 'ses' | 'tech' | 'en' | 'philo' | 'hg';

const APPS: {slug: AppSlug; title: string; colorVar: string}[] = [
  {slug: 'pc', title: 'PC', colorVar: '--pc-color'},
  {slug: 'fr', title: 'FR', colorVar: '--fr-color'},
  {slug: 'nl', title: 'NL', colorVar: '--nl-color'},
  {slug: 'es', title: 'ES', colorVar: '--es-color'},
  {slug: 'svt', title: 'SVT', colorVar: '--svt-color'},
  {slug: 'maths', title: 'MATHS', colorVar: '--maths-color'},
  {slug: 'ses', title: 'SES', colorVar: '--ses-color'},
  {slug: 'tech', title: 'TECHNO', colorVar: '--tech-color'},
  {slug: 'en', title: 'EN', colorVar: '--en-color'},
  {slug: 'philo', title: 'PHILO', colorVar: '--philo-color'},
  {slug: 'hg', title: 'HG', colorVar: '--hg-color'},
];

const DS_INDEX_KEY = 'corrector_ds_index';

interface KeySummary {
  key: string;
  len: number;
  updatedAt: number;
}

interface AppData {
  loading: boolean;
  error: string | null;
  keys: KeySummary[];
  dsIndex: DsIndexEntry[] | null;
}

async function fetchKeys(userId: string, app: AppSlug): Promise<KeySummary[]> {
  const r = await fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/storage/${app}`, {
    credentials: 'include',
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ?? body.error ?? `HTTP ${r.status}`);
  }
  return ((await r.json()) as {keys: KeySummary[]}).keys;
}

async function fetchKey<T>(userId: string, app: AppSlug, key: string): Promise<T> {
  const r = await fetch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/storage/${app}/${encodeURIComponent(key)}`,
    {credentials: 'include'},
  );
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as {error?: string; hint?: string};
    throw new Error(body.hint ?? body.error ?? `HTTP ${r.status}`);
  }
  const body = (await r.json()) as {value: T};
  return body.value;
}

export function UserStorageDrawer({
  userId,
  username,
  onClose,
}: {
  userId: string;
  username: string;
  onClose: () => void;
}) {
  const [activeApp, setActiveApp] = useState<AppSlug>('fr');
  const [appData, setAppData] = useState<Record<AppSlug, AppData>>({
    pc: {loading: false, error: null, keys: [], dsIndex: null},
    fr: {loading: false, error: null, keys: [], dsIndex: null},
    nl: {loading: false, error: null, keys: [], dsIndex: null},
    es: {loading: false, error: null, keys: [], dsIndex: null},
    svt: {loading: false, error: null, keys: [], dsIndex: null},
    maths: {loading: false, error: null, keys: [], dsIndex: null},
    ses: {loading: false, error: null, keys: [], dsIndex: null},
    tech: {loading: false, error: null, keys: [], dsIndex: null},
    en: {loading: false, error: null, keys: [], dsIndex: null},
    philo: {loading: false, error: null, keys: [], dsIndex: null},
    hg: {loading: false, error: null, keys: [], dsIndex: null},
  });
  const [selectedDsId, setSelectedDsId] = useState<string | null>(null);

  // Fermeture par Échap + scroll-lock quand le drawer est ouvert.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Charge les clés de toutes les apps au mount (léger : pas de payload).
  useEffect(() => {
    for (const app of APPS) {
      setAppData((s) => ({...s, [app.slug]: {...s[app.slug], loading: true, error: null}}));
      fetchKeys(userId, app.slug)
        .then((keys) =>
          setAppData((s) => ({...s, [app.slug]: {loading: false, error: null, keys, dsIndex: null}})),
        )
        .catch((e) =>
          setAppData((s) => ({
            ...s,
            [app.slug]: {loading: false, error: (e as Error).message, keys: [], dsIndex: null},
          })),
        );
    }
  }, [userId]);

  // Charge le `corrector_ds_index` de l'app active s'il existe.
  useEffect(() => {
    const data = appData[activeApp];
    if (data.loading || data.error || data.dsIndex || !data.keys.some((k) => k.key === DS_INDEX_KEY)) return;
    setAppData((s) => ({...s, [activeApp]: {...s[activeApp], loading: true}}));
    fetchKey<DsIndexEntry[]>(userId, activeApp, DS_INDEX_KEY)
      .then((index) =>
        setAppData((s) => ({
          ...s,
          [activeApp]: {...s[activeApp], loading: false, dsIndex: Array.isArray(index) ? index : []},
        })),
      )
      .catch((e) =>
        setAppData((s) => ({...s, [activeApp]: {...s[activeApp], loading: false, error: (e as Error).message}})),
      );
  }, [activeApp, appData, userId]);

  const current = appData[activeApp];
  const hasAnyData = APPS.some((a) => appData[a.slug].keys.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-3xl flex-col bg-background shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Inspection read-only
            </div>
            <div className="truncate text-lg font-bold tracking-tight">{username}</div>
            <div className="truncate font-mono text-[10px] text-muted-foreground">{userId}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="mr-1 h-4 w-4" />
            Fermer
          </Button>
        </header>

        <div className="flex gap-1 overflow-x-auto border-b px-4">
          {APPS.map((a) => {
            const count = appData[a.slug].keys.filter((k) => k.key.startsWith('corrector_ds_data_')).length;
            const isActive = activeApp === a.slug;
            const hasData = count > 0;
            return (
              <button
                key={a.slug}
                type="button"
                onClick={() => {
                  setActiveApp(a.slug);
                  setSelectedDsId(null);
                }}
                className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
                style={isActive ? {borderBottomColor: `var(${a.colorVar})`, color: `var(${a.colorVar})`} : undefined}
              >
                {a.title}
                {hasData && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {!hasAnyData && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aucune donnée dans aucune app pour cet utilisateur.
            </div>
          )}

          {current.loading && <div className="text-sm text-muted-foreground">Chargement…</div>}
          {current.error && (
            <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {current.error}
            </div>
          )}

          {!current.loading && !current.error && current.keys.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Aucune clé pour cette app.
            </div>
          )}

          {!current.loading && !current.error && current.keys.length > 0 && selectedDsId === null && (
            <DsListView
              entries={current.dsIndex ?? []}
              otherKeys={current.keys.filter(
                (k) => !k.key.startsWith('corrector_ds_data_') && k.key !== DS_INDEX_KEY,
              )}
              onSelect={setSelectedDsId}
            />
          )}

          {selectedDsId !== null && (
            <DsDetailView userId={userId} app={activeApp} dsId={selectedDsId} onBack={() => setSelectedDsId(null)} />
          )}
        </div>
      </aside>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          Sous-vues : liste DS                              */
/* -------------------------------------------------------------------------- */

function DsListView({
  entries,
  otherKeys,
  onSelect,
}: {
  entries: DsIndexEntry[];
  otherKeys: KeySummary[];
  onSelect: (dsId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
          Devoirs ({entries.length})
        </h3>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun DS.</p>
        ) : (
          <div className="overflow-hidden rounded-sm border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Titre</th>
                  <th className="px-3 py-2 text-left font-semibold">Niveau</th>
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-right font-semibold">Élèves</th>
                  <th className="px-3 py-2 text-right font-semibold">Moyenne</th>
                  <th className="px-3 py-2 text-left font-semibold">Statut</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((ds) => {
                  const archivedOrTrashed = ds.status === 'archived' || ds.status === 'trashed';
                  return (
                    <tr
                      key={ds.id ?? '?'}
                      className={`cursor-pointer border-t hover:bg-muted/30 ${archivedOrTrashed ? 'opacity-60' : ''}`}
                      onClick={() => ds.id && onSelect(ds.id)}
                    >
                      <td className="px-3 py-2 font-medium">{ds.titre ?? '(sans titre)'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{ds.niveau ?? '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(ds.date)}</td>
                      <td className="px-3 py-2 text-right">{ds.studentCount ?? '—'}</td>
                      <td className="px-3 py-2 text-right">
                        {typeof ds.moyenne === 'number' && ds.moyenne > 0
                          ? ds.moyenne.toFixed(2)
                          : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {ds.status ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {otherKeys.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Autres clés (brutes)
          </h3>
          <ul className="space-y-1 font-mono text-xs text-muted-foreground">
            {otherKeys.map((k) => (
              <li key={k.key} className="flex justify-between gap-4">
                <span className="truncate">{k.key}</span>
                <span className="flex-shrink-0">
                  {k.len} o · {formatDate(k.updatedAt)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         Sous-vues : détail DS                              */
/* -------------------------------------------------------------------------- */

function DsDetailView({
  userId,
  app,
  dsId,
  onBack,
}: {
  userId: string;
  app: AppSlug;
  dsId: string;
  onBack: () => void;
}) {
  const [ds, setDs] = useState<DsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCorrige, setShowCorrige] = useState(false);
  const key = `corrector_ds_data_${dsId}`;

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchKey<DsPayload>(userId, app, key)
      .then((d) => setDs(d))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [userId, app, key]);

  if (loading) return <div className="text-sm text-muted-foreground">Chargement du DS…</div>;
  if (error)
    return (
      <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    );
  if (!ds) return <div className="text-sm text-muted-foreground">DS introuvable.</div>;

  const exercices = getExercices(ds);
  const results = getResults(ds);
  const total = typeof ds.totalPoints === 'number' ? ds.totalPoints : 0;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Retour à la liste
      </button>

      <header className="space-y-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
          {ds.matiere ?? '—'} · {ds.niveau ?? '—'} · {ds.severite ?? '—'}
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{ds.titre ?? '(sans titre)'}</h2>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>{formatDate(ds.date)}</span>
          <span>·</span>
          <span>Total : {total} pts</span>
          <span>·</span>
          <span>{results.length} élève{results.length > 1 ? 's' : ''}</span>
          {ds.status && ds.status !== 'active' && (
            <>
              <span>·</span>
              <span className="font-semibold text-amber-700">{ds.status}</span>
            </>
          )}
        </div>
      </header>

      {/* Barème */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
          Barème ({exercices.length} exercice{exercices.length > 1 ? 's' : ''})
        </h3>
        {exercices.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun barème extrait.</p>
        ) : (
          <div className="space-y-3">
            {exercices.map((ex: BaremeExercice, i: number) => {
              const subs = getSousQuestions(ex);
              return (
                <div key={i} className="rounded-sm border px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-medium">
                      {ex.titre ?? `Exercice ${i + 1}`}
                      {typeof ex.groupeChoix === 'string' && ex.groupeChoix !== 'exercice-principal' && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {ex.groupeChoix}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold">{ex.points ?? 0} pts</div>
                  </div>
                  {subs.length > 0 && (
                    <ul className="mt-2 space-y-1 text-sm">
                      {subs.map((sq, j: number) => (
                        <li key={j} className="flex gap-3">
                          <span className="flex-shrink-0 font-mono text-xs text-muted-foreground">
                            {sq.id ?? j + 1}
                          </span>
                          <span className="flex-1">{sq.critere ?? '—'}</span>
                          <span className="flex-shrink-0 text-xs text-muted-foreground">
                            {sq.points ?? 0} pts
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Élèves */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
          Élèves ({results.length})
        </h3>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune copie corrigée.</p>
        ) : (
          <div className="space-y-3">
            {results.map((s: StudentResult, i: number) => {
              const incomplete = isCorrectionIncomplete(s);
              const acquis = getAcquis(s);
              const difficultes = getDifficultes(s);
              const conseils = getConseils(s);
              return (
                <div key={s.id ?? i} className="rounded-sm border px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="font-medium">{s.studentName ?? `(élève ${i + 1})`}</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{formatNote(s.grade, total)}</span>
                      {incomplete && (
                        <span className="inline-flex items-center rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900">
                          incomplet
                        </span>
                      )}
                    </div>
                  </div>
                  {s.appreciation && (
                    <p className="mt-1 text-sm text-muted-foreground">{s.appreciation}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{acquis.length} acquis</span>
                    <span>·</span>
                    <span>{difficultes.length} difficultés</span>
                    <span>·</span>
                    <span>{conseils.length} conseils</span>
                    {s.timestamp && (
                      <>
                        <span>·</span>
                        <span>{formatDate(s.timestamp)}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Corrigé d'origine (toggle, peut être long) */}
      {typeof ds.corrigeText === 'string' && ds.corrigeText.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowCorrige((v) => !v)}
            className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
          >
            {showCorrige ? 'Masquer' : 'Voir'} le corrigé d'origine ({ds.corrigeText.length} car.)
          </button>
          {showCorrige && (
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-sm border bg-muted/30 p-3 font-mono text-xs">
              {ds.corrigeText}
            </pre>
          )}
        </section>
      )}
    </div>
  );
}
