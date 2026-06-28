import {
  NarrativeCanonGraphQuerySchema,
  NarrativeCanonGraphSchema,
  type CharacterGoal,
  type CharacterKnowledge,
  type NarrativeCanonGraph,
  type NarrativeCanonGraphQuery,
  type NarrativeFact,
  type NarrativePresentation,
  type NarrativePresentationMode,
  type NarrativeTruthState,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {decideScopedPermission} from './projects.ts';

interface WorkbenchRow {
  id: string;
  owner_id: string;
  project_id: string | null;
}

interface StoryNodeRow {
  id: string;
  workbench_id: string;
  parent_id: string | null;
  owner_id: string;
  node_type: string;
  title: string;
  summary: string | null;
  sort_order: number;
  spoiler_level: 'none' | 'mild' | 'major' | 'critical';
  status: 'draft' | 'active' | 'locked' | 'archived';
  metadata_json: string;
  created_at: number;
  updated_at: number;
}

interface NarrativeEventRow {
  id: string;
  workbench_id: string;
  node_id: string | null;
  owner_id: string;
  event_type: string;
  title: string;
  description: string | null;
  payload_json: string;
  occurred_at: number;
  created_at: number;
}

interface StoryCharacterRow {
  id: string;
  workbench_id: string;
  owner_id: string;
  name: string;
  role: string;
  archetype: string;
  status: string;
  behavior_notes: string | null;
  metadata_json: string;
  created_at: number;
  updated_at: number;
}

function parseObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function requireWorkbenchRead(actor: AuthUser, workbenchId: string): WorkbenchRow {
  const row = getDb()
    .prepare('SELECT id, owner_id, project_id FROM story_workbenches WHERE id = ?')
    .get(workbenchId) as WorkbenchRow | undefined;
  if (!row) throw new Error('workbench_not_found');
  const scoped = decideScopedPermission({
    actor,
    ownerId: row.owner_id,
    projectId: row.project_id,
    minimumProjectRole: 'viewer',
  }).allowed;
  const readerState = getDb()
    .prepare('SELECT 1 AS hit FROM story_reader_states WHERE workbench_id = ? AND owner_id = ?')
    .get(workbenchId, actor.id);
  if (!scoped && !readerState) throw new Error('workbench_not_found');
  return row;
}

function truthFromNode(row: StoryNodeRow, metadata: Record<string, unknown>): NarrativeTruthState {
  if (row.status === 'archived') return 'revoked';
  if (metadata['truth_state'] === 'CONTRADICTION') return 'contradictory';
  if (metadata['truth_state'] === 'CANDIDATE' || metadata['truth_state'] === 'OPEN_QUESTION') return 'candidate';
  if (metadata['truth_state'] === 'CANON_LOCKED' || row.status === 'locked') return 'canon';
  if (row.status === 'active') return 'probable';
  return 'candidate';
}

function confidenceFromTruth(truth: NarrativeTruthState, metadata: Record<string, unknown>): NarrativeFact['confidence'] {
  const confidence = metadata['confidence'];
  if (confidence === 'canon' || confidence === 'probable' || confidence === 'speculative' || confidence === 'uncertain' || confidence === 'contradiction') {
    return confidence;
  }
  if (truth === 'canon') return 'canon';
  if (truth === 'contradictory') return 'contradiction';
  if (truth === 'probable') return 'probable';
  return 'uncertain';
}

function factFromNode(row: StoryNodeRow): NarrativeFact {
  const metadata = parseObject(row.metadata_json);
  const truth = truthFromNode(row, metadata);
  return {
    fact_id: `fact:story_node:${row.id}`,
    workbench_id: row.workbench_id,
    source_kind: 'story_node',
    subject_refs: [`story_node:${row.id}`, ...stringArray(metadata['character_ids']).map((id) => `story_character:${id}`)],
    summary: row.summary ?? row.title,
    truth_state: truth,
    spoiler_level: row.spoiler_level,
    confidence: confidenceFromTruth(truth, metadata),
    source_refs: [`story_node:${row.id}`],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function eventSpoiler(row: NarrativeEventRow): NarrativeFact['spoiler_level'] {
  if (row.event_type === 'plot_twist') return 'critical';
  if (row.event_type === 'reveal') return 'major';
  if (row.event_type === 'decision_point' || row.event_type === 'unlock') return 'mild';
  return 'none';
}

function factFromEvent(row: NarrativeEventRow): NarrativeFact {
  const payload = parseObject(row.payload_json);
  return {
    fact_id: `fact:narrative_event:${row.id}`,
    workbench_id: row.workbench_id,
    source_kind: 'narrative_event',
    subject_refs: [
      `narrative_event:${row.id}`,
      ...(row.node_id ? [`story_node:${row.node_id}`] : []),
      ...stringArray(payload['character_ids']).map((id) => `story_character:${id}`),
    ],
    summary: row.description ?? row.title,
    truth_state: 'canon',
    spoiler_level: eventSpoiler(row),
    confidence: 'canon',
    source_refs: [`narrative_event:${row.id}`],
    created_at: row.created_at,
    updated_at: row.created_at,
  };
}

function factFromCharacter(row: StoryCharacterRow): NarrativeFact {
  const truth: NarrativeTruthState = row.status === 'concept' || row.status === 'unknown'
    ? 'candidate'
    : row.status === 'inactive'
      ? 'revoked'
      : 'canon';
  return {
    fact_id: `fact:story_character:${row.id}`,
    workbench_id: row.workbench_id,
    source_kind: 'story_character',
    subject_refs: [`story_character:${row.id}`],
    summary: `${row.name} : ${row.role}`,
    truth_state: truth,
    spoiler_level: 'none',
    confidence: truth === 'canon' ? 'canon' : 'uncertain',
    source_refs: [`story_character:${row.id}`],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function visibleInMode(fact: NarrativeFact, mode: NarrativePresentationMode): boolean {
  if (mode === 'full_spoilers' || mode === 'export') return true;
  if (mode === 'reader') return fact.spoiler_level !== 'major' && fact.spoiler_level !== 'critical';
  return fact.spoiler_level !== 'critical';
}

function presentation(
  workbenchId: string,
  facts: NarrativeFact[],
  nodes: StoryNodeRow[],
  mode: NarrativePresentationMode,
): NarrativePresentation {
  const visible = facts.filter((fact) => visibleInMode(fact, mode));
  const hidden = facts.filter((fact) => !visibleInMode(fact, mode));
  const mediaRefs = nodes.flatMap((node) => stringArray(parseObject(node.metadata_json)['visual_manifest_ids'])
    .map((id) => `visual_manifest:${id}`));
  return {
    presentation_id: `presentation:${workbenchId}:${mode}`,
    workbench_id: workbenchId,
    mode,
    point_of_view_ref: null,
    audience_ref: mode === 'reader' ? 'audience:reader_no_spoilers' : 'audience:workshop',
    visible_fact_refs: visible.map((fact) => fact.fact_id),
    hidden_spoiler_refs: hidden.map((fact) => fact.fact_id),
    ordering_refs: facts.map((fact) => fact.fact_id),
    media_refs: [...new Set(mediaRefs)],
    source_refs: [`story_workbench:${workbenchId}`],
  };
}

function characterKnowledge(characters: StoryCharacterRow[], facts: NarrativeFact[]): CharacterKnowledge[] {
  return characters.flatMap((character) => {
    const characterRef = `story_character:${character.id}`;
    return facts
      .filter((fact) => fact.subject_refs.includes(characterRef))
      .map((fact) => ({
        character_ref: characterRef,
        fact_ref: fact.fact_id,
        knowledge_state: fact.source_kind === 'story_character' ? 'knows' : 'believes',
        evidence_refs: fact.source_refs,
      } satisfies CharacterKnowledge));
  });
}

function characterGoals(characters: StoryCharacterRow[]): CharacterGoal[] {
  return characters.map((character) => {
    const metadata = parseObject(character.metadata_json);
    const explicitGoal = typeof metadata['goal'] === 'string' ? metadata['goal'] : null;
    return {
      goal_id: `goal:story_character:${character.id}`,
      character_ref: `story_character:${character.id}`,
      summary: explicitGoal ?? character.behavior_notes ?? `Rôle narratif : ${character.role}`,
      status: character.status === 'active' ? 'active' : character.status === 'inactive' ? 'completed' : 'unknown',
      source_refs: [`story_character:${character.id}`],
    };
  });
}

function setupPayoffs(workbenchId: string, facts: NarrativeFact[]) {
  const setupRefs = facts
    .filter((fact) => fact.source_kind === 'story_node' && (fact.spoiler_level === 'none' || fact.spoiler_level === 'mild'))
    .map((fact) => fact.fact_id);
  const payoffRefs = facts
    .filter((fact) => fact.spoiler_level === 'major' || fact.spoiler_level === 'critical')
    .map((fact) => fact.fact_id);
  if (setupRefs.length === 0 && payoffRefs.length === 0) return [];
  return [{
    thread_id: `setup_payoff:${workbenchId}:default`,
    workbench_id: workbenchId,
    setup_refs: setupRefs,
    payoff_refs: payoffRefs,
    status: setupRefs.length > 0 && payoffRefs.length > 0 ? 'payoff_ready' : setupRefs.length > 0 ? 'setup_only' : 'broken',
    explanation: 'Projection V1 : relie les faits non-spoiler comme setup et les révélations/twists comme payoff à valider.',
  }];
}

export function buildNarrativeCanonGraph(
  actor: AuthUser,
  input: NarrativeCanonGraphQuery,
): NarrativeCanonGraph {
  const query = NarrativeCanonGraphQuerySchema.parse(input);
  requireWorkbenchRead(actor, query.workbench_id);
  const nodes = getDb()
    .prepare('SELECT * FROM story_nodes WHERE workbench_id = ? ORDER BY sort_order ASC, created_at ASC')
    .all(query.workbench_id) as StoryNodeRow[];
  const events = getDb()
    .prepare('SELECT * FROM narrative_events WHERE workbench_id = ? ORDER BY occurred_at ASC')
    .all(query.workbench_id) as NarrativeEventRow[];
  const characters = getDb()
    .prepare('SELECT * FROM story_characters WHERE workbench_id = ? ORDER BY name ASC')
    .all(query.workbench_id) as StoryCharacterRow[];
  const facts = [
    ...nodes.map(factFromNode),
    ...events.map(factFromEvent),
    ...characters.map(factFromCharacter),
  ];
  const view = presentation(query.workbench_id, facts, nodes, query.presentation_mode);
  const visibleFacts = new Set(view.visible_fact_refs);
  const spoilerLeaks = facts
    .filter((fact) => visibleFacts.has(fact.fact_id) && !visibleInMode(fact, query.presentation_mode))
    .map((fact) => fact.fact_id);
  return NarrativeCanonGraphSchema.parse({
    workbench_id: query.workbench_id,
    generated_at: Date.now(),
    facts,
    presentation: view,
    character_knowledge: characterKnowledge(characters, facts),
    character_goals: characterGoals(characters),
    setup_payoffs: setupPayoffs(query.workbench_id, facts),
    diagnostics: {
      contradictions: facts.filter((fact) => fact.truth_state === 'contradictory').map((fact) => fact.fact_id),
      spoiler_leaks: spoilerLeaks,
      temporal_warnings: [],
      emotion_without_cause: [],
    },
  });
}
