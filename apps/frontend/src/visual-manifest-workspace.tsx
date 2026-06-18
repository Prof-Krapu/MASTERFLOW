import {useCallback, useEffect, useMemo, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {VisualManifest, VisualReferenceStatus} from '@masterflow/shared';

import {createVisualManifest, getVisualManifests} from './api.ts';

type VisualManifestWorkspaceProps = {
  token: string;
};

const REFERENCE_STATUS: Array<{value: VisualReferenceStatus; label: string}> = [
  {value: 'expression_only', label: 'Expression uniquement'},
  {value: 'outfit_only', label: 'Tenue uniquement'},
  {value: 'world_style', label: 'Style de monde'},
  {value: 'poster_energy', label: 'Énergie affiche'},
  {value: 'filter_reference', label: 'Référence filtre'},
  {value: 'output_template', label: 'Gabarit de sortie'},
  {value: 'anti_pattern', label: 'Anti-pattern'},
  {value: 'rejected', label: 'Rejetée'},
];

function list(value: string): string[] {
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function gateCount(manifest: VisualManifest): string {
  const values = Object.values(manifest.gate_report);
  return `${values.filter((value) => value === 'pass').length}/${values.length}`;
}

export function VisualManifestWorkspace({token}: VisualManifestWorkspaceProps): ReactElement {
  const [manifests, setManifests] = useState<VisualManifest[]>([]);
  const [title, setTitle] = useState('');
  const [intent, setIntent] = useState('');
  const [daRoot, setDaRoot] = useState('');
  const [entities, setEntities] = useState('');
  const [layers, setLayers] = useState('');
  const [filters, setFilters] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [referenceRef, setReferenceRef] = useState('');
  const [referenceStatus, setReferenceStatus] = useState<VisualReferenceStatus>('expression_only');
  const [status, setStatus] = useState('Chargement des manifestes.');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await getVisualManifests(token);
      setManifests(next);
      setStatus(next.length > 0 ? `${next.length} manifeste(s) privé(s).` : 'Aucun manifeste préparé.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Manifestes indisponibles.');
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const latest = manifests[0] ?? null;
  const missingGates = useMemo(() => latest
    ? Object.entries(latest.gate_report).filter(([, value]) => value !== 'pass').map(([key]) => key)
    : [], [latest]);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!title.trim() || !intent.trim()) return;
    setSubmitting(true);
    setStatus('Préparation du manifeste.');
    try {
      const created = await createVisualManifest({
        request_title: title.trim(),
        intent: intent.trim(),
        privacy_scope: 'private',
        canon_entity_refs: list(entities),
        da_root_ref: daRoot.trim() || null,
        active_layers: list(layers),
        filters: list(filters),
        output_template: outputTemplate.trim() || null,
        references: referenceRef.trim()
          ? [{reference_ref: referenceRef.trim(), status: referenceStatus}]
          : [],
      }, token);
      setManifests((current) => [created, ...current]);
      setStatus(created.action_ready
        ? 'Manifeste prêt. Génération toujours bloquée par les gates techniques et humains.'
        : 'Cadrage enregistré. Complète les gates manquants avant toute confirmation.');
      setTitle('');
      setIntent('');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Création impossible.');
    } finally {
      setSubmitting(false);
    }
  }, [daRoot, entities, filters, intent, layers, outputTemplate, referenceRef, referenceStatus, title, token]);

  return (
    <article className="panel panel--wide visual-manifest-panel">
      <div className="panel-header">
        <div>
          <h2>D08 · Manifeste visuel</h2>
          <p className="muted compact">Cadrage privé, références typées, aucun lancement provider.</p>
        </div>
        <span className="counter">{manifests.length}</span>
      </div>

      <div className="visual-manifest-status" aria-live="polite">{status}</div>

      <form className="visual-manifest-form" onSubmit={(event) => void submit(event)}>
        <label><span>Titre</span><input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="visual-manifest-form__wide"><span>Intention</span><textarea required rows={3} value={intent} onChange={(event) => setIntent(event.target.value)} /></label>
        <label><span>Racine DA</span><input placeholder="da:masterflow-core" value={daRoot} onChange={(event) => setDaRoot(event.target.value)} /></label>
        <label><span>Entités canon</span><input placeholder="entity:persona, entity:room" value={entities} onChange={(event) => setEntities(event.target.value)} /></label>
        <label><span>Layers</span><input placeholder="portrait_editorial" value={layers} onChange={(event) => setLayers(event.target.value)} /></label>
        <label><span>Filtres</span><input placeholder="contrast_controlled" value={filters} onChange={(event) => setFilters(event.target.value)} /></label>
        <label><span>Gabarit sortie</span><input placeholder="template:portrait-4x5" value={outputTemplate} onChange={(event) => setOutputTemplate(event.target.value)} /></label>
        <label><span>Référence</span><input placeholder="resource:reference-id" value={referenceRef} onChange={(event) => setReferenceRef(event.target.value)} /></label>
        <label>
          <span>Statut référence</span>
          <select value={referenceStatus} onChange={(event) => setReferenceStatus(event.target.value as VisualReferenceStatus)}>
            {REFERENCE_STATUS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button disabled={submitting || !title.trim() || !intent.trim()} type="submit">Préparer</button>
      </form>

      {latest ? (
        <section className="visual-manifest-result" aria-label="Dernier manifeste visuel">
          <div>
            <strong>{latest.request_title}</strong>
            <span>{latest.ui_state}</span>
          </div>
          <dl>
            <div><dt>Gates</dt><dd>{gateCount(latest)}</dd></div>
            <div><dt>Readiness</dt><dd>{latest.output_readiness}</dd></div>
            <div><dt>Scope</dt><dd>{latest.privacy_scope}</dd></div>
          </dl>
          <p>{latest.intent}</p>
          <small>Bloqué : {missingGates.join(', ') || 'confirmation et queue provider'}</small>
        </section>
      ) : null}
    </article>
  );
}
