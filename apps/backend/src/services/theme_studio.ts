import {
  ThemeStudioAssetPackPreviewSchema,
  ThemeStudioAssetPackQuerySchema,
  type ThemePack,
  type ThemeScope,
  type ThemeStudioAssetPackPreview,
  type ThemeStudioAssetPackQuery,
  type VisualNarrativeGrammarReport,
} from '@masterflow/shared';

import type {AuthUser} from '../middleware/auth.ts';
import {lintThemePack} from '../engines/theme_lint.ts';
import {buildVisualNarrativeGrammarReport} from './visual_narrative_grammar.ts';

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
}

function isOursDor(report: VisualNarrativeGrammarReport): boolean {
  const haystack = [
    report.grammar.theme_ref ?? '',
    ...report.grammar.visual_elements.map((element) => element.label),
    ...report.explanation_cards.map((card) => card.explanation),
  ].join(' ').toLowerCase();
  return haystack.includes('ours') || haystack.includes('gold') || haystack.includes('dor');
}

function scopeFor(actor: AuthUser, query: ReturnType<typeof ThemeStudioAssetPackQuerySchema.parse>): {scope: ThemeScope; scope_id: string | null} {
  if (query.project_id) return {scope: 'project', scope_id: query.project_id};
  return {scope: 'user', scope_id: actor.id};
}

function themePackFromGrammar(
  actor: AuthUser,
  query: ReturnType<typeof ThemeStudioAssetPackQuerySchema.parse>,
  report: VisualNarrativeGrammarReport,
): ThemePack {
  const scope = scopeFor(actor, query);
  const oursDor = isOursDor(report);
  const themeRef = report.grammar.theme_ref ?? 'theme:masterflow-dynamic';
  return {
    theme_id: `theme-pack:${slug(themeRef)}:${slug(report.grammar.scope_ref)}`,
    version: '0.1.0',
    label: oursDor ? 'Pack candidat Ours d’Or' : 'Pack candidat MasterFlow',
    scope: scope.scope,
    scope_id: scope.scope_id,
    status: 'candidate',
    palette: oursDor
      ? {primary: '#2E1B15', surface: '#FFF8E6', text: '#1F1712', accent: '#D6A329'}
      : {primary: '#2B1B3D', surface: '#F7F5FF', text: '#15121F', accent: '#2F8F83'},
    token_aliases: {
      action: '{palette.accent}',
      actionText: '{palette.text}',
      panelSurface: '{palette.surface}',
      personaGlow: oursDor ? '#FFD36A' : '#A7F3D0',
    },
    fonts: {
      body: {
        family: 'Inter',
        source_ref: 'https://fonts.google.com/specimen/Inter',
        license_status: 'known',
        fallback_family: 'ui-sans-serif, system-ui, sans-serif',
      },
      heading: {
        family: oursDor ? 'Fraunces' : 'Inter',
        source_ref: oursDor ? 'https://fonts.google.com/specimen/Fraunces' : 'https://fonts.google.com/specimen/Inter',
        license_status: 'known',
        fallback_family: 'ui-serif, Georgia, serif',
      },
      display: oursDor
        ? {
            family: 'Cinzel',
            source_ref: 'https://fonts.google.com/specimen/Cinzel',
            license_status: 'known',
            fallback_family: 'ui-serif, Georgia, serif',
          }
        : null,
    },
    contrast_pairs: [
      {pair_id: 'body', foreground: '{palette.text}', background: '{palette.surface}', usage: 'normal_text'},
      {pair_id: 'action', foreground: '{tokens.actionText}', background: '{tokens.action}', usage: 'ui_control'},
    ],
    asset_refs: [...new Set([...report.manifest_refs, ...report.grammar.continuity_refs.filter((ref) => ref.startsWith('visual_reference:'))])],
    source_refs: [...new Set([report.grammar.scope_ref, ...report.grammar.source_refs, ...report.manifest_refs])],
  };
}

function assetGroups(report: VisualNarrativeGrammarReport): ThemeStudioAssetPackPreview['asset_groups'] {
  const identityRefs = report.grammar.continuity_refs.filter((ref) =>
    ref.startsWith('story_character:') || ref.startsWith('persona:') || ref.startsWith('visual_reference:'),
  );
  const loreRefs = report.narrative_fact_refs.slice(0, 12);
  return [
    {
      group_id: 'identity',
      label: 'Identité canon et références',
      role: 'identity',
      refs: identityRefs,
      readiness: identityRefs.length > 0 ? 'ready' : 'limited',
    },
    {
      group_id: 'interface',
      label: 'Tokens interface et typographies',
      role: 'interface',
      refs: report.grammar.visual_elements.map((element) => element.element_id).slice(0, 12),
      readiness: report.grammar.visual_elements.length > 0 ? 'ready' : 'limited',
    },
    {
      group_id: 'event-lore',
      label: 'Lore / événement / progression',
      role: 'lore',
      refs: loreRefs,
      readiness: loreRefs.length > 0 ? 'ready' : 'limited',
    },
    {
      group_id: 'proofs',
      label: 'Preuves D08 et manifests',
      role: 'proof',
      refs: report.manifest_refs,
      readiness: report.manifest_refs.length > 0 ? 'ready' : 'blocked',
    },
  ];
}

function missingDecisions(report: VisualNarrativeGrammarReport): string[] {
  const diagnostics = report.diagnostics;
  const missing = [
    ...(report.grammar.theme_ref ? [] : ['Choisir ou créer un theme_ref avant activation.']),
    ...(diagnostics.missing_continuity_refs.length > 0 ? ['Compléter les références de continuité D08.'] : []),
    ...(diagnostics.unjustified_evolution.length > 0 ? ['Justifier les évolutions visuelles avant asset.'] : []),
    ...(diagnostics.graphic_drift.length > 0 ? ['Arbitrer les dérives graphiques signalées.'] : []),
  ];
  return missing.length > 0 ? missing : ['Valider humainement le pack avant toute application.'];
}

/**
 * Prévisualise un pack thème/assets à partir des manifests et de la grammaire narrative.
 * Ne persiste rien, n'applique aucun CSS, ne télécharge aucune fonte et ne génère aucun asset.
 */
export function buildThemeStudioAssetPackPreview(
  actor: AuthUser,
  query: ThemeStudioAssetPackQuery,
): ThemeStudioAssetPackPreview {
  const input = ThemeStudioAssetPackQuerySchema.parse(query);
  const grammar = buildVisualNarrativeGrammarReport(actor, input);
  const themePack = themePackFromGrammar(actor, input, grammar);
  const lint = lintThemePack(themePack);

  return ThemeStudioAssetPackPreviewSchema.parse({
    generated_at: Date.now(),
    theme_pack: themePack,
    lint_report: lint,
    visual_grammar_ref: grammar.grammar.grammar_id,
    manifest_refs: grammar.manifest_refs,
    asset_groups: assetGroups(grammar),
    missing_decisions: missingDecisions(grammar),
    locked_actions: [
      'apply_theme_pack',
      'download_font',
      'generate_asset',
      'canonize_asset',
      'publish_event_skin',
    ],
    recommended_next_action: lint.valid
      ? 'Relire le pack candidat puis créer une action sensible séparée si MALEX veut l’activer.'
      : 'Corriger les alertes de lint avant toute proposition d’activation.',
    application_policy: 'preview_only',
  });
}
