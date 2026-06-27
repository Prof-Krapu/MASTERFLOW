import {mkdirSync, readFileSync, statSync, writeFileSync, unlinkSync} from 'node:fs';
import {dirname, resolve, sep} from 'node:path';

/**
 * Résolution de références `storage://` vers des fichiers locaux.
 *
 * MasterFlow ne stocke jamais les octets d'une source (photo de copie, scan) dans
 * un payload de job : seul un `source_ref` de la forme `storage://<clé>` circule.
 * Ce module est le SEUL pont autorisé entre cette référence et le disque local —
 * il est volontairement défensif :
 *  - refus de tout préfixe ≠ `storage://` ;
 *  - anti‑traversal : la clé est résolue sous `MASTERFLOW_STORAGE_ROOT` et toute
 *    sortie de cette racine est rejetée ;
 *  - plafond de taille (`MASTERFLOW_STORAGE_MAX_BYTES`) ;
 *  - type d'image vérifié par les octets magiques (png/jpeg/webp/gif), pas par
 *    l'extension du nom de fichier.
 *
 * Écriture : `storeFile()` écrit sur disque et retourne une ref `storage://<clé>`.
 */

const PREFIX = 'storage://';
const DEFAULT_MAX_BYTES = 15 * 1024 * 1024; // 15 Mo — borne raisonnable pour une image source.

export type StorageMime = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

export interface ResolvedStorageImage {
  /** Chemin absolu réel (pour logs sobres : pas de contenu). */
  path: string;
  /** Type MIME déduit des octets magiques. */
  mime: StorageMime;
  /** Taille en octets. */
  bytes: number;
  /** Contenu encodé base64 (sans préfixe data:). */
  base64: string;
}

function storageRoot(): string {
  const raw = process.env.MASTERFLOW_STORAGE_ROOT;
  return raw ? resolve(process.cwd(), raw) : resolve(process.cwd(), 'data', 'storage');
}

function maxBytes(): number {
  const raw = Number(process.env.MASTERFLOW_STORAGE_MAX_BYTES);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_MAX_BYTES;
}

/** Détecte le type d'image par signature binaire ; null si non reconnu/non supporté. */
function sniffMime(buf: Buffer): StorageMime | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a')) {
    return 'image/gif';
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Résout une référence `storage://<clé>` en image locale (octets + MIME).
 * Lève une erreur explicite et sûre (sans divulguer de chemin hors racine) si la
 * référence est invalide, hors périmètre, trop lourde ou d'un type non supporté.
 */
export function resolveStorageImage(ref: string): ResolvedStorageImage {
  if (typeof ref !== 'string' || !ref.startsWith(PREFIX)) {
    throw new Error('storage_ref_invalid_scheme');
  }
  const key = ref.slice(PREFIX.length);
  if (!key || key.includes('\0')) throw new Error('storage_ref_empty_key');

  const root = storageRoot();
  const target = resolve(root, key);
  // Anti‑traversal : la cible doit être strictement dans la racine.
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('storage_ref_path_escape');
  }

  let stat;
  try {
    stat = statSync(target);
  } catch {
    throw new Error('storage_ref_not_found');
  }
  if (!stat.isFile()) throw new Error('storage_ref_not_a_file');
  if (stat.size > maxBytes()) throw new Error('storage_ref_too_large');

  const buf = readFileSync(target);
  const mime = sniffMime(buf);
  if (!mime) throw new Error('storage_ref_unsupported_image');

  return {path: target, mime, bytes: stat.size, base64: buf.toString('base64')};
}

/** Construit une data URL base64 prête pour un champ `image_url` OpenAI‑compatible. */
export function toBase64DataUrl(mime: StorageMime, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

/**
 * Écrit un fichier sur disque sous `MASTERFLOW_STORAGE_ROOT/<key>`.
 * Crée le répertoire parent si nécessaire.
 * Retourne la ref `storage://<key>`.
 */
export function storeFile(key: string, data: Buffer): string {
  if (!key || key.includes('\0') || key.includes('..')) throw new Error('storage_ref_invalid_key');
  if (data.length === 0) throw new Error('storage_file_empty');
  if (data.length > maxBytes()) throw new Error('storage_file_too_large');
  const root = storageRoot();
  const target = resolve(root, key);
  if (target !== root && !target.startsWith(root + sep)) throw new Error('storage_ref_path_escape');
  mkdirSync(dirname(target), {recursive: true});
  writeFileSync(target, data);
  return `${PREFIX}${key}`;
}

/**
 * Supprime un fichier du disque à partir d'une ref `storage://<key>`.
 * Ne lève pas d'erreur si le fichier n'existe pas.
 */
export function deleteFile(ref: string): void {
  if (typeof ref !== 'string' || !ref.startsWith(PREFIX)) return;
  const key = ref.slice(PREFIX.length);
  if (!key || key.includes('\0')) return;
  const root = storageRoot();
  const target = resolve(root, key);
  if (target !== root && !target.startsWith(root + sep)) return;
  try { unlinkSync(target); } catch { /* déjà absent */ }
}
