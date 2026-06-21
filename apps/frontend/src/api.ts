import type {
  Action,
  ActionContextComparison,
  ActionRegistryEntry,
  AdminUser,
  AuthResponse,
  CreateAction,
  CreateInventoryCollectionRequest,
  CreateInventoryItemRequest,
  CreateInventoryProjectNeedRequest,
  CreatePreCorrectionManifestRequest,
  CreateD12MissedTriggerFinding,
  CreateInvitation,
  ConversationGuide,
  Cohort,
  CreateCohort,
  CreateCorrectionBatchRequest,
  CreateInstitutionalGradingProfileRequest,
  CreateRosterVersion,
  CreateRubricTemplateRequest,
  CreateRubricVersionRequest,
  CreateSubmissionIntakeRequest,
  CreateSubjectTemplateRequest,
  CreateSubjectAssignmentRequest,
  CorrectionSheetDraft,
  UpdateCorrectionSheetDraftRequest,
  CreateSubjectVersionRequest,
  CreateGuidedSessionRequest,
  CorrectionBatch,
  CorrectionContextSnapshot,
  CurrentContext,
  DecideValidationInboxItemRequest,
  D12MissedTriggerFinding,
  ExpireActionsResponse,
  InventoryCollection,
  InventoryItem,
  InventoryNeedMatchResult,
  InventoryProjectNeed,
  InventorySearchResult,
  InstitutionalGradingProfile,
  IdentityMatchCandidate,
  IdentityMatchReviewItem,
  Invitation,
  GuidedSession,
  HardStopControlState,
  GuidedContribution,
  Job,
  MatchInventoryProjectNeedRequest,
  OwnerCockpitStatus,
  ProcessActivationReadModel,
  ProcessActivationRequest,
  PreviewActionsExpiryResponse,
  PreCorrectionManifest,
  Persona,
  Project,
  ProjectMember,
  ProposeResource,
  RagQueryRequest,
  RagQueryResponse,
  RagResource,
  Resource,
  ResourceScope,
  RubricTemplate,
  RubricVersion,
  RosterVersion,
  RoomCheckpoint,
  RoomInstance,
  SetCollectionCompletionRequest,
  SubmissionRecord,
  SubjectTemplate,
  SubjectAssignment,
  SubjectVersion,
  ValidatePreCorrectionManifestRequest,
  TaskModelProfile,
  SearchResourcesResponse,
  TokenUsageGroupBy,
  TokenUsageReport,
  SubmitGuidedAnswerRequest,
  UpdateRoomInstance,
  ValidationInboxItem,
  ValidationDecision,
  VisualManifest,
  VisualReference,
  CreateVisualManifestRequest,
  CreateVisualReferenceRequest,
  UpdateVisualReferenceRequest,
  StoryWorkbench,
  StoryPatchCandidate,
  StoryReaderState,
  CreateStoryWorkbenchRequest,
  CreateStoryPatchCandidateRequest,
  SetStoryReaderStateRequest,
  PrivateQuoteDraft,
  CreatePrivateQuoteDraftRequest,
} from '@masterflow/shared';

const API_BASE = '/api/v1';

let authToken: string | null = null;

export function setToken(token: string | null): void {
  authToken = token;
}

function headers(token?: string | null): Record<string, string> {
  const effectiveToken = token ?? authToken;
  const value: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (effectiveToken) {
    value.Authorization = `Bearer ${effectiveToken}`;
  }
  return value;
}

async function errorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (!raw) return `${response.status} ${response.statusText}`;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const candidate = parsed.message ?? parsed.error ?? parsed.detail;
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  } catch {
    return raw;
  }

  return raw;
}

async function request<T>(path: string, init: RequestInit, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers(token),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response));
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const auth = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({username, password}),
  });
  setToken(auth.token);
  return auth;
}

export async function getCurrentContext(token?: string | null): Promise<CurrentContext> {
  return request<CurrentContext>('/context/current', {method: 'GET'}, token);
}

export async function getPersonas(token?: string | null): Promise<Persona[]> {
  return request<Persona[]>('/personas', {method: 'GET'}, token);
}

export async function getAvailableActions(token?: string | null): Promise<ActionRegistryEntry[]> {
  return request<ActionRegistryEntry[]>('/actions/available', {method: 'GET'}, token);
}

export async function getPendingActions(token?: string | null): Promise<Action[]> {
  return request<Action[]>('/actions/pending', {method: 'GET'}, token);
}

export async function getJobs(token?: string | null): Promise<Job[]> {
  return request<Job[]>('/jobs', {method: 'GET'}, token);
}

export async function getCohorts(projectId?: string | null, token?: string | null): Promise<Cohort[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return request<Cohort[]>(`/cohorts${query}`, {method: 'GET'}, token);
}

export async function createCohort(body: CreateCohort, token?: string | null): Promise<Cohort> {
  return request<Cohort>('/cohorts', {method: 'POST', body: JSON.stringify(body)}, token);
}

export async function getRosterVersions(cohortId: string, token?: string | null): Promise<RosterVersion[]> {
  return request<RosterVersion[]>(`/cohorts/${encodeURIComponent(cohortId)}/roster-versions`, {method: 'GET'}, token);
}

export async function createRosterVersion(
  cohortId: string,
  body: CreateRosterVersion,
  token?: string | null,
): Promise<RosterVersion> {
  return request<RosterVersion>(`/cohorts/${encodeURIComponent(cohortId)}/roster-versions`, {
    method: 'POST', body: JSON.stringify(body),
  }, token);
}

export async function getRubricTemplates(projectId?: string | null, token?: string | null): Promise<RubricTemplate[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return request<RubricTemplate[]>(`/correction/rubric-templates${query}`, {method: 'GET'}, token);
}

export async function createRubricTemplate(
  body: CreateRubricTemplateRequest,
  token?: string | null,
): Promise<{template: RubricTemplate; version: RubricVersion}> {
  return request<{template: RubricTemplate; version: RubricVersion}>('/correction/rubric-templates', {
    method: 'POST', body: JSON.stringify(body),
  }, token);
}

export async function getRubricVersions(templateId: string, token?: string | null): Promise<RubricVersion[]> {
  return request<RubricVersion[]>(
    `/correction/rubric-templates/${encodeURIComponent(templateId)}/versions`,
    {method: 'GET'},
    token,
  );
}

export async function createRubricVersion(
  templateId: string,
  body: CreateRubricVersionRequest,
  token?: string | null,
): Promise<RubricVersion> {
  return request<RubricVersion>(
    `/correction/rubric-templates/${encodeURIComponent(templateId)}/versions`,
    {method: 'POST', body: JSON.stringify(body)},
    token,
  );
}

export async function validateRubricVersion(versionId: string, token?: string | null): Promise<RubricVersion> {
  return request<RubricVersion>(
    `/correction/rubric-versions/${encodeURIComponent(versionId)}/validate`,
    {method: 'POST'},
    token,
  );
}

export async function getInstitutionalGradingProfiles(
  projectId?: string | null,
  token?: string | null,
): Promise<InstitutionalGradingProfile[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return request<InstitutionalGradingProfile[]>(`/correction/grading-profiles${query}`, {method: 'GET'}, token);
}

export async function createInstitutionalGradingProfile(
  body: CreateInstitutionalGradingProfileRequest,
  token?: string | null,
): Promise<InstitutionalGradingProfile> {
  return request<InstitutionalGradingProfile>('/correction/grading-profiles', {
    method: 'POST', body: JSON.stringify(body),
  }, token);
}

export async function validateInstitutionalGradingProfile(
  profileId: string,
  token?: string | null,
): Promise<InstitutionalGradingProfile> {
  return request<InstitutionalGradingProfile>(
    `/correction/grading-profiles/${encodeURIComponent(profileId)}/validate`,
    {method: 'POST'},
    token,
  );
}

export async function getCorrectionBatches(
  projectId?: string | null,
  token?: string | null,
): Promise<CorrectionBatch[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return request<CorrectionBatch[]>(`/correction/batches${query}`, {method: 'GET'}, token);
}

export async function createCorrectionBatch(
  body: CreateCorrectionBatchRequest,
  token?: string | null,
): Promise<{batch: CorrectionBatch; context_snapshot: CorrectionContextSnapshot}> {
  return request<{batch: CorrectionBatch; context_snapshot: CorrectionContextSnapshot}>('/correction/batches', {
    method: 'POST', body: JSON.stringify(body),
  }, token);
}

export async function intakeCorrectionSubmission(
  batchId: string,
  body: CreateSubmissionIntakeRequest,
  token?: string | null,
): Promise<SubmissionRecord> {
  return request<SubmissionRecord>(`/correction/batches/${encodeURIComponent(batchId)}/submissions`, {
    method: 'POST', body: JSON.stringify(body),
  }, token);
}

export async function getCorrectionSubmissions(batchId: string, token?: string | null): Promise<SubmissionRecord[]> {
  return request<SubmissionRecord[]>(`/correction/batches/${encodeURIComponent(batchId)}/submissions`, {method: 'GET'}, token);
}

export async function getPreCorrectionManifests(batchId: string, token?: string | null): Promise<PreCorrectionManifest[]> {
  return request<PreCorrectionManifest[]>(`/correction/batches/${encodeURIComponent(batchId)}/pre-correction-manifests`, {method: 'GET'}, token);
}

export async function createPreCorrectionManifest(batchId: string, body: CreatePreCorrectionManifestRequest, token?: string | null): Promise<PreCorrectionManifest> {
  return request<PreCorrectionManifest>(`/correction/batches/${encodeURIComponent(batchId)}/pre-correction-manifests`, {method: 'POST', body: JSON.stringify(body)}, token);
}

export async function validatePreCorrectionManifest(manifestId: string, body: ValidatePreCorrectionManifestRequest, token?: string | null): Promise<PreCorrectionManifest> {
  return request<PreCorrectionManifest>(`/correction/pre-correction-manifests/${encodeURIComponent(manifestId)}/validate`, {method: 'POST', body: JSON.stringify(body)}, token);
}

export async function getSubjects(projectId?: string | null, token?: string | null): Promise<SubjectTemplate[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return request<SubjectTemplate[]>(`/subjects${query}`, {method: 'GET'}, token);
}
export async function createSubject(body: CreateSubjectTemplateRequest, token?: string | null): Promise<{template: SubjectTemplate; version: SubjectVersion}> {
  return request<{template: SubjectTemplate; version: SubjectVersion}>('/subjects', {method: 'POST', body: JSON.stringify(body)}, token);
}
export async function getSubjectVersions(templateId: string, token?: string | null): Promise<SubjectVersion[]> {
  return request<SubjectVersion[]>(`/subjects/${encodeURIComponent(templateId)}/versions`, {method: 'GET'}, token);
}
export async function createSubjectVersion(templateId: string, body: CreateSubjectVersionRequest, token?: string | null): Promise<SubjectVersion> {
  return request<SubjectVersion>(`/subjects/${encodeURIComponent(templateId)}/versions`, {method: 'POST', body: JSON.stringify(body)}, token);
}
export async function validateSubjectVersion(versionId: string, token?: string | null): Promise<SubjectVersion> {
  return request<SubjectVersion>(`/subject-versions/${encodeURIComponent(versionId)}/validate`, {method: 'POST'}, token);
}
export async function getSubjectAssignments(projectId?: string | null, token?: string | null): Promise<SubjectAssignment[]> {
  const query = projectId ? `?project_id=${encodeURIComponent(projectId)}` : '';
  return request<SubjectAssignment[]>(`/subject-assignments${query}`, {method:'GET'}, token);
}
export async function createSubjectAssignment(body: CreateSubjectAssignmentRequest, token?: string | null): Promise<SubjectAssignment> {
  return request<SubjectAssignment>('/subject-assignments', {method:'POST', body:JSON.stringify(body)}, token);
}
export async function activateSubjectAssignment(id: string, token?: string | null): Promise<SubjectAssignment> {
  return request<SubjectAssignment>(`/subject-assignments/${encodeURIComponent(id)}/activate`, {method:'POST'}, token);
}
export async function getCorrectionSheets(assignmentId: string, token?: string | null): Promise<CorrectionSheetDraft[]> {
  return request<CorrectionSheetDraft[]>(`/subject-assignments/${encodeURIComponent(assignmentId)}/correction-sheets`, {method:'GET'}, token);
}
export async function updateCorrectionSheet(id: string, body: UpdateCorrectionSheetDraftRequest, token?: string | null): Promise<CorrectionSheetDraft> {
  return request<CorrectionSheetDraft>(`/correction-sheets/${encodeURIComponent(id)}`, {method:'PATCH', body:JSON.stringify(body)}, token);
}
export async function syncCorrectionSheet(id: string, sourceSubjectVersionId: string, token?: string | null): Promise<CorrectionSheetDraft> {
  return request<CorrectionSheetDraft>(`/correction-sheets/${encodeURIComponent(id)}/sync`, {method:'POST', body:JSON.stringify({source_subject_version_id:sourceSubjectVersionId})}, token);
}
export async function validateCorrectionSheet(id: string, validationRef: string, token?: string | null): Promise<CorrectionSheetDraft> {
  return request<CorrectionSheetDraft>(`/correction-sheets/${encodeURIComponent(id)}/validate`, {method:'POST', body:JSON.stringify({validation_ref:validationRef})}, token);
}

export async function getIdentityMatchReviews(
  projectId?: string | null,
  token?: string | null,
): Promise<IdentityMatchReviewItem[]> {
  const params = new URLSearchParams();
  if (projectId) params.set('project_id', projectId);
  const query = params.size > 0 ? `?${params.toString()}` : '';
  return request<IdentityMatchReviewItem[]>(
    `/correction/identity-match-candidates${query}`,
    {method: 'GET'},
    token,
  );
}

export async function decideIdentityMatchReview(
  candidateId: string,
  body: {decision: 'confirm' | 'reject'; selected_identity_id?: string | null},
  token?: string | null,
): Promise<IdentityMatchCandidate> {
  return request<IdentityMatchCandidate>(
    `/correction/identity-match-candidates/${encodeURIComponent(candidateId)}/decision`,
    {method: 'POST', body: JSON.stringify(body)},
    token,
  );
}

export async function getOwnerCockpitStatus(token?: string | null): Promise<OwnerCockpitStatus> {
  return request<OwnerCockpitStatus>('/diagnostics/owner-cockpit', {method: 'GET'}, token);
}

export async function getVisualReferences(token?: string | null): Promise<VisualReference[]> {
  return request<VisualReference[]>('/visual-references', {method: 'GET'}, token);
}
export async function createVisualReference(body: CreateVisualReferenceRequest, token?: string | null): Promise<VisualReference> {
  return request<VisualReference>('/visual-references', {method: 'POST', body: JSON.stringify(body)}, token);
}
export async function updateVisualReference(id: string, body: UpdateVisualReferenceRequest, token?: string | null): Promise<VisualReference> {
  return request<VisualReference>(`/visual-references/${encodeURIComponent(id)}`, {method: 'PATCH', body: JSON.stringify(body)}, token);
}
export async function getStoryWorkbenches(token?:string|null):Promise<StoryWorkbench[]>{return request<StoryWorkbench[]>('/story-workbenches',{method:'GET'},token);}
export async function createStoryWorkbench(body:CreateStoryWorkbenchRequest,token?:string|null):Promise<StoryWorkbench>{return request<StoryWorkbench>('/story-workbenches',{method:'POST',body:JSON.stringify(body)},token);}
export async function getStoryPatches(id:string,token?:string|null):Promise<StoryPatchCandidate[]>{return request<StoryPatchCandidate[]>(`/story-workbenches/${encodeURIComponent(id)}/patches`,{method:'GET'},token);}
export async function createStoryPatch(id:string,body:CreateStoryPatchCandidateRequest,token?:string|null):Promise<StoryPatchCandidate>{return request<StoryPatchCandidate>(`/story-workbenches/${encodeURIComponent(id)}/patches`,{method:'POST',body:JSON.stringify(body)},token);}
export async function validateStoryPatch(id:string,patchId:string,token?:string|null):Promise<StoryPatchCandidate>{return request<StoryPatchCandidate>(`/story-workbenches/${encodeURIComponent(id)}/patches/${encodeURIComponent(patchId)}/validate`,{method:'POST'},token);}
export async function setStoryReaderState(id:string,body:SetStoryReaderStateRequest,token?:string|null):Promise<StoryReaderState>{return request<StoryReaderState>(`/story-workbenches/${encodeURIComponent(id)}/reader-state`,{method:'PUT',body:JSON.stringify(body)},token);}
export async function getPrivateQuotes(token?:string|null):Promise<PrivateQuoteDraft[]>{return request<PrivateQuoteDraft[]>('/private-quotes',{method:'GET'},token);}
export async function createPrivateQuote(body:CreatePrivateQuoteDraftRequest,token?:string|null):Promise<PrivateQuoteDraft>{return request<PrivateQuoteDraft>('/private-quotes',{method:'POST',body:JSON.stringify(body)},token);}
export async function validatePrivateQuote(id:string,token?:string|null):Promise<PrivateQuoteDraft>{return request<PrivateQuoteDraft>(`/private-quotes/${encodeURIComponent(id)}/validate`,{method:'POST'},token);}
export async function getVisualManifests(token?: string | null): Promise<VisualManifest[]> {
  return request<VisualManifest[]>('/visual-manifests', {method: 'GET'}, token);
}
export async function createVisualManifest(body: CreateVisualManifestRequest, token?: string | null): Promise<VisualManifest> {
  return request<VisualManifest>('/visual-manifests', {method: 'POST', body: JSON.stringify(body)}, token);
}

export async function diagnoseProcessActivation(
  body: ProcessActivationRequest,
  token?: string | null,
): Promise<ProcessActivationReadModel> {
  return request<ProcessActivationReadModel>('/diagnostics/process-activation', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function createD12MissedTriggerFinding(
  body: CreateD12MissedTriggerFinding,
  token?: string | null,
): Promise<D12MissedTriggerFinding> {
  return request<D12MissedTriggerFinding>('/diagnostics/d12/findings', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function previewHardStopActionExpiry(
  token?: string | null,
): Promise<PreviewActionsExpiryResponse> {
  return request<PreviewActionsExpiryResponse>('/actions/expire-context/preview', {
    method: 'POST',
    body: JSON.stringify({scope: 'mine', reason: 'hard_stop'}),
  }, token);
}

export async function applyHardStopToSelectedActions(
  actionIds: string[],
  token?: string | null,
): Promise<ExpireActionsResponse> {
  return request<ExpireActionsResponse>('/actions/expire-context/selected', {
    method: 'POST',
    body: JSON.stringify({scope: 'mine', reason: 'hard_stop', action_ids: actionIds}),
  }, token);
}

export async function getActiveRoomHardStop(
  roomId: string,
  token?: string | null,
): Promise<HardStopControlState | null> {
  const response = await request<{state: HardStopControlState | null}>(
    `/actions/hard-stop?room_id=${encodeURIComponent(roomId)}`,
    {method: 'GET'},
    token,
  );
  return response.state;
}

export async function activateRoomHardStop(
  roomId: string,
  token?: string | null,
): Promise<HardStopControlState> {
  return request<HardStopControlState>('/actions/hard-stop', {
    method: 'POST',
    body: JSON.stringify({room_id: roomId, reason: 'hard_stop'}),
  }, token);
}

export async function resumeRoomHardStop(
  roomId: string,
  token?: string | null,
): Promise<HardStopControlState> {
  return request<HardStopControlState>('/actions/hard-stop/resume', {
    method: 'POST',
    body: JSON.stringify({room_id: roomId}),
  }, token);
}

export async function getActionContextComparison(
  actionId: string,
  token?: string | null,
): Promise<ActionContextComparison> {
  return request<ActionContextComparison>(`/actions/${actionId}/context-comparison`, {method: 'GET'}, token);
}

export async function getGuides(token?: string | null): Promise<ConversationGuide[]> {
  const response = await request<{results: ConversationGuide[]}>('/guides', {method: 'GET'}, token);
  return response.results;
}

export async function getGuidedSessions(token?: string | null): Promise<GuidedSession[]> {
  const response = await request<{results: GuidedSession[]}>('/guided-sessions', {method: 'GET'}, token);
  return response.results;
}

export async function createGuidedSession(
  body: CreateGuidedSessionRequest,
  token?: string | null,
): Promise<GuidedSession> {
  return request<GuidedSession>('/guided-sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function submitGuidedAnswer(
  sessionId: string,
  body: SubmitGuidedAnswerRequest,
  token?: string | null,
): Promise<GuidedContribution> {
  return request<GuidedContribution>(`/guided-sessions/${encodeURIComponent(sessionId)}/answers`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function advanceGuidedSession(
  sessionId: string,
  token?: string | null,
): Promise<GuidedSession> {
  return request<GuidedSession>(`/guided-sessions/${encodeURIComponent(sessionId)}/advance`, {
    method: 'POST',
  }, token);
}

export async function completeGuidedSession(
  sessionId: string,
  token?: string | null,
): Promise<GuidedSession> {
  return request<GuidedSession>(`/guided-sessions/${encodeURIComponent(sessionId)}/complete`, {
    method: 'POST',
  }, token);
}

export async function getValidationInboxItems(token?: string | null): Promise<ValidationInboxItem[]> {
  return request<ValidationInboxItem[]>('/validation-inbox', {method: 'GET'}, token);
}

export async function decideValidationInboxItem(
  itemId: string,
  body: DecideValidationInboxItemRequest,
  token?: string | null,
): Promise<ValidationInboxItem> {
  return request<ValidationInboxItem>(`/validation-inbox/${encodeURIComponent(itemId)}/decision`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function createAction(body: CreateAction, token?: string | null): Promise<Action> {
  return request<Action>('/actions', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function preflightAction(actionId: string, token?: string | null): Promise<Action> {
  return request<Action>(`/actions/${encodeURIComponent(actionId)}/preflight`, {method: 'POST'}, token);
}

export async function executeAction(actionId: string, token?: string | null): Promise<Action> {
  return request<Action>(`/actions/${encodeURIComponent(actionId)}/execute`, {method: 'POST'}, token);
}

export async function validateAction(
  actionId: string,
  decision: ValidationDecision,
  token?: string | null,
): Promise<Action> {
  return request<Action>(`/actions/${encodeURIComponent(actionId)}/validate`, {
    method: 'POST',
    body: JSON.stringify(decision),
  }, token);
}

export async function getResources(token?: string | null, includeAll = false): Promise<Resource[]> {
  const query = includeAll ? '?include_all=1' : '';
  const response = await request<SearchResourcesResponse>(`/resources${query}`, {method: 'GET'}, token);
  return response.results;
}

export async function updateRoomInstance(
  roomId: string,
  body: UpdateRoomInstance,
  token?: string | null,
): Promise<RoomInstance> {
  return request<RoomInstance>(`/rooms/${encodeURIComponent(roomId)}/instance`, {
    method: 'PUT',
    body: JSON.stringify(body),
  }, token);
}

export async function getLatestRoomCheckpoint(
  roomId: string,
  token?: string | null,
): Promise<RoomCheckpoint | null> {
  try {
    return await request<RoomCheckpoint>(
      `/rooms/${encodeURIComponent(roomId)}/checkpoint/latest`,
      {method: 'GET'},
      token,
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'checkpoint_not_found') return null;
    throw error;
  }
}

export async function proposeResource(body: ProposeResource, token?: string | null): Promise<Resource> {
  return request<Resource>('/resources', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function validateResource(resourceId: string, token?: string | null): Promise<Resource> {
  return request<Resource>(`/resources/${encodeURIComponent(resourceId)}/validate`, {method: 'POST'}, token);
}

// ───────────────────────── Projets / scopes ─────────────────────────

export async function getProjects(token?: string | null): Promise<Project[]> {
  return request<Project[]>('/projects', {method: 'GET'}, token);
}

export async function getProjectMembers(projectId: string, token?: string | null): Promise<ProjectMember[]> {
  return request<ProjectMember[]>(`/projects/${encodeURIComponent(projectId)}/members`, {method: 'GET'}, token);
}

export async function getProjectResources(projectId: string, token?: string | null): Promise<Resource[]> {
  return request<Resource[]>(`/projects/${encodeURIComponent(projectId)}/resources`, {method: 'GET'}, token);
}

export async function attachProjectResource(
  projectId: string,
  body: {resource_id: string; access_level: 'read' | 'write' | 'admin'},
  token?: string | null,
): Promise<ResourceScope> {
  return request<ResourceScope>(`/projects/${encodeURIComponent(projectId)}/resources`, {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

// ───────────────────────── Inventory ─────────────────────────

export async function getInventoryItems(
  options: {projectId?: string | null; includeCandidates?: boolean} = {},
  token?: string | null,
): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (options.projectId) params.set('project_id', options.projectId);
  if (options.includeCandidates) params.set('include_candidates', '1');
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const response = await request<{results: InventoryItem[]}>(`/inventory/items${query}`, {method: 'GET'}, token);
  return response.results;
}

export async function createInventoryItem(
  body: CreateInventoryItemRequest,
  token?: string | null,
): Promise<InventoryItem> {
  return request<InventoryItem>('/inventory/items', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function validateInventoryItem(
  itemId: string,
  token?: string | null,
): Promise<InventoryItem> {
  return request<InventoryItem>(
    `/inventory/items/${encodeURIComponent(itemId)}/validate`,
    {method: 'POST'},
    token,
  );
}

export async function archiveInventoryItem(
  itemId: string,
  token?: string | null,
): Promise<InventoryItem> {
  return request<InventoryItem>(
    `/inventory/items/${encodeURIComponent(itemId)}/archive`,
    {method: 'POST'},
    token,
  );
}

export async function indexInventoryItem(
  itemId: string,
  token?: string | null,
): Promise<RagResource> {
  return request<RagResource>(
    `/inventory/items/${encodeURIComponent(itemId)}/rag-index`,
    {method: 'POST'},
    token,
  );
}

export async function searchInventory(
  query: string,
  projectId?: string | null,
  token?: string | null,
): Promise<InventorySearchResult[]> {
  const params = new URLSearchParams({q: query, limit: '20'});
  if (projectId) params.set('project_id', projectId);
  const response = await request<{results: InventorySearchResult[]}>(
    `/inventory/search?${params.toString()}`,
    {method: 'GET'},
    token,
  );
  return response.results;
}

export async function getInventoryCollections(
  options: {projectId?: string | null; includeCandidates?: boolean} = {},
  token?: string | null,
): Promise<InventoryCollection[]> {
  const params = new URLSearchParams();
  if (options.projectId) params.set('project_id', options.projectId);
  if (options.includeCandidates) params.set('include_candidates', '1');
  const query = params.size > 0 ? `?${params.toString()}` : '';
  const response = await request<{results: InventoryCollection[]}>(
    `/inventory/collections${query}`,
    {method: 'GET'},
    token,
  );
  return response.results;
}

export async function createInventoryCollection(
  body: CreateInventoryCollectionRequest,
  token?: string | null,
): Promise<InventoryCollection> {
  return request<InventoryCollection>('/inventory/collections', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function validateInventoryCollection(
  collectionId: string,
  token?: string | null,
): Promise<InventoryCollection> {
  return request<InventoryCollection>(
    `/inventory/collections/${encodeURIComponent(collectionId)}/validate`,
    {method: 'POST'},
    token,
  );
}

export async function setInventoryCollectionCompletion(
  collectionId: string,
  body: SetCollectionCompletionRequest,
  token?: string | null,
): Promise<InventoryCollection> {
  return request<InventoryCollection>(
    `/inventory/collections/${encodeURIComponent(collectionId)}/completion`,
    {method: 'POST', body: JSON.stringify(body)},
    token,
  );
}

export async function createInventoryProjectNeed(
  body: CreateInventoryProjectNeedRequest,
  token?: string | null,
): Promise<InventoryProjectNeed> {
  return request<InventoryProjectNeed>('/inventory/project-needs', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function matchInventoryProjectNeed(
  needId: string,
  body: MatchInventoryProjectNeedRequest,
  token?: string | null,
): Promise<InventoryNeedMatchResult> {
  return request<InventoryNeedMatchResult>(
    `/inventory/project-needs/${encodeURIComponent(needId)}/match`,
    {method: 'POST', body: JSON.stringify(body)},
    token,
  );
}

// ───────────────────────── RAG permissionné / coordination ─────────────────────────

export async function queryRag(
  body: Pick<RagQueryRequest, 'query'> & Partial<Omit<RagQueryRequest, 'query'>>,
  token?: string | null,
): Promise<RagQueryResponse> {
  return request<RagQueryResponse>('/rag/query', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function syncCoordinationRag(
  token?: string | null,
): Promise<{results: RagResource[]; synced_at: number}> {
  return request<{results: RagResource[]; synced_at: number}>('/rag/coordination/sync', {method: 'POST'}, token);
}

// ───────────────────────── Administration (gated admin/godmode) ─────────────────────────

export async function register(
  body: {username: string; display_name: string; password: string; email?: string; invite_code: string},
): Promise<AuthResponse> {
  const auth = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  setToken(auth.token);
  return auth;
}

export async function getAdminUsers(token?: string | null): Promise<AdminUser[]> {
  return request<AdminUser[]>('/admin/users', {method: 'GET'}, token);
}

export async function getTaskModelProfiles(token?: string | null): Promise<TaskModelProfile[]> {
  return request<TaskModelProfile[]>('/admin/llm/task-model-profiles', {method: 'GET'}, token);
}

export async function getInvitations(token?: string | null): Promise<Invitation[]> {
  return request<Invitation[]>('/admin/invitations', {method: 'GET'}, token);
}

export async function createInvitation(body: CreateInvitation, token?: string | null): Promise<Invitation> {
  return request<Invitation>('/admin/invitations', {method: 'POST', body: JSON.stringify(body)}, token);
}

export async function revokeInvitation(code: string, token?: string | null): Promise<Invitation> {
  return request<Invitation>(`/admin/invitations/${encodeURIComponent(code)}/revoke`, {method: 'POST'}, token);
}

export async function getTokenUsage(
  groupBy: TokenUsageGroupBy,
  token?: string | null,
  range?: {from?: number; to?: number},
): Promise<TokenUsageReport> {
  const params = new URLSearchParams({group_by: groupBy});
  if (range?.from !== undefined) params.set('from', String(range.from));
  if (range?.to !== undefined) params.set('to', String(range.to));
  return request<TokenUsageReport>(`/diagnostics/token-usage?${params.toString()}`, {method: 'GET'}, token);
}
