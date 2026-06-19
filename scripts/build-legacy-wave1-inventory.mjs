#!/usr/bin/env node
import {readdir, stat, writeFile} from 'node:fs/promises';
import {join, relative, extname, basename} from 'node:path';

const [legacyRoot, outputPath] = process.argv.slice(2);
if (!legacyRoot || !outputPath) {
  throw new Error('Usage: node scripts/build-legacy-wave1-inventory.mjs <legacy-root> <output-json>');
}

const familyRules = [
  ['core', /^01_CORE\//], ['contracts', /^02_CONTRACTS\//], ['apps', /^03_APPS\//],
  ['engines', /^04_ENGINES\//], ['personas', /^05_PERSONAS\//], ['datasets', /^08_DATASETS\//],
  ['events', /^09_EVENTS\//], ['deployment', /^11_DEPLOYMENT\//], ['factories', /^FACTORIES\//],
];
const priority = (path) => {
  if (/^(START_HERE|PROTOCOLE_|MASTERFLOW_CURRENT_TASKS|01_CORE\/MASTERFLOW_(ACTIVE_CONTRACT_INDEX|CORE_INDEX|GLOBAL_MANIFEST|MINIMUM_VIABLE_CORE))/.test(path)) return 'P0';
  if (/^(01_CORE|02_CONTRACTS|03_APPS|04_ENGINES|08_DATASETS|11_DEPLOYMENT)\//.test(path)) return 'P1';
  if (/^FACTORIES\//.test(path)) return 'P2';
  return 'P3';
};
async function walk(dir) {
  const entries = await readdir(dir, {withFileTypes: true});
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  }));
  return nested.flat();
}
const files = await walk(legacyRoot);
const rows = await Promise.all(files.map(async (file) => {
  const rel = relative(legacyRoot, file).split('\\').join('/');
  const info = await stat(file);
  const family = familyRules.find(([, rule]) => rule.test(rel))?.[0] ?? 'other';
  return {legacy_id: `LEGACY-${String(rel).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toUpperCase()}`, relative_path: rel, family, priority: priority(rel), extension: extname(rel).toLowerCase() || '[none]', bytes: info.size, basename: basename(rel)};
}));
rows.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
const countBy = (field) => Object.fromEntries(Object.entries(Object.groupBy(rows, (row) => row[field])).map(([key, value]) => [key, value.length]));
await writeFile(outputPath, JSON.stringify({schema_version: 1, generated_at: new Date().toISOString(), legacy_root: legacyRoot, file_count: rows.length, counts: {family: countBy('family'), priority: countBy('priority'), extension: countBy('extension')}, entries: rows}, null, 2) + '\n');
