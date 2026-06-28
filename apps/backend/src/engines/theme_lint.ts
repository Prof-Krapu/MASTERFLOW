import {
  ThemeLintReportSchema,
  ThemePackSchema,
  type ThemeFontRef,
  type ThemeLintFinding,
  type ThemeLintReport,
  type ThemePack,
} from '@masterflow/shared';

const TOKEN_REFERENCE = /^\{([a-zA-Z0-9_.-]+)\}$/;
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_REFERENCE_DEPTH = 12;

type Rgb = {r: number; g: number; b: number};

function parseHex(value: string): Rgb | null {
  const match = HEX_COLOR.exec(value);
  if (!match?.[1]) return null;
  const raw = match[1].length === 3
    ? match[1].split('').map((char) => `${char}${char}`).join('')
    : match[1];
  const number = Number.parseInt(raw, 16);
  if (!Number.isFinite(number)) return null;
  return {
    r: (number >> 16) & 255,
    g: (number >> 8) & 255,
    b: number & 255,
  };
}

function luminance(rgb: Rgb): number {
  const channel = (value: number): number => {
    const normalized = value / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function tokenMap(theme: ThemePack): Map<string, string> {
  return new Map([
    ['palette.primary', theme.palette.primary],
    ['palette.surface', theme.palette.surface],
    ['palette.text', theme.palette.text],
    ['palette.accent', theme.palette.accent],
    ...Object.entries(theme.token_aliases).map(([key, value]) => [`tokens.${key}`, value] as const),
  ]);
}

function resolveColor(
  value: string,
  tokens: Map<string, string>,
): {color: string | null; error: 'broken' | 'cycle' | 'invalid' | null} {
  let current = value;
  const visited = new Set<string>();

  for (let depth = 0; depth < MAX_REFERENCE_DEPTH; depth += 1) {
    if (HEX_COLOR.test(current)) return {color: current, error: null};
    const reference = TOKEN_REFERENCE.exec(current)?.[1];
    if (!reference) return {color: null, error: 'invalid'};
    if (visited.has(reference)) return {color: null, error: 'cycle'};
    visited.add(reference);
    const next = tokens.get(reference);
    if (!next) return {color: null, error: 'broken'};
    current = next;
  }

  return {color: null, error: 'cycle'};
}

function colorFinding(
  path: string,
  error: 'broken' | 'cycle' | 'invalid',
): ThemeLintFinding {
  if (error === 'broken') {
    return {
      severity: 'error',
      code: 'broken_token_reference',
      path,
      message: 'La référence de token ne correspond à aucune valeur déclarée.',
    };
  }
  if (error === 'cycle') {
    return {
      severity: 'error',
      code: 'cyclic_token_reference',
      path,
      message: 'La chaîne de tokens contient une boucle.',
    };
  }
  return {
    severity: 'error',
    code: 'invalid_color',
    path,
    message: 'La couleur doit être un hexadécimal #RGB/#RRGGBB ou une référence de token.',
  };
}

function lintFont(path: string, font: ThemeFontRef, findings: ThemeLintFinding[]): void {
  if (!font.source_ref) {
    findings.push({
      severity: 'error',
      code: 'font_source_missing',
      path,
      message: `La fonte ${font.family} ne déclare aucune provenance.`,
    });
  }
  if (font.license_status === 'unknown') {
    findings.push({
      severity: 'warning',
      code: 'font_license_unknown',
      path,
      message: `La licence de ${font.family} doit être vérifiée avant activation.`,
    });
  }
  if (font.license_status === 'restricted') {
    findings.push({
      severity: 'error',
      code: 'font_license_restricted',
      path,
      message: `La fonte ${font.family} ne peut pas être activée sur ce scope.`,
    });
  }
}

/**
 * Contrôle déterministe d'un thème candidat.
 * Ne charge aucune fonte, n'applique aucun CSS et ne modifie aucun thème actif.
 */
export function lintThemePack(input: ThemePack): ThemeLintReport {
  const theme = ThemePackSchema.parse(input);
  const findings: ThemeLintFinding[] = [];
  const tokens = tokenMap(theme);

  for (const [path, value] of tokens) {
    const result = resolveColor(value, tokens);
    if (result.error) findings.push(colorFinding(path, result.error));
  }

  lintFont('fonts.body', theme.fonts.body, findings);
  lintFont('fonts.heading', theme.fonts.heading, findings);
  if (theme.fonts.display) lintFont('fonts.display', theme.fonts.display, findings);

  for (const pair of theme.contrast_pairs) {
    const foreground = resolveColor(pair.foreground, tokens);
    const background = resolveColor(pair.background, tokens);
    if (foreground.error) {
      findings.push(colorFinding(`contrast_pairs.${pair.pair_id}.foreground`, foreground.error));
      continue;
    }
    if (background.error) {
      findings.push(colorFinding(`contrast_pairs.${pair.pair_id}.background`, background.error));
      continue;
    }

    const foregroundRgb = foreground.color ? parseHex(foreground.color) : null;
    const backgroundRgb = background.color ? parseHex(background.color) : null;
    if (!foregroundRgb || !backgroundRgb) continue;
    const ratio = contrastRatio(foregroundRgb, backgroundRgb);
    const minimum = pair.usage === 'large_text' ? 3 : pair.usage === 'decorative' ? 1 : 4.5;
    if (ratio < minimum) {
      findings.push({
        severity: pair.usage === 'decorative' ? 'info' : 'warning',
        code: 'insufficient_contrast',
        path: `contrast_pairs.${pair.pair_id}`,
        message: `Contraste ${ratio.toFixed(2)}:1 inférieur au minimum ${minimum}:1.`,
      });
    }
  }

  return ThemeLintReportSchema.parse({
    theme_id: theme.theme_id,
    valid: findings.every((finding) => finding.severity !== 'error'),
    findings,
    checked_at: Date.now(),
  });
}
