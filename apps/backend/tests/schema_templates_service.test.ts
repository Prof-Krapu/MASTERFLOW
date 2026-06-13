import {beforeAll, describe, expect, it} from 'vitest';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import type {AuthUser} from '../src/middleware/auth.ts';
import {
  createSchemaTemplate,
  getSchemaTemplate,
  listSchemaTemplates,
  validateSchemaTemplate,
} from '../src/services/schema_templates.ts';

const teacher: AuthUser = {
  id: 'schema-template-service-teacher',
  username: 'schema_template_service_teacher',
  role: 'teacher',
};
const student: AuthUser = {
  id: 'schema-template-service-student',
  username: 'schema_template_service_student',
  role: 'student',
};
const otherTeacher: AuthUser = {
  id: 'schema-template-service-other',
  username: 'schema_template_service_other',
  role: 'teacher',
};
const admin: AuthUser = {
  id: 'schema-template-service-admin',
  username: 'schema_template_service_admin',
  role: 'admin',
};

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, otherTeacher, admin]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
});

function request(name: string, version = 1) {
  return {
    domain: 'cdc' as const,
    name,
    version,
    schema_json: {
      type: 'object',
      properties: {
        context: {type: 'string'},
        objectives: {type: 'array', items: {type: 'string'}},
      },
    },
    required_fields: ['context'],
    validation_rules: {public_use_requires_status: 'validated'},
    ui_hints: {progress_fields: ['context']},
    changelog: 'Version candidate test.',
  };
}

describe('PR-5 — service Template Schema Registry', () => {
  it('seed les templates candidats initiaux sans les valider', () => {
    const cdcSeed = getSchemaTemplate(student, 'cdc-template-candidate-v1');
    expect(cdcSeed).toMatchObject({
      template_id: 'cdc-template-candidate-v1',
      domain: 'cdc',
      status: 'candidate',
      owner_id: null,
    });
  });

  it('cree un template candidat teacher+ et masque les templates prives aux autres owners', () => {
    const template = createSchemaTemplate(teacher, request('CDC prive PR-5 service'));
    expect(template).toMatchObject({
      domain: 'cdc',
      name: 'CDC prive PR-5 service',
      status: 'candidate',
      owner_id: teacher.id,
    });

    expect(listSchemaTemplates(teacher).map((item) => item.template_id)).toContain(template.template_id);
    expect(listSchemaTemplates(otherTeacher).map((item) => item.template_id)).not.toContain(
      template.template_id,
    );
    expect(() => getSchemaTemplate(otherTeacher, template.template_id)).toThrow('schema_template_not_found');
  });

  it('refuse creation student, schema invalide et required_fields inconnus', () => {
    expect(() => createSchemaTemplate(student, request('CDC student interdit'))).toThrow('permission_denied');
    expect(() =>
      createSchemaTemplate(teacher, {
        ...request('CDC schema invalide'),
        schema_json: {type: 'array', properties: {}},
      }),
    ).toThrow('template_schema_invalid');
    expect(() =>
      createSchemaTemplate(teacher, {
        ...request('CDC required inconnu'),
        required_fields: ['missing'],
      }),
    ).toThrow('template_required_field_unknown');
  });

  it('refuse le doublon versionnel et accepte une nouvelle version explicite', () => {
    createSchemaTemplate(teacher, request('CDC versionne PR-5', 1));
    expect(() => createSchemaTemplate(teacher, request('CDC versionne PR-5', 1))).toThrow(
      'schema_template_version_exists',
    );

    const v2 = createSchemaTemplate(teacher, request('CDC versionne PR-5', 2));
    expect(v2.version).toBe(2);
  });

  it('refuse validation student et valide par admin+', () => {
    const template = createSchemaTemplate(teacher, request('CDC validation PR-5'));
    expect(() => validateSchemaTemplate(student, template.template_id)).toThrow('permission_denied');

    const validated = validateSchemaTemplate(admin, template.template_id);
    expect(validated.status).toBe('validated');
  });

  it('masque deprecated par defaut et trace validation', () => {
    const template = createSchemaTemplate(teacher, request('CDC deprecated PR-5'));
    getDb()
      .prepare("UPDATE schema_templates SET status = 'deprecated' WHERE id = ?")
      .run(template.template_id);

    expect(listSchemaTemplates(teacher).map((item) => item.template_id)).not.toContain(
      template.template_id,
    );

    const rows = getDb()
      .prepare(
        `SELECT event_type FROM audit_logs
         WHERE event_type IN ('schema_template.created','schema_template.validated')`,
      )
      .all() as Array<{event_type: string}>;
    expect(rows.map((row) => row.event_type)).toEqual(
      expect.arrayContaining(['schema_template.created', 'schema_template.validated']),
    );
  });
});
