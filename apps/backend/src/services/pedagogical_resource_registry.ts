import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';

import type {
  AcademicFramework,
  AdjustPedagogicalClassification,
  PedagogicalClassification,
  PedagogicalResourceResult,
  PedagogicalResourceSearchResponse,
} from '@masterflow/shared';

import {getDb} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

type JsonRecord = Record<string, unknown>;

type VideoSeed = {
  id: string;
  video_id: string;
  title: string;
  duration?: string | null;
  software?: string[];
  topics?: string[];
  url?: string | null;
  data_json?: string;
};

type VideoNotion = {
  id: string;
  label: string;
  type?: string;
  timestamp?: string;
  difficulty_weight?: number;
  importance?: number;
  learning_stage?: string;
  keywords?: string[];
  synonyms?: string[];
  student_phrases?: string[];
  question_examples?: string[];
  related_notions?: string[];
  prerequisites?: string[];
  misconceptions?: string[];
};

type ExampleSeed = {
  id: string;
  legacy_id: string | null;
  title: string;
  url: string | null;
  academic_level_source: string | null;
  technical_level: string | null;
  description: string | null;
  pedagogical_reading: string | null;
  motion_notions: string[];
  technical_notions: string[];
  course_notions: string[];
  useful_course_video_refs: string[];
  tags: string[];
  usable_for: string[];
};

type ExampleSeedFile = {
  schema_version: string;
  source_dataset: string;
  source_version: string | null;
  source_ref: string;
  projects: ExampleSeed[];
};

type ClassificationRow = {
  id: string;
  resource_id: string;
  framework_id: string;
  inferred_level_id: string | null;
  teacher_level_id: string | null;
  teacher_locked: number;
  source_value: string | null;
  source_hash: string;
  confidence: number;
  inference_method: string;
  evidence_json: string;
  status: 'candidate' | 'validated' | 'needs_review' | 'outdated';
  created_at: number;
  updated_at: number;
};

type FrameworkRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  status: 'active' | 'archived';
};

type LevelRow = {
  id: string;
  framework_id: string;
  code: string;
  label: string;
  short_label: string;
  sort_order: number;
  status: 'active' | 'archived';
};

type Inference = {
  levelId: string | null;
  confidence: number;
  method: string;
  evidence: string[];
  ambiguous: boolean;
};

const DEFAULT_FRAMEWORK_CODE = 'higher_education_fr';
const VIDEO_SOURCE_REF = 'canon:MASTERFLOW_ROUTING_PEDAGO:2.1';

const DEFAULT_LEVELS = [
  {code: 'B1', label: 'Bachelor 1 / 1re annee', short: '1re', order: 10, aliases: ['b1', 'bachelor 1', '1e', '1ere', '1ere annee', 'is01', 'is1']},
  {code: 'B2', label: 'Bachelor 2 / 2e annee', short: '2e', order: 20, aliases: ['b2', 'bachelor 2', '2e', '2eme', '2eme annee', 'is02', 'is2']},
  {code: 'B3', label: 'Bachelor 3 / 3e annee', short: '3e', order: 30, aliases: ['b3', 'bachelor 3', '3e', '3eme', '3eme annee', 'is03', 'is3']},
  {code: 'B4', label: 'Master 1 / 4e annee', short: '4e', order: 40, aliases: ['b4', 'master 1', 'mba 1', 'm1', '4e', '4eme', '4eme annee', 'is04', 'is4']},
  {code: 'B5', label: 'Master 2 / 5e annee', short: '5e', order: 50, aliases: ['b5', 'master 2', 'mba 2', 'm2', '5e', '5eme', '5eme annee', 'is05', 'is5']},
] as const;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stableHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function deterministicId(prefix: string, value: string): string {
  return `${prefix}-${createHash('sha256').update(value).digest('hex').slice(0, 24)}`;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseDuration(value?: string | null): number | null {
  if (!value) return null;
  const parts = value.split(':').map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return null;
}

function loadSeed<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../seeds/${name}`, import.meta.url), 'utf8')) as T;
}

export function ensureDefaultAcademicFramework(): void {
  const db = getDb();
  const now = Date.now();
  const frameworkId = 'academic-framework-higher-education-fr';
  db.prepare(`
    INSERT INTO academic_frameworks (id, code, label, description, status, source_ref, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET label = excluded.label, description = excluded.description, updated_at = excluded.updated_at
  `).run(
    frameworkId,
    DEFAULT_FRAMEWORK_CODE,
    'Enseignement superieur francais',
    'Cadre initial editable. Les etablissements peuvent ajouter leurs propres niveaux et alias.',
    'masterflow_default_seed',
    now,
    now,
  );

  const levelInsert = db.prepare(`
    INSERT INTO academic_levels (id, framework_id, code, label, short_label, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(framework_id, code) DO UPDATE SET
      label = excluded.label, short_label = excluded.short_label,
      sort_order = excluded.sort_order, updated_at = excluded.updated_at
  `);
  const aliasInsert = db.prepare(`
    INSERT OR IGNORE INTO academic_level_aliases
      (id, level_id, alias, normalized_alias, source, confidence, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'masterflow_default_seed', 1, 1, ?, ?)
  `);

  for (const level of DEFAULT_LEVELS) {
    const levelId = `academic-level-${level.code.toLowerCase()}`;
    levelInsert.run(levelId, frameworkId, level.code, level.label, level.short, level.order, now, now);
    for (const alias of [level.code, level.short, ...level.aliases]) {
      const normalizedAlias = normalize(alias);
      aliasInsert.run(
        deterministicId('academic-alias', `${levelId}:${normalizedAlias}`),
        levelId,
        alias,
        normalizedAlias,
        now,
        now,
      );
    }
  }
}

export function listAcademicFrameworks(): AcademicFramework[] {
  const db = getDb();
  const frameworks = db.prepare('SELECT * FROM academic_frameworks ORDER BY label ASC').all() as FrameworkRow[];
  return frameworks.map((framework) => {
    const levels = db.prepare(`
      SELECT * FROM academic_levels WHERE framework_id = ? ORDER BY sort_order ASC, label ASC
    `).all(framework.id) as LevelRow[];
    return {
      id: framework.id,
      code: framework.code,
      label: framework.label,
      description: framework.description,
      status: framework.status,
      levels: levels.map((level) => ({
        id: level.id,
        framework_id: level.framework_id,
        code: level.code,
        label: level.label,
        short_label: level.short_label,
        sort_order: level.sort_order,
        status: level.status,
        aliases: (db.prepare(`
          SELECT alias FROM academic_level_aliases WHERE level_id = ? AND active = 1 ORDER BY alias ASC
        `).all(level.id) as Array<{alias: string}>).map((row) => row.alias),
      })),
    };
  });
}

function getFrameworkByCode(code: string): FrameworkRow | undefined {
  return getDb().prepare('SELECT * FROM academic_frameworks WHERE code = ? AND status = ?')
    .get(code, 'active') as FrameworkRow | undefined;
}

function inferAcademicLevel(frameworkId: string, sourceValue: string | null): Inference {
  if (!sourceValue?.trim()) {
    return {levelId: null, confidence: 0, method: 'no_source_value', evidence: ['Aucun niveau explicite dans la source.'], ambiguous: false};
  }
  const input = ` ${normalize(sourceValue)} `;
  const rows = getDb().prepare(`
    SELECT a.normalized_alias, a.alias, a.confidence, l.id AS level_id, l.code AS level_code
    FROM academic_level_aliases a
    JOIN academic_levels l ON l.id = a.level_id
    WHERE l.framework_id = ? AND l.status = 'active' AND a.active = 1
    ORDER BY length(a.normalized_alias) DESC
  `).all(frameworkId) as Array<{
    normalized_alias: string;
    alias: string;
    confidence: number;
    level_id: string;
    level_code: string;
  }>;

  const matches = rows.filter((row) => input.includes(` ${row.normalized_alias} `));
  const levelIds = [...new Set(matches.map((row) => row.level_id))];
  if (levelIds.length === 0) {
    return {
      levelId: null,
      confidence: 0.2,
      method: 'alias_not_found',
      evidence: [`Valeur source non reconnue: ${sourceValue}`],
      ambiguous: false,
    };
  }
  if (levelIds.length > 1) {
    return {
      levelId: null,
      confidence: 0,
      method: 'ambiguous_aliases',
      evidence: matches.map((row) => `${row.alias} -> ${row.level_code}`),
      ambiguous: true,
    };
  }
  const best = matches[0]!;
  return {
    levelId: best.level_id,
    confidence: Math.max(...matches.map((row) => row.confidence)),
    method: 'explicit_alias',
    evidence: [`${sourceValue} -> ${best.level_code} via ${best.alias}`],
    ambiguous: false,
  };
}

function recordClassificationEvent(
  classificationId: string,
  eventType: 'inferred' | 'source_changed' | 'teacher_override' | 'teacher_override_cleared' | 'validated',
  previous: unknown,
  next: unknown,
  actorId: string | null,
  reason?: string,
): void {
  getDb().prepare(`
    INSERT INTO pedagogical_classification_events
      (id, classification_id, actor_id, event_type, previous_json, next_json, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(uuid(), classificationId, actorId, eventType, previous ? JSON.stringify(previous) : null, JSON.stringify(next), reason ?? null, Date.now());
}

export function reconcilePedagogicalClassification(
  resourceId: string,
  sourceValue: string | null,
  sourceHash: string,
): void {
  const framework = getFrameworkByCode(DEFAULT_FRAMEWORK_CODE);
  if (!framework) throw new Error('default_academic_framework_missing');
  const inferred = inferAcademicLevel(framework.id, sourceValue);
  const db = getDb();
  const current = db.prepare(`
    SELECT * FROM pedagogical_resource_classifications WHERE resource_id = ? AND framework_id = ?
  `).get(resourceId, framework.id) as ClassificationRow | undefined;
  const now = Date.now();
  const inferredStatus: ClassificationRow['status'] = inferred.ambiguous ? 'needs_review' : 'candidate';

  if (!current) {
    const id = uuid();
    db.prepare(`
      INSERT INTO pedagogical_resource_classifications
        (id, resource_id, framework_id, inferred_level_id, teacher_level_id, teacher_locked,
         source_value, source_hash, confidence, inference_method, evidence_json, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, 0, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      resourceId,
      framework.id,
      inferred.levelId,
      sourceValue,
      sourceHash,
      inferred.confidence,
      inferred.method,
      JSON.stringify(inferred.evidence),
      inferredStatus,
      now,
      now,
    );
    recordClassificationEvent(id, 'inferred', null, {sourceValue, inferred}, null);
    return;
  }

  if (current.source_hash === sourceHash) return;
  const inferenceChanged = current.inferred_level_id !== inferred.levelId;
  const nextStatus: ClassificationRow['status'] = current.teacher_locked === 1
    ? (inferenceChanged ? 'needs_review' : current.status)
    : (inferenceChanged ? inferredStatus : current.status);
  db.prepare(`
    UPDATE pedagogical_resource_classifications SET
      inferred_level_id = ?, source_value = ?, source_hash = ?, confidence = ?,
      inference_method = ?, evidence_json = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    inferred.levelId,
    sourceValue,
    sourceHash,
    inferred.confidence,
    inferred.method,
    JSON.stringify(inferred.evidence),
    nextStatus,
    now,
    current.id,
  );
  recordClassificationEvent(
    current.id,
    'source_changed',
    {source_value: current.source_value, inferred_level_id: current.inferred_level_id, teacher_locked: current.teacher_locked === 1},
    {sourceValue, inferred, teacher_override_preserved: current.teacher_locked === 1},
    null,
  );
}

function upsertParentResource(input: {
  id: string;
  type: string;
  title: string;
  url: string | null;
  source: string;
  status: 'candidate' | 'validated';
  subjects: string[];
}): void {
  getDb().prepare(`
    INSERT INTO resources (id, type, title, url, source, status, subjects_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type, title = excluded.title, url = excluded.url,
      source = excluded.source, subjects_json = excluded.subjects_json
  `).run(input.id, input.type, input.title, input.url, input.source, input.status, JSON.stringify(input.subjects), Date.now());
}

function upsertProfile(input: {
  resourceId: string;
  legacyId: string | null;
  resourceKind: string;
  format: string;
  durationSeconds: number | null;
  description: string | null;
  pedagogicalReading: string | null;
  technicalLevel: string | null;
  learningStage: string | null;
  software: string[];
  tags: string[];
  usableFor: string[];
  sourceRef: string;
  sourceHash: string;
  validationState: 'candidate' | 'review_needed' | 'validated';
  metadata?: JsonRecord;
}): void {
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO pedagogical_resource_profiles
      (resource_id, legacy_id, resource_kind, format, source_platform, duration_seconds,
       description, pedagogical_reading, technical_level, learning_stage, software_json,
       tags_json, usable_for_json, source_ref, source_hash, owner_key, visibility_scope,
       consultable, reuse_allowed, export_allowed, validation_state, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'youtube', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RESOURCE_ENGINE',
            'authenticated', 1, 1, 0, ?, ?, ?, ?)
    ON CONFLICT(resource_id) DO UPDATE SET
      legacy_id = excluded.legacy_id, resource_kind = excluded.resource_kind, format = excluded.format,
      duration_seconds = excluded.duration_seconds, description = excluded.description,
      pedagogical_reading = excluded.pedagogical_reading, technical_level = excluded.technical_level,
      learning_stage = excluded.learning_stage, software_json = excluded.software_json,
      tags_json = excluded.tags_json, usable_for_json = excluded.usable_for_json,
      source_ref = excluded.source_ref, source_hash = excluded.source_hash,
      metadata_json = excluded.metadata_json, updated_at = excluded.updated_at
  `).run(
    input.resourceId,
    input.legacyId,
    input.resourceKind,
    input.format,
    input.durationSeconds,
    input.description,
    input.pedagogicalReading,
    input.technicalLevel,
    input.learningStage,
    JSON.stringify(input.software),
    JSON.stringify(input.tags),
    JSON.stringify(input.usableFor),
    input.sourceRef,
    input.sourceHash,
    input.validationState,
    JSON.stringify(input.metadata ?? {}),
    now,
    now,
  );
}

function upsertNotion(
  notionId: string,
  label: string,
  notionType: string,
  aliases: string[],
  validationState: 'candidate' | 'review_needed' | 'validated',
  metadata: JsonRecord,
): string {
  const db = getDb();
  const id = deterministicId('ped-notion', notionId);
  const existing = db.prepare('SELECT label, notion_type, validation_state FROM pedagogical_notions WHERE id = ?')
    .get(id) as {label: string; notion_type: string; validation_state: string} | undefined;
  const hasConflict = Boolean(existing && (existing.label !== label || existing.notion_type !== notionType));
  const now = Date.now();
  db.prepare(`
    INSERT INTO pedagogical_notions
      (id, notion_id, label, normalized_label, notion_type, aliases_json, validation_state, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      aliases_json = excluded.aliases_json,
      validation_state = CASE
        WHEN pedagogical_notions.validation_state = 'validated' THEN pedagogical_notions.validation_state
        WHEN ? = 1 THEN 'review_needed'
        ELSE excluded.validation_state
      END,
      metadata_json = excluded.metadata_json,
      updated_at = excluded.updated_at
  `).run(
    id,
    notionId,
    label,
    normalize(label),
    notionType,
    JSON.stringify(aliases),
    hasConflict ? 'review_needed' : validationState,
    JSON.stringify(metadata),
    now,
    now,
    hasConflict ? 1 : 0,
  );
  return id;
}

function upsertNotionLink(input: {
  resourceId: string;
  notionId: string;
  relation: 'teaches' | 'illustrates';
  timestampSeconds: number | null;
  importance: number | null;
  difficulty: number | null;
  learningStage: string | null;
  sourceRef: string;
  metadata: JsonRecord;
}): void {
  const id = deterministicId('ped-link', `${input.resourceId}:${input.notionId}:${input.relation}`);
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO pedagogical_resource_notion_links
      (id, resource_id, notion_id, relation_type, timestamp_seconds, importance,
       difficulty_weight, learning_stage, source_ref, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(resource_id, notion_id, relation_type) DO UPDATE SET
      timestamp_seconds = excluded.timestamp_seconds, importance = excluded.importance,
      difficulty_weight = excluded.difficulty_weight, learning_stage = excluded.learning_stage,
      source_ref = excluded.source_ref, metadata_json = excluded.metadata_json, updated_at = excluded.updated_at
  `).run(
    id,
    input.resourceId,
    input.notionId,
    input.relation,
    input.timestampSeconds,
    input.importance,
    input.difficulty,
    input.learningStage,
    input.sourceRef,
    JSON.stringify(input.metadata),
    now,
    now,
  );
}

function upsertEdge(input: {
  fromType: string;
  fromRef: string;
  toType: string;
  toRef: string;
  relation: string;
  sourceRef: string;
  validationState: 'candidate' | 'review_needed' | 'validated';
  confidence?: number;
}): void {
  const id = deterministicId('ped-edge', `${input.fromType}:${input.fromRef}:${input.toType}:${input.toRef}:${input.relation}:${input.sourceRef}`);
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO pedagogical_routing_edges
      (id, from_type, from_ref, to_type, to_ref, relation, confidence,
       source_ref, validation_state, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(from_type, from_ref, to_type, to_ref, relation, source_ref) DO UPDATE SET
      confidence = excluded.confidence, validation_state = excluded.validation_state, updated_at = excluded.updated_at
  `).run(
    id,
    input.fromType,
    input.fromRef,
    input.toType,
    input.toRef,
    input.relation,
    input.confidence ?? 1,
    input.sourceRef,
    input.validationState,
    now,
    now,
  );
}

function refreshFts(resourceId: string): void {
  const db = getDb();
  const row = db.prepare(`
    SELECT r.title, p.description, p.pedagogical_reading, p.software_json, p.tags_json, p.usable_for_json
    FROM resources r JOIN pedagogical_resource_profiles p ON p.resource_id = r.id
    WHERE r.id = ?
  `).get(resourceId) as {
    title: string;
    description: string | null;
    pedagogical_reading: string | null;
    software_json: string;
    tags_json: string;
    usable_for_json: string;
  } | undefined;
  if (!row) return;
  const notions = db.prepare(`
    SELECT n.label, n.aliases_json, l.metadata_json
    FROM pedagogical_resource_notion_links l
    JOIN pedagogical_notions n ON n.id = l.notion_id
    WHERE l.resource_id = ?
  `).all(resourceId) as Array<{label: string; aliases_json: string; metadata_json: string}>;
  const notionLabels = notions.flatMap((notion) => [notion.label, ...parseJson<string[]>(notion.aliases_json, [])]);
  const metadata = notions.map((notion) => parseJson<JsonRecord>(notion.metadata_json, {}));
  const keywords = metadata.flatMap((item) => Array.isArray(item.keywords) ? item.keywords.map(String) : []);
  const studentPhrases = metadata.flatMap((item) => Array.isArray(item.student_phrases) ? item.student_phrases.map(String) : []);

  db.prepare('DELETE FROM pedagogical_resource_fts WHERE resource_id = ?').run(resourceId);
  db.prepare(`
    INSERT INTO pedagogical_resource_fts
      (resource_id, title, description, notions, keywords, software, student_phrases)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    resourceId,
    row.title,
    [row.description, row.pedagogical_reading].filter(Boolean).join(' '),
    notionLabels.join(' '),
    [...keywords, ...parseJson<string[]>(row.tags_json, []), ...parseJson<string[]>(row.usable_for_json, [])].join(' '),
    parseJson<string[]>(row.software_json, []).join(' '),
    studentPhrases.join(' '),
  );
}

function importVideos(videos: VideoSeed[], sourceHash: string): {written: number; warnings: string[]} {
  const warnings: string[] = [];
  const notionRefs = new Set<string>();
  for (const video of videos) {
    const data = parseJson<{notions?: VideoNotion[]; chapters?: unknown[]}>(video.data_json, {});
    for (const notion of data.notions ?? []) notionRefs.add(notion.id);
  }

  for (const video of videos) {
    const resourceId = `ped-video-${video.video_id.toLowerCase()}`;
    const data = parseJson<{notions?: VideoNotion[]; chapters?: unknown[]}>(video.data_json, {});
    const notions = data.notions ?? [];
    const resourceHash = stableHash(video);
    upsertParentResource({
      id: resourceId,
      type: 'tutorial_video',
      title: video.title,
      url: video.url ?? null,
      source: VIDEO_SOURCE_REF,
      status: 'validated',
      subjects: [...(video.software ?? []), ...(video.topics ?? [])],
    });
    upsertProfile({
      resourceId,
      legacyId: video.video_id,
      resourceKind: 'tutorial',
      format: 'video',
      durationSeconds: parseDuration(video.duration),
      description: null,
      pedagogicalReading: null,
      technicalLevel: video.video_id.startsWith('N1_') ? 'foundation' : 'advanced',
      learningStage: null,
      software: video.software ?? [],
      tags: video.topics ?? [],
      usableFor: [],
      sourceRef: VIDEO_SOURCE_REF,
      sourceHash: resourceHash,
      validationState: 'validated',
      metadata: {chapters: data.chapters ?? []},
    });

    for (const notion of notions) {
      const notionDbId = upsertNotion(
        notion.id,
        notion.label,
        notion.type ?? 'concept',
        notion.synonyms ?? [],
        'validated',
        {
          keywords: notion.keywords ?? [],
          student_phrases: notion.student_phrases ?? [],
          question_examples: notion.question_examples ?? [],
          misconceptions: notion.misconceptions ?? [],
        },
      );
      upsertNotionLink({
        resourceId,
        notionId: notionDbId,
        relation: 'teaches',
        timestampSeconds: parseDuration(notion.timestamp),
        importance: notion.importance ?? null,
        difficulty: notion.difficulty_weight ?? null,
        learningStage: notion.learning_stage ?? null,
        sourceRef: VIDEO_SOURCE_REF,
        metadata: {legacy_notion_id: notion.id},
      });
      for (const prerequisite of notion.prerequisites ?? []) {
        if (!notionRefs.has(prerequisite)) warnings.push(`Prerequis absent: ${notion.id} -> ${prerequisite}`);
        upsertEdge({
          fromType: 'notion',
          fromRef: notion.id,
          toType: 'notion',
          toRef: prerequisite,
          relation: 'prerequisites',
          sourceRef: VIDEO_SOURCE_REF,
          validationState: notionRefs.has(prerequisite) ? 'validated' : 'review_needed',
          confidence: notionRefs.has(prerequisite) ? 1 : 0.4,
        });
      }
      for (const related of notion.related_notions ?? []) {
        if (!notionRefs.has(related)) warnings.push(`Notion liee absente: ${notion.id} -> ${related}`);
        upsertEdge({
          fromType: 'notion',
          fromRef: notion.id,
          toType: 'notion',
          toRef: related,
          relation: 'related_to',
          sourceRef: VIDEO_SOURCE_REF,
          validationState: notionRefs.has(related) ? 'validated' : 'review_needed',
          confidence: notionRefs.has(related) ? 0.8 : 0.4,
        });
      }
    }
    refreshFts(resourceId);
  }

  return {written: videos.length, warnings: [...new Set(warnings)]};
}

function notionIdFromLabel(label: string): string {
  const normalizedLabel = normalize(label).replace(/ /g, '_');
  return normalizedLabel || deterministicId('notion', label);
}

function importExamples(seed: ExampleSeedFile, sourceHash: string): {written: number; warnings: string[]} {
  const warnings: string[] = [];
  for (const example of seed.projects) {
    const resourceId = `ped-example-${example.id.toLowerCase()}`;
    const resourceHash = stableHash(example);
    const allNotions = [...new Set([...example.motion_notions, ...example.technical_notions, ...example.course_notions])];
    upsertParentResource({
      id: resourceId,
      type: 'example_case',
      title: example.title,
      url: example.url,
      source: seed.source_ref,
      status: 'candidate',
      subjects: [...example.tags, ...allNotions],
    });
    upsertProfile({
      resourceId,
      legacyId: example.legacy_id,
      resourceKind: 'example_case',
      format: 'video',
      durationSeconds: null,
      description: example.description,
      pedagogicalReading: example.pedagogical_reading,
      technicalLevel: example.technical_level,
      learningStage: null,
      software: [],
      tags: example.tags,
      usableFor: example.usable_for,
      sourceRef: seed.source_ref,
      sourceHash: resourceHash,
      validationState: 'review_needed',
      metadata: {academic_level_source: example.academic_level_source},
    });
    for (const label of allNotions) {
      const canonicalNotionId = notionIdFromLabel(label);
      const notionDbId = upsertNotion(canonicalNotionId, label, 'concept', [], 'candidate', {source: seed.source_ref});
      upsertNotionLink({
        resourceId,
        notionId: notionDbId,
        relation: 'illustrates',
        timestampSeconds: null,
        importance: null,
        difficulty: null,
        learningStage: null,
        sourceRef: seed.source_ref,
        metadata: {},
      });
    }
    for (const videoRef of example.useful_course_video_refs) {
      upsertEdge({
        fromType: 'resource',
        fromRef: resourceId,
        toType: 'resource',
        toRef: `ped-video-${videoRef.toLowerCase()}`,
        relation: 'supports_project',
        sourceRef: seed.source_ref,
        validationState: 'review_needed',
        confidence: 0.8,
      });
    }
    reconcilePedagogicalClassification(resourceId, example.academic_level_source, resourceHash);
    if (!example.legacy_id) warnings.push(`ID legacy absent, ID stable genere: ${example.title}`);
    refreshFts(resourceId);
  }
  return {written: seed.projects.length, warnings};
}

function recordImport(input: {
  sourceRef: string;
  sourceHash: string;
  sourceKind: string;
  status: 'applied' | 'unchanged' | 'partial' | 'rejected';
  seen: number;
  written: number;
  warnings: string[];
}): void {
  getDb().prepare(`
    INSERT OR IGNORE INTO pedagogical_resource_imports
      (id, source_ref, source_hash, source_kind, status, resources_seen,
       resources_written, warnings_count, report_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuid(),
    input.sourceRef,
    input.sourceHash,
    input.sourceKind,
    input.status,
    input.seen,
    input.written,
    input.warnings.length,
    JSON.stringify({warnings: input.warnings}),
    Date.now(),
  );
}

export function syncPedagogicalResourceRegistry(): {
  videos: number;
  examples: number;
  warnings: number;
  unchanged: boolean;
} {
  ensureDefaultAcademicFramework();
  const db = getDb();
  const videos = loadSeed<VideoSeed[]>('pedagogical_video_resources_seed.json');
  const examples = loadSeed<ExampleSeedFile>('pedagogical_examples_seed.json');
  const videoHash = stableHash(videos);
  const exampleHash = stableHash(examples);
  const hasVideoImport = Boolean(db.prepare(`
    SELECT 1 FROM pedagogical_resource_imports WHERE source_ref = ? AND source_hash = ?
  `).get(VIDEO_SOURCE_REF, videoHash));
  const hasExampleImport = Boolean(db.prepare(`
    SELECT 1 FROM pedagogical_resource_imports WHERE source_ref = ? AND source_hash = ?
  `).get(examples.source_ref, exampleHash));

  if (hasVideoImport && hasExampleImport) {
    return {videos: videos.length, examples: examples.projects.length, warnings: 0, unchanged: true};
  }

  let warningCount = 0;
  const tx = db.transaction(() => {
    if (!hasVideoImport) {
      const result = importVideos(videos, videoHash);
      warningCount += result.warnings.length;
      recordImport({
        sourceRef: VIDEO_SOURCE_REF,
        sourceHash: videoHash,
        sourceKind: 'canonical_seed',
        status: result.warnings.length ? 'partial' : 'applied',
        seen: videos.length,
        written: result.written,
        warnings: result.warnings,
      });
    }
    if (!hasExampleImport) {
      const result = importExamples(examples, exampleHash);
      warningCount += result.warnings.length;
      recordImport({
        sourceRef: examples.source_ref,
        sourceHash: exampleHash,
        sourceKind: 'legacy_candidate_seed',
        status: result.warnings.length ? 'partial' : 'applied',
        seen: examples.projects.length,
        written: result.written,
        warnings: result.warnings,
      });
    }
  });
  tx();

  return {videos: videos.length, examples: examples.projects.length, warnings: warningCount, unchanged: false};
}

function classificationToDto(row: ClassificationRow | undefined): PedagogicalClassification | null {
  if (!row) return null;
  const db = getDb();
  const framework = db.prepare('SELECT code FROM academic_frameworks WHERE id = ?').get(row.framework_id) as {code: string};
  const levelCode = (levelId: string | null): string | null => {
    if (!levelId) return null;
    return (db.prepare('SELECT code FROM academic_levels WHERE id = ?').get(levelId) as {code: string} | undefined)?.code ?? null;
  };
  const inferred = levelCode(row.inferred_level_id);
  const teacher = levelCode(row.teacher_level_id);
  return {
    framework_code: framework.code,
    inferred_level_code: inferred,
    teacher_level_code: teacher,
    effective_level_code: row.teacher_locked === 1 ? teacher : inferred,
    teacher_locked: row.teacher_locked === 1,
    source_value: row.source_value,
    confidence: row.confidence,
    status: row.status,
    explanation: [
      ...parseJson<string[]>(row.evidence_json, []),
      ...(row.teacher_locked === 1 ? ['Classement professeur prioritaire.'] : []),
      ...(row.status === 'needs_review' ? ['La source a change: verification recommandee.'] : []),
    ],
  };
}

function ftsQuery(value: string): string {
  const terms = normalize(value).split(' ').filter((term) => term.length >= 2);
  return terms.map((term) => `"${term.replace(/"/g, '""')}"*`).join(' OR ');
}

export function searchPedagogicalResources(input: {
  query?: string;
  frameworkCode?: string;
  levelCode?: string;
  software?: string;
  includeCandidates?: boolean;
  limit?: number;
}): PedagogicalResourceSearchResponse {
  const db = getDb();
  const query = input.query?.trim() ?? '';
  const frameworkCode = input.frameworkCode ?? DEFAULT_FRAMEWORK_CODE;
  const framework = getFrameworkByCode(frameworkCode);
  if (!framework) throw new Error('academic_framework_not_found');
  const targetLevel = input.levelCode
    ? db.prepare('SELECT * FROM academic_levels WHERE framework_id = ? AND code = ? AND status = ?')
      .get(framework.id, input.levelCode, 'active') as LevelRow | undefined
    : undefined;
  if (input.levelCode && !targetLevel) throw new Error('academic_level_not_found');
  const limit = Math.min(Math.max(input.limit ?? 5, 1), 20);

  let candidates: Array<{resource_id: string; rank: number}>;
  const match = ftsQuery(query);
  if (match) {
    candidates = db.prepare(`
      SELECT resource_id, bm25(pedagogical_resource_fts, 0, 4, 2, 3, 2, 2, 3) AS rank
      FROM pedagogical_resource_fts
      WHERE pedagogical_resource_fts MATCH ?
      ORDER BY rank ASC LIMIT 100
    `).all(match) as Array<{resource_id: string; rank: number}>;
  } else {
    candidates = db.prepare(`
      SELECT resource_id, 0 AS rank FROM pedagogical_resource_profiles ORDER BY updated_at DESC LIMIT 100
    `).all() as Array<{resource_id: string; rank: number}>;
  }

  const results: PedagogicalResourceResult[] = [];
  for (const candidate of candidates) {
    const row = db.prepare(`
      SELECT r.id, r.title, r.url, r.status, p.resource_kind, p.format, p.validation_state,
             p.duration_seconds, p.software_json, p.source_ref
      FROM resources r JOIN pedagogical_resource_profiles p ON p.resource_id = r.id
      WHERE r.id = ?
    `).get(candidate.resource_id) as {
      id: string;
      title: string;
      url: string | null;
      status: 'candidate' | 'validated' | 'deprecated';
      resource_kind: string;
      format: string;
      validation_state: 'candidate' | 'review_needed' | 'validated' | 'rejected' | 'outdated';
      duration_seconds: number | null;
      software_json: string;
      source_ref: string;
    } | undefined;
    if (!row || row.status === 'deprecated' || (!input.includeCandidates && row.status !== 'validated')) continue;
    const software = parseJson<string[]>(row.software_json, []);
    if (input.software && !software.some((value) => normalize(value) === normalize(input.software!))) continue;

    const classificationRow = db.prepare(`
      SELECT * FROM pedagogical_resource_classifications WHERE resource_id = ? AND framework_id = ?
    `).get(row.id, framework.id) as ClassificationRow | undefined;
    const classification = classificationToDto(classificationRow);
    const notions = db.prepare(`
      SELECT n.notion_id, n.label, l.timestamp_seconds, l.importance
      FROM pedagogical_resource_notion_links l
      JOIN pedagogical_notions n ON n.id = l.notion_id
      WHERE l.resource_id = ?
      ORDER BY COALESCE(l.importance, 0) DESC, n.label ASC
    `).all(row.id) as Array<{notion_id: string; label: string; timestamp_seconds: number | null; importance: number | null}>;
    const queryTerms = normalize(query).split(' ').filter(Boolean);
    const matchingNotions = notions.filter((notion) => {
      const label = normalize(notion.label);
      return queryTerms.length === 0 || queryTerms.some((term) => label.includes(term));
    }).slice(0, 4);
    const matchedNotions = matchingNotions.length > 0 ? matchingNotions : notions.slice(0, 3);

    const textScore = match ? 1 / (1 + Math.abs(candidate.rank)) : 0.35;
    let score = textScore;
    const why: string[] = [];
    if (matchingNotions.length > 0) {
      score += 0.3;
      why.push(`Notion correspondante: ${matchingNotions[0]!.label}`);
    }
    if (row.status === 'validated') {
      score += 0.2;
      why.push('Ressource interne validee.');
    } else {
      why.push('Ressource candidate: validation requise.');
    }
    if (targetLevel) {
      if (classification?.effective_level_code === targetLevel.code) {
        score += 0.25;
        why.push(`Niveau compatible: ${targetLevel.short_label}.`);
      } else if (!classification?.effective_level_code) {
        score += 0.05;
        why.push('Ressource transversale sans niveau impose.');
      } else {
        score -= 0.15;
        why.push(`Niveau source different: ${classification.effective_level_code}.`);
      }
    }
    if (input.software) {
      score += 0.15;
      why.push(`Logiciel correspondant: ${input.software}.`);
    }
    results.push({
      resource_id: row.id,
      title: row.title,
      url: row.url,
      resource_kind: row.resource_kind,
      format: row.format,
      status: row.status,
      validation_state: row.validation_state,
      duration_seconds: row.duration_seconds,
      software,
      matched_notions: matchedNotions.map((notion) => ({
        notion_id: notion.notion_id,
        label: notion.label,
        timestamp_seconds: notion.timestamp_seconds,
      })),
      classification,
      score: Math.round(score * 1000) / 1000,
      why,
      source_ref: row.source_ref,
    });
  }

  results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const sliced = results.slice(0, limit);
  return {
    results: sliced,
    total: sliced.length,
    query,
    framework_code: frameworkCode,
    level_code: targetLevel?.code ?? null,
  };
}

export function adjustPedagogicalClassification(
  actor: AuthUser,
  resourceId: string,
  input: AdjustPedagogicalClassification,
): PedagogicalClassification {
  const db = getDb();
  const framework = getFrameworkByCode(input.framework_code ?? DEFAULT_FRAMEWORK_CODE);
  if (!framework) throw new Error('academic_framework_not_found');
  const level = input.level_code
    ? db.prepare('SELECT * FROM academic_levels WHERE framework_id = ? AND code = ? AND status = ?')
      .get(framework.id, input.level_code, 'active') as LevelRow | undefined
    : undefined;
  if (input.level_code && !level) throw new Error('academic_level_not_found');
  const resource = db.prepare('SELECT 1 FROM pedagogical_resource_profiles WHERE resource_id = ?').get(resourceId);
  if (!resource) throw new Error('pedagogical_resource_not_found');

  let current = db.prepare(`
    SELECT * FROM pedagogical_resource_classifications WHERE resource_id = ? AND framework_id = ?
  `).get(resourceId, framework.id) as ClassificationRow | undefined;
  if (!current) {
    reconcilePedagogicalClassification(resourceId, null, stableHash({resourceId, source: 'manual_bootstrap'}));
    current = db.prepare(`
      SELECT * FROM pedagogical_resource_classifications WHERE resource_id = ? AND framework_id = ?
    `).get(resourceId, framework.id) as ClassificationRow;
  }
  const now = Date.now();
  const lock = input.lock ?? true;
  db.prepare(`
    UPDATE pedagogical_resource_classifications SET
      teacher_level_id = ?, teacher_locked = ?, status = 'validated', updated_at = ?
    WHERE id = ?
  `).run(level?.id ?? null, lock ? 1 : 0, now, current.id);
  const next = db.prepare('SELECT * FROM pedagogical_resource_classifications WHERE id = ?')
    .get(current.id) as ClassificationRow;
  recordClassificationEvent(
    current.id,
    lock ? 'teacher_override' : 'teacher_override_cleared',
    current,
    next,
    actor.id,
    input.reason,
  );
  audit({
    event_type: lock ? 'pedagogical_resource.classification_overridden' : 'pedagogical_resource.classification_override_cleared',
    user_id: actor.id,
    scope: 'pedagogical_resource',
    detail: {resource_id: resourceId, framework: framework.code, level: level?.code ?? null, reason: input.reason},
  });
  return classificationToDto(next)!;
}

export function addAcademicLevelAlias(
  actor: AuthUser,
  frameworkCode: string,
  levelCode: string,
  alias: string,
  reason: string,
): AcademicFramework[] {
  const framework = getFrameworkByCode(frameworkCode);
  if (!framework) throw new Error('academic_framework_not_found');
  const level = getDb().prepare('SELECT * FROM academic_levels WHERE framework_id = ? AND code = ? AND status = ?')
    .get(framework.id, levelCode, 'active') as LevelRow | undefined;
  if (!level) throw new Error('academic_level_not_found');
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) throw new Error('invalid_alias');
  const now = Date.now();
  getDb().prepare(`
    INSERT INTO academic_level_aliases
      (id, level_id, alias, normalized_alias, source, confidence, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'teacher', 1, 1, ?, ?)
    ON CONFLICT(level_id, normalized_alias) DO UPDATE SET
      alias = excluded.alias, active = 1, updated_at = excluded.updated_at
  `).run(deterministicId('academic-alias', `${level.id}:${normalizedAlias}`), level.id, alias, normalizedAlias, now, now);
  audit({
    event_type: 'academic_level.alias_added',
    user_id: actor.id,
    scope: 'academic_framework',
    detail: {framework: frameworkCode, level: levelCode, alias, reason},
  });
  return listAcademicFrameworks();
}

export function listClassificationReview(): Array<{
  resource_id: string;
  title: string;
  classification: PedagogicalClassification;
}> {
  const rows = getDb().prepare(`
    SELECT c.*, r.title
    FROM pedagogical_resource_classifications c
    JOIN resources r ON r.id = c.resource_id
    WHERE c.status IN ('candidate','needs_review')
    ORDER BY CASE c.status WHEN 'needs_review' THEN 0 ELSE 1 END, c.updated_at DESC
  `).all() as Array<ClassificationRow & {title: string}>;
  return rows.map((row) => ({resource_id: row.resource_id, title: row.title, classification: classificationToDto(row)!}));
}

export function pedagogicalResourceStats(): {
  resources: number;
  notions: number;
  edges: number;
  classifications_to_review: number;
} {
  const db = getDb();
  const count = (table: string, where = '') => (db.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`).get() as {n: number}).n;
  return {
    resources: count('pedagogical_resource_profiles'),
    notions: count('pedagogical_notions'),
    edges: count('pedagogical_routing_edges'),
    classifications_to_review: count('pedagogical_resource_classifications', "WHERE status IN ('candidate','needs_review')"),
  };
}
