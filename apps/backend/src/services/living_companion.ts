import {
  LivingCompanionSchema,
  type LivingCompanion,
} from '@masterflow/shared';

import {getPersona} from '../engines/persona_engine.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getGuidedSessionContext} from './guided_runtime.ts';
import {evaluateStorylets} from './storylet_engine.ts';

function manifestString(
  manifest: Record<string, unknown> | null,
  key: string,
): string | null {
  const value = manifest?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function unresolvedPersonaRefs(refs: Array<string | null>): string[] {
  return refs.filter((ref): ref is string => ref !== null && getPersona(ref) === null);
}

function dialogueBubble(
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
    return `On avance étape par étape. ${currentPrompt}`;
  }
  return 'Je ne trouve pas de question valide dans le guide. Je préfère m’arrêter plutôt que d’en inventer une.';
}

export function buildGuidedLivingCompanion(
  actor: AuthUser,
  sessionId: string,
): LivingCompanion {
  const {session, guide} = getGuidedSessionContext(actor, sessionId);
  if (guide.domain !== 'cdc') throw new Error('living_companion_domain_not_supported');

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
    session.status === 'completed'
      ? ['review_summary', 'review_progress']
      : [
          ...(currentPrompt ? ['answer_current_question' as const] : []),
          'review_progress',
          'request_facilitator',
        ];

  return LivingCompanionSchema.parse({
    companion_id: `living_companion:cdc_robot:${sessionId}`,
    companion_type: 'cdc_robot',
    display_name:
      manifestString(guide.ui_manifest, 'companion_name') ??
      (guide.lore_persona_id ? getPersona(guide.lore_persona_id)?.name : null) ??
      'Robot CDC IA',
    role_summary:
      'Aider le groupe à comprendre, découper et vérifier son CDC IA sans produire le travail à sa place.',
    boundaries: [
      'oriente mais ne rédige pas le CDC à la place du groupe',
      'n’invente aucune question hors du guide figé',
      'demande une validation humaine en cas de contradiction',
      'ne publie, n’exporte et ne génère aucun asset',
    ],
    session_ref: `guided_session:${sessionId}`,
    guide_ref: `conversation_guide:${guide.guide_id}:v${session.guide_version}`,
    project_ref: session.project_id ? `project:${session.project_id}` : null,
    functional_persona_ref: guide.functional_persona_id,
    lore_persona_ref: guide.lore_persona_id,
    interaction_mode: 'full_page_guided',
    readiness,
    current_prompt: currentPrompt,
    dialogue_bubble: dialogueBubble(
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
    configuration_policy: 'creator_validates_initial_identity',
    evolution_policy: 'engine_managed_after_validation',
    execution_policy: 'guide_only',
  });
}
