import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  ConversationGuide,
  Cohort,
  CurrentContext,
  GuidedQuestion,
  GuidedSession,
  IdentityMatchReviewItem,
  Job,
  Project,
  Resource,
  RosterVersion,
  ValidationInboxItem,
} from '@masterflow/shared';

import {
  advanceGuidedSession,
  completeGuidedSession,
  createCohort,
  createRosterVersion,
  createGuidedSession,
  getGuides,
  getCohorts,
  getGuidedSessions,
  getIdentityMatchReviews,
  getJobs,
  getRosterVersions,
  submitGuidedAnswer,
  decideIdentityMatchReview,
} from './api.ts';

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
  const [identityReviews, setIdentityReviews] = useState<IdentityMatchReviewItem[]>([]);
  const [identitySelections, setIdentitySelections] = useState<Record<string, string>>({});
  const [identityMutatingId, setIdentityMutatingId] = useState<string | null>(null);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [rosterVersions, setRosterVersions] = useState<RosterVersion[]>([]);
  const [cohortTitle, setCohortTitle] = useState('');
  const [cohortPeriod, setCohortPeriod] = useState('');
  const [rosterText, setRosterText] = useState('');
  const [status, setStatus] = useState('Chargement de l’état Teaching.');
  const [loading, setLoading] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [answerChoice, setAnswerChoice] = useState('');
  const [answerBoolean, setAnswerBoolean] = useState('');
  const [answerMulti, setAnswerMulti] = useState<string[]>([]);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [nextJobs, nextGuides, nextSessions, nextIdentityReviews, nextCohorts] = await Promise.all([
        getJobs(token),
        getGuides(token),
        getGuidedSessions(token),
        getIdentityMatchReviews(project?.project_id, token),
        getCohorts(project?.project_id, token),
      ]);
      setJobs(nextJobs);
      setGuides(nextGuides);
      setSessions(nextSessions);
      setIdentityReviews(nextIdentityReviews);
      setCohorts(nextCohorts);
      setSelectedCohortId((current) => current || nextCohorts[0]?.cohort_id || '');
      setStatus('État synchronisé depuis les surfaces runtime existantes.');
    } catch (error) {
      setJobs([]);
      setGuides([]);
      setSessions([]);
      setIdentityReviews([]);
      setCohorts([]);
      setStatus(error instanceof Error ? error.message : 'État des jobs indisponible.');
    } finally {
      setLoading(false);
    }
  }, [project?.project_id, token]);

  useEffect(() => {
    if (!selectedCohortId) {
      setRosterVersions([]);
      return;
    }
    void getRosterVersions(selectedCohortId, token)
      .then(setRosterVersions)
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Roster indisponible.'));
  }, [selectedCohortId, token]);

  const addCohort = useCallback(async (): Promise<void> => {
    if (!cohortTitle.trim()) return setStatus('Donne un nom à la cohorte.');
    setMutating(true);
    try {
      const created = await createCohort({
        project_id: project?.project_id ?? null,
        title: cohortTitle.trim(),
        period_ref: cohortPeriod.trim() || null,
      }, token);
      setCohortTitle(''); setCohortPeriod('');
      await refresh(); setSelectedCohortId(created.cohort_id);
      setStatus('Cohorte privée créée. Ajoute maintenant sa première version de roster.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Création impossible.'); }
    finally { setMutating(false); }
  }, [cohortPeriod, cohortTitle, project?.project_id, refresh, token]);

  const addRoster = useCallback(async (): Promise<void> => {
    const members = rosterText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [name = '', aliases = ''] = line.split('|');
      return {display_name: name.trim(), aliases: aliases.split(',').map((value) => value.trim()).filter(Boolean)};
    }).filter((member) => member.display_name.length > 0);
    if (!selectedCohortId || members.length === 0) return setStatus('Choisis une cohorte et saisis au moins un élève.');
    setMutating(true);
    try {
      const created = await createRosterVersion(selectedCohortId, {
        source_ref: `manual://teaching/${Date.now()}`,
        members,
      }, token);
      setRosterText(''); setRosterVersions(await getRosterVersions(selectedCohortId, token));
      setStatus(`Roster V${created.version} activé. La version précédente reste archivée.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Roster impossible.'); }
    finally { setMutating(false); }
  }, [rosterText, selectedCohortId, token]);

  const decideIdentity = useCallback(async (
    review: IdentityMatchReviewItem,
    decision: 'confirm' | 'reject',
  ): Promise<void> => {
    const selectedIdentityId = identitySelections[review.candidate.candidate_id];
    if (decision === 'confirm' && !selectedIdentityId) {
      setStatus('Choisis un étudiant avant de confirmer le rapprochement.');
      return;
    }
    setIdentityMutatingId(review.candidate.candidate_id);
    try {
      await decideIdentityMatchReview(review.candidate.candidate_id, {
        decision,
        selected_identity_id: decision === 'confirm' ? selectedIdentityId : null,
      }, token);
      await refresh();
      setStatus(decision === 'confirm'
        ? 'Identité confirmée par le professeur et liée à la submission.'
        : 'Rapprochement rejeté. Aucune identité n’a été liée.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Décision identité impossible.');
    } finally {
      setIdentityMutatingId(null);
    }
  }, [identitySelections, refresh, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const reviewJobs = jobs.filter((job) => job.status === 'needs_review');
  const failedJobs = jobs.filter((job) => job.status === 'failed');
  const effectiveResources = project ? projectResources : resources;
  const scopedSessions = sessions.filter((session) =>
    (session.status === 'active' || session.status === 'completed') && (project
      ? session.project_id === project.project_id
      : session.room_id === context.room.id || (session.room_id === null && session.project_id === null))
  );
  const activeSession = mostRelevantSession(scopedSessions);
  const scopedGuides = guides.filter((guide) => project
    ? guide.project_id === project.project_id
    : guide.project_id === null
  );
  const activeGuide = activeSession
    ? guides.find((guide) => guide.guide_id === activeSession.guide_id) ?? null
    : scopedGuides[0] ?? null;
  const startableGuides = scopedGuides.filter((guide) => guide.status === 'validated');
  const currentQuestion = activeSession?.current_question_id && activeGuide
    ? activeGuide.question_flow.find((question) => question.question_id === activeSession.current_question_id) ?? null
    : null;

  useEffect(() => {
    setAnswerText('');
    setAnswerChoice('');
    setAnswerBoolean('');
    setAnswerMulti([]);
  }, [currentQuestion?.question_id]);

  const startSession = useCallback(async (guide: ConversationGuide): Promise<void> => {
    const needsConsent = guide.consent_policy['required'] === true;
    if (needsConsent && !consentAccepted) {
      setStatus('Confirme le consentement avant de démarrer cette session privée.');
      return;
    }
    setMutating(true);
    try {
      await createGuidedSession({
        guide_id: guide.guide_id,
        room_id: context.room.id,
        preview: false,
        consent: needsConsent ? {accepted: true} : {},
      }, token);
      await refresh();
      setConsentAccepted(false);
      setStatus('Session privée démarrée depuis un guide validé. Aucun autre processus n’a été lancé.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Création de session impossible.');
    } finally {
      setMutating(false);
    }
  }, [consentAccepted, context.room.id, refresh, token]);

  function answerValue(question: GuidedQuestion): unknown | null {
    if (question.kind === 'text') return answerText.trim() || null;
    if (question.kind === 'number') {
      const value = Number(answerText);
      return answerText.trim() !== '' && Number.isFinite(value) ? value : null;
    }
    if (question.kind === 'boolean') {
      if (answerBoolean === '') return null;
      return answerBoolean === 'true';
    }
    if (question.kind === 'choice') return answerChoice || null;
    return answerMulti.length > 0 ? answerMulti : null;
  }

  const submitCurrentAnswer = useCallback(async (): Promise<void> => {
    if (!activeSession || !currentQuestion) return;
    const value = answerValue(currentQuestion);
    if (value === null) {
      setStatus('Renseigne une réponse valide avant de continuer.');
      return;
    }
    setMutating(true);
    try {
      await submitGuidedAnswer(activeSession.session_id, {
        question_id: currentQuestion.question_id,
        value,
      }, token);
      await advanceGuidedSession(activeSession.session_id, token);
      await refresh();
      setStatus('Réponse enregistrée et progression recalculée dans cette session uniquement.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Réponse impossible à enregistrer.');
    } finally {
      setMutating(false);
    }
  }, [
    activeSession,
    answerBoolean,
    answerChoice,
    answerMulti,
    answerText,
    currentQuestion,
    refresh,
    token,
  ]);

  const finishSession = useCallback(async (): Promise<void> => {
    if (!activeSession) return;
    setMutating(true);
    try {
      await completeGuidedSession(activeSession.session_id, token);
      await refresh();
      setStatus('Sujet guidé terminé. Aucun feedback, export ou envoi n’a été déclenché.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Session encore incomplète.');
    } finally {
      setMutating(false);
    }
  }, [activeSession, refresh, token]);

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
      detail: 'Fondations backend présentes ; aucune action D06 n’est ouverte dans cette tranche D05.',
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
          <p className="muted compact">Pilotage D05 : état, session privée et questions structurées.</p>
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

      <section className="identity-review" aria-label="Identités étudiantes à confirmer">
        <div className="identity-review__heading">
          <div>
            <strong>Identités à confirmer</strong>
            <span>{identityReviews.length} en attente</span>
          </div>
          <small>Aucun rapprochement n’est appliqué automatiquement.</small>
        </div>
        {identityReviews.length === 0 ? (
          <p className="muted compact">Aucune ambiguïté d’identité dans le périmètre Teaching actif.</p>
        ) : (
          <div className="identity-review__list">
            {identityReviews.map((review) => (
              <article className="identity-review__card" key={review.candidate.candidate_id}>
                <div>
                  <strong>Libellé observé : {review.candidate.observed_label}</strong>
                  <small>Submission {review.candidate.submission_id}</small>
                </div>
                <label>
                  <span>Étudiant du roster</span>
                  <select
                    onChange={(event) => setIdentitySelections((current) => ({
                      ...current,
                      [review.candidate.candidate_id]: event.target.value,
                    }))}
                    value={identitySelections[review.candidate.candidate_id] ?? ''}
                  >
                    <option value="">Choisir après vérification</option>
                    {review.options.map((option) => (
                      <option key={option.student_identity_id} value={option.student_identity_id}>
                        {option.display_name}{option.aliases.length > 0 ? ` · ${option.aliases.join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="identity-review__actions">
                  <button
                    disabled={identityMutatingId !== null}
                    onClick={() => void decideIdentity(review, 'confirm')}
                    type="button"
                  >
                    Confirmer l’identité
                  </button>
                  <button
                    className="secondary"
                    disabled={identityMutatingId !== null}
                    onClick={() => void decideIdentity(review, 'reject')}
                    type="button"
                  >
                    Rejeter le rapprochement
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="roster-management" aria-label="Cohortes et listes d’étudiants">
        <div className="identity-review__heading">
          <div><strong>Cohortes et listes d’étudiants</strong><span>{cohorts.length} cohorte(s)</span></div>
          <small>Chaque nouveau roster crée une version ; l’ancienne reste archivée.</small>
        </div>
        <div className="roster-management__grid">
          <div className="roster-management__form">
            <label>Nom de la cohorte<input value={cohortTitle} onChange={(event) => setCohortTitle(event.target.value)} placeholder="4CREA A" /></label>
            <label>Période<input value={cohortPeriod} onChange={(event) => setCohortPeriod(event.target.value)} placeholder="2025-2026" /></label>
            <button disabled={mutating} onClick={() => void addCohort()} type="button">Créer la cohorte privée</button>
          </div>
          <div className="roster-management__form">
            <label>Cohorte<select value={selectedCohortId} onChange={(event) => setSelectedCohortId(event.target.value)}><option value="">Choisir</option>{cohorts.map((cohort) => <option key={cohort.cohort_id} value={cohort.cohort_id}>{cohort.title}{cohort.period_ref ? ` · ${cohort.period_ref}` : ''}</option>)}</select></label>
            <label>Élèves — une ligne par élève<textarea rows={6} value={rosterText} onChange={(event) => setRosterText(event.target.value)} placeholder={'Alice Martin | Alice, A. Martin\nBob Durand'} /></label>
            <button disabled={mutating || !selectedCohortId} onClick={() => void addRoster()} type="button">Créer une nouvelle version du roster</button>
          </div>
        </div>
        {selectedCohortId ? <p className="muted compact">Historique : {rosterVersions.length === 0 ? 'aucun roster' : rosterVersions.map((version) => `V${version.version} ${version.status} · ${version.members.length} élèves`).join(' — ')}</p> : null}
      </section>

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
                  : activeSession?.status === 'active' && activeSession.progress.missing_fields.length === 0
                    ? 'Toutes les réponses requises sont présentes. La session peut être terminée.'
                    : 'Aucune session active. Un guide validé peut démarrer une session privée.'}
            </p>
            {activeSession?.status !== 'active' && startableGuides.length > 0 ? (
              <div className="teaching-guided__start">
                <label className="teaching-guided__consent">
                  <input
                    checked={consentAccepted}
                    onChange={(event) => setConsentAccepted(event.target.checked)}
                    type="checkbox"
                  />
                  J’accepte d’ouvrir une session privée et tracée dans ce périmètre.
                </label>
                <div>
                  {startableGuides.map((guide) => (
                    <button
                      className="secondary"
                      disabled={mutating || (guide.consent_policy['required'] === true && !consentAccepted)}
                      key={guide.guide_id}
                      onClick={() => void startSession(guide)}
                      type="button"
                    >
                      Démarrer · {guide.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {activeSession?.status === 'active' && currentQuestion ? (
              <div className="teaching-guided__answer">
                <label>
                  <span>{currentQuestion.prompt}</span>
                  {currentQuestion.kind === 'text' || currentQuestion.kind === 'number' ? (
                    <input
                      onChange={(event) => setAnswerText(event.target.value)}
                      type={currentQuestion.kind === 'number' ? 'number' : 'text'}
                      value={answerText}
                    />
                  ) : null}
                  {currentQuestion.kind === 'choice' ? (
                    <select onChange={(event) => setAnswerChoice(event.target.value)} value={answerChoice}>
                      <option value="">Choisir une réponse</option>
                      {currentQuestion.options?.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : null}
                  {currentQuestion.kind === 'boolean' ? (
                    <select onChange={(event) => setAnswerBoolean(event.target.value)} value={answerBoolean}>
                      <option value="">Choisir</option>
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </select>
                  ) : null}
                </label>
                {currentQuestion.kind === 'multi_choice' ? (
                  <fieldset>
                    <legend>{currentQuestion.prompt}</legend>
                    {currentQuestion.options?.map((option) => (
                      <label key={option}>
                        <input
                          checked={answerMulti.includes(option)}
                          onChange={(event) => setAnswerMulti((current) => event.target.checked
                            ? [...current, option]
                            : current.filter((value) => value !== option))}
                          type="checkbox"
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                <button disabled={mutating} onClick={() => void submitCurrentAnswer()} type="button">
                  {mutating ? 'Enregistrement…' : 'Enregistrer et continuer'}
                </button>
              </div>
            ) : null}
            {activeSession?.status === 'active' && activeSession.progress.missing_fields.length === 0 ? (
              <button disabled={mutating} onClick={() => void finishSession()} type="button">
                Terminer le sujet guidé
              </button>
            ) : null}
          </div>
        ) : (
          <p className="muted compact">
            Aucun sujet guidé lisible. MasterFlow n’invente pas de sujet et ne démarre aucune session automatiquement.
          </p>
        )}
      </section>

      <div className="teaching-readiness__limits">
        <strong>Verrous maintenus</strong>
        <span>Session D05 privée uniquement · pas de correction · pas de note · pas de feedback · pas d’export · pas d’envoi étudiant.</span>
      </div>
    </article>
  );
}
