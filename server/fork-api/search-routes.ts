import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Recherche web pour l'assistant pédagogique via un SearXNG AUTO-HÉBERGÉ.
 *
 * L'URL de l'instance vient EXCLUSIVEMENT de l'environnement serveur
 * (SEARXNG_URL, défaut http://127.0.0.1:8888) — jamais du client : zéro SSRF.
 * Patron identique à proxy-routes.ts, enregistré dans server.ts (Express)
 * ET vite-plugin-bridge.ts (dev).
 *
 * Installation (hors code) : voir README — docker searxng/searxng avec
 * `formats: [html, json]` activé dans settings.yml.
 */

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

interface MiddlewareRegistry {
  use: (path: string, handler: MiddlewareHandler) => void;
}

export interface SearchRoutesOptions {
  searxngUrl?: string;
  timeoutMs?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  engine: string;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_RESULTS = 8;
const SNIPPET_MAX_CHARS = 300;

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

interface SearxngRawResult {
  title?: string;
  url?: string;
  content?: string;
  engine?: string;
}

/** Réponse SearXNG → liste normalisée (plafond MAX_RESULTS, snippets bornés). */
export function normalizeSearxngResults(raw: unknown): SearchResult[] {
  const results = (raw as { results?: SearxngRawResult[] })?.results;
  if (!Array.isArray(results)) return [];
  return results
    .filter((entry) => typeof entry?.url === 'string' && entry.url)
    .slice(0, MAX_RESULTS)
    .map((entry) => ({
      title: String(entry.title || '').slice(0, 200),
      url: String(entry.url),
      snippet: String(entry.content || '').slice(0, SNIPPET_MAX_CHARS),
      engine: String(entry.engine || ''),
    }));
}

export function registerSearchRoutes(middlewares: MiddlewareRegistry, options: SearchRoutesOptions = {}) {
  const searxngUrl = (options.searxngUrl ?? process.env.SEARXNG_URL ?? 'http://127.0.0.1:8888').replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function fetchUpstream(path: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${searxngUrl}${path}`, { signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  middlewares.use('/api/search', async (req, res) => {
    // Express et connect retirent le préfixe monté ; le harnais de test non.
    const url = new URL(req.url || '', 'http://localhost');
    const path = url.pathname.replace(/^\/api\/search/, '') || '/';

    if (req.method !== 'GET') {
      sendJson(res, 404, { error: 'Route inconnue' });
      return;
    }

    if (path === '/health') {
      try {
        // Ping léger : une recherche vide renvoie 200 (page d'accueil) si l'instance vit.
        const response = await fetchUpstream('/');
        sendJson(res, 200, { ok: response.ok });
      } catch {
        sendJson(res, 200, { ok: false });
      }
      return;
    }

    if (path !== '/') {
      sendJson(res, 404, { error: 'Route inconnue' });
      return;
    }

    const query = (url.searchParams.get('q') || '').trim();
    if (!query) {
      sendJson(res, 400, { error: 'Paramètre q manquant' });
      return;
    }

    try {
      const params = new URLSearchParams({ q: query, format: 'json', language: 'fr', safesearch: '1' });
      const response = await fetchUpstream(`/search?${params.toString()}`);
      if (!response.ok) {
        sendJson(res, 502, { error: `SearXNG a répondu ${response.status}` });
        return;
      }
      const body = (await response.json()) as unknown;
      sendJson(res, 200, { results: normalizeSearxngResults(body) });
    } catch (err) {
      sendJson(res, 502, {
        error: 'SearXNG injoignable',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
