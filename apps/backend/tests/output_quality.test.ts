import {describe, expect, it} from 'vitest';

import type {OutputPromise} from '@masterflow/shared';

import {evaluateOutputPromise} from '../src/engines/output_quality.ts';

const lockedPromise: OutputPromise = {
  promise_id: 'promise-1',
  output_family: 'visual_static',
  quality_floor: 'presentable',
  required_evidence: ['reference_provenance', 'owner_visual_review'],
  forbidden_fallbacks: ['silent_style_downgrade'],
  approved_fallbacks: [],
  status: 'locked',
  user_approved: true,
};

describe('output quality promise', () => {
  it('passe quand la promesse verrouillée possède toutes ses preuves', () => {
    const report = evaluateOutputPromise({
      promise: lockedPromise,
      evidence: [
        {evidence_id: 'e1', evidence_type: 'reference_provenance', confidence: 1, source_ref: 'ref:1'},
        {evidence_id: 'e2', evidence_type: 'owner_visual_review', confidence: 0.9, source_ref: 'review:1'},
      ],
    });
    expect(report.verdict).toBe('pass');
  });

  it('bloque une promesse candidate même si les preuves existent', () => {
    const report = evaluateOutputPromise({
      promise: {...lockedPromise, status: 'candidate', user_approved: false},
      evidence: [
        {evidence_id: 'e1', evidence_type: 'reference_provenance', confidence: 1, source_ref: 'ref:1'},
        {evidence_id: 'e2', evidence_type: 'owner_visual_review', confidence: 1, source_ref: 'review:1'},
      ],
    });
    expect(report).toMatchObject({
      verdict: 'block',
      reasons: ['output_promise_not_locked'],
    });
  });

  it('bloque les preuves manquantes et les downgrades non approuvés', () => {
    const report = evaluateOutputPromise({
      promise: lockedPromise,
      evidence: [],
      fallbacks_used: ['silent_style_downgrade'],
    });
    expect(report.verdict).toBe('block');
    expect(report.missing_evidence).toEqual([
      'reference_provenance',
      'owner_visual_review',
    ]);
    expect(report.forbidden_fallbacks_used).toEqual(['silent_style_downgrade']);
  });

  it('avertit quand une preuve est présente mais peu fiable', () => {
    const report = evaluateOutputPromise({
      promise: lockedPromise,
      evidence: [
        {evidence_id: 'e1', evidence_type: 'reference_provenance', confidence: 0.5, source_ref: 'ref:1'},
        {evidence_id: 'e2', evidence_type: 'owner_visual_review', confidence: 0.9, source_ref: 'review:1'},
      ],
    });
    expect(report.verdict).toBe('warn');
    expect(report.reasons).toContain('low_confidence_evidence');
  });
});
