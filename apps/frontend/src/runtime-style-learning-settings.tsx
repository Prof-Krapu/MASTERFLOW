import {RotateCcw, ShieldCheck} from 'lucide-react';
import {useState} from 'react';
import type {ReactElement} from 'react';

import type {
  StyleLearningSnapshot,
  UpdateStyleLearningPreferencesRequest,
} from '@masterflow/shared';

export type RuntimeStyleLearningState = {
  snapshot: StyleLearningSnapshot | null;
  status: 'idle' | 'loading' | 'ready' | 'saving' | 'error';
  error: string | null;
};

type RuntimeStyleLearningSettingsProps = RuntimeStyleLearningState & {
  onReset?: () => void;
  onUpdate?: (input: UpdateStyleLearningPreferencesRequest) => void;
};

const READINESS_LABEL = {
  empty: 'Aucun marqueur',
  learning: 'Apprentissage en cours',
  ready: 'Aperçu prêt',
} as const;

const RHYTHM_LABEL = {
  short: 'phrases courtes',
  balanced: 'rythme équilibré',
  expansive: 'phrases développées',
} as const;

function StyleLearningSwitch({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  disabled: boolean;
  label: string;
  onChange: (next: boolean) => void;
}): ReactElement {
  return (
    <button
      aria-checked={checked}
      className="proto-setting-switch"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span><strong>{label}</strong><small>{description}</small></span>
      <i aria-hidden="true" />
    </button>
  );
}

export function RuntimeStyleLearningSettings({
  error,
  onReset,
  onUpdate,
  snapshot,
  status,
}: RuntimeStyleLearningSettingsProps): ReactElement {
  const [resetConfirmation, setResetConfirmation] = useState(false);
  const busy = status === 'loading' || status === 'saving';

  if (!snapshot) {
    return (
      <p className="proto-settings-note" role={status === 'error' ? 'alert' : 'status'}>
        {status === 'error'
          ? `Apprentissage de style indisponible${error ? ` : ${error}` : '.'}`
          : 'Chargement des préférences d’apprentissage de style…'}
      </p>
    );
  }

  const {preferences, preview} = snapshot;
  const stateLabel = preferences.learning_enabled ? 'Actif' : 'En pause';
  return (
    <div className="proto-style-learning">
      {!preferences.notice_seen ? (
        <section className="proto-style-learning__notice" role="note">
          <ShieldCheck aria-hidden="true" size={18} />
          <div>
            <strong>Ce que Persona apprend</strong>
            <p>
              MasterFlow analyse localement le rythme, quelques expressions récurrentes et les transitions.
              Les messages bruts ne sont pas conservés par ce réglage : seuls des marqueurs agrégés restent associés à ton compte.
            </p>
            <button disabled={busy || !onUpdate} onClick={() => onUpdate?.({notice_seen: true})} type="button">
              J’ai compris
            </button>
          </div>
        </section>
      ) : null}

      <section aria-label="État de l’apprentissage de style" className="proto-style-learning__state">
        <div><small>État</small><strong>{stateLabel}</strong></div>
        <div><small>Progression</small><strong>{READINESS_LABEL[preview.readiness]}</strong></div>
        <div><small>Échantillons</small><strong>{preview.sample_count}</strong></div>
        <div><small>Confiance</small><strong>{Math.round(preview.confidence * 100)} %</strong></div>
      </section>

      <StyleLearningSwitch
        checked={preferences.learning_enabled}
        description={preferences.learning_enabled
          ? 'Les nouveaux messages authentifiés peuvent enrichir tes marqueurs.'
          : 'Aucun nouveau message n’alimente les marqueurs tant que la pause est active.'}
        disabled={busy || !onUpdate}
        label={preferences.learning_enabled ? 'Apprentissage actif' : 'Apprentissage en pause'}
        onChange={(learning_enabled) => onUpdate?.({learning_enabled})}
      />
      <StyleLearningSwitch
        checked={preferences.collective_contribution_enabled}
        description="Autorise uniquement une agrégation de marqueurs dans les projets partagés, jamais l’utilisation de ton identité."
        disabled={busy || !onUpdate}
        label="Contribution au style collectif"
        onChange={(collective_contribution_enabled) => onUpdate?.({collective_contribution_enabled})}
      />

      <label className="proto-settings-field">
        <span>
          <strong>Intensité maximale</strong>
          <small>Limite la présence des marqueurs appris dans les réponses Persona.</small>
        </span>
        <select
          aria-label="Intensité maximale du style appris"
          disabled={busy || !onUpdate}
          onChange={(event) => onUpdate?.({overlay_intensity: Number(event.target.value)})}
          value={preferences.overlay_intensity}
        >
          <option value={0}>0 %</option>
          <option value={0.1}>10 %</option>
          <option value={0.2}>20 %</option>
          <option value={0.3}>30 %</option>
          <option value={0.4}>40 %</option>
        </select>
      </label>

      <section aria-label="Aperçu des marqueurs appris" className="proto-style-learning__preview">
        <header>
          <div><small>Aperçu</small><strong>{preview.rhythm ? RHYTHM_LABEL[preview.rhythm] : 'Rythme non déterminé'}</strong></div>
          {preview.last_updated_at ? <time dateTime={new Date(preview.last_updated_at).toISOString()}>Mis à jour le {new Date(preview.last_updated_at).toLocaleDateString('fr-FR')}</time> : null}
        </header>
        <div>
          <span>Expressions</span>
          {preview.recurring_expressions.length
            ? <ul>{preview.recurring_expressions.map((marker) => <li key={marker}>{marker}</li>)}</ul>
            : <p>Aucune expression récurrente retenue.</p>}
        </div>
        <div>
          <span>Transitions</span>
          {preview.transitions.length
            ? <ul>{preview.transitions.map((marker) => <li key={marker}>{marker}</li>)}</ul>
            : <p>Aucune transition récurrente retenue.</p>}
        </div>
      </section>

      {status === 'error' && error ? <p className="proto-settings-note" role="alert">{error}</p> : null}

      <section className="proto-style-learning__reset">
        <div>
          <strong>Réinitialiser les marqueurs</strong>
          <p>Efface les marqueurs dérivés de ton compte. Tes préférences de pause et de contribution restent inchangées.</p>
        </div>
        {resetConfirmation ? (
          <div role="group" aria-label="Confirmer la réinitialisation des marqueurs">
            <button disabled={busy} onClick={() => setResetConfirmation(false)} type="button">Annuler</button>
            <button className="is-danger" disabled={busy || !onReset} onClick={() => { setResetConfirmation(false); onReset?.(); }} type="button">Confirmer</button>
          </div>
        ) : (
          <button disabled={busy || !onReset} onClick={() => setResetConfirmation(true)} type="button">
            <RotateCcw aria-hidden="true" size={16} /> Réinitialiser
          </button>
        )}
      </section>
      <p aria-live="polite" className="proto-style-learning__activity">
        {status === 'saving' ? 'Enregistrement des préférences…' : ''}
      </p>
    </div>
  );
}
