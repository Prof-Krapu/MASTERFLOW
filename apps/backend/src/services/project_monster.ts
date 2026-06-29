import {
  ProjectMonsterEvolutionReportSchema,
  type ProjectMonsterEvolutionReport,
  type ProjectMonsterEvolutionStage,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {getGuidedSessionContext} from './guided_runtime.ts';
import {buildGuidedLivingCompanion} from './living_companion.ts';
import {getProject} from './projects.ts';

function objectString(
  source: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = source?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function proposedStage(
  completionRatio: number,
  sessionCompleted: boolean,
  creativeGimmick: string | null,
  dominantEmotion: string | null,
): ProjectMonsterEvolutionStage {
  if (sessionCompleted && creativeGimmick && dominantEmotion) return 'stabilized';
  if (completionRatio >= 0.5 && creativeGimmick) return 'mutation';
  return 'seed';
}

function stageReason(
  stage: ProjectMonsterEvolutionStage,
  completionRatio: number,
): string {
  if (stage === 'stabilized') {
    return 'Le cadrage est complet : gimmick et émotion sont explicites. La stabilisation visuelle peut être proposée au créateur.';
  }
  if (stage === 'mutation') {
    return `Le projet est cadré à ${Math.round(completionRatio * 100)} % et son gimmick est explicite. Une mutation conservatrice peut être étudiée.`;
  }
  return 'L’idée reste fragile ou incomplète : seule une forme V0 simple et empathique est pertinente.';
}

export function buildProjectMonsterEvolutionReport(
  actor: AuthUser,
  sessionId: string,
): ProjectMonsterEvolutionReport {
  const {session, guide} = getGuidedSessionContext(actor, sessionId);
  const companion = buildGuidedLivingCompanion(actor, sessionId);
  if (companion.companion_type !== 'project_monster') {
    throw new Error('project_monster_not_assigned');
  }
  if (!session.project_id) throw new Error('project_monster_project_required');
  getProject(actor, session.project_id);

  const eventContext = objectString(guide.ui_manifest, 'event_context');
  if (eventContext !== 'ours_dor') throw new Error('project_monster_event_context_invalid');

  const proposedName = objectString(guide.ui_manifest, 'companion_name');
  const loreSummary = objectString(guide.ui_manifest, 'companion_lore');
  const creativeGimmick = objectString(session.structured_record, 'creative_gimmick');
  const dominantEmotion = objectString(session.structured_record, 'dominant_emotion');
  const missingInputs: ProjectMonsterEvolutionReport['missing_inputs'] = [
    ...(proposedName ? [] : ['creator_validated_name' as const]),
    ...(loreSummary ? [] : ['creator_validated_lore' as const]),
    ...(creativeGimmick ? [] : ['creative_gimmick' as const]),
    ...(dominantEmotion ? [] : ['dominant_emotion' as const]),
  ];
  const stage = proposedStage(
    session.progress.completion_ratio,
    session.status === 'completed',
    creativeGimmick,
    dominantEmotion,
  );
  const hasContradictions = session.progress.contradictions.length > 0;

  return ProjectMonsterEvolutionReportSchema.parse({
    generated_at: Date.now(),
    companion,
    project_ref: `project:${session.project_id}`,
    event_context: 'ours_dor',
    identity: {
      proposed_name: proposedName,
      lore_summary: loreSummary,
      status: proposedName && loreSummary ? 'candidate' : 'needs_creator_input',
    },
    creative_gimmick: creativeGimmick,
    dominant_emotion: dominantEmotion,
    proposed_stage: stage,
    stage_reason: stageReason(stage, session.progress.completion_ratio),
    continuity_locks: [
      'same_silhouette_family',
      'same_core_gimmick',
      'same_emotional_lineage',
      'same_non_humiliating_tone',
      'behavior_before_form',
    ],
    visual_gates: {
      personality: creativeGimmick && dominantEmotion ? 'ready' : 'pending',
      silhouette: 'pending',
      evolution: hasContradictions
        ? 'blocked'
        : creativeGimmick && dominantEmotion
          ? 'ready'
          : 'pending',
      readability: 'pending',
      non_humiliation: 'pending',
    },
    missing_inputs: missingInputs,
    asset_plan: {
      pipeline_profile: 'OD_MONSTER_EVOLUTION_THREE_STAGE_COMFY',
      output_protocol: 'OD_MONSTER_EVOLUTION_PACK',
      expected_outputs: [
        'contact_sheet_preview',
        'stage_1_crop_optional',
        'stage_2_crop_optional',
        'stage_3_crop_optional',
      ],
      generation_allowed: false,
      canon_promotion_allowed: false,
    },
    source_refs: [
      `guided_session:${sessionId}`,
      `conversation_guide:${guide.guide_id}:v${session.guide_version}`,
      `schema_template:${session.target_schema_id}:v${session.target_schema_version}`,
      `project:${session.project_id}`,
      'contract:monster_evolution_system',
      'contract:permissioned_living_idea_companion',
      'pipeline:OD_MONSTER_EVOLUTION_THREE_STAGE_COMFY',
    ],
    requires_creator_validation: true,
    execution_policy: 'candidate_only',
  });
}
