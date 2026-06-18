import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FormEvent, ReactElement} from 'react';

import type {
  Action,
  ActionRegistryEntry,
  AuthResponse,
  CurrentContext,
  Persona,
  Project,
  ProjectMember,
  ProjectMemberRole,
  RagContextPack,
  RegistryStatus,
  Resource,
  RoomCheckpoint,
  ValidationInboxItem,
  WsServerMessage,
} from '@masterflow/shared';

import {
  attachProjectResource,
  createAction,
  decideValidationInboxItem,
  executeAction,
  getCurrentContext,
  getLatestRoomCheckpoint,
  getValidationInboxItems,
  getProjectMembers,
  getProjectResources,
  getProjects,
  getResources,
  login,
  preflightAction,
  proposeResource,
  queryRag,
  setToken,
  syncCoordinationRag,
  updateRoomInstance,
  validateResource,
} from './api.ts';
import {ActionAudit} from './action-audit.tsx';
import {AdminConsole} from './admin-console.tsx';
import {RegisterWithCode} from './register-form.tsx';
import {InventoryWorkspace} from './inventory-workspace.tsx';
import {JobObservability} from './job-observability.tsx';
import {OwnerCockpit} from './owner-cockpit.tsx';
import {TeachingReadiness} from './teaching-readiness.tsx';
import {
  buildModeView,
  canUseMode,
  DEFAULT_WORK_MODE,
  WORK_MODES,
} from './mode-runtime.ts';
import type {WorkModeId} from './mode-runtime.ts';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type WsState = 'idle' | 'connecting' | 'connected' | 'closed' | 'error';
type ChatTurn = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  speaker?: string;
};
type ActionBuckets = Record<RegistryStatus, ActionRegistryEntry[]>;
type EntryDensity = 'low' | 'medium' | 'high';
type PersonaPresence = 'direct' | 'guided' | 'character';
type EntryProfile = {
  userId: string;
  intent: WorkModeId;
  density: EntryDensity;
  presence: PersonaPresence;
  completedAt: number;
};
type ActionRunState = {
  status: 'idle' | 'creating' | 'preflight' | 'waiting_validation' | 'approved' | 'executing' | 'completed' | 'failed';
  message: string;
  action?: Action;
};
type ValidationRunState = {
  status: 'idle' | 'loading' | 'deciding' | 'ready' | 'error';
  message: string;
};
type ResourceProposalState = {
  status: 'idle' | 'loading' | 'submitting' | 'candidate' | 'validating' | 'validated' | 'error';
  message: string;
  resource?: Resource;
};
type ProjectSyncState = {
  status: 'idle' | 'loading' | 'ready' | 'attaching' | 'synced' | 'error';
  message: string;
};
type RagSyncState = {
  status: 'idle' | 'syncing' | 'querying' | 'ready' | 'refused' | 'error';
  message: string;
  pack?: RagContextPack;
};
type RoomSyncState = {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
};

const ROLE_LABEL: Record<string, string> = {
  student: 'learn',
  teacher: 'prof',
  admin: 'admin',
  godmode: 'godmode',
};

const ENTRY_STORAGE_PREFIX = 'masterflow.entryProfile.';
const PROJECT_ROLE_LABEL: Record<ProjectMemberRole, string> = {
  viewer: 'lecture',
  participant: 'participant',
  editor: 'edition',
  owner: 'owner',
  admin: 'admin projet',
};
const ENTRY_DENSITIES: Array<{id: EntryDensity; label: string; signal: string}> = [
  {id: 'low', label: 'Calme', signal: 'peu dense'},
  {id: 'medium', label: 'Equilibre', signal: 'standard'},
  {id: 'high', label: 'Dense', signal: 'compact'},
];
const PERSONA_PRESENCES: Array<{id: PersonaPresence; label: string; signal: string}> = [
  {id: 'guided', label: 'Guide', signal: 'avec presence'},
  {id: 'direct', label: 'Direct', signal: 'sans personnage'},
  {id: 'character', label: 'Personnage', signal: 'canon visuel'},
];

function bucketActions(actions: ActionRegistryEntry[]): ActionBuckets {
  return actions.reduce<ActionBuckets>(
    (acc, action) => {
      acc[action.status].push(action);
      return acc;
    },
    {live: [], future: [], out_of_scope: []},
  );
}

function wsUrl(roomInstanceId: string, token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const encodedRoom = encodeURIComponent(roomInstanceId);
  const encodedToken = encodeURIComponent(token);
  return `${protocol}//${window.location.host}/ws/${encodedRoom}?token=${encodedToken}`;
}

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canValidateActions(role: string | undefined): boolean {
  return role === 'teacher' || role === 'admin' || role === 'godmode';
}

function canReviewResources(role: string | undefined): boolean {
  return role === 'admin' || role === 'godmode';
}

function canAttachProjectResource(role: string | undefined, memberRole: ProjectMemberRole | null): boolean {
  if (role === 'admin' || role === 'godmode') return true;
  return memberRole === 'owner' || memberRole === 'admin';
}

function entryStorageKey(userId: string): string {
  return `${ENTRY_STORAGE_PREFIX}${userId}`;
}

function readEntryProfile(userId: string): EntryProfile | null {
  try {
    const raw = window.localStorage.getItem(entryStorageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EntryProfile>;
    const knownIntent = WORK_MODES.some((mode) => mode.id === parsed.intent);
    const knownDensity = ENTRY_DENSITIES.some((density) => density.id === parsed.density);
    const knownPresence = PERSONA_PRESENCES.some((presence) => presence.id === parsed.presence);
    if (
      parsed.userId === userId &&
      knownIntent &&
      knownDensity &&
      knownPresence &&
      typeof parsed.completedAt === 'number'
    ) {
      return parsed as EntryProfile;
    }
  } catch {
    return null;
  }
  return null;
}

function writeEntryProfile(profile: EntryProfile): void {
  window.localStorage.setItem(entryStorageKey(profile.userId), JSON.stringify(profile));
}

function App(): ReactElement {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [context, setContext] = useState<CurrentContext | null>(null);
  const [latestCheckpoint, setLatestCheckpoint] = useState<RoomCheckpoint | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [actions, setActions] = useState<ActionRegistryEntry[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceCandidates, setResourceCandidates] = useState<Resource[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectResources, setProjectResources] = useState<Resource[]>([]);
  const [projectResourceId, setProjectResourceId] = useState('');
  const [projectSync, setProjectSync] = useState<ProjectSyncState>({
    status: 'idle',
    message: 'Aucun projet charge.',
  });
  const [ragQuestion, setRagQuestion] = useState('');
  const [ragSync, setRagSync] = useState<RagSyncState>({
    status: 'idle',
    message: 'Memoire de coordination non interrogee.',
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<WorkModeId>('home');
  const [entryIntent, setEntryIntent] = useState<WorkModeId>('learning');
  const [entryDensity, setEntryDensity] = useState<EntryDensity>('medium');
  const [entryPresence, setEntryPresence] = useState<PersonaPresence>('guided');
  const [entryProfile, setEntryProfile] = useState<EntryProfile | null>(null);
  const [actionRun, setActionRun] = useState<ActionRunState>({status: 'idle', message: 'Aucune action lancee.'});
  const [pendingActions, setPendingActions] = useState<ValidationInboxItem[]>([]);
  const [validationNotes, setValidationNotes] = useState<Record<string, string>>({});
  const [validationRun, setValidationRun] = useState<ValidationRunState>({status: 'idle', message: 'Inbox non chargee.'});
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [resourceSubjects, setResourceSubjects] = useState('');
  const [resourceProposal, setResourceProposal] = useState<ResourceProposalState>({
    status: 'idle',
    message: 'Aucune proposition en attente.',
  });
  const [roomSync, setRoomSync] = useState<RoomSyncState>({status: 'idle', message: 'Instance non synchronisee.'});
  const [wsState, setWsState] = useState<WsState>('idle');
  const [chatInput, setChatInput] = useState('');
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const assistantTurnRef = useRef<string | null>(null);

  const isConnected = auth !== null && context !== null;
  const showEntryGate = isConnected && context !== null && entryProfile?.userId !== context.user.id;

  const actionSummary = useMemo(() => {
    const count = actions.length;
    return count > 1 ? `${count} actions` : `${count} action`;
  }, [actions.length]);

  const visiblePersonas = personas.length > 0 ? personas : (context?.personas ?? []);
  const visibleActions = actions.length > 0 ? actions : (context?.available_actions ?? []);

  const actionBuckets = useMemo(() => bucketActions(visibleActions), [visibleActions]);
  const liveActions = actionBuckets.live;
  const nextActions = liveActions.slice(0, 3);
  const lockedCapabilities = context?.user_runtime_loadout.locked_capabilities.slice(0, 4) ?? [];
  const isGodmode = context?.user.role === 'godmode';
  const canAdmin = context?.user.role === 'admin' || context?.user.role === 'godmode';
  const canValidate = canValidateActions(context?.user.role);
  const canReviewResourceTruth = canReviewResources(context?.user.role);
  const roomMode = context?.user.role ? (ROLE_LABEL[context.user.role] ?? context.user.role) : 'session';
  const availableModes = useMemo(
    () => {
      const enabled = new Set(context?.user_runtime_loadout.active_mode_cycle ?? []);
      return WORK_MODES.filter(
        (mode) => canUseMode(mode, context?.user.role) && enabled.has(mode.id),
      );
    },
    [context?.user.role, context?.user_runtime_loadout.active_mode_cycle],
  );
  const entryModes = useMemo(
    () => availableModes.filter((mode) => mode.id !== 'admin'),
    [availableModes],
  );
  const activeMode = availableModes.find((mode) => mode.id === selectedMode) ?? availableModes[0] ?? DEFAULT_WORK_MODE;

  useEffect(() => {
    if (entryModes.some((mode) => mode.id === entryIntent)) return;
    const first = entryModes[0];
    if (first) setEntryIntent(first.id);
  }, [entryIntent, entryModes]);

  const activePersonaId = context?.active_blend?.speaker_persona_id ?? null;

  const activePersona = useMemo(() => {
    if (!activePersonaId) return null;
    return visiblePersonas.find((persona) => persona.id === activePersonaId) ?? null;
  }, [activePersonaId, visiblePersonas]);

  const situationStats = useMemo(() => [
    {label: 'Modes', value: availableModes.length.toString()},
    {label: 'Sources', value: resources.length.toString()},
    {label: 'Actions live', value: liveActions.length.toString()},
    {label: 'Persona', value: activePersona?.name ?? visiblePersonas[0]?.name ?? 'simple'},
  ], [activePersona?.name, availableModes.length, liveActions.length, resources.length, visiblePersonas]);

  const modeView = useMemo(() => buildModeView({
    mode: activeMode,
    context,
    resources,
    resourceCandidates,
    liveActions,
    futureActionCount: actionBuckets.future.length,
    hiddenActionCount: actionBuckets.out_of_scope.length,
    pendingActions,
    wsState,
  }), [
    activeMode,
    actionBuckets.future.length,
    actionBuckets.out_of_scope.length,
    context,
    liveActions,
    pendingActions,
    resourceCandidates,
    resources,
    wsState,
  ]);

  const loadContext = useCallback(async (token: string): Promise<void> => {
    setState('loading');
    setError(null);
    try {
      const [current, nextResources] = await Promise.all([
        getCurrentContext(token),
        getResources(token),
      ]);
      const checkpoint = await getLatestRoomCheckpoint(current.room.id, token);
      const nextProjects = await getProjects(token);
      setContext(current);
      setLatestCheckpoint(checkpoint);
      const storedEntry = readEntryProfile(current.user.id);
      setEntryProfile(storedEntry);
      if (storedEntry) {
        setSelectedMode(storedEntry.intent);
      }
      setPersonas(current.personas);
      setActions(current.available_actions);
      setResources(nextResources);
      setProjects(nextProjects);
      setSelectedProjectId((currentProjectId) => (
        currentProjectId && nextProjects.some((project) => project.project_id === currentProjectId)
          ? currentProjectId
          : nextProjects[0]?.project_id ?? ''
      ));
      setProjectSync({
        status: nextProjects.length > 0 ? 'ready' : 'idle',
        message: nextProjects.length > 0
          ? `${nextProjects.length} projet(s) accessible(s).`
          : 'Aucun projet accessible pour cet utilisateur.',
      });
      setState('ready');
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Contexte indisponible.');
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      setState('loading');
      setError(null);
      try {
        const nextAuth = await login(username, password);
        setAuth(nextAuth);
        await loadContext(nextAuth.token);
      } catch (err) {
        setState('error');
        setError(err instanceof Error ? err.message : 'Connexion impossible.');
      }
    },
    [loadContext, password, username],
  );

  const handleLogout = useCallback((): void => {
    wsRef.current?.close();
    wsRef.current = null;
    assistantTurnRef.current = null;
    setAuth(null);
    setContext(null);
    setLatestCheckpoint(null);
    setPersonas([]);
    setActions([]);
    setResources([]);
    setResourceCandidates([]);
    setProjects([]);
    setSelectedProjectId('');
    setProjectMembers([]);
    setProjectResources([]);
    setProjectResourceId('');
    setRagQuestion('');
    setRagSync({status: 'idle', message: 'Memoire de coordination non interrogee.'});
    setToken(null);
    setState('idle');
    setSelectedMode('home');
    setEntryIntent('learning');
    setEntryDensity('medium');
    setEntryPresence('guided');
    setEntryProfile(null);
    setActionRun({status: 'idle', message: 'Aucune action lancee.'});
    setPendingActions([]);
    setValidationRun({status: 'idle', message: 'Inbox non chargee.'});
    setResourceTitle('');
    setResourceUrl('');
    setResourceSubjects('');
    setResourceProposal({status: 'idle', message: 'Aucune proposition en attente.'});
    setProjectSync({status: 'idle', message: 'Aucun projet charge.'});
    setRoomSync({status: 'idle', message: 'Instance non synchronisee.'});
    setWsState('idle');
    setChatInput('');
    setChatTurns([]);
    setError(null);
  }, []);

  const handleChatSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const content = chatInput.trim();
      if (!content || wsRef.current?.readyState !== WebSocket.OPEN) return;

      wsRef.current.send(JSON.stringify({type: 'chat', content}));
      setChatTurns((current) => [
        ...current,
        {id: nextId('user'), role: 'user', content},
      ]);
      setChatInput('');
    },
    [chatInput],
  );

  const persistRoomInstance = useCallback(async (
    mode: WorkModeId,
    density?: EntryDensity,
    profile?: EntryProfile,
  ): Promise<void> => {
    if (!auth || !context) return;

    setRoomSync({status: 'syncing', message: 'Synchronisation room instance.'});
    try {
      const widgetState = context.room_instance.widget_state ?? {};
      const nextInstance = await updateRoomInstance(context.room.id, {
        active_surface: mode,
        ...(density ? {cognitive_density: density} : {}),
        widget_state: {
          ...widgetState,
          active_mode: mode,
          ...(profile ? {
            entry_profile: {
              intent: profile.intent,
              density: profile.density,
              presence: profile.presence,
              completedAt: profile.completedAt,
            },
          } : {}),
        },
      }, auth.token);
      setContext((current) => (current ? {...current, room_instance: nextInstance} : current));
      setRoomSync({status: 'synced', message: 'Room instance synchronisee.'});
    } catch (err) {
      setRoomSync({
        status: 'error',
        message: err instanceof Error ? err.message : 'Synchronisation impossible.',
      });
    }
  }, [auth, context]);

  const handleEntrySubmit = useCallback((event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!context) return;

    const profile: EntryProfile = {
      userId: context.user.id,
      intent: entryIntent,
      density: entryDensity,
      presence: entryPresence,
      completedAt: Date.now(),
    };
    writeEntryProfile(profile);
    setEntryProfile(profile);
    setSelectedMode(entryIntent);
    void persistRoomInstance(entryIntent, entryDensity, profile);
  }, [context, entryDensity, entryIntent, entryPresence, persistRoomInstance]);

  const handleModeSelect = useCallback((mode: WorkModeId): void => {
    setSelectedMode(mode);
    void persistRoomInstance(mode);
  }, [persistRoomInstance]);

  const refreshPendingActions = useCallback(async (): Promise<void> => {
    if (!auth || !canValidate) {
      setPendingActions([]);
      setValidationRun({status: 'idle', message: 'Inbox reservee aux roles teacher+.'});
      return;
    }

    setValidationRun({status: 'loading', message: 'Chargement validations.'});
    try {
      const pending = await getValidationInboxItems(auth.token);
      setPendingActions(pending);
      setValidationRun({
        status: 'ready',
        message: pending.length > 0 ? `${pending.length} validation(s) en attente.` : 'Aucune validation en attente.',
      });
    } catch (err) {
      setValidationRun({
        status: 'error',
        message: err instanceof Error ? err.message : 'Inbox indisponible.',
      });
    }
  }, [auth, canValidate]);

  const refreshResources = useCallback(async (): Promise<void> => {
    if (!auth) return;

    try {
      const nextResources = await getResources(auth.token);
      setResources(nextResources);

      if (canReviewResourceTruth) {
        const allResources = await getResources(auth.token, true);
        setResourceCandidates(allResources.filter((resource) => resource.status === 'candidate'));
      } else {
        setResourceCandidates([]);
      }
    } catch (err) {
      setResourceProposal({
        status: 'error',
        message: err instanceof Error ? err.message : 'Ressources indisponibles.',
      });
    }
  }, [auth, canReviewResourceTruth]);

  const refreshProjectSurface = useCallback(async (projectId: string): Promise<void> => {
    if (!auth || !projectId) {
      setProjectMembers([]);
      setProjectResources([]);
      setProjectSync({status: 'idle', message: 'Aucun projet selectionne.'});
      return;
    }

    setProjectSync({status: 'loading', message: 'Chargement du projet.'});
    try {
      const [members, sharedResources] = await Promise.all([
        getProjectMembers(projectId, auth.token),
        getProjectResources(projectId, auth.token),
      ]);
      setProjectMembers(members);
      setProjectResources(sharedResources);
      setProjectSync({
        status: 'ready',
        message: `${sharedResources.length} ressource(s) partagee(s), ${members.length} membre(s).`,
      });
    } catch (err) {
      setProjectMembers([]);
      setProjectResources([]);
      setProjectSync({
        status: 'error',
        message: err instanceof Error ? err.message : 'Projet indisponible.',
      });
    }
  }, [auth]);

  const runApprovedAction = useCallback(async (action: Action): Promise<void> => {
    if (!auth) return;

    setActionRun({status: 'executing', message: `Execution : ${action.intent}`, action});
    try {
      const executed = await executeAction(action.id, auth.token);
      setActionRun({
        status: executed.status === 'completed' ? 'completed' : 'failed',
        message: executed.status === 'completed' ? 'Action completee.' : (executed.error ?? `Status ${executed.status}.`),
        action: executed,
      });
    } catch (err) {
      setActionRun({
        status: 'failed',
        message: err instanceof Error ? err.message : 'Execution impossible.',
        action,
      });
    }
  }, [auth]);

  const handleActionClick = useCallback(async (entry: ActionRegistryEntry): Promise<void> => {
    if (!auth || !context) return;

    setActionRun({status: 'creating', message: `Creation : ${entry.label}`});
    try {
      const created = await createAction({
        registry_id: entry.action_id,
        intent: entry.label,
        object_type: entry.ui_surface,
        room_id: context.room.id,
        payload: {
          mode: activeMode.id,
          room_instance_id: context.room_instance.id,
          source: 'frontend_action_chip',
        },
      }, auth.token);

      setActionRun({status: 'preflight', message: `Preflight : ${entry.label}`, action: created});
      const flighted = await preflightAction(created.id, auth.token);

      if (flighted.status === 'failed') {
        setActionRun({
          status: 'failed',
          message: flighted.error ?? 'Preflight refuse par le backend.',
          action: flighted,
        });
        return;
      }

      if (flighted.status === 'pending_validation') {
        setActionRun({
          status: 'waiting_validation',
          message: `Validation requise (${flighted.preflight?.validator_role ?? 'teacher'}).`,
          action: flighted,
        });
        if (canValidate) {
          await refreshPendingActions();
        }
        return;
      }

      if (flighted.status !== 'approved') {
        setActionRun({
          status: 'failed',
          message: `Cycle inattendu : ${flighted.status}.`,
          action: flighted,
        });
        return;
      }

      await runApprovedAction(flighted);
    } catch (err) {
      setActionRun({
        status: 'failed',
        message: err instanceof Error ? err.message : 'Action impossible.',
      });
    }
  }, [activeMode.id, auth, canValidate, context, refreshPendingActions, runApprovedAction]);

  const handleValidationDecision = useCallback(async (
    item: ValidationInboxItem,
    decision: 'approve' | 'reject',
    note?: string,
  ): Promise<void> => {
    if (!auth) return;

    setValidationRun({
      status: 'deciding',
      message: decision === 'approve' ? 'Approbation en cours.' : 'Rejet en cours.',
    });
    try {
      const decided = await decideValidationInboxItem(item.item_id, {
        decision,
        ...(note?.trim() ? {note: note.trim()} : {}),
      }, auth.token);
      setValidationRun({
        status: 'ready',
        message: decided.current_status === 'approved'
          ? 'Decision enregistree. L execution reste une action separee.'
          : 'Candidat rejete avec trace conservee.',
      });
      setValidationNotes((current) => {
        const next = {...current};
        delete next[item.item_id];
        return next;
      });
      await refreshPendingActions();
    } catch (err) {
      setValidationRun({
        status: 'error',
        message: err instanceof Error ? err.message : 'Decision impossible.',
      });
    }
  }, [auth, refreshPendingActions]);

  const handleResourceProposal = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!auth) return;

    const title = resourceTitle.trim();
    const url = resourceUrl.trim();
    const subjects = resourceSubjects
      .split(',')
      .map((subject) => subject.trim())
      .filter(Boolean);

    if (!title) {
      setResourceProposal({status: 'error', message: 'Titre requis.'});
      return;
    }

    setResourceProposal({status: 'submitting', message: 'Proposition en cours.'});
    try {
      const proposed = await proposeResource({
        type: url ? 'link' : 'note',
        title,
        ...(url ? {url} : {}),
        source: 'frontend_proposal',
        subjects,
      }, auth.token);
      setResourceProposal({
        status: 'candidate',
        message: 'Ressource candidate creee. Elle reste hors canon avant validation.',
        resource: proposed,
      });
      if (canReviewResourceTruth) {
        await refreshResources();
      }
      setResourceTitle('');
      setResourceUrl('');
      setResourceSubjects('');
    } catch (err) {
      setResourceProposal({
        status: 'error',
        message: err instanceof Error ? err.message : 'Proposition impossible.',
      });
    }
  }, [auth, canReviewResourceTruth, refreshResources, resourceSubjects, resourceTitle, resourceUrl]);

  const handleResourceValidation = useCallback(async (resource: Resource): Promise<void> => {
    if (!auth) return;

    setResourceProposal({status: 'validating', message: `Validation : ${resource.title}`, resource});
    try {
      const validated = await validateResource(resource.id, auth.token);
      setResourceProposal({
        status: 'validated',
        message: 'Ressource promue au canon valide.',
        resource: validated,
      });
      await refreshResources();
    } catch (err) {
      setResourceProposal({
        status: 'error',
        message: err instanceof Error ? err.message : 'Validation ressource impossible.',
        resource,
      });
    }
  }, [auth, refreshResources]);

  const handleAttachProjectResource = useCallback(async (): Promise<void> => {
    if (!auth || !selectedProjectId || !projectResourceId) return;

    setProjectSync({status: 'attaching', message: 'Rattachement de la ressource au projet.'});
    try {
      await attachProjectResource(selectedProjectId, {
        resource_id: projectResourceId,
        access_level: 'read',
      }, auth.token);
      setProjectResourceId('');
      await refreshProjectSurface(selectedProjectId);
      setProjectSync({status: 'synced', message: 'Ressource partagee avec le projet.'});
    } catch (err) {
      setProjectSync({
        status: 'error',
        message: err instanceof Error ? err.message : 'Rattachement impossible.',
      });
    }
  }, [auth, projectResourceId, refreshProjectSurface, selectedProjectId]);

  const handleCoordinationSync = useCallback(async (): Promise<void> => {
    if (!auth) return;

    setRagSync({status: 'syncing', message: 'Indexation des fichiers de coordination.'});
    try {
      const response = await syncCoordinationRag(auth.token);
      setRagSync({
        status: 'ready',
        message: `${response.results.length} source(s) de coordination synchronisee(s).`,
      });
    } catch (err) {
      setRagSync({
        status: 'error',
        message: err instanceof Error ? err.message : 'Synchronisation RAG impossible.',
      });
    }
  }, [auth]);

  const handleCoordinationQuery = useCallback(async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!auth) return;
    const query = ragQuestion.trim();
    if (query.length < 2) {
      setRagSync({status: 'error', message: 'Question trop courte.'});
      return;
    }

    setRagSync({status: 'querying', message: 'Recherche dans la memoire de coordination.'});
    try {
      const response = await queryRag({query, limit: 6}, auth.token);
      setRagSync({
        status: response.refusal_reason ? 'refused' : 'ready',
        message: response.refusal_reason
          ? `Aucune source exploitable : ${response.refusal_reason}.`
          : `${response.context_pack.citations.length} citation(s) trouvee(s).`,
        pack: response.context_pack,
      });
    } catch (err) {
      setRagSync({
        status: 'error',
        message: err instanceof Error ? err.message : 'Recherche RAG impossible.',
      });
    }
  }, [auth, ragQuestion]);

  useEffect(() => {
    document.title = isConnected ? 'MasterFlow - Home Room' : 'MasterFlow - Connexion';
  }, [isConnected]);

  useEffect(() => {
    if (!auth || !context || showEntryGate || !canValidate) return;
    void refreshPendingActions();
  }, [auth, canValidate, context, refreshPendingActions, showEntryGate]);

  useEffect(() => {
    if (!auth || !context || showEntryGate) return;
    void refreshResources();
  }, [auth, canReviewResourceTruth, context, refreshResources, showEntryGate]);

  useEffect(() => {
    if (!auth || !context || showEntryGate) return;
    void refreshProjectSurface(selectedProjectId);
  }, [auth, context, refreshProjectSurface, selectedProjectId, showEntryGate]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.project_id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const currentProjectMember = useMemo(() => {
    if (!context) return null;
    return projectMembers.find((member) => member.user_id === context.user.id) ?? null;
  }, [context, projectMembers]);
  const sharedResourceIds = useMemo(
    () => new Set(projectResources.map((resource) => resource.id)),
    [projectResources],
  );
  const attachableResources = useMemo(
    () => resources.filter((resource) => !sharedResourceIds.has(resource.id)),
    [resources, sharedResourceIds],
  );
  const canAttachCurrentProjectResource = canAttachProjectResource(
    context?.user.role,
    currentProjectMember?.role ?? null,
  );

  useEffect(() => {
    if (!auth || !context || showEntryGate) return undefined;

    const socket = new WebSocket(wsUrl(context.room_instance.id, auth.token));
    wsRef.current = socket;
    setWsState('connecting');
    setChatTurns([]);
    assistantTurnRef.current = null;

    socket.addEventListener('open', () => {
      setWsState('connected');
      socket.send(JSON.stringify({type: 'ping'}));
    });

    socket.addEventListener('close', () => {
      setWsState((current) => (current === 'error' ? 'error' : 'closed'));
      if (wsRef.current === socket) wsRef.current = null;
    });

    socket.addEventListener('error', () => {
      setWsState('error');
    });

    socket.addEventListener('message', (event) => {
      let message: WsServerMessage;
      try {
        message = JSON.parse(String(event.data)) as WsServerMessage;
      } catch {
        setChatTurns((current) => [
          ...current,
          {id: nextId('system'), role: 'system', content: 'Message WS illisible.'},
        ]);
        return;
      }

      if (message.type === 'pong') return;

      if (message.type === 'chat_start') {
        const id = nextId('assistant');
        assistantTurnRef.current = id;
        setChatTurns((current) => [
          ...current,
          {id, role: 'assistant', content: '', speaker: message.speaker},
        ]);
        return;
      }

      if (message.type === 'chat_chunk') {
        const id = assistantTurnRef.current;
        if (!id) return;
        setChatTurns((current) => current.map((turn) => (
          turn.id === id ? {...turn, content: `${turn.content}${message.content}`} : turn
        )));
        return;
      }

      if (message.type === 'chat_end') {
        assistantTurnRef.current = null;
        if (message.method_attribution) {
          setChatTurns((current) => [
            ...current,
            {id: nextId('system'), role: 'system', content: message.method_attribution ?? ''},
          ]);
        }
        return;
      }

      if (message.type === 'error') {
        setChatTurns((current) => [
          ...current,
          {id: nextId('system'), role: 'system', content: message.message},
        ]);
      }
    });

    return () => {
      socket.close();
    };
  }, [auth, context, showEntryGate]);

  return (
    <main className="shell">
      <section className="topbar" aria-label="Etat MasterFlow">
        <div>
          <p className="eyebrow">MasterFlow</p>
          <h1>Home Room</h1>
        </div>
        <span className={`status status--${state}`}>
          {state === 'ready' ? 'connecte' : state}
        </span>
      </section>

      {!auth ? (
        <form className="panel login" onSubmit={handleSubmit}>
          <label>
            Identifiant
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              type="text"
              value={username}
            />
          </label>
          <label>
            Mot de passe
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          <button disabled={state === 'loading'} type="submit">
            {state === 'loading' ? 'Connexion...' : 'Se connecter'}
          </button>
          {error ? <p className="error">{error}</p> : null}
          <RegisterWithCode
            onAuthed={(nextAuth) => {
              setAuth(nextAuth);
              void loadContext(nextAuth.token);
            }}
          />
        </form>
      ) : showEntryGate && context ? (
        <form className="panel entry-gate" onSubmit={handleEntrySubmit}>
          <div className="entry-head">
            <p className="eyebrow">{roomMode} / entree</p>
            <h2>{context.user.display_name}</h2>
          </div>

          <fieldset>
            <legend>Aujourd'hui</legend>
            <div className="entry-options">
              {entryModes.map((mode) => {
                const intent = mode.id;
                return (
                  <button
                    className={`entry-option${entryIntent === intent ? ' entry-option--active' : ''}`}
                    key={intent}
                    onClick={() => setEntryIntent(intent)}
                    type="button"
                  >
                    <strong>{mode.label}</strong>
                    <span>{mode.signal}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend>Densite</legend>
            <div className="entry-options entry-options--three">
              {ENTRY_DENSITIES.map((density) => (
                <button
                  className={`entry-option${entryDensity === density.id ? ' entry-option--active' : ''}`}
                  key={density.id}
                  onClick={() => setEntryDensity(density.id)}
                  type="button"
                >
                  <strong>{density.label}</strong>
                  <span>{density.signal}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>Presence</legend>
            <div className="entry-options entry-options--three">
              {PERSONA_PRESENCES.map((presence) => (
                <button
                  className={`entry-option${entryPresence === presence.id ? ' entry-option--active' : ''}`}
                  key={presence.id}
                  onClick={() => setEntryPresence(presence.id)}
                  type="button"
                >
                  <strong>{presence.label}</strong>
                  <span>{presence.signal}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="entry-actions">
            <button type="submit">Entrer</button>
            <button className="secondary" onClick={handleLogout} type="button">
              Deconnexion
            </button>
          </div>
        </form>
      ) : (
        <section className="workspace" aria-label="Contexte courant">
          <article className="panel situation-panel">
            {context ? (
              <>
                <div className="room-title">
                  <div>
                    <p className="eyebrow">{roomMode} / {activeMode.signal}</p>
                    <h2>{context.room.name}</h2>
                  </div>
                  <button className="secondary" onClick={handleLogout} type="button">
                    Deconnexion
                  </button>
                </div>
                <div className="room-summary">
                  <span>{context.user.display_name}</span>
                  <span>{activePersona?.name ?? 'persona simple'}</span>
                  <span>{context.room_instance.active_surface}</span>
                  <span>{context.room_instance.cognitive_density}</span>
                </div>
                <section className="context-card" aria-label="Contexte charge">
                  <div>
                    <p className="eyebrow">Tu es ici</p>
                    <strong>
                      {typeof context.room.context?.['purpose'] === 'string'
                        ? context.room.context['purpose']
                        : `${context.room.name} organise le travail utile maintenant.`}
                    </strong>
                  </div>
                  <div className="context-card__meta">
                    <span>{context.runtime_context.trace.granted_tier}</span>
                    <span>{context.runtime_context.authoritative_facts.length} sources fiables</span>
                    <span>{context.user_runtime_loadout.available_action_ids.length} actions</span>
                  </div>
                  {latestCheckpoint ? (
                    <div className="context-resume">
                      <strong>Reprise</strong>
                      <span>{latestCheckpoint.summary}</span>
                      {latestCheckpoint.next_recommended_action ? (
                        <small>Ensuite : {latestCheckpoint.next_recommended_action}</small>
                      ) : null}
                    </div>
                  ) : null}
                  {context.runtime_context.trace.uncertainty.length > 0 ? (
                    <p className="context-warning">
                      Contexte incomplet : {context.runtime_context.trace.uncertainty.join(', ')}
                    </p>
                  ) : null}
                </section>
                <div className={`room-sync room-sync--${roomSync.status}`} aria-live="polite">
                  <strong>{roomSync.status}</strong>
                  <span>{roomSync.message}</span>
                </div>
                <div className="situation-grid" aria-label="Situation">
                  {situationStats.map((stat) => (
                    <div className="situation-stat" key={stat.label}>
                      <span>{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">Contexte en attente.</p>
            )}
            {error ? (
              <div className="notice notice--error">
                <strong>Backend indisponible</strong>
                <span>{error}</span>
                <button className="secondary" onClick={() => auth ? void loadContext(auth.token) : undefined} type="button">
                  Reessayer
                </button>
              </div>
            ) : null}
          </article>

          <nav className="panel mode-rail" aria-label="Modes MasterFlow">
            {availableModes.map((mode) => (
              <button
                className={`mode-button${activeMode.id === mode.id ? ' mode-button--active' : ''}`}
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                type="button"
              >
                <strong>{mode.label}</strong>
                <span>{mode.signal}</span>
              </button>
            ))}
          </nav>

          <article className="panel panel--wide main-widget">
            <div className="panel-header">
              <h2>{activeMode.label}</h2>
              <span className="counter">{activeMode.signal}</span>
            </div>
            <p className="main-signal">{modeView.signal}</p>
            <div className="next-actions" aria-label="Actions utiles">
              {nextActions.length > 0 ? (
                nextActions.map((action) => (
                  <button
                    className="action-chip"
                    disabled={actionRun.status === 'creating' || actionRun.status === 'preflight' || actionRun.status === 'executing'}
                    key={action.action_id}
                    onClick={() => void handleActionClick(action)}
                    type="button"
                  >
                    <span>{action.label}</span>
                    <small>{action.preflight_required ? 'preflight' : action.risk_level}</small>
                  </button>
                ))
              ) : (
                <p className="muted compact">Aucune action live disponible.</p>
              )}
            </div>
            <div className={`action-run action-run--${actionRun.status}`} aria-live="polite">
              <div>
                <strong>{actionRun.status}</strong>
                <span>{actionRun.message}</span>
                {actionRun.action?.id ? <small>{actionRun.action.id}</small> : null}
              </div>
              {actionRun.status === 'approved' && actionRun.action ? (
                <button
                  disabled={actionRun.action.status !== 'approved'}
                  onClick={() => {
                    if (actionRun.action) void runApprovedAction(actionRun.action);
                  }}
                  type="button"
                >
                  Executer
                </button>
              ) : null}
            </div>
            {actionRun.action ? <ActionAudit action={actionRun.action} /> : null}
          </article>

          {activeMode.id === 'inventory' && auth && context ? (
            <InventoryWorkspace
              onProjectChange={setSelectedProjectId}
              projectMemberRole={currentProjectMember?.role ?? null}
              projects={projects}
              role={context.user.role}
              selectedProjectId={selectedProjectId}
              token={auth.token}
            />
          ) : null}

          {activeMode.id === 'teaching' && auth && context ? (
            <TeachingReadiness
              context={context}
              project={selectedProject}
              projectResources={projectResources}
              resources={resources}
              token={auth.token}
              validationItems={pendingActions}
            />
          ) : null}

          {activeMode.id !== 'inventory' ? <article className="panel panel--wide">
            <div className="panel-header">
              <h2>Objets</h2>
              <span className="counter">{modeView.deck.length}</span>
            </div>
            <div className="object-deck">
              {modeView.deck.map((item) => (
                <article className="object-card" key={item.id}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <small>{item.status}</small>
                </article>
              ))}
            </div>
          </article> : null}

          {activeMode.id !== 'inventory' ? <article className="panel panel--wide source-strip">
            <div className="panel-header">
              <h2>Sources</h2>
              <span className="counter">{resources.length}</span>
            </div>
            {resources.length > 0 ? (
              <div className="resource-list">
                {resources.slice(0, 3).map((resource) => (
                  <a className="resource-item" href={resource.url ?? '#'} key={resource.id}>
                    <strong>{resource.title}</strong>
                    <span>{resource.source}</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="muted compact">Aucune source validee chargee.</p>
            )}
            <form className="resource-form" onSubmit={handleResourceProposal}>
              <input
                aria-label="Titre de ressource"
                onChange={(event) => setResourceTitle(event.target.value)}
                placeholder="Proposer une source"
                type="text"
                value={resourceTitle}
              />
              <input
                aria-label="URL de ressource"
                onChange={(event) => setResourceUrl(event.target.value)}
                placeholder="URL optionnelle"
                type="url"
                value={resourceUrl}
              />
              <input
                aria-label="Sujets de ressource"
                onChange={(event) => setResourceSubjects(event.target.value)}
                placeholder="sujets, separes, par virgules"
                type="text"
                value={resourceSubjects}
              />
              <button disabled={resourceProposal.status === 'submitting'} type="submit">
                Proposer
              </button>
            </form>
            <div className={`resource-proposal resource-proposal--${resourceProposal.status}`} aria-live="polite">
              <strong>{resourceProposal.status}</strong>
              <span>{resourceProposal.message}</span>
              {resourceProposal.resource?.id ? <small>{resourceProposal.resource.id}</small> : null}
            </div>
            {canReviewResourceTruth ? (
              <div className="resource-candidates">
                <div className="panel-header">
                  <h3>Candidates</h3>
                  <span className="counter">{resourceCandidates.length}</span>
                </div>
                {resourceCandidates.length > 0 ? (
                  <div className="resource-list">
                    {resourceCandidates.slice(0, 5).map((resource) => (
                      <article className="resource-candidate" key={resource.id}>
                        <div>
                          <strong>{resource.title}</strong>
                          <span>{resource.url ?? resource.source}</span>
                        </div>
                        <button
                          disabled={resourceProposal.status === 'validating'}
                          onClick={() => void handleResourceValidation(resource)}
                          type="button"
                        >
                          Valider
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted compact">Aucune candidate ressource.</p>
                )}
              </div>
            ) : null}
          </article> : null}

          {activeMode.id === 'project' ? (
            <article className="panel panel--wide project-panel">
              <div className="panel-header">
                <h2>Projet</h2>
                <span className="counter">{projects.length}</span>
              </div>
              <div className={`project-state project-state--${projectSync.status}`} aria-live="polite">
                <strong>{projectSync.status}</strong>
                <span>{projectSync.message}</span>
              </div>

              {projects.length > 0 ? (
                <>
                  <label className="project-selector">
                    Projet actif
                    <select
                      onChange={(event) => setSelectedProjectId(event.target.value)}
                      value={selectedProjectId}
                    >
                      {projects.map((project) => (
                        <option key={project.project_id} value={project.project_id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="project-grid">
                    <section className="project-section">
                      <div className="panel-header">
                        <h3>Ressources partagees</h3>
                        <span className="counter">{projectResources.length}</span>
                      </div>
                      {projectResources.length > 0 ? (
                        <div className="resource-list">
                          {projectResources.slice(0, 6).map((resource) => (
                            <a className="resource-item" href={resource.url ?? '#'} key={resource.id}>
                              <strong>{resource.title}</strong>
                              <span>{resource.source}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="muted compact">Aucune ressource partagee dans ce projet.</p>
                      )}
                    </section>

                    <section className="project-section">
                      <div className="panel-header">
                        <h3>Membres</h3>
                        <span className="counter">{projectMembers.length}</span>
                      </div>
                      <div className="member-list">
                        {projectMembers.slice(0, 8).map((member) => (
                          <article className="member-item" key={`${member.project_id}-${member.user_id}`}>
                            <strong>{member.user_id === context?.user.id ? 'Vous' : member.user_id}</strong>
                            <span>{PROJECT_ROLE_LABEL[member.role]}</span>
                          </article>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="project-attach">
                    <div>
                      <strong>{selectedProject?.name ?? 'Projet'}</strong>
                      <span>
                        {canAttachCurrentProjectResource
                          ? 'Rattachement autorise par le backend pour ce role.'
                          : 'Lecture projet active ; rattachement reserve owner/admin.'}
                      </span>
                    </div>
                    <select
                      aria-label="Ressource a partager"
                      disabled={!canAttachCurrentProjectResource || attachableResources.length === 0}
                      onChange={(event) => setProjectResourceId(event.target.value)}
                      value={projectResourceId}
                    >
                      <option value="">Choisir une source validee</option>
                      {attachableResources.map((resource) => (
                        <option key={resource.id} value={resource.id}>
                          {resource.title}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={
                        !canAttachCurrentProjectResource ||
                        projectSync.status === 'attaching' ||
                        projectResourceId.length === 0
                      }
                      onClick={() => void handleAttachProjectResource()}
                      type="button"
                    >
                      Partager
                    </button>
                  </div>
                </>
              ) : (
                <p className="muted compact">Aucun projet accessible. Le backend Project/Scope est pret, mais aucun espace n est encore assigne a ce compte.</p>
              )}
            </article>
          ) : null}

          {canValidate ? (
            <article className="panel panel--wide validation-panel">
              <div className="panel-header">
                <h2>Validation</h2>
                <span className="counter">{pendingActions.length}</span>
              </div>
              <div className={`validation-state validation-state--${validationRun.status}`} aria-live="polite">
                <strong>{validationRun.status}</strong>
                <span>{validationRun.message}</span>
              </div>
              <div className="validation-list">
                {pendingActions.length > 0 ? (
                  pendingActions.slice(0, 5).map((item) => (
                    <article className="validation-item" key={item.item_id}>
                      <div className="validation-item__summary">
                        <div className="validation-item__heading">
                          <strong>{item.title}</strong>
                          <span className={`validation-risk validation-risk--${item.risk_level}`}>{item.risk_level}</span>
                        </div>
                        <span>{item.summary}</span>
                        <div className="validation-facts">
                          <span><strong>Changement</strong>{item.proposed_action}</span>
                          <span><strong>Impact</strong>{item.impact_summary}</span>
                          <span><strong>Source</strong>{item.source_truth_state}</span>
                          <span><strong>Validateur</strong>{item.required_validator}</span>
                        </div>
                        <div className="validation-blockers">
                          <strong>Bloque</strong>
                          <span>{item.blocked_actions.join(', ') || 'Aucun effet declare'}</span>
                        </div>
                        <small>
                          Prochaine decision : {item.recommended_decision ?? item.decision_options[0] ?? 'demander precision'}
                        </small>
                      </div>
                      <label className="validation-note">
                        <span>Note de decision</span>
                        <textarea
                          onChange={(event) => setValidationNotes((current) => ({
                            ...current,
                            [item.item_id]: event.target.value,
                          }))}
                          rows={2}
                          value={validationNotes[item.item_id] ?? ''}
                        />
                      </label>
                      <div className="validation-actions">
                        <button
                          className="secondary"
                          disabled={validationRun.status === 'deciding' || !item.decision_options.includes('reject')}
                          onClick={() => void handleValidationDecision(item, 'reject', validationNotes[item.item_id])}
                          type="button"
                        >
                          Rejeter
                        </button>
                        <button
                          disabled={validationRun.status === 'deciding' || !item.decision_options.includes('approve')}
                          onClick={() => void handleValidationDecision(item, 'approve', validationNotes[item.item_id])}
                          type="button"
                        >
                          Approuver
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="muted compact">Aucune action en attente.</p>
                )}
              </div>
            </article>
          ) : null}

          {canAdmin ? (
            <article className="panel panel--wide rag-panel">
              <div className="panel-header">
                <h2>Memoire coordination</h2>
                <span className="counter">{ragSync.pack?.citations.length ?? 0}</span>
              </div>
              <div className={`rag-state rag-state--${ragSync.status}`} aria-live="polite">
                <strong>{ragSync.status}</strong>
                <span>{ragSync.message}</span>
                {ragSync.pack?.pack_id ? <small>{ragSync.pack.pack_id}</small> : null}
              </div>
              <div className="rag-actions">
                <button
                  className="secondary"
                  disabled={ragSync.status === 'syncing'}
                  onClick={() => void handleCoordinationSync()}
                  type="button"
                >
                  Synchroniser
                </button>
                <form className="rag-form" onSubmit={handleCoordinationQuery}>
                  <input
                    aria-label="Question RAG coordination"
                    onChange={(event) => setRagQuestion(event.target.value)}
                    placeholder="Chercher dans SUIVI / inbox / sync thread"
                    type="search"
                    value={ragQuestion}
                  />
                  <button disabled={ragSync.status === 'querying' || ragQuestion.trim().length < 2} type="submit">
                    Chercher
                  </button>
                </form>
              </div>
              {ragSync.pack?.citations.length ? (
                <div className="rag-citations">
                  {ragSync.pack.citations.map((citation) => (
                    <article className="rag-citation" key={citation.chunk_id}>
                      <div>
                        <strong>{citation.title}</strong>
                        <span>{citation.source_uri}</span>
                      </div>
                      <p>{citation.excerpt}</p>
                      <small>{Math.round(citation.score * 100)}% / {citation.trust_status}</small>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted compact">Synchronise puis cherche un point ouvert, une decision ou un blocage.</p>
              )}
            </article>
          ) : null}

          <article className="panel panel--wide chat-panel">
            <div className="panel-header">
              <h2>Chat</h2>
              <span className={`ws-badge ws-badge--${wsState}`}>{wsState}</span>
            </div>
            <div className="chat-log" aria-live="polite">
              {chatTurns.length > 0 ? (
                chatTurns.map((turn) => (
                  <article className={`chat-turn chat-turn--${turn.role}`} key={turn.id}>
                    <strong>{turn.speaker ?? (turn.role === 'user' ? 'Vous' : 'Systeme')}</strong>
                    <p>{turn.content || '...'}</p>
                  </article>
                ))
              ) : (
                <p className="muted compact">Chat pret des que le WebSocket est connecte.</p>
              )}
            </div>
            <form className="chat-form" onSubmit={handleChatSubmit}>
              <input
                aria-label="Message chat"
                disabled={wsState !== 'connected'}
                onChange={(event) => setChatInput(event.target.value)}
                placeholder={wsState === 'connected' ? 'Message court...' : 'WebSocket indisponible'}
                type="text"
                value={chatInput}
              />
              <button disabled={wsState !== 'connected' || chatInput.trim().length === 0} type="submit">
                Envoyer
              </button>
            </form>
          </article>

          {isGodmode ? (
            <article className="panel panel--wide debug-panel">
              <div className="panel-header">
                <h2>Debug</h2>
                <span className="counter">{actionSummary}</span>
              </div>
              <div className="locked-grid">
                {lockedCapabilities.length > 0 ? (
                  lockedCapabilities.map((capability) => (
                    <article className="locked-item" key={capability.capability_id}>
                      <div>
                        <strong>{capability.capability_id}</strong>
                        <span>{capability.reason}</span>
                      </div>
                      <small>verrouille</small>
                    </article>
                  ))
                ) : null}
              </div>
              <dl className="facts">
                <div>
                  <dt>Live</dt>
                  <dd>{actionBuckets.live.length}</dd>
                </div>
                <div>
                  <dt>Future</dt>
                  <dd>{actionBuckets.future.length}</dd>
                </div>
                <div>
                  <dt>Hors scope</dt>
                  <dd>{actionBuckets.out_of_scope.length}</dd>
                </div>
                <div>
                  <dt>API</dt>
                  <dd>/api/v1</dd>
                </div>
              </dl>
            </article>
          ) : null}

          {canAdmin && context && auth ? (
            <AdminConsole token={auth.token} role={context.user.role} currentUserId={context.user.id} />
          ) : null}

          {canAdmin && auth && context ? (
            <OwnerCockpit
              activeMode={activeMode.id}
              contextTier={context.runtime_context.trace.granted_tier}
              token={auth.token}
            />
          ) : null}

          {canAdmin && auth ? <JobObservability token={auth.token} /> : null}
        </section>
      )}
    </main>
  );
}

export default App;
