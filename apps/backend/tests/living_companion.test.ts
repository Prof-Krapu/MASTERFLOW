import {createServer, type Server} from 'node:http';

import express from 'express';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

import {LivingCompanionSchema} from '@masterflow/shared';

import {getDb} from '../src/db/schema.ts';
import {seedAll} from '../src/db/seed.ts';
import {signToken, type AuthUser} from '../src/middleware/auth.ts';
import {createExperienceFabricRouter} from '../src/routers/experience_fabric.ts';
import {
  addGuidedSessionParticipant,
  completeGuidedSession,
  createGuide,
  createGuidedSession,
  submitGuidedAnswer,
} from '../src/services/guided_runtime.ts';
import {buildGuidedLivingCompanion} from '../src/services/living_companion.ts';

const teacher: AuthUser = {
  id: 'living-companion-teacher',
  username: 'living_companion_teacher',
  role: 'teacher',
};
const student: AuthUser = {
  id: 'living-companion-student',
  username: 'living_companion_student',
  role: 'student',
};
const outsider: AuthUser = {
  id: 'living-companion-outsider',
  username: 'living_companion_outsider',
  role: 'student',
};
let server: Server;
let base: string;

beforeAll(async () => {
  await seedAll();
  const now = Date.now();
  const insert = getDb().prepare(
    `INSERT OR IGNORE INTO users
       (id, username, display_name, password_hash, role, active, created_at, updated_at)
     VALUES (?, ?, ?, 'x', ?, 1, ?, ?)`,
  );
  for (const actor of [teacher, student, outsider]) {
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

function createCdcSession(
  name: string,
  companion: {type?: string; name?: string} = {},
) {
  const guide = createGuide(teacher, {
    name,
    purpose: 'Aider un groupe à comprendre et cadrer un outil IA.',
    domain: 'cdc',
    target_schema_id: 'cdc-template-candidate-v1',
    question_flow: [
      {
        question_id: 'q-context',
        prompt: 'Dans quel contexte cet outil IA sera-t-il utilisé ?',
        target_field: 'context',
        kind: 'text',
        required: true,
      },
      {
        question_id: 'q-objectives',
        prompt: 'Quels objectifs doit-il servir ?',
        target_field: 'objectives',
        kind: 'multi_choice',
        required: true,
        options: ['clarifier', 'cadrer'],
      },
      {
        question_id: 'q-audience',
        prompt: 'Pour quelle audience ?',
        target_field: 'audience',
        kind: 'text',
        required: true,
      },
      {
        question_id: 'q-deliverables',
        prompt: 'Quels livrables sont attendus ?',
        target_field: 'deliverables',
        kind: 'multi_choice',
        required: true,
        options: ['cdc', 'prototype'],
      },
    ],
    completion_rules: {complete_when_required_fields_done: true},
    functional_persona_id: 'robot-cdc-functional',
    lore_persona_id: 'robot-cdc-lore',
    ui_manifest: {
      companion_name: companion.name ?? 'K-RTON',
      ...(companion.type ? {companion_type: companion.type} : {}),
    },
    analytics_policy: {private: true},
    consent_policy: {required: true},
  });
  return createGuidedSession(teacher, {
    guide_id: guide.guide_id,
    preview: true,
    consent: {accepted: true},
  });
}

describe('Experience Fabric — Living Companion Robot CDC', () => {
  it('projette la question, les limites et la progression sans écrire le CDC', () => {
    const session = createCdcSession('Robot CDC actif');
    const companion = buildGuidedLivingCompanion(teacher, session.session_id);

    expect(companion).toMatchObject({
      companion_type: 'cdc_robot',
      display_name: 'K-RTON',
      interaction_mode: 'full_page_guided',
      readiness: 'limited',
      current_prompt: 'Dans quel contexte cet outil IA sera-t-il utilisé ?',
      execution_policy: 'guide_only',
      presence_policy: 'assigned_context_only',
      configuration_policy: 'creator_validates_initial_identity',
      evolution_policy: 'engine_managed_after_validation',
    });
    expect(companion.assignment_scope_refs).toEqual([
      `guided_session:${session.session_id}`,
    ]);
    expect(companion.available_intents).toContain('answer_current_question');
    expect(companion.boundaries.join(' ')).toContain('ne rédige pas');
    expect(companion.storylets[0]?.definition.storylet_id).toBe(
      'storylet:companion:continue_guided_cdc',
    );
    expect(companion.diagnostics.unresolved_persona_refs).toEqual([
      'robot-cdc-functional',
      'robot-cdc-lore',
    ]);
    expect(LivingCompanionSchema.parse(companion)).toEqual(companion);
  });

  it('bloque sur une contradiction et renvoie vers le facilitateur', () => {
    const session = createCdcSession('Robot CDC contradiction');
    addGuidedSessionParticipant(
      teacher,
      session.session_id,
      student.id,
      'participant',
      {accepted: true},
    );
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-context',
      value: 'atelier en classe',
    });
    submitGuidedAnswer(student, session.session_id, {
      question_id: 'q-context',
      value: 'outil autonome public',
    });

    const companion = buildGuidedLivingCompanion(student, session.session_id);
    expect(companion.readiness).toBe('blocked');
    expect(companion.dialogue_bubble).toContain('valide avec ton professeur');
    expect(companion.available_intents).toContain('request_facilitator');
    expect(companion.storylets[0]?.readiness).toBe('blocked');
  });

  it('propose une relecture après complétion sans export ni effet externe', () => {
    const session = createCdcSession('Robot CDC terminé');
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-context',
      value: 'atelier privé',
    });
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-objectives',
      value: ['clarifier'],
    });
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-audience',
      value: 'étudiants',
    });
    submitGuidedAnswer(teacher, session.session_id, {
      question_id: 'q-deliverables',
      value: ['cdc'],
    });
    completeGuidedSession(teacher, session.session_id);

    const companion = buildGuidedLivingCompanion(teacher, session.session_id);
    expect(companion.readiness).toBe('completed');
    expect(companion.available_intents).toEqual(['review_summary', 'review_progress']);
    expect(companion.storylets[0]?.definition.storylet_id).toBe(
      'storylet:companion:review_guided_summary',
    );
  });

  it('préserve le scope privé de la session', () => {
    const session = createCdcSession('Robot CDC privé');
    expect(() => buildGuidedLivingCompanion(outsider, session.session_id)).toThrow(
      'guided_session_not_found',
    );
  });

  it('active MOTH seulement lorsqu’il est explicitement assigné par le guide', () => {
    const session = createCdcSession(
      'MOTH CDC assigné',
      {type: 'moth', name: 'MOTH'},
    );
    const companion = buildGuidedLivingCompanion(teacher, session.session_id);

    expect(companion).toMatchObject({
      companion_type: 'moth',
      display_name: 'MOTH',
      presence_policy: 'assigned_context_only',
      interaction_mode: 'full_page_guided',
      execution_policy: 'guide_only',
    });
    expect(companion.dialogue_bubble).toContain('Je vais être pénible une seconde');
    expect(companion.role_summary).toContain('Garde-fou contextuel');
    expect(companion.boundaries).toEqual(
      expect.arrayContaining([
        expect.stringContaining('n’apparaît que dans la session'),
        expect.stringContaining('ne remplace jamais le persona personnel'),
      ]),
    );
  });

  it('refuse un type de compagnon non déclaré au lieu de l’inférer', () => {
    const session = createCdcSession(
      'Compagnon inconnu',
      {type: 'personnage_magique'},
    );
    expect(() => buildGuidedLivingCompanion(teacher, session.session_id)).toThrow(
      'living_companion_type_invalid',
    );
  });

  it('expose le compagnon permissionné via HTTP', async () => {
    const session = createCdcSession('Robot CDC HTTP');
    const headers = {Authorization: `Bearer ${signToken(teacher)}`};
    const response = await fetch(
      `${base}/experience/companions/guided-sessions/${session.session_id}`,
      {headers},
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      companion_type: 'cdc_robot',
      execution_policy: 'guide_only',
    });
  });
});
