import type {
  ActionRegistryEntry,
  AuthResponse,
  CurrentContext,
  Persona,
  Resource,
  SearchResourcesResponse,
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

export async function getResources(token?: string | null): Promise<Resource[]> {
  const response = await request<SearchResourcesResponse>('/resources', {method: 'GET'}, token);
  return response.results;
}
