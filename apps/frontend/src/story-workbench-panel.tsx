import {useCallback, useEffect, useState} from 'react';
import type {ReactElement} from 'react';
import type {StoryPatchCandidate, StoryWorkbench} from '@masterflow/shared';

import {
  createStoryPatch,
  createStoryWorkbench,
  getStoryPatches,
  getStoryWorkbenches,
  setStoryReaderState,
  validateStoryPatch,
} from './api.ts';
import {MasterStoryCanonPanel} from './masterstory-canon-panel.tsx';

export function StoryWorkbenchPanel({token}: {token: string}): ReactElement {
  const [items, setItems] = useState<StoryWorkbench[]>([]);
  const [patches, setPatches] = useState<StoryPatchCandidate[]>([]);
  const [selected, setSelected] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [node, setNode] = useState('');
  const [patchTitle, setPatchTitle] = useState('');
  const [proposal, setProposal] = useState('');
  const [status, setStatus] = useState('D09 privé.');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const workbenches = await getStoryWorkbenches(token);
    setItems(workbenches);
    const id = selected || workbenches[0]?.workbench_id || '';
    setSelected(id);
    setPatches(id ? await getStoryPatches(id, token) : []);
  }, [selected, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = async (): Promise<void> => {
    if (!title.trim() || !source.trim()) return;
    setBusy(true);
    try {
      const workbench = await createStoryWorkbench({
        title: title.trim(),
        source_ref: source.trim(),
        intake_mode: 'index_only',
        source_truth_state: 'USER_PROVIDED',
      }, token);
      setSelected(workbench.workbench_id);
      setTitle('');
      setSource('');
      await refresh();
      setStatus('Workbench privé créé ; source non importée.');
    } finally {
      setBusy(false);
    }
  };

  const saveReader = async (): Promise<void> => {
    if (!selected || !node.trim()) return;
    await setStoryReaderState(selected, {mode: 'MODE_LECTURE', current_node: node.trim()}, token);
    setStatus('Position lecteur enregistrée ; futurs spoilers hors contexte.');
  };

  const addPatch = async (): Promise<void> => {
    if (!selected || !patchTitle.trim() || !proposal.trim()) return;
    await createStoryPatch(selected, {
      title: patchTitle.trim(),
      proposal: proposal.trim(),
      truth_state: 'CANDIDATE',
    }, token);
    setPatchTitle('');
    setProposal('');
    await refresh();
    setStatus('Patch candidat créé ; source et canon inchangés.');
  };

  const validate = async (patchId: string): Promise<void> => {
    if (!selected) return;
    setBusy(true);
    try {
      await validateStoryPatch(selected, patchId, token);
      await refresh();
      setStatus('Validation auteur enregistrée ; source et canon inchangés.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="panel panel--wide owner-cockpit">
      <div className="panel-header">
        <div>
          <h2>D09 · workbench auteur privé</h2>
          <p className="muted compact">Source externe, lecture anti-spoiler, propositions candidates.</p>
        </div>
      </div>
      <p className="owner-cockpit__status">{status}</p>
      <div className="roster-management__grid">
        <div className="roster-management__form">
          <strong>Nouveau workbench</strong>
          <label>Titre<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Référence source<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="drive://…" /></label>
          <button disabled={busy} onClick={() => void add()} type="button">Créer sans importer</button>
          <label>
            Workbench
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
              {items.map((workbench) => <option key={workbench.workbench_id} value={workbench.workbench_id}>{workbench.title}</option>)}
            </select>
          </label>
          <label>Position lecteur<input value={node} onChange={(event) => setNode(event.target.value)} /></label>
          <button className="secondary" onClick={() => void saveReader()} type="button">Verrouiller la position lecteur</button>
        </div>
        <div className="roster-management__form">
          <strong>Patch candidat</strong>
          <label>Titre<input value={patchTitle} onChange={(event) => setPatchTitle(event.target.value)} /></label>
          <label>Proposition<textarea rows={4} value={proposal} onChange={(event) => setProposal(event.target.value)} /></label>
          <button onClick={() => void addPatch()} type="button">Créer le candidat</button>
          {patches.map((patch) => (
            <section key={patch.patch_id}>
              <small>{patch.title} · {patch.truth_state} · {patch.status}</small>
              {patch.status === 'candidate'
                ? <button className="secondary" disabled={busy} onClick={() => void validate(patch.patch_id)} type="button">Valider comme candidat auteur</button>
                : <small>Validation auteur privée.</small>}
            </section>
          ))}
        </div>
      </div>
      {selected
        ? <MasterStoryCanonPanel key={selected} token={token} workbenchId={selected} />
        : <p className="muted compact">Crée ou sélectionne un workbench pour construire une lecture narrative.</p>}
    </article>
  );
}
