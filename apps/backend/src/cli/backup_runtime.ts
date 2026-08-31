import {createHash} from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {basename, dirname, join, relative, resolve} from 'node:path';

import {dbPath, getDb} from '../db/schema.ts';

type BackupFile = {path: string; sha256: string; size: number};

function compactTimestamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function listFiles(root: string): BackupFile[] {
  if (!existsSync(root)) return [];
  const files: BackupFile[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, {withFileTypes: true})) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) {
        const stat = statSync(absolute);
        files.push({
          path: relative(root, absolute),
          sha256: hashFile(absolute),
          size: stat.size,
        });
      }
    }
  };
  visit(root);
  return files.sort((a, b) => a.path.localeCompare(b.path));
}

const activeDbPath = resolve(dbPath());
if (activeDbPath === resolve(':memory:')) throw new Error('Une base en mémoire ne peut pas être sauvegardée.');

const storageRoot = resolve(process.env.MASTERFLOW_STORAGE_ROOT ?? join(dirname(activeDbPath), 'storage'));
const backupRoot = resolve(process.env.MASTERFLOW_BACKUP_ROOT ?? join(dirname(activeDbPath), 'backups'));
const backupId = `masterflow-${compactTimestamp()}`;
const partialPath = join(backupRoot, `.${backupId}.partial`);
const finalPath = join(backupRoot, backupId);

mkdirSync(backupRoot, {recursive: true});
rmSync(partialPath, {recursive: true, force: true});
mkdirSync(join(partialPath, 'database'), {recursive: true});

await getDb().backup(join(partialPath, 'database', basename(activeDbPath)));
if (existsSync(storageRoot)) cpSync(storageRoot, join(partialPath, 'files'), {recursive: true});

const files = listFiles(partialPath);
const manifest = {
  schema_version: 'masterflow.backup.v1',
  backup_id: backupId,
  created_at: new Date().toISOString(),
  release_sha: process.env.MASTERFLOW_RELEASE_SHA?.trim() || null,
  release_channel: process.env.MASTERFLOW_RELEASE_CHANNEL?.trim() || null,
  seed_profile: process.env.MASTERFLOW_SEED_PROFILE?.trim() || null,
  source: {
    database_filename: basename(activeDbPath),
    storage_present: existsSync(storageRoot),
  },
  files,
};

writeFileSync(join(partialPath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, {mode: 0o600});
renameSync(partialPath, finalPath);
console.log(JSON.stringify({backup_id: backupId, path: finalPath, files: files.length}));
