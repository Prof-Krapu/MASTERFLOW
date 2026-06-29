import {Router, type Request, type Response} from 'express';

import {getDb} from '../db/schema.ts';
import {requireRole, requireUser} from '../middleware/auth.ts';
import {
  getWorkflowDiagnostics,
  getWorkflowTrace,
} from '../services/workflow_observability.ts';
import {getInventoryDiagnostics} from '../services/inventory_diagnostics.ts';
import {getOwnerCockpitStatus} from '../services/owner_cockpit.ts';
import {getTrustFabricSnapshot} from '../services/trust_fabric.ts';
import {diagnoseProcessActivation} from '../services/process_activation.ts';
import {
  CreateD12MissedTriggerFindingSchema,
  CreateD12ReleaseReceiptSchema,
  CreateD12BackupReceiptSchema,
  CreateD12IncidentRecordSchema,
  D12FindingDecisionSchema,
  D12FindingStatusSchema,
  DecideValidationInboxItemRequestSchema,
  ProcessActivationRequestSchema,
  UsageLearningReviewStatusSchema,
} from '@masterflow/shared';
import {
  createD12MissedTriggerFinding,
  decideD12MissedTriggerFinding,
  listD12MissedTriggerFindings,
} from '../services/d12_findings.ts';
import {createD12ReleaseReceipt, listD12ReleaseReceipts} from '../services/d12_release_receipts.ts';
import {createD12BackupReceipt, listD12BackupReceipts} from '../services/d12_backup_receipts.ts';
import {createD12IncidentRecord,listD12IncidentRecords} from '../services/d12_incident_records.ts';
import {
  decideUsageLearningCandidate,
  listUsageLearningCandidates,
} from '../services/usage_harvester.ts';
import {scanForMissedTriggers} from '../services/d12_auto_detector.ts';

/**
 * Router diagnostic — surfaces de **lecture privées**, gated **admin/godmode**.
 *
 * Invariants produit :
 *  - diagnostic privé par défaut, **jamais teacher/student** (403) ;
 *  - lecture **sans effet** sur le runtime user (aucune écriture, aucune action) ;
 *  - cohérent Q6 « godmode étendu » (surface owner_ops/diagnostic).
 *
 * `requireRole('admin')` couvre admin + godmode (ROLE_RANK : admin=2, godmode=3).
 */

// Colonne/expression de regroupement — whitelist stricte (jamais d'entrée libre en SQL).
const GROUP_COLUMNS = {
  model: 'model',
  task: 'task',
  user: 'user_id',
  day: "strftime('%Y-%m-%d', ts / 1000, 'unixepoch')",
} as const;
type GroupBy = keyof typeof GROUP_COLUMNS;

interface UsageRow {
  group: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost_eur: number;
  events: number;
}

/** Parse une borne epoch optionnelle sans accepter de valeur ambiguë ou négative. */
function parseTimestamp(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function createDiagnosticsRouter(): Router {
  const router = Router();
  // Gate scopé à /diagnostics : ce routeur est monté à la racine de l'API ; un router.use
  // SANS path bloquerait tout routeur monté après lui (projects/jobs/…) pour les non-admins.
  router.use('/diagnostics', requireUser, requireRole('admin'));

  // GET /diagnostics/token-usage?from&to&group_by=model|task|user|day
  router.get('/diagnostics/token-usage', (req: Request, res: Response): void => {
    const groupByRaw = String(req.query.group_by ?? 'model');
    const groupBy: GroupBy = groupByRaw in GROUP_COLUMNS ? (groupByRaw as GroupBy) : 'model';
    const col = GROUP_COLUMNS[groupBy];

    const now = Date.now();
    const fromTs = parseTimestamp(req.query.from, 0);
    const toTs = parseTimestamp(req.query.to, now);
    if (fromTs === null || toTs === null || fromTs > toTs) {
      res.status(400).json({error: 'invalid_time_range'});
      return;
    }

    const rows = getDb()
      .prepare(
        `SELECT ${col} AS "group",
                COALESCE(SUM(prompt_tokens), 0)     AS prompt_tokens,
                COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
                COALESCE(SUM(cost_eur), 0)          AS cost_eur,
                COUNT(*)                            AS events
           FROM token_events
          WHERE ts BETWEEN ? AND ?
          GROUP BY ${col}
          ORDER BY prompt_tokens DESC`,
      )
      .all(fromTs, toTs) as UsageRow[];

    const normalized = rows.map((r) => ({
      group: r.group ?? '(inconnu)',
      prompt_tokens: r.prompt_tokens,
      completion_tokens: r.completion_tokens,
      cost_eur: r.cost_eur,
      events: r.events,
    }));

    const totals = normalized.reduce(
      (acc, r) => ({
        prompt_tokens: acc.prompt_tokens + r.prompt_tokens,
        completion_tokens: acc.completion_tokens + r.completion_tokens,
        cost_eur: acc.cost_eur + r.cost_eur,
        events: acc.events + r.events,
      }),
      {prompt_tokens: 0, completion_tokens: 0, cost_eur: 0, events: 0},
    );

    res.json({group_by: groupBy, from: fromTs, to: toTs, totals, rows: normalized});
  });

  // GET /diagnostics/workflows?from&to&capability_id&workflow_type
  router.get('/diagnostics/workflows', (req: Request, res: Response): void => {
    const now = Date.now();
    const fromTs = parseTimestamp(req.query.from, 0);
    const toTs = parseTimestamp(req.query.to, now);
    if (fromTs === null || toTs === null || fromTs > toTs) {
      res.status(400).json({error: 'invalid_time_range'});
      return;
    }

    const capabilityId = parseOptionalFilter(req.query.capability_id);
    const workflowType = parseOptionalFilter(req.query.workflow_type);
    if (capabilityId === null || workflowType === null) {
      res.status(400).json({error: 'invalid_workflow_filter'});
      return;
    }

    res.json(
      getWorkflowDiagnostics({
        from: fromTs,
        to: toTs,
        capabilityId,
        workflowType,
      }),
    );
  });

  // GET /diagnostics/workflows/:id
  router.get('/diagnostics/workflows/:id', (req: Request, res: Response): void => {
    try {
      res.json({
        workflow_id: req.params.id,
        events: getWorkflowTrace(req.params.id ?? ''),
      });
    } catch {
      res.status(404).json({error: 'workflow_not_found'});
    }
  });

  // GET /diagnostics/inventory — agrégats owner ops sans données métier privées.
  router.get('/diagnostics/inventory', (_req: Request, res: Response): void => {
    res.json(getInventoryDiagnostics());
  });

  // GET /diagnostics/owner-cockpit — décisions lisibles, sans mutation ni lecture Drive/GitHub.
  router.get('/diagnostics/owner-cockpit', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    res.json(getOwnerCockpitStatus(user));
  });

  // GET /diagnostics/trust — quatre dimensions séparées, lecture seule admin/godmode.
  router.get('/diagnostics/trust', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    res.json(getTrustFabricSnapshot(user));
  });

  router.post('/diagnostics/process-activation', (req: Request, res: Response): void => {
    const parsed = ProcessActivationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    res.json(diagnoseProcessActivation(parsed.data));
  });

  router.get('/diagnostics/d12/findings', (req: Request, res: Response): void => {
    const status = req.query.status === undefined
      ? undefined
      : D12FindingStatusSchema.safeParse(req.query.status);
    if (status !== undefined && !status.success) {
      res.status(400).json({error: 'invalid_status'});
      return;
    }
    res.json(listD12MissedTriggerFindings({status: status?.data}));
  });

  router.post('/diagnostics/d12/findings', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    const parsed = CreateD12MissedTriggerFindingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    res.status(201).json(createD12MissedTriggerFinding(user, parsed.data));
  });

  router.post('/diagnostics/d12/findings/:id/decision', (req: Request, res: Response): void => {
    const user = req.user;
    const id = req.params.id;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    if (!id) {
      res.status(404).json({error: 'finding_not_found'});
      return;
    }
    const parsed = D12FindingDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(decideD12MissedTriggerFinding(user, id, parsed.data));
    } catch {
      res.status(404).json({error: 'finding_not_found'});
    }
  });

  router.get('/diagnostics/d12/usage-learning', (req: Request, res: Response): void => {
    const reviewStatus = req.query.review_status === undefined
      ? undefined
      : UsageLearningReviewStatusSchema.safeParse(req.query.review_status);
    if (reviewStatus !== undefined && !reviewStatus.success) {
      res.status(400).json({error: 'invalid_review_status'});
      return;
    }
    res.json(listUsageLearningCandidates({reviewStatus: reviewStatus?.data}));
  });

  router.post('/diagnostics/d12/usage-learning/:id/decision', (req: Request, res: Response): void => {
    const user = req.user;
    const id = req.params.id;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    if (!id) {
      res.status(404).json({error: 'candidate_not_found'});
      return;
    }
    const parsed = DecideValidationInboxItemRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
      return;
    }
    try {
      res.json(decideUsageLearningCandidate(user, id, parsed.data));
    } catch {
      res.status(404).json({error: 'candidate_not_found'});
    }
  });

  router.post('/diagnostics/d12/scan', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({error: 'unauthorized'});
      return;
    }
    const windowMs = typeof req.body?.window_minutes === 'number' && req.body.window_minutes > 0
      ? req.body.window_minutes * 60 * 1000
      : undefined;
    res.json(scanForMissedTriggers(user, windowMs));
  });

  router.get('/diagnostics/d12/release-receipts', (_req: Request, res: Response): void => {
    res.json(listD12ReleaseReceipts());
  });

  router.post('/diagnostics/d12/release-receipts', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) return void res.status(401).json({error: 'unauthorized'});
    const parsed = CreateD12ReleaseReceiptSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
    res.status(201).json(createD12ReleaseReceipt(user, parsed.data));
  });

  router.get('/diagnostics/d12/backup-receipts', (_req: Request, res: Response): void => {
    res.json(listD12BackupReceipts());
  });
  router.post('/diagnostics/d12/backup-receipts', (req: Request, res: Response): void => {
    const user = req.user;
    if (!user) return void res.status(401).json({error: 'unauthorized'});
    const parsed = CreateD12BackupReceiptSchema.safeParse(req.body);
    if (!parsed.success) return void res.status(400).json({error: 'invalid_body', detail: parsed.error.flatten()});
    res.status(201).json(createD12BackupReceipt(user, parsed.data));
  });
  router.get('/diagnostics/d12/incidents',(_req,res)=>res.json(listD12IncidentRecords()));
  router.post('/diagnostics/d12/incidents',(req,res)=>{const parsed=CreateD12IncidentRecordSchema.safeParse(req.body);if(!parsed.success)return void res.status(400).json({error:'invalid_body'});res.status(201).json(createD12IncidentRecord(req.user!,parsed.data));});

  return router;
}

function parseOptionalFilter(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9_.:-]+$/.test(trimmed)) return null;
  return trimmed;
}
