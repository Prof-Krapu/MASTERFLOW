import {AdapterRegistryEntrySchema} from '@masterflow/shared';
import {describe, expect, it} from 'vitest';

import {
  getAdapterForRole,
  listAdapterRegistry,
  listAdaptersForRole,
  requireExecutableAdapter,
} from '../src/engines/adapter_registry.ts';

describe('adapter registry PR-CB1', () => {
  it('déclare les adapters attendus sans capacité live fictive', () => {
    const adapters = listAdapterRegistry();

    expect(adapters.map((entry) => entry.adapter_id)).toEqual([
      'ocr-submission-v1',
      'morphological-reference-v1',
      'wooclap-import-v1',
      'transcript-import-v1',
      'teacher-note-v1',
    ]);
    expect(adapters.every((entry) => entry.runtime_status !== 'live')).toBe(true);
    expect(adapters.every((entry) => entry.ui_status !== 'actionable')).toBe(true);
    expect(adapters.every((entry) => entry.executor_ref === null)).toBe(true);
  });

  it('n expose aux étudiants que l adapter morphologique privé', () => {
    expect(listAdaptersForRole('student').map((entry) => entry.adapter_id)).toEqual([
      'morphological-reference-v1',
    ]);
    expect(listAdaptersForRole('teacher')).toHaveLength(5);
    expect(getAdapterForRole('ocr-submission-v1', 'student')).toBeNull();
    expect(getAdapterForRole('ocr-submission-v1', 'teacher')?.kind).toBe('ocr_submission');
  });

  it('mutualise le runner OCR sans mutualiser les contrats métier', () => {
    const submission = getAdapterForRole('ocr-submission-v1', 'teacher');
    const morphology = getAdapterForRole('morphological-reference-v1', 'student');

    expect(submission?.runner_family).toBe('ocr_multimodal');
    expect(morphology?.runner_family).toBe('ocr_multimodal');
    expect(submission?.output_source_type).toBe('submission');
    expect(morphology?.output_source_type).toBe('morphological_reference');
    expect(submission?.output_contract).toBe('EvidenceEvent');
    expect(morphology?.output_contract).toBe('MorphologicalHintProfile');
    expect(morphology?.required_gates).toContain('photo_ocr_consent_gate');
    expect(morphology?.data_classification).toBe('sensitive_private');
  });

  it('refuse toute exécution tant que le runner et le statut live sont absents', () => {
    expect(() => requireExecutableAdapter('ocr-submission-v1', 'teacher')).toThrow(
      'non exécutable',
    );
  });

  it('interdit un adapter actionable non live ou live sans executor', () => {
    const base = listAdapterRegistry()[0];

    expect(
      AdapterRegistryEntrySchema.safeParse({...base, ui_status: 'actionable'}).success,
    ).toBe(false);
    expect(
      AdapterRegistryEntrySchema.safeParse({...base, runtime_status: 'live'}).success,
    ).toBe(false);
  });
});
