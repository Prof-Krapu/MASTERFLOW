import {
  CreateD12ReleaseReceiptSchema,
  D12ReleaseReceiptSchema,
  type CreateD12ReleaseReceipt,
  type D12ReleaseReceipt,
} from '@masterflow/shared';

import {getDb, type D12ReleaseReceiptRow} from '../db/schema.ts';
import {audit} from '../lib/audit.ts';
import {uuid} from '../lib/uuid.ts';
import type {AuthUser} from '../middleware/auth.ts';

function parseList(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

function toReceipt(row: D12ReleaseReceiptRow): D12ReleaseReceipt {
  return D12ReleaseReceiptSchema.parse({
    receipt_id: row.id,
    owner_id: row.owner_id,
    commit_sha: row.commit_sha,
    environment_label: row.environment_label,
    components: parseList(row.components_json),
    evidence_refs: parseList(row.evidence_refs_json),
    observed_at: row.observed_at,
    note: row.note,
    proof_state: row.proof_state,
    runtime_status: row.runtime_status,
    created_at: row.created_at,
  });
}

/** Enregistre une déclaration append-only. Ne vérifie ni ne déploie le runtime. */
export function createD12ReleaseReceipt(actor: AuthUser, input: CreateD12ReleaseReceipt): D12ReleaseReceipt {
  const request = CreateD12ReleaseReceiptSchema.parse(input);
  const id = uuid();
  const now = Date.now();
  const proofState = request.evidence_refs.length > 0 ? 'evidence_attached' : 'unknown';
  getDb().prepare(`INSERT INTO d12_release_receipts
    (id,owner_id,commit_sha,environment_label,components_json,evidence_refs_json,observed_at,note,proof_state,runtime_status,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,'not_verified',?)`).run(
    id, actor.id, request.commit_sha, request.environment_label, JSON.stringify(request.components),
    JSON.stringify(request.evidence_refs), request.observed_at, request.note ?? null, proofState, now,
  );
  audit({event_type: 'd12_release_receipt_recorded', user_id: actor.id, scope: request.environment_label, detail: {
    receipt_id: id, commit_sha: request.commit_sha, proof_state: proofState, runtime_status: 'not_verified',
    no_deploy: true, no_recovery: true, no_migration: true,
  }});
  return toReceipt(getDb().prepare('SELECT * FROM d12_release_receipts WHERE id=?').get(id) as D12ReleaseReceiptRow);
}

export function listD12ReleaseReceipts(): D12ReleaseReceipt[] {
  return (getDb().prepare('SELECT * FROM d12_release_receipts ORDER BY observed_at DESC, created_at DESC').all() as D12ReleaseReceiptRow[]).map(toReceipt);
}
