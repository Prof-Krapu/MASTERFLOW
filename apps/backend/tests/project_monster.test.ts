import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {ProjectMonsterEvolutionReportSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {
  completeGuidedSession,
  createGuide,
  createGuidedSession,
  submitGuidedAnswer,
} from '../src/services/guided_runtime.ts';
import {buildProjectMonsterEvolutionReport} from '../src/services/project_monster.ts';
import {createProject} from '../src/services/projects.ts';
import {createSchemaTemplate} from '../src/services/schema_templates.ts';

const teacher: AuthUser = {
  id: 'project-monster-teacher',
  username: 'project_monster_teacher',
  role: 'teacher',
};
const outsider: AuthUser = {
  id: 'project-monster-outsider',
  username: 'project_monster_outsider',
  role: 'student',
};
let server: Server;
let base: string;
let sequence = 0;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, outsider]) {
    insert.run(actor.id, actor.username, actor.username, actor.role, now, now);
  }
  const app = express();
  app.use('/api/v1', createExperienceFabricRouter());
  server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('adresse serveur illisible');
  base = `http://127.0.0.1:${address.port}/api/v1`;
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function createMonsterSession() {
  sequence += 1;
  const project = createProject(teacher, {name: `Projet Ours d’Or ${sequence}`});
  const template = createSchemaTemplate(teacher, {
    domain: 'cdc',
    name: `Projet Ours d’Or ${sequence}`,
    version: 1,
    schema_json: {
      type: 'object',
      properties: {
        creative_gimmick: {type: 'string'},
        dominant_emotion: {type: 'string'},
        audience: {type: 'string'},
      },
    },
    required_fields: ['creative_gimmick', 'dominant_emotion', 'audience'],
    validation_rules: {},
    changelog: 'Template privé de test pour monstre-idée.',
  });
  const guide = createGuide(teacher, {
    name: `Incubation Ours d’Or ${sequence}`,
    purpose: 'Faire émerger un monstre-idée sans noter ni comparer les étudiants.',
    domain: 'cdc',
    project_id: project.project_id,
    target_schema_id: template.template_id,
    question_flow: [
      {
        question_id: 'q-gimmick',
        prompt: 'Quelle idée ou obsession rend ce projet immédiatement reconnaissable ?',
        target_field: 'creative_gimmick',
        kind: 'text',
        required: true,
      },
      {
        question_id: 'q-emotion',
        prompt: 'Quelle émotion domine actuellement le projet ?',
        target_field: 'dominant_emotion',
        kind: 'text',
        required: true,
      },
      {
        question_id: 'q-audience',
        prompt: 'À qui cette idée doit-elle parler ?',
        target_field: 'audience',
        kind: 'text',
        required: true,
      },
    ],
    completion_rules: {complete_when_required_fields_done: true},
    functional_persona_id: null,
    lore_persona_id: null,
    ui_manifest: {
      companion_type: 'project_monster',
      companion_name: 'Surglob',
      companion_lore: 'Une petite masse obstinée qui transforme chaque doute en nouvelle piste.',
      event_context: 'ours_dor',
    },
    analytics_policy: {private: true},
    consent_policy: {required: true},
  });
  const session = createGuidedSession(teacher, {
    guide_id: guide.guide_id,
    preview: true,
    consent: {accepted: true},
  });
  return {project, session};
}

describe('Experience Fabric — monstre évolutif Ours d’Or', () => {
  it('propose une naissance V0 sans générer d’asset', () => {
    const {project, session} = createMonsterSession();
    const report = buildProjectMonsterEvolutionReport(teacher, session.session_id);

    expect(report).toMatchObject({
      project_ref: `project:${project.project_id}`,
      event_context: 'ours_dor',
      proposed_stage: 'seed',
      execution_policy: 'candidate_only',
      requires_creator_validation: true,
      identity: {
        proposed_name: 'Surglob',
        status: 'candidate',
      },
      asset_plan: {
        generation_allowed: false,
        canon_promotion_allowed: false,
      },
    });
    expect(report.companion).toMatchObject({
      companion_type: 'project_monster',
      interaction_mode: 'contextual_bubble',
      presence_policy: 'assigned_context_only',
    });
    expect(report.missing_inputs).toEqual(
      expect.arrayContaining(['creative_gimmick', 'dominant_emotion']),
    );
    expect(ProjectMonsterEvolutionReportSchema.parse(report)).toEqual(report);
  });

  it('propose une mutation conservatrice lorsque le gimmick devient lisible', () => {
    const {session} = createMonsterSession();
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-gimmick',
      value: 'Une boussole qui refuse les idées trop faciles',
    });
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-emotion',
      value: 'curiosité inquiète',
    });

    const report = buildProjectMonsterEvolutionReport(teacher, session.session_id);
    expect(report.proposed_stage).toBe('mutation');
    expect(report.creative_gimmick).toContain('boussole');
    expect(report.dominant_emotion).toBe('curiosité inquiète');
    expect(report.visual_gates.evolution).toBe('ready');
    expect(report.continuity_locks).toEqual(
      expect.arrayContaining([
        'same_core_gimmick',
        'same_emotional_lineage',
        'behavior_before_form',
      ]),
    );
  });

  it('propose la stabilisation après cadrage complet sans la canoniser', () => {
    const {session} = createMonsterSession();
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-gimmick',
      value: 'Une antenne qui capte les signaux faibles',
    });
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-emotion',
      value: 'enthousiasme fragile',
    });
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-audience',
      value: 'jeunes créatifs',
    });
    completeGuidedSession(teacher, session.session_id);

    const report = buildProjectMonsterEvolutionReport(teacher, session.session_id);
    expect(report.proposed_stage).toBe('stabilized');
    expect(report.asset_plan.generation_allowed).toBe(false);
    expect(report.asset_plan.canon_promotion_allowed).toBe(false);
    expect(report.requires_creator_validation).toBe(true);
  });

  it('préserve le projet et la session privés', () => {
    const {session} = createMonsterSession();
    expect(() =>
      buildProjectMonsterEvolutionReport(outsider, session.session_id),
    ).toThrow('guided_session_not_found');
  });

  it('expose le rapport candidat via HTTP', async () => {
    const {session} = createMonsterSession();
    const headers = {Authorization: `Bearer ${signToken(teacher)}`};
    const response = await fetch(
      `${base}/experience/companions/project-monsters/guided-sessions/${session.session_id}`,
      {headers},
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      proposed_stage: 'seed',
      execution_policy: 'candidate_only',
      asset_plan: {generation_allowed: false},
    });
  });
});
