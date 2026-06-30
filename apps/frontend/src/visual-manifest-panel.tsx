import {useCallback, useEffect, useState} from 'react';
import type {ReactElement} from 'react';

import type {VisualManifest, VisualReference} from '@masterflow/shared';

import {createVisualManifest, createVisualReference, getVisualManifests, getVisualReferences, updateVisualReference} from './api.ts';
import {VisualDaPreviewPanel} from './visual-da-preview-panel.tsx';

export function VisualManifestPanel({token}: {token: string}): ReactElement {
  const [references, setReferences] = useState<VisualReference[]>([]);
  const [manifests, setManifests] = useState<VisualManifest[]>([]);
  const [status, setStatus] = useState('Chargement des manifests D08.');
  const [busy, setBusy] = useState(false);
  const [referenceLabel, setReferenceLabel] = useState('');
  const [referenceSource, setReferenceSource] = useState('');
  const [title, setTitle] = useState('');
  const [intent, setIntent] = useState('');
  const [daRoot, setDaRoot] = useState('');
  const [layers, setLayers] = useState('');
  const [outputTemplate, setOutputTemplate] = useState('');
  const [sourceTruth, setSourceTruth] = useState('');
  const [selectedReferenceIds, setSelectedReferenceIds] = useState<string[]>([]);
  const [selectedManifestId, setSelectedManifestId] = useState('');

  const refresh = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      const [nextReferences, nextManifests] = await Promise.all([getVisualReferences(token), getVisualManifests(token)]);
      setReferences(nextReferences);
      setManifests(nextManifests);
      setSelectedManifestId((current) => current || nextManifests[0]?.manifest_id || '');
      setStatus('D08 chargé : préparation privée uniquement, génération verrouillée.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'D08 indisponible.');
    } finally { setBusy(false); }
  }, [token]);
  useEffect(() => { void refresh(); }, [refresh]);

  const addReference = useCallback(async (): Promise<void> => {
    if (!referenceLabel.trim() || !referenceSource.trim()) return;
    setBusy(true);
    try {
      await createVisualReference({label: referenceLabel.trim(), source_ref: referenceSource.trim(), reference_status: 'poster_energy', provenance_state: 'declared', privacy_scope: 'private'}, token);
      setReferenceLabel(''); setReferenceSource(''); await refresh();
      setStatus('Référence privée ajoutée ; elle n’autorise aucune génération.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Référence impossible.'); } finally { setBusy(false); }
  }, [referenceLabel, referenceSource, refresh, token]);
  const addManifest = useCallback(async (): Promise<void> => {
    if (!title.trim() || !intent.trim() || !outputTemplate.trim() || !sourceTruth.trim()) return;
    setBusy(true);
    try {
      await createVisualManifest({request_title: title.trim(), intent: intent.trim(), privacy_scope: 'private', canon_entity_refs: [], da_root_ref: daRoot.trim() || null, active_layers: layers.split('\n').map((item) => item.trim()).filter(Boolean), filters: [], output_family: 'visual_diagnostic', output_template: outputTemplate.trim(), source_truth_summary: sourceTruth.trim(), reference_ids: selectedReferenceIds}, token);
      setTitle(''); setIntent(''); setDaRoot(''); setLayers(''); setOutputTemplate(''); setSourceTruth(''); setSelectedReferenceIds([]); await refresh();
      setStatus('Manifest créé. Il reste explicitement bloqué avant toute génération.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Manifest impossible.'); } finally { setBusy(false); }
  }, [daRoot, intent, layers, outputTemplate, refresh, selectedReferenceIds, sourceTruth, title, token]);
  const toggleReference = (id: string): void => setSelectedReferenceIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const classifyReference = async (reference: VisualReference, referenceStatus: VisualReference['reference_status']): Promise<void> => { setBusy(true); try { await updateVisualReference(reference.reference_id, {reference_status: referenceStatus, provenance_state: reference.provenance_state}, token); await refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : 'Classement impossible.'); } finally { setBusy(false); } };
  const selectedManifest = manifests.find((manifest) => manifest.manifest_id === selectedManifestId) ?? manifests[0] ?? null;
  const resolverEntity = selectedManifest?.canon_entity_refs.find((ref) => ref === 'masterflex-001' || ref === 'prof-krapu-001') ?? 'masterflex-001';
  const resolverLayer = selectedManifest?.active_layers.includes('event_layer_ours_dor') ? 'event_layer_ours_dor' : undefined;

  return <article className="panel panel--wide owner-cockpit">
    <div className="panel-header"><div><h2>D08 · manifeste visuel</h2><p className="muted compact">Cadrage, références et gates. Aucun bouton de génération.</p></div><button className="secondary" disabled={busy} onClick={() => void refresh()} type="button">Rafraîchir</button></div>
    <p className="owner-cockpit__status" aria-live="polite">{status}</p>
    <div className="roster-management__grid">
      <div className="roster-management__form"><strong>Référence privée</strong><label>Nom<input value={referenceLabel} onChange={(event) => setReferenceLabel(event.target.value)} /></label><label>Référence source<input value={referenceSource} onChange={(event) => setReferenceSource(event.target.value)} placeholder="drive://…" /></label><button disabled={busy} onClick={() => void addReference()} type="button">Ajouter la référence</button>{references.map((reference) => <label key={reference.reference_id}>{reference.label}<select value={reference.reference_status} onChange={(event) => void classifyReference(reference, event.target.value as VisualReference['reference_status'])}><option value="poster_energy">poster_energy</option><option value="world_style">world_style</option><option value="filter_reference">filter_reference</option><option value="output_template">output_template</option><option value="anti_pattern">anti_pattern</option><option value="rejected">rejected</option></select></label>)}</div>
      <div className="roster-management__form"><strong>Manifest visuel privé</strong><label>Titre<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Intention<textarea rows={2} value={intent} onChange={(event) => setIntent(event.target.value)} /></label><label>DA root<input value={daRoot} onChange={(event) => setDaRoot(event.target.value)} /></label><label>Layers — une ligne par layer<textarea rows={2} value={layers} onChange={(event) => setLayers(event.target.value)} /></label><label>Template de sortie<input value={outputTemplate} onChange={(event) => setOutputTemplate(event.target.value)} /></label><label>Source Truth<textarea rows={2} value={sourceTruth} onChange={(event) => setSourceTruth(event.target.value)} /></label><small>Références : {references.map((reference) => <label key={reference.reference_id}><input checked={selectedReferenceIds.includes(reference.reference_id)} onChange={() => toggleReference(reference.reference_id)} type="checkbox" />{reference.label} · {reference.reference_status}</label>)}</small><button disabled={busy} onClick={() => void addManifest()} type="button">Préparer le manifest</button></div>
    </div>
    <div className="owner-cockpit__capabilities">{manifests.map((manifest) => <section key={manifest.manifest_id}><div><strong>{manifest.request_title}</strong><span>{manifest.status}</span></div><p>{manifest.action_ready_report.final_state} · blocages : {manifest.action_ready_report.generation_blockers.join(', ')}</p><button className="secondary" onClick={() => setSelectedManifestId(manifest.manifest_id)} type="button">Préparer l’explication DA</button></section>)}</div>
    <VisualDaPreviewPanel
      key={selectedManifest?.manifest_id ?? 'd08-default'}
      compact
      token={token}
      defaultQuery={{
        entity_id: resolverEntity,
        context: selectedManifest?.request_title ?? 'd08_visual_manifest',
        output_surface: selectedManifest?.output_template || 'ui_state_pack',
        active_mode: 'd08',
        optional_event_layer: resolverLayer,
      }}
    />
  </article>;
}
