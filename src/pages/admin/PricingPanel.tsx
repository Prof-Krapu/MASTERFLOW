import {useCallback, useEffect, useState} from 'react';
import {Loader2, Plus, RefreshCw, Save, Trash2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Input} from '@/components/ui/input';

interface ModelPricing {
  model: string;
  inputPer1M: number;
  outputPer1M: number;
  perPage?: number;
}

const APPS = ['pc', 'fr', 'nl', 'es', 'svt', 'maths', 'ses', 'tech', 'en', 'philo', 'hg'] as const;

const DEFAULT_PRICING: ModelPricing[] = [
  {model: 'gpt-4o', inputPer1M: 2.15, outputPer1M: 8.62},
  {model: 'gpt-5-mini', inputPer1M: 1.08, outputPer1M: 4.31},
  {model: 'gpt-5.4', inputPer1M: 2.15, outputPer1M: 12.92},
  {model: 'mistral-large', inputPer1M: 0.43, outputPer1M: 1.29},
  {model: 'mistral-medium-2604', inputPer1M: 1.29, outputPer1M: 6.46},
  {model: 'mistral-small', inputPer1M: 0.09, outputPer1M: 0.26},
  // Clé générique : le rapprochement par sous-chaîne couvre 2512 / 3 / 4-0 (cf. seed-pricing).
  {model: 'mistral-ocr', inputPer1M: 0.0, outputPer1M: 0.0, perPage: 0.00172},
  // ----- Albert (DINUM) : souverain et GRATUIT, tout à 0 (cf. scripts/seed-pricing.ts). -----
  // La correspondance retient la plus longue sous-chaîne : entrées spécifiques, jamais un
  // 'deepseek' ou 'mistral' générique (le préréglage DeepSeek et l'API Mistral sont payants).
  // Deux formes pour Mistral-Small : DINUM l'a renommé le 2026-07-28 (points → tirets) et
  // l'ancienne reste un alias valide. Sans la forme à tirets, le nouvel id retomberait sur
  // 'mistral-small' et facturerait une API gratuite.
  {model: 'gpt-oss-120b', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'deepseek-v4', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'qwen3-coder', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'ministral-3', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'lightonocr', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'mistral-small-3.2', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'mistral-small-3-2', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'minimax-m3', inputPer1M: 0.27, outputPer1M: 1.07},
  {model: 'glm-4.6v', inputPer1M: 0.26, outputPer1M: 0.77},
  {model: 'glm-5.1', inputPer1M: 1.21, outputPer1M: 3.79},
  {model: 'gemini-3.1', inputPer1M: 1.72, outputPer1M: 10.34},
  // Kimi Code = forfait au quota (pas de facturation au token) -> 0.
  {model: 'k3', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'kimi-for-coding', inputPer1M: 0.0, outputPer1M: 0.0},
  {model: 'default', inputPer1M: 1.0, outputPer1M: 3.0},
];

async function loadPricing(app: string): Promise<ModelPricing[] | null> {
  const r = await fetch(`/api/v1/admin/global-settings/${app}/corrector_model_pricing`, {
    credentials: 'include',
  });
  if (!r.ok) return null;
  const body = (await r.json()) as {settings: Record<string, unknown>};
  const val = body.settings?.corrector_model_pricing;
  if (!Array.isArray(val)) return null;
  return val as ModelPricing[];
}

async function savePricing(app: string, pricing: ModelPricing[]): Promise<void> {
  const r = await fetch(
    `/api/v1/admin/global-settings/${app}/corrector_model_pricing`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({value: pricing}),
    },
  );
  if (!r.ok) throw new Error(`PUT ${app} -> HTTP ${r.status}`);
}

function emptyRow(): ModelPricing {
  return {model: '', inputPer1M: 0, outputPer1M: 0};
}

export function PricingPanel() {
  const [pricing, setPricing] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [source, setSource] = useState<string>('defaut');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSavedAt(null);
    try {
      let found: ModelPricing[] | null = null;
      let foundApp = '';
      for (const app of APPS) {
        const p = await loadPricing(app);
        if (p && p.length > 0) {
          found = p;
          foundApp = app;
          break;
        }
      }
      if (found) {
        setPricing(found);
        setSource(foundApp);
      } else {
        setPricing(DEFAULT_PRICING.map((p) => ({...p})));
        setSource('defaut');
      }
    } catch (e) {
      setError((e as Error).message);
      setPricing(DEFAULT_PRICING.map((p) => ({...p})));
      setSource('defaut');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const cleaned = pricing.filter((p) => p.model.trim().length > 0);
      for (const app of APPS) {
        await savePricing(app, cleaned);
      }
      setPricing(cleaned);
      setSavedAt(Date.now());
      setSource('toutes');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function updateRow(index: number, field: keyof ModelPricing, value: string | number | undefined) {
    setPricing((prev) => {
      const next = [...prev];
      const updated = {...next[index], [field]: value};
      next[index] = {model: updated.model ?? '', inputPer1M: updated.inputPer1M ?? 0, outputPer1M: updated.outputPer1M ?? 0, perPage: updated.perPage};
      return next;
    });
  }

  function addRow() {
    setPricing((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index: number) {
    setPricing((prev) => prev.filter((_, i) => i !== index));
  }

  function resetDefaults() {
    setPricing(DEFAULT_PRICING.map((p) => ({...p})));
  }

  return (
    <Card className="rounded-sm border border-border border-t-2 border-t-primary">
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Tarifs modèles
            </div>
            <CardTitle>Tarification des modèles LLM</CardTitle>
            <p className="text-sm text-muted-foreground">
              Prix en EUR par million de tokens (ou par page pour l'OCR). Ces tarifs sont
              appliqués à toutes les sous-apps pour le calcul du coût dans le monitoring.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={reload}
              disabled={loading || saving}
              className="inline-flex items-center gap-1 rounded-sm border border-input bg-background px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              title="Recharger"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {source !== 'defaut' && (
          <p className="text-xs text-muted-foreground">
            Source : <code className="rounded bg-muted px-1">{source}</code>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-2 text-left font-medium">Modèle</th>
                <th className="px-2 py-2 text-right font-medium">Input (€/1M tok)</th>
                <th className="px-2 py-2 text-right font-medium">Output (€/1M tok)</th>
                <th className="px-2 py-2 text-right font-medium">Par page (€)</th>
                <th className="w-10 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {pricing.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-2 py-1">
                    <Input
                      value={row.model}
                      onChange={(e) => updateRow(i, 'model', e.target.value)}
                      placeholder="nom-du-modele"
                      className="h-8 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.inputPer1M}
                      onChange={(e) => updateRow(i, 'inputPer1M', parseFloat(e.target.value) || 0)}
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.outputPer1M}
                      onChange={(e) => updateRow(i, 'outputPer1M', parseFloat(e.target.value) || 0)}
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={row.perPage ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateRow(i, 'perPage', v === '' ? undefined : parseFloat(v) || 0);
                      }}
                      placeholder="—"
                      className="h-8 text-right tabular-nums"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <button
                      onClick={() => removeRow(i)}
                      className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ajouter un modèle
            </Button>
            <Button variant="ghost" size="sm" onClick={resetDefaults}>
              Réinitialiser (défauts)
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-xs text-green-700 dark:text-green-300">
                Enregistré à {new Date(savedAt).toLocaleTimeString('fr-FR')} (toutes les apps).
              </span>
            )}
            <Button onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                <>
                  <Save className="mr-1 h-4 w-4" />
                  Enregistrer pour toutes les apps
                </>
              )}
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Les tarifs définis ici s'appliquent à toutes les sous-apps et remplacent les valeurs par défaut.
          Prix basés sur les tarifs officiels au 15/06/2026 (taux BCE : 1 USD = 0.8616 EUR).
          Le champ « Par page » ne s'applique qu'aux modèles facturés à la page (ex : <code>mistral-ocr</code>).
        </p>
      </CardContent>
    </Card>
  );
}
