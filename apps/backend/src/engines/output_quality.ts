import {
  OutputPromiseSchema,
  OutputQualityEvidenceSchema,
  OutputQualityReportSchema,
  type OutputPromise,
  type OutputQualityEvidence,
  type OutputQualityReport,
} from '@masterflow/shared';

/**
 * Vérifie qu'une sortie tient une promesse explicite.
 * Cette fonction ne valide pas à la place de l'utilisateur et ne lance aucune retake.
 */
export function evaluateOutputPromise(input: {
  promise: OutputPromise;
  evidence: OutputQualityEvidence[];
  fallbacks_used?: string[];
}): OutputQualityReport {
  const promise = OutputPromiseSchema.parse(input.promise);
  const evidence = input.evidence.map((item) => OutputQualityEvidenceSchema.parse(item));
  const fallbacks = [...new Set(input.fallbacks_used ?? [])];
  const evidenceTypes = new Set(evidence.map((item) => item.evidence_type));
  const missing = promise.required_evidence.filter((type) => !evidenceTypes.has(type));
  const forbidden = fallbacks.filter(
    (fallback) =>
      promise.forbidden_fallbacks.includes(fallback) &&
      !promise.approved_fallbacks.includes(fallback),
  );
  const reasons: string[] = [];
  let verdict: OutputQualityReport['verdict'] = 'pass';

  if (promise.status === 'candidate' || !promise.user_approved) {
    reasons.push('output_promise_not_locked');
    verdict = 'block';
  }
  if (missing.length > 0) {
    reasons.push(`missing_evidence:${missing.join(',')}`);
    verdict = 'block';
  }
  if (forbidden.length > 0) {
    reasons.push(`forbidden_fallback:${forbidden.join(',')}`);
    verdict = 'block';
  }
  if (
    verdict === 'pass' &&
    evidence.some((item) => item.confidence < 0.6)
  ) {
    reasons.push('low_confidence_evidence');
    verdict = 'warn';
  }

  return OutputQualityReportSchema.parse({
    promise_id: promise.promise_id,
    verdict,
    missing_evidence: missing,
    forbidden_fallbacks_used: forbidden,
    reasons,
  });
}
