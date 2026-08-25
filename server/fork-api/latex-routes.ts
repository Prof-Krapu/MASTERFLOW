import type { IncomingMessage, ServerResponse } from 'http';
import { convertirChimieUnicode } from './chimie-unicode';
import { sanitizeEditedHtml } from './lib/html-sanitize';
import { log, serializeError } from './log';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Compilation LaTeX → PDF (xelatex via latexmk) et conversion → DOCX (pandoc)
 * pour l'assistant pédagogique. Patron identique à proxy-routes.ts :
 * enregistré dans server.ts (Express) ET vite-plugin-bridge.ts (dev).
 *
 * Sécurité — la source vient d'un LLM (contenu semi-contrôlé) :
 * - xelatex et PAS lualatex (\directlua permet io.open même sans shell-escape),
 *   PAS pdflatex (les LLM émettent de l'unicode brut : μ, →, ²) ;
 * - scan statique de refus AVANT toute exécution (\write18, primitives Lua,
 *   \input/\include/\openin/\openout, \usepackage hors liste blanche) ;
 * - -no-shell-escape + openout_any/openin_any='p' (kpathsea : accès fichiers
 *   restreint au répertoire de travail) ;
 * - compilation dans un mkdtemp jeté en finally ;
 * - verrou : 1 compilation à la fois, file d'attente de 3, 429 au-delà.
 */

type MiddlewareHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

interface MiddlewareRegistry {
  use: (path: string, handler: MiddlewareHandler) => void;
}

export interface LatexRoutesOptions {
  timeoutMs?: number;
  maxSourceBytes?: number;
  maxHtmlBytes?: number;
  maxImageBytes?: number;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_SOURCE_BYTES = 500_000;
// Le MathML est bien plus verbeux que le LaTeX qui l'a produit (une fraction
// = ~200 octets) : un TP de 4 pages dépasse les 500 ko du plafond LaTeX.
const DEFAULT_MAX_HTML_BYTES = 2_000_000;
// Images jointes par le professeur (déjà réduites côté navigateur, ~300 ko
// pièce). Plafond global, indépendant de celui de la source.
const DEFAULT_MAX_IMAGE_BYTES = 12_000_000;
const MAX_IMAGES = 12;
// Le corps lu sur le socket doit pouvoir contenir source + images en base64.
const MAX_PAYLOAD_BYTES = 20_000_000;
const MAX_QUEUE = 3;
const LOG_TAIL_CHARS = 8_000;

/** Routes POST servies sous /api/latex (toute autre → 404). */
const POST_ROUTES = new Set(['/compile', '/convert', '/html', '/docx-from-html']);

// Liste blanche : tout paquet du LATEX_PREAMBLE (lib/assistant-prompts.ts)
// + dépendances usuelles qu'un modèle peut légitimement demander en corps.
const ALLOWED_PACKAGES = new Set([
  'fontspec', 'polyglossia', 'geometry', 'amsmath', 'amssymb', 'amsfonts',
  // circuitikz et bohr ajoutés le 2026-08-11 : les modèles les emploient spontanément
  // (18 occurrences de circuitikz sur 6 tirages), et le préambule les charge désormais.
  // pgfplots était déjà autorisé ici mais PAS chargé — le modèle ne pouvait donc pas s'en
  // servir. Tous trois sont installés dans la distribution TeX de la machine.
  'mathtools', 'siunitx', 'mhchem', 'chemfig', 'tikz', 'pgfplots', 'circuitikz', 'bohr', 'enumitem',
  'booktabs', 'tcolorbox', 'fancyhdr', 'graphicx', 'xcolor', 'array',
  'multirow', 'multicol', 'caption', 'float', 'exam',
]);

// Primitives refusées : exécution shell, Lua, accès fichiers.
const FORBIDDEN_PATTERNS: Array<{ re: RegExp; reason: string }> = [
  { re: /\\write18/i, reason: '\\write18 (exécution shell) interdit' },
  { re: /\\ShellEscape/i, reason: '\\ShellEscape interdit' },
  { re: /\\(directlua|luadirect|luaexec|latelua|dofile)\b/i, reason: 'primitive Lua interdite' },
  { re: /\\(input|include|InputIfFileExists)\b/, reason: '\\input/\\include (lecture de fichier) interdit' },
  // Pas de \b : \openout5=... colle un chiffre (registre) au nom de commande.
  { re: /\\(openin|openout|closein|closeout)/, reason: '\\openin/\\openout (accès fichier) interdit' },
  // Couvre \write, \write18 et \immediate\write (pas de \b : « write18 » ne
  // présente pas de frontière de mot après « write »).
  { re: /\\write/, reason: '\\write (écriture de fichier) interdit' },
  { re: /\\(catcode|scantokens)\b/, reason: 'redéfinition de catcodes interdite' },
];

/** Motif de refus statique, ou null si la source est acceptable. */
export function scanLatexSource(tex: string): string | null {
  for (const { re, reason } of FORBIDDEN_PATTERNS) {
    if (re.test(tex)) return reason;
  }
  const packageRe = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g;
  for (const match of tex.matchAll(packageRe)) {
    for (const name of (match[1] ?? '').split(',').map((entry) => entry.trim()).filter(Boolean)) {
      if (!ALLOWED_PACKAGES.has(name)) {
        return `paquet non autorisé : ${name}`;
      }
    }
  }
  return null;
}

// ------------------------------------------------------------
// Images jointes au document
// ------------------------------------------------------------

/** Image insérée par le professeur, transportée avec la source. */
export interface LatexImage {
  /** Nom de fichier dans le bac à sable de compilation. */
  name: string;
  /** Contenu en base64 (sans préfixe data:). */
  data: string;
}

// Nom de fichier strictement plat : ni chemin, ni dotfile, ni extension exotique.
// kpathsea (openin_any='p') interdit déjà de remonter, ceci ferme la porte en amont.
const IMAGE_NAME_RE = /^[a-z0-9][a-z0-9_-]{0,60}\.(?:png|jpe?g)$/i;

/** Motif de refus des images jointes, ou null si elles sont acceptables. */
export function scanLatexImages(images: LatexImage[], maxTotalBytes: number): string | null {
  if (images.length > MAX_IMAGES) return `trop d'images (${images.length}, maximum ${MAX_IMAGES})`;
  const seen = new Set<string>();
  let total = 0;
  for (const image of images) {
    if (typeof image?.name !== 'string' || !IMAGE_NAME_RE.test(image.name)) {
      return `nom d'image invalide : ${String(image?.name).slice(0, 40)}`;
    }
    if (seen.has(image.name.toLowerCase())) return `image en double : ${image.name}`;
    seen.add(image.name.toLowerCase());
    if (typeof image.data !== 'string' || !/^[A-Za-z0-9+/=\s]*$/.test(image.data)) {
      return `contenu d'image invalide : ${image.name}`;
    }
    total += Math.floor((image.data.length * 3) / 4);
    if (total > maxTotalBytes) return `images trop volumineuses (maximum ${maxTotalBytes} octets au total)`;
  }
  return null;
}

/**
 * Marqueur de repli, VISIBLE dans le PDF comme dans le Word.
 *
 * Surtout pas `\\fbox` : mesuré sur pandoc 3.10, son lecteur LaTeX supprime la
 * boîte ET son contenu. Le repli devenait donc invisible dans l'export Word —
 * exactement le silence que ces garde-fous existent pour corriger. `\\textbf`
 * traverse pandoc comme xelatex sans rien perdre.
 */
function marqueurRepli(texte: string): string {
  return `\\textbf{[${texte}]}`;
}

const GRAPHICS_RE = /\\includegraphics\s*(\[[^\]\n]*\])?\s*\{([^}\n]*)\}/g;

/**
 * Neutralise les \includegraphics qui ne désignent PAS une image jointe.
 *
 * Deux raisons. D'abord les modèles hallucinent des noms de fichiers (le contrat
 * leur interdit pourtant les images) : sans cela la compilation échoue. Ensuite
 * et surtout, pandoc va CHERCHER la ressource pour l'embarquer dans le DOCX —
 * un \includegraphics{http://…} deviendrait une requête sortante depuis le
 * serveur. La route /convert ne peut pas utiliser --sandbox (qui bloquerait
 * aussi les images légitimes) : c'est donc ce filtre qui tient la garde.
 */
export function neutralizeUnknownGraphics(tex: string, allowedNames: string[]): string {
  const allowed = new Set(allowedNames.map((name) => name.toLowerCase()));
  return tex.replace(GRAPHICS_RE, (full, _options: string | undefined, target: string) =>
    allowed.has(target.trim().toLowerCase()) ? full : marqueurRepli('figure'),
  );
}

// ------------------------------------------------------------
// Nettoyage de l'HTML édité à la main (route /docx-from-html)
//
// Déplacé dans `lib/html-sanitize.ts` : la retouche IA d'une sélection Word
// réinjecte l'HTML rendu par le LLM DANS LE DOM du contentEditable et a besoin du
// même nettoyage — or ce fichier importe `node:child_process` et n'est donc pas
// importable depuis le navigateur. Ré-exporté ici pour les importateurs existants.
// ------------------------------------------------------------

export { sanitizeEditedHtml, type HtmlSanitizeResult } from './lib/html-sanitize';

// ------------------------------------------------------------
// Probes latexmk / pandoc (résultat mis en cache)
// ------------------------------------------------------------

/**
 * `drapeau` n'est pas un détail : poppler ne connaît PAS `--version` et sort en
 * erreur dessus (`pdftoppm -v`). Sondé avec le mauvais drapeau, il était déclaré
 * absent et les schémas repartaient silencieusement en encadré « non converti ».
 */
function commandAvailable(command: string, drapeau = '--version'): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(command, [drapeau], { timeout: 10_000 }, (error) => resolve(!error));
  });
}

let probePromise: Promise<{ pdf: boolean; docx: boolean; schemas: boolean }> | null = null;

function probeTools(): Promise<{ pdf: boolean; docx: boolean; schemas: boolean }> {
  if (!probePromise) {
    probePromise = Promise.all([
      commandAvailable('latexmk'),
      commandAvailable('pandoc'),
      // pdftoppm (poppler) et pdfcrop : rastérisation et recadrage des schémas
      // pour le Word. Absents = encadré « schéma non converti », jamais d'erreur.
      commandAvailable('pdftoppm', '-v'),
      commandAvailable('pdfcrop'),
    ]).then(([pdf, docx, poppler, crop]) => ({ pdf, docx, schemas: pdf && poppler && crop }));
  }
  return probePromise;
}

// ------------------------------------------------------------
// Verrou de compilation (latex ET pandoc partagent le même : CPU-bound)
// ------------------------------------------------------------

let running = false;
const waiting: Array<() => void> = [];

function acquireSlot(): Promise<void> | null {
  if (!running) {
    running = true;
    return Promise.resolve();
  }
  if (waiting.length >= MAX_QUEUE) return null;
  return new Promise((resolve) => waiting.push(resolve));
}

function releaseSlot(): void {
  const next = waiting.shift();
  if (next) next();
  else running = false;
}

// ------------------------------------------------------------
// Helpers HTTP (mêmes conventions que proxy-routes.ts)
// ------------------------------------------------------------

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readBody(req: IncomingMessage, maxBytes: number): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) return null;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

/** Extrait les lignes d'erreur ('!' + contexte) du log LaTeX, tail plafonné. */
function extractLatexLog(log: string): string {
  const lines = log.split('\n');
  const kept: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('!')) {
      kept.push(...lines.slice(i, i + 6));
    }
  }
  const summary = kept.length > 0 ? kept.join('\n') : log;
  return summary.slice(-LOG_TAIL_CHARS);
}

function execInDir(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ ok: boolean; stderr: string; stdout: string }> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        cwd,
        timeout: timeoutMs,
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          // kpathsea : lecture/écriture restreintes aux chemins « paranoid »
          // (répertoire courant et sous-répertoires, pas de dotfiles).
          // HOME reste celui du service : xelatex réutilise le cache fontconfig.
          openout_any: 'p',
          openin_any: 'p',
        },
      },
      (error, stdout, stderr) => resolve({ ok: !error, stdout: String(stdout), stderr: String(stderr) }),
    );
  });
}

// ------------------------------------------------------------
// Schémas → images, pour le chemin Word
//
// pandoc ne sait rien dessiner. Mesuré (pandoc 3.10) sur les constructions que
// le préambule rend pourtant très bien en PDF :
//   \begin{tikzpicture}…    → SUPPRIMÉ (il ne reste qu'une div vide)
//   \chemfig{…}             → SUPPRIMÉ
//   \schemestart…\schemestop → DÉTRUIT (laisse « \[,1.5\] » en charabia)
// Un professeur qui exporte en Word et imprime découvre l'absence devant sa
// classe. On compile donc chaque schéma à part, en classe `standalone` avec LE
// PRÉAMBULE DU DOCUMENT (mêmes polices, même siunitx, mêmes macros), on
// rastérise, et on remplace par un \includegraphics.
//
// Le PDF n'est pas concerné : xelatex dessine tout ça nativement.
// ------------------------------------------------------------

/** Environnements et commandes que pandoc perd et qu'on rend en image. */
const SCHEMA_ENVIRONNEMENTS: Array<[string, string]> = [
  ['\\begin{tikzpicture}', '\\end{tikzpicture}'],
  ['\\schemestart', '\\schemestop'],
];
const SCHEMA_COMMANDES = ['\\chemfig'];

/** Résolution de rastérisation. pdftoppm inscrit le DPI dans le PNG (chunk
 *  pHYs) et pandoc l'honore : l'image arrive dans le Word à sa taille
 *  physique réelle, sans qu'on ait à calculer une largeur. */
const SCHEMA_DPI = 220;
/** Au-delà, c'est un document entier déguisé : on n'y passe pas la soirée. */
const MAX_SCHEMAS = 24;

/**
 * Cache des rendus, par empreinte (préambule + source du schéma). L'aperçu Word
 * est régénéré à chaque ouverture de l'onglet : sans cache, chaque consultation
 * relancerait un xelatex par schéma.
 */
const cacheSchemas = new Map<string, Buffer>();
const MAX_CACHE_SCHEMAS = 120;

function empreinte(texte: string): string {
  // djb2 : suffisant pour une clé de cache locale, et évite d'importer crypto
  // dans un module qui tourne aussi sous le bridge Vite.
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + texte.length;
}

/** Fin du groupe `{…}` ouvert à `debut` (accolades équilibrées). -1 si non fermé. */
function finGroupe(texte: string, debut: number): number {
  let profondeur = 0;
  for (let i = debut; i < texte.length; i++) {
    if (texte[i] === '\\') {
      i++;
      continue;
    }
    if (texte[i] === '{') profondeur++;
    else if (texte[i] === '}' && --profondeur === 0) return i;
  }
  return -1;
}

interface Schema {
  debut: number;
  fin: number;
  source: string;
}

/** Repère les schémas, dans l'ordre du document et sans chevauchement. */
export function repererSchemas(tex: string): Schema[] {
  const trouves: Schema[] = [];

  for (const [ouvre, ferme] of SCHEMA_ENVIRONNEMENTS) {
    let i = 0;
    for (;;) {
      const d = tex.indexOf(ouvre, i);
      if (d === -1) break;
      const f = tex.indexOf(ferme, d);
      if (f === -1) break;
      trouves.push({ debut: d, fin: f + ferme.length, source: tex.slice(d, f + ferme.length) });
      i = f + ferme.length;
    }
  }

  for (const commande of SCHEMA_COMMANDES) {
    let i = 0;
    for (;;) {
      const d = tex.indexOf(commande, i);
      if (d === -1) break;
      const ouvrante = tex.indexOf('{', d);
      const f = ouvrante === -1 ? -1 : finGroupe(tex, ouvrante);
      if (f === -1) break;
      trouves.push({ debut: d, fin: f + 1, source: tex.slice(d, f + 1) });
      i = f + 1;
    }
  }

  // Un \chemfig à l'intérieur d'un \schemestart est déjà couvert par lui :
  // sans ce filtre on compilerait deux fois et le remplacement se chevaucherait.
  trouves.sort((a, b) => a.debut - b.debut || b.fin - a.fin);
  const retenus: Schema[] = [];
  let borne = -1;
  for (const s of trouves) {
    if (s.debut < borne) continue;
    retenus.push(s);
    borne = s.fin;
  }
  return retenus;
}

/**
 * Préambule du document reçu, réutilisé TEL QUEL pour compiler un schéma isolé.
 *
 * On garde la classe `article` du document plutôt que de basculer en
 * `standalone`, et ce n'est pas un détail de confort : mesuré, `standalone`
 * **perd la première molécule d'un `\schemestart`** (elle tombe hors de la boîte
 * qu'il mesure — « A -> B » ressortait en « -> B »). Compiler exactement comme
 * le PDF puis recadrer à l'encre avec pdfcrop donne le rendu que le professeur
 * voit déjà, sans cas particulier par construction.
 */
function preambuleSchema(tex: string): string | null {
  const i = tex.indexOf('\\begin{document}');
  if (i === -1) return null;
  const preambule = tex.slice(0, i);
  return /\\documentclass/.test(preambule) ? preambule : null;
}

/**
 * Remplace chaque schéma par un `\includegraphics` et écrit les PNG dans
 * `workDir`. Un schéma qui ne compile pas devient un encadré VISIBLE : le
 * silence est précisément ce qu'on corrige ici, on ne le réintroduit pas.
 *
 * Renvoie aussi les images produites — `/html` en a besoin pour les inliner,
 * pandoc y tournant avec `--sandbox` (il ne lit aucun fichier).
 */
export async function rendreSchemas(
  tex: string,
  workDir: string,
  timeoutMs: number,
): Promise<{ tex: string; images: Array<{ name: string; data: Buffer }>; echecs: number }> {
  const schemas = repererSchemas(tex);
  if (schemas.length === 0) return { tex, images: [], echecs: 0 };

  const preambule = preambuleSchema(tex);
  if (!preambule) return { tex, images: [], echecs: 0 };

  const images: Array<{ name: string; data: Buffer }> = [];
  let echecs = 0;
  let sortie = '';
  let curseur = 0;

  for (const [index, schema] of schemas.entries()) {
    sortie += tex.slice(curseur, schema.debut);
    curseur = schema.fin;

    if (index >= MAX_SCHEMAS) {
      echecs++;
      sortie += marqueurRepli('schéma non converti : trop de schémas dans ce document');
      continue;
    }

    const nom = `corrector-schema-${index + 1}.png`;
    const cle = empreinte(preambule + '\0' + schema.source);
    const enCache = cacheSchemas.get(cle);

    let png: Buffer | null = enCache ?? null;
    if (!png) {
      png = await compilerSchema(preambule, schema.source, workDir, index, timeoutMs);
      if (png) {
        if (cacheSchemas.size >= MAX_CACHE_SCHEMAS) {
          const premiere = cacheSchemas.keys().next().value;
          if (premiere !== undefined) cacheSchemas.delete(premiere);
        }
        cacheSchemas.set(cle, png);
      }
    }

    if (!png) {
      echecs++;
      sortie += marqueurRepli('schéma non converti');
      continue;
    }
    await writeFile(join(workDir, nom), png);
    images.push({ name: nom, data: png });
    sortie += `\\includegraphics{${nom}}`;
  }

  sortie += tex.slice(curseur);
  return { tex: sortie, images, echecs };
}

/** Un schéma → PNG. Renvoie null sur échec (compilation, rastérisation…). */
async function compilerSchema(
  preambule: string,
  source: string,
  workDir: string,
  index: number,
  timeoutMs: number,
): Promise<Buffer | null> {
  // Sous-répertoire dédié : latexmk sème une dizaine d'auxiliaires par
  // compilation, et `doc.tex` du document principal vit dans workDir.
  const dir = join(workDir, `schema-${index + 1}`);
  try {
    await mkdir(dir, { recursive: true });
    // `\pagestyle{empty}` est indispensable : le préambule pose fancyhdr avec un
    // numéro de page en pied, que pdfcrop prendrait pour du contenu à conserver.
    await writeFile(
      join(dir, 's.tex'),
      `${preambule}\\begin{document}\n\\pagestyle{empty}\\thispagestyle{empty}\n${source}\n\\end{document}\n`,
      'utf8',
    );

    const compile = await execInDir(
      'latexmk',
      ['-xelatex', '-halt-on-error', '-interaction=nonstopmode', '-no-shell-escape', 's.tex'],
      dir,
      timeoutMs,
    );
    if (!compile.ok) return null;

    // Recadrage à l'encre : la page reste un A4 à marges, seul le tracé compte.
    const crop = await execInDir('pdfcrop', ['--margins', '4', 's.pdf', 'sc.pdf'], dir, timeoutMs);
    if (!crop.ok) return null;

    // -singlefile : sortie « sc.png » sans suffixe de numéro de page.
    const raster = await execInDir(
      'pdftoppm',
      ['-png', '-r', String(SCHEMA_DPI), '-singlefile', 'sc.pdf', 'sc'],
      dir,
      timeoutMs,
    );
    if (!raster.ok) return null;

    return await readFile(join(dir, 'sc.png'));
  } catch {
    return null;
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

// ------------------------------------------------------------
// Modèle de référence pandoc (géométrie de page du DOCX)
// ------------------------------------------------------------

// Le reference.docx par défaut de pandoc ne définit NI pgSz NI pgMar : le
// DOCX produit n'a alors aucune géométrie de page (zéro marge dans Word
// comme dans docx-preview). Ce fichier est ce défaut (pandoc
// --print-default-data-file reference.docx) dont le sectPr a été complété :
// A4 (11906×16838 twips) + marges 2 cm (1134 twips) — la géométrie du PDF
// (geometry margin=2cm dans LATEX_PREAMBLE). En base64 : diff texte
// propagable, aucune dépendance zip à l'exécution.
const REFERENCE_DOCX_BASE64 = [
  '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',
].join('');

// ------------------------------------------------------------
// Routes
// ------------------------------------------------------------

export function registerLatexRoutes(middlewares: MiddlewareRegistry, options: LatexRoutesOptions = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxSourceBytes = options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES;
  const maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
  const maxImageBytes = options.maxImageBytes ?? DEFAULT_MAX_IMAGE_BYTES;

  middlewares.use('/api/latex', async (req, res) => {
    // Express et connect retirent le préfixe monté ; le harnais de test non.
    const url = new URL(req.url || '', 'http://localhost');
    const path = url.pathname.replace(/^\/api\/latex/, '') || '/';

    if (path === '/health' && req.method === 'GET') {
      const tools = await probeTools();
      // `html` : même binaire que le DOCX (pandoc), exposé séparément pour que
      // le client puisse activer l'éditeur Word sans supposer l'équivalence.
      sendJson(res, tools.pdf || tools.docx ? 200 : 503, {
        ok: tools.pdf || tools.docx,
        ...tools,
        html: tools.docx,
      });
      return;
    }

    if (!POST_ROUTES.has(path) || req.method !== 'POST') {
      sendJson(res, 404, { error: 'Route inconnue' });
      return;
    }

    // /docx-from-html reçoit {html} (édité à la main) ; les autres {tex}.
    // Toutes peuvent porter {images} (insérées par le professeur).
    const htmlInput = path === '/docx-from-html';

    // Le corps lu sur le socket contient source + images : le plafond de
    // lecture est global, ceux de la source et des images sont vérifiés après
    // analyse (sinon une grosse image ferait passer la source pour trop longue).
    const raw = await readBody(req, MAX_PAYLOAD_BYTES);
    if (raw === null) {
      sendJson(res, 413, { ok: false, log: `Requête trop volumineuse (max ${MAX_PAYLOAD_BYTES} octets)` });
      return;
    }

    let tex = '';
    let html = '';
    let images: LatexImage[] = [];
    try {
      const parsed = JSON.parse(raw.toString('utf8')) as { tex?: unknown; html?: unknown; images?: unknown };
      tex = typeof parsed.tex === 'string' ? parsed.tex : '';
      html = typeof parsed.html === 'string' ? parsed.html : '';
      images = Array.isArray(parsed.images) ? (parsed.images as LatexImage[]) : [];
    } catch {
      sendJson(res, 400, {
        ok: false,
        log: `Corps JSON invalide — attendu {"${htmlInput ? 'html' : 'tex'}": "..."}`,
      });
      return;
    }

    const imageRefusal = scanLatexImages(images, maxImageBytes);
    if (imageRefusal) {
      sendJson(res, 422, { ok: false, log: `Images refusées : ${imageRefusal}` });
      return;
    }

    if (htmlInput) {
      if (!html.trim()) {
        sendJson(res, 400, { ok: false, log: 'Champ html vide' });
        return;
      }
      if (html.length > maxHtmlBytes) {
        sendJson(res, 413, { ok: false, log: `Document trop volumineux (max ${maxHtmlBytes} octets)` });
        return;
      }
      const sanitized = sanitizeEditedHtml(html);
      if (sanitized.refusal) {
        sendJson(res, 422, { ok: false, log: `Document refusé : ${sanitized.refusal}` });
        return;
      }
      html = sanitized.html;
    } else {
      if (!tex.trim()) {
        sendJson(res, 400, { ok: false, log: 'Champ tex vide' });
        return;
      }
      if (tex.length > maxSourceBytes) {
        sendJson(res, 413, { ok: false, log: `Source LaTeX trop volumineuse (max ${maxSourceBytes} octets)` });
        return;
      }
      const refusal = scanLatexSource(tex);
      if (refusal) {
        sendJson(res, 422, { ok: false, log: `Source refusée : ${refusal}` });
        return;
      }
      // Seules les images réellement jointes survivent : les autres références
      // deviennent un cadre « figure » (cf. neutralizeUnknownGraphics).
      tex = neutralizeUnknownGraphics(tex, images.map((image) => image.name));
    }

    const tools = await probeTools();
    if (path === '/compile' && !tools.pdf) {
      sendJson(res, 503, { ok: false, log: 'latexmk indisponible sur le serveur' });
      return;
    }
    if (path !== '/compile' && !tools.docx) {
      sendJson(res, 503, { ok: false, log: 'pandoc indisponible sur le serveur' });
      return;
    }

    const slot = acquireSlot();
    if (slot === null) {
      sendJson(res, 429, { ok: false, log: 'File de compilation pleine — réessayez dans quelques secondes' });
      return;
    }
    await slot;

    let workDir = '';
    let schemasProduits: Array<{ name: string; data: Buffer }> = [];
    try {
      workDir = await mkdtemp(join(tmpdir(), 'corrector-latex-'));

      // Images déposées à côté de la source : xelatex les lit via \includegraphics
      // (openin_any='p' restreint la lecture à ce répertoire) et pandoc les
      // embarque dans le DOCX. Pour /html, pandoc n'a pas besoin de les lire —
      // il écrit <img src="nom.png"> et le client y substitue sa data: URL.
      for (const image of images) {
        await writeFile(join(workDir, image.name), Buffer.from(image.data, 'base64'));
      }

      // Chemin Word uniquement : ce que pandoc ne sait pas rendre est traité
      // AVANT lui. Le PDF (/compile) n'y touche pas — xelatex dessine tout
      // nativement, et convertir y perdrait de la qualité pour rien.
      let schemasEchoues = 0;
      if (!htmlInput && path !== '/compile') {
        // mhchem : conversion textuelle, sans compilation (cf. lib/chimie-unicode).
        tex = convertirChimieUnicode(tex);
        if (tools.schemas) {
          const rendu = await rendreSchemas(tex, workDir, timeoutMs);
          tex = rendu.tex;
          schemasEchoues = rendu.echecs;
          schemasProduits = rendu.images;
        } else if (repererSchemas(tex).length > 0) {
          log.warn('latex', 'schemas non convertis (pdftoppm absent)', { path });
        }
      }

      if (htmlInput) await writeFile(join(workDir, 'doc.html'), html, 'utf8');
      else await writeFile(join(workDir, 'doc.tex'), tex, 'utf8');
      if (schemasEchoues > 0) {
        log.warn('latex', 'schemas non compiles', { path, echecs: schemasEchoues });
      }

      // /html — source de l'éditeur Word : HTML sémantique (h2/ol/table) avec
      // les maths en MathML. L'annotation TeX embarquée par pandoc permet à son
      // lecteur HTML de reconstituer les formules à l'identique au retour.
      if (path === '/html') {
        const result = await execInDir(
          'pandoc',
          ['doc.tex', '-f', 'latex', '-t', 'html5', '--mathml', '--sandbox', '-o', 'doc.html'],
          workDir,
          timeoutMs,
        );
        if (!result.ok) {
          sendJson(res, 422, { ok: false, log: (result.stderr || result.stdout).slice(-LOG_TAIL_CHARS) });
          return;
        }
        let produced = await readFile(join(workDir, 'doc.html'), 'utf8');
        // pandoc tourne ici avec --sandbox : il n'a PAS lu les PNG, il a écrit
        // <img src="corrector-schema-1.png">. Le client sait inliner les images
        // du professeur (doc.images) mais ignore tout de celles qu'on vient de
        // fabriquer — c'est donc au serveur de les incruster.
        for (const schema of schemasProduits) {
          const dataUrl = `data:image/png;base64,${schema.data.toString('base64')}`;
          produced = produced.split(`src="${schema.name}"`).join(`src="${dataUrl}"`);
        }
        sendJson(res, 200, { ok: true, html: produced });
        return;
      }

      // /docx-from-html — retour de l'éditeur Word. Même --reference-doc que
      // /convert : le document édité garde la géométrie A4 / marges 2 cm.
      // --sandbox : pandoc ne va chercher AUCUNE ressource distante (le writer
      // docx télécharge les <img src="http…"> sinon → SSRF depuis le serveur).
      if (path === '/docx-from-html') {
        await writeFile(join(workDir, 'ref.docx'), Buffer.from(REFERENCE_DOCX_BASE64, 'base64'));
        const result = await execInDir(
          'pandoc',
          ['doc.html', '-f', 'html', '-t', 'docx', '--reference-doc=ref.docx', '--sandbox', '-o', 'doc.docx'],
          workDir,
          timeoutMs,
        );
        if (!result.ok) {
          sendJson(res, 422, { ok: false, log: (result.stderr || result.stdout).slice(-LOG_TAIL_CHARS) });
          return;
        }
        const docx = await readFile(join(workDir, 'doc.docx'));
        sendJson(res, 200, { ok: true, docx: docx.toString('base64') });
        return;
      }

      if (path === '/compile') {
        const result = await execInDir(
          'latexmk',
          ['-xelatex', '-halt-on-error', '-interaction=nonstopmode', '-no-shell-escape', 'doc.tex'],
          workDir,
          timeoutMs,
        );
        if (!result.ok) {
          const log = await readFile(join(workDir, 'doc.log'), 'utf8').catch(() => result.stderr || result.stdout);
          sendJson(res, 422, { ok: false, log: extractLatexLog(log) });
          return;
        }
        const pdf = await readFile(join(workDir, 'doc.pdf'));
        sendJson(res, 200, { ok: true, pdf: pdf.toString('base64') });
        return;
      }

      // /convert — équations LaTeX → OMML natif Word. TikZ, chemfig et
      // schemestart sont déjà passés en images plus haut (rendreSchemas), et
      // les \ce{} en Unicode : pandoc les aurait tous perdus en silence.
      // --reference-doc : géométrie de page A4 + marges 2 cm (le modèle par
      // défaut de pandoc n'a ni pgSz ni pgMar → document sans aucune marge).
      await writeFile(join(workDir, 'ref.docx'), Buffer.from(REFERENCE_DOCX_BASE64, 'base64'));
      const result = await execInDir(
        'pandoc',
        ['doc.tex', '-f', 'latex', '-t', 'docx', '--reference-doc=ref.docx', '-o', 'doc.docx'],
        workDir,
        timeoutMs,
      );
      if (!result.ok) {
        sendJson(res, 422, { ok: false, log: (result.stderr || result.stdout).slice(-LOG_TAIL_CHARS) });
        return;
      }
      const docx = await readFile(join(workDir, 'doc.docx'));
      sendJson(res, 200, { ok: true, docx: docx.toString('base64') });
    } catch (err) {
      log.error('latex', 'compile/convert failed', serializeError(err));
      sendJson(res, 500, { ok: false, log: err instanceof Error ? err.message : String(err) });
    } finally {
      releaseSlot();
      if (workDir) await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }
  });
}
