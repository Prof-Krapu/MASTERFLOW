import type { IncomingMessage, ServerResponse } from 'http';
import { applyCors } from './cors';
import { log, serializeError } from './log';

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

interface MiddlewareRegistry {
  use: (path: string, handler: MiddlewareHandler) => void;
}

interface ProxyRoutesOptions {
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS) || 240_000;
/**
 * Kimi Code : ~35 tokens/s mesures (20 020 tokens de sortie en 549 s, sonde 2026-07-25) et
 * raisonnement OBLIGATOIRE dont les tokens sont decomptes de max_tokens. A 240 s la sortie
 * plafonne donc vers 8 000 tokens, quel que soit le max_tokens configure — et la coupure
 * s'applique au corps bufferise COMME au flux SSE (le clearTimeout est dans le finally, apres
 * arrayBuffer() / apres la boucle reader.read()). Sans ce plafond dedie, une correction ou un
 * bareme un peu long echoue en 502 a 4 minutes au lieu d'aboutir.
 * Reglable par PROXY_TIMEOUT_KIMI_MS ; le proxy connait deja l'URL cible, donc aucune variable
 * systemd n'est necessaire sur les 12 unites.
 */
const KIMI_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_KIMI_MS) || 600_000;
const MAX_REDIRECTS = 5;
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

// Allowlist anti-SSRF : seuls ces hotes (et leurs sous-domaines) sont joignables via le proxy.
// Le proxy etant expose sur le reseau (dev:web --host=0.0.0.0), c'est la protection principale
// contre l'acces aux services internes (metadonnees cloud, localhost, plages privees).
// Correspond aux baseUrl des PROVIDER_PRESETS de lib/api-client.ts.
const DEFAULT_ALLOWED_HOSTS = [
  'api.githubcopilot.com',
  'github.com',
  'api.openai.com',
  'open.bigmodel.cn',
  'api.deepseek.com',
  'openrouter.ai',
  'api.groq.com',
  'api.mistral.ai',
  'opencode.ai',
  'api.kimi.com',
  'generativelanguage.googleapis.com',
  'albert.api.etalab.gouv.fr',
  'pildf-1.tail8d8b1f.ts.net',
];

/**
 * Dispatcher a bornes relachees pour les upstreams lents.
 *
 * `fetch` (undici embarque dans Node) coupe a `headersTimeout` = 300 s PAR DEFAUT, et un
 * appel NON streame ne renvoie ses en-tetes qu'une fois la generation TERMINEE. Une reponse
 * Kimi de plus de ~10 000 tokens (a ~35 tokens/s) echouait donc en « fetch failed » a 301 s,
 * quel que soit notre propre timeout — mesure du 2026-07-25, avant/apres verifie.
 *
 * Node n'exporte pas le module `undici`, mais la CLASSE du dispatcher global est joignable
 * via son constructeur : on en reconstruit un aux bornes relachees, sans ajouter de
 * dependance. Le vrai garde-fou reste notre AbortController (timeoutForTarget) — ces bornes
 * sont juste assez larges pour ne plus arbitrer a sa place.
 *
 * Le dispatcher global n'existe qu'apres le premier `fetch` du process : on ne memorise
 * donc PAS l'echec, la tentative est simplement rejouee au prochain appel. Si l'astuce
 * cesse de fonctionner (Node futur), on retombe sur le dispatcher par defaut et son
 * plafond de 300 s — degradation, pas panne.
 */
const SLOW_DISPATCHER_TIMEOUT_MS = 900_000;
let slowDispatcher: unknown = null;

function getSlowDispatcher(): unknown {
  if (slowDispatcher) return slowDispatcher;
  try {
    const symbol = Object.getOwnPropertySymbols(globalThis).find((s) =>
      String(s).includes('undici.globalDispatcher'),
    );
    if (!symbol) return null;
    const current = (globalThis as unknown as Record<symbol, { constructor?: unknown }>)[symbol];
    const Agent = current?.constructor;
    if (typeof Agent !== 'function') return null;
    slowDispatcher = new (Agent as new (opts: unknown) => unknown)({
      headersTimeout: SLOW_DISPATCHER_TIMEOUT_MS,
      bodyTimeout: SLOW_DISPATCHER_TIMEOUT_MS,
    });
    log.info('proxy', 'dispatcher a bornes relachees actif', {
      timeoutMs: SLOW_DISPATCHER_TIMEOUT_MS,
    });
    return slowDispatcher;
  } catch (err) {
    log.warn('proxy', 'dispatcher lent indisponible, repli sur le defaut (300 s)', serializeError(err));
    return null;
  }
}

/**
 * Delai applicable a une cible donnee. Seuls les fournisseurs notoirement lents obtiennent
 * mieux que DEFAULT_TIMEOUT_MS, et jamais moins que ce que l'appelant a demande.
 */
export function timeoutForTarget(targetUrl: string, baseTimeoutMs: number): number {
  const host = (() => {
    try {
      return new URL(targetUrl).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  if (host === 'api.kimi.com' || host.endsWith('.api.kimi.com')) {
    return Math.max(baseTimeoutMs, KIMI_TIMEOUT_MS);
  }
  return baseTimeoutMs;
}

// Hotes supplementaires pour un provider personnalise : PROXY_ALLOWED_HOSTS="host1,host2".
function getAllowedHosts(): Set<string> {
  const extra = (process.env.PROXY_ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_HOSTS, ...extra]);
}

function isHostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return [...getAllowedHosts()].some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function setCorsHeaders(res: ServerResponse, req: IncomingMessage) {
  applyCors(req, res, {
    methods: 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    allowHeaders: 'Authorization, Content-Type',
  });
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return undefined;
  return Buffer.concat(chunks);
}

function resolveTargetUrl(req: IncomingMessage): string | null {
  const url = new URL(req.url || '', 'http://localhost');
  const directUrl = url.searchParams.get('url');
  if (directUrl) return directUrl;

  const explicitUrl = req.headers['x-target-url'];
  if (typeof explicitUrl === 'string' && explicitUrl.trim()) {
    return explicitUrl.trim();
  }

  const targetBaseHeader = req.headers['x-target-base-url'];
  const targetBase = Array.isArray(targetBaseHeader) ? targetBaseHeader[0] : targetBaseHeader;
  if (!targetBase) return null;

  const passthroughPath = url.pathname.startsWith('/api/proxy')
    ? url.pathname.slice('/api/proxy'.length)
    : url.pathname;
  const searchParams = new URLSearchParams(url.searchParams);
  searchParams.delete('url');
  const search = searchParams.toString();
  return `${targetBase.replace(/\/$/, '')}${passthroughPath}${search ? `?${search}` : ''}`;
}

function normalizeTargetUrl(rawUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL cible invalide');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Le proxy accepte uniquement les URL http(s)');
  }

  if (!isHostAllowed(parsed.hostname)) {
    throw new Error(`Hote non autorise par le proxy : ${parsed.hostname}`);
  }

  return parsed.toString();
}

// fetch en suivant les redirections manuellement, en re-validant chaque saut contre l'allowlist
// (ferme le contournement de l'allowlist via une redirection vers un hote interne).
async function fetchWithRedirectGuard(initialUrl: string, init: RequestInit): Promise<Response> {
  let currentUrl = initialUrl;
  let method = init.method || 'GET';
  let body = init.body;

  for (let hop = 0; ; hop++) {
    const response = await fetch(currentUrl, { ...init, method, body, redirect: 'manual' });

    const isRedirect = response.status >= 300 && response.status < 400;
    const location = response.headers.get('location');
    if (!isRedirect || !location) return response;

    if (hop >= MAX_REDIRECTS) throw new Error('Trop de redirections');

    const nextUrl = new URL(location, currentUrl);
    if (!['http:', 'https:'].includes(nextUrl.protocol)) {
      throw new Error('Redirection vers un protocole non autorise');
    }
    if (!isHostAllowed(nextUrl.hostname)) {
      throw new Error(`Redirection vers un hote non autorise : ${nextUrl.hostname}`);
    }

    // Consommer le corps de la reponse de redirection pour liberer la connexion.
    await response.arrayBuffer().catch(() => undefined);

    currentUrl = nextUrl.toString();
    // 303, ou 301/302 sur une methode a corps : la cible se recupere en GET sans corps.
    // 307/308 preservent methode et corps.
    const switchesToGet =
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) && method !== 'GET' && method !== 'HEAD');
    if (switchesToGet) {
      method = 'GET';
      body = undefined;
    }
  }
}

function buildProxyHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) continue;
    if (lowerKey.startsWith('access-control-')) continue;
    if (lowerKey === 'origin' || lowerKey === 'referer') continue;
    if (lowerKey === 'x-target-url' || lowerKey === 'x-target-base-url') continue;
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const entry of value) headers.append(key, entry);
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

function copyResponseHeaders(source: Headers, res: ServerResponse) {
  source.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lowerKey)) return;
    res.setHeader(key, value);
  });
}

export function registerProxyRoutes(middlewares: MiddlewareRegistry, options: ProxyRoutesOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  middlewares.use('/api/proxy', async (req, res) => {
    setCorsHeaders(res, req);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const rawTargetUrl = resolveTargetUrl(req);
    if (!rawTargetUrl) {
      sendJson(res, 400, {
        error: 'Proxy misconfigured',
        detail: 'Missing target URL. Use ?url=... or x-target-base-url.',
      });
      return;
    }

    let targetUrl: string;
    try {
      targetUrl = normalizeTargetUrl(rawTargetUrl);
    } catch (err) {
      sendJson(res, 400, {
        error: 'Invalid proxy target',
        detail: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    try {
      const body = await readRequestBody(req);
      const controller = new AbortController();
      const effectiveTimeoutMs = timeoutForTarget(targetUrl, timeoutMs);
      const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);
      // Au-dela du defaut, undici couperait a 300 s avant nous (cf. getSlowDispatcher).
      const dispatcher = effectiveTimeoutMs > timeoutMs ? getSlowDispatcher() : null;

      try {
        const proxyRes = await fetchWithRedirectGuard(targetUrl, {
          method: req.method || 'GET',
          headers: buildProxyHeaders(req),
          body,
          signal: controller.signal,
          ...(dispatcher ? {dispatcher} : {}),
        } as RequestInit);

        res.statusCode = proxyRes.status;
        copyResponseHeaders(proxyRes.headers, res);

        const contentType = proxyRes.headers.get('content-type') || '';
        if (contentType.includes('text/event-stream') && proxyRes.body) {
          // Flux SSE (assistant en streaming) : pipe au fil de l'eau, sans bufferiser.
          // Le timeout global reste la borne dure (un flux plus long que timeoutMs est
          // coupe) et la fermeture cote client interrompt l'upstream via le MEME
          // AbortController (pas de generation orpheline qui continue de facturer).
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('X-Accel-Buffering', 'no');
          res.flushHeaders?.();
          res.on('close', () => {
            if (!res.writableEnded) controller.abort();
          });
          const reader = proxyRes.body.getReader();
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(Buffer.from(value));
            }
          } finally {
            res.end();
          }
          return;
        }

        // La lecture du corps reste couverte par le MEME AbortController : un upstream
        // qui envoie l'entete puis traine (reponse non-streamee mais lente) ne doit pas
        // echapper au timeout et laisser le client pendre jusqu'a SON propre delai. Le
        // proxy reste l'autorite qui coupe en premier -> 502 net a ~timeoutMs.
        const responseBody = await proxyRes.arrayBuffer();
        res.end(Buffer.from(responseBody));
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      log.error('proxy', 'proxy request failed', serializeError(err));
      if (res.headersSent) {
        // Flux SSE deja entame : impossible d'envoyer un JSON d'erreur, on coupe net
        // (le client detecte la fin prematuree et bascule sur le repli non-streame).
        res.destroy();
        return;
      }
      sendJson(res, 502, {
        error: 'Proxy error',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  });
}
