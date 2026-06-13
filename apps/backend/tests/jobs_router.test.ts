import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createJobsRouter} from '../src/routers/jobs.ts';
import {createOcrPrepareJob} from '../src/services/jobs.ts';

const owner: AuthUser = {id: 'jobs-router-owner', username: 'jobs_router_owner', role: 'teacher'};
const outsider: AuthUser = {
  id: 'jobs-router-outsider',
  username: 'jobs_router_outsider',
  role: 'teacher',
};

let server: Server;
let base: string;
let ownerToken: string;
let outsiderToken: string;
let jobId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [owner, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  ownerToken = signToken(owner);
  outsiderToken = signToken(outsider);
  jobId = createOcrPrepareJob(owner, {
    adapter_id: 'ocr-submission-v1',
    owner_id: owner.id,
    project_scope: 'course-router',
    source_ref: 'storage://private/router-copy.pdf',
    preflight_ref: 'preflight-router',
    manifest_ref: 'manifest-router',
    consent_ref: null,
    validation_ref: null,
  }).job_id;

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createJobsRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function auth(token: string): {headers: {Authorization: string}} {
  return {headers: {Authorization: `Bearer ${token}`}};
}

describe('PR-C2 — routes de suivi jobs', () => {
  it('exige une authentification', async () => {
    expect((await fetch(`${base}/jobs`)).status).toBe(401);
  });

  it('liste les jobs du owner et masque le détail au non-owner', async () => {
    const list = await fetch(`${base}/jobs`, auth(ownerToken));
    expect(list.status).toBe(200);
    expect((await list.json()) as Array<{job_id: string}>).toContainEqual(
      expect.objectContaining({job_id: jobId}),
    );

    const hidden = await fetch(`${base}/jobs/${jobId}`, auth(outsiderToken));
    expect(hidden.status).toBe(404);
    expect(await hidden.json()).toEqual({error: 'job_not_found'});
  });

  it('annule un job owner et conserve ses events', async () => {
    const cancel = await fetch(`${base}/jobs/${jobId}/cancel`, {
      method: 'POST',
      ...auth(ownerToken),
    });
    expect(cancel.status).toBe(200);
    expect(await cancel.json()).toMatchObject({job_id: jobId, status: 'cancelled'});

    const events = await fetch(`${base}/jobs/${jobId}/events`, auth(ownerToken));
    expect(events.status).toBe(200);
    expect((await events.json()) as Array<{event_type: string}>).toContainEqual(
      expect.objectContaining({event_type: 'job_cancelled'}),
    );
  });

  it('n expose aucune route générique de création', async () => {
    const response = await fetch(`${base}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({type: 'ocr_prepare'}),
    });
    expect(response.status).toBe(404);
  });
});
