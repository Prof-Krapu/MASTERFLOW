import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  CompiledVisualPlan,
  D08VisualManifestCandidate,
  ThemeStudioAssetPackPreview,
  VisualKnowledgeRegistry,
  VisualManifest,
  VisualNarrativeGrammarReport,
  VisualRegistryLintReport,
} from '@masterflow/shared';

import {
  compileVisualKnowledgePlan,
  getThemeStudioAssetPack,
  getD08VisualManifestCandidate,
  getVisualKnowledgeRegistry,
  getVisualKnowledgeRegistryLint,
  getVisualManifests,
  getVisualNarrativeGrammar,
} from './api.ts';
import {VisualDaPreviewPanel} from './visual-da-preview-panel.tsx';

export function ThemeStudioPanel({token}: {token: string}): ReactElement {
  const [registrySource, setRegistrySource] = useState<'empty_core' | 'legacy_adapter'>('empty_core');
  const [registry, setRegistry] = useState<VisualKnowledgeRegistry | null>(null);
  const [registryLint, setRegistryLint] = useState<VisualRegistryLintReport | null>(null);
  const [compiledPlan, setCompiledPlan] = useState<CompiledVisualPlan | null>(null);
  const [d08Candidate, setD08Candidate] = useState<D08VisualManifestCandidate | null>(null);
  const [fabricStatus, setFabricStatus] = useState('Chargement du Registry Kernel…');
  const [selectedEntityRef, setSelectedEntityRef] = useState('');
  const [selectedOutputRef, setSelectedOutputRef] = useState('');
  const [selectedLayerRefs, setSelectedLayerRefs] = useState<string[]>([]);
  const [gaugePreferences, setGaugePreferences] = useState<Record<string, number>>({});
  const [manifests, setManifests] = useState<VisualManifest[]>([]);
  const [selected, setSelected] = useState('');
  const [report, setReport] = useState<VisualNarrativeGrammarReport | null>(null);
  const [assetPack, setAssetPack] = useState<ThemeStudioAssetPackPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Choisis un manifest pour lire sa grammaire.');

  const refreshFabric = useCallback(async (source = registrySource): Promise<void> => {
    setFabricStatus('Lecture du registre visuel…');
    try {
      const [next, lint] = await Promise.all([
        getVisualKnowledgeRegistry(source, token),
        getVisualKnowledgeRegistryLint(source, token),
      ]);
      setRegistry(next);
      setRegistryLint(lint);
      setCompiledPlan(null);
      setD08Candidate(null);
      setSelectedEntityRef((current) =>
        next.entities.some((entity) => entity.entity_ref === current)
          ? current
          : next.entities[0]?.entity_ref ?? '',
      );
      setSelectedOutputRef((current) =>
        next.output_recipes.some((output) => output.recipe_id === current)
          ? current
          : next.output_recipes[0]?.recipe_id ?? '',
      );
      setSelectedLayerRefs([]);
      setGaugePreferences({});
      setFabricStatus(source === 'empty_core'
        ? 'Kernel vide opérationnel : aucune DA propriétaire absorbée.'
        : 'Projection de compatibilité chargée : contenu historique non promu en nouveau canon.');
    } catch (error) {
      setRegistry(null);
      setRegistryLint(null);
      setFabricStatus(error instanceof Error ? error.message : 'Registry Kernel indisponible.');
    }
  }, [registrySource, token]);

  useEffect(() => {
    void refreshFabric();
  }, [refreshFabric]);

  const selectedEntity = useMemo(
    () => registry?.entities.find((entity) => entity.entity_ref === selectedEntityRef) ?? null,
    [registry, selectedEntityRef],
  );
  const selectedOutput = useMemo(
    () => registry?.output_recipes.find((output) => output.recipe_id === selectedOutputRef) ?? null,
    [registry, selectedOutputRef],
  );
  const selectedAnnotations = useMemo(() => {
    if (!registry || !selectedEntity) return [];
    const refs = new Set(selectedEntity.reference_annotation_refs);
    return registry.reference_annotations.filter((annotation) => refs.has(annotation.annotation_id));
  }, [registry, selectedEntity]);

  const compileWorkspacePlan = useCallback(async (): Promise<void> => {
    const entity = selectedEntity;
    const output = selectedOutput;
    if (!registry || !entity || !output) {
      setFabricStatus('Ce registre est volontairement vide : ajoute une fixture ou ouvre la projection de compatibilité.');
      return;
    }
    setFabricStatus('Compilation structurée en cours…');
    try {
      const request = {
        registry_source: registrySource,
        intent: `Prévisualiser ${entity.label} pour ${output.label}.`,
        context: 'da_studio',
        entity_refs: [entity.entity_ref],
        active_mode: 'godmode',
        output_recipe_ref: output.recipe_id,
        requested_layer_refs: selectedLayerRefs,
        acting_state_ref: null,
        preference_gauge_values: gaugePreferences,
      };
      const [next, candidate] = await Promise.all([
        compileVisualKnowledgePlan(request, token),
        getD08VisualManifestCandidate(request, token),
      ]);
      setCompiledPlan(next);
      setD08Candidate(candidate);
      setFabricStatus(next.status === 'ready_for_manifest'
        ? 'Plan déterministe prêt pour revue D08. Génération toujours fermée.'
        : 'Plan compilé avec décisions ou ressources manquantes.');
    } catch (error) {
      setCompiledPlan(null);
      setD08Candidate(null);
      setFabricStatus(error instanceof Error ? error.message : 'Compilation impossible.');
    }
  }, [
    gaugePreferences,
    registry,
    registrySource,
    selectedEntity,
    selectedLayerRefs,
    selectedOutput,
    token,
  ]);

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
          <h2>DA Studio · encyclopédie graphique</h2>
          <p className="muted compact">
            Composer, expliquer et contrôler une DA avant tout asset généré.
          </p>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
          Rafraîchir
        </button>
      </header>

      <section className="da-studio__fabric">
        <div className="da-studio__fabric-header">
          <div>
            <strong>Visual Knowledge Fabric</strong>
            <span>Registry Kernel + compilateur sans provider</span>
          </div>
          <label>
            Source
            <select
              value={registrySource}
              onChange={(event) => {
                const source = event.target.value as 'empty_core' | 'legacy_adapter';
                setRegistrySource(source);
                void refreshFabric(source);
              }}
            >
              <option value="empty_core">Kernel vide</option>
              <option value="legacy_adapter">Compatibilité historique</option>
            </select>
          </label>
        </div>
        <p className="owner-cockpit__status" aria-live="polite">{fabricStatus}</p>
        {registry ? (
          <>
            <dl className="theme-studio__summary">
              <div><dt>Entités</dt><dd>{registry.entities.length}</dd></div>
              <div><dt>Layers</dt><dd>{registry.layers.length}</dd></div>
              <div><dt>Jauges</dt><dd>{registry.gauges.length}</dd></div>
              <div><dt>Outputs</dt><dd>{registry.output_recipes.length}</dd></div>
            </dl>
            <div className="da-studio__fabric-actions">
              <span>
                {registry.status === 'empty_ready'
                  ? 'Le moteur existe sans contenu canon inventé.'
                  : 'Adapter de transition : les anciennes données restent explicitement séparées.'}
              </span>
              <button
                disabled={!selectedEntity || !selectedOutput}
                onClick={() => void compileWorkspacePlan()}
                type="button"
              >
                Compiler ce plan
              </button>
            </div>
            {selectedEntity && selectedOutput ? (
              <div className="da-studio__workspace">
                <section>
                  <div className="da-studio__section-title">
                    <strong>Explorer</strong>
                    <span>entité et output</span>
                  </div>
                  <label>
                    Entité
                    <select
                      value={selectedEntityRef}
                      onChange={(event) => {
                        setSelectedEntityRef(event.target.value);
                        setCompiledPlan(null);
                        setD08Candidate(null);
                      }}
                    >
                      {registry.entities.map((entity) => (
                        <option key={entity.entity_ref} value={entity.entity_ref}>
                          {entity.label} · {entity.entity_kind}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Output Lab
                    <select
                      value={selectedOutputRef}
                      onChange={(event) => {
                        setSelectedOutputRef(event.target.value);
                        setCompiledPlan(null);
                        setD08Candidate(null);
                      }}
                    >
                      {registry.output_recipes.map((output) => (
                        <option key={output.recipe_id} value={output.recipe_id}>
                          {output.label} · {output.family}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>
                    {Object.entries(selectedOutput.technical_constraints)
                      .map(([key, value]) => `${key}: ${String(value)}`)
                      .join(' · ') || 'Aucune contrainte technique déclarée.'}
                  </small>
                </section>

                <section>
                  <div className="da-studio__section-title">
                    <strong>Layer Composer</strong>
                    <span>composition non destructive</span>
                  </div>
                  <p className="muted compact">
                    Hérités : {selectedEntity.layer_refs.join(' · ') || 'aucun'}
                  </p>
                  <div className="da-studio__checks">
                    {registry.layers
                      .filter((layer) => !selectedEntity.layer_refs.includes(layer.layer_id))
                      .map((layer) => (
                        <label key={layer.layer_id}>
                          <input
                            checked={selectedLayerRefs.includes(layer.layer_id)}
                            onChange={(event) => {
                              setSelectedLayerRefs((current) => event.target.checked
                                ? [...current, layer.layer_id]
                                : current.filter((ref) => ref !== layer.layer_id));
                              setCompiledPlan(null);
                              setD08Candidate(null);
                            }}
                            type="checkbox"
                          />
                          <span>{layer.label}</span>
                          <small>{layer.layer_kind}</small>
                        </label>
                      ))}
                    {registry.layers.every((layer) => selectedEntity.layer_refs.includes(layer.layer_id))
                      ? <p className="muted compact">Aucun layer optionnel dans ce registre.</p>
                      : null}
                  </div>
                </section>

                <section>
                  <div className="da-studio__section-title">
                    <strong>Gauge Console</strong>
                    <span>plages sûres uniquement</span>
                  </div>
                  <div className="da-studio__gauges">
                    {registry.gauges.map((gauge) => {
                      const value = gaugePreferences[gauge.gauge_id] ?? gauge.default_value;
                      return (
                        <label key={gauge.gauge_id}>
                          <span>{gauge.label}</span>
                          <input
                            disabled={!gauge.user_adjustable}
                            max={gauge.safe_max}
                            min={gauge.safe_min}
                            onChange={(event) => {
                              setGaugePreferences((current) => ({
                                ...current,
                                [gauge.gauge_id]: Number(event.target.value),
                              }));
                              setCompiledPlan(null);
                              setD08Candidate(null);
                            }}
                            step={(gauge.safe_max - gauge.safe_min) / 20 || 1}
                            type="range"
                            value={value}
                          />
                          <output>{value.toFixed(2)} {gauge.unit}</output>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="da-studio__section-title">
                    <strong>Reference Board</strong>
                    <span>régions et usages</span>
                  </div>
                  {selectedAnnotations.length > 0 ? selectedAnnotations.map((annotation) => (
                    <article key={annotation.annotation_id}>
                      <div>
                        <strong>{annotation.label}</strong>
                        <span>{annotation.role}</span>
                      </div>
                      <small>
                        {annotation.selector.type} · droits {annotation.rights_status} · provenance {annotation.provenance_state}
                      </small>
                    </article>
                  )) : <p className="muted compact">Aucune référence assignée : le compilateur devra le signaler si l’output en exige.</p>}
                </section>
              </div>
            ) : null}
            {registryLint ? (
              <section className={`theme-studio__diagnostics ${registryLint.valid ? '' : 'theme-studio__diagnostics--warning'}`}>
                <div className="da-studio__plan-title">
                  <strong>{registryLint.valid ? 'Registre cohérent' : 'Registre bloqué par le lint'}</strong>
                  <span>
                    {registryLint.counts.block} blocage(s) · {registryLint.counts.warning} avertissement(s)
                  </span>
                </div>
                {registryLint.diagnostics.length > 0 ? (
                  <ul>
                    {registryLint.diagnostics.slice(0, 8).map((item) => (
                      <li key={`${item.code}:${item.target_ref}`}>{item.message}</li>
                    ))}
                  </ul>
                ) : <p>Aucun lien cassé, cycle ou référence contaminée détecté.</p>}
              </section>
            ) : null}
          </>
        ) : null}
        {compiledPlan ? (
          <section className={`theme-studio__diagnostics ${compiledPlan.status === 'blocked' ? 'theme-studio__diagnostics--warning' : ''}`}>
            <div className="da-studio__plan-title">
              <strong>{compiledPlan.status === 'ready_for_manifest' ? 'Plan prêt pour manifest' : 'Plan à arbitrer'}</strong>
              <span>{compiledPlan.deterministic_hash.slice(0, 12)}</span>
            </div>
            <p>
              {compiledPlan.layer_stack.length} layer(s) · {compiledPlan.active_traits.length} trait(s) ·{' '}
              {compiledPlan.reference_annotations.length} annotation(s) · génération fermée
            </p>
            <div className="da-studio__plan-grid">
              <div>
                <strong>Stack résolue</strong>
                <p>{compiledPlan.layer_stack.map((layer) => layer.layer_ref).join(' → ') || 'aucune'}</p>
              </div>
              <div>
                <strong>Jauges finales</strong>
                <p>{compiledPlan.gauges.map((gauge) => `${gauge.gauge_id}: ${gauge.value}`).join(' · ') || 'aucune'}</p>
              </div>
            </div>
            {compiledPlan.missing_items.length > 0 ? (
              <ul>{compiledPlan.missing_items.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
            {compiledPlan.conflicts.length > 0 ? (
              <ul>{compiledPlan.conflicts.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
          </section>
        ) : null}
        {d08Candidate ? (
          <section className={`theme-studio__diagnostics ${d08Candidate.readiness === 'blocked' ? 'theme-studio__diagnostics--warning' : ''}`}>
            <div className="da-studio__plan-title">
              <strong>Pont D08 · {d08Candidate.readiness === 'ready_for_d08_review' ? 'candidat prêt à relire' : 'bloqué'}</strong>
              <span>non persisté</span>
            </div>
            <p>
              {d08Candidate.request_preview.request_title} · template {d08Candidate.request_preview.output_template}
            </p>
            <small>
              Prochaine action : relire puis matérialiser les annotations comme références D08. Aucune génération ouverte.
            </small>
            {d08Candidate.blockers.length > 0 ? (
              <ul>{d08Candidate.blockers.map((item) => <li key={item}>{item}</li>)}</ul>
            ) : null}
          </section>
        ) : null}
      </section>

      <section className="theme-studio__explanations">
        <div><strong>Theme Studio</strong><span>module du DA Studio</span></div>
        <p className="muted compact">Analyse des manifests, grammaire narrative, palettes, typographies et packs candidats.</p>
      </section>

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

      <VisualDaPreviewPanel
        token={token}
        defaultQuery={{
          context: 'theme_studio',
          output_surface: 'ui_state_pack',
          active_mode: 'theme_studio',
        }}
      />

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
