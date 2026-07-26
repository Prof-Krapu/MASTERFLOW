import type {CSSProperties, ReactElement} from 'react';

import masterflexDoubtLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/doubt-left.png';
import masterflexExplainingLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/explaining-left.png';
import masterflexFearLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/fear-left.png';
import masterflexListeningLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/listening-left.png';
import masterflexNegativeLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/negative-left.png';
import masterflexNeutralLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/neutral-left.png';
import masterflexPositiveLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/positive-left.png';
import masterflexThinkingLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/thinking-left.png';
import masterflexTrollLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/troll-left.png';
import masterflexWarningLeft from '../assets/masterflex-stage-actor/candidates/left-normalized/warning-left.png';
import masterflexDoubtRight from '../assets/masterflex-stage-actor/candidates/right-normalized/doubt-right.png';
import masterflexExplainingRight from '../assets/masterflex-stage-actor/candidates/right-normalized/explaining-right.png';
import masterflexFearRight from '../assets/masterflex-stage-actor/candidates/right-normalized/fear-right.png';
import masterflexListeningRight from '../assets/masterflex-stage-actor/candidates/right-normalized/listening-right.png';
import masterflexNegativeRight from '../assets/masterflex-stage-actor/candidates/right-normalized/negative-right.png';
import masterflexNeutralRight from '../assets/masterflex-stage-actor/candidates/right-normalized/neutral-right.png';
import masterflexPositiveRight from '../assets/masterflex-stage-actor/candidates/right-normalized/positive-right.png';
import masterflexThinkingRight from '../assets/masterflex-stage-actor/candidates/right-normalized/thinking-right.png';
import masterflexTrollRight from '../assets/masterflex-stage-actor/candidates/right-normalized/troll-right.png';
import masterflexWarningRight from '../assets/masterflex-stage-actor/candidates/right-normalized/warning-right.png';
import type {PrototypeProfile} from './prototype-profile-registry';

export type PersonaStageActorState =
  | 'neutral'
  | 'listening'
  | 'thinking'
  | 'positive'
  | 'negative'
  | 'doubt'
  | 'warning'
  | 'fear'
  | 'explaining'
  | 'troll';

export type PersonaStageActorDirection = 'left' | 'right';
export type PersonaStageActorScale = 'compact' | 'normal' | 'tunnel';

export interface PersonaStageActorStateDefinition {
  assetBrief: string;
  bubble: string;
  id: PersonaStageActorState;
  intent: string;
  label: string;
}

export const personaStageActorStates: PersonaStageActorStateDefinition[] = [
  {
    assetBrief: 'Posture calme, personnage disponible, aucun effet dramatique.',
    bubble: 'Je suis là.',
    id: 'neutral',
    intent: 'Repos / présence disponible.',
    label: 'Neutral',
  },
  {
    assetBrief: 'Attention orientée vers le user, léger mouvement d’écoute.',
    bubble: 'Je t’écoute.',
    id: 'listening',
    intent: 'Micro actif, dictée ou attente de parole.',
    label: 'Listening',
  },
  {
    assetBrief: 'Regard concentré, pose retenue, signe de réflexion sans loading cartoon.',
    bubble: 'Je mouline.',
    id: 'thinking',
    intent: 'Réflexion, recherche ou génération en cours.',
    label: 'Thinking',
  },
  {
    assetBrief: 'Validation courte, satisfaction contrôlée, jamais hystérique.',
    bubble: 'Ça tient.',
    id: 'positive',
    intent: 'Bonne piste, validation ou accord.',
    label: 'Positive',
  },
  {
    assetBrief: 'Refus doux, limite claire, pas humiliant.',
    bubble: 'Pas comme ça.',
    id: 'negative',
    intent: 'Mauvaise piste, non, refus ou correction.',
    label: 'Negative',
  },
  {
    assetBrief: 'Doute visible, sourcil/attitude interrogative, besoin de précision.',
    bubble: 'Hmm. Précise.',
    id: 'doubt',
    intent: 'Incertitude ou besoin de contexte.',
    label: 'Doubt',
  },
  {
    assetBrief: 'Alerte lisible, posture de garde, pas agressive.',
    bubble: 'Attention.',
    id: 'warning',
    intent: 'Action sensible, verrou, risque ou permission.',
    label: 'Warning',
  },
  {
    assetBrief: 'Angoisse cartoon lisible, livide, mais pas panique hors sujet.',
    bubble: 'Là, je serre le calepin.',
    id: 'fear',
    intent: 'Erreur critique, dérive forte ou situation qui sent le piège.',
    label: 'Fear',
  },
  {
    assetBrief: 'Prise de parole longue, posture pédagogique, énergie tunnel.',
    bubble: 'On passe en tunnel : je garde le fil, je développe l’idée proprement, et je te ramène au contexte quand c’est assez clair.',
    id: 'explaining',
    intent: 'Mode tunnel, explication longue ou accompagnement focalisé.',
    label: 'Explaining',
  },
  {
    assetBrief: 'Sourire cruel cartoon, vanne utile, charriage contrôlé.',
    bubble: 'Je savais que t’allais tenter ça.',
    id: 'troll',
    intent: 'Feedback piquant, private joke ou recadrage joueur.',
    label: 'Troll',
  },
];

export const getPersonaStageActorState = (state: PersonaStageActorState) =>
  personaStageActorStates.find((item) => item.id === state) ?? personaStageActorStates[0];

const masterflexStageActorAssets: Record<
  PersonaStageActorDirection,
  Record<PersonaStageActorState, string>
> = {
  left: {
    doubt: masterflexDoubtLeft,
    explaining: masterflexExplainingLeft,
    fear: masterflexFearLeft,
    listening: masterflexListeningLeft,
    negative: masterflexNegativeLeft,
    neutral: masterflexNeutralLeft,
    positive: masterflexPositiveLeft,
    thinking: masterflexThinkingLeft,
    troll: masterflexTrollLeft,
    warning: masterflexWarningLeft,
  },
  right: {
    doubt: masterflexDoubtRight,
    explaining: masterflexExplainingRight,
    fear: masterflexFearRight,
    listening: masterflexListeningRight,
    negative: masterflexNegativeRight,
    neutral: masterflexNeutralRight,
    positive: masterflexPositiveRight,
    thinking: masterflexThinkingRight,
    troll: masterflexTrollRight,
    warning: masterflexWarningRight,
  },
};

const getPersonaStageActorAsset = (
  profile: PrototypeProfile,
  direction: PersonaStageActorDirection,
  state: PersonaStageActorState,
) => {
  if (profile.id === 'masterflex') {
    return masterflexStageActorAssets[direction][state];
  }

  return profile.canonAsset;
};

interface PersonaStageActorProps {
  bubbleVisible: boolean;
  direction: PersonaStageActorDirection;
  profile: PrototypeProfile;
  scale: PersonaStageActorScale;
  state: PersonaStageActorState;
}

export function PersonaStageActor({
  bubbleVisible,
  direction,
  profile,
  scale,
  state,
}: PersonaStageActorProps): ReactElement {
  const stateDefinition = getPersonaStageActorState(state);
  const actorAsset = getPersonaStageActorAsset(profile, direction, state);

  return (
    <figure
      aria-label={`${profile.name} ${stateDefinition.label}`}
      className={`persona-stage-actor persona-stage-actor--${direction} persona-stage-actor--${scale} persona-stage-actor--state-${state}`}
      style={{
        '--actor-color': profile.personaColor,
        '--actor-support': profile.supportColor,
      } as CSSProperties}
    >
      {bubbleVisible ? (
        <figcaption className="persona-stage-actor__bubble">
          <strong>{stateDefinition.bubble}</strong>
        </figcaption>
      ) : null}
      <div className="persona-stage-actor__plate" aria-hidden="true" />
      <img alt="" className="persona-stage-actor__image" src={actorAsset} />
    </figure>
  );
}
