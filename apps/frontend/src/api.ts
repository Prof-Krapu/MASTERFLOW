import type {
  Action,
  ActionRegistryEntry,
  AdminUser,
  AuthResponse,
  CreateAction,
  CreateInvitation,
  CurrentContext,
  Invitation,
  Persona,
  ProposeResource,
  Resource,
  RoomInstance,
  SearchResourcesResponse,
  TokenUsageGroupBy,
  TokenUsageReport,
  UpdateRoomInstance,
  ValidationDecision,
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

export async function proposeResource(body: ProposeResource, token?: string | null): Promise<Resource> {
  return request<Resource>('/resources', {
    method: 'POST',
    body: JSON.stringify(body),
  }, token);
}

export async function validateResource(resourceId: string, token?: string | null): Promise<Resource> {
  return request<Resource>(`/resources/${encodeURIComponent(resourceId)}/validate`, {method: 'POST'}, token);
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
