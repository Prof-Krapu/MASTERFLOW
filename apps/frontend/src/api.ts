import type {
  Action,
  ActionRegistryEntry,
  AdminUser,
  AuthResponse,
  CreateAction,
  CreateInventoryCollectionRequest,
  CreateInventoryItemRequest,
  CreateInventoryProjectNeedRequest,
  CreateInvitation,
  CreateVisualManifestRequest,
  CurrentContext,
  DecideValidationInboxItemRequest,
  InventoryCollection,
  InventoryItem,
  InventoryNeedMatchResult,
  InventoryProjectNeed,
  InventorySearchResult,
  Invitation,
  MatchInventoryProjectNeedRequest,
  Persona,
  Project,
  ProjectMember,
  ProposeResource,
  RagQueryRequest,
  RagQueryResponse,
  RagResource,
  Resource,
  ResourceScope,
  RoomCheckpoint,
  RoomInstance,
  SetCollectionCompletionRequest,
  TaskModelProfile,
  SearchResourcesResponse,
  TokenUsageGroupBy,
  TokenUsageReport,
  UpdateRoomInstance,
  ValidationInboxItem,
  ValidationDecision,
  VisualManifest,
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

export async function getVisualManifests(token?: string | null): Promise<VisualManifest[]> {
  const response = await request<{results: VisualManifest[]}>(
    '/visual-manifests',
    {method: 'GET'},
    token,
  );
  return response.results;
}

export async function createVisualManifest(
  body: CreateVisualManifestRequest,
  token?: string | null,
): Promise<VisualManifest> {
  return request<VisualManifest>('/visual-manifests', {
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
