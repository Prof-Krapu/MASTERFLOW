import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';
import {
  archiveInventoryItem,
  createInventoryCollection,
  createInventoryItem,
  getInventoryItem,
  ingestInventoryOcrCandidates,
  listInventoryItems,
  scanInventoryPhoto,
  validateInventoryItem,
} from '../src/services/inventory.ts';

const owner: AuthUser = {id: 'inv-owner', username: 'inv_owner', role: 'teacher'};
const editor: AuthUser = {id: 'inv-editor', username: 'inv_editor', role: 'teacher'};
const participant: AuthUser = {id: 'inv-participant', username: 'inv_participant', role: 'student'};
const outsider: AuthUser = {id: 'inv-outsider', username: 'inv_outsider', role: 'student'};

let projectId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insertUser = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, editor, participant, outsider]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const project = createProject(owner, {name: 'Projet Inventory Core'});
  projectId = project.project_id;
  addProjectMember(owner, projectId, {user_id: editor.id, role: 'editor'});
  addProjectMember(owner, projectId, {user_id: participant.id, role: 'participant'});
});

describe('PR-INV-1 — Inventory Core', () => {
  it('cree un item personnel candidat prive et invisible aux autres', () => {
    const item = createInventoryItem(participant, {
      type: 'book',
      label: 'Livre perso a verifier',
      source_refs: ['manual:test'],
    });

    expect(item).toMatchObject({
      owner_id: participant.id,
      project_id: null,
      scope_type: 'user',
      validation_status: 'candidate',
      visibility_scope: 'private',
    });
    expect(listInventoryItems(participant)).toEqual([]);
    expect(listInventoryItems(participant, {include_candidates: true})).toContainEqual(
      expect.objectContaining({item_id: item.item_id}),
    );
    expect(() => getInventoryItem(outsider, item.item_id)).toThrow('inventory_item_not_found');
  });

  it('exige un editeur projet pour creer un item projet', () => {
    expect(() =>
      createInventoryItem(participant, {
        project_id: projectId,
        type: 'tool',
        label: 'Materiel candidate participant',
      }),
    ).toThrow('inventory_scope_denied');

    const item = createInventoryItem(editor, {
      project_id: projectId,
      type: 'tool',
      label: 'Camera projet',
      item_status: 'owned_declared',
      usage_tags: ['shooting'],
    });
    expect(item).toMatchObject({
      owner_id: editor.id,
      project_id: projectId,
      scope_type: 'project',
      validation_status: 'candidate',
      visibility_scope: 'project',
    });
  });

  it('ne montre les candidates projet qu aux editors, puis les validated aux membres', () => {
    const item = createInventoryItem(editor, {
      project_id: projectId,
      type: 'gear',
      label: 'Kit lumiere projet',
      source_refs: ['manual:inventory-core'],
    });

    expect(listInventoryItems(participant, {project_id: projectId})).not.toContainEqual(
      expect.objectContaining({item_id: item.item_id}),
    );
    expect(listInventoryItems(editor, {project_id: projectId, include_candidates: true})).toContainEqual(
      expect.objectContaining({item_id: item.item_id}),
    );

    const validated = validateInventoryItem(editor, item.item_id);
    expect(validated.validation_status).toBe('validated');
    expect(listInventoryItems(participant, {project_id: projectId})).toContainEqual(
      expect.objectContaining({item_id: item.item_id, validation_status: 'validated'}),
    );
    expect(() => listInventoryItems(outsider, {project_id: projectId})).toThrow('inventory_scope_denied');
  });

  it('archive explicitement sans supprimer historique', () => {
    const item = createInventoryItem(owner, {
      project_id: projectId,
      type: 'art_supply',
      label: 'Feutres a sortir du stock',
    });
    validateInventoryItem(owner, item.item_id);
    const archived = archiveInventoryItem(owner, item.item_id);
    expect(archived.validation_status).toBe('archived');
    expect(archived.archived_at).not.toBeNull();
    expect(getInventoryItem(owner, item.item_id).validation_status).toBe('archived');
  });

  it('rattache une collection au meme scope et ne cree aucune ressource RAG automatiquement', () => {
    const collection = createInventoryCollection(editor, {
      project_id: projectId,
      label: 'Bibliotheque reference projet',
    });
    const item = createInventoryItem(editor, {
      project_id: projectId,
      collection_id: collection.collection_id,
      type: 'artbook',
      label: 'Artbook reference',
    });

    expect(item.collection_id).toBe(collection.collection_id);
    const ragCount = getDb()
      .prepare('SELECT COUNT(*) AS n FROM rag_resources WHERE resource_id = ?')
      .get(item.item_id) as {n: number};
    expect(ragCount.n).toBe(0);
  });

  it('ingere un resultat OCR pret comme candidates Inventory sans validation automatique', () => {
    const now = Date.now();
    getDb()
      .prepare(
        `INSERT INTO jobs
           (id, type, status, owner_id, scope_type, scope_id, risk_level, payload_json,
            progress, retry_count, created_at, updated_at)
         VALUES ('inventory-ocr-job-ready', 'ocr_prepare', 'needs_review', ?, 'project', ?,
                 'medium', ?, 80, 0, ?, ?)`,
      )
      .run(
        editor.id,
        projectId,
        JSON.stringify({
          adapter_id: 'morphological-reference-v1',
          owner_id: editor.id,
          project_id: projectId,
        }),
        now,
        now,
      );

    const items = ingestInventoryOcrCandidates(editor, {
      job_id: 'inventory-ocr-job-ready',
      candidates: [
        {
          type: 'book',
          label: 'Livre detecte par OCR',
          source_ref: 'ocr:line:1',
          confidence: 0.82,
        },
      ],
    });

    expect(items).toHaveLength(1);
    const firstItem = items[0]!;
    expect(firstItem).toMatchObject({
      project_id: projectId,
      validation_status: 'candidate',
      visibility_scope: 'project',
      source_refs: ['job:inventory-ocr-job-ready', 'ocr:line:1'],
    });
    expect(listInventoryItems(participant, {project_id: projectId})).not.toContainEqual(
      expect.objectContaining({item_id: firstItem.item_id}),
    );
  });
});

describe('photo scan', () => {
  it('crée des items à partir d’un scan photo', () => {
    const items = scanInventoryPhoto(owner, {
      image_data: 'base64-fake-image-data',
      image_mime: 'image/jpeg',
      project_scope: owner.id,
    });
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0]?.item_status).toBe('detected');
  });

  it('sans project_id, un outsider peut scanner (scope personnel)', () => {
    const items = scanInventoryPhoto(outsider, {
      image_data: 'data',
      project_scope: outsider.id,
    });
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});
