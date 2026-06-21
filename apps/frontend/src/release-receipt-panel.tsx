import {useCallback, useEffect, useState} from 'react';
import type {ReactElement} from 'react';
import type {D12ReleaseReceipt} from '@masterflow/shared';
import {createD12ReleaseReceipt, getD12ReleaseReceipts} from './api.ts';

const split = (value: string): string[] => value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);

export function ReleaseReceiptPanel({token}: {token: string}): ReactElement {
  const [items, setItems] = useState<D12ReleaseReceipt[]>([]);
  const [sha, setSha] = useState('');
  const [environment, setEnvironment] = useState('local');
  const [components, setComponents] = useState('backend, frontend');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('D12 privé · aucune vérification runtime.');
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setItems(await getD12ReleaseReceipts(token)), [token]);
  useEffect(() => { void refresh(); }, [refresh]);
  const add = async (): Promise<void> => {
    if (!/^[0-9a-f]{40}$/i.test(sha.trim()) || !environment.trim() || split(components).length === 0) return;
    setBusy(true);
    try {
      await createD12ReleaseReceipt({commit_sha: sha.trim(), environment_label: environment.trim(), components: split(components), evidence_refs: split(evidence), observed_at: Date.now(), note: note.trim() || null}, token);
      await refresh(); setStatus('Receipt enregistré ; runtime toujours non vérifié.'); setSha(''); setEvidence(''); setNote('');
    } finally { setBusy(false); }
  };
  return <article className="panel panel--wide owner-cockpit"><div className="panel-header"><div><h2>D12 · Release receipts privés</h2><p className="muted compact">Déclaration de SHA, jamais preuve automatique d’un live.</p></div></div><p className="owner-cockpit__status">{status}</p><div className="roster-management__grid"><div className="roster-management__form"><label>SHA Git complet<input value={sha} onChange={(event) => setSha(event.target.value)} placeholder="40 caractères hexadécimaux" /></label><label>Environnement<input value={environment} onChange={(event) => setEnvironment(event.target.value)} /></label><label>Composants<input value={components} onChange={(event) => setComponents(event.target.value)} placeholder="backend, frontend" /></label><label>Preuves (optionnel)<textarea rows={2} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="une référence par ligne" /></label><label>Note (optionnel)<textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} /></label><button disabled={busy} onClick={() => void add()} type="button">Enregistrer le receipt privé</button></div><div className="owner-cockpit__capabilities">{items.map((item) => <section key={item.receipt_id}><div><strong>{item.commit_sha.slice(0, 12)}</strong><span>{item.environment_label}</span></div><p>{item.components.join(' · ')}</p><small>Preuve : {item.proof_state} · Runtime : {item.runtime_status}</small></section>)}</div></div></article>;
}
