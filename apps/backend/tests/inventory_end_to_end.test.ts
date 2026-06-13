import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  archiveInventoryItem,
  createInventoryCollection,
  indexInventoryItem,
  ingestInventoryOcrCandidates,
  listInventoryItems,
  searchInventory,
  validateInventoryCollection,
  validateInventoryItem,
} from '../src/services/inventory.ts';
import {createOcrPrepareJob, markJobNeedsReview} from '../src/services/jobs.ts';
import {addProjectMember, createProject} from '../src/services/projects.ts';
import {getRagContextPack} from '../src/services/rag.ts';
import {
  compileRuntimeContext,
  ContextCompilationError,
} from '../src/services/context_compiler.ts';

const owner: AuthUser = {id: 'inv-e2e-owner', username: 'inv_e2e_owner', role: 'teacher'};
const member: AuthUser = {id: 'inv-e2e-member', username: 'inv_e2e_member', role: 'student'};
const outsider: AuthUser = {
  id: 'inv-e2e-outsider',
  username: 'inv_e2e_outsider',
  role: 'teacher',
};

let projectId = '';
let roomId = '';

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, member, outsider]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }

  projectId = createProject(owner, {name: 'Inventory end-to-end'}).project_id;
  addProjectMember(owner, projectId, {user_id: member.id, role: 'participant'});
  roomId = 'inv-e2e-room';
  db.prepare(
    `INSERT INTO rooms
       (id, name, type, owner_id, project_id, context_json, is_public, created_at, updated_at)
     VALUES (?, 'Inventory E2E Room', 'inventory', ?, ?, '{}', 0, ?, ?)`,
  ).run(roomId, owner.id, projectId, now, now);
});

describe('PR-INV-8 — recette Inventory end-to-end', () => {
  it('traverse OCR, validation, RAG, room context et invalidation sans fuite de scope', () => {
    const collection = createInventoryCollection(owner, {
      project_id: projectId,
      label: 'Materiel documentaire',
    });
    validateInventoryCollection(owner, collection.collection_id);

    const job = createOcrPrepareJob(owner, {
      adapter_id: 'morphological-reference-v1',
      owner_id: owner.id,
      project_id: projectId,
      project_scope: projectId,
      source_ref: 'storage://private/inventory-e2e-photo.jpg',
      preflight_ref: 'preflight-inventory-e2e',
      manifest_ref: null,
      consent_ref: 'consent-inventory-e2e',
      validation_ref: null,
    });
    markJobNeedsReview(
      job.job_id,
      {candidate_count: 1, source_ref: 'storage://private/inventory-e2e-photo.jpg'},
      'ocr_candidates_require_human_validation',
    );

    const [candidate] = ingestInventoryOcrCandidates(owner, {
      job_id: job.job_id,
      collection_id: collection.collection_id,
      candidates: [
        {
          type: 'gear',
          label: 'Camera documentaire E2E',
          creator_or_brand: 'MasterFlow Test',
          item_status: 'owned_confirmed',
          usage_tags: ['camera', 'documentaire'],
          source_ref: 'ocr:e2e:line:1',
          confidence: 0.93,
        },
      ],
    });
    expect(candidate).toBeDefined();
    expect(candidate?.validation_status).toBe('candidate');
    expect(listInventoryItems(member, {project_id: projectId})).toEqual([]);
    expect(() => listInventoryItems(outsider, {project_id: projectId})).toThrow(
      'inventory_scope_denied',
    );

    const item = validateInventoryItem(owner, candidate!.item_id);
    const rag = indexInventoryItem(owner, item.item_id);
    expect(rag).toMatchObject({
      source_type: 'inventory_item',
      scope_type: 'project',
      scope_id: projectId,
      status: 'validated',
    });

    const search = searchInventory(member, {
      query: 'camera documentaire',
      project_id: projectId,
    });
    expect(search).toContainEqual(
      expect.objectContaining({
        item: expect.objectContaining({item_id: item.item_id}),
        availability_state: 'candidate_available',
        availability_guaranteed: false,
      }),
    );

    const context = compileRuntimeContext(member, {
      purpose: 'inventory_search',
      requested_tier: 'T2',
      room_id: roomId,
      rag_query: 'camera documentaire',
    });
    expect(context.authoritative_facts).toContainEqual(
      expect.objectContaining({ref_type: 'inventory_item', ref_id: item.item_id}),
    );
    expect(context.authoritative_facts).toContainEqual(
      expect.objectContaining({
        ref_type: 'inventory_collection',
        ref_id: collection.collection_id,
      }),
    );
    expect(context.rag_context_pack_ref).not.toBeNull();
    const packId = context.rag_context_pack_ref!.ref_id;
    expect(getRagContextPack(member, packId).citations).toContainEqual(
      expect.objectContaining({source_uri: `inventory://item/${item.item_id}`}),
    );

    expect(() =>
      compileRuntimeContext(outsider, {
        purpose: 'inventory_search',
        requested_tier: 'T2',
        room_id: roomId,
      }),
    ).toThrow(ContextCompilationError);

    archiveInventoryItem(owner, item.item_id);
    expect(getRagContextPack(member, packId).status).toBe('stale');
    expect(
      searchInventory(member, {query: 'camera documentaire', project_id: projectId}),
    ).toEqual([]);
    expect(
      compileRuntimeContext(member, {
        purpose: 'inventory_search',
        requested_tier: 'T2',
        room_id: roomId,
      }).authoritative_facts,
    ).not.toContainEqual(expect.objectContaining({ref_id: item.item_id}));

    const auditedEvents = (
      getDb()
        .prepare(
          `SELECT event_type
             FROM audit_logs
            WHERE user_id = ?
              AND event_type IN (
                'job.ocr_prepare.queued',
                'inventory.ocr_candidates_ingested',
                'inventory.item_validated',
                'rag.inventory_item_indexed',
                'inventory.item_archived',
                'rag.inventory_item_invalidated'
              )`,
        )
        .all(owner.id) as Array<{event_type: string}>
    ).map((row) => row.event_type);
    expect(auditedEvents).toEqual(
      expect.arrayContaining([
        'job.ocr_prepare.queued',
        'inventory.ocr_candidates_ingested',
        'inventory.item_validated',
        'rag.inventory_item_indexed',
        'inventory.item_archived',
        'rag.inventory_item_invalidated',
      ]),
    );
  });
});
