import {useCallback, useEffect, useState} from 'react';
import type {ReactElement} from 'react';

import type {OwnerCockpitStatus} from '@masterflow/shared';

import {getOwnerCockpitStatus} from './api.ts';

type OwnerCockpitProps = {
  token: string;
};

const CAPABILITY_LABELS: Record<string, string> = {
  shared_validation_inbox: 'Validation Inbox',
  d05_guided_runtime: 'D05 sujet guidé',
  d12_owner_cockpit: 'D12 cockpit owner',
  process_activation: 'Activation des processus',
  d08_generation: 'D08 génération',
};

export function OwnerCockpit({token}: OwnerCockpitProps): ReactElement {
  const [snapshot, setSnapshot] = useState<OwnerCockpitStatus | null>(null);
  const [status, setStatus] = useState('Chargement du cockpit owner.');
  const [loading, setLoading] = useState(false);

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
        </>
      ) : null}
    </article>
  );
}
