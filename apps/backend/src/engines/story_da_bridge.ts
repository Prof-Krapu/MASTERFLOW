import {GenerateSceneVisualRequestSchema, type GenerateSceneVisualRequest, type StoryNode, type StoryCharacter, type VisualManifest} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {createImageGenerationJob} from '../services/jobs.ts';
import {getNode} from '../services/narrative_runtime.ts';
import {createVisualManifest} from '../services/visual_manifests.ts';

interface CharacterIntent {
  character_id: string;
  name: string;
  archetype: string;
  intent: string;
  acting_directive: string;
}

const ARCHETYPE_INTENTS: Record<string, Array<{trigger: string; intent: string; directive: string}>> = {
  protagonist: [
    {trigger: 'default', intent: 'leading_action', directive: 'active engaged pose, focused on task'},
    {trigger: 'confrontation', intent: 'defiant', directive: 'facing opposition directly, determined expression'},
    {trigger: 'danger', intent: 'resilient', directive: 'braced for impact, protective stance'},
    {trigger: 'teaching', intent: 'demonstrating', directive: 'explaining with gestures, confident posture'},
  ],
  antagonist: [
    {trigger: 'default', intent: 'observing_threatening', directive: 'watching with controlled menace, still but tense'},
    {trigger: 'confrontation', intent: 'attacking', directive: 'aggressive forward lean, intimidating presence'},
    {trigger: 'teaching', intent: 'sabotaging', directive: 'undermining subtly, smug expression'},
  ],
  mentor: [
    {trigger: 'default', intent: 'guiding', directive: 'calm instructive pose, open hand gesture'},
    {trigger: 'teaching', intent: 'demonstrating', directive: 'pointing at diagram or experiment, patient expression'},
    {trigger: 'danger', intent: 'protective', directive: 'shielding others, authoritative stance'},
  ],
  ally: [
    {trigger: 'default', intent: 'supporting', directive: 'at ready, watching companion\'s back'},
    {trigger: 'teaching', intent: 'collaborating', directive: 'working alongside, sharing tools or notes'},
    {trigger: 'danger', intent: 'defending', directive: 'protective stance, facing threat together'},
  ],
  trickster: [
    {trigger: 'default', intent: 'mischievous_idle', directive: 'half-smirk, fidgeting with object, eye contact with audience'},
    {trigger: 'teaching', intent: 'mock_learning', directive: 'feigning attention while distracting others'},
    {trigger: 'danger', intent: 'sly_escape', directive: 'looking for exit, playful fear, one step back'},
  ],
  guardian: [
    {trigger: 'default', intent: 'vigilant', directive: 'scanning environment, ready stance'},
    {trigger: 'danger', intent: 'intercepting', directive: 'blocking path, arms extended, immovable'},
    {trigger: 'teaching', intent: 'supervising', directive: 'arms crossed, watchful eye on procedure'},
  ],
  sidekick: [
    {trigger: 'default', intent: 'attentive', directive: 'looking up to protagonist, eager posture'},
    {trigger: 'teaching', intent: 'taking_notes', directive: 'scribbling frantically, tongue slightly out'},
    {trigger: 'danger', intent: 'nervous_brave', directive: 'scared but holding ground, shaky grip'},
  ],
  herald: [
    {trigger: 'default', intent: 'announcing', directive: 'grand gesture, pointing forward'},
    {trigger: 'confrontation', intent: 'warning', directive: 'raised hand, serious expression, urgent posture'},
  ],
  shadow: [
    {trigger: 'default', intent: 'lurking', directive: 'partially hidden, observing from edge'},
    {trigger: 'confrontation', intent: 'ambushing', directive: 'emerging from darkness, sudden movement'},
  ],
  shapeshifter: [
    {trigger: 'default', intent: 'ambiguous', directive: 'unreadable expression, balanced stance, hard to read'},
    {trigger: 'teaching', intent: 'unexpected_insight', directive: 'revealing hidden knowledge, dramatic pivot'},
  ],
  collective: [
    {trigger: 'default', intent: 'uniform_action', directive: 'moving as one, identical posture'},
    {trigger: 'danger', intent: 'scattering', directive: 'dispersing in all directions, panic'},
  ],
  neutral: [
    {trigger: 'default', intent: 'present', directive: 'standing naturally, relaxed but attentive'},
    {trigger: 'teaching', intent: 'observing', directive: 'watching procedure with quiet interest'},
    {trigger: 'danger', intent: 'concerned', directive: 'stepping back, worried look'},
  ],
};

function resolveSceneKeywords(summary: string | null): string[] {
  if (!summary) return ['default'];
  const lower = summary.toLowerCase();
  const keywords: string[] = [];
  if (/\b(confront|fight|battle|argue|conflict|face[ds]?\b)/.test(lower)) keywords.push('confrontation');
  if (/\b(danger|attack|threat|explosion|crash|emergency|chase|escape)\b/.test(lower)) keywords.push('danger');
  if (/\b(teach|learn|lesson|explain|demonstrat|experiment|cours|class|enseigne|leçon|cours|apprentis|pédagog|didact|formatio)\b/.test(lower)) keywords.push('teaching');
  keywords.push('default');
  return keywords;
}

function resolveIntent(character: StoryCharacter, keywords: string[]): CharacterIntent {
  const archetypeRules = (ARCHETYPE_INTENTS[character.archetype] ?? ARCHETYPE_INTENTS.neutral!)!;
  for (const keyword of keywords) {
    const match = archetypeRules.find((rule) => rule.trigger === keyword);
    if (match) {
      return {
        character_id: character.id,
        name: character.name,
        archetype: character.archetype,
        intent: match.intent,
        acting_directive: match.directive,
      };
    }
  }
  const fallback = archetypeRules.find((rule) => rule.trigger === 'default');
  return {
    character_id: character.id,
    name: character.name,
    archetype: character.archetype,
    intent: fallback?.intent ?? 'present',
    acting_directive: fallback?.directive ?? 'standing naturally',
  };
}

export interface CompiledSceneContext {
  workbench_id: string;
  node_id: string;
  node: StoryNode;
  prompt: string;
  parent_context: string;
  character_intents: CharacterIntent[];
  spoiler_level: string;
  active_layers: string[];
  gates_check: Array<{gate_id: string; phase: string; severity: string; status: 'passed' | 'blocked' | 'warning'}>;
  manifest: VisualManifest | null;
}

export function compileSceneVisualContext(actor: AuthUser, input: GenerateSceneVisualRequest): CompiledSceneContext {
  const data = GenerateSceneVisualRequestSchema.parse(input);
  const node = getNode(actor, data.node_id);
  const workbenchId = node.workbench_id;

  const workbench = getDb().prepare('SELECT * FROM story_workbenches WHERE id = ?').get(workbenchId) as Record<string, unknown> | undefined;
  if (!workbench) throw new Error('workbench_not_found');

  const characterIds = (node.metadata as Record<string, unknown>).character_ids as string[] | undefined;
  const characters: StoryCharacter[] = [];
  if (characterIds && characterIds.length > 0) {
    const placeholders = characterIds.map(() => '?').join(',');
    const rows = getDb().prepare(`SELECT * FROM story_characters WHERE id IN (${placeholders})`).all(...characterIds) as Array<Record<string, unknown>>;
    for (const row of rows) {
      const char: StoryCharacter = {
        id: row.id as string,
        workbench_id: row.workbench_id as string,
        owner_id: row.owner_id as string,
        name: row.name as string,
        aliases: JSON.parse((row.aliases_json as string) ?? '[]'),
        role: row.role as string,
        archetype: row.archetype as StoryCharacter['archetype'],
        status: row.status as StoryCharacter['status'],
        design_notes: (row.design_notes as string) ?? null,
        behavior_notes: (row.behavior_notes as string) ?? null,
        metadata: JSON.parse((row.metadata_json as string) ?? '{}'),
        created_at: row.created_at as number,
        updated_at: row.updated_at as number,
      };
      characters.push(char);
    }
  }

  const keywords = resolveSceneKeywords(node.summary);
  const characterIntents = characters.map((c) => resolveIntent(c, keywords));

  let parentContext = '';
  if (node.parent_id) {
    const parent = getNode(actor, node.parent_id);
    parentContext = parent.title;
  }

  const characterDesc = characterIntents.map((ci) => `${ci.name}: ${ci.acting_directive}`).join('; ');
  const additionalPrompt = data.additional_prompt ?? '';
  const prompt = [
    node.summary ?? node.title,
    parentContext ? `Context: ${parentContext}` : '',
    characterDesc ? `Characters: ${characterDesc}` : '',
    additionalPrompt,
  ].filter(Boolean).join('. ');

  const layers = getDb().prepare(
    'SELECT layer_id FROM da_layer_registry ORDER BY priority_order ASC',
  ).all() as Array<{layer_id: string}>;
  const activeLayers = layers.map((l) => l.layer_id);

  const gates = getDb().prepare(
    "SELECT gate_id, phase, severity FROM da_gate_registry WHERE phase = 'preflight'",
  ).all() as Array<{gate_id: string; phase: string; severity: string}>;
  const gatesCheck = gates.map((g) => ({
    gate_id: g.gate_id,
    phase: g.phase,
    severity: g.severity,
    status: 'passed' as const,
  }));

  const manifest = createVisualManifest(actor, {
    workbench_id: workbenchId,
    node_id: node.id,
    request_title: `Visual: ${node.title}`,
    intent: prompt.slice(0, 4000),
    privacy_scope: 'private',
    canon_entity_refs: characterIds ?? [],
    active_layers: activeLayers,
    filters: [],
    output_family: 'visual_manifest_candidate',
    output_template: 'story_scene_v1',
    source_truth_summary: `Generated from story node "${node.title}" in workbench ${workbenchId}`,
    reference_ids: [],
  });

  audit({
    event_type: 'da.context_compiled',
    user_id: actor.id,
    detail: {workbench_id: workbenchId, node_id: node.id, character_count: characters.length},
  });

  return {
    workbench_id: workbenchId,
    node_id: node.id,
    node,
    prompt,
    parent_context: parentContext,
    character_intents: characterIntents,
    spoiler_level: node.spoiler_level,
    active_layers: activeLayers,
    gates_check: gatesCheck,
    manifest,
  };
}

export function executeSceneVisualGeneration(actor: AuthUser, compiled: CompiledSceneContext): {job_id: string; manifest_id: string} {
  if (compiled.spoiler_level === 'major' || compiled.spoiler_level === 'critical') {
    const readerState = getDb().prepare(
      'SELECT mode FROM story_reader_states WHERE workbench_id = ? AND owner_id = ?',
    ).get(compiled.workbench_id, actor.id) as {mode: string} | undefined;
    if (readerState && readerState.mode === 'MODE_LECTURE') {
      throw new Error('scene_spoiler_gate_blocked');
    }
  }

  const job = createImageGenerationJob(actor, {
    owner_id: actor.id,
    scope_type: 'owner',
    scope_id: compiled.workbench_id,
    prompt: compiled.prompt.slice(0, 2000),
    n: 1,
  });

  getDb().prepare(
    'UPDATE visual_manifests SET status = ?, da_root_ref = ? WHERE id = ?',
  ).run('action_ready_preview', job.job_id, compiled.manifest!.manifest_id);

  audit({
    event_type: 'da.scene_visual_generated',
    user_id: actor.id,
    detail: {workbench_id: compiled.workbench_id, node_id: compiled.node_id, job_id: job.job_id},
  });

  return {job_id: job.job_id, manifest_id: compiled.manifest!.manifest_id};
}

interface PostGenGateReport {
  gate_id: string;
  severity: string;
  status: 'blocked' | 'warning' | 'passed';
  retake_lever: string | null;
}

export function evaluatePostGenerationGates(imageDescription: string, activeLayers: string[]): PostGenGateReport[] {
  const gates = getDb().prepare(
    "SELECT gate_id, severity, retake_lever FROM da_gate_registry WHERE phase = 'post_generation'",
  ).all() as Array<{gate_id: string; severity: string; retake_lever: string | null}>;

  return gates.map((g) => {
    let status: 'passed' | 'warning' | 'blocked' = 'passed';
    if (g.gate_id === 'adult_cartoon_not_layette' && /(chibi|child|cute mascot|disney)/i.test(imageDescription)) {
      status = g.severity === 'block' ? 'blocked' : 'warning';
    }
    if (g.gate_id === 'anti_realism' && /(photoreal|realistic|cinematic|semi.real)/i.test(imageDescription)) {
      status = g.severity === 'block' ? 'blocked' : 'warning';
    }
    if (g.gate_id === 'anti_kechua_outdoor' && /(softshell|trekking|trail|beige_outdoor)/i.test(imageDescription)) {
      status = g.severity === 'block' ? 'blocked' : 'warning';
    }
    if (g.gate_id === 'acting_and_silhouette' && !/(silhouette|pose|gesture|express)/i.test(imageDescription)) {
      status = g.severity === 'validation_required' ? 'warning' : 'passed';
    }
    if (g.gate_id === 'manual_treatment' && /(vector|smooth|perfect|clean_render)/i.test(imageDescription)) {
      status = g.severity === 'validation_required' ? 'warning' : 'passed';
    }
    return {gate_id: g.gate_id, severity: g.severity, status, retake_lever: g.retake_lever};
  });
}
