import type {ReactElement} from 'react';

import type {Action, ActionStatus} from '@masterflow/shared';

type ActionAuditProps = {
  action: Action;
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

export function ActionAudit({action}: ActionAuditProps): ReactElement {
  const risk = action.preflight?.risk_level ?? action.risk_level ?? 'non renseigne';
  const warnings = action.preflight?.warnings ?? [];
  const resultAvailable = action.result && Object.keys(action.result).length > 0;

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
      {resultAvailable ? (
        <details className="audit-result">
          <summary>Resultat technique</summary>
          <pre>{JSON.stringify(action.result, null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
}
