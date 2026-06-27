import {existsSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {deleteFile, resolveStorageImage, storeFile, toBase64DataUrl} from '../src/lib/storage.ts';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

let root = '';
const previousRoot = process.env.MASTERFLOW_STORAGE_ROOT;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'mf-storage-'));
  process.env.MASTERFLOW_STORAGE_ROOT = root;
  writeFileSync(join(root, 'photo.png'), PNG_SIGNATURE);
  writeFileSync(join(root, 'note.txt'), Buffer.from('ceci n est pas une image'));
});

afterAll(() => {
  if (previousRoot === undefined) delete process.env.MASTERFLOW_STORAGE_ROOT;
  else process.env.MASTERFLOW_STORAGE_ROOT = previousRoot;
});

describe('resolveStorageImage', () => {
  it('résout une image PNG valide sous la racine', () => {
    const out = resolveStorageImage('storage://photo.png');
    expect(out.mime).toBe('image/png');
    expect(out.bytes).toBe(PNG_SIGNATURE.length);
    expect(toBase64DataUrl(out.mime, out.base64)).toMatch(/^data:image\/png;base64,/);
  });

  it('refuse un préfixe différent de storage://', () => {
    expect(() => resolveStorageImage('https://example.com/x.png')).toThrow('storage_ref_invalid_scheme');
  });

  it('refuse une sortie de racine (anti-traversal)', () => {
    expect(() => resolveStorageImage('storage://../../etc/passwd')).toThrow('storage_ref_path_escape');
  });

  it('refuse un fichier absent', () => {
    expect(() => resolveStorageImage('storage://absent.png')).toThrow('storage_ref_not_found');
  });

  it('refuse un type non-image', () => {
    expect(() => resolveStorageImage('storage://note.txt')).toThrow('storage_ref_unsupported_image');
  });

  it('écrit et supprime un fichier sous une clé sûre', () => {
    const ref = storeFile('nested/upload.png', PNG_SIGNATURE);
    expect(ref).toBe('storage://nested/upload.png');
    expect(resolveStorageImage(ref).bytes).toBe(PNG_SIGNATURE.length);
    deleteFile(ref);
    expect(existsSync(join(root, 'nested', 'upload.png'))).toBe(false);
  });

  it('refuse les écritures vides ou hors racine', () => {
    expect(() => storeFile('empty.png', Buffer.alloc(0))).toThrow('storage_file_empty');
    expect(() => storeFile('../escape.png', PNG_SIGNATURE)).toThrow('storage_ref_invalid_key');
  });
});
