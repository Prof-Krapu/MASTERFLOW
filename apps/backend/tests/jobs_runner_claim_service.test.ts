import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  claimNextJob,
  completeJob,
  extendJobLease,
  failJob,
  getJob,
  listJobEvents,
  markJobNeedsReview,
  updateJobProgress,
} from '../src/services/jobs.ts';

const owner: AuthUser = {
  id: 'jobs-claim-owner',
  username: 'jobs_claim_owner',
  role: 'teacher',
};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  getDb()
    .prepare(
      `INSERT OR IGNORE INTO users
         (id, username, display_name, password_hash, role, active, created_at, updated_at)
       VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
    )
    .run(owner.id, owner.username, owner.username, owner.role, now, now);
});

function insertAssetJob(id: string, createdAt: number): void {
  const db = getDb();
  db
    .prepare(
      `INSERT INTO jobs
         (id, type, status, owner_id, scope_type, scope_id, risk_level,
          payload_json, progress, retry_count, created_at, updated_at)
       VALUES (?, 'asset_prepare', 'queued', ?, 'project', ?, 'medium',
               '{}', 0, 0, ?, ?)`,
    )
    .run(id, owner.id, `scope-${id}`, createdAt, createdAt);
  db.prepare(
    `INSERT INTO job_events (id, job_id, event_type, detail_json, created_at)
     VALUES (?, ?, 'job_queued', '{}', ?)`,
  ).run(`${id}-queued`, id, createdAt);
}

describe('PR-C8 — claim et lease internes des jobs', () => {
  it('attribue un job queued à un runner et masque ce job aux autres runners', () => {
    const now = Date.now();
    insertAssetJob('claim-job-a', now);
    insertAssetJob('claim-job-b', now + 1);

    const first = claimNextJob('runner-a', ['asset_prepare'], 5000, now + 1000);
    const second = claimNextJob('runner-b', ['asset_prepare'], 5000, now + 1001);

    expect(first?.job_id).toBe('claim-job-a');
    expect(first?.status).toBe('running');
    expect(first?.runner_id).toBe('runner-a');
    expect(first?.claimed_at).toBe(now + 1000);
    expect(first?.lease_expires_at).toBe(now + 6000);
    expect(second?.job_id).toBe('claim-job-b');
    expect(listJobEvents(owner, first!.job_id).map((event) => event.event_type)).toEqual([
      'job_queued',
      'job_started',
    ]);
  });

  it('étend un lease actif et refuse un runner concurrent', () => {
    const now = Date.now();
    insertAssetJob('claim-job-extend', now);
    const claimed = claimNextJob('runner-extend', ['asset_prepare'], 1000, now + 1000)!;

    const extended = extendJobLease(claimed.job_id, 'runner-extend', 2000, now + 1500);
    expect(extended.lease_expires_at).toBe(now + 3500);
    expect(() => extendJobLease(claimed.job_id, 'runner-other', 2000, now + 1600)).toThrow(
      'job_lease_mismatch',
    );

    updateJobProgress(claimed.job_id, 40, 'runner-extend');
    expect(() => updateJobProgress(claimed.job_id, 50, 'runner-other')).toThrow(
      'job_lease_mismatch',
    );
  });

  it('réattribue un job running seulement après expiration du lease', () => {
    const now = Date.now();
    insertAssetJob('claim-job-expire', now);
    const claimed = claimNextJob('runner-old', ['asset_prepare'], 100, now + 1000)!;

    expect(claimNextJob('runner-too-early', ['asset_prepare'], 1000, now + 1099)).toBeNull();
    const reclaimed = claimNextJob('runner-new', ['asset_prepare'], 1000, now + 1101);

    expect(reclaimed?.job_id).toBe(claimed.job_id);
    expect(reclaimed?.runner_id).toBe('runner-new');
    expect(reclaimed?.claimed_at).toBe(now + 1101);
    expect(reclaimed?.lease_expires_at).toBe(now + 2101);
  });

  it('finalise uniquement avec le runner détenteur du lease et nettoie l expiration', () => {
    const now = Date.now();
    insertAssetJob('claim-job-finalize', now);
    const claimed = claimNextJob('runner-finalize', ['asset_prepare'], 60_000, now + 1000)!;

    expect(() =>
      markJobNeedsReview(
        claimed.job_id,
        {artifact_ref: 'storage://private/claim/finalize.json'},
        'review',
        'runner-other',
      ),
    ).toThrow('job_lease_mismatch');

    markJobNeedsReview(
      claimed.job_id,
      {artifact_ref: 'storage://private/claim/finalize.json'},
      'review',
      'runner-finalize',
    );
    const reviewed = getJob(owner, claimed.job_id);
    expect(reviewed.status).toBe('needs_review');
    expect(reviewed.runner_id).toBe('runner-finalize');
    expect(reviewed.lease_expires_at).toBeNull();

    insertAssetJob('claim-job-complete', now + 2000);
    const completedClaim = claimNextJob('runner-complete', ['asset_prepare'], 60_000, now + 3000)!;
    completeJob(completedClaim.job_id, {ok: true}, 'runner-complete');
    expect(getJob(owner, completedClaim.job_id).lease_expires_at).toBeNull();

    insertAssetJob('claim-job-fail', now + 4000);
    const failedClaim = claimNextJob('runner-fail', ['asset_prepare'], 60_000, now + 5000)!;
    failJob(failedClaim.job_id, 'runner_error', undefined, 'runner-fail');
    expect(getJob(owner, failedClaim.job_id).lease_expires_at).toBeNull();
  });
});
