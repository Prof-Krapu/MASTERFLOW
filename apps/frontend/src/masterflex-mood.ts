export type PersonaMoodId = 'fear' | 'disgust' | 'sad' | 'neutral' | 'confident' | 'joy';

export type PersonaMoodBand = {
  id: PersonaMoodId;
  min: number;
  max: number;
  label: string;
  color: string;
};

export const personaMoodBands: PersonaMoodBand[] = [
  {id: 'fear', min: 0, max: 9, label: 'Peur', color: '#d83e34'},
  {id: 'disgust', min: 10, max: 24, label: 'Dégoût', color: '#c94b32'},
  {id: 'sad', min: 25, max: 44, label: 'Tristesse', color: '#d9823f'},
  {id: 'neutral', min: 45, max: 64, label: 'Concentration', color: '#8b62c9'},
  {id: 'confident', min: 65, max: 84, label: 'Confiance', color: '#4b9eea'},
  {id: 'joy', min: 85, max: 100, label: 'Joie', color: '#3979e8'},
];

export const resolvePersonaMood = (masteryValue: number): PersonaMoodBand => {
  const boundedValue = Math.max(0, Math.min(100, masteryValue));
  return personaMoodBands.find((state) => boundedValue >= state.min && boundedValue <= state.max) ?? personaMoodBands[3]!;
};
