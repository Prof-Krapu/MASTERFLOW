import {createHash} from 'node:crypto';

import {
  PilotHarvestSchema,
  PilotJourneyStateSchema,
  ROLE_RANK,
  type PilotHarvest,
  type PilotJourneyState,
  type RoomCheckpoint,
  type RuntimePackManifest,
  type RuntimePackStage,
} from '@masterflow/shared';

import {getDb, type RoomRow} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listEvidence} from './pedagogical_records.ts';
import {getProject, listProjectMembers} from './projects.ts';
import {getOwnedAccessibleRoomInstance} from './room_access.ts';
import {getLatestRoomCheckpoint} from './room_checkpoints.ts';
import {getRuntimePack} from './runtime_pack_registry.ts';
import {listSourceIntake} from './source_intake.ts';
import {listValidationInboxItems} from './validation_inbox.ts';

function roomPackIds(room: RoomRow): string[] {
  try {
    const context = JSON.parse(room.context_json ?? '{}') as {runtime_pack_ids?: unknown};
    return Array.isArray(context.runtime_pack_ids)
      ? context.runtime_pack_ids.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

const PILOT_STAGE_WIDGET_PREFIX = 'pilot-stage:';

function currentPilotStage(
  pack: RuntimePackManifest,
  checkpoint: RoomCheckpoint | null,
): RuntimePackStage | undefined {
  const explicitStageId = checkpoint?.active_widgets
    .find((widget) => widget.startsWith(PILOT_STAGE_WIDGET_PREFIX))
    ?.slice(PILOT_STAGE_WIDGET_PREFIX.length);
  return pack.stages.find((stage) => stage.stage_id === explicitStageId)
    ?? pack.stages.find((stage) => stage.target_mode === checkpoint?.active_mode)
    ?? pack.stages[0];
}

/** Projection conversation-first commune aux deux pilotes, sans backend vertical parallèle. */
export function getPilotJourneyState(
  actor: AuthUser,
  runtimePackId: string,
  roomInstanceId: string,
): PilotJourneyState {
  const instance = getOwnedAccessibleRoomInstance(actor, roomInstanceId);
  if (!instance) throw new Error('room_instance_not_found');
  const room = getDb().prepare('SELECT * FROM rooms WHERE id = ?').get(instance.room_id) as
    | RoomRow
    | undefined;
  if (!room?.project_id) throw new Error('pilot_project_room_required');
  if (!roomPackIds(room).includes(runtimePackId)) throw new Error('runtime_pack_not_allowed_in_room');
  const pack = getRuntimePack(runtimePackId);
  if (!pack?.pilot_scope) throw new Error('pilot_runtime_pack_required');
  const project = getProject(actor, room.project_id);
  const members = listProjectMembers(actor, room.project_id);
  const usesSharedProject = pack.subject_context?.participation_model === 'team_project';
  const currentMembership = usesSharedProject
    ? members.find((member) => member.user_id === actor.id)
    : undefined;
  if (usesSharedProject && !currentMembership) {
    throw new Error('pilot_project_membership_required');
  }
  const checkpoint = getLatestRoomCheckpoint(actor, roomInstanceId);
  const sources = listSourceIntake(actor, runtimePackId, room.project_id);
  const canInspectPedagogy = ROLE_RANK[actor.role] >= ROLE_RANK.teacher;
  const evidence = canInspectPedagogy ? listEvidence(actor, room.project_id, room.project_id) : [];
  const validations = canInspectPedagogy
    ? listValidationInboxItems(actor).filter((item) =>
        ['draft', 'candidate', 'needs_review', 'blocked'].includes(item.current_status) && [
          ...item.object_refs,
          ...item.source_refs,
          ...item.domain_refs,
        ].some((ref) => ref.includes(room.project_id!)),
      )
    : [];
  const currentStage = currentPilotStage(pack, checkpoint);
  if (!currentStage) throw new Error('pilot_runtime_pack_has_no_stage');
  const currentStageIndex = pack.stages.findIndex((stage) => stage.stage_id === currentStage.stage_id);
  const journeyConfig = pack.pilot_scope.journey_config ?? {
    experience_label: pack.label,
    progress_policy: 'descriptive_not_graded' as const,
    facts: [],
    responsibilities: [],
    group_policy: null,
    excluded_capabilities: [],
  };
  const factsAwaitingSource = journeyConfig.facts.filter((fact) => fact.status === 'source_required');
  const openQuestions = [
    ...(sources.length === 0 ? ['Quelles sources du pilote doivent être enregistrées et validées ?'] : []),
    ...(!checkpoint ? ['Quel premier checkpoint humain doit cadrer le parcours ?'] : []),
    ...(canInspectPedagogy && evidence.length === 0 ? ['Quelles preuves doivent être rattachées au projet ?'] : []),
    ...(validations.length > 0 ? [`${validations.length} validation(s) humaine(s) restent en attente.`] : []),
    ...factsAwaitingSource.map((fact) => `${fact.label} : quelle source officielle peut confirmer cette information ?`),
  ];
  return PilotJourneyStateSchema.parse({
    runtime_pack_id: pack.pack_id,
    pilot_id: pack.pilot_scope.pilot_id,
    project: {project_id: project.project_id, name: project.name},
    room: {room_id: room.id, name: room.name},
    participant_count: members.length,
    collaboration: usesSharedProject && currentMembership
      ? {
          account_model: 'individual_accounts',
          workspace_model: 'shared_project',
          group_project_id: project.project_id,
          current_membership: {
            user_id: actor.id,
            role: currentMembership.role,
          },
        }
      : null,
    current_stage: {stage_id: currentStage.stage_id, label: currentStage.label},
    journey: {
      experience_label: journeyConfig.experience_label,
      progress_policy: journeyConfig.progress_policy,
      current_position: currentStageIndex + 1,
      stage_count: pack.stages.length,
      stages: pack.stages.map((stage, index) => ({
        stage_id: stage.stage_id,
        label: stage.label,
        purpose: stage.purpose,
        checkpoint_policy: stage.checkpoint_policy,
        status: index < currentStageIndex
          ? 'completed'
          : index === currentStageIndex
            ? 'current'
            : 'upcoming',
      })),
      facts: journeyConfig.facts,
      responsibilities: journeyConfig.responsibilities,
      group_policy: journeyConfig.group_policy,
      excluded_capabilities: journeyConfig.excluded_capabilities,
    },
    checkpoint: checkpoint
      ? {checkpoint_id: checkpoint.checkpoint_id, summary: checkpoint.summary}
      : null,
    visible_sources: sources,
    evidence_refs: evidence.map((item) => item.evidence_id),
    validations_pending: canInspectPedagogy ? validations.length : null,
    open_questions: openQuestions,
    next_action: checkpoint?.next_recommended_action ?? currentStage.purpose,
    generated_at: Date.now(),
  });
}

/** Extraction finale candidate : hashable, sourcée et sans écriture canon automatique. */
export function buildPilotHarvest(state: PilotJourneyState): PilotHarvest {
  const parsed = PilotJourneyStateSchema.parse(state);
  const snapshot = JSON.stringify(parsed);
  const sourceRefs = parsed.visible_sources.map((source) => source.source_ref);
  return PilotHarvestSchema.parse({
    harvest_id: uuid(),
    runtime_pack_id: parsed.runtime_pack_id,
    pilot_id: parsed.pilot_id,
    project_id: parsed.project.project_id,
    snapshot_sha256: createHash('sha256').update(snapshot).digest('hex'),
    checkpoint_ref: parsed.checkpoint?.checkpoint_id ?? null,
    source_refs: sourceRefs,
    evidence_refs: parsed.evidence_refs,
    open_questions: parsed.open_questions,
    backflow_candidate: {
      status: 'candidate',
      summary: `Harvest candidat ${parsed.pilot_id} : étape ${parsed.current_stage.label}, ${sourceRefs.length} source(s) visible(s), ${parsed.evidence_refs.length} preuve(s).`,
      source_refs: sourceRefs,
      requires_human_review: true,
    },
    created_at: Date.now(),
  });
}
