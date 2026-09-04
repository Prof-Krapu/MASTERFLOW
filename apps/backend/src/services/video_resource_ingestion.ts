import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {
  deterministicId,
  normalize,
  parseDuration,
  refreshFts,
  stableHash,
  type JsonRecord,
  upsertNotion,
  upsertNotionLink,
  upsertParentResource,
  upsertProfile,
} from './pedagogical_resource_registry.ts';

/**
 * Ingestion locale d'une obligation video de reference.
 *
 * Pipeline (mode mock, sans provider reseau, fail-closed) :
 *
 *   VIDEO -> SEGMENTS / TRANSCRIPT -> NOTION_OCCURRENCES -> CANONICAL_NOTIONS -> ROUTING
 *
 * Une video est fournie avec sa transcription deja decoupee en segments temporaux.
 * Chaque segment porte un texte a partir duquel un analyseur local deterministe
 * detecte des notions. Les notions canoniques vivent dans `pedagogical_notions` ;
 * chaque vue d'une notion dans une video (a un timecode) est ecrite comme une
 * occurrence dans `pedagogical_resource_notion_links`. Une meme notion canonique
 * peut donc apparaitre dans plusieurs videos sans etre dupliquee.
 */

export type VideoSegmentInput = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};

export type DetectedNotion = {
  label: string;
  type?: string;
  aliases?: string[];
};

export type IngestVideoInput = {
  actor: AuthUser;
  title: string;
  url: string | null;
  durationSeconds: number | null;
  software?: string[];
  topics?: string[];
  segments: VideoSegmentInput[];
  sourceRef: string;
  validationState?: 'candidate' | 'review_needed' | 'validated';
};

export type IngestVideoResult = {
  resourceId: string;
  videoId: string;
  segments: number;
  notionOccurrences: number;
  notionsCreated: number;
  notionsReused: number;
  unchanged: boolean;
};

const RELATION_TYPES = ['teaches', 'illustrates', 'remediates', 'extends'] as const;
type RelationType = (typeof RELATION_TYPES)[number];

const NOTION_TYPE_HINTS: Array<{type: string; words: string[]}> = [
  {type: 'software', words: ['after effect', 'aftereffect', 'photoshop', 'illustrator', 'premiere', 'blender', 'cinema 4d', 'c4d', 'maya']},
  {type: 'workflow', words: ['preproduire', 'pre-production', 'storyboard', 'parti pris', 'debriefe', 'rendu', 'exports', 'sous-titres', 'gestion de projet', 'brief']},
  {type: 'concept', words: ['regle des tiers', 'rythme', 'plan', 'profondeur de champ', 'lumiere', 'cadrage', 'couleur', 'typographie', 'contraste']},
];

export function detectNotions(segmentText: string): DetectedNotion[] {
  const text = normalize(segmentText);
  if (!text) return [];
  const found = new Map<string, DetectedNotion>();
  for (const hint of NOTION_TYPE_HINTS) {
    for (const word of hint.words) {
      // Correspondance par mot normalise, bornee a des expressions de 1 a 3 mots.
      const expr = normalize(word);
      const pattern = new RegExp(`(^|\\s)${expr.replace(/\s+/g, '\\s+')}($|\\s|\\.|,|;)`, 'i');
      if (pattern.test(text)) {
        const label = word.charAt(0).toUpperCase() + word.slice(1);
        found.set(expr, {label, type: hint.type, aliases: [word]});
      }
    }
  }
  return [...found.values()];
}

function toSeconds(timecode: string | number | null | undefined): number | null {
  if (typeof timecode === 'number') return timecode;
  return parseDuration(timecode);
}

export function ingestVideoResource(input: IngestVideoInput): IngestVideoResult {
  const db = getDb();
  const now = Date.now();
  // Id deterministe : une meme URL + titre conduit au meme resource id (idempotent).
  const urlKey = (input.url?.trim() || input.title.trim()).toLowerCase();
  const videoId = deterministicId('ingested-video', urlKey);
  const resourceId = deterministicId('ped-resource', urlKey);
  const sourceHash = stableHash({title: input.title, url: input.url, software: input.software ?? [], topics: input.topics ?? []});
  const sourceRef = input.sourceRef;

  const existingProfile = db.prepare(
    'SELECT resource_id FROM pedagogical_resource_profiles WHERE resource_id = ?',
  ).get(resourceId) as {resource_id: string} | undefined;
  const unchanged = Boolean(existingProfile);

  const status: 'candidate' | 'validated' =
    input.validationState === 'validated' ? 'validated' : 'candidate';

  upsertParentResource({
    id: resourceId,
    type: 'video',
    title: input.title,
    url: input.url,
    source: sourceRef,
    status,
    subjects: input.topics ?? [],
  });

  upsertProfile({
    resourceId,
    legacyId: null,
    resourceKind: 'tutorial_video',
    format: 'video',
    durationSeconds: input.durationSeconds,
    description: null,
    pedagogicalReading: null,
    technicalLevel: null,
    learningStage: null,
    software: input.software ?? [],
    tags: input.topics ?? [],
    usableFor: [],
    sourceRef,
    sourceHash,
    validationState: status === 'validated' ? 'validated' : 'candidate',
    metadata: {ingestion: 'video_resource_ingestion', segment_count: input.segments.length},
  });

  db.prepare(`
    INSERT INTO pedagogical_video_resources (id, video_id, title, duration, software_json, topics_json, url, data_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(video_id) DO UPDATE SET
      title = excluded.title, duration = excluded.duration, software_json = excluded.software_json,
      topics_json = excluded.topics_json, url = excluded.url, data_json = excluded.data_json
  `).run(
    uuid(),
    videoId,
    input.title,
    input.durationSeconds != null ? formatDuration(input.durationSeconds) : null,
    JSON.stringify(input.software ?? []),
    JSON.stringify(input.topics ?? []),
    input.url,
    JSON.stringify({segments: input.segments}),
    now,
  );

  let notionOccurrences = 0;
  let notionsCreated = 0;
  let notionsReused = 0;

  const seenNotionIds = new Set<string>();

  for (const segment of input.segments) {
    const detected = detectNotions(segment.text);
    const timestampSeconds = toSeconds(segment.startSeconds);
    for (const notion of detected) {
      const canonicalKey = normalize(notion.label);
      const notionDbId = deterministicId('ped-notion', canonicalKey);
      const existedRow = db.prepare(
        'SELECT 1 AS found FROM pedagogical_notions WHERE id = ?',
      ).get(notionDbId) as {found: number} | undefined;
      const wasExisting = Boolean(existedRow);
      upsertNotion(
        canonicalKey,
        notion.label,
        notion.type ?? 'concept',
        notion.aliases ?? [],
        'candidate',
        {},
      );
      if (wasExisting) notionsReused += 1;
      else notionsCreated += 1;

      const uniqKey = `${resourceId}:${canonicalKey}`;
      if (!seenNotionIds.has(uniqKey)) {
        seenNotionIds.add(uniqKey);
        upsertNotionLink({
          resourceId,
          notionId: notionDbId,
          relation: 'teaches',
          timestampSeconds,
          importance: null,
          difficulty: null,
          learningStage: null,
          sourceRef,
          metadata: {segment_start: segment.startSeconds, segment_end: segment.endSeconds},
        });
        notionOccurrences += 1;
      }
    }
  }

  refreshFts(resourceId);

  if (!unchanged) {
    db.prepare(`
      INSERT INTO pedagogical_resource_imports
        (id, source_ref, source_hash, source_kind, status, resources_seen, resources_written, warnings_count, report_json, created_at)
      VALUES (?, ?, ?, ?, 'applied', 1, 1, 0, ?, ?)
      ON CONFLICT(source_ref, source_hash) DO NOTHING
    `).run(
      uuid(),
      sourceRef,
      sourceHash,
      'video_ingestion',
      JSON.stringify({resourceId, segments: input.segments.length, occurrences: notionOccurrences}),
      now,
    );
  }

  audit({
    event_type: 'pedagogy.video_resource_ingested',
    user_id: input.actor.id,
    scope: input.actor.id,
    detail: {resource_id: resourceId, segments: input.segments.length, occurrences: notionOccurrences, unchanged},
  });

  return {
    resourceId,
    videoId,
    segments: input.segments.length,
    notionOccurrences,
    notionsCreated,
    notionsReused,
    unchanged,
  };
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function listRelatedRelations(): RelationType[] {
  return [...RELATION_TYPES];
}
