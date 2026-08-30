#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error('Usage: node scripts/normalize_pedagogical_examples.mjs <legacy.json> <seed.json>');
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
const source = JSON.parse(readFileSync(input, 'utf8'));

if (!Array.isArray(source.projects)) {
  throw new Error('Source invalide: projects[] absent');
}

function stableId(project) {
  if (typeof project.id_projet === 'string' && project.id_projet.trim()) {
    return project.id_projet.trim().toLowerCase();
  }
  const fingerprint = createHash('sha256')
    .update(`${project.titre ?? ''}\n${project.lien ?? ''}`)
    .digest('hex')
    .slice(0, 12);
  return `example_${fingerprint}`;
}

const projects = source.projects.map((project) => ({
  id: stableId(project),
  legacy_id: project.id_projet ?? null,
  title: String(project.titre ?? '').trim(),
  url: typeof project.lien === 'string' && project.lien.trim() ? project.lien.trim() : null,
  academic_level_source: project.niveau_etudiant ?? null,
  technical_level: project.niveau_technique ?? null,
  description: project.description ?? null,
  pedagogical_reading: project.lecture_pedagogique ?? null,
  motion_notions: Array.isArray(project.notions_motion) ? project.notions_motion : [],
  technical_notions: Array.isArray(project.notions_techniques) ? project.notions_techniques : [],
  course_notions: Array.isArray(project.notions_cours_associees) ? project.notions_cours_associees : [],
  useful_course_video_refs: Array.isArray(project.videos_cours_utiles) ? project.videos_cours_utiles : [],
  tags: Array.isArray(project.tags) ? project.tags : [],
  usable_for: Array.isArray(project.utilisable_pour) ? project.utilisable_pour : [],
}));

const normalized = {
  schema_version: 'masterflow.pedagogical_examples_seed.v1',
  source_dataset: source.meta?.dataset ?? 'MASTERFLOW_ROUTING_EXEMPLES',
  source_version: source.meta?.version ?? null,
  source_ref: `legacy:${source.meta?.dataset ?? 'MASTERFLOW_ROUTING_EXEMPLES'}:${source.meta?.version ?? 'unknown'}`,
  projects,
};

writeFileSync(output, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
console.log(`Normalized ${projects.length} examples -> ${output}`);
