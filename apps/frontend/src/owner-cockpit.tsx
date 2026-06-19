import {useCallback, useEffect, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  ContextTier,
  CreateD12MissedTriggerFinding,
  OwnerCockpitStatus,
  PreviewActionsExpiryResponse,
  ProcessActivationReadModel,
} from '@masterflow/shared';

import {
  applyHardStopToSelectedActions,
  createD12MissedTriggerFinding,
  diagnoseProcessActivation,
  getOwnerCockpitStatus,
  previewHardStopActionExpiry,
} from './api.ts';

type OwnerCockpitProps = {
  activeMode: string;
  contextTier: ContextTier;
  token: string;
};

const CAPABILITY_LABELS: Record<string, string> = {
  shared_validation_inbox: 'Validation Inbox',
  d05_guided_runtime: 'D05 sujet guidé',
  d12_owner_cockpit: 'D12 cockpit owner',
  process_activation: 'Activation des processus',
  d08_generation: 'D08 génération',
};

export function OwnerCockpit({activeMode, contextTier, token}: OwnerCockpitProps): ReactElement {
  const [snapshot, setSnapshot] = useState<OwnerCockpitStatus | null>(null);
  const [status, setStatus] = useState('Chargement du cockpit owner.');
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState('');
  const [activation, setActivation] = useState<ProcessActivationReadModel | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [findingStatus, setFindingStatus] = useState('');
  const [expiryPreview, setExpiryPreview] = useState<PreviewActionsExpiryResponse | null>(null);
  const [previewingExpiry, setPreviewingExpiry] = useState(false);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [applyingExpiry, setApplyingExpiry] = useState(false);
  const [expiryStatus, setExpiryStatus] = useState('');

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setSnapshot(await getOwnerCockpitStatus(token));
      setStatus('Cockpit synchronisé depuis le read-model runtime D12.');
    } catch (error) {
      setSnapshot(null);
      setStatus(error instanceof Error ? error.message : 'Cockpit owner indisponible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const diagnose = useCallback(async (): Promise<void> => {
    if (signal.trim().length < 2) return;
    setDiagnosing(true);
    try {
      setActivation(await diagnoseProcessActivation({
        signal: signal.trim(),
        source: 'owner_observation',
        active_mode: activeMode,
        loaded_context_tier: contextTier,
      }, token));
      setFindingStatus('');
      setExpiryPreview(null);
      setSelectedActionIds([]);
      setExpiryStatus('');
    } finally {
      setDiagnosing(false);
    }
  }, [activeMode, contextTier, signal, token]);

  const createFinding = useCallback(async (): Promise<void> => {
    if (!activation?.missed_trigger_candidate) return;
    const missed = activation.missed_trigger_candidate;
    const body: CreateD12MissedTriggerFinding = {
      source_ref: `process_activation:${activation.generated_at}`,
      expected_process: missed.expected_process,
      actual_runtime_response: activation.next_safe_action.reason,
      missing_runtime_piece: missed.missing_runtime_piece,
      user_impact: missed.user_impact,
      domain_refs: activation.detected_domains,
      output_family_refs: activation.output_family_candidates,
      evidence_refs: [`owner_signal:${activation.raw_signal_summary}`],
      blocked_actions: activation.blocked_actions.length > 0
        ? activation.blocked_actions
        : ['auto_fix', 'auto_canon'],
      recommended_queue_task: {
        task: missed.suggested_queue_task,
        impact: missed.user_impact,
        risk: missed.severity,
        source_of_truth: 'D12 missed trigger finding spec',
        truth_status: 'observation',
        validation_required: false,
        suggested_owner: 'MALEX',
        forbidden_actions: activation.next_safe_action.forbidden_followups,
      },
      severity: missed.severity,
    };
    setFindingStatus('Création de la finding D12…');
    await createD12MissedTriggerFinding(body, token);
    setFindingStatus('Finding D12 créée en observation. Aucun fix automatique lancé.');
    await refresh();
  }, [activation, refresh, token]);

  const previewExpiry = useCallback(async (): Promise<void> => {
    setPreviewingExpiry(true);
    try {
      setExpiryPreview(await previewHardStopActionExpiry(token));
      setSelectedActionIds([]);
      setExpiryStatus('');
    } finally {
      setPreviewingExpiry(false);
    }
  }, [token]);

  const toggleSelectedAction = useCallback((actionId: string): void => {
    setSelectedActionIds((current) => current.includes(actionId)
      ? current.filter((id) => id !== actionId)
      : [...current, actionId]);
  }, []);

  const applySelectedExpiry = useCallback(async (): Promise<void> => {
    if (selectedActionIds.length === 0) return;
    setApplyingExpiry(true);
    setExpiryStatus('Application du hard-stop à la sélection…');
    try {
      const result = await applyHardStopToSelectedActions(selectedActionIds, token);
      setExpiryStatus(`${result.expired_count} action(s) sélectionnée(s) gelée(s). Aucune autre action modifiée.`);
      setExpiryPreview(null);
      setSelectedActionIds([]);
      await refresh();
    } catch (error) {
      setExpiryStatus(error instanceof Error ? error.message : 'Application du hard-stop impossible.');
    } finally {
      setApplyingExpiry(false);
    }
  }, [refresh, selectedActionIds, token]);

  return (
    <article className="panel panel--wide owner-cockpit">
      <div className="panel-header">
        <div>
          <h2>Owner cockpit · état de décision</h2>
          <p className="muted compact">
            Lecture seule : vérité runtime, preuves manquantes, blocages et prochain geste sûr.
          </p>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>

      <p className="owner-cockpit__next">
        <strong>Prochain geste sûr :</strong>{' '}
        {snapshot?.next_safe_action.label ?? 'État runtime indisponible.'}
      </p>
      {snapshot ? <p className="muted compact">{snapshot.next_safe_action.reason}</p> : null}
      <p className="owner-cockpit__status" aria-live="polite">{status}</p>

      {snapshot ? (
        <>
          <dl className="owner-cockpit__summary">
            <div><dt>Validations</dt><dd>{snapshot.validations.total}</dd></div>
            <div><dt>Risque haut</dt><dd>{snapshot.validations.high_or_critical}</dd></div>
            <div><dt>Jobs actifs</dt><dd>{snapshot.jobs.active}</dd></div>
            <div><dt>À revoir</dt><dd>{snapshot.jobs.needs_review}</dd></div>
            <div><dt>Échecs</dt><dd>{snapshot.jobs.failed}</dd></div>
            <div><dt>Actions stale</dt><dd>{snapshot.action_lifecycle.stale}</dd></div>
            <div><dt>Findings D12</dt><dd>{snapshot.d12_findings.open}</dd></div>
          </dl>

          <div className="owner-cockpit__truth">
            <section>
              <strong>Version live</strong>
              <span>{snapshot.runtime_truth.release_sha ?? 'Non vérifiée'}</span>
              <small>
                {snapshot.runtime_truth.release_verification === 'reported'
                  ? 'SHA déclaré par le déploiement.'
                  : "Aucun SHA n'est injecté par le déploiement."}
              </small>
            </section>
            <section>
              <strong>Canon ↔ GitHub</strong>
              <span>Contrôle manuel requis</span>
              <small>{snapshot.runtime_truth.matrix_ref}</small>
            </section>
          </div>

          <div className="owner-cockpit__capabilities">
            {snapshot.capabilities.map((capability) => (
              <section key={capability.id}>
                <div>
                  <strong>{CAPABILITY_LABELS[capability.id] ?? capability.id}</strong>
                  <span>{capability.status}</span>
                </div>
                <p>{capability.note}</p>
              </section>
            ))}
          </div>

          <div className="owner-cockpit__limits">
            <strong>Alertes et limites</strong>
            <ul>
              {snapshot.alerts.map((alert) => (
                <li key={alert.type}>{alert.message}</li>
              ))}
            </ul>
          </div>

          <section className="process-control-strip">
            <div>
              <strong>Quel processus cette demande devrait-elle activer ?</strong>
              <span>Diagnostic déterministe · aucune exécution</span>
            </div>
            <div className="process-control-strip__input">
              <input
                onChange={(event) => setSignal(event.target.value)}
                placeholder="Ex. corrige ce travail, génère une image, stop…"
                value={signal}
              />
              <button disabled={diagnosing || signal.trim().length < 2} onClick={() => void diagnose()} type="button">
                {diagnosing ? 'Analyse…' : 'Analyser sans exécuter'}
              </button>
            </div>
            {activation ? (
              <div className="process-control-strip__result">
                <p><strong>Processus probable :</strong> {activation.process_candidates[0]?.label ?? 'aucun'}</p>
                <p><strong>Famille :</strong> {activation.output_family_candidates[0] ?? 'indéterminée'}</p>
                <p><strong>Statut :</strong> {activation.status} · confiance {Math.round(activation.confidence * 100)} %</p>
                <p><strong>Prochaine action sûre :</strong> {activation.next_safe_action.label}</p>
                <p><strong>Bloqué :</strong> {activation.blocked_actions.join(' · ') || 'aucune action identifiée'}</p>
                {activation.missed_trigger_candidate ? (
                  <button onClick={() => void createFinding()} type="button">
                    Créer une finding D12 observation-only
                  </button>
                ) : null}
                {activation.missed_trigger_candidate?.expected_process === 'hard_stop' ? (
                  <button
                    className="secondary"
                    disabled={previewingExpiry}
                    onClick={() => void previewExpiry()}
                    type="button"
                  >
                    {previewingExpiry ? 'Prévisualisation…' : 'Voir les actions qui seraient gelées'}
                  </button>
                ) : null}
                {expiryPreview ? (
                  <div className="hard-stop-selection">
                    <p className="muted compact">
                      Prévisualisation : {expiryPreview.candidate_count} action(s) sensible(s) pourraient être gelée(s).
                      Coche uniquement celles à arrêter. Aucune action n’a encore été modifiée.
                    </p>
                    {expiryPreview.candidates.map((candidate) => (
                      <label key={candidate.id}>
                        <input
                          checked={selectedActionIds.includes(candidate.id)}
                          onChange={() => toggleSelectedAction(candidate.id)}
                          type="checkbox"
                        />
                        <span>
                          <strong>{candidate.intent}</strong> · {candidate.object_type} · {candidate.status}
                          {' '}· risque {candidate.risk_level}
                        </span>
                      </label>
                    ))}
                    {expiryPreview.candidate_count > 0 ? (
                      <button
                        disabled={applyingExpiry || selectedActionIds.length === 0}
                        onClick={() => void applySelectedExpiry()}
                        type="button"
                      >
                        {applyingExpiry ? 'Gel en cours…' : `Geler la sélection (${selectedActionIds.length})`}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {expiryStatus ? <p className="muted compact" aria-live="polite">{expiryStatus}</p> : null}
                {findingStatus ? <p className="muted compact">{findingStatus}</p> : null}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </article>
  );
}
