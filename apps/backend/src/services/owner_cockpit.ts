import type {
  Job,
  OwnerCockpitStatus,
  ValidationInboxItem,
} from '@masterflow/shared';

import {env} from '../lib/env.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listActionLifecycleForCockpit} from '../engines/action_engine.ts';
import {listD12MissedTriggerFindings} from './d12_findings.ts';
import {listJobs} from './jobs.ts';
import {listValidationInboxItems} from './validation_inbox.ts';

function countJobs(jobs: Job[], statuses: Job['status'][]): number {
  return jobs.filter((job) => statuses.includes(job.status)).length;
}

function chooseNextSafeAction(
  validations: ValidationInboxItem[],
  jobs: Job[],
  staleActions: number,
  openFindings: number,
): OwnerCockpitStatus['next_safe_action'] {
  const critical = validations.find((item) => item.risk_level === 'critical');
  if (critical) {
    return {
      label: `Traiter la validation critique : ${critical.title}`,
      reason: 'Une décision humaine critique est ouverte et bloque toute suite sensible.',
      source_ref: `validation_inbox:${critical.item_id}`,
      risk: 'high',
      requires_validation: true,
      forbidden_followups: ['auto_approve', 'auto_execute'],
    };
  }

  const high = validations.find((item) => item.risk_level === 'high');
  if (high) {
    return {
      label: `Relire la validation à risque élevé : ${high.title}`,
      reason: 'La Validation Inbox contient une sortie sensible encore non décidée.',
      source_ref: `validation_inbox:${high.item_id}`,
      risk: 'medium',
      requires_validation: true,
      forbidden_followups: ['auto_approve', 'external_send'],
    };
  }

  const failed = jobs.find((job) => job.status === 'failed');
  if (failed) {
    return {
      label: `Diagnostiquer le job échoué ${failed.type}`,
      reason: 'Un échec runtime doit être compris avant retry ou nouvelle exécution.',
      source_ref: `job:${failed.job_id}`,
      risk: 'medium',
      requires_validation: false,
      forbidden_followups: ['auto_retry'],
    };
  }

  const review = jobs.find((job) => job.status === 'needs_review');
  if (review) {
    return {
      label: `Faire la revue humaine du job ${review.type}`,
      reason: 'Le résultat est candidat et ne doit pas être importé automatiquement.',
      source_ref: `job:${review.job_id}`,
      risk: 'medium',
      requires_validation: true,
      forbidden_followups: ['auto_import', 'external_send'],
    };
  }

  if (validations.length > 0) {
    return {
      label: 'Traiter les validations ouvertes',
      reason: 'Les décisions en attente passent avant toute nouvelle action sensible.',
      source_ref: 'validation_inbox',
      risk: 'low',
      requires_validation: true,
      forbidden_followups: ['auto_execute'],
    };
  }

  if (staleActions > 0) {
    return {
      label: 'Relire les actions obsolètes avant de continuer',
      reason: 'Une ou plusieurs actions ont été rendues stale ; elles doivent être abandonnées ou repassées en preflight.',
      source_ref: 'actions:stale',
      risk: 'low',
      requires_validation: false,
      forbidden_followups: ['auto_retry', 'execute_stale_action'],
    };
  }

  if (openFindings > 0) {
    return {
      label: 'Relire les findings D12 avant la prochaine automatisation',
      reason: 'Des ratés d’activation sont consignés ; ils doivent rester des observations tant qu’aucune décision owner ne les promeut.',
      source_ref: 'diagnostics:d12/findings',
      risk: 'low',
      requires_validation: false,
      forbidden_followups: ['auto_fix', 'auto_canon', 'auto_patch'],
    };
  }

  return {
    label: 'Vérifier le pont canon ↔ GitHub avant la prochaine tranche',
    reason: "Le runtime ne peut pas prouver seul l'alignement du Drive et de GitHub.",
    source_ref: 'MASTERFLOW_CANON_SYNC_MATRIX.md',
    risk: 'low',
    requires_validation: false,
    forbidden_followups: ['claim_canon_sync', 'claim_live_deployment'],
  };
}

/**
 * Agrège uniquement des signaux privés déjà lisibles par l'owner.
 *
 * Le runtime ne contacte ni GitHub ni le Drive. Sans SHA injecté au déploiement,
 * il dit explicitement que la version live n'est pas vérifiée.
 */
export function getOwnerCockpitStatus(actor: AuthUser): OwnerCockpitStatus {
  const validations = listValidationInboxItems(actor);
  const jobs = listJobs(actor);
  const actions = listActionLifecycleForCockpit(actor);
  const d12Findings = listD12MissedTriggerFindings();
  const highOrCritical = validations.filter(
    (item) => item.risk_level === 'high' || item.risk_level === 'critical',
  ).length;
  const failedJobs = countJobs(jobs, ['failed']);
  const staleActions = actions.filter((action) => action.status === 'stale').length;
  const openFindings = d12Findings.filter(
    (finding) => !['stale', 'archived'].includes(finding.status),
  ).length;
  const highOrCriticalFindings = d12Findings.filter(
    (finding) => finding.severity === 'high' || finding.severity === 'critical',
  ).length;
  const releaseReported = env.releaseSha !== null;

  const alerts: OwnerCockpitStatus['alerts'] = [
    {
      type: 'canon_sync_manual',
      severity: 'info',
      message: "L'alignement canon ↔ GitHub reste un contrôle manuel documenté.",
      requires_validation: false,
    },
    {
      type: 'process_activation_observation_only',
      severity: 'info',
      message: "Le diagnostic intention → processus est actif en lecture seule ; aucune exécution automatique n'est autorisée.",
      requires_validation: false,
    },
    {
      type: 'd08_generation_locked',
      severity: 'info',
      message: 'La génération D08 reste verrouillée avant storage, provenance et review.',
      requires_validation: true,
    },
    {
      type: 'external_send_locked',
      severity: 'info',
      message: "L'envoi étudiant et les publications externes restent verrouillés.",
      requires_validation: true,
    },
  ];

  if (!releaseReported) {
    alerts.unshift({
      type: 'deployment_unverified',
      severity: 'warning',
      message: "Le runtime n'expose aucun SHA de release : le déploiement live n'est pas vérifié.",
      requires_validation: false,
    });
  }
  if (validations.length > 0) {
    alerts.unshift({
      type: 'validation_inbox_pending',
      severity: highOrCritical > 0 ? 'critical' : 'warning',
      message: `${validations.length} validation(s) humaine(s) attendent une décision.`,
      requires_validation: true,
    });
  }
  if (failedJobs > 0) {
    alerts.unshift({
      type: 'runtime_job_failed',
      severity: 'warning',
      message: `${failedJobs} job(s) ont échoué ; aucun retry automatique n'est lancé.`,
      requires_validation: false,
    });
  }
  if (staleActions > 0) {
    alerts.unshift({
      type: 'stale_actions_present',
      severity: 'warning',
      message: `${staleActions} action(s) obsolète(s) doivent être abandonnées ou repassées en preflight.`,
      requires_validation: false,
    });
  }
  if (openFindings > 0) {
    alerts.unshift({
      type: 'd12_findings_present',
      severity: highOrCriticalFindings > 0 ? 'warning' : 'info',
      message: `${openFindings} finding(s) D12 observation-only attendent une décision owner.`,
      requires_validation: false,
    });
  }

  return {
    generated_at: Date.now(),
    runtime_truth: {
      source: 'runtime_database',
      release_sha: env.releaseSha,
      release_verification: releaseReported ? 'reported' : 'unverified',
      github_sync: releaseReported ? 'reported_by_release' : 'not_checked_runtime',
      canon_sync: 'manual_check_required',
      matrix_ref: 'MASTERFLOW_CANON_SYNC_MATRIX.md',
    },
    validations: {
      total: validations.length,
      high_or_critical: highOrCritical,
    },
    jobs: {
      active: countJobs(jobs, ['queued', 'running']),
      needs_review: countJobs(jobs, ['needs_review']),
      failed: failedJobs,
    },
    action_lifecycle: {
      pending_validation: actions.filter((action) => action.status === 'pending_validation').length,
      approved: actions.filter((action) => action.status === 'approved').length,
      stale: staleActions,
    },
    d12_findings: {
      total: d12Findings.length,
      open: openFindings,
      high_or_critical: highOrCriticalFindings,
    },
    capabilities: [
      {
        id: 'shared_validation_inbox',
        status: 'partial',
        note: 'Actions, objets D06 et findings D12 privées.',
      },
      {id: 'd05_guided_runtime', status: 'partial', note: 'Teaching permet session, réponses et fin ; participation élève séparée.'},
      {id: 'd12_owner_cockpit', status: 'partial', note: 'Agrégat runtime disponible, sans lecture Drive live.'},
      {id: 'process_activation', status: 'partial', note: 'Diagnostic observation-only, sans action, job, LLM ni écriture.'},
      {id: 'd08_generation', status: 'locked', note: 'Provider et génération non exposés.'},
    ],
    alerts,
    next_safe_action: chooseNextSafeAction(validations, jobs, staleActions, openFindings),
    known_limits: [
      'Pas de lecture automatique du Drive canon.',
      'Pas de requête GitHub depuis le runtime.',
      "Pas d'auto-fix, auto-merge, auto-retry ou auto-validation.",
      "Pas d'envoi étudiant ni de publication externe.",
    ],
  };
}
