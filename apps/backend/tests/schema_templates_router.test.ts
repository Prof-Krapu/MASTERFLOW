import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createSchemaTemplatesRouter} from '../src/routers/schema_templates.ts';

const teacher: AuthUser = {
  id: 'schema-template-router-teacher',
  username: 'schema_template_router_teacher',
  role: 'teacher',
};
const student: AuthUser = {
  id: 'schema-template-router-student',
  username: 'schema_template_router_student',
  role: 'student',
};
const admin: AuthUser = {
  id: 'schema-template-router-admin',
  username: 'schema_template_router_admin',
  role: 'admin',
};

let server: Server;
let base: string;
let teacherToken: string;
let studentToken: string;
let adminToken: string;
let templateId: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  teacherToken = signToken(teacher);
  studentToken = signToken(student);
  adminToken = signToken(admin);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createSchemaTemplatesRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function auth(token: string): {Authorization: string} {
  return {Authorization: `Bearer ${token}`};
}

function body(name: string) {
  return JSON.stringify({
    domain: 'quote_intake',
    name,
    version: 1,
    schema_json: {
      type: 'object',
      properties: {
        need: {type: 'string'},
        budget_range: {type: 'string'},
      },
    },
    required_fields: ['need'],
    validation_rules: {public_use_requires_status: 'validated'},
    changelog: 'Candidate router test.',
  });
}

describe('PR-5 — routes Template Schema Registry', () => {
  it('exige une authentification', async () => {
    expect((await fetch(`${base}/schema-templates`)).status).toBe(401);
  });

  it('liste les seeds candidats autorises', async () => {
    const response = await fetch(`${base}/schema-templates`, {headers: auth(studentToken)});
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {results: Array<{template_id: string; status: string}>};
    expect(payload.results).toContainEqual(
      expect.objectContaining({template_id: 'quote-intake-candidate-v1', status: 'candidate'}),
    );
  });

  it('cree un candidat teacher+ et refuse le student', async () => {
    const refused = await fetch(`${base}/schema-templates`, {
      method: 'POST',
      headers: {...auth(studentToken), 'Content-Type': 'application/json'},
      body: body('Quote student refusee PR-5'),
    });
    expect(refused.status).toBe(403);

    const created = await fetch(`${base}/schema-templates`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: body('Quote router PR-5'),
    });
    expect(created.status).toBe(201);
    const payload = (await created.json()) as {template_id: string; status: string};
    templateId = payload.template_id;
    expect(payload.status).toBe('candidate');
  });

  it('refuse validation student et accepte admin+', async () => {
    const refused = await fetch(`${base}/schema-templates/${templateId}/validate`, {
      method: 'POST',
      headers: auth(studentToken),
    });
    expect(refused.status).toBe(403);

    const validated = await fetch(`${base}/schema-templates/${templateId}/validate`, {
      method: 'POST',
      headers: auth(adminToken),
    });
    expect(validated.status).toBe(200);
    expect(await validated.json()).toMatchObject({template_id: templateId, status: 'validated'});
  });

  it('refuse un schema incoherent', async () => {
    const response = await fetch(`${base}/schema-templates`, {
      method: 'POST',
      headers: {...auth(teacherToken), 'Content-Type': 'application/json'},
      body: JSON.stringify({
        domain: 'cdc',
        name: 'CDC incoherent router PR-5',
        version: 1,
        schema_json: {type: 'object', properties: {context: {type: 'string'}}},
        required_fields: ['missing'],
        changelog: 'Invalid candidate.',
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({error: 'template_required_field_unknown'});
  });
});
