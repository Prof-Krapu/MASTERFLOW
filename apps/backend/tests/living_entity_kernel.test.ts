import {describe, expect, it} from 'vitest';

import {
  LivingEntityDefinitionSchema,
  LivingEntityEvolutionPolicySchema,
  LivingEntityInstanceSchema,
} from '@masterflow/shared';

import {
  buildLivingEntityCodexEntry,
  evaluateLivingEntityEvolution,
} from '../src/services/living_entity_kernel.ts';

const definition = LivingEntityDefinitionSchema.parse({
  definition_id: 'fixture:companion',
  label: 'Companion fictif',
  kind: 'companion',
  status: 'candidate',
  version: '0.1.0',
  role_summary: 'Rendre un état de projet visible sans noter la personne.',
  lore_summary: 'Une fixture sans canon propriétaire.',
  interaction_mode: 'contextual_bubble',
  allowed_intents: ['inspect_project_state'],
  assignment_scopes: ['project', 'room'],
  visual_entity_ref: 'fixture:visual-companion',
  functional_persona_ref: null,
  lore_persona_ref: null,
  evolution_policy_ref: 'fixture:evolution',
  boundaries: ['ne juge jamais la valeur de la personne', 'ne génère aucun asset automatiquement'],
  source_refs: ['fixture:living-entity-kernel'],
});

const policy = LivingEntityEvolutionPolicySchema.parse({
  policy_id: 'fixture:evolution',
  version: '0.1.0',
  stages: [
    {
      stage_id: 'seed',
      label: 'Graine',
      order: 0,
      completion_min: 0,
      indicator_minimums: {},
      required_signal_refs: [],
      visual_layer_refs: ['fixture:seed-layer'],
      dialogue_intent: 'Je commence à prendre forme.',
      source_refs: ['fixture:living-entity-kernel'],
    },
    {
      stage_id: 'clear',
      label: 'Idée claire',
      order: 1,
      completion_min: 0.5,
      indicator_minimums: {'project:clarity': 0.7},
      required_signal_refs: ['signal:gimmick'],
      visual_layer_refs: ['fixture:clear-layer'],
      dialogue_intent: 'Mon idée centrale devient lisible.',
      source_refs: ['fixture:living-entity-kernel'],
    },
  ],
  immutable_trait_refs: ['fixture:core-silhouette'],
  allow_regression: false,
  creator_validation_required: true,
  automatic_generation_allowed: false,
  source_refs: ['fixture:living-entity-kernel'],
});

const instance = LivingEntityInstanceSchema.parse({
  instance_id: 'fixture:companion:project-1',
  definition_ref: 'fixture:companion',
  display_name: 'Compagnon test',
  status: 'active',
  assignment_scope_refs: ['project:1'],
  current_stage_id: 'seed',
  stage_history: [{
    stage_id: 'seed',
    entered_at: 1,
    reason: 'Identité initiale validée.',
    evidence_refs: ['fixture:creation'],
    validated_by: 'user:creator',
  }],
  visual_asset_refs: [],
  created_by: 'user:creator',
  validated_by: 'user:creator',
  source_refs: ['fixture:living-entity-kernel'],
});

describe('Living Entity Kernel', () => {
  it('propose un palier sans générer ni canoniser', () => {
    const candidate = evaluateLivingEntityEvolution({
      definition,
      instance,
      policy,
      completion_ratio: 0.75,
      signals: [
        {
          signal_ref: 'signal:gimmick',
          metric_ref: 'project:gimmick',
          value: 1,
          observed_at: 10,
          source_ref: 'project:1:checkpoint:gimmick',
        },
        {
          signal_ref: 'signal:clarity',
          metric_ref: 'project:clarity',
          value: 0.8,
          observed_at: 11,
          source_ref: 'project:1:checkpoint:clarity',
        },
      ],
    });

    expect(candidate.readiness).toBe('candidate');
    expect(candidate.proposed_stage_id).toBe('clear');
    expect(candidate.continuity_locks).toContain('fixture:core-silhouette');
    expect(candidate.creator_validation_required).toBe(true);
    expect(candidate.generation_allowed).toBe(false);
    expect(candidate.canon_promotion_allowed).toBe(false);
  });

  it('bloque une évolution contradictoire', () => {
    const candidate = evaluateLivingEntityEvolution({
      definition,
      instance,
      policy,
      completion_ratio: 0.75,
      signals: [{
        signal_ref: 'signal:gimmick',
        metric_ref: 'project:clarity',
        value: 0.8,
        observed_at: 10,
        source_ref: 'project:1:checkpoint',
      }],
      contradiction_refs: ['contradiction:project-purpose'],
    });

    expect(candidate.readiness).toBe('blocked');
    expect(candidate.generation_allowed).toBe(false);
  });

  it('construit un Codex assigné sans exposer plus que son scope', () => {
    const entry = buildLivingEntityCodexEntry({definition, instance});
    expect(entry.kind).toBe('companion');
    expect(entry.visibility).toBe('assigned_scope');
    expect(entry.assignment_scope_refs).toEqual(['project:1']);
  });

  it.each([
    ['monster', 'Monstre projet'],
    ['moth', 'MOTH de classe'],
  ] as const)('réutilise le même noyau pour %s sans moteur concurrent', (kind, label) => {
    const specializedDefinition = LivingEntityDefinitionSchema.parse({
      ...definition,
      definition_id: `fixture:${kind}`,
      label,
      kind,
    });
    const specializedInstance = LivingEntityInstanceSchema.parse({
      ...instance,
      instance_id: `fixture:${kind}:scope-1`,
      definition_ref: specializedDefinition.definition_id,
      display_name: label,
    });
    const candidate = evaluateLivingEntityEvolution({
      definition: specializedDefinition,
      instance: specializedInstance,
      policy,
      completion_ratio: 0.75,
      signals: [
        {
          signal_ref: 'signal:gimmick',
          metric_ref: 'project:gimmick',
          value: 1,
          observed_at: 10,
          source_ref: 'project:1:gimmick',
        },
        {
          signal_ref: 'signal:clarity',
          metric_ref: 'project:clarity',
          value: 0.8,
          observed_at: 11,
          source_ref: 'project:1:clarity',
        },
      ],
    });
    const codex = buildLivingEntityCodexEntry({
      definition: specializedDefinition,
      instance: specializedInstance,
    });

    expect(candidate.readiness).toBe('candidate');
    expect(candidate.generation_allowed).toBe(false);
    expect(codex.kind).toBe(kind);
  });
});
