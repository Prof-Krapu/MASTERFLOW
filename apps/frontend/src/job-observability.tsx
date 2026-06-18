import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {Job, JobStatus} from '@masterflow/shared';

import {getJobs} from './api.ts';

type JobObservabilityProps = {
  token: string;
};

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'En file',
  running: 'En cours',
  needs_review: 'Revue requise',
  completed: 'Terminé',
  failed: 'Échec',
  cancelled: 'Annulé',
  expired: 'Expiré',
};

function candidateCount(job: Job): number | null {
  const value = job.result?.candidate_count;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function nextAction(job: Job): string {
  if (job.status === 'needs_review') {
    return job.type === 'ocr_prepare'
      ? 'Revue humaine requise. Aucun import Inventory automatique : le routage métier reste à confirmer.'
      : 'Revue humaine requise avant toute suite.';
  }
  if (job.status === 'failed') return 'Diagnostiquer l’échec. Aucun retry automatique.';
  if (job.status === 'queued' || job.status === 'running') return 'Attendre le runner ou vérifier sa disponibilité.';
  if (job.status === 'completed') return 'Aucune action requise.';
  return 'Job fermé. Relancer uniquement par un nouveau flux autorisé.';
}

export function JobObservability({token}: JobObservabilityProps): ReactElement {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState('Chargement des jobs.');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const next = await getJobs(token);
      setJobs(next);
      setStatus(next.length > 0 ? `${next.length} job(s) lisible(s).` : 'Aucun job visible.');
    } catch (error) {
      setJobs([]);
      setStatus(error instanceof Error ? error.message : 'Jobs indisponibles.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const counts = useMemo(() => ({
    active: jobs.filter((job) => job.status === 'queued' || job.status === 'running').length,
    review: jobs.filter((job) => job.status === 'needs_review').length,
    failed: jobs.filter((job) => job.status === 'failed').length,
  }), [jobs]);

  const latest = useMemo(
    () => [...jobs].sort((a, b) => b.updated_at - a.updated_at).slice(0, 8),
    [jobs],
  );

  return (
    <article className="panel panel--wide job-observability">
      <div className="panel-header">
        <div>
          <h2>Runtime · jobs et revues</h2>
          <p className="muted compact">Lecture seule : état réel, blocage humain et prochain geste sûr.</p>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>

      <div className="job-observability__status" aria-live="polite">{status}</div>
      <dl className="job-observability__summary">
        <div><dt>Actifs</dt><dd>{counts.active}</dd></div>
        <div><dt>À revoir</dt><dd>{counts.review}</dd></div>
        <div><dt>Échecs</dt><dd>{counts.failed}</dd></div>
      </dl>

      <div className="job-observability__list">
        {latest.length > 0 ? latest.map((job) => {
          const candidates = candidateCount(job);
          return (
            <section className={`job-observability__item job-observability__item--${job.status}`} key={job.job_id}>
              <div>
                <strong>{job.type}</strong>
                <span>{STATUS_LABELS[job.status]}</span>
              </div>
              <dl>
                <div><dt>Scope</dt><dd>{job.scope_type}</dd></div>
                <div><dt>Progression</dt><dd>{job.progress}%</dd></div>
                <div><dt>Candidats</dt><dd>{candidates ?? '—'}</dd></div>
              </dl>
              <p>{nextAction(job)}</p>
              <small>Mis à jour le {new Date(job.updated_at).toLocaleString('fr-FR')}</small>
            </section>
          );
        }) : <p className="muted compact">La file est vide.</p>}
      </div>
    </article>
  );
}
