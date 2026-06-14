import {beforeAll, beforeEach, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import type {InventoryOcrCandidate, Job} from '@masterflow/shared';
import {createOcrPrepareJob, getJob} from '../src/services/jobs.ts';
import {ingestInventoryOcrCandidates} from '../src/services/inventory.ts';
import {recordRunnerHeartbeat} from '../src/services/runners.ts';
import {createProject} from '../src/services/projects.ts';
import {parseOcrCandidates, processNextOcrJob} from '../src/runners/ocr_runner.ts';

const owner: AuthUser = {id: 'ocr-run-owner', username: 'ocr_run_owner', role: 'teacher'};
const RUNNER_ID = 'ocr-test-runner';

let projectId = '';

function heartbeatOnline(): void {
  recordRunnerHeartbeat({
    runner_id: RUNNER_ID,
    runner_family: 'ocr_multimodal',
    job_types: ['ocr_prepare'],
    status: 'online',
    active_job_id: null,
    version: 'test',
    host_ref: null,
    lease_ms: 5 * 60 * 1000,
    last_seen_at: Date.now(),
  });
}

function queueOcrJob(): Job {
  return createOcrPrepareJob(owner, {
    adapter_id: 'morphological-reference-v1',
    owner_id: owner.id,
    project_id: projectId,
    project_scope: projectId,
    source_ref: 'storage://private/ocr-runner-test.png',
    preflight_ref: 'preflight-ocr-runner-test',
    manifest_ref: null,
    consent_ref: 'consent-ocr-runner-test',
    validation_ref: null,
  });
}

const fakeImage = {mime: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUg=='};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  ).run(owner.id, owner.username, owner.username, owner.role, now, now);
  projectId = createProject(owner, {name: 'OCR runner test'}).project_id;
});

beforeEach(() => {
  heartbeatOnline();
});

describe('parseOcrCandidates', () => {
  it('parse un tableau JSON (avec bloc Markdown) et applique les défauts', () => {
    const text = '```json\n[{"type":"gear","label":"Camera","source_ref":"ocr:z:1","confidence":0.9}]\n```';
    const out = parseOcrCandidates(text, 'job-x');
    expect(out).toHaveLength(1);
    expect(out[0]?.type).toBe('gear');
    expect(out[0]?.source_ref).toBe('ocr:z:1');
  });

  it('complète une source_ref manquante et rejette les éléments non conformes', () => {
    const text = JSON.stringify([
      {type: 'book', label: 'Manuel'}, // source_ref manquante → auto
      {type: 'not_a_type', label: 'Invalide'}, // type hors enum → rejeté
      {label: 'Sans type'}, // type manquant → rejeté
    ]);
    const out = parseOcrCandidates(text, 'job-y');
    expect(out).toHaveLength(1);
    expect(out[0]?.label).toBe('Manuel');
    expect(out[0]?.source_ref).toBe('ocr:job-y:idx:0');
  });

  it('accepte la forme {candidates:[…]} et renvoie [] sur du non-JSON', () => {
    const wrapped = parseOcrCandidates('{"candidates":[{"type":"tool","label":"Pince","source_ref":"ocr:1"}]}', 'j');
    expect(wrapped).toHaveLength(1);
    expect(parseOcrCandidates('pas du json', 'j')).toEqual([]);
  });
});

describe('processNextOcrJob', () => {
  it('claim → needs_review avec candidats, puis ingestion owner en candidate', async () => {
    const job = queueOcrJob();
    const candidates: InventoryOcrCandidate[] = [
      {type: 'gear', label: 'Camera documentaire', source_ref: 'ocr:zone:1', confidence: 0.92},
      {type: 'book', label: 'Manuel de prise de vue', source_ref: 'ocr:zone:2'},
    ];

    const result = await processNextOcrJob({
      runnerId: RUNNER_ID,
      loadImage: () => fakeImage,
      extract: async () => candidates,
    });

    expect(result).toEqual({status: 'processed', jobId: job.job_id, candidateCount: 2});

    const reviewed = getJob(owner, job.job_id);
    expect(reviewed.status).toBe('needs_review');
    expect(reviewed.progress).toBe(100);
    const stored = (reviewed.result as {candidates?: unknown[]}).candidates ?? [];
    expect(stored).toHaveLength(2);

    // Frontière d'ingestion : l'owner ingère le résultat du runner → items candidate.
    const items = ingestInventoryOcrCandidates(owner, {
      job_id: job.job_id,
      candidates: stored as InventoryOcrCandidate[],
    });
    expect(items).toHaveLength(2);
    expect(items.every((it) => it.validation_status === 'candidate')).toBe(true);
    expect(items[0]?.source_refs).toContain(`job:${job.job_id}`);
  });

  it('échec d’extraction → job failed (jamais completed)', async () => {
    const job = queueOcrJob();
    const result = await processNextOcrJob({
      runnerId: RUNNER_ID,
      loadImage: () => {
        throw new Error('storage_ref_not_found');
      },
    });
    expect(result.status).toBe('failed');
    expect(getJob(owner, job.job_id).status).toBe('failed');
  });

  it('file vide → idle', async () => {
    const result = await processNextOcrJob({runnerId: RUNNER_ID, loadImage: () => fakeImage, extract: async () => []});
    expect(result).toEqual({status: 'idle'});
  });
});
