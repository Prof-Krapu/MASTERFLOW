/**
 * Conversion des formules mhchem `\ce{…}` en texte Unicode, pour le chemin Word.
 *
 * POURQUOI. pandoc ne connaît pas mhchem. Mesuré (pandoc 3.10) :
 *  - `\ce{…}` EN LIGNE est **supprimé sans trace** — « la combustion \ce{CH4 +
 *    2O2 -> CO2 + 2H2O} est complète » devient « la combustion est complète ».
 *    La phrase reste grammaticale : le professeur ne peut pas s'en apercevoir.
 *    C'est la perte la plus dangereuse de toute la chaîne.
 *  - en mode maths, la commande survit mais **en TeX brut**, non rendue.
 *
 * POURQUOI L'UNICODE ET PAS UNE IMAGE. Une formule en ligne rendue en image
 * casserait le fil du texte et l'édition dans Word, et coûterait une
 * compilation xelatex par formule — une feuille de chimie en compte des
 * dizaines. « H₂O » reste du texte : lisible, cherchable, corrigeable.
 * Les schémas de molécules (chemfig), eux, n'ont pas d'équivalent textuel :
 * ils partent bien en image (voir rendreSchemas dans latex-routes.ts).
 *
 * PRINCIPE DE PRUDENCE. Tout ce que l'analyse ne couvre pas est laissé
 * INTACT plutôt que mutilé — même règle que convertirAccentsLatex.
 */

const INDICES: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

const EXPOSANTS: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻',
};

/** Flèches de réaction, de la plus longue à la plus courte — l'ordre compte :
 *  `<=>` doit être essayé avant `<=`, sinon il reste un `>` orphelin. */
const FLECHES: Array<[string, string]> = [
  ['<=>>', '⇌'],
  ['<<=>', '⇌'],
  ['<=>', '⇌'],
  ['<->', '↔'],
  ['->', '→'],
  ['<-', '←'],
  ['=>', '⇒'],
  ['<=', '⇐'],
];

function enIndice(chiffres: string): string {
  return [...chiffres].map((c) => INDICES[c] ?? c).join('');
}

function enExposant(signes: string): string {
  return [...signes].map((c) => EXPOSANTS[c] ?? c).join('');
}

/**
 * Corps d'un `\ce{…}` → Unicode.
 *
 * La règle qui porte tout : **un chiffre est un indice s'il suit un symbole
 * chimique ou une parenthèse fermante, un coefficient sinon**. C'est ce qui
 * distingue le « 2 » de `H2O` (indice) de celui de `2H2O` (stœchiométrie).
 */
export function convertirCorpsCe(corps: string): string {
  let out = '';
  let i = 0;
  // Vrai quand le caractère précédent peut porter un indice (lettre ou `)`).
  let porteIndice = false;

  while (i < corps.length) {
    const reste = corps.slice(i);

    const fleche = FLECHES.find(([motif]) => reste.startsWith(motif));
    if (fleche) {
      out += ` ${fleche[1]} `;
      i += fleche[0].length;
      porteIndice = false;
      continue;
    }

    const c = corps[i]!;

    // Exposant explicite : ^2+, ^{2+}, ^-
    if (c === '^') {
      const m = /^\^\{?([0-9]*[+\-−]?)\}?/.exec(reste);
      if (m?.[1]) {
        out += enExposant(m[1]);
        i += m[0].length;
        porteIndice = false;
        continue;
      }
    }

    // Indice explicite : _2, _{12}
    if (c === '_') {
      const m = /^_\{?([0-9]+)\}?/.exec(reste);
      if (m?.[1]) {
        out += enIndice(m[1]);
        i += m[0].length;
        porteIndice = false;
        continue;
      }
    }

    if (c >= '0' && c <= '9') {
      const m = /^[0-9]+/.exec(reste)!;
      // Un chiffre qui suit un symbole est TOUJOURS un indice, jamais une
      // charge — y compris devant un `+`. Vérifié en compilant mhchem lui-même :
      // `\ce{Fe3+}` rend Fe₃⁺ et non Fe³⁺, seul `^` produit un exposant.
      // Une heuristique « chiffre puis + = charge » ferait diverger le Word du
      // PDF, alors que les deux doivent montrer la même chose au professeur.
      out += porteIndice ? enIndice(m[0]) : m[0];
      i += m[0].length;
      // Un coefficient ne « porte » rien : dans `2H2O`, le H qui suit ouvre un
      // nouveau symbole. On garde donc porteIndice inchangé (false).
      continue;
    }

    // `*` (ou `.`) entre deux espèces : point médian des hydrates, tel que
    // mhchem le compose — « CuSO4*5H2O » → « CuSO₄ · 5H₂O ».
    if ((c === '*' || c === '.') && porteIndice && /^[\s]*[0-9A-Za-z]/.test(corps.slice(i + 1))) {
      out += ' · ';
      i += 1;
      while (corps[i] === ' ') i += 1;
      porteIndice = false;
      continue;
    }

    // Charge seule collée à un symbole : Na+ , Cl-
    if ((c === '+' || c === '-' || c === '−') && porteIndice) {
      // Un `+` entouré d'espaces est un séparateur d'espèces, pas une charge.
      const precede = corps[i - 1];
      const suit = corps[i + 1];
      if (precede !== ' ' && (suit === undefined || suit === ' ' || suit === '+' || suit === '-')) {
        out += enExposant(c);
        i += 1;
        continue;
      }
    }

    if (/[A-Za-z]/.test(c)) {
      out += c;
      porteIndice = true;
      i += 1;
      continue;
    }

    if (c === ')' || c === ']') {
      out += c;
      porteIndice = true;
      i += 1;
      continue;
    }

    // Espaces, +, (, ·, états (aq)/(s)… : recopiés tels quels.
    out += c;
    porteIndice = false;
    i += 1;
  }

  return out.replace(/ {2,}/g, ' ');
}

/** Fin du `\ce{` ouvert à `debut`, accolades équilibrées. -1 si non fermé. */
function finAccolade(texte: string, debut: number): number {
  let profondeur = 0;
  for (let i = debut; i < texte.length; i++) {
    const c = texte[i];
    if (c === '\\') {
      i++;
      continue;
    }
    if (c === '{') profondeur++;
    else if (c === '}' && --profondeur === 0) return i;
  }
  return -1;
}

/**
 * Remplace tous les `\ce{…}` d'un document par leur écriture Unicode.
 *
 * S'applique aussi à l'intérieur des `\[ … \]` : la commande y survivait à
 * pandoc, mais en TeX brut — donc illisible pour le professeur comme pour
 * l'élève. Un `\ce{}` non refermé est laissé tel quel.
 */
export function convertirChimieUnicode(tex: string): string {
  let out = '';
  let i = 0;
  for (;;) {
    const j = tex.indexOf('\\ce{', i);
    if (j === -1) {
      out += tex.slice(i);
      return out;
    }
    const fin = finAccolade(tex, j + 3);
    if (fin === -1) {
      out += tex.slice(i);
      return out;
    }
    out += tex.slice(i, j) + convertirCorpsCe(tex.slice(j + 4, fin));
    i = fin + 1;
  }
}
