import type { IncomingMessage, ServerResponse } from 'http';

// Politique CORS du backend : refleter l'Origin quand elle est legitime, sinon
// ne poser AUCUN en-tete (le navigateur bloque alors la lecture). Jamais '*'.
//
// La SPA est servie same-origin par le meme Express (aucun en-tete requis) et
// la page mobile du bridge appelle l'origine dont elle est issue (?base= =
// origine de chargement). Les seuls cas cross-origin legitimes restants :
//  - le telephone sur le LAN (origine http://<ip privee>:<port>) ;
//  - l'URL du tunnel localtunnel, connue du serveur qui l'ouvre ;
//  - une origine ajoutee a la main via CORS_ALLOWED_ORIGINS="https://a,https://b".

const envAllowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),
);

// Origines decouvertes a l'execution (tunnels ouverts par bridge-routes).
const dynamicOrigins = new Set<string>();

export function allowDynamicOrigin(url: string) {
  try {
    dynamicOrigins.add(new URL(url).origin);
  } catch {
    // URL invalide : rien a autoriser.
  }
}

// localhost + plages privees RFC1918 + mDNS .local : le telephone qui
// televerse depuis le meme reseau que le serveur.
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host === '::1' || host.endsWith('.local')) return true;
  if (/^127\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(host)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host)) return true;
  return false;
}

export function corsOriginFor(req: IncomingMessage): string | null {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  if (!origin) return null;

  if (envAllowedOrigins.has(origin) || dynamicOrigins.has(origin)) return origin;

  try {
    if (isPrivateHost(new URL(origin).hostname)) return origin;
  } catch {
    // Origin malforme : refuse.
  }
  return null;
}

interface CorsOptions {
  methods: string;
  allowHeaders?: string;
}

// Pose les en-tetes CORS si l'origine est autorisee. Retourne false sinon
// (reponse sans ACAO : le navigateur refusera la lecture cote appelant).
export function applyCors(req: IncomingMessage, res: ServerResponse, options: CorsOptions): boolean {
  // La reponse varie selon l'Origin recue : indispensable pour tout cache.
  res.setHeader('Vary', 'Origin');

  const origin = corsOriginFor(req);
  if (!origin) return false;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', options.methods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || options.allowHeaders || 'Content-Type',
  );
  res.setHeader('Access-Control-Max-Age', '86400');
  return true;
}
