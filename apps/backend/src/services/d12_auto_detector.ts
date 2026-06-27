import {getDb, type WorkflowEventRow} from '../db/schema.ts';
import {createD12MissedTriggerFinding} from './d12_findings.ts';
import type {AuthUser} from '../middleware/auth.ts';

const DEFAULT_SCAN_WINDOW_MS = 30 * 60 * 1000;

const BLOCKING_EVENT_TYPES = new Set([
  'workflow_failed',
  'job_failed',
  'workflow_blocked',
]);

const EVENT_MAP: Record<string, {
  expectedProcess: string;
  missingPiece: string;
  userImpact: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}> = {
  workflow_failed: {
    expectedProcess: 'workflow_execution',
    missingPiece: 'automatic_recovery_or_escalation',
    userImpact: 'Un workflow a échoué sans déclencher de processus de rattrapage automatique.',
    severity: 'high',
  },
  job_failed: {
    expectedProcess: 'job_execution',
    missingPiece: 'automatic_job_retry_or_notification',
    userImpact: 'Un job a échoué sans escalade ni notification automatique.',
    severity: 'high',
  },
  workflow_blocked: {
    expectedProcess: 'workflow_progression',
    missingPiece: 'automatic_unblock_or_owner_alert',
    userImpact: 'Un workflow est bloqué et aucun processus de déblocage automatique n\'a été déclenché.',
    severity: 'medium',
  },
};

export interface ScanResult {
  scanned_events: number;
  findings_created: number;
  finding_ids: string[];
}

/**
 * Scanne les événements workflow récents pour détecter des ratés (échecs, blocages)
 * qui n'ont pas encore de finding D12 associée. Crée une finding `observation` pour
 * chaque nouvel événement détecté.
 *
 * Ferme la brèche `missing_runtime_piece: 'automatic_missed_trigger_detection'`
 * documentée dans process_activation.ts règle D12.
 */
export function scanForMissedTriggers(
  actor: AuthUser,
  windowMs: number = DEFAULT_SCAN_WINDOW_MS,
): ScanResult {
  const since = Date.now() - windowMs;

  const events = getDb()
    .prepare(
      `SELECT * FROM workflow_events
       WHERE event_type IN ('workflow_failed', 'job_failed', 'workflow_blocked')
       AND created_at > ?
       ORDER BY created_at DESC`,
    )
    .all(since) as WorkflowEventRow[];

  const findingIds: string[] = [];

  for (const event of events) {
    const sourceRef = `workflow_event:${event.id}`;
    const existing = getDb()
      .prepare('SELECT 1 FROM d12_missed_trigger_findings WHERE source_ref = ?')
      .get(sourceRef);
    if (existing) continue;

    const eventInfo = EVENT_MAP[event.event_type];
    if (!eventInfo) continue;

    const finding = createD12MissedTriggerFinding(actor, {
      source_ref: sourceRef,
      expected_process: eventInfo.expectedProcess,
      actual_runtime_response: `${event.event_type} sur ${event.workflow_type}/${event.capability_id}`,
      missing_runtime_piece: eventInfo.missingPiece,
      user_impact: eventInfo.userImpact,
      domain_refs: ['D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT'],
      output_family_refs: [event.workflow_type],
      evidence_refs: [`workflow:${event.workflow_id}`],
      blocked_actions: ['auto_patch', 'auto_canon'],
      recommended_queue_task: {
        task: 'Analyser la cause racine du blocage/échec et décider d\'une action correctrice.',
        impact: 'Événement bloquant non résolu automatiquement.',
        risk: 'Peut révéler un pattern récurrent nécessitant une règle utilisateur.',
        source_of_truth: event.capability_id,
        truth_status: 'unknown',
        validation_required: true,
        suggested_owner: 'owner',
        forbidden_actions: ['auto_patch', 'auto_canon'],
      },
      severity: eventInfo.severity,
    });

    findingIds.push(finding.finding_id);
  }

  return {
    scanned_events: events.length,
    findings_created: findingIds.length,
    finding_ids: findingIds,
  };
}
