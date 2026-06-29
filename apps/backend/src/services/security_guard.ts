import {Buffer} from 'node:buffer';

export type SecurityInputZone =
  | 'user_input'
  | 'candidate'
  | 'untrusted_external'
  | 'generated_output';

export type SecurityCapability =
  | 'chat'
  | 'rag'
  | 'memory'
  | 'action'
  | 'tool'
  | 'upload'
  | 'render';

export type SecurityThreatFamily =
  | 'none'
  | 'prompt_override'
  | 'secret_extraction'
  | 'scope_escape'
  | 'tool_misuse'
  | 'source_poisoning'
  | 'memory_poisoning'
  | 'unsafe_markup'
  | 'obfuscation'
  | 'repeated_bypass';

export type SecurityDisposition =
  | 'allow'
  | 'allow_with_warning'
  | 'refuse'
  | 'quarantine'
  | 'hard_stop_required';

export interface SecurityGuardDecision {
  disposition: SecurityDisposition;
  threat_family: SecurityThreatFamily;
  confidence: 'low' | 'medium' | 'high';
  input_zone: SecurityInputZone;
  affected_capability: SecurityCapability;
  safe_user_message: string;
  audit_code: string;
}

interface SecurityGuardInput {
  content: string;
  input_zone: SecurityInputZone;
  affected_capability: SecurityCapability;
}

const TYPO_TARGETS = [
  'ignore',
  'previous',
  'prior',
  'instructions',
  'system',
  'prompt',
  'reveal',
  'bypass',
] as const;

const EDUCATIONAL_PATTERN =
  /\b(explain|explique|analyse|analyze|cours|lesson|define|definis|exemple|example|teach|enseigne|qu est ce|what is)\b/;
const SECRET_TARGET_PATTERN =
  /\b(system prompt|prompt systeme|instructions? (systeme|internes?)|developer message|message developpeur|api key|access token|refresh token|password|mot de passe|private key|cle privee|secret)\b/;
const REVEAL_PATTERN =
  /\b(reveal|show|display|print|expose|affiche|montre|donne|repete|repeat|extract|extrais)\b/;
const PROMPT_OVERRIDE_PATTERN =
  /\b(ignore (all )?(previous|prior) instructions?|forget (all )?(previous|prior) instructions?|oublie (toutes? )?(les )?instructions?|developer mode|mode developpeur|jailbreak|bypass (security|safety|restrictions?|permissions?)|contourne (la )?(securite|restriction|permission))\b/;
const TOOL_MISUSE_PATTERN =
  /\b(delete|supprime|send|envoie|execute|run|lance)\b.{0,80}\b(without approval|sans validation|bypass permission|ignore permission|contourne la permission)\b/;
const SCOPE_ESCAPE_PATTERN =
  /\b(access|accede|ouvre|read|lis)\b.{0,80}\b(other user|autre utilisateur|hors scope|private project|projet prive d un autre)\b/;
const UNSAFE_MARKUP_PATTERN =
  /(<script\b|javascript\s*:|<img\b[^>]*\bsrc\s*=\s*['"]?https?:|display\s*:\s*none|visibility\s*:\s*hidden)/;

function stripDiacritics(value: string): string {
  return value.normalize('NFKD').replace(/\p{M}/gu, '');
}

function signature(value: string): string {
  if (value.length < 4) return value;
  return `${value[0]}${[...value.slice(1, -1)].sort().join('')}${value.at(-1)}`;
}

function repairTypoglycemia(token: string): string {
  if (token.length < 5) return token;
  const tokenSignature = signature(token);
  return TYPO_TARGETS.find(
    (target) => target.length === token.length && signature(target) === tokenSignature,
  ) ?? token;
}

function containsTypoglycemia(value: string): boolean {
  return stripDiacritics(value)
    .toLocaleLowerCase('fr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .some((token) => repairTypoglycemia(token) !== token);
}

function normalize(value: string): string {
  return stripDiacritics(value)
    .toLocaleLowerCase('fr')
    .replace(/[013457]/g, (character) => ({
      '0': 'o',
      '1': 'i',
      '3': 'e',
      '4': 'a',
      '5': 's',
      '7': 't',
    })[character] ?? character)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/)
    .map(repairTypoglycemia)
    .join(' ');
}

function decodedCandidates(content: string): string[] {
  const candidates: string[] = [];
  if (/%[0-9a-f]{2}/i.test(content)) {
    try {
      candidates.push(decodeURIComponent(content));
    } catch {
      // Une séquence percent-encoded invalide reste analysée sous sa forme brute.
    }
  }
  for (const token of content.match(/[A-Za-z0-9+/]{16,}={0,2}/g) ?? []) {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf8');
      if (/^[\x09\x0A\x0D\x20-\x7EÀ-ÿ]+$/u.test(decoded)) candidates.push(decoded);
    } catch {
      // Buffer est tolérant ; cette garde documente le fallback sans propagation.
    }
  }
  return candidates;
}

function collapseSpacedLetters(value: string): string {
  return value.replace(
    /(?:\b[\p{L}]\s+){3,}\p{L}\b/gu,
    (sequence) => sequence.replace(/\s+/g, ''),
  );
}

function blockedDisposition(zone: SecurityInputZone): SecurityDisposition {
  return zone === 'user_input' ? 'refuse' : 'quarantine';
}

function decision(
  input: SecurityGuardInput,
  threatFamily: SecurityThreatFamily,
  options?: {
    disposition?: SecurityDisposition;
    confidence?: SecurityGuardDecision['confidence'];
    auditCode?: string;
    message?: string;
  },
): SecurityGuardDecision {
  return {
    disposition: options?.disposition ?? blockedDisposition(input.input_zone),
    threat_family: threatFamily,
    confidence: options?.confidence ?? 'high',
    input_zone: input.input_zone,
    affected_capability: input.affected_capability,
    safe_user_message:
      options?.message ??
      "Cette demande ne peut pas être utilisée dans ce contexte. Je peux aider par une voie sûre.",
    audit_code: options?.auditCode ?? `security_${threatFamily}`,
  };
}

function classifyNormalized(
  input: SecurityGuardInput,
  normalized: string,
  obfuscated: boolean,
): SecurityGuardDecision | null {
  if (UNSAFE_MARKUP_PATTERN.test(input.content.toLocaleLowerCase('fr'))) {
    return decision(input, 'unsafe_markup');
  }
  if (REVEAL_PATTERN.test(normalized) && SECRET_TARGET_PATTERN.test(normalized)) {
    return decision(input, obfuscated ? 'obfuscation' : 'secret_extraction');
  }
  if (TOOL_MISUSE_PATTERN.test(normalized)) {
    return decision(input, obfuscated ? 'obfuscation' : 'tool_misuse');
  }
  if (SCOPE_ESCAPE_PATTERN.test(normalized)) {
    return decision(input, obfuscated ? 'obfuscation' : 'scope_escape');
  }
  if (PROMPT_OVERRIDE_PATTERN.test(normalized)) {
    if (EDUCATIONAL_PATTERN.test(normalized) && !obfuscated) {
      return decision(input, 'prompt_override', {
        disposition: 'allow_with_warning',
        confidence: 'medium',
        auditCode: 'security_prompt_override_educational',
        message: "Je peux expliquer le mécanisme sans révéler d'instructions privées ni ouvrir de capacité sensible.",
      });
    }
    return decision(input, obfuscated ? 'obfuscation' : 'prompt_override');
  }
  return null;
}

/**
 * Classifie un contenu avant qu'il entre dans le RAG, la mémoire ou une capacité.
 *
 * La décision ne contient jamais le contenu analysé. Elle ne modifie ni permission,
 * ni session, ni hard stop : les autorités métier existantes restent souveraines.
 */
export function classifySecurityInput(input: SecurityGuardInput): SecurityGuardDecision {
  const normalized = normalize(input.content);
  const direct = classifyNormalized(input, normalized, containsTypoglycemia(input.content));
  if (direct) return direct;

  const compact = normalize(collapseSpacedLetters(input.content));
  if (compact !== normalized) {
    const compactDecision = classifyNormalized(input, compact, true);
    if (compactDecision) return compactDecision;
  }

  for (const decoded of decodedCandidates(input.content)) {
    const decodedDecision = classifyNormalized({...input, content: decoded}, normalize(decoded), true);
    if (decodedDecision) return decodedDecision;
  }

  return decision(input, 'none', {
    disposition: 'allow',
    confidence: 'high',
    auditCode: 'security_clear',
    message: '',
  });
}
