import type {CSSProperties, ReactElement} from 'react';

import type {PrototypeProfile} from './prototype-profile-registry';

export type PersonaStageActorState =
  | 'neutral'
  | 'listening'
  | 'thinking'
  | 'positive'
  | 'negative'
  | 'doubt'
  | 'warning'
  | 'explaining';

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
    assetBrief: 'Prise de parole longue, posture pédagogique, énergie tunnel.',
    bubble: 'On passe en tunnel : je garde le fil, je développe l’idée proprement, et je te ramène au contexte quand c’est assez clair.',
    id: 'explaining',
    intent: 'Mode tunnel, explication longue ou accompagnement focalisé.',
    label: 'Explaining',
  },
];

export const getPersonaStageActorState = (state: PersonaStageActorState) =>
  personaStageActorStates.find((item) => item.id === state) ?? personaStageActorStates[0];

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
      <img alt="" className="persona-stage-actor__image" src={profile.canonAsset} />
    </figure>
  );
}
