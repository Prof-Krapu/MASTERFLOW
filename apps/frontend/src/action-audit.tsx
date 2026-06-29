import {useEffect, useState} from 'react';
import type {ReactElement} from 'react';

import type {Action, ActionContextComparison, ActionStatus} from '@masterflow/shared';

import {getActionContextComparison} from './api.ts';

type ActionAuditProps = {
  action: Action;
  canDecide?: boolean;
  decisionBusy?: boolean;
  onDecision?: (decision: 'approved' | 'rejected') => void;
  token: string;
};

type AuditStep = {
  id: string;
  label: string;
  state: 'done' | 'current' | 'pending' | 'skipped' | 'failed';
};

const STATUS_ORDER: ActionStatus[] = [
  'draft',
  'candidate',
  'preflight',
  'pending_validation',
  'approved',
  'executing',
  'completed',
];

function reached(actionStatus: ActionStatus, target: ActionStatus): boolean {
  return STATUS_ORDER.indexOf(actionStatus) >= STATUS_ORDER.indexOf(target);
}

function stepState(action: Action, target: ActionStatus): AuditStep['state'] {
  if (action.status === 'failed' || action.status === 'rejected') {
    if (target === 'completed') return 'failed';
  }
  if (action.status === target) return target === 'completed' ? 'done' : 'current';
  return reached(action.status, target) ? 'done' : 'pending';
}

function buildSteps(action: Action): AuditStep[] {
  const requiresValidation = action.preflight?.requires_validation ?? false;
  const steps: AuditStep[] = [
    {id: 'created', label: 'Creee', state: 'done'},
    {id: 'preflight', label: 'Preflight', state: stepState(action, 'preflight')},
    {
      id: 'validation',
      label: 'Validation',
      state: requiresValidation
        ? stepState(action, 'pending_validation')
        : 'skipped',
    },
    {id: 'execution', label: 'Execution', state: stepState(action, 'executing')},
    {id: 'result', label: 'Resultat', state: stepState(action, 'completed')},
  ];

  if (action.status === 'rejected') {
    return steps.map((step) => {
      if (step.id === 'validation') return {...step, state: 'failed'};
      if (step.id === 'execution' || step.id === 'result') return {...step, state: 'skipped'};
      return step;
    });
  }

  if (action.status === 'failed') {
    const failedAtPreflight = action.preflight?.permission_check === 'failed';
    return steps.map((step) => {
      if (failedAtPreflight && step.id === 'preflight') return {...step, state: 'failed'};
      if (failedAtPreflight && ['validation', 'execution', 'result'].includes(step.id)) {
        return {...step, state: 'skipped'};
      }
      if (!failedAtPreflight && (step.id === 'execution' || step.id === 'result')) {
        return {...step, state: 'failed'};
      }
      return step;
    });
  }

  return steps;
}

function formatTimestamp(value: number): string {
  const milliseconds = value < 1_000_000_000_000 ? value * 1000 : value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(milliseconds));
}

const CONTEXT_LABELS: Record<ActionContextComparison['comparison'], string> = {
  unchanged: 'Contexte inchangé',
  requires_review: 'Contexte à revoir',
  inconclusive: 'Contexte incomplet',
};

const NEXT_STEP_LABELS: Record<ActionContextComparison['recommended_next_step'], string> = {
  none: 'Aucune action supplémentaire.',
  re_preflight: 'Relire puis relancer un nouveau cycle de preflight si nécessaire.',
  owner_review: 'Vérification owner nécessaire avant toute suite.',
};

export function ActionAudit({
  action,
  canDecide = false,
  decisionBusy = false,
  onDecision,
  token,
}: ActionAuditProps): ReactElement {
  const risk = action.preflight?.risk_level ?? action.risk_level ?? 'non renseigne';
  const warnings = action.preflight?.warnings ?? [];
  const explanation = action.preflight?.explanation;
  const resultAvailable = action.result && Object.keys(action.result).length > 0;
  const [contextComparison, setContextComparison] = useState<ActionContextComparison | null>(null);

  useEffect(() => {
    let active = true;
    setContextComparison(null);
    void getActionContextComparison(action.id, token)
      .then((comparison) => {
        if (active) setContextComparison(comparison);
      })
      .catch(() => {
        if (active) setContextComparison(null);
      });
    return () => { active = false; };
  }, [action.id, token]);

  return (
    <section className="action-audit" aria-label="Trace de l'action">
      <ol className="audit-steps">
        {buildSteps(action).map((step) => (
          <li className={`audit-step audit-step--${step.state}`} key={step.id}>
            <span aria-hidden="true" />
            <small>{step.label}</small>
          </li>
        ))}
      </ol>

      <dl className="audit-details">
        <div>
          <dt>Risque</dt>
          <dd>{risk}</dd>
        </div>
        <div>
          <dt>Permission</dt>
          <dd>{action.preflight?.permission_check ?? 'non verifiee'}</dd>
        </div>
        <div>
          <dt>Validateur</dt>
          <dd>{action.validator_id ?? (action.preflight?.requires_validation ? 'en attente' : 'non requis')}</dd>
        </div>
        <div>
          <dt>Mis a jour</dt>
          <dd>{formatTimestamp(action.updated_at)}</dd>
        </div>
      </dl>

      {explanation ? (
        <section className="preflight-panel" aria-label="Préflight lisible">
          <header>
            <div>
              <small>Avant toute action</small>
              <h3>{explanation.proposed_change}</h3>
            </div>
            <span className={`preflight-risk preflight-risk--${risk}`}>Risque {risk}</span>
          </header>
          <div className="preflight-impact">
            <article>
              <small>Maintenant</small>
              <p>{explanation.effect_preview.before}</p>
            </article>
            <span aria-hidden="true">→</span>
            <article>
              <small>Après validation</small>
              <p>{explanation.effect_preview.after}</p>
            </article>
          </div>
          <div className="preflight-resources">
            <small>Éléments concernés</small>
            <ul>
              {explanation.affected_resources.map((resource) => <li key={resource}>{resource}</li>)}
            </ul>
          </div>
          {action.status === 'pending_validation' ? (
            <div className="preflight-decisions">
              {explanation.decision_options.map((option) => {
                const available = option.availability === 'available';
                const disabled = decisionBusy || !canDecide || !available;
                const label = option.id === 'approve'
                  ? 'Valider'
                  : option.id === 'modify'
                    ? 'Modifier'
                    : 'Rejeter';
                return (
                  <button
                    className={option.id === 'reject' ? 'secondary' : undefined}
                    disabled={disabled}
                    key={option.id}
                    onClick={() => {
                      if (option.id === 'approve') onDecision?.('approved');
                      if (option.id === 'reject') onDecision?.('rejected');
                    }}
                    title={option.reason ?? (!canDecide ? 'Rôle validateur requis.' : undefined)}
                    type="button"
                  >
                    {label}{!available ? ' · à venir' : ''}
                  </button>
                );
              })}
            </div>
          ) : null}
          {!canDecide && action.status === 'pending_validation' ? (
            <small className="preflight-validator-note">
              Décision réservée au rôle {action.preflight?.validator_role ?? 'teacher'}.
            </small>
          ) : null}
        </section>
      ) : null}

      {action.validation_note ? (
        <p className="audit-note">
          <strong>Note de validation</strong>
          <span>{action.validation_note}</span>
        </p>
      ) : null}
      {warnings.length > 0 ? (
        <p className="audit-note audit-note--warning">
          <strong>Avertissements</strong>
          <span>{warnings.join(' · ')}</span>
        </p>
      ) : null}
      {action.error ? (
        <p className="audit-note audit-note--error">
          <strong>Erreur backend</strong>
          <span>{action.error}</span>
        </p>
      ) : null}
      {contextComparison ? (
        <section className={`action-context-status action-context-status--${contextComparison.comparison}`}>
          <strong>{CONTEXT_LABELS[contextComparison.comparison]}</strong>
          <span>{NEXT_STEP_LABELS[contextComparison.recommended_next_step]}</span>
          {contextComparison.changed_refs.length > 0 ? (
            <small>Références modifiées : {contextComparison.changed_refs.join(' · ')}</small>
          ) : null}
          {contextComparison.missing_revision_refs.length > 0 ? (
            <small>Références à vérifier : {contextComparison.missing_revision_refs.join(' · ')}</small>
          ) : null}
        </section>
      ) : null}
      {resultAvailable ? (
        <details className="audit-result">
          <summary>Resultat technique</summary>
          <pre>{JSON.stringify(action.result, null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
}
