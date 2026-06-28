import {
  ActionSchema,
  AuthResponseSchema,
  CurrentContextSchema,
  type Action,
  type AuthResponse,
  type CreateAction,
  type CurrentContext,
  type ValidationDecision,
} from '@masterflow/shared';

/** Erreur HTTP du backend, avec le code de statut pour distinguer 401/409/423. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Client REST minimal du backend MasterFlow (mirroir d'`apps/frontend/src/api.ts`).
 * Le JWT est conservé en mémoire de session et joint en `Authorization: Bearer`.
 * Les réponses sont validées par les schémas Zod partagés (`@masterflow/shared`).
 */
export class MasterFlowClient {
  private token: string | null = null;

  constructor(private readonly base: string) {}

  get isAuthenticated(): boolean {
    return this.token !== null;
  }

  get bearer(): string | null {
    return this.token;
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const data = await this.request('POST', '/auth/login', {username, password});
    const auth = AuthResponseSchema.parse(data);
    this.token = auth.token;
    return auth;
  }

  async currentContext(): Promise<CurrentContext> {
    return CurrentContextSchema.parse(await this.request('GET', '/context/current'));
  }

  async createAction(body: CreateAction): Promise<Action> {
    return ActionSchema.parse(await this.request('POST', '/actions', body));
  }

  async preflight(id: string): Promise<Action> {
    return ActionSchema.parse(
      await this.request('POST', `/actions/${encodeURIComponent(id)}/preflight`),
    );
  }

  async validate(id: string, decision: ValidationDecision): Promise<Action> {
    return ActionSchema.parse(
      await this.request('POST', `/actions/${encodeURIComponent(id)}/validate`, decision),
    );
  }

  async execute(id: string): Promise<Action> {
    return ActionSchema.parse(
      await this.request('POST', `/actions/${encodeURIComponent(id)}/execute`),
    );
  }

  private async request(method: string, path: string, body?: unknown): Promise<unknown> {
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    const parsed: unknown = text ? safeJson(text) : null;

    if (!res.ok) {
      throw new ApiError(extractError(parsed, res.status), res.status, parsed);
    }
    return parsed;
  }
}

/** Extrait un message lisible d'un corps d'erreur backend (`{error, message?}`). */
function extractError(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const parts = [record.error, record.message].filter((v): v is string => typeof v === 'string');
    if (parts.length) return parts.join(' — ');
  }
  return `HTTP ${status}`;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
