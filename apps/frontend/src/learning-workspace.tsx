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

const GUIDANCE_LABELS: Record<PersonalLearningProfile['guidance_mode'], string> = {
  auto: 'adapté au besoin',
  discovery: 'découverte',
  structured: 'structuré',
  challenge: 'mise au défi',
  mentor: 'mentorat',
};

type Props = {
  onRequestHelp: (draft: string) => void;
  resources: Resource[];
  token: string;
  userId: string;
};

export function LearningWorkspace({onRequestHelp, resources, token, userId}: Props): ReactElement {
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
          <h2>Learn · aide personnelle</h2>
          <p className="muted compact">
            Comprendre, pratiquer et avancer pour toi. La gestion des classes et des sujets reste dans Teaching.
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
              <dd>{GUIDANCE_LABELS[profile.guidance_mode]}</dd>
            </div>
          </dl>
        </section>
      ) : null}

      <section className="learning-workspace__start" aria-labelledby="learning-start-title">
        <div>
          <p className="eyebrow">Ton besoin maintenant</p>
          <h3 id="learning-start-title">Qu’est-ce que tu veux comprendre ou pratiquer ?</h3>
          <p>Choisis un objectif : MasterFlow prépare une demande dans le chat, mais ne l’envoie jamais sans toi.</p>
        </div>
        <PedagogicalAssistancePanel
          hasValidatedResources={resources.length > 0}
          mode="learn"
          onRequestHelp={onRequestHelp}
          token={token}
        />
      </section>

      <section className="learning-resources" aria-labelledby="learning-resources-title">
        <div className="learning-resources__heading">
          <div>
            <p className="eyebrow">Sources fiables</p>
            <h3 id="learning-resources-title">Pour aller plus loin</h3>
          </div>
          <span>{resources.length} disponible(s)</span>
        </div>
        {resources.length > 0 ? (
          <ul>
            {resources.slice(0, 3).map((resource) => (
              <li key={resource.id}>
                <strong>{resource.title}</strong>
                <span>{resource.subjects?.join(' · ') || resource.source}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted compact">Aucune source validée n’est disponible dans ce contexte.</p>
        )}
      </section>

      <aside className="learning-progression-pending">
        <strong>Progression personnelle</strong>
        <span>
          Elle n’est pas encore affichée : sa source unique doit être arbitrée avant de devenir une vérité visible.
        </span>
      </aside>

      <p className="learning-workspace__guardrail">
        Les ressources non vérifiées restent candidates. Aucune vidéo ne démarre seule et aucun
        livrable final n’est produit automatiquement.
      </p>
    </article>
  );
}
