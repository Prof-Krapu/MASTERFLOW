import {createHash} from 'node:crypto';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {extname, join, relative, resolve, sep} from 'node:path';

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const pilot = arg('--pilot');
const sourceRootArg = arg('--path');
const expectedArg = arg('--expected');
if (!pilot || !sourceRootArg || !['ours-dor', 'talents-creatifs'].includes(pilot)) {
  throw new Error('Usage: --pilot ours-dor|talents-creatifs --path <dossier> [--expected <n>]');
}
const sourceRoot = resolve(sourceRootArg);

function walk(root) {
  return readdirSync(root, {withFileTypes: true})
    .flatMap((entry) => {
      if (entry.name === '.DS_Store' || extname(entry.name).toLowerCase() === '.zip') return [];
      const full = join(root, entry.name);
      return entry.isDirectory() ? walk(full) : entry.isFile() ? [full] : [];
    })
    .sort();
}

function stableHash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function classifyTalents(relativePath) {
  const top = relativePath.split('/')[0] ?? '';
  if (['05_DEPOTS_ETUDIANTS', '09_VALORISATION_PORTFOLIO'].includes(top)) {
    return {source_role: 'student', rights: 'authorized'};
  }
  if (['01_BRIEFS_A_TRAITER', '02_SUJETS_VALIDES', '03_HYPERPLANNING_EXPORTS', '04_FORMULAIRES'].includes(top)) {
    return {source_role: 'teacher', rights: 'restricted'};
  }
  return {source_role: 'team', rights: 'restricted'};
}

const files = walk(sourceRoot);
if (expectedArg !== undefined && files.length !== Number(expectedArg)) {
  throw new Error(`Parité refusée: ${files.length} fichiers, ${expectedArg} attendus.`);
}
const entries = files.map((file) => {
  const relativePath = relative(sourceRoot, file).split(sep).join('/');
  const bytes = readFileSync(file);
  const classification = pilot === 'talents-creatifs'
    ? classifyTalents(relativePath)
    : {source_role: 'team', rights: 'restricted'};
  return {
    source_ref: `${pilot}:${classification.source_role}:${stableHash(relativePath).slice(0, 24)}`,
    relative_path: relativePath,
    content_sha256: stableHash(bytes),
    size: statSync(file).size,
    ...classification,
    original_immutable: true,
    mode: 'simulate',
  };
});
const hashes = new Map();
for (const entry of entries) {
  hashes.set(entry.content_sha256, [...(hashes.get(entry.content_sha256) ?? []), entry.relative_path]);
}
const duplicates = [...hashes.entries()]
  .filter(([, paths]) => paths.length > 1)
  .map(([content_sha256, paths]) => ({content_sha256, paths}));
const roleCounts = Object.fromEntries(
  ['student', 'teacher', 'team', 'shared'].map((role) => [
    role,
    entries.filter((entry) => entry.source_role === role).length,
  ]),
);
const manifestHash = stableHash(JSON.stringify(entries));
process.stdout.write(`${JSON.stringify({
  simulation_version: 'v1_2026_08_31',
  pilot,
  discovered: entries.length,
  role_counts: roleCounts,
  duplicate_blob_groups: duplicates,
  manifest_sha256: manifestHash,
  entries,
}, null, 2)}\n`);
