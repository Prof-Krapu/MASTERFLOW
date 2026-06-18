import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {Job, ValidationInboxItem} from '@masterflow/shared';

import {getJobs, getValidationInboxItems} from './api.ts';

type OwnerCockpitProps = {
  token: string;
};

type RuntimeSnapshot = {
  jobs: Job[];
  validationItems: ValidationInboxItem[];
};

function nextSafeAction(snapshot: RuntimeSnapshot): string {
  const criticalValidation = snapshot.validationItems.find((item) => item.risk_level === 'critical');
  if (criticalValidation) {
    return `Traiter la validation critique : ${criticalValidation.title}.`;
  }
  const highValidation = snapshot.validationItems.find((item) => item.risk_level === 'high');
  if (highValidation) {
    return `Relire la validation à risque élevé : ${highValidation.title}.`;
  }
  const failedJob = snapshot.jobs.find((job) => job.status === 'failed');
  if (failedJob) {
    return `Diagnostiquer le job échoué ${failedJob.type}. Aucun retry automatique.`;
  }
  const reviewJob = snapshot.jobs.find((job) => job.status === 'needs_review');
  if (reviewJob) {
    return `Revue humaine requise sur ${reviewJob.type}. Ne rien importer automatiquement.`;
  }
  if (snapshot.validationItems.length > 0) {
    return 'Traiter les validations ouvertes avant toute nouvelle action sensible.';
  }
  return 'Aucun blocage runtime visible. Prochaine étape sûre : poursuivre le mapping D05-D06 ou D12.';
}

function countJobs(jobs: Job[], statuses: Job['status'][]): number {
  return jobs.filter((job) => statuses.includes(job.status)).length;
}

export function OwnerCockpit({token}: OwnerCockpitProps): ReactElement {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot>({jobs: [], validationItems: []});
  const [status, setStatus] = useState('Chargement du cockpit owner.');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [jobs, validationItems] = await Promise.all([
        getJobs(token),
        getValidationInboxItems(token),
      ]);
      setSnapshot({jobs, validationItems});
      setStatus('Cockpit synchronisé depuis les surfaces runtime existantes.');
    } catch (error) {
      setSnapshot({jobs: [], validationItems: []});
      setStatus(error instanceof Error ? error.message : 'Cockpit owner indisponible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = useMemo(() => ({
    validations: snapshot.validationItems.length,
    highRiskValidations: snapshot.validationItems.filter((item) =>
      item.risk_level === 'high' || item.risk_level === 'critical'
    ).length,
    activeJobs: countJobs(snapshot.jobs, ['queued', 'running']),
    reviewJobs: countJobs(snapshot.jobs, ['needs_review']),
    failedJobs: countJobs(snapshot.jobs, ['failed']),
    nextAction: nextSafeAction(snapshot),
  }), [snapshot]);

  return (
    <article className="panel panel--wide owner-cockpit">
      <div className="panel-header">
        <div>
          <h2>Owner cockpit · prochain geste sûr</h2>
          <p className="muted compact">
            Lecture seule : validations, jobs, risques visibles et limites runtime.
          </p>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>

      <p className="owner-cockpit__next">{summary.nextAction}</p>
      <p className="owner-cockpit__status" aria-live="polite">{status}</p>

      <dl className="owner-cockpit__summary">
        <div><dt>Validations</dt><dd>{summary.validations}</dd></div>
        <div><dt>Risque haut</dt><dd>{summary.highRiskValidations}</dd></div>
        <div><dt>Jobs actifs</dt><dd>{summary.activeJobs}</dd></div>
        <div><dt>À revoir</dt><dd>{summary.reviewJobs}</dd></div>
        <div><dt>Échecs</dt><dd>{summary.failedJobs}</dd></div>
      </dl>

      <div className="owner-cockpit__limits">
        <strong>Limites visibles</strong>
        <ul>
          <li>D05-D06 vertical UI : mapping prêt, surface complète non implémentée.</li>
          <li>D12 findings/missed triggers : pas encore de runtime dédié.</li>
          <li>D08 génération : verrouillée tant que storage/provenance/review manquent.</li>
        </ul>
      </div>
    </article>
  );
}
