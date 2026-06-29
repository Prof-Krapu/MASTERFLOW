import {
  LivingCompanionSchema,
  type LivingCompanion,
} from '@masterflow/shared';

import {getPersona} from '../engines/persona_engine.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getGuidedSessionContext} from './guided_runtime.ts';
import {evaluateStorylets} from './storylet_engine.ts';

type CompanionType = LivingCompanion['companion_type'];

function manifestString(
  manifest: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = manifest?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function companionType(manifest: Record<string, unknown> | null): CompanionType {
  const value = manifestString(manifest, 'companion_type');
  if (value === null || value === 'cdc_robot') return 'cdc_robot';
  if (value === 'moth') return 'moth';
  if (value === 'project_monster') return 'project_monster';
  throw new Error('living_companion_type_invalid');
}

function unresolvedPersonaRefs(refs: Array<string | null>): string[] {
  return refs.filter((ref): ref is string => ref !== null && getPersona(ref) === null);
}

function dialogueBubble(
  type: CompanionType,
  status: 'active' | 'completed' | 'expired' | 'revoked',
  currentPrompt: string | null,
  contradictionCount: number,
): string {
  if (contradictionCount > 0) {
    return 'Deux réponses se contredisent. Prépare une synthèse courte et valide avec ton professeur avant de continuer.';
  }
  if (status === 'completed') {
    return 'Le cadrage est complet. Relis la synthèse avant de décider quoi en faire.';
  }
  if (status === 'expired' || status === 'revoked') {
    return 'Cette session n’est plus active. Demande au facilitateur de la rouvrir ou d’en créer une nouvelle.';
  }
  if (currentPrompt) {
    if (type === 'moth') return `Je vais être pénible une seconde : ${currentPrompt}`;
    if (type === 'project_monster') {
      return 'Je prends forme avec ton projet. Clarifie encore son idée centrale pour que mon évolution reste lisible.';
    }
    return `On avance étape par étape. ${currentPrompt}`;
  }
  return 'Je ne trouve pas de question valide dans le guide. Je préfère m’arrêter plutôt que d’en inventer une.';
}

function companionRole(type: CompanionType): string {
  if (type === 'moth') {
    return 'Garde-fou contextuel du CDC : questionner les raccourcis, révéler les zones floues et renvoyer les arbitrages au groupe ou au professeur.';
  }
  if (type === 'project_monster') {
    return 'Incarnation contextuelle de l’idée du projet : rendre son gimmick, son émotion et sa maturation visibles sans noter ni comparer les étudiants.';
  }
  return 'Aider le groupe à comprendre, découper et vérifier son CDC IA sans produire le travail à sa place.';
}

function companionBoundaries(type: CompanionType): string[] {
  return [
    ...(type === 'moth'
      ? [
          'n’apparaît que dans la session ou le contexte auquel le créateur l’a assigné',
          'provoque une réflexion mais ne tranche pas à la place du groupe',
          'ne remplace jamais le persona personnel de l’utilisateur',
        ]
      : type === 'project_monster'
        ? [
            'représente une idée de projet et jamais la valeur ou le niveau d’un étudiant',
            'évolue par clarification du gimmick et non par power-level',
            'son identité et chaque évolution restent candidates avant validation du créateur',
          ]
      : ['oriente mais ne rédige pas le CDC à la place du groupe']),
    'n’invente aucune question hors du guide figé',
    'demande une validation humaine en cas de contradiction',
    'ne publie, n’exporte et ne génère aucun asset',
  ];
}

export function buildGuidedLivingCompanion(
  actor: AuthUser,
  sessionId: string,
): LivingCompanion {
  const {session, guide} = getGuidedSessionContext(actor, sessionId);
  if (guide.domain !== 'cdc') throw new Error('living_companion_domain_not_supported');
  const type = companionType(guide.ui_manifest);

  const currentQuestion = guide.question_flow.find(
    (question) => question.question_id === session.current_question_id,
  );
  const currentPrompt = currentQuestion?.prompt ?? null;
  const personaRefs = [guide.functional_persona_id, guide.lore_persona_id];
  const unresolved = unresolvedPersonaRefs(personaRefs);
  const contradictionRefs = session.progress.contradictions.map(
    (contradiction) => `field:${contradiction.target_field}`,
  );
  const storylets = evaluateStorylets(actor, {
    guided_session_id: sessionId,
    domains: ['companion'],
    limit: 5,
  }).instances;
  const configurationWarnings = [
    ...(guide.functional_persona_id ? [] : ['Aucune persona fonctionnelle n’est assignée au guide.']),
    ...(guide.lore_persona_id ? [] : ['Aucune persona de lore n’est assignée au guide.']),
    ...(unresolved.length > 0
      ? ['Des références persona sont déclarées mais absentes du registre actif.']
      : []),
  ];
  const readiness =
    session.status === 'completed'
      ? 'completed'
      : session.status !== 'active' || contradictionRefs.length > 0 || currentPrompt === null
        ? 'blocked'
        : configurationWarnings.length > 0
          ? 'limited'
          : 'ready';
  const availableIntents: LivingCompanion['available_intents'] =
    type === 'project_monster'
      ? ['inspect_project_state', 'review_evolution_candidate', 'request_identity_validation']
      : session.status === 'completed'
      ? ['review_summary', 'review_progress']
      : [
          ...(currentPrompt ? ['answer_current_question' as const] : []),
          'review_progress',
          'request_facilitator',
        ];
  const assignmentScopeRefs = [
    `guided_session:${sessionId}`,
    ...(session.project_id ? [`project:${session.project_id}`] : []),
    ...(session.room_id ? [`room:${session.room_id}`] : []),
  ];

  return LivingCompanionSchema.parse({
    companion_id: `living_companion:${type}:${sessionId}`,
    companion_type: type,
    display_name:
      manifestString(guide.ui_manifest, 'companion_name') ??
      (guide.lore_persona_id ? getPersona(guide.lore_persona_id)?.name : null) ??
      (type === 'moth' ? 'MOTH' : type === 'project_monster' ? 'Monstre-idée' : 'Robot CDC IA'),
    role_summary: companionRole(type),
    boundaries: companionBoundaries(type),
    session_ref: `guided_session:${sessionId}`,
    guide_ref: `conversation_guide:${guide.guide_id}:v${session.guide_version}`,
    project_ref: session.project_id ? `project:${session.project_id}` : null,
    room_ref: session.room_id ? `room:${session.room_id}` : null,
    assignment_scope_refs: assignmentScopeRefs,
    functional_persona_ref: guide.functional_persona_id,
    lore_persona_ref: guide.lore_persona_id,
    interaction_mode: type === 'project_monster' ? 'contextual_bubble' : 'full_page_guided',
    readiness,
    current_prompt: currentPrompt,
    dialogue_bubble: dialogueBubble(
      type,
      session.status,
      currentPrompt,
      contradictionRefs.length,
    ),
    available_intents: availableIntents,
    progress: session.progress,
    storylets,
    source_refs: [
      `guided_session:${sessionId}`,
      `conversation_guide:${guide.guide_id}:v${session.guide_version}`,
      `schema_template:${session.target_schema_id}:v${session.target_schema_version}`,
      ...personaRefs.filter((ref): ref is string => ref !== null).map((ref) => `persona:${ref}`),
    ],
    diagnostics: {
      unresolved_persona_refs: unresolved,
      contradictions: contradictionRefs,
      configuration_warnings: configurationWarnings,
    },
    presence_policy: 'assigned_context_only',
    configuration_policy: 'creator_validates_initial_identity',
    evolution_policy: 'engine_managed_after_validation',
    execution_policy: 'guide_only',
  });
}
