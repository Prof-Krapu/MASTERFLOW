export type ExpressiveVoiceDisclosure = {
  profile_used: boolean;
  label: string;
  source?: 'represented_user' | 'project_collective' | 'manual_profile';
  intensity?: number;
  confidence?: number;
};

const SOURCE_LABELS: Record<NonNullable<ExpressiveVoiceDisclosure['source']>, string> = {
  represented_user: 'personne représentée',
  project_collective: 'collectif du projet',
  manual_profile: 'profil manuel',
};

function percentage(value: number): string {
  return `${Math.round(value * 100)} %`;
}

export function expressiveVoiceDisclosureText(
  disclosure?: ExpressiveVoiceDisclosure | null,
): string | null {
  if (!disclosure) return null;
  if (!disclosure.profile_used) return 'Style expressif · aucun profil appliqué';

  const parts = [
    `Style expressif · ${disclosure.label}`,
    disclosure.source ? `source : ${SOURCE_LABELS[disclosure.source]}` : null,
    disclosure.intensity === undefined ? null : `intensité : ${percentage(disclosure.intensity)}`,
    disclosure.confidence === undefined ? null : `confiance : ${percentage(disclosure.confidence)}`,
  ];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}
