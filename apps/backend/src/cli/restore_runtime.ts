import Database from 'better-sqlite3';
import {createHash} from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';

type BackupManifest = {
  schema_version: string;
  backup_id: string;
  files: Array<{path: string; sha256: string; size: number}>;
  source: {database_filename: string; storage_present: boolean};
};

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

const backupPath = resolve(argument('--backup') ?? '');
const targetRoot = resolve(argument('--target') ?? '');
if (!argument('--backup') || !argument('--target')) {
  throw new Error('Usage : restore:runtime -- --backup <dossier> --target <nouveau-dossier>');
}
if (!existsSync(join(backupPath, 'manifest.json'))) throw new Error('Manifest de sauvegarde introuvable.');
if (existsSync(targetRoot) && readdirSync(targetRoot).length > 0) {
  throw new Error('La cible de restauration doit être absente ou vide.');
}

const manifest = JSON.parse(readFileSync(join(backupPath, 'manifest.json'), 'utf8')) as BackupManifest;
if (manifest.schema_version !== 'masterflow.backup.v1') throw new Error('Version de sauvegarde incompatible.');

for (const file of manifest.files) {
  const absolute = join(backupPath, file.path);
  if (!existsSync(absolute)) throw new Error(`Fichier de sauvegarde absent : ${file.path}`);
  const stat = statSync(absolute);
  if (stat.size !== file.size || hashFile(absolute) !== file.sha256) {
    throw new Error(`Intégrité invalide : ${file.path}`);
  }
}

mkdirSync(targetRoot, {recursive: true});
const sourceDatabase = join(backupPath, 'database', manifest.source.database_filename);
const targetDatabase = join(targetRoot, 'masterflow.db');
mkdirSync(dirname(targetDatabase), {recursive: true});
cpSync(sourceDatabase, targetDatabase);
if (manifest.source.storage_present && existsSync(join(backupPath, 'files'))) {
  cpSync(join(backupPath, 'files'), join(targetRoot, 'storage'), {recursive: true});
}

const restored = new Database(targetDatabase, {readonly: true});
const integrity = restored.pragma('integrity_check', {simple: true});
restored.close();
if (integrity !== 'ok') throw new Error(`SQLite integrity_check a échoué : ${String(integrity)}`);

const receipt = {
  schema_version: 'masterflow.restore_receipt.v1',
  backup_id: manifest.backup_id,
  restored_at: new Date().toISOString(),
  target: basename(targetRoot),
  integrity_check: 'ok',
};
writeFileSync(join(targetRoot, 'restore_receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`, {mode: 0o600});
console.log(JSON.stringify(receipt));
