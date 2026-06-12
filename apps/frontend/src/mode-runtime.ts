import type {
  Action,
  ActionRegistryEntry,
  CurrentContext,
  Resource,
} from '@masterflow/shared';

export type WorkModeId = 'home' | 'teaching' | 'story' | 'project' | 'learning' | 'inventory' | 'admin';

export type WorkMode = {
  id: WorkModeId;
  label: string;
  signal: string;
  requiredRole?: 'admin' | 'godmode';
};

export type DeckItem = {
  id: string;
  label: string;
  meta: string;
  status: string;
};

export type ModeView = {
  signal: string;
  deck: DeckItem[];
};

type ModeRuntimeInput = {
  mode: WorkMode;
  context: CurrentContext | null;
  resources: Resource[];
  resourceCandidates: Resource[];
  liveActions: ActionRegistryEntry[];
  futureActionCount: number;
  hiddenActionCount: number;
  pendingActions: Action[];
  wsState: string;
};

export const WORK_MODES: WorkMode[] = [
  {id: 'home', label: 'Home', signal: 'situation'},
  {id: 'teaching', label: 'Teaching', signal: 'pedagogie'},
  {id: 'story', label: 'Story', signal: 'narration'},
  {id: 'project', label: 'Project', signal: 'pilotage'},
  {id: 'learning', label: 'Learning', signal: 'parcours'},
  {id: 'inventory', label: 'Inventory', signal: 'ressources'},
  {id: 'admin', label: 'Admin', signal: 'supervision', requiredRole: 'admin'},
];

export const DEFAULT_WORK_MODE: WorkMode = WORK_MODES[0] ?? {
  id: 'home',
  label: 'Home',
  signal: 'situation',
};

export function canUseMode(mode: WorkMode, role: string | undefined): boolean {
  if (!mode.requiredRole) return true;
  if (mode.requiredRole === 'admin') return role === 'admin' || role === 'godmode';
  return role === 'godmode';
}

function resourceItems(resources: Resource[], limit: number): DeckItem[] {
  return resources.slice(0, limit).map((resource) => ({
    id: resource.id,
    label: resource.title,
    meta: resource.subjects?.join(', ') || resource.source,
    status: resource.status,
  }));
}

function roomItem(context: CurrentContext | null): DeckItem {
  return {
    id: context?.room.id ?? 'room',
    label: context?.room.name ?? 'Room indisponible',
    meta: context?.room_instance.active_surface ?? 'contexte',
    status: context?.room_instance.cognitive_density ?? 'indisponible',
  };
}

export function buildModeView(input: ModeRuntimeInput): ModeView {
  const {
    mode,
    context,
    resources,
    resourceCandidates,
    liveActions,
    futureActionCount,
    hiddenActionCount,
    pendingActions,
    wsState,
  } = input;

  const validatedResources = resourceItems(resources, mode.id === 'inventory' ? 6 : 3);
  const operationalItems: DeckItem[] = liveActions.slice(0, 3).map((action) => ({
    id: action.action_id,
    label: action.label,
    meta: action.ui_surface,
    status: action.risk_level,
  }));

  if (mode.id === 'admin') {
    return {
      signal: pendingActions.length > 0
        ? `${pendingActions.length} validation(s) attendent une decision.`
        : 'Runtime stable, aucune validation en attente.',
      deck: [
        {id: 'live-actions', label: 'Actions live', meta: 'registre actif', status: String(liveActions.length)},
        {id: 'pending-actions', label: 'Validations', meta: 'inbox', status: String(pendingActions.length)},
        {id: 'resource-candidates', label: 'Sources candidates', meta: 'resource truth', status: String(resourceCandidates.length)},
        {id: 'future-actions', label: 'Actions futures', meta: 'verrouille', status: String(futureActionCount)},
        {id: 'hidden-actions', label: 'Hors scope', meta: 'masque', status: String(hiddenActionCount)},
        {id: 'ws-state', label: 'WebSocket', meta: 'chat runtime', status: wsState},
      ],
    };
  }

  if (mode.id === 'inventory') {
    return {
      signal: resources.length > 0
        ? `${resources.length} source(s) validee(s) disponibles.`
        : 'Aucune source validee dans le registre.',
      deck: validatedResources.length > 0 ? validatedResources : [roomItem(context)],
    };
  }

  if (mode.id === 'learning') {
    return {
      signal: resources.length > 0
        ? 'Le parcours peut s appuyer sur les sources validees.'
        : 'Le parcours attend une source validee.',
      deck: validatedResources.length > 0 ? validatedResources : [roomItem(context)],
    };
  }

  if (mode.id === 'teaching') {
    return {
      signal: pendingActions.length > 0
        ? `${pendingActions.length} validation(s) runtime a traiter.`
        : 'Aucune classe n est exposee par le backend ; la room et les sources restent disponibles.',
      deck: [roomItem(context), ...validatedResources, ...operationalItems].slice(0, 6),
    };
  }

  if (mode.id === 'story') {
    return {
      signal: resources.length > 0
        ? 'Le mode Story travaille depuis les sources validees et le chat actif.'
        : 'Aucun objet narratif reel n est expose ; le chat reste le point de travail.',
      deck: [
        roomItem(context),
        ...validatedResources,
        {id: 'story-chat', label: 'Chat', meta: 'pilotage narratif', status: wsState},
      ].slice(0, 6),
    };
  }

  if (mode.id === 'project') {
    return {
      signal: liveActions.length > 0
        ? `${liveActions.length} action(s) live pour faire avancer la room.`
        : 'Aucune action projet live dans ce contexte.',
      deck: [roomItem(context), ...operationalItems, ...validatedResources].slice(0, 6),
    };
  }

  return {
    signal: liveActions.length > 0
      ? `${liveActions.length} action(s) live disponibles dans ce contexte.`
      : 'Situation stable, aucune action live urgente.',
    deck: [
      roomItem(context),
      {id: 'sources', label: 'Sources validees', meta: 'resource truth', status: String(resources.length)},
      {id: 'chat', label: 'Chat', meta: 'pilotage', status: wsState},
    ],
  };
}
