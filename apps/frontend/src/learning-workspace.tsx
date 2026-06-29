import {useEffect, useState} from 'react';
import type {ReactElement} from 'react';

import type {PersonalLearningProfile, Resource} from '@masterflow/shared';

import {getLearningProfile} from './api.ts';
import {PedagogicalAssistancePanel} from './pedagogical-assistance-panel.tsx';

const HELP_STYLE_LABELS: Record<NonNullable<PersonalLearningProfile['help_style']>, string> = {
  direct: 'directe',
  guided: 'guidée',
  explorative: 'exploratoire',
  visual: 'visuelle',
  step_by_step: 'pas à pas',
};

const HELP_FORMAT_LABELS: Record<NonNullable<PersonalLearningProfile['help_format']>, string> = {
  text: 'texte',
  bullet: 'liste courte',
  example: 'exemples',
  analogy: 'analogies',
  exercise: 'exercices',
  visual: 'visuel',
};

const DENSITY_LABELS: Record<NonNullable<PersonalLearningProfile['help_density']>, string> = {
  concise: 'concis',
  balanced: 'équilibré',
  detailed: 'détaillé',
};

type Props = {
  resources: Resource[];
  token: string;
  userId: string;
};

export function LearningWorkspace({resources, token, userId}: Props): ReactElement {
  const [profile, setProfile] = useState<PersonalLearningProfile | null>(null);
  const [status, setStatus] = useState('Chargement du profil d’aide.');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getLearningProfile(userId, token)
      .then((nextProfile) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setStatus('');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : '';
        setProfile(null);
        setStatus(message === 'profile_not_found'
          ? 'Aucun profil validé : MasterFlow reste neutre et te laisse choisir le type d’aide.'
          : 'Le profil d’aide est momentanément indisponible.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, userId]);

  const validatedProfile =
    profile?.profile_status === 'user_validated' ||
    profile?.profile_status === 'teacher_validated';

  return (
    <article className="panel panel--wide learning-workspace">
      <div className="panel-header">
        <div>
          <h2>Learning · parcours guidé</h2>
          <p className="muted compact">
            Comprendre, pratiquer et avancer depuis des sources fiables, sans faire le travail à ta place.
          </p>
        </div>
        <span className="counter">{resources.length} source(s)</span>
      </div>

      {loading ? <p className="muted compact">Chargement du profil d’aide…</p> : null}
      {status ? <p className="learning-workspace__status">{status}</p> : null}

      {profile ? (
        <section className="learning-profile-card" aria-label="Profil d’aide Learning">
          <div>
            <strong>{validatedProfile ? 'Profil d’aide actif' : 'Préférences encore en brouillon'}</strong>
            <span>{validatedProfile ? 'validé' : 'non appliqué comme vérité'}</span>
          </div>
          <dl>
            <div>
              <dt>Approche</dt>
              <dd>{profile.help_style ? HELP_STYLE_LABELS[profile.help_style] : 'à choisir'}</dd>
            </div>
            <div>
              <dt>Format</dt>
              <dd>{profile.help_format ? HELP_FORMAT_LABELS[profile.help_format] : 'à choisir'}</dd>
            </div>
            <div>
              <dt>Densité</dt>
              <dd>{profile.help_density ? DENSITY_LABELS[profile.help_density] : 'à choisir'}</dd>
            </div>
            <div>
              <dt>Guidage</dt>
              <dd>{profile.guidance_mode}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <PedagogicalAssistancePanel
        hasValidatedResources={resources.length > 0}
        mode="learn"
        token={token}
      />

      <p className="learning-workspace__guardrail">
        Les ressources non vérifiées restent candidates. Aucune vidéo ne démarre seule et aucun
        livrable final n’est produit automatiquement.
      </p>
    </article>
  );
}
