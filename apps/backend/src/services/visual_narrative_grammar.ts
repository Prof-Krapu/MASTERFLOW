import {
  VisualNarrativeGrammarQuerySchema,
  VisualNarrativeGrammarReportSchema,
  type EmotionalArcPoint,
  type NarrativeFact,
  type VisualGrammarElement,
  type VisualManifest,
  type VisualNarrativeGrammarQuery,
  type VisualNarrativeGrammarReport,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {buildNarrativeCanonGraph} from './narrative_canon_graph.ts';
import {
  getVisualManifest,
  listVisualManifests,
} from './visual_manifests.ts';

interface WorkbenchProjectRow {
  project_id: string | null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function manifestSourceRefs(manifest: VisualManifest): string[] {
  return [
    `visual_manifest:${manifest.manifest_id}`,
    ...manifest.reference_ids.map((id) => `visual_reference:${id}`),
    ...(manifest.da_root_ref ? [`da_root:${manifest.da_root_ref}`] : []),
  ];
}

function elementsFromManifest(manifest: VisualManifest): VisualGrammarElement[] {
  const layerElements = manifest.active_layers.map((layer) => ({
    element_id: `grammar_element:${manifest.manifest_id}:layer:${layer}`,
    element_type: 'motif' as const,
    label: layer,
    meaning: `Couche DA active pour ${manifest.request_title}.`,
    source_refs: [`visual_manifest:${manifest.manifest_id}`],
  }));
  const filterElements = manifest.filters.map((filter) => ({
    element_id: `grammar_element:${manifest.manifest_id}:filter:${filter}`,
    element_type: 'composition' as const,
    label: filter,
    meaning: `Filtre visuel appliqué comme contrainte explicite, pas comme décor silencieux.`,
    source_refs: [`visual_manifest:${manifest.manifest_id}`],
  }));
  const templateElement: VisualGrammarElement = {
    element_id: `grammar_element:${manifest.manifest_id}:template`,
    element_type: 'composition',
    label: manifest.output_template,
    meaning: `Template de sortie attendu pour ${manifest.output_family}.`,
    source_refs: [`visual_manifest:${manifest.manifest_id}`],
  };
  return [templateElement, ...layerElements, ...filterElements];
}

function emotionForFact(fact: NarrativeFact): string {
  if (fact.spoiler_level === 'critical') return 'révélation';
  if (fact.spoiler_level === 'major') return 'tension';
  if (fact.truth_state === 'contradictory') return 'dissonance';
  if (fact.truth_state === 'candidate') return 'incertitude';
  return 'continuité';
}

function emotionalArcFromFacts(facts: NarrativeFact[], manifests: VisualManifest[]): EmotionalArcPoint[] {
  const paletteRefs = manifests.flatMap((manifest) => manifest.active_layers.map((layer) => `layer:${layer}`)).slice(0, 6);
  return facts.slice(0, 12).map((fact, index) => ({
    point_id: `emotional_arc:${index}:${fact.fact_id}`,
    narrative_ref: fact.fact_id,
    emotion: emotionForFact(fact),
    intensity: fact.spoiler_level === 'critical' ? 1 : fact.spoiler_level === 'major' ? 0.78 : fact.spoiler_level === 'mild' ? 0.45 : 0.25,
    palette_refs: paletteRefs,
    lighting_ref: fact.spoiler_level === 'critical' ? 'lighting:high_contrast_reveal' : null,
  }));
}

function projectIdForWorkbench(workbenchId: string): string | undefined {
  const row = getDb()
    .prepare('SELECT project_id FROM story_workbenches WHERE id = ?')
    .get(workbenchId) as WorkbenchProjectRow | undefined;
  return row?.project_id ?? undefined;
}

function selectManifests(actor: AuthUser, input: ReturnType<typeof VisualNarrativeGrammarQuerySchema.parse>): VisualManifest[] {
  if (input.manifest_id) {
    return [getVisualManifest(actor, input.manifest_id)];
  }
  if (input.workbench_id) {
    return listVisualManifests(actor, {
      projectId: input.project_id ?? projectIdForWorkbench(input.workbench_id),
      workbenchId: input.workbench_id,
    });
  }
  return [];
}

function factsForWorkbench(actor: AuthUser, workbenchId: string | null): NarrativeFact[] {
  if (!workbenchId) return [];
  return buildNarrativeCanonGraph(actor, {
    workbench_id: workbenchId,
    presentation_mode: 'workshop',
  }).facts;
}

export function buildVisualNarrativeGrammarReport(
  actor: AuthUser,
  query: VisualNarrativeGrammarQuery,
): VisualNarrativeGrammarReport {
  const input = VisualNarrativeGrammarQuerySchema.parse(query);
  const manifests = selectManifests(actor, input);
  const workbenchId = input.workbench_id ?? manifests.find((manifest) => manifest.workbench_id)?.workbench_id ?? null;
  const facts = factsForWorkbench(actor, workbenchId);
  const manifestRefs = manifests.map((manifest) => `visual_manifest:${manifest.manifest_id}`);
  const factRefs = facts.map((fact) => fact.fact_id);
  const sourceRefs = unique([
    ...(workbenchId ? [`story_workbench:${workbenchId}`] : []),
    ...manifests.flatMap(manifestSourceRefs),
  ]);
  const elements = manifests.flatMap(elementsFromManifest);
  const canonEntityRefs = unique(manifests.flatMap((manifest) => manifest.canon_entity_refs));
  const continuityRefs = unique([
    ...canonEntityRefs,
    ...manifests.flatMap((manifest) => manifest.reference_ids.map((id) => `visual_reference:${id}`)),
    ...factRefs.slice(0, 12),
  ]);
  const missingContinuity = manifests
    .filter((manifest) => manifest.reference_ids.length === 0 || manifest.canon_entity_refs.length === 0)
    .map((manifest) => `visual_manifest:${manifest.manifest_id}`);
  const decorativeMotifs = elements
    .filter((element) => element.element_type === 'motif' && element.source_refs.length === 0)
    .map((element) => element.element_id);
  const unjustifiedEvolution = manifests
    .filter((manifest) => manifest.intent.toLowerCase().includes('evolution') && manifest.canon_entity_refs.length === 0)
    .map((manifest) => `visual_manifest:${manifest.manifest_id}`);
  const drift = manifests
    .filter((manifest) => manifest.status === 'rejected' || manifest.action_ready_report.final_state === 'not_ready')
    .map((manifest) => `visual_manifest:${manifest.manifest_id}`);

  return VisualNarrativeGrammarReportSchema.parse({
    generated_at: Date.now(),
    grammar: {
      grammar_id: `visual_narrative_grammar:${workbenchId ?? input.manifest_id ?? actor.id}`,
      scope_ref: workbenchId ? `story_workbench:${workbenchId}` : input.project_id ? `project:${input.project_id}` : `user:${actor.id}`,
      theme_ref: manifests.find((manifest) => manifest.da_root_ref)?.da_root_ref ?? null,
      narrative_refs: factRefs,
      visual_elements: elements,
      emotional_arc: emotionalArcFromFacts(facts, manifests),
      continuity_refs: continuityRefs,
      source_refs: sourceRefs.length > 0 ? sourceRefs : [`user:${actor.id}`],
    },
    manifest_refs: manifestRefs,
    narrative_fact_refs: factRefs,
    explanation_cards: manifests.map((manifest) => ({
      card_id: `visual_explanation:${manifest.manifest_id}`,
      title: `Pourquoi ce visuel ? ${manifest.request_title}`,
      explanation: `${manifest.intent} Sources : ${manifest.source_truth_summary}. Sortie : ${manifest.output_template}.`,
      source_refs: manifestSourceRefs(manifest),
    })),
    diagnostics: {
      graphic_drift: drift,
      unjustified_evolution: unjustifiedEvolution,
      decorative_motif_without_function: decorativeMotifs,
      missing_continuity_refs: missingContinuity,
    },
    execution_policy: 'explain_only',
  });
}
