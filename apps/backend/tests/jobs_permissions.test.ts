import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {cancelJob, getJob, retryJob} from '../src/services/jobs.ts';

const owner: AuthUser = {id: 'job-perm-owner', username: 'job_perm_owner', role: 'teacher'};
const editor: AuthUser = {id: 'job-perm-editor', username: 'job_perm_editor', role: 'teacher'};
const manager: AuthUser = {id: 'job-perm-manager', username: 'job_perm_manager', role: 'teacher'};
const admin: AuthUser = {id: 'job-perm-admin', username: 'job_perm_admin', role: 'admin'};

beforeAll(async () => {
  await seedAll();
  const db = getDb();
  const now = Date.now();
  const insertUser = db.prepare(
    `INSERT INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, editor, manager, admin]) {
    insertUser.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  db.prepare(
    `INSERT INTO projects (id, owner_id, name, status, visibility, created_at, updated_at)
     VALUES ('job-perm-project', ?, 'Job permissions', 'active', 'private', ?, ?)`,
  ).run(owner.id, now, now);
  db.prepare(
    `INSERT INTO project_members (project_id, user_id, role, created_at)
     VALUES
       ('job-perm-project', ?, 'owner', ?),
       ('job-perm-project', ?, 'editor', ?),
       ('job-perm-project', ?, 'admin', ?)`,
  ).run(owner.id, now, editor.id, now, manager.id, now);

  const insertJob = db.prepare(
    `INSERT INTO jobs
       (id, type, status, owner_id, scope_type, scope_id, risk_level, payload_json,
        progress, retry_count, created_at, updated_at)
     VALUES (?, 'ocr_prepare', ?, ?, 'project', 'job-perm-project', 'medium', ?, 0, 0, ?, ?)`,
  );
  const payload = JSON.stringify({
    project_id: 'job-perm-project',
    adapter_id: 'ocr-submission-v1',
  });
  insertJob.run('job-perm-cancel', 'queued', owner.id, payload, now, now);
  insertJob.run('job-perm-retry', 'failed', owner.id, payload, now, now);
  insertJob.run('job-perm-admin-cancel', 'queued', owner.id, payload, now, now);
});

describe('jobs — lecture distincte de la gestion', () => {
  it('un editor peut lire mais pas annuler', () => {
    expect(getJob(editor, 'job-perm-cancel').job_id).toBe('job-perm-cancel');
    expect(() => cancelJob(editor, 'job-perm-cancel')).toThrow('job_manage_denied');
  });

  it('un admin projet peut annuler et relancer', () => {
    expect(cancelJob(manager, 'job-perm-cancel').status).toBe('cancelled');
    expect(retryJob(manager, 'job-perm-retry').status).toBe('queued');
  });

  it("trace l'override d'un admin global", () => {
    expect(cancelJob(admin, 'job-perm-admin-cancel').status).toBe('cancelled');
    const row = getDb()
      .prepare(
        `SELECT detail_json FROM audit_logs
         WHERE event_type = 'job.cancelled' AND user_id = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(admin.id) as {detail_json: string};
    expect(JSON.parse(row.detail_json)).toMatchObject({override: true});
  });
});
