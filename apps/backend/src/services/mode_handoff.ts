import {
  ModeHandoffCandidateSchema,
  ModeObjectRefSchema,
  type ModeHandoffCandidate,
  type ModeObjectRef,
} from '@masterflow/shared';

import {listRuntimePacks} from './runtime_pack_registry.ts';

/**
 * Propose des ponts à partir des ports d'entrée déclarés par les packs disponibles.
 * Aucun objet cible n'est créé et aucune navigation n'est imposée.
 */
export function proposeModeHandoffs(input: {
  object: ModeObjectRef;
  available_pack_ids: string[];
}): ModeHandoffCandidate[] {
  const object = ModeObjectRefSchema.parse(input.object);
  const availablePacks = new Set(input.available_pack_ids);
  const candidates: ModeHandoffCandidate[] = [];

  for (const pack of listRuntimePacks()) {
    if (!availablePacks.has(pack.pack_id)) continue;
    for (const stage of pack.stages) {
      if (!stage.input_object_types.includes(object.object_type)) continue;
      const targetMode = stage.target_mode
        ?? pack.active_modes.find((mode) => mode !== object.source_mode)
        ?? pack.active_modes[0];
      if (!targetMode || targetMode === object.source_mode) continue;

      const authoritative = object.authority === 'authoritative' || object.authority === 'validated';
      const validationRequired =
        !authoritative ||
        stage.checkpoint_policy === 'review' ||
        stage.checkpoint_policy === 'human_required';
      const candidate = {
        handoff_id: [
          object.source_mode,
          targetMode,
          object.object_type,
          object.object_id,
          stage.stage_id,
        ].join(':'),
        source_mode: object.source_mode,
        target_mode: targetMode,
        source_object_type: object.object_type,
        source_object_id: object.object_id,
        target_pack_id: pack.pack_id,
        target_stage_id: stage.stage_id,
        expected_output_types: stage.output_object_types,
        reason: `${stage.label} — ${stage.purpose}`,
        confidence: authoritative ? 0.9 : 0.65,
        risk_level: validationRequired ? 'medium' as const : 'low' as const,
        validation_required: validationRequired,
        status: 'proposed' as const,
        source_refs: object.source_refs,
      };
      candidates.push(ModeHandoffCandidateSchema.parse(candidate));
    }
  }

  return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}
