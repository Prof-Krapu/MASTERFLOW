import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  ConversationGuide,
  CurrentContext,
  GuidedSession,
  Job,
  Project,
  Resource,
  ValidationInboxItem,
} from '@masterflow/shared';

import {getGuides, getGuidedSessions, getJobs} from './api.ts';

type TeachingReadinessProps = {
  context: CurrentContext;
  project: Project | null;
  projectResources: Resource[];
  resources: Resource[];
  token: string;
  validationItems: ValidationInboxItem[];
};

type ReadinessLevel = 'ready' | 'partial' | 'blocked';

type ReadinessItem = {
  id: string;
  label: string;
  detail: string;
  level: ReadinessLevel;
};

const LEVEL_LABEL: Record<ReadinessLevel, string> = {
  ready: 'Prêt',
  partial: 'Partiel',
  blocked: 'Bloqué',
};

function mostRelevantSession(sessions: GuidedSession[]): GuidedSession | null {
  return [...sessions].sort((left, right) => {
    const leftActive = left.status === 'active' ? 1 : 0;
    const rightActive = right.status === 'active' ? 1 : 0;
    return rightActive - leftActive || right.updated_at - left.updated_at;
  })[0] ?? null;
}

function nextSafeAction(
  resources: Resource[],
  validationItems: ValidationInboxItem[],
  jobs: Job[],
): string {
  const riskyValidation = validationItems.find((item) =>
    item.risk_level === 'critical' || item.risk_level === 'high'
  );
  if (riskyValidation) return `Relire d’abord : ${riskyValidation.title}.`;

  const reviewJob = jobs.find((job) => job.status === 'needs_review');
  if (reviewJob) return `Faire la revue humaine du job ${reviewJob.type}.`;

  if (resources.length === 0) {
    return 'Ajouter puis valider une source avant de préparer un travail pédagogique.';
  }

  return 'Le contexte est exploitable en lecture. Préparer le sujet guidé sans lancer de correction automatique.';
}

export function TeachingReadiness({
  context,
  project,
  projectResources,
  resources,
  token,
  validationItems,
}: TeachingReadinessProps): ReactElement {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [guides, setGuides] = useState<ConversationGuide[]>([]);
  const [sessions, setSessions] = useState<GuidedSession[]>([]);
  const [status, setStatus] = useState('Chargement de l’état Teaching.');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [nextJobs, nextGuides, nextSessions] = await Promise.all([
        getJobs(token),
        getGuides(token),
        getGuidedSessions(token),
      ]);
      setJobs(nextJobs);
      setGuides(nextGuides);
      setSessions(nextSessions);
      setStatus('État synchronisé depuis les surfaces runtime existantes.');
    } catch (error) {
      setJobs([]);
      setGuides([]);
      setSessions([]);
      setStatus(error instanceof Error ? error.message : 'État des jobs indisponible.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reviewJobs = jobs.filter((job) => job.status === 'needs_review');
  const failedJobs = jobs.filter((job) => job.status === 'failed');
  const effectiveResources = project ? projectResources : resources;
  const scopedSessions = sessions.filter((session) => project
    ? session.project_id === project.project_id
    : session.room_id === context.room.id || (session.room_id === null && session.project_id === null)
  );
  const activeSession = mostRelevantSession(scopedSessions);
  const scopedGuides = guides.filter((guide) => project
    ? guide.project_id === project.project_id
    : guide.project_id === null
  );
  const activeGuide = activeSession
    ? guides.find((guide) => guide.guide_id === activeSession.guide_id) ?? null
    : scopedGuides[0] ?? null;
  const currentQuestion = activeSession?.current_question_id && activeGuide
    ? activeGuide.question_flow.find((question) => question.question_id === activeSession.current_question_id) ?? null
    : null;

  const items = useMemo<ReadinessItem[]>(() => [
    {
      id: 'room',
      label: 'Room active',
      detail: `${context.room.name} · contexte ${context.runtime_context.trace.granted_tier}`,
      level: 'ready',
    },
    {
      id: 'project',
      label: 'Périmètre projet',
      detail: project ? project.name : 'Aucun projet sélectionné ; travail limité à la Room.',
      level: project ? 'ready' : 'partial',
    },
    {
      id: 'sources',
      label: 'Sources validées',
      detail: effectiveResources.length > 0
        ? `${effectiveResources.length} source(s) disponible(s) dans le périmètre.`
        : 'Aucune source validée dans le périmètre actif.',
      level: effectiveResources.length > 0 ? 'ready' : 'blocked',
    },
    {
      id: 'guided-runtime',
      label: 'Sujet guidé',
      detail: activeSession
        ? `${activeGuide?.name ?? 'Session guidée'} · ${Math.round(activeSession.progress.completion_ratio * 100)} % complété.`
        : activeGuide
          ? `${activeGuide.name} disponible, sans session dans le périmètre actif.`
          : 'Aucun guide ou session lisible dans le périmètre actif.',
      level: activeSession?.status === 'active' ? 'ready' : activeGuide ? 'partial' : 'blocked',
    },
    {
      id: 'correction',
      label: 'Correction et feedback',
      detail: 'Fondations backend présentes ; routes et surface Teaching dédiées absentes.',
      level: 'partial',
    },
    {
      id: 'review',
      label: 'Revues humaines',
      detail: `${validationItems.length} validation(s), ${reviewJobs.length} job(s) à revoir, ${failedJobs.length} échec(s).`,
      level: failedJobs.length > 0
        ? 'blocked'
        : validationItems.length > 0 || reviewJobs.length > 0 ? 'partial' : 'ready',
    },
  ], [
    activeGuide,
    activeSession,
    context,
    effectiveResources.length,
    failedJobs.length,
    project,
    reviewJobs.length,
    validationItems.length,
  ]);

  const action = nextSafeAction(effectiveResources, validationItems, jobs);

  return (
    <article className="panel panel--wide teaching-readiness">
      <div className="panel-header">
        <div>
          <h2>Teaching · état de préparation</h2>
          <p className="muted compact">Lecture seule : ce qui est prêt, partiel ou réellement bloqué.</p>
        </div>
        <button className="secondary" disabled={loading} onClick={() => void refresh()} type="button">
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>

      <p className="teaching-readiness__next"><strong>Prochain geste sûr :</strong> {action}</p>
      <p className="teaching-readiness__status" aria-live="polite">{status}</p>

      <div className="teaching-readiness__grid">
        {items.map((item) => (
          <section className={`teaching-readiness__item teaching-readiness__item--${item.level}`} key={item.id}>
            <div>
              <strong>{item.label}</strong>
              <span>{LEVEL_LABEL[item.level]}</span>
            </div>
            <p>{item.detail}</p>
          </section>
        ))}
      </div>

      <section className="teaching-guided" aria-label="Sujet et session guidée">
        <div className="teaching-guided__heading">
          <div>
            <strong>Sujet guidé actif</strong>
            <span>{activeSession?.status ?? activeGuide?.status ?? 'aucun'}</span>
          </div>
          {activeSession ? <small>Progression {Math.round(activeSession.progress.completion_ratio * 100)} %</small> : null}
        </div>
        {activeGuide ? (
          <div className="teaching-guided__body">
            <div>
              <h3>{activeGuide.name}</h3>
              <p>{activeGuide.purpose}</p>
            </div>
            {activeSession ? (
              <dl>
                <div><dt>Version</dt><dd>{activeSession.guide_version}</dd></div>
                <div><dt>Champs faits</dt><dd>{activeSession.progress.completed_fields.length}</dd></div>
                <div><dt>Champs manquants</dt><dd>{activeSession.progress.missing_fields.length}</dd></div>
                <div><dt>Contradictions</dt><dd>{activeSession.progress.contradictions.length}</dd></div>
              </dl>
            ) : null}
            <p className="teaching-guided__next-question">
              {currentQuestion
                ? `Question en cours : ${currentQuestion.prompt}`
                : activeSession?.status === 'completed'
                  ? 'Session terminée. Aucune réponse ou relance disponible dans cette tranche.'
                  : 'Aucune session active. La création reste volontairement hors de cette tranche.'}
            </p>
          </div>
        ) : (
          <p className="muted compact">
            Aucun sujet guidé lisible. MasterFlow n’invente pas de sujet et ne démarre aucune session automatiquement.
          </p>
        )}
      </section>

      <div className="teaching-readiness__limits">
        <strong>Verrous maintenus</strong>
        <span>Pas de correction automatique · pas de note finale · pas d’envoi étudiant · pas de promesse d’upload.</span>
      </div>
    </article>
  );
}
