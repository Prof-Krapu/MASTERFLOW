/**
 * Couche d'accès REST du PoC frontend.
 *
 * Client typé via le contrat partagé `@masterflow/shared`. Toutes les requêtes ciblent
 * la base `/api/v1` (réécrite vers le backend `:8000` par le proxy Vite). Le token JWT
 * est conservé en mémoire (variable module) et injecté en en-tête `Authorization` dès
 * qu'il est disponible.
 *
 * Anti-invention : ce module ne fait que transporter les types du backend, il n'en
 * fabrique aucun. En cas d'erreur HTTP, on relance avec le message JSON renvoyé.
 */

import type {
  AuthResponse,
  BlendRequest,
  BlendWeights,
  CurrentContext,
  PersonaBlend,
} from '@masterflow/shared';

/** Préfixe commun à toutes les routes REST (proxifié par Vite vers le backend). */
const API_BASE = '/api/v1';

/** Token JWT courant, gardé en mémoire (pas de persistance pour le PoC). */
let authToken: string | null = null;

/**
 * Fixe (ou efface) le token JWT conservé en mémoire par le module.
 * @param token Token renvoyé par `/auth/login`, ou `null` pour déconnecter.
 */
export function setToken(token: string | null): void {
  authToken = token;
}

/**
 * Retourne le token JWT actuellement conservé en mémoire.
 * @returns Le token courant, ou `null` si non connecté.
 */
export function getToken(): string | null {
  return authToken;
}

/**
 * Construit les en-têtes d'une requête JSON, en ajoutant `Authorization`
 * lorsqu'un token est fourni.
 * @param token Token explicite ; à défaut, le token en mémoire est utilisé.
 * @returns L'objet d'en-têtes prêt pour `fetch`.
 */
function buildHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const effective = token ?? authToken;
  if (effective) {
    headers.Authorization = `Bearer ${effective}`;
  }
  return headers;
}

/**
 * Extrait un message d'erreur lisible depuis une réponse HTTP en échec.
 * Tente d'abord un corps JSON (`{message}` ou `{error}` ou `{detail}`),
 * puis retombe sur le texte brut, puis sur le statut HTTP.
 * @param response Réponse `fetch` dont `ok` est faux.
 * @returns Le message d'erreur à propager.
 */
async function extractErrorMessage(response: Response): Promise<string> {
  const raw = await response.text();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const candidate = parsed.message ?? parsed.error ?? parsed.detail;
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    } catch {
      // Corps non-JSON : on retombe sur le texte brut ci-dessous.
    }
    return raw;
  }
  return `${response.status} ${response.statusText}`;
}

/**
 * Exécute une requête JSON typée et gère les erreurs HTTP de façon uniforme.
 * @typeParam T Type attendu du corps de réponse (issu de `@masterflow/shared`).
 * @param path Chemin relatif à `API_BASE` (ex. `/auth/login`).
 * @param init Options `fetch` (méthode, corps déjà sérialisé, etc.).
 * @param token Token explicite à utiliser pour cette requête.
 * @returns Le corps de réponse désérialisé en `T`.
 * @throws {Error} Si la réponse HTTP n'est pas `ok` (message JSON propagé).
 */
async function request<T>(path: string, init: RequestInit, token?: string | null): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...buildHeaders(token),
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as T;
}

/**
 * Authentifie l'utilisateur et mémorise le token renvoyé.
 * @param username Identifiant (ex. `vincent`).
 * @param password Mot de passe en clair.
 * @returns La réponse d'authentification (`token` + `user`).
 * @throws {Error} En cas d'identifiants invalides ou d'erreur serveur.
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  const data = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({username, password}),
  });
  setToken(data.token);
  return data;
}

/**
 * Récupère le contexte courant (utilisateur, room, personas, blend actif, actions).
 * @param token Token JWT (à défaut, celui en mémoire est utilisé).
 * @returns Le contexte courant typé.
 * @throws {Error} Si la requête échoue (token absent/expiré, etc.).
 */
export async function getCurrentContext(token?: string | null): Promise<CurrentContext> {
  return request<CurrentContext>('/context/current', {method: 'GET'}, token);
}

/**
 * Crée une chimère (fusion de deux personas) dans une room instance.
 * @param token Token JWT (à défaut, celui en mémoire est utilisé).
 * @param body Requête de fusion (personas primaire/secondaire, poids, calques).
 * @returns Le blend créé (invariant : `speaker_persona_id` = persona primaire).
 * @throws {Error} Si la création échoue côté backend.
 */
export async function createBlend(
  token: string | null,
  body: BlendRequest,
): Promise<PersonaBlend> {
  return request<PersonaBlend>(
    '/personas/blend',
    {method: 'POST', body: JSON.stringify(body)},
    token,
  );
}

/**
 * Met à jour les poids de fusion d'un blend existant (pilotage du slider).
 * @param token Token JWT (à défaut, celui en mémoire est utilisé).
 * @param id Identifiant du blend à modifier.
 * @param blend_weights Nouveaux poids de fusion (`voice` / `method` / `mirror`).
 * @returns Le blend mis à jour.
 * @throws {Error} Si la mise à jour échoue côté backend.
 */
export async function updateBlend(
  token: string | null,
  id: string,
  blend_weights: BlendWeights,
): Promise<PersonaBlend> {
  return request<PersonaBlend>(
    `/personas/blend/${id}`,
    {method: 'PUT', body: JSON.stringify({blend_weights})},
    token,
  );
}

/**
 * Façade regroupant le client REST sous un seul objet, pratique côté composants
 * (`api.login(...)`, `api.getCurrentContext(...)`, etc.).
 */
export const api = {
  login,
  getCurrentContext,
  createBlend,
  updateBlend,
  setToken,
  getToken,
};
