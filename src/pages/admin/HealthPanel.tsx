import {useCallback, useEffect, useRef, useState} from 'react';
import {Activity, CheckCircle2, RefreshCw, XCircle} from 'lucide-react';

import {Button} from '@/components/ui/button';

/**
 * Panneau « Santé » (audit 2026-07-11, P2) : état des 11 sous-apps loopback +
 * sondes des fournisseurs LLM. Auto-refresh 30 s tant que l'onglet est ouvert ;
 * le bouton Actualiser force aussi les sondes fournisseurs (sinon cache 5 min
 * côté serveur pour préserver les quotas).
 */

interface ForkHealth {
  app: string;
  target: string;
  up: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  activeSince: string | null;
}

interface ProviderHealth {
  provider: string;
  baseUrl: string;
  apps: string[];
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number | null;
  modelCount: number | null;
  checkedAt: number;
  fromCache: boolean;
}

interface HealthResponse {
  checkedAt: number;
  forks: ForkHealth[];
  providers: ProviderHealth[];
}

const APP_LABELS: Record<string, string> = {
  pc: 'Physique-Chimie',
  fr: 'Français',
  nl: 'Néerlandais',
  es: 'Espagnol',
  svt: 'SVT',
  maths: 'Mathématiques',
  ses: 'SES',
  tech: 'Technologie',
  en: 'Anglais',
  philo: 'Philosophie',
  hg: 'Histoire-Géographie',
};

const REFRESH_INTERVAL_MS = 30_000;

function StatusDot({up}: {up: boolean}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 rounded-full ${up ? 'bg-[#18753C]' : 'bg-destructive'}`}
    />
  );
}

export function HealthPanel() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadingRef = useRef(false);

  const load = useCallback(async (fresh = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/v1/admin/health${fresh ? '?fresh=1' : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Le serveur a répondu ${res.status}.`);
      setData((await res.json()) as HealthResponse);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Impossible de joindre le serveur de santé.',
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const upCount = data?.forks.filter((f) => f.up).length ?? 0;
  const total = data?.forks.length ?? 0;
  const allUp = total > 0 && upCount === total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Activity className="h-5 w-5 text-primary" />
            Santé des services
          </h2>
          <p className="text-sm text-muted-foreground">
            Sous-applications sondées en direct, fournisseurs LLM toutes les 5 minutes.
            Actualisation automatique toutes les 30 s.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser (sondes comprises)
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-sm border-l-4 border-l-destructive bg-destructive/10 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {/* Résumé */}
      <div
        className={`flex items-center gap-3 rounded-sm border px-4 py-3 ${
          allUp ? 'border-[#18753C]/30 bg-[#18753C]/5' : 'border-destructive/30 bg-destructive/5'
        }`}
      >
        {allUp ? (
          <CheckCircle2 className="h-5 w-5 text-[#18753C]" />
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
        <div className="text-sm">
          <strong>
            {data ? `${upCount}/${total} correcteurs en ligne` : 'Vérification en cours…'}
          </strong>
          {data && (
            <span className="ml-2 text-muted-foreground">
              vérifié à {new Date(data.checkedAt).toLocaleTimeString('fr-FR')}
            </span>
          )}
        </div>
      </div>

      {/* Sous-applications */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
          Sous-applications
        </h3>
        <div className="overflow-x-auto rounded-sm border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-semibold">État</th>
                <th className="px-3 py-2 font-semibold">Correcteur</th>
                <th className="px-3 py-2 font-semibold">Cible</th>
                <th className="px-3 py-2 font-semibold">Latence</th>
                <th className="px-3 py-2 font-semibold">Actif depuis</th>
              </tr>
            </thead>
            <tbody>
              {(data?.forks ?? []).map((fork) => (
                <tr key={fork.app} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot up={fork.up} />
                      <span className={fork.up ? 'text-[#18753C]' : 'font-semibold text-destructive'}>
                        {fork.up ? 'En ligne' : `Hors ligne${fork.httpStatus ? ` (HTTP ${fork.httpStatus})` : ''}`}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{APP_LABELS[fork.app] ?? fork.app}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{fork.target}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {fork.latencyMs !== null ? `${fork.latencyMs} ms` : '—'}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {fork.activeSince ?? '—'}
                  </td>
                </tr>
              ))}
              {!data && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Fournisseurs LLM */}
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
          Fournisseurs LLM
        </h3>
        {data && data.providers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Aucun fournisseur configuré (clé API et baseUrl absentes des réglages partagés).
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(data?.providers ?? []).map((provider) => (
            <div key={provider.baseUrl} className="rounded-sm border px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <StatusDot up={provider.ok} />
                  {provider.provider}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {provider.latencyMs !== null ? `${provider.latencyMs} ms` : ''}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {provider.ok
                  ? `${provider.modelCount ?? '?'} modèles disponibles`
                  : `Injoignable${provider.httpStatus ? ` (HTTP ${provider.httpStatus})` : ''} — vérifier la clé dans Configuration API`}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Apps : {provider.apps.join(', ')}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                Sondé à {new Date(provider.checkedAt).toLocaleTimeString('fr-FR')}
                {provider.fromCache ? ' (cache)' : ''}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
