import {ArrowLeft, MessageCircle, MicOff, ShieldCheck} from 'lucide-react';
import {useEffect} from 'react';
import type {ReactElement} from 'react';

import type {LivingCompanion} from '@masterflow/shared';

type ClassProjectionProps = {
  companion: LivingCompanion;
  contextLabel: string;
  onClose: () => void;
  onReturnToGuide: () => void;
};

const TYPE_LABEL: Record<LivingCompanion['companion_type'], string> = {
  cdc_robot: 'Robot CDC IA',
  moth: 'MOTH',
  project_monster: 'Monstre-idée',
};

export function ClassProjection({
  companion,
  contextLabel,
  onClose,
  onReturnToGuide,
}: ClassProjectionProps): ReactElement {
  const completion = Math.round(companion.progress.completion_ratio * 100);
  const initials = companion.display_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'MF';

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <section
      aria-label={`Projection de ${companion.display_name}`}
      aria-modal="true"
      className={`class-projection class-projection--${companion.readiness}`}
      role="dialog"
    >
      <header className="class-projection__header">
        <div>
          <p className="eyebrow">Projection classe · {contextLabel}</p>
          <span>{TYPE_LABEL[companion.companion_type]} · {companion.readiness}</span>
        </div>
        <button className="secondary" onClick={onClose} type="button">
          <ArrowLeft aria-hidden="true" size={18} />
          Retour au cockpit
        </button>
      </header>

      <div className="class-projection__stage">
        <div className="class-projection__character" aria-label="Visuel provisoire du compagnon">
          <span>{initials}</span>
          <small>Visuel provisoire</small>
        </div>

        <div className="class-projection__dialogue">
          <p className="eyebrow">{companion.display_name}</p>
          <h1>{companion.role_summary}</h1>
          <blockquote>{companion.dialogue_bubble}</blockquote>
          {companion.current_prompt ? (
            <div className="class-projection__prompt">
              <MessageCircle aria-hidden="true" size={20} />
              <strong>{companion.current_prompt}</strong>
            </div>
          ) : null}
        </div>
      </div>

      <div className="class-projection__progress">
        <div>
          <strong>Progression de la session</strong>
          <span>{completion} %</span>
        </div>
        <progress max={100} value={completion}>{completion} %</progress>
        <small>
          {companion.progress.completed_fields.length} étape(s) complétée(s) ·{' '}
          {companion.progress.missing_fields.length} restante(s)
        </small>
      </div>

      <div className="class-projection__controls">
        <div className="class-projection__voice-state">
          <MicOff aria-hidden="true" size={19} />
          <div>
            <strong>Micro non activé</strong>
            <span>Le mode texte réel reste disponible dans le sujet guidé.</span>
          </div>
        </div>
        <button
          disabled={!companion.available_intents.includes('answer_current_question')}
          onClick={onReturnToGuide}
          type="button"
        >
          Répondre dans le sujet guidé
        </button>
      </div>

      <footer className="class-projection__footer">
        <ShieldCheck aria-hidden="true" size={18} />
        <span>
          Guide uniquement · contexte assigné · aucune décision professeur, génération ou publication automatique.
        </span>
      </footer>
    </section>
  );
}
