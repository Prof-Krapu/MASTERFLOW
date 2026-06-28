import type {Action, ActionRegistryEntry, CurrentContext} from '@masterflow/shared';

/**
 * Cœur « agentic » du TUI : l'entrée est d'abord un dialogue ; les commandes ne sont qu'une
 * couche mince. Les actions disponibles dérivent du registre filtré par le loadout, donc toute
 * nouvelle action backend `live` apparaît automatiquement — c'est la couture d'évolutivité.
 * (Couche suivante, non implémentée ici : laisser le persona proposer une action que le TUI
 * surface pour validation humaine, conforme à l'invariant « aucune action sensible sans validation ».)
 */

export type ParsedCommand =
  | {kind: 'empty'}
  | {kind: 'chat'; content: string}
  | {kind: 'help'}
  | {kind: 'actions'}
  | {kind: 'context'}
  | {kind: 'act'; registryId: string; intent: string}
  | {kind: 'approve'; note: string | undefined}
  | {kind: 'reject'; note: string | undefined}
  | {kind: 'exec'}
  | {kind: 'quit'}
  | {kind: 'unknown'; name: string};

/** Parse une ligne saisie : tout ce qui ne commence pas par `/` est un message de chat. */
export function parseCommand(raw: string): ParsedCommand {
  const trimmed = raw.trim();
  if (!trimmed) return {kind: 'empty'};
  if (!trimmed.startsWith('/')) return {kind: 'chat', content: trimmed};

  const [name, ...rest] = trimmed.slice(1).split(/\s+/);
  const argline = trimmed.slice(1 + (name?.length ?? 0)).trim();

  switch (name) {
    case 'help':
    case '?':
      return {kind: 'help'};
    case 'actions':
    case 'a':
      return {kind: 'actions'};
    case 'context':
    case 'ctx':
      return {kind: 'context'};
    case 'act': {
      const registryId = rest[0] ?? '';
      const intent = rest.slice(1).join(' ');
      if (!registryId) return {kind: 'unknown', name: 'act (action_id manquant)'};
      return {kind: 'act', registryId, intent};
    }
    case 'approve':
      return {kind: 'approve', note: argline || undefined};
    case 'reject':
      return {kind: 'reject', note: argline || undefined};
    case 'exec':
    case 'x':
      return {kind: 'exec'};
    case 'quit':
    case 'q':
      return {kind: 'quit'};
    default:
      return {kind: 'unknown', name: name ?? ''};
  }
}

/** Actions réellement actionnables : `status='live'` ET présentes dans le loadout utilisateur. */
export function listLiveActions(context: CurrentContext): ActionRegistryEntry[] {
  const allowed = new Set(context.user_runtime_loadout.available_action_ids);
  return context.available_actions.filter(
    (entry) => entry.status === 'live' && allowed.has(entry.action_id),
  );
}

/** Prochaine commande suggérée selon l'état du cycle d'action. */
export function hintForAction(action: Action): string {
  switch (action.status) {
    case 'approved':
      return 'prête → /exec pour exécuter';
    case 'pending_validation':
      return 'validation humaine requise → /approve [note] ou /reject [note]';
    case 'completed':
      return 'terminée ✓';
    case 'failed':
      return 'échec — voir erreur ci-dessus';
    case 'rejected':
      return 'rejetée';
    default:
      return '';
  }
}

export const HELP_LINES: string[] = [
  'Commandes :',
  '  (texte libre)        envoie un message au persona (streaming DeepSeek)',
  '  /actions             liste les actions live disponibles dans ton loadout',
  '  /act <id> [intent]   crée + preflight une action du registre',
  '  /approve [note]      valide (teacher+) l’action en attente',
  '  /reject [note]       rejette l’action en attente',
  '  /exec                exécute l’action approuvée',
  '  /context             rappelle room, persona et rôle',
  '  /help                affiche cette aide',
  '  /quit                quitte (ou Ctrl+C)',
];
