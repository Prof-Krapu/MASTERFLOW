import type {FormEvent, ReactElement, RefObject} from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDot,
  MessageCircle,
  ShieldCheck,
  Users,
} from 'lucide-react';

import type {PilotJourneyState, Room, SourceIntakeRecord} from '@masterflow/shared';

import {ChatDock} from './app-shell.tsx';
import type {PersonaVisualState} from './app-shell.tsx';
import type {ExpressiveVoiceDisclosure} from './expressive-voice-disclosure.ts';

type ChatTurn = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  speaker?: string;
  expressiveVoice?: ExpressiveVoiceDisclosure;
};

type PilotConversationWorkspaceProps = {
  activePersonaId?: string | null;
  activePersonaName?: string | null;
  activeRoomId: string;
  chatInput: string;
  conversationTurns: ChatTurn[];
  fallbackCheckpoint: string;
  fallbackProjectName: string;
  fallbackValidations: number;
  inputRef?: RefObject<HTMLInputElement | null>;
  journey: PilotJourneyState | null;
  journeyState: 'idle' | 'loading' | 'ready' | 'error';
  onChatInputChange: (value: string) => void;
  onChatSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPreparePrompt: (prompt: string) => void;
  onRoomChange: (roomId: string) => void;
  personaState: PersonaVisualState;
  roomInstanceId: string;
  rooms: Room[];
  runtimePackId: string;
  sources: SourceIntakeRecord[];
  wsState: string;
};

type PilotCopy = {
  name: string;
  shortName: string;
  summary: string;
  theme: 'gold' | 'coral';
  prompts: string[];
};

const PILOT_COPY: Record<string, PilotCopy> = {
  'ours-dor-pilot-v1': {
    name: "Ours d'Or",
    shortName: "Ours d'Or",
    summary: 'Avance étape par étape, sans fabriquer le livrable final à ta place.',
    theme: 'gold',
    prompts: [
      'Aide-moi à choisir une zone et formuler l’effet attendu.',
      'Teste la lisibilité de mon idée sans fabriquer le film.',
      'Qu’est-ce qui manque pour passer le prochain checkpoint ?',
    ],
  },
  'talents-creatifs-pilot-v1': {
    name: 'Talents Créatifs',
    shortName: 'Talents',
    summary: 'Reprends le brief, le groupe et le prochain jalon avec les bonnes sources.',
    theme: 'coral',
    prompts: [
      'Aide-nous à choisir un brief adapté à notre équipe.',
      'Quels rôles de mission devons-nous encore couvrir ?',
      'Quelle preuve préparer pour le prochain jalon ?',
    ],
  },
};

const SOURCE_ROLE_LABEL: Record<SourceIntakeRecord['source_role'], string> = {
  shared: 'Partagée',
  student: 'Étudiant',
  teacher: 'Professeur',
  team: 'Équipe',
};

const RESPONSIBILITY_KIND_LABEL = {
  guide: 'Guide créatif',
  operator: 'Checkpoint opérationnel',
  mission: 'Rôle de mission',
} as const;

const EXCLUDED_CAPABILITY_LABEL: Record<string, string> = {
  automatic_awards: 'palmarès automatique',
  automatic_grading: 'notation automatique',
  automatic_publication: 'publication automatique',
  automatic_submission: 'dépôt automatique',
  guest_accounts: 'comptes invités',
  permission_from_mission_role: 'permission liée au rôle de mission',
  vote_public_live: 'vote public live',
};

function wsLabel(state: string): string {
  if (state === 'connected') return 'Conversation prête';
  if (state === 'connecting') return 'Connexion…';
  if (state === 'error') return 'Conversation indisponible';
  return 'En attente';
}

export function PilotConversationWorkspace(props: PilotConversationWorkspaceProps): ReactElement {
  const {
    activePersonaId,
    activePersonaName,
    activeRoomId,
    chatInput,
    conversationTurns,
    fallbackCheckpoint,
    fallbackProjectName,
    fallbackValidations,
    inputRef,
    journey,
    journeyState,
    onChatInputChange,
    onChatSubmit,
    onPreparePrompt,
    onRoomChange,
    personaState,
    roomInstanceId,
    rooms,
    runtimePackId,
    sources,
    wsState,
  } = props;
  const copy = PILOT_COPY[runtimePackId] ?? {
    name: 'Pilote MasterFlow',
    shortName: 'Pilote',
    summary: 'Reprends ton projet et avance avec une prochaine action claire.',
    theme: 'gold' as const,
    prompts: ['Aide-moi à reprendre le projet.', 'Quelle est la prochaine action utile ?'],
  };
  const visibleSources = journey?.visible_sources ?? sources;
  const stage = journey?.current_stage.label ?? fallbackCheckpoint;
  const checkpoint = journey?.checkpoint?.summary ?? 'Premier cadrage à confirmer';
  const nextAction = journey?.next_action ?? 'Commencer par présenter le projet dans le chat.';
  const projectName = journey?.project.name ?? fallbackProjectName;
  const validations = journey?.validations_pending ?? fallbackValidations;
  const participantCount = journey?.participant_count ?? 0;
  const questions = journey?.open_questions ?? [];
  const journeyDetail = journey?.journey ?? null;
  const hasMissionRoles = journeyDetail?.responsibilities.some((item) => item.kind === 'mission') ?? false;

  return (
    <section className={`pilot-workspace pilot-workspace--${copy.theme}`} aria-labelledby="pilot-title">
      <header className="pilot-workspace__header">
        <div className="pilot-workspace__identity">
          <p className="eyebrow">Pilote conversationnel</p>
          <h2 id="pilot-title">{copy.name}</h2>
          <p className="pilot-workspace__summary">{copy.summary}</p>
          {journey?.collaboration ? (
            <p
              aria-label="Collaboration : compte individuel dans un espace projet partagé"
              className="pilot-workspace__collaboration"
            >
              <Users aria-hidden="true" size={14} />
              <span>Compte individuel</span>
              <span aria-hidden="true">·</span>
              <span>Espace projet partagé</span>
            </p>
          ) : null}
        </div>
        <div className="pilot-workspace__controls">
          <span className="pilot-workspace__simulation">
            <CircleDot aria-hidden="true" size={14} />
            Préparation locale · IA réelle en attente
          </span>
          {rooms.length > 1 ? (
            <label>
              Espace
              <select
                aria-label="Espace conversationnel"
                onChange={(event) => onRoomChange(event.target.value)}
                value={activeRoomId}
              >
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </header>

      <div className="pilot-workspace__layout">
        <aside className="pilot-workspace__context" aria-label="Contexte du pilote">
          <section className="pilot-now">
            <span className="pilot-now__stage">{stage}</span>
            {journeyDetail ? (
              <span className="pilot-now__progress">
                Étape {journeyDetail.current_position} sur {journeyDetail.stage_count} · progression non notante
              </span>
            ) : null}
            <p className="pilot-now__label">Prochaine action</p>
            <h3>{nextAction}</h3>
            <span className="pilot-now__checkpoint">Checkpoint · {checkpoint}</span>
          </section>

          {journeyDetail ? (
            <section className="pilot-path" aria-labelledby="pilot-path-title">
              <div className="pilot-section-title">
                <h3 id="pilot-path-title">{journeyDetail.experience_label}</h3>
                <span>{journeyDetail.current_position}/{journeyDetail.stage_count}</span>
              </div>
              <ol>
                {journeyDetail.stages.map((journeyStage, index) => (
                  <li className={`pilot-path__stage pilot-path__stage--${journeyStage.status}`} key={journeyStage.stage_id}>
                    <span>{index + 1}</span>
                    <div>
                      <strong>{journeyStage.label}</strong>
                      <small>{journeyStage.status === 'current' ? journeyStage.purpose : (
                        journeyStage.status === 'completed' ? 'Checkpoint précédent' : 'À venir'
                      )}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <dl className="pilot-facts">
            <div>
              <BookOpen aria-hidden="true" size={17} />
              <dt>Projet</dt>
              <dd>{projectName}</dd>
            </div>
            <div>
              <Users aria-hidden="true" size={17} />
              <dt>Participants</dt>
              <dd>{participantCount || 'À confirmer'}</dd>
            </div>
            <div>
              <ShieldCheck aria-hidden="true" size={17} />
              <dt>Sources visibles</dt>
              <dd>{visibleSources.length}</dd>
            </div>
            <div>
              <CheckCircle2 aria-hidden="true" size={17} />
              <dt>Validations</dt>
              <dd>{validations ?? 'Selon votre rôle'}</dd>
            </div>
          </dl>

          {journeyDetail?.facts.length ? (
            <section className="pilot-brief" aria-labelledby="pilot-brief-title">
              <div className="pilot-section-title">
                <h3 id="pilot-brief-title">Cadre du pilote</h3>
                <span>{journeyDetail.facts.length}</span>
              </div>
              <ul>
                {journeyDetail.facts.map((fact) => (
                  <li key={fact.fact_id}>
                    <div>
                      <strong>{fact.label}</strong>
                      <span>{fact.value}</span>
                    </div>
                    <small className={fact.status === 'source_required' ? 'is-source-required' : ''}>
                      {fact.status === 'source_required' ? 'Source à confirmer' : 'Cadre validé'}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {journeyDetail?.responsibilities.length ? (
            <section className="pilot-responsibilities" aria-labelledby="pilot-responsibilities-title">
              <div className="pilot-section-title">
                <h3 id="pilot-responsibilities-title">
                  {hasMissionRoles ? 'Rôles de mission à attribuer' : 'Responsabilités'}
                </h3>
                <span>{journeyDetail.responsibilities.length}</span>
              </div>
              <ul>
                {journeyDetail.responsibilities.map((responsibility) => (
                  <li key={responsibility.responsibility_id}>
                    <strong>{responsibility.label}</strong>
                    <span>{responsibility.purpose}</span>
                    <small>
                      {RESPONSIBILITY_KIND_LABEL[responsibility.kind]} · aucun effet sur les permissions
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="pilot-sources" aria-labelledby="pilot-sources-title">
            <div className="pilot-section-title">
              <h3 id="pilot-sources-title">Sources disponibles</h3>
              <span>{visibleSources.length}</span>
            </div>
            {visibleSources.length > 0 ? (
              <ul>
                {visibleSources.slice(0, 4).map((source) => (
                  <li key={source.intake_id}>
                    <span>{source.label}</span>
                    <small>{SOURCE_ROLE_LABEL[source.source_role]}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Aucune source visible pour le moment.</p>
            )}
          </section>
        </aside>

        <div className="pilot-workspace__conversation">
          <div className="pilot-conversation__header">
            <div>
              <MessageCircle aria-hidden="true" size={20} />
              <div>
                <h3>Parler avec {activePersonaName ?? copy.shortName}</h3>
                <p>{wsLabel(wsState)}</p>
              </div>
            </div>
            <span className={`ws-badge ws-badge--${wsState}`}>{wsLabel(wsState)}</span>
          </div>

          <div className="pilot-starters" aria-label="Suggestions pour commencer">
            <p>Tu peux commencer par…</p>
            <div>
              {copy.prompts.map((prompt) => (
                <button className="pilot-starter" key={prompt} onClick={() => onPreparePrompt(prompt)} type="button">
                  <span>{prompt}</span>
                  <ArrowRight aria-hidden="true" size={15} />
                </button>
              ))}
            </div>
          </div>

          <ChatDock
            activePersonaId={activePersonaId}
            activePersonaName={activePersonaName ?? copy.shortName}
            chatInput={chatInput}
            conversationTurns={conversationTurns}
            inputRef={inputRef}
            onChatInputChange={onChatInputChange}
            onChatSubmit={onChatSubmit}
            personaState={personaState}
            roomInstanceId={roomInstanceId}
            wsState={wsState}
          />

          {journeyState === 'loading' ? (
            <p className="pilot-workspace__sync">Mise à jour du contexte…</p>
          ) : null}
          {journeyState === 'error' ? (
            <p className="pilot-workspace__sync pilot-workspace__sync--error">
              Le chat reste disponible, mais l’état détaillé du pilote n’a pas pu être chargé.
            </p>
          ) : null}

          {questions.length > 0 ? (
            <section className="pilot-questions" aria-labelledby="pilot-questions-title">
              <h3 id="pilot-questions-title">À éclaircir</h3>
              <ul>
                {questions.slice(0, 3).map((question) => <li key={question}>{question}</li>)}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <footer className="pilot-workspace__guardrail">
        <ShieldCheck aria-hidden="true" size={16} />
        <div>
          <span>
            Ici, MasterFlow guide et prépare. Il ne valide pas une étape professeur et ne produit pas le livrable final à ta place.
          </span>
          {journeyDetail?.excluded_capabilities.length ? (
            <small>
              Hors V1 · {journeyDetail.excluded_capabilities.map(
                (capability) => EXCLUDED_CAPABILITY_LABEL[capability] ?? capability,
              ).join(' · ')}
            </small>
          ) : null}
        </div>
      </footer>
    </section>
  );
}
