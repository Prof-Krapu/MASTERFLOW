import type {PrototypeProfile} from './prototype-profile-registry';

export type TunnelParticipant = {
  avatarAsset: string;
  canonAsset: string;
  id: string;
  name: string;
  personaColor: string;
  role: string;
};

export type TunnelMessage = {
  id: string;
  kind: 'short' | 'long' | 'question' | 'system';
  participantId: string;
  text: string;
};

export type TunnelPrompt = {
  noLabel: string;
  question: string;
  source: string;
  yesLabel: string;
};

export type TunnelContextSummary = {
  currentObject: string;
  returnTarget: string;
  surface: string;
  whyTunnel: string;
};

export type TunnelFixture = {
  contextSummary: TunnelContextSummary;
  messages: TunnelMessage[];
  participants: TunnelParticipant[];
  prompt: TunnelPrompt;
};

export function buildPrototypeTunnelFixture(
  leadProfile: PrototypeProfile,
  secondaryProfile?: PrototypeProfile,
): TunnelFixture {
  const lead: TunnelParticipant = {
    avatarAsset: leadProfile.avatarAsset,
    canonAsset: leadProfile.canonAsset,
    id: leadProfile.id,
    name: leadProfile.name,
    personaColor: leadProfile.personaColor,
    role: 'Persona lead',
  };
  const participants = [lead];

  if (secondaryProfile) {
    participants.push({
      avatarAsset: secondaryProfile.avatarAsset,
      canonAsset: secondaryProfile.canonAsset,
      id: secondaryProfile.id,
      name: secondaryProfile.name,
      personaColor: secondaryProfile.personaColor,
      role: 'Intervenant',
    });
  }

  return {
    contextSummary: {
      currentObject: 'Point courant',
      returnTarget: 'Retour au cockpit',
      surface: 'MasterFlow',
      whyTunnel: 'Développer sans perdre le contexte.',
    },
    messages: [
      {
        id: 'system-context',
        kind: 'system',
        participantId: lead.id,
        text: 'Le cockpit reste figé derrière. On développe, puis on revient exactement au même endroit.',
      },
      {
        id: 'lead-open',
        kind: 'long',
        participantId: lead.id,
        text: `Je peux développer ce point sans transformer toute l’interface en salon de discussion. On garde le fil, je pose les nuances, et on revient proprement au contexte.`,
      },
      {
        id: 'user-question',
        kind: 'question',
        participantId: 'user',
        text: 'Donc c’est une parenthèse utile, pas une nouvelle page ?',
      },
      {
        id: 'lead-confirm',
        kind: 'short',
        participantId: lead.id,
        text: 'Exactement. Sur mobile, ça ressemble à une conversation. Sur desktop, ça reste un mode focus du cockpit.',
      },
      ...(secondaryProfile ? [{
        id: 'secondary-note',
        kind: 'short' as const,
        participantId: secondaryProfile.id,
        text: 'Je peux intervenir si le point touche mon domaine. Sinon je reste sagement sur le banc.',
      }] : []),
    ],
    participants,
    prompt: {
      noLabel: 'Non',
      question: 'Tu veux que je développe ?',
      source: lead.name,
      yesLabel: 'Oui',
    },
  };
}
