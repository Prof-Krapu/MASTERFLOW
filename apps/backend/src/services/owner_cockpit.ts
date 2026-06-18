import type {
  Job,
  OwnerCockpitStatus,
  ValidationInboxItem,
} from '@masterflow/shared';

import {env} from '../lib/env.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {listJobs} from './jobs.ts';
import {listValidationInboxItems} from './validation_inbox.ts';

function countJobs(jobs: Job[], statuses: Job['status'][]): number {
  return jobs.filter((job) => statuses.includes(job.status)).length;
}

function chooseNextSafeAction(
  validations: ValidationInboxItem[],
  jobs: Job[],
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
  const highOrCritical = validations.filter(
    (item) => item.risk_level === 'high' || item.risk_level === 'critical',
  ).length;
  const failedJobs = countJobs(jobs, ['failed']);
  const releaseReported = env.releaseSha !== null;

  const alerts: OwnerCockpitStatus['alerts'] = [
    {
      type: 'canon_sync_manual',
      severity: 'info',
      message: "L'alignement canon ↔ GitHub reste un contrôle manuel documenté.",
      requires_validation: false,
    },
    {
      type: 'process_activation_missing',
      severity: 'info',
      message: "Le routeur général intention → processus n'est pas encore implémenté.",
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
    capabilities: [
      {id: 'shared_validation_inbox', status: 'partial', note: 'Actions et feedback_draft D06.'},
      {id: 'd05_guided_runtime', status: 'partial', note: 'Backend complet, Teaching encore en lecture.'},
      {id: 'd12_owner_cockpit', status: 'partial', note: 'Agrégat runtime disponible, sans lecture Drive live.'},
      {id: 'process_activation', status: 'absent', note: 'Pas de routeur général intention → processus.'},
      {id: 'd08_generation', status: 'locked', note: 'Provider et génération non exposés.'},
    ],
    alerts,
    next_safe_action: chooseNextSafeAction(validations, jobs),
    known_limits: [
      'Pas de lecture automatique du Drive canon.',
      'Pas de requête GitHub depuis le runtime.',
      "Pas d'auto-fix, auto-merge, auto-retry ou auto-validation.",
      "Pas d'envoi étudiant ni de publication externe.",
    ],
  };
}
