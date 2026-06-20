import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ReactElement} from 'react';

import type {
  ConversationGuide,
  Cohort,
  CorrectionBatch,
  CorrectionSheetDraft,
  CurrentContext,
  GuidedQuestion,
  GuidedSession,
  IdentityMatchReviewItem,
  InstitutionalGradingProfile,
  Job,
  Project,
  PreCorrectionManifest,
  Resource,
  RubricCriterion,
  RubricTemplate,
  RubricVersion,
  RosterVersion,
  SubmissionRecord,
  SubjectTemplate,
  SubjectAssignment,
  SubjectVersion,
  ValidationInboxItem,
} from '@masterflow/shared';

import {
  advanceGuidedSession,
  completeGuidedSession,
  createCohort,
  createCorrectionBatch,
  createInstitutionalGradingProfile,
  createPreCorrectionManifest,
  createRosterVersion,
  createRubricTemplate,
  createRubricVersion,
  createSubject,
  createSubjectAssignment,
  createSubjectVersion,
  createGuidedSession,
  getGuides,
  getCohorts,
  getCorrectionBatches,
  getGuidedSessions,
  getIdentityMatchReviews,
  getInstitutionalGradingProfiles,
  getCorrectionSubmissions,
  getPreCorrectionManifests,
  intakeCorrectionSubmission,
  getJobs,
  getRosterVersions,
  getRubricTemplates,
  getRubricVersions,
  getSubjects,
  getSubjectAssignments,
  getSubjectVersions,
  submitGuidedAnswer,
  decideIdentityMatchReview,
  validateInstitutionalGradingProfile,
  validatePreCorrectionManifest,
  validateRubricVersion,
  validateSubjectVersion,
  activateSubjectAssignment,
  getCorrectionSheets,
  syncCorrectionSheet,
  updateCorrectionSheet,
  validateCorrectionSheet,
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

function parseRubricCriteria(source: string): {criteria: RubricCriterion[]; total_points: number} {
  const rows = source.split('\n').map((line) => line.trim()).filter(Boolean).map((line, index) => {
    const [label = '', description = '', rawPoints = ''] = line.split('|').map((part) => part.trim());
    const max_points = Number(rawPoints.replace(',', '.'));
    if (!label || !description || !Number.isFinite(max_points) || max_points <= 0) {
      throw new Error('Chaque critère doit suivre « Nom | description | points ».');
    }
    return {criterion_id: `criterion-${index + 1}`, label, description, max_points};
  });
  if (rows.length === 0) throw new Error('Ajoute au moins un critère de barème.');
  const total_points = rows.reduce((total, row) => total + row.max_points, 0);
  return {
    total_points,
    criteria: rows.map((row) => ({
      ...row,
      weight: row.max_points / total_points,
      evidence_requirements: [],
      required: true,
    })),
  };
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
  const [rubricTemplates, setRubricTemplates] = useState<RubricTemplate[]>([]);
  const [selectedRubricTemplateId, setSelectedRubricTemplateId] = useState('');
  const [rubricVersions, setRubricVersions] = useState<RubricVersion[]>([]);
  const [gradingProfiles, setGradingProfiles] = useState<InstitutionalGradingProfile[]>([]);
  const [rubricTitle, setRubricTitle] = useState('');
  const [rubricSubjectRef, setRubricSubjectRef] = useState('');
  const [rubricCriteriaText, setRubricCriteriaText] = useState('Analyse | Qualité de l’analyse | 10\nPrésentation | Clarté du rendu | 10');
  const [profileScaleMin, setProfileScaleMin] = useState('0');
  const [profileScaleMax, setProfileScaleMax] = useState('20');
  const [profileExpectedMin, setProfileExpectedMin] = useState('10');
  const [profileExpectedMax, setProfileExpectedMax] = useState('15');
  const [profileDelta, setProfileDelta] = useState('1');
  const [correctionBatches, setCorrectionBatches] = useState<CorrectionBatch[]>([]);
  const [selectedRubricVersionId, setSelectedRubricVersionId] = useState('');
  const [selectedGradingProfileId, setSelectedGradingProfileId] = useState('');
  const [batchSubjectRef, setBatchSubjectRef] = useState('');
  const [batchSourceRefs, setBatchSourceRefs] = useState('');
  const [batchProcessProfileRef, setBatchProcessProfileRef] = useState('process://correction/manual-v1');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [submissionSourceRef, setSubmissionSourceRef] = useState('');
  const [submissionObservedLabel, setSubmissionObservedLabel] = useState('');
  const [batchSubmissions, setBatchSubmissions] = useState<SubmissionRecord[]>([]);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [preCorrectionManifests, setPreCorrectionManifests] = useState<PreCorrectionManifest[]>([]);
  const [subjects, setSubjects] = useState<SubjectTemplate[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [subjectVersions, setSubjectVersions] = useState<SubjectVersion[]>([]);
  const [subjectTitle, setSubjectTitle] = useState('');
  const [subjectSituation, setSubjectSituation] = useState('');
  const [subjectTension, setSubjectTension] = useState('');
  const [subjectMission, setSubjectMission] = useState('');
  const [subjectDecision, setSubjectDecision] = useState('');
  const [subjectDeliverables, setSubjectDeliverables] = useState('');
  const [subjectProofs, setSubjectProofs] = useState('');
  const [subjectProgression, setSubjectProgression] = useState('');
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentSubjectVersionId, setAssignmentSubjectVersionId] = useState('');
  const [correctionSheets, setCorrectionSheets] = useState<CorrectionSheetDraft[]>([]);
  const [sheetEvaluationMode, setSheetEvaluationMode] = useState('');
  const [sheetTeacherNotes, setSheetTeacherNotes] = useState('');
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
      const [nextJobs, nextGuides, nextSessions, nextIdentityReviews, nextCohorts, nextRubrics, nextProfiles, nextBatches, nextSubjects, nextAssignments] = await Promise.all([
        getJobs(token),
        getGuides(token),
        getGuidedSessions(token),
        getIdentityMatchReviews(project?.project_id, token),
        getCohorts(project?.project_id, token),
        getRubricTemplates(project?.project_id, token),
        getInstitutionalGradingProfiles(project?.project_id, token),
        getCorrectionBatches(project?.project_id, token),
        getSubjects(project?.project_id, token),
        getSubjectAssignments(project?.project_id, token),
      ]);
      setJobs(nextJobs);
      setGuides(nextGuides);
      setSessions(nextSessions);
      setIdentityReviews(nextIdentityReviews);
      setCohorts(nextCohorts);
      setRubricTemplates(nextRubrics);
      setGradingProfiles(nextProfiles);
      setCorrectionBatches(nextBatches);
      setSubjects(nextSubjects);
      setSubjectAssignments(nextAssignments);
      setCorrectionSheets((await Promise.all(nextAssignments.map((assignment) => getCorrectionSheets(assignment.assignment_id, token)))).flat());
      setSelectedCohortId((current) => current || nextCohorts[0]?.cohort_id || '');
      setSelectedRubricTemplateId((current) => current || nextRubrics[0]?.template_id || '');
      setSelectedGradingProfileId((current) => current || nextProfiles.find((profile) => profile.status === 'validated')?.profile_id || '');
      setSelectedBatchId((current) => current || nextBatches.find((batch) => batch.status === 'draft')?.batch_id || '');
      setSelectedSubjectId((current) => current || nextSubjects[0]?.template_id || '');
      setStatus('État synchronisé depuis les surfaces runtime existantes.');
    } catch (error) {
      setJobs([]);
      setGuides([]);
      setSessions([]);
      setIdentityReviews([]);
      setCohorts([]);
      setRubricTemplates([]);
      setGradingProfiles([]);
      setCorrectionBatches([]);
      setSubjects([]);
      setSubjectAssignments([]);
      setCorrectionSheets([]);
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

  useEffect(() => {
    if (!selectedRubricTemplateId) {
      setRubricVersions([]);
      return;
    }
    void getRubricVersions(selectedRubricTemplateId, token)
      .then((versions) => {
        setRubricVersions(versions);
        setSelectedRubricVersionId((current) => current || versions.find((version) => version.status === 'validated')?.version_id || '');
      })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Versions du barème indisponibles.'));
  }, [selectedRubricTemplateId, token]);

  useEffect(() => {
    if (!selectedBatchId) { setBatchSubmissions([]); setPreCorrectionManifests([]); return; }
    void Promise.all([getCorrectionSubmissions(selectedBatchId, token), getPreCorrectionManifests(selectedBatchId, token)])
      .then(([submissions, manifests]) => { setBatchSubmissions(submissions); setPreCorrectionManifests(manifests); })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Revue du lot indisponible.'));
  }, [selectedBatchId, token]);

  useEffect(() => {
    if (!selectedSubjectId) { setSubjectVersions([]); return; }
    void getSubjectVersions(selectedSubjectId, token).then((versions) => { setSubjectVersions(versions); setAssignmentSubjectVersionId((current) => current || versions.find((version) => version.status === 'validated')?.version_id || ''); })
      .catch((error: unknown) => setStatus(error instanceof Error ? error.message : 'Versions du sujet indisponibles.'));
  }, [selectedSubjectId, token]);

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

  const createInitialRubric = useCallback(async (): Promise<void> => {
    if (!rubricTitle.trim()) {
      setStatus('Donne un nom au barème.');
      return;
    }
    setMutating(true);
    try {
      const content = parseRubricCriteria(rubricCriteriaText);
      const created = await createRubricTemplate({
        project_id: project?.project_id ?? null,
        title: rubricTitle.trim(),
        subject_ref: rubricSubjectRef.trim() || null,
        ...content,
      }, token);
      setRubricTitle(''); setRubricSubjectRef('');
      await refresh(); setSelectedRubricTemplateId(created.template.template_id);
      setStatus('Barème V1 créé en brouillon. Relis-le puis valide explicitement sa version.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Création du barème impossible.'); }
    finally { setMutating(false); }
  }, [project?.project_id, refresh, rubricCriteriaText, rubricSubjectRef, rubricTitle, token]);

  const createNextRubricVersion = useCallback(async (): Promise<void> => {
    if (!selectedRubricTemplateId) {
      setStatus('Choisis le barème à faire évoluer.');
      return;
    }
    setMutating(true);
    try {
      const content = parseRubricCriteria(rubricCriteriaText);
      await createRubricVersion(selectedRubricTemplateId, content, token);
      setRubricVersions(await getRubricVersions(selectedRubricTemplateId, token));
      setStatus('Nouvelle version créée en brouillon. Les versions validées précédentes restent intactes.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Nouvelle version impossible.'); }
    finally { setMutating(false); }
  }, [rubricCriteriaText, selectedRubricTemplateId, token]);

  const validateRubric = useCallback(async (versionId: string): Promise<void> => {
    setMutating(true);
    try {
      await validateRubricVersion(versionId, token);
      if (selectedRubricTemplateId) setRubricVersions(await getRubricVersions(selectedRubricTemplateId, token));
      await refresh();
      setStatus('Version de barème validée. Elle ne peut plus être modifiée ; une évolution créera une nouvelle version.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Validation du barème impossible.'); }
    finally { setMutating(false); }
  }, [refresh, selectedRubricTemplateId, token]);

  const createGradingProfile = useCallback(async (): Promise<void> => {
    const scaleMin = Number(profileScaleMin);
    const scaleMax = Number(profileScaleMax);
    const expectedMin = Number(profileExpectedMin);
    const expectedMax = Number(profileExpectedMax);
    const delta = Number(profileDelta);
    if (![scaleMin, scaleMax, expectedMin, expectedMax, delta].every(Number.isFinite)) {
      setStatus('Renseigne des nombres valides pour le profil de notation.');
      return;
    }
    setMutating(true);
    try {
      await createInstitutionalGradingProfile({
        project_id: project?.project_id ?? null,
        scale: [scaleMin, scaleMax],
        expected_cohort_band: [expectedMin, expectedMax],
        anchors: {
          insufficient: [scaleMin, Math.max(scaleMin, expectedMin - 1)],
          minimum_met: [Math.max(scaleMin, expectedMin - 2), Math.max(scaleMin, expectedMin - 1)],
          expected: [expectedMin, expectedMax],
          strong: [Math.min(scaleMax, expectedMax + 1), Math.min(scaleMax, expectedMax + 2)],
          exceptional: [Math.min(scaleMax, expectedMax + 3), scaleMax],
        },
        max_global_delta: delta,
        protected_thresholds: [expectedMin, expectedMax],
      }, token);
      await refresh();
      setStatus('Profil de notation créé en brouillon. Il ne sera utilisable par la correction qu’après validation explicite.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Création du profil impossible.'); }
    finally { setMutating(false); }
  }, [profileDelta, profileExpectedMax, profileExpectedMin, profileScaleMax, profileScaleMin, project?.project_id, refresh, token]);

  const validateGradingProfile = useCallback(async (profileId: string): Promise<void> => {
    setMutating(true);
    try {
      await validateInstitutionalGradingProfile(profileId, token);
      await refresh();
      setStatus('Profil de notation validé. Il devient éligible à un futur lot de correction, sans lancer de correction.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Validation du profil impossible.'); }
    finally { setMutating(false); }
  }, [refresh, token]);

  const createContextualBatch = useCallback(async (): Promise<void> => {
    const activeRoster = rosterVersions.find((version) => version.status === 'active');
    const source_refs = batchSourceRefs.split('\n').map((value) => value.trim()).filter(Boolean);
    if (!selectedCohortId || !activeRoster || !selectedRubricVersionId || !selectedGradingProfileId || !batchSubjectRef.trim() || source_refs.length === 0 || !batchProcessProfileRef.trim()) {
      setStatus('Choisis cohorte, roster actif, barème/profil validés, sujet et au moins une source.');
      return;
    }
    setMutating(true);
    try {
      const created = await createCorrectionBatch({
        project_id: project?.project_id ?? null,
        rubric_version_id: selectedRubricVersionId,
        grading_profile_id: selectedGradingProfileId,
        cohort_id: selectedCohortId,
        roster_version_id: activeRoster.roster_version_id,
        subject_version_ref: batchSubjectRef.trim(),
        source_refs,
        process_context_profile_ref: batchProcessProfileRef.trim(),
      }, token);
      setBatchSubjectRef(''); setBatchSourceRefs('');
      await refresh();
      setStatus(`Lot ${created.batch.batch_id.slice(0, 8)} créé et contextualisé. Il reste vide : aucune correction n’est lancée.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Création du lot impossible.'); }
    finally { setMutating(false); }
  }, [batchProcessProfileRef, batchSourceRefs, batchSubjectRef, project?.project_id, refresh, rosterVersions, selectedCohortId, selectedGradingProfileId, selectedRubricVersionId, token]);

  const intakeSubmission = useCallback(async (): Promise<void> => {
    if (!selectedBatchId || !submissionSourceRef.trim()) {
      setStatus('Choisis un lot brouillon et renseigne la référence privée de la copie.');
      return;
    }
    setMutating(true);
    try {
      await intakeCorrectionSubmission(selectedBatchId, {
        source_ref: submissionSourceRef.trim(),
        observed_label: submissionObservedLabel.trim() || null,
      }, token);
      setSubmissionSourceRef(''); setSubmissionObservedLabel('');
      await refresh();
      setStatus('Copie ajoutée comme candidate privée. Son identité reste inconnue jusqu’à la revue professeur.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Intake de copie impossible.'); }
    finally { setMutating(false); }
  }, [refresh, selectedBatchId, submissionObservedLabel, submissionSourceRef, token]);

  const createReviewManifest = useCallback(async (): Promise<void> => {
    if (!selectedBatchId || selectedSubmissionIds.length === 0) { setStatus('Sélectionne au moins une copie à identité confirmée.'); return; }
    setMutating(true);
    try {
      await createPreCorrectionManifest(selectedBatchId, {submission_refs: selectedSubmissionIds, workflow_version: 'teacher-sample-review-v1'}, token);
      setSelectedSubmissionIds([]); setPreCorrectionManifests(await getPreCorrectionManifests(selectedBatchId, token));
      setStatus('Manifest brouillon créé. Aucun runner ne démarre avant validation professeur séparée.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Création du manifest impossible.'); }
    finally { setMutating(false); }
  }, [selectedBatchId, selectedSubmissionIds, token]);

  const validateReviewManifest = useCallback(async (manifestId: string): Promise<void> => {
    setMutating(true);
    try {
      await validatePreCorrectionManifest(manifestId, {validation_ref: `teacher://${context.user.id}/${Date.now()}`}, token);
      if (selectedBatchId) setPreCorrectionManifests(await getPreCorrectionManifests(selectedBatchId, token));
      setStatus('Manifest validé par le professeur. Aucun job ou runner n’a été lancé.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Validation du manifest impossible.'); }
    finally { setMutating(false); }
  }, [context.user.id, selectedBatchId, token]);

  const subjectManifest = useCallback(() => ({
    situation: subjectSituation.trim(), tension: subjectTension.trim(), mission: subjectMission.trim(),
    decision_to_make: subjectDecision.trim(),
    observable_deliverables: subjectDeliverables.split('\n').map((v) => v.trim()).filter(Boolean),
    proofs_of_understanding: subjectProofs.split('\n').map((v) => v.trim()).filter(Boolean),
    progression_levels: subjectProgression.split('\n').map((v) => v.trim()).filter(Boolean),
    resource_refs: [], correction_model_candidate_ref: null, deployment_state: 'private_draft' as const,
  }), [subjectDecision, subjectDeliverables, subjectMission, subjectProgression, subjectProofs, subjectSituation, subjectTension]);

  const createSubjectDraft = useCallback(async (): Promise<void> => {
    if (!subjectTitle.trim()) { setStatus('Donne un titre au sujet.'); return; }
    setMutating(true);
    try { const created = await createSubject({project_id: project?.project_id ?? null, title: subjectTitle.trim(), manifest: subjectManifest()}, token); await refresh(); setSelectedSubjectId(created.template.template_id); setStatus('Sujet V1 créé en brouillon privé.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Création du sujet impossible.'); }
    finally { setMutating(false); }
  }, [project?.project_id, refresh, subjectManifest, subjectTitle, token]);

  const createNextSubjectVersion = useCallback(async (): Promise<void> => {
    if (!selectedSubjectId) return;
    setMutating(true);
    try { await createSubjectVersion(selectedSubjectId, {manifest: subjectManifest()}, token); setSubjectVersions(await getSubjectVersions(selectedSubjectId, token)); setStatus('Nouvelle version privée créée sans modifier les précédentes.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Version du sujet impossible.'); }
    finally { setMutating(false); }
  }, [selectedSubjectId, subjectManifest, token]);

  const validateSubject = useCallback(async (versionId: string): Promise<void> => {
    setMutating(true); try { await validateSubjectVersion(versionId, token); if (selectedSubjectId) setSubjectVersions(await getSubjectVersions(selectedSubjectId, token)); await refresh(); setStatus('Version du sujet validée en privé ; aucune publication ou assignment.'); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Validation du sujet impossible.'); } finally { setMutating(false); }
  }, [refresh, selectedSubjectId, token]);

  const createAssignment = useCallback(async (): Promise<void> => {
    if (!selectedCohortId || !assignmentSubjectVersionId || !assignmentTitle.trim()) { setStatus('Choisis une cohorte, une version validée et un titre d’assignment.'); return; }
    setMutating(true); try { await createSubjectAssignment({project_id:project?.project_id??null,cohort_id:selectedCohortId,source_subject_version_id:assignmentSubjectVersionId,title:assignmentTitle.trim()},token);setAssignmentTitle('');await refresh();setStatus('Assignment et fiche de correction brouillon créés depuis le sujet.'); }
    catch(error){setStatus(error instanceof Error?error.message:'Assignment impossible.');}finally{setMutating(false);}
  },[assignmentSubjectVersionId,assignmentTitle,project?.project_id,refresh,selectedCohortId,token]);

  const activateAssignment = useCallback(async(id:string):Promise<void>=>{setMutating(true);try{await activateSubjectAssignment(id,token);await refresh();setStatus('Assignment activé pour la cohorte ; le sujet source reste inchangé.');}catch(error){setStatus(error instanceof Error?error.message:'Activation impossible.');}finally{setMutating(false);}},[refresh,token]);

  const saveSheetTeacherFields = useCallback(async(id:string):Promise<void>=>{setMutating(true);try{await updateCorrectionSheet(id,{teacher_fields:{evaluation_mode:sheetEvaluationMode,teacher_notes:sheetTeacherNotes},locked_teacher_fields:['evaluation_mode']},token);await refresh();setStatus('Champs professeur enregistrés ; le mode d’évaluation est verrouillé.');}catch(error){setStatus(error instanceof Error?error.message:'Mise à jour de la fiche impossible.');}finally{setMutating(false);}},[refresh,sheetEvaluationMode,sheetTeacherNotes,token]);
  const syncSheet = useCallback(async(id:string):Promise<void>=>{if(!assignmentSubjectVersionId)return;setMutating(true);try{await syncCorrectionSheet(id,assignmentSubjectVersionId,token);await refresh();setStatus('Nouvelle version synchronisée ; revue professeur obligatoire.');}catch(error){setStatus(error instanceof Error?error.message:'Synchronisation impossible.');}finally{setMutating(false);}},[assignmentSubjectVersionId,refresh,token]);
  const validateSheet = useCallback(async(id:string):Promise<void>=>{setMutating(true);try{await validateCorrectionSheet(id,`teacher://validation/${Date.now()}`,token);await refresh();setStatus('Fiche validée par le professeur ; aucune note ni publication créée.');}catch(error){setStatus(error instanceof Error?error.message:'Validation de la fiche impossible.');}finally{setMutating(false);}},[refresh,token]);

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
      detail: `${rubricTemplates.length} barème(s), ${gradingProfiles.length} profil(s) dans le périmètre. Aucun lot ni correction automatique n’est lancé.`,
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
    gradingProfiles.length,
    project,
    reviewJobs.length,
    rubricTemplates.length,
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

      <section className="roster-management" aria-label="Bibliothèque de sujets versionnés">
        <div className="identity-review__heading"><div><strong>Sujets privés versionnés</strong><span>{subjects.length} sujet(s)</span></div><small>Un sujet validé reste privé : validation ≠ publication ≠ assignment.</small></div>
        <div className="roster-management__grid">
          <div className="roster-management__form">
            <label>Titre<input value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)} /></label>
            <label>Situation<textarea rows={2} value={subjectSituation} onChange={(e) => setSubjectSituation(e.target.value)} /></label>
            <label>Tension<textarea rows={2} value={subjectTension} onChange={(e) => setSubjectTension(e.target.value)} /></label>
            <label>Mission<textarea rows={2} value={subjectMission} onChange={(e) => setSubjectMission(e.target.value)} /></label>
            <label>Décision à prendre<input value={subjectDecision} onChange={(e) => setSubjectDecision(e.target.value)} /></label>
            <label>Rendus — une ligne par rendu<textarea rows={3} value={subjectDeliverables} onChange={(e) => setSubjectDeliverables(e.target.value)} /></label>
            <label>Preuves — une ligne par preuve<textarea rows={3} value={subjectProofs} onChange={(e) => setSubjectProofs(e.target.value)} /></label>
            <label>Progression — un niveau par ligne<textarea rows={3} value={subjectProgression} onChange={(e) => setSubjectProgression(e.target.value)} /></label>
            <button disabled={mutating} onClick={() => void createSubjectDraft()} type="button">Créer le sujet V1 privé</button>
          </div>
          <div className="roster-management__form">
            <label>Sujet<select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}><option value="">Choisir</option>{subjects.map((subject) => <option key={subject.template_id} value={subject.template_id}>{subject.title} · {subject.status}</option>)}</select></label>
            <button className="secondary" disabled={mutating || !selectedSubjectId} onClick={() => void createNextSubjectVersion()} type="button">Créer la version suivante</button>
            {subjectVersions.map((version) => <div className="identity-review__card" key={version.version_id}><div><strong>Version {version.version}</strong><small>{version.status} · privé</small></div>{version.status === 'draft' ? <button disabled={mutating} onClick={() => void validateSubject(version.version_id)} type="button">Valider en privé</button> : <small>Validée, non publiée.</small>}</div>)}
            <strong>Assignment de cohorte</strong>
            <label>Version validée<select value={assignmentSubjectVersionId} onChange={(e) => setAssignmentSubjectVersionId(e.target.value)}><option value="">Choisir</option>{subjectVersions.filter((v) => v.status === 'validated').map((v) => <option key={v.version_id} value={v.version_id}>Version {v.version}</option>)}</select></label>
            <label>Titre de l’assignment<input value={assignmentTitle} onChange={(e) => setAssignmentTitle(e.target.value)} /></label>
            <button disabled={mutating || !selectedCohortId} onClick={() => void createAssignment()} type="button">Créer l’assignment brouillon</button>
            {subjectAssignments.map((assignment) => {
              const sheets = correctionSheets.filter((sheet) => sheet.assignment_id === assignment.assignment_id);
              const latestSheet = sheets[0];
              return <div className="identity-review__card" key={assignment.assignment_id}>
                <div><strong>{assignment.title}</strong><small>{assignment.status} · snapshot figé · {sheets.length} version(s) de fiche</small></div>
                {assignment.status === 'draft' ? <button disabled={mutating} onClick={() => void activateAssignment(assignment.assignment_id)} type="button">Activer pour la cohorte</button> : <small>Actif, source inchangée.</small>}
                {latestSheet ? <div className="roster-management__form">
                  <small>Fiche V{latestSheet.version} · {latestSheet.status} · {latestSheet.sync_status === 'needs_teacher_review' ? 'revue professeur requise' : 'synchronisée'} · aucune note</small>
                  <label>Mode d’évaluation — verrouillé professeur<input value={sheetEvaluationMode} onChange={(event) => setSheetEvaluationMode(event.target.value)} /></label>
                  <label>Notes professeur<textarea rows={2} value={sheetTeacherNotes} onChange={(event) => setSheetTeacherNotes(event.target.value)} /></label>
                  <button className="secondary" disabled={mutating} onClick={() => void saveSheetTeacherFields(latestSheet.correction_sheet_id)} type="button">Enregistrer les champs professeur</button>
                  <button className="secondary" disabled={mutating || !assignmentSubjectVersionId || latestSheet.source_subject_version_id === assignmentSubjectVersionId} onClick={() => void syncSheet(latestSheet.correction_sheet_id)} type="button">Synchroniser vers la version choisie</button>
                  {latestSheet.status === 'draft' ? <button disabled={mutating} onClick={() => void validateSheet(latestSheet.correction_sheet_id)} type="button">Valider la fiche</button> : <small>Validation professeur enregistrée.</small>}
                </div> : <small>Alerte : fiche brouillon absente.</small>}
              </div>;
            })}
          </div>
        </div>
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

      <section className="roster-management" aria-label="Barèmes et profils de notation">
        <div className="identity-review__heading">
          <div><strong>Barèmes et profils de notation</strong><span>{rubricTemplates.length} barème(s) · {gradingProfiles.length} profil(s)</span></div>
          <small>Création privée → relecture → validation professeur. Aucun score ni correction n’est produit ici.</small>
        </div>
        <div className="roster-management__grid">
          <div className="roster-management__form">
            <label>Nom du nouveau barème<input value={rubricTitle} onChange={(event) => setRubricTitle(event.target.value)} placeholder="Débrief oral · semestre 1" /></label>
            <label>Référence du sujet (optionnelle)<input value={rubricSubjectRef} onChange={(event) => setRubricSubjectRef(event.target.value)} placeholder="subject://debrief/v1" /></label>
            <label>Critères — une ligne : nom | description | points<textarea rows={5} value={rubricCriteriaText} onChange={(event) => setRubricCriteriaText(event.target.value)} /></label>
            <button disabled={mutating} onClick={() => void createInitialRubric()} type="button">Créer le barème V1 en brouillon</button>
          </div>
          <div className="roster-management__form">
            <label>Barème existant<select value={selectedRubricTemplateId} onChange={(event) => setSelectedRubricTemplateId(event.target.value)}><option value="">Choisir</option>{rubricTemplates.map((template) => <option key={template.template_id} value={template.template_id}>{template.title} · {template.status}</option>)}</select></label>
            <p className="muted compact">Pour faire évoluer un barème, adapte les critères à gauche puis crée une nouvelle version. Une version validée reste intacte.</p>
            <button className="secondary" disabled={mutating || !selectedRubricTemplateId} onClick={() => void createNextRubricVersion()} type="button">Créer une nouvelle version brouillon</button>
            {rubricVersions.length === 0 ? <p className="muted compact">Aucune version à afficher.</p> : rubricVersions.map((version) => (
              <div className="identity-review__card" key={version.version_id}>
                <div><strong>Version {version.version} · {version.total_points} points</strong><small>{version.status} · {version.criteria.length} critère(s)</small></div>
                {version.status !== 'validated' ? <button disabled={mutating} onClick={() => void validateRubric(version.version_id)} type="button">Valider cette version</button> : <small>Version verrouillée et éligible à la correction.</small>}
              </div>
            ))}
          </div>
        </div>
        <div className="roster-management__grid">
          <div className="roster-management__form">
            <strong>Profil de notation institutionnel</strong>
            <label>Échelle min / max<div><input aria-label="Échelle minimum" type="number" value={profileScaleMin} onChange={(event) => setProfileScaleMin(event.target.value)} /> <input aria-label="Échelle maximum" type="number" value={profileScaleMax} onChange={(event) => setProfileScaleMax(event.target.value)} /></div></label>
            <label>Bande attendue min / max<div><input aria-label="Bande attendue minimum" type="number" value={profileExpectedMin} onChange={(event) => setProfileExpectedMin(event.target.value)} /> <input aria-label="Bande attendue maximum" type="number" value={profileExpectedMax} onChange={(event) => setProfileExpectedMax(event.target.value)} /></div></label>
            <label>Écart global maximal<input type="number" min="0" step="0.5" value={profileDelta} onChange={(event) => setProfileDelta(event.target.value)} /></label>
            <button disabled={mutating} onClick={() => void createGradingProfile()} type="button">Créer le profil en brouillon</button>
          </div>
          <div className="roster-management__form">
            <strong>Historique des profils</strong>
            {gradingProfiles.length === 0 ? <p className="muted compact">Aucun profil dans le périmètre actif.</p> : gradingProfiles.map((profile) => (
              <div className="identity-review__card" key={profile.profile_id}>
                <div><strong>Profil V{profile.version} · {profile.scale[0]}–{profile.scale[1]}</strong><small>{profile.status} · bande attendue {profile.expected_cohort_band[0]}–{profile.expected_cohort_band[1]}</small></div>
                {profile.status !== 'validated' ? <button disabled={mutating} onClick={() => void validateGradingProfile(profile.profile_id)} type="button">Valider ce profil</button> : <small>Profil verrouillé et éligible à la correction.</small>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="roster-management" aria-label="Lot de correction contextualisé">
        <div className="identity-review__heading">
          <div><strong>Lot de correction contextualisé</strong><span>{correctionBatches.length} lot(s)</span></div>
          <small>Le lot fige le contexte ; il ne charge aucune copie et ne lance aucune correction.</small>
        </div>
        <div className="roster-management__grid">
          <div className="roster-management__form">
            <label>Version de barème validée<select value={selectedRubricVersionId} onChange={(event) => setSelectedRubricVersionId(event.target.value)}><option value="">Choisir</option>{rubricVersions.filter((version) => version.status === 'validated').map((version) => <option key={version.version_id} value={version.version_id}>V{version.version} · {version.total_points} points</option>)}</select></label>
            <label>Profil de notation validé<select value={selectedGradingProfileId} onChange={(event) => setSelectedGradingProfileId(event.target.value)}><option value="">Choisir</option>{gradingProfiles.filter((profile) => profile.status === 'validated').map((profile) => <option key={profile.profile_id} value={profile.profile_id}>Profil V{profile.version} · {profile.scale[0]}–{profile.scale[1]}</option>)}</select></label>
            <label>Sujet versionné<input value={batchSubjectRef} onChange={(event) => setBatchSubjectRef(event.target.value)} placeholder="subject://oral/v1" /></label>
            <label>Sources — une référence par ligne<textarea rows={3} value={batchSourceRefs} onChange={(event) => setBatchSourceRefs(event.target.value)} placeholder="transcript://debrief/2026-06-20" /></label>
            <label>Profil de processus<input value={batchProcessProfileRef} onChange={(event) => setBatchProcessProfileRef(event.target.value)} /></label>
            <button disabled={mutating || !selectedCohortId} onClick={() => void createContextualBatch()} type="button">Créer et figer le lot manuel</button>
          </div>
          <div className="roster-management__form">
            <strong>Lots du périmètre</strong>
            {correctionBatches.length === 0 ? <p className="muted compact">Aucun lot. Crée d’abord les références validées puis fige le contexte.</p> : correctionBatches.map((batch) => (
              <div className="identity-review__card" key={batch.batch_id}>
                <div><strong>Lot {batch.batch_id.slice(0, 8)} · {batch.status}</strong><small>{batch.submission_count} copie(s) · contexte figé</small></div>
                <small>Intake candidat à venir ; aucune correction automatique.</small>
              </div>
            ))}
            <label>Lot brouillon pour l’intake<select value={selectedBatchId} onChange={(event) => setSelectedBatchId(event.target.value)}><option value="">Choisir</option>{correctionBatches.filter((batch) => batch.status === 'draft').map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_id.slice(0, 8)} · {batch.submission_count} copie(s)</option>)}</select></label>
            <label>Référence privée de la copie<input value={submissionSourceRef} onChange={(event) => setSubmissionSourceRef(event.target.value)} placeholder="storage://private/submissions/alice.pdf" /></label>
            <label>Nom observé (optionnel, non confirmé)<input value={submissionObservedLabel} onChange={(event) => setSubmissionObservedLabel(event.target.value)} placeholder="Alice" /></label>
            <button disabled={mutating || !selectedBatchId} onClick={() => void intakeSubmission()} type="button">Ajouter la copie candidate</button>
            <strong>Échantillon professeur</strong>
            {batchSubmissions.map((submission) => (
              <label key={submission.submission_id}><input checked={selectedSubmissionIds.includes(submission.submission_id)} disabled={submission.identity_status !== 'confirmed'} onChange={(event) => setSelectedSubmissionIds((current) => event.target.checked ? [...current, submission.submission_id] : current.filter((id) => id !== submission.submission_id))} type="checkbox" /> {submission.student_ref ?? submission.submission_id.slice(0, 8)} · identité {submission.identity_status}</label>
            ))}
            <button className="secondary" disabled={mutating || selectedSubmissionIds.length === 0} onClick={() => void createReviewManifest()} type="button">Créer le manifest brouillon</button>
            {preCorrectionManifests.map((manifest) => <div className="identity-review__card" key={manifest.manifest_id}><div><strong>Manifest {manifest.manifest_id.slice(0, 8)}</strong><small>{manifest.status} · {manifest.submission_refs.length} copie(s)</small></div>{manifest.status === 'draft' ? <button disabled={mutating} onClick={() => void validateReviewManifest(manifest.manifest_id)} type="button">Valider l’échantillon</button> : <small>Validé, aucun runner lancé.</small>}</div>)}
          </div>
        </div>
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
        <span>Configuration D06 privée et versionnée · pas de lot · pas de correction · pas de note · pas de feedback · pas d’export · pas d’envoi étudiant.</span>
      </div>
    </article>
  );
}
