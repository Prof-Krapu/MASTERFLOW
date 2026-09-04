/**
 * Analyse locale et déterministe de marqueurs langagiers.
 *
 * Le module est volontairement pur : il ne lit ni n'écrit aucun message et ne fait
 * aucun appel provider. Les sorties ne contiennent que des compteurs et des fragments
 * courts destinés à devenir récurrents après agrégation.
 */

export const DEFAULT_LANGUAGE_OVERLAY_INTENSITY = 0.30;
export const MAX_LANGUAGE_OVERLAY_INTENSITY = 0.40;
export const INDIVIDUAL_READY_SAMPLE_COUNT = 20;
export const COLLECTIVE_MIN_CONTRIBUTORS = 3;

const MAX_MESSAGE_CHARS = 1_500;
const MAX_CANDIDATES = 24;
const MAX_EXPRESSION_CHARS = 40;

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /\b(?:sk|rk|pk)-[a-z0-9_-]{16,}\b/i,
  /\bBearer\s+[a-z0-9._~-]{16,}\b/i,
  /\b(?:password|mot_de_passe|api[_-]?key|secret)\s*[:=]\s*\S+/i,
  /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/,
];

const TRANSITIONS = [
  'alors', 'bon', 'bref', "d'ailleurs", 'donc', 'du coup', 'écoute', 'en fait',
  'en vrai', 'franchement', 'genre', 'je crois', 'je pense', 'mais', 'par contre',
  'tu vois', 'voilà',
] as const;

const STOP_WORDS = new Set([
  'a', 'au', 'aux', 'avec', 'ce', 'ces', 'dans', 'de', 'des', 'du', 'elle', 'en',
  'et', 'eux', 'il', 'je', 'la', 'le', 'les', 'leur', 'lui', 'ma', 'mais', 'me',
  'même', 'mes', 'moi', 'mon', 'ne', 'nos', 'notre', 'nous', 'on', 'ou', 'par',
  'pas', 'pour', 'qu', 'que', 'qui', 'sa', 'se', 'ses', 'son', 'sur', 'ta', 'te',
  'tes', 'toi', 'ton', 'tu', 'un', 'une', 'vos', 'votre', 'vous', 'y',
]);

export type LanguageMessageRejection =
  | 'too_short'
  | 'too_long'
  | 'code_block'
  | 'url_dominated'
  | 'quoted_content'
  | 'secret_like';

export type LanguageMetrics = {
  chars: number;
  words: number;
  sentences: number;
  questions: number;
  exclamations: number;
  ellipses: number;
  emojis: number;
  uppercase_words: number;
};

export type LanguageMessageAnalysis = {
  eligible: true;
  metrics: LanguageMetrics;
  expression_candidates: string[];
  transitions: string[];
} | {
  eligible: false;
  reason: LanguageMessageRejection;
};

export type LanguageAggregateState = {
  sample_count: number;
  metrics: LanguageMetrics;
  expression_counts: Record<string, number>;
  transition_counts: Record<string, number>;
};

export type LanguageStyleDerivedPreview = {
  sample_count: number;
  contributor_count: number;
  confidence: number;
  readiness: 'empty' | 'learning' | 'ready';
  rhythm: 'short' | 'balanced' | 'expansive' | null;
  recurring_expressions: string[];
  transitions: string[];
  question_ratio: number;
  exclamation_ratio: number;
};

function normalizeText(content: string): string {
  return content.normalize('NFC').replace(/\r\n?/g, '\n').trim();
}

function wordsOf(content: string): string[] {
  return content
    .toLocaleLowerCase('fr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-zà-ÿœ'-]+/gi)
    ?.map((word) => word.replace(/^[-']+|[-']+$/g, ''))
    .filter((word) => word.length > 1) ?? [];
}

function isUrlDominated(content: string): boolean {
  const urls = content.match(/https?:\/\/\S+/gi) ?? [];
  const urlChars = urls.reduce((sum, value) => sum + value.length, 0);
  return urls.length > 2 || (content.length > 0 && urlChars / content.length > 0.2);
}

function isQuotedContent(content: string): boolean {
  const meaningfulLines = content.split('\n').map((line) => line.trim()).filter(Boolean);
  if (meaningfulLines.length < 3) return false;
  const quotedLines = meaningfulLines.filter((line) => line.startsWith('>') || line.startsWith('“'));
  return quotedLines.length / meaningfulLines.length >= 0.5;
}

function extractTransitions(content: string): string[] {
  const normalized = ` ${content.toLocaleLowerCase('fr').replace(/[^a-zà-ÿœ' -]+/gi, ' ')} `;
  return TRANSITIONS.filter((candidate) => normalized.includes(` ${candidate} `)).slice(0, 5);
}

function extractExpressionCandidates(words: string[]): string[] {
  const candidates = new Set<string>();
  for (const size of [2, 3, 4, 5]) {
    for (let index = 0; index + size <= words.length; index += 1) {
      const tokens = words.slice(index, index + size);
      if (tokens.every((token) => STOP_WORDS.has(token))) continue;
      const expression = tokens.join(' ');
      if (expression.length < 5 || expression.length > MAX_EXPRESSION_CHARS) continue;
      candidates.add(expression);
      if (candidates.size >= MAX_CANDIDATES) return [...candidates];
    }
  }
  return [...candidates];
}

export function emptyLanguageAggregate(): LanguageAggregateState {
  return {
    sample_count: 0,
    metrics: {chars: 0, words: 0, sentences: 0, questions: 0, exclamations: 0, ellipses: 0, emojis: 0, uppercase_words: 0},
    expression_counts: {},
    transition_counts: {},
  };
}

export function analyzeLanguageMessage(content: string): LanguageMessageAnalysis {
  const normalized = normalizeText(content);
  if (normalized.length > MAX_MESSAGE_CHARS) return {eligible: false, reason: 'too_long'};
  if (/```|~~~/.test(normalized)) return {eligible: false, reason: 'code_block'};
  if (SECRET_PATTERNS.some((pattern) => pattern.test(normalized))) return {eligible: false, reason: 'secret_like'};
  if (isUrlDominated(normalized)) return {eligible: false, reason: 'url_dominated'};
  if (isQuotedContent(normalized)) return {eligible: false, reason: 'quoted_content'};

  const words = wordsOf(normalized);
  if (words.length < 3) return {eligible: false, reason: 'too_short'};
  const sentenceCount = Math.max(1, normalized.split(/[.!?…]+/).filter((part) => part.trim().length > 0).length);
  const uppercaseWords = normalized.match(/\b[A-ZÀ-ÝŒ]{2,}\b/g)?.length ?? 0;

  return {
    eligible: true,
    metrics: {
      chars: normalized.length,
      words: words.length,
      sentences: sentenceCount,
      questions: normalized.match(/\?/g)?.length ?? 0,
      exclamations: normalized.match(/!/g)?.length ?? 0,
      ellipses: normalized.match(/(?:\.\.\.|…)/g)?.length ?? 0,
      emojis: normalized.match(/\p{Extended_Pictographic}/gu)?.length ?? 0,
      uppercase_words: uppercaseWords,
    },
    expression_candidates: extractExpressionCandidates(words),
    transitions: extractTransitions(normalized),
  };
}

function incrementCounts(target: Record<string, number>, values: string[]): void {
  for (const value of new Set(values)) target[value] = (target[value] ?? 0) + 1;
}

export function mergeLanguageAnalysis(
  previous: LanguageAggregateState,
  analysis: LanguageMessageAnalysis,
): LanguageAggregateState {
  if (!analysis.eligible) return previous;
  const metrics = {...previous.metrics};
  for (const key of Object.keys(metrics) as Array<keyof LanguageMetrics>) {
    metrics[key] += analysis.metrics[key];
  }
  const expressionCounts = {...previous.expression_counts};
  const transitionCounts = {...previous.transition_counts};
  incrementCounts(expressionCounts, analysis.expression_candidates);
  incrementCounts(transitionCounts, analysis.transitions);
  return {
    sample_count: previous.sample_count + 1,
    metrics,
    expression_counts: expressionCounts,
    transition_counts: transitionCounts,
  };
}

function topCounts(counts: Record<string, number>, minimum: number): string[] {
  return Object.entries(counts)
    .filter(([, count]) => count >= minimum)
    .sort(([leftKey, leftCount], [rightKey, rightCount]) => rightCount - leftCount || leftKey.localeCompare(rightKey, 'fr'))
    .slice(0, 5)
    .map(([value]) => value);
}

function roundedRatio(value: number, denominator: number): number {
  return denominator <= 0 ? 0 : Math.round((value / denominator) * 1_000) / 1_000;
}

export function deriveIndividualStylePreview(state: LanguageAggregateState): LanguageStyleDerivedPreview {
  if (state.sample_count === 0) {
    return {sample_count: 0, contributor_count: 1, confidence: 0, readiness: 'empty', rhythm: null, recurring_expressions: [], transitions: [], question_ratio: 0, exclamation_ratio: 0};
  }
  const wordsPerSentence = state.metrics.words / Math.max(1, state.metrics.sentences);
  const rhythm = wordsPerSentence < 9 ? 'short' : wordsPerSentence > 18 ? 'expansive' : 'balanced';
  return {
    sample_count: state.sample_count,
    contributor_count: 1,
    confidence: Math.min(1, Math.round((state.sample_count / 40) * 100) / 100),
    readiness: state.sample_count >= INDIVIDUAL_READY_SAMPLE_COUNT ? 'ready' : 'learning',
    rhythm,
    recurring_expressions: topCounts(state.expression_counts, 3),
    transitions: topCounts(state.transition_counts, 3),
    question_ratio: roundedRatio(state.metrics.questions, state.metrics.sentences),
    exclamation_ratio: roundedRatio(state.metrics.exclamations, state.metrics.sentences),
  };
}

export function deriveCollectiveStylePreview(states: LanguageAggregateState[]): LanguageStyleDerivedPreview {
  const contributors = states.filter((state) => state.sample_count > 0);
  const sampleCount = contributors.reduce((sum, state) => sum + state.sample_count, 0);
  if (contributors.length < COLLECTIVE_MIN_CONTRIBUTORS) {
    return {sample_count: sampleCount, contributor_count: contributors.length, confidence: 0, readiness: sampleCount === 0 ? 'empty' : 'learning', rhythm: null, recurring_expressions: [], transitions: [], question_ratio: 0, exclamation_ratio: 0};
  }

  const expressionContributors: Record<string, number> = {};
  const transitionContributors: Record<string, number> = {};
  let wordsPerSentence = 0;
  let questionRatio = 0;
  let exclamationRatio = 0;
  for (const state of contributors) {
    for (const expression of topCounts(state.expression_counts, 3)) expressionContributors[expression] = (expressionContributors[expression] ?? 0) + 1;
    for (const transition of topCounts(state.transition_counts, 3)) transitionContributors[transition] = (transitionContributors[transition] ?? 0) + 1;
    wordsPerSentence += state.metrics.words / Math.max(1, state.metrics.sentences);
    questionRatio += state.metrics.questions / Math.max(1, state.metrics.sentences);
    exclamationRatio += state.metrics.exclamations / Math.max(1, state.metrics.sentences);
  }
  wordsPerSentence /= contributors.length;
  const rhythm = wordsPerSentence < 9 ? 'short' : wordsPerSentence > 18 ? 'expansive' : 'balanced';
  const averageSamples = sampleCount / contributors.length;
  const ready = averageSamples >= INDIVIDUAL_READY_SAMPLE_COUNT;

  return {
    sample_count: sampleCount,
    contributor_count: contributors.length,
    confidence: ready ? Math.min(1, Math.round((averageSamples / 40) * 100) / 100) : 0,
    readiness: ready ? 'ready' : 'learning',
    rhythm,
    recurring_expressions: topCounts(expressionContributors, 2),
    transitions: topCounts(transitionContributors, 2),
    question_ratio: Math.round((questionRatio / contributors.length) * 1_000) / 1_000,
    exclamation_ratio: Math.round((exclamationRatio / contributors.length) * 1_000) / 1_000,
  };
}
