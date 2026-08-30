#!/usr/bin/env node

import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';

const channel = process.env.MASTERFLOW_RELEASE_CHANNEL ?? 'preview';
if (!['preview', 'stable'].includes(channel)) {
  throw new Error(`MASTERFLOW_RELEASE_CHANNEL invalide : ${channel}`);
}

const expectedSeedProfile = channel === 'stable' ? 'production' : 'preview';
const seedProfile = process.env.MASTERFLOW_SEED_PROFILE ?? expectedSeedProfile;
if (seedProfile !== expectedSeedProfile) {
  throw new Error(
    `Le canal ${channel} exige MASTERFLOW_SEED_PROFILE=${expectedSeedProfile}, reçu ${seedProfile}.`,
  );
}

const gitSha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
const dirty = execFileSync('git', ['status', '--porcelain'], {encoding: 'utf8'}).trim().length > 0;
if (dirty && process.env.MASTERFLOW_ALLOW_DIRTY_MANIFEST !== '1') {
  throw new Error('Le manifeste de release exige un worktree propre.');
}

const trackedFiles = [
  'package-lock.json',
  'deploy/docker-compose.yml',
  'deploy/Dockerfile.backend',
  'deploy/Dockerfile.frontend',
  'deploy/Caddyfile',
];

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const outputPath = resolve(
  process.env.MASTERFLOW_RELEASE_MANIFEST_PATH ??
    `deploy/manifests/masterflow-${channel}-${gitSha.slice(0, 12)}.json`,
);
const manifest = {
  schema_version: 'masterflow.release.v1',
  generated_at: new Date().toISOString(),
  channel,
  seed_profile: seedProfile,
  git_sha: gitSha,
  dirty,
  compose_project: `masterflow-${channel}`,
  ai_provider: process.env.LLM_PROVIDER ?? 'mock',
  files: Object.fromEntries(trackedFiles.map((path) => [path, {sha256: sha256(path)}])),
};

mkdirSync(dirname(outputPath), {recursive: true});
writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, {mode: 0o600});
console.log(outputPath);
