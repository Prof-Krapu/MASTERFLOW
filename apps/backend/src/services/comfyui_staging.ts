import {
  chmodSync,
  closeSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import {basename, extname, isAbsolute, join, relative, resolve, sep} from 'node:path';

import type {ComfyUIWorkflowId} from '@masterflow/shared';

const MAX_REFERENCES = 4;
const MAX_REFERENCE_BYTES = 15 * 1024 * 1024;
const STAGING_DIR = '.masterflow-staging';
const GPU_LOCK_DIR = '.masterflow-gpu-lock';

export interface ComfyUIJobStaging {
  directory: string;
  relativeFiles: string[];
  absoluteFiles: string[];
}

function safeJobId(jobId: string): string {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(jobId)) throw new Error('comfyui_staging_job_id_invalid');
  return jobId;
}

function assertInside(root: string, target: string): void {
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('comfyui_staging_path_escape');
  }
}

function referenceExtension(path: string): string {
  const ext = extname(path).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    throw new Error('comfyui_staging_reference_type_invalid');
  }
  return ext === '.jpeg' ? '.jpg' : ext;
}

function assertImageSignature(path: string, ext: string): void {
  const header = Buffer.alloc(12);
  const fd = openSync(path, 'r');
  let read = 0;
  try {
    read = readSync(fd, header, 0, header.length, 0);
  } finally {
    closeSync(fd);
  }
  const png = read >= 8 && header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const jpeg = read >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const webp = read >= 12 && header.subarray(0, 4).toString('ascii') === 'RIFF' && header.subarray(8, 12).toString('ascii') === 'WEBP';
  if ((ext === '.png' && !png) || (ext === '.jpg' && !jpeg) || (ext === '.webp' && !webp)) {
    throw new Error('comfyui_staging_reference_content_invalid');
  }
}

function assertPrivateReference(path: string): void {
  let stat;
  try {
    stat = lstatSync(path);
  } catch {
    throw new Error('comfyui_staging_reference_invalid');
  }
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error('comfyui_staging_reference_invalid');
  if (stat.size <= 0 || stat.size > MAX_REFERENCE_BYTES) {
    throw new Error('comfyui_staging_reference_size_invalid');
  }
  assertImageSignature(path, referenceExtension(path));
}

function sourcePathsFor(
  workflowId: ComfyUIWorkflowId,
  options: {ipAdapterReferenceFile?: string; photoMakerReferenceDir?: string},
): string[] {
  if (workflowId === 'masterflex_ipadapter_sdxl_v1') {
    const source = options.ipAdapterReferenceFile?.trim();
    if (!source || !isAbsolute(source)) throw new Error('comfyui_ipadapter_reference_file_required');
    assertPrivateReference(source);
    return [source];
  }

  const sourceDir = options.photoMakerReferenceDir?.trim();
  if (!sourceDir || !isAbsolute(sourceDir)) throw new Error('comfyui_photomaker_reference_dir_required');
  let dirStat;
  try {
    dirStat = lstatSync(sourceDir);
  } catch {
    throw new Error('comfyui_photomaker_reference_dir_unavailable');
  }
  if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) {
    throw new Error('comfyui_photomaker_reference_dir_unavailable');
  }
  let directEntries: string[];
  try {
    directEntries = readdirSync(sourceDir);
  } catch {
    throw new Error('comfyui_photomaker_reference_dir_unavailable');
  }
  const files = directEntries
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(sourceDir, name))
    .filter((path) => {
      let stat;
      try {
        stat = lstatSync(path);
      } catch {
        throw new Error('comfyui_staging_reference_invalid');
      }
      if (stat.isSymbolicLink()) throw new Error('comfyui_staging_reference_invalid');
      if (!stat.isFile()) return false;
      try {
        assertPrivateReference(path);
        return true;
      } catch {
        return false;
      }
    });
  if (files.length < 1 || files.length > MAX_REFERENCES) {
    throw new Error('comfyui_photomaker_requires_1_to_4_direct_images');
  }
  return files;
}

/**
 * Copie les références privées dans un dossier ComfyUI dédié au job. Les noms
 * source ne sont pas conservés et aucun lien symbolique n'est suivi.
 */
export function createComfyUIJobStaging(options: {
  inputRoot: string;
  jobId: string;
  workflowId: ComfyUIWorkflowId;
  ipAdapterReferenceFile?: string;
  photoMakerReferenceDir?: string;
}): ComfyUIJobStaging {
  if (!isAbsolute(options.inputRoot)) throw new Error('comfyui_input_root_absolute_required');
  let inputRoot: string;
  try {
    inputRoot = realpathSync(options.inputRoot);
    if (!statSync(inputRoot).isDirectory()) throw new Error('invalid');
  } catch {
    throw new Error('comfyui_input_root_invalid');
  }
  const jobId = safeJobId(options.jobId);
  const root = resolve(inputRoot, STAGING_DIR);
  const directory = resolve(root, jobId);
  assertInside(inputRoot, root);
  assertInside(root, directory);
  if (lstatExists(root) && lstatSync(root).isSymbolicLink()) {
    throw new Error('comfyui_staging_root_invalid');
  }
  if (lstatExists(directory)) throw new Error('comfyui_staging_job_already_exists');

  const sources = sourcePathsFor(options.workflowId, options);
  mkdirSync(directory, {recursive: true, mode: 0o700});
  chmodSync(root, 0o700);
  chmodSync(directory, 0o700);

  const relativeFiles: string[] = [];
  const absoluteFiles: string[] = [];
  try {
    sources.forEach((source, index) => {
      const target = join(directory, `reference-${String(index + 1).padStart(2, '0')}${referenceExtension(source)}`);
      copyFileSync(source, target);
      chmodSync(target, 0o600);
      absoluteFiles.push(target);
      // ComfyUI attend des chemins relatifs POSIX pour LoadImage, y compris sous Windows.
      relativeFiles.push(relative(inputRoot, target).split(sep).join('/'));
    });
    return {directory, relativeFiles, absoluteFiles};
  } catch (error) {
    try { purgeComfyUIJobStaging({inputRoot, jobId}); } catch { /* le code sûr ci-dessous prime */ }
    if (error instanceof Error && error.message.startsWith('comfyui_')) throw error;
    throw new Error('comfyui_staging_copy_failed');
  }
}

function lstatExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/** Purge bornée d'un seul staging connu, sans jamais accepter un chemin libre. */
export function purgeComfyUIJobStaging(options: {inputRoot: string; jobId: string}): void {
  if (!isAbsolute(options.inputRoot)) throw new Error('comfyui_input_root_absolute_required');
  let inputRoot: string;
  try {
    inputRoot = realpathSync(options.inputRoot);
  } catch {
    throw new Error('comfyui_input_root_invalid');
  }
  const root = resolve(inputRoot, STAGING_DIR);
  const directory = resolve(root, safeJobId(options.jobId));
  assertInside(inputRoot, root);
  assertInside(root, directory);
  if (lstatExists(root) && lstatSync(root).isSymbolicLink()) {
    throw new Error('comfyui_staging_root_invalid');
  }
  try {
    rmSync(directory, {recursive: true, force: true, maxRetries: 2, retryDelay: 20});
  } catch {
    throw new Error('comfyui_staging_cleanup_failed');
  }
}

export function stagingDebugLabel(staging: ComfyUIJobStaging): string {
  return basename(staging.directory);
}

/** Verrou inter-processus : un seul job MasterFlow peut piloter le GPU ComfyUI. */
export function acquireComfyUIGpuLock(options: {inputRoot: string; jobId: string}): void {
  if (!isAbsolute(options.inputRoot)) throw new Error('comfyui_input_root_absolute_required');
  const inputRoot = realpathSync(options.inputRoot);
  const jobId = safeJobId(options.jobId);
  const lockDir = resolve(inputRoot, GPU_LOCK_DIR);
  assertInside(inputRoot, lockDir);
  try {
    mkdirSync(lockDir, {mode: 0o700});
    writeFileSync(join(lockDir, 'owner'), jobId, {mode: 0o600, flag: 'wx'});
  } catch {
    throw new Error('comfyui_gpu_busy_or_stale_lock');
  }
}

/** Libère uniquement le verrou appartenant au job appelant. */
export function releaseComfyUIGpuLock(options: {inputRoot: string; jobId: string}): void {
  if (!isAbsolute(options.inputRoot)) throw new Error('comfyui_input_root_absolute_required');
  const inputRoot = realpathSync(options.inputRoot);
  const jobId = safeJobId(options.jobId);
  const lockDir = resolve(inputRoot, GPU_LOCK_DIR);
  assertInside(inputRoot, lockDir);
  if (!lstatExists(lockDir)) return;
  if (lstatSync(lockDir).isSymbolicLink()) throw new Error('comfyui_gpu_lock_invalid');
  let owner: string;
  try {
    owner = readFileSync(join(lockDir, 'owner'), 'utf8');
  } catch {
    throw new Error('comfyui_gpu_lock_invalid');
  }
  if (owner !== jobId) throw new Error('comfyui_gpu_lock_owner_mismatch');
  rmSync(lockDir, {recursive: true, force: true, maxRetries: 2, retryDelay: 20});
}
