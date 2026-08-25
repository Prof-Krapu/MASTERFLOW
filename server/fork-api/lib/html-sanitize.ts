/**
 * Nettoyage de l'HTML de l'éditeur Word — module FEUILLE, sans dépendance Node.
 *
 * Extrait de `latex-routes.ts` (qui importe `node:child_process` et n'est donc pas
 * importable depuis le navigateur) pour être partagé par ses DEUX consommateurs :
 *
 *  - le serveur, route `/api/latex/docx-from-html` : l'HTML part chez pandoc, dont le
 *    writer docx va chercher les ressources distantes — la menace y est l'ACCÈS RÉSEAU
 *    (SSRF), d'où le refus de toute URL qui ne soit pas data:/https:/mailto: ;
 *  - le client, retouche IA d'une sélection Word (`lib/assistant-selection.ts`) : là,
 *    l'HTML vient d'un LLM et il est injecté DANS LE DOM VIVANT du contentEditable.
 *    Un `<script>` ou un `onerror=` s'y exécuterait.
 *
 * Les deux menaces se couvrent avec les mêmes listes blanches. Les dupliquer aurait
 * garanti qu'elles divergent un jour, du côté qu'on ne surveille pas.
 *
 * Tout est en manipulation de chaîne — pas de DOM — pour rester testable sous
 * `tsx --test` et utilisable des deux côtés.
 */

/**
 * L'HTML arrive d'un contentEditable : il mélange le HTML sémantique de pandoc
 * (titres, listes, tableaux, MathML) et les scories du navigateur (<div>, <br>,
 * <b>, <font>, styles inline).
 */
export const ALLOWED_HTML_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'ins', 'sub', 'sup',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'blockquote', 'pre', 'code', 'a', 'img', 'figure', 'figcaption', 'section', 'article',
  // MathML (pandoc -t html5 --mathml ; relu tel quel par le lecteur HTML)
  'math', 'semantics', 'annotation', 'annotation-xml', 'mrow', 'mi', 'mo', 'mn',
  'ms', 'mtext', 'mspace', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot',
  'mstyle', 'mover', 'munder', 'munderover', 'mtable', 'mtr', 'mtd', 'mlabeledtr',
  'mpadded', 'mphantom', 'menclose', 'mfenced', 'merror', 'maction', 'mmultiscripts',
  'mprescripts', 'none',
]);

/** Élément supprimé AVEC son contenu (le reste ne perd que son balisage). */
const STRIPPED_ELEMENTS = ['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg'];

/** Balises orphelines (sans fermeture) à supprimer entièrement. */
const STRIPPED_VOID_ELEMENTS = ['link', 'meta', 'base', 'param', 'source', 'track'];

export const ALLOWED_ATTRIBUTES = new Set([
  'class', 'id', 'title', 'alt', 'href', 'src', 'colspan', 'rowspan', 'start',
  'reversed', 'value', 'scope', 'span', 'dir', 'lang',
  // MathML
  'display', 'xmlns', 'encoding', 'accent', 'accentunder', 'mathvariant',
  'displaystyle', 'scriptlevel', 'stretchy', 'fence', 'separator', 'columnalign',
  'rowalign', 'open', 'close', 'notation', 'width', 'linethickness',
]);

/** Seules propriétés CSS conservées : celles que la barre d'outils produit. */
const ALLOWED_STYLE_PROPERTIES = new Set([
  'text-align', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line',
]);

/** Schémas d'URL autorisés — tout le reste est un refus, pas un nettoyage. */
const ALLOWED_URL_SCHEMES = ['data:', 'https:', 'mailto:'];

function isAllowedUrl(value: string): boolean {
  const trimmed = value.trim().replace(/^["']|["']$/g, '');
  // Une URL relative ou une ancre ne déclenche aucun accès réseau chez pandoc :
  // le fichier est seul dans un mkdtemp, la lecture échouera au pire (warning).
  if (trimmed === '' || trimmed.startsWith('#')) return true;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return !trimmed.startsWith('//');
  return ALLOWED_URL_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme));
}

function sanitizeStyleAttribute(value: string): string {
  return value
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const property = declaration.split(':')[0]?.trim().toLowerCase();
      return !!property && ALLOWED_STYLE_PROPERTIES.has(property);
    })
    .join('; ');
}

// Attribut HTML : nom, puis valeur entre quotes ou nue.
const ATTRIBUTE_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+)|([a-zA-Z_:][-a-zA-Z0-9_:.]*)/g;
// Balise complète : les valeurs entre quotes peuvent contenir des '>'.
const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g;

export interface HtmlSanitizeResult {
  html: string;
  refusal: string | null;
}

/** Nettoie l'HTML édité, ou renvoie un motif de refus (URL non autorisée). */
export function sanitizeEditedHtml(input: string): HtmlSanitizeResult {
  let html = input
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  for (const tag of STRIPPED_ELEMENTS) {
    html = html
      .replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, 'gi'), '')
      // Balise ouvrante orpheline (contentEditable tronqué) : on jette la balise.
      .replace(new RegExp(`</?${tag}\\b[^>]*>`, 'gi'), '');
  }
  for (const tag of STRIPPED_VOID_ELEMENTS) {
    html = html.replace(new RegExp(`<${tag}\\b[^>]*>`, 'gi'), '');
  }

  let refusal: string | null = null;

  const cleaned = html.replace(TAG_RE, (full, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(name)) return ''; // balise jetée, contenu conservé
    if (full.startsWith('</')) return `</${name}>`;

    const kept: string[] = [];
    for (const match of (rawAttrs || '').matchAll(ATTRIBUTE_RE)) {
      const attrName = (match[1] || match[3] || '').toLowerCase();
      if (!attrName) continue;
      // Gestionnaires d'événements : jetés sans discussion.
      if (attrName.startsWith('on')) continue;
      const raw = match[2];
      const value = raw === undefined ? '' : raw.replace(/^["']|["']$/g, '');

      if (attrName === 'style') {
        const style = sanitizeStyleAttribute(value);
        if (style) kept.push(`style="${escapeAttribute(style)}"`);
        continue;
      }
      if (!ALLOWED_ATTRIBUTES.has(attrName)) continue;
      if ((attrName === 'href' || attrName === 'src') && !isAllowedUrl(value)) {
        refusal = `URL non autorisée dans l'attribut ${attrName} : ${value.slice(0, 80)}`;
        continue;
      }
      kept.push(raw === undefined ? attrName : `${attrName}="${escapeAttribute(value)}"`);
    }

    const selfClosing = full.endsWith('/>') || name === 'br' || name === 'hr' || name === 'img' || name === 'col';
    const attrs = kept.length > 0 ? ` ${kept.join(' ')}` : '';
    return selfClosing ? `<${name}${attrs} />` : `<${name}${attrs}>`;
  });

  return { html: cleaned, refusal };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
