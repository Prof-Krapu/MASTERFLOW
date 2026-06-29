import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {ThemeStudioAssetPackPreview, VisualManifest, VisualNarrativeGrammarReport} from '@masterflow/shared';

import {
  getThemeStudioAssetPack,
  getVisualManifests,
  getVisualNarrativeGrammar,
} from './api.ts';

export function ThemeStudioPanel({token}: {token: string}): ReactElement {
  const [manifests, setManifests] = useState<VisualManifest[]>([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<VisualNarrativeGrammarReport | null>(null);
  const [assetPack, setAssetPack] = useState<ThemeStudioAssetPackPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Choisis un manifest pour lire sa grammaire.');

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await getVisualManifests(token);
      setManifests(next);
      setSelected((current) => current || next[0]?.manifest_id || '');
      setStatus(next.length > 0
        ? `${next.length} manifest(s) disponible(s). Aucune génération ouverte.`
        : 'Aucun manifest disponible. Prépare d’abord un cadrage D08.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Theme Studio indisponible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const analyze = useCallback(async (): Promise<void> => {
    if (!selected) return;
    setLoading(true);
      setStatus('Construction de la grammaire visuelle…');
    try {
      const [nextReport, nextAssetPack] = await Promise.all([
        getVisualNarrativeGrammar(selected, token),
        getThemeStudioAssetPack(selected, token),
      ]);
      setReport(nextReport);
      setAssetPack(nextAssetPack);
      setStatus('Grammaire et pack candidat construits en lecture seule.');
    } catch (error) {
      setReport(null);
      setAssetPack(null);
      setStatus(error instanceof Error ? error.message : 'Analyse visuelle impossible.');
    } finally {
      setLoading(false);
    }
  }, [selected, token]);

  const diagnosticCount = useMemo(() => {
    if (!report) return 0;
    return Object.values(report.diagnostics).reduce((total, items) => total + items.length, 0);
  }, [report]);

  return (
    <article className="panel panel--wide theme-studio">
      <header className="panel-header">
        <div>
          <h2>Theme Studio · grammaire narrative</h2>
          <p className="muted compact">
            Comprendre et contrôler la DA avant tout thème actif ou asset généré.
          </p>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
          Rafraîchir
        </button>
      </header>

      <section className="theme-studio__selector">
        <label>
          Manifest à analyser
          <select
            value={selected}
            onChange={(event) => {
              setSelected(event.target.value);
              setReport(null);
              setAssetPack(null);
              setStatus('Manifest sélectionné. Lancer l’analyse.');
            }}
          >
            {manifests.length === 0 ? <option value="">Aucun manifest</option> : null}
            {manifests.map((manifest) => (
              <option key={manifest.manifest_id} value={manifest.manifest_id}>
                {manifest.request_title}
              </option>
            ))}
          </select>
        </label>
        <button disabled={loading || !selected} onClick={() => void analyze()} type="button">
          {loading ? 'Analyse…' : 'Expliquer cette DA'}
        </button>
      </section>
      <p className="owner-cockpit__status" aria-live="polite">{status}</p>

      {report ? (
        <>
          <dl className="theme-studio__summary">
            <div><dt>Thème racine</dt><dd>{report.grammar.theme_ref ?? 'Non assigné'}</dd></div>
            <div><dt>Signes visuels</dt><dd>{report.grammar.visual_elements.length}</dd></div>
            <div><dt>Étapes émotionnelles</dt><dd>{report.grammar.emotional_arc.length}</dd></div>
            <div><dt>Alertes</dt><dd>{diagnosticCount}</dd></div>
          </dl>

          <div className="theme-studio__columns">
            <section>
              <div><strong>Vocabulaire visuel</strong><span>forme → sens</span></div>
              {report.grammar.visual_elements.length > 0 ? report.grammar.visual_elements.map((element) => (
                <article key={element.element_id}>
                  <div><strong>{element.label}</strong><span>{element.element_type}</span></div>
                  <p>{element.meaning}</p>
                </article>
              )) : <p className="muted compact">Aucun signe visuel structuré.</p>}
            </section>

            <section>
              <div><strong>Color script / arc émotionnel</strong><span>continuité</span></div>
              {report.grammar.emotional_arc.length > 0 ? report.grammar.emotional_arc.map((point) => (
                <article className="theme-studio__arc" key={point.point_id}>
                  <div>
                    <strong>{point.emotion}</strong>
                    <span>{Math.round(point.intensity * 100)} %</span>
                  </div>
                  <div className="theme-studio__meter" aria-label={`Intensité ${Math.round(point.intensity * 100)} %`}>
                    <span style={{width: `${Math.round(point.intensity * 100)}%`}} />
                  </div>
                  <small>{point.palette_refs.join(' · ') || 'Palette à définir'}</small>
                </article>
              )) : <p className="muted compact">Aucun arc émotionnel relié.</p>}
            </section>
          </div>

          <section className="theme-studio__explanations">
            <div><strong>Pourquoi ces visuels ?</strong><span>preuves et intention</span></div>
            {report.explanation_cards.map((card) => (
              <article key={card.card_id}>
                <strong>{card.title}</strong>
                <p>{card.explanation}</p>
              </article>
            ))}
          </section>

          {assetPack ? (
            <section className="theme-studio__explanations">
              <div><strong>Pack thème / assets candidat</strong><span>{assetPack.application_policy}</span></div>
              <article>
                <strong>{assetPack.theme_pack.label}</strong>
                <p>
                  Scope {assetPack.theme_pack.scope} · statut {assetPack.theme_pack.status} · lint {assetPack.lint_report.valid ? 'valide' : 'à corriger'}.
                </p>
                <p>
                  Palette : {assetPack.theme_pack.palette.primary} / {assetPack.theme_pack.palette.surface} / {assetPack.theme_pack.palette.accent}
                </p>
                <p>
                  Typos : {assetPack.theme_pack.fonts.body.family}, {assetPack.theme_pack.fonts.heading.family}
                  {assetPack.theme_pack.fonts.display ? `, ${assetPack.theme_pack.fonts.display.family}` : ''}
                </p>
              </article>
              {assetPack.asset_groups.map((group) => (
                <article key={group.group_id}>
                  <strong>{group.label}</strong>
                  <p>{group.role} · {group.readiness} · {group.refs.length} ref(s)</p>
                </article>
              ))}
              <article>
                <strong>Décisions avant activation</strong>
                <ul>
                  {assetPack.missing_decisions.map((decision) => <li key={decision}>{decision}</li>)}
                </ul>
                <small>Verrous : {assetPack.locked_actions.join(' · ')}</small>
              </article>
            </section>
          ) : null}

          <section className={`theme-studio__diagnostics ${diagnosticCount > 0 ? 'theme-studio__diagnostics--warning' : ''}`}>
            <strong>Contrôle de continuité</strong>
            {diagnosticCount === 0 ? <p>Aucune dérive détectée dans cette projection.</p> : (
              <ul>
                {report.diagnostics.graphic_drift.map((item) => <li key={`drift:${item}`}>Dérive graphique · {item}</li>)}
                {report.diagnostics.unjustified_evolution.map((item) => <li key={`evolution:${item}`}>Évolution injustifiée · {item}</li>)}
                {report.diagnostics.decorative_motif_without_function.map((item) => <li key={`motif:${item}`}>Motif sans fonction · {item}</li>)}
                {report.diagnostics.missing_continuity_refs.map((item) => <li key={`continuity:${item}`}>Continuité incomplète · {item}</li>)}
              </ul>
            )}
          </section>

          <footer>
            Mode diagnostic uniquement · pack de thème non appliqué · génération et canonisation fermées.
          </footer>
        </>
      ) : null}
    </article>
  );
}
