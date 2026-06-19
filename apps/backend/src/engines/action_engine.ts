import {
  ExpireActionsRequestSchema,
  ExpireActionsResponseSchema,
  ExpireSelectedActionsRequestSchema,
  PreviewActionsExpiryResponseSchema,
  type Action,
  type CreateAction,
  type ExpireActionsRequest,
  type ExpireActionsResponse,
  type ExpireSelectedActionsRequest,
  type PreviewActionsExpiryResponse,
  type PreflightResult,
  type RiskLevel,
  type ValidationDecision,
} from '@masterflow/shared';
import {getDb} from '../db/schema.ts';
import type {ActionRow, Role} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getRegistryEntry, riskLevelFor, isSensitive} from './action_registry.ts';
import {checkPermission, validatorRoleFor, hasRole} from './permission_runtime.ts';
import {ACTION_EXECUTORS} from './executors.ts';
import {getActiveHardStopForOwnerRoom} from '../services/hard_stop.ts';
import {captureActionContextSnapshot} from '../services/action_context_snapshots.ts';

/**
 * Moteur du cycle de vie des actions.
 *
 * Cycle : draft → preflight → pending_validation → approved → executing → completed
 *         (ou rejected / failed).
 *
 * Invariants produit appliqués ici :
 * - Aucune action sensible n'est exécutée sans validation humaine explicite :
 *   `executeAction` REFUSE tout status ≠ 'approved'.
 * - Le backend décide ; le LLM ne fait que proposer → tout passe par preflight + permissions.
 * - Chaque transition est tracée via `audit()` (trace immuable).
 *
 * Le `risk_level` est statique (lu depuis le registre via `riskLevelFor`), jamais inféré
 * d'une préférence.
 */

// ───────────────────────── Mapping rangée → DTO ─────────────────────────

/** Convertit une rangée `actions` (colonnes _json en TEXT) en DTO API typé. */
export function toActionDTO(row: ActionRow): Action {
  return {
    id: row.id,
    registry_id: row.registry_id,
    intent: row.intent,
    object_type: row.object_type,
    user_id: row.user_id,
    room_id: row.room_id,
    project_id: row.project_id,
    status: row.status as Action['status'],
    engine: row.engine,
    risk_level: row.risk_level as Action['risk_level'],
    payload: JSON.parse(row.payload_json ?? 'null'),
    preflight: JSON.parse(row.preflight_json ?? 'null'),
    validator_id: row.validator_id,
    validation_note: row.validation_note,
    result: JSON.parse(row.result_json ?? 'null'),
    error: row.error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ───────────────────────── Lecture ─────────────────────────

/** Récupère une action par id, ou `null` si absente. */
export function getAction(id: string): Action | null {
  const row = getDb()
    .prepare('SELECT * FROM actions WHERE id = ?')
    .get(id) as ActionRow | undefined;
  return row ? toActionDTO(row) : null;
}

function isGlobalAdmin(actor: AuthUser): boolean {
  return actor.role === 'admin' || actor.role === 'godmode';
}

function hasProjectAccess(actor: AuthUser, projectId: string | null): boolean {
  if (!projectId || isGlobalAdmin(actor)) return true;
  return (
    getDb()
      .prepare('SELECT 1 AS hit FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(projectId, actor.id) !== undefined
  );
}

function canReadAction(actor: AuthUser, row: ActionRow): boolean {
  return row.user_id === actor.id || (isGlobalAdmin(actor) && hasProjectAccess(actor, row.project_id));
}

function canValidateAction(actor: AuthUser, action: Action): boolean {
  const entry = action.registry_id ? getRegistryEntry(action.registry_id) : null;
  const requiredRole: Role = action.preflight?.validator_role ?? validatorRoleFor(entry) ?? 'teacher';
  return hasRole(actor, requiredRole) && hasProjectAccess(actor, action.project_id);
}

function isSensitiveForExpiry(action: Action): boolean {
  const entry = action.registry_id ? getRegistryEntry(action.registry_id) : null;
  return Boolean(
    action.preflight?.requires_validation ||
    (entry && isSensitive(entry)) ||
    action.risk_level === 'medium_high' ||
    action.risk_level === 'high' ||
    action.risk_level === 'variable',
  );
}

/** Récupère une action seulement si l'acteur peut la lire. */
export function getActionFor(actor: AuthUser, id: string): Action | null {
  const row = getDb().prepare('SELECT * FROM actions WHERE id = ?').get(id) as ActionRow | undefined;
  return row && canReadAction(actor, row) ? toActionDTO(row) : null;
}

/** Liste les actions que l'acteur peut réellement valider dans son scope. */
export function listPending(actor: AuthUser): Action[] {
  const rows = getDb()
    .prepare("SELECT * FROM actions WHERE status = 'pending_validation' ORDER BY created_at ASC")
    .all() as ActionRow[];
  return rows.map(toActionDTO).filter((action) => canValidateAction(actor, action));
}

/** Liste compacte des actions ouvertes/obsolètes visibles par l'owner cockpit. */
export function listActionLifecycleForCockpit(actor: AuthUser): Action[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM actions
        WHERE status IN ('pending_validation', 'approved', 'stale')
        ORDER BY updated_at DESC`,
    )
    .all() as ActionRow[];
  return rows.filter((row) => canReadAction(actor, row)).map(toActionDTO);
}

// ───────────────────────── Helpers internes ─────────────────────────

/** Recharge une action (post-UPDATE) ou lève si elle a disparu — garde le strict mode content. */
function reloadAction(id: string): Action {
  const action = getAction(id);
  if (!action) throw new Error(`[action_engine] Action introuvable après mise à jour : ${id}`);
  return action;
}

/** Risque effectif d'une action : son registre s'il existe, sinon le risque déjà persisté (jamais null). */
function effectiveRisk(action: Action): RiskLevel {
  if (action.registry_id) return riskLevelFor(action.registry_id);
  return action.risk_level ?? 'low';
}

// ───────────────────────── Étape 1 — Création (draft) ─────────────────────────

/**
 * Crée une action en status 'draft'. Aucune exécution, aucun effet : on enregistre
 * l'intention. Le `risk_level` est figé depuis le registre (si `registry_id` fourni).
 */
export function createAction(user: AuthUser, body: CreateAction): Action {
  const now = Date.now();
  const id = uuid();
  const risk = body.registry_id ? riskLevelFor(body.registry_id) : null;

  getDb()
    .prepare(
      `INSERT INTO actions
         (id, registry_id, intent, object_type, status, user_id, room_id, project_id, engine,
          risk_level, payload_json, preflight_json, validator_id, validation_note,
          result_json, error, created_at, updated_at)
       VALUES
         (@id, @registry_id, @intent, @object_type, 'draft', @user_id, @room_id, @project_id, @engine,
          @risk_level, @payload_json, NULL, NULL, NULL, NULL, NULL, @created_at, @updated_at)`,
    )
    .run({
      id,
      registry_id: body.registry_id ?? null,
      intent: body.intent,
      object_type: body.object_type,
      user_id: user.id,
      room_id: body.room_id ?? null,
      project_id: body.project_id ?? null,
      engine: body.engine ?? null,
      risk_level: risk,
      payload_json: JSON.stringify(body.payload ?? {}),
      created_at: now,
      updated_at: now,
    });

  audit({
    event_type: 'action_created',
    user_id: user.id,
    action_id: id,
    scope: body.registry_id ?? body.intent,
    detail: {intent: body.intent, object_type: body.object_type, risk_level: risk},
  });

  return reloadAction(id);
}

// ───────────────────────── Étape 2 — Preflight ─────────────────────────

/**
 * Calcule le `PreflightResult` (permissions, risque statique, besoin de validation,
 * rôle validateur) et fait avancer l'action :
 * - permission refusée → status 'failed' (rien ne s'exécute).
 * - action sensible → status 'pending_validation' + audit 'preflight'.
 * - action non sensible → status 'approved' (peut être exécutée directement).
 *
 * Le LLM propose, le backend décide : c'est ici que le « possible » est arbitré.
 */
export function preflightAction(user: AuthUser, actionId: string): Action {
  const action = getAction(actionId);
  if (!action) throw new Error(`[action_engine] Action introuvable : ${actionId}`);
  if (action.user_id !== user.id) throw new Error('[action_engine] action_access_denied');

  const entry = action.registry_id ? getRegistryEntry(action.registry_id) : null;
  const perm = checkPermission(user, entry);
  const risk = effectiveRisk(action);

  // Sensibilité = validation humaine requise (registre) OU permission refusée écarte tout.
  const sensitive = entry ? isSensitive(entry) : false;
  const requiresValidation = perm.allowed && sensitive;
  const validatorRole = requiresValidation ? validatorRoleFor(entry) : null;
  const activeHardStop = sensitive && action.room_id
    ? getActiveHardStopForOwnerRoom(user.id, action.room_id)
    : null;
  const blockedByHardStop = perm.allowed && activeHardStop !== null;

  const warnings: string[] = [];
  if (!perm.allowed && perm.reason) warnings.push(perm.reason);
  if (blockedByHardStop) warnings.push('hard_stop_active');

  const preflight: PreflightResult = {
    permission_check: perm.allowed ? 'passed' : 'failed',
    context_locks: blockedByHardStop ? [`hard_stop:${action.room_id}`] : [],
    resource_availability: 'ok',
    rate_limit: 'ok',
    warnings,
    requires_validation: requiresValidation,
    validator_role: validatorRole,
    risk_level: risk,
    estimated_duration_ms: 500,
  };

  // Détermination du status cible.
  let nextStatus: Action['status'];
  if (!perm.allowed || blockedByHardStop) {
    nextStatus = 'failed';
  } else if (requiresValidation) {
    nextStatus = 'pending_validation';
  } else {
    nextStatus = 'approved';
  }

  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE actions
          SET status = ?, risk_level = ?, preflight_json = ?, error = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(
      nextStatus,
      risk,
      JSON.stringify(preflight),
      blockedByHardStop ? 'hard_stop_active' : (perm.allowed ? null : (perm.reason ?? 'permission_denied')),
      now,
      actionId,
    );

  if (perm.allowed && sensitive && action.room_id && !blockedByHardStop) {
    try {
      captureActionContextSnapshot(user, action);
    } catch (error) {
      audit({
        event_type: 'action_context_snapshot_capture_failed',
        user_id: user.id,
        action_id: action.id,
        scope: `room:${action.room_id}`,
        detail: {message: error instanceof Error ? error.message : String(error)},
      });
    }
  }

  // Audit : on trace toujours le preflight, en précisant l'issue.
  audit({
    event_type: 'preflight',
    user_id: user.id,
    action_id: actionId,
    scope: action.registry_id ?? action.intent,
    detail: {
      permission_check: preflight.permission_check,
      requires_validation: requiresValidation,
      validator_role: validatorRole,
      risk_level: risk,
      next_status: nextStatus,
      hard_stop_state_id: activeHardStop?.id ?? null,
    },
  });

  return reloadAction(actionId);
}

// ───────────────────────── Étape 3 — Validation humaine ─────────────────────────

/**
 * Décision humaine sur une action en attente. Exige que le validateur ait au moins
 * le rôle requis (déduit du registre / du preflight). C'est le SEUL chemin qui mène
 * une action sensible vers 'approved'. Une proposition de l'IA n'est jamais une validation.
 */
export function validateAction(
  validator: AuthUser,
  actionId: string,
  decision: ValidationDecision,
): Action {
  const action = getAction(actionId);
  if (!action) throw new Error(`[action_engine] Action introuvable : ${actionId}`);
  if (action.status !== 'pending_validation') {
    throw new Error(
      `[action_engine] Action ${actionId} non validable : status '${action.status}' (attendu 'pending_validation').`,
    );
  }
  if (!canValidateAction(validator, action)) {
    throw new Error('[action_engine] validation_scope_denied');
  }

  // Rôle validateur : priorité au preflight figé, sinon recalcul depuis le registre.
  const entry = action.registry_id ? getRegistryEntry(action.registry_id) : null;
  const requiredRole: Role = action.preflight?.validator_role ?? validatorRoleFor(entry) ?? 'teacher';

  if (!hasRole(validator, requiredRole)) {
    audit({
      event_type: 'validation_denied',
      user_id: validator.id,
      action_id: actionId,
      scope: action.registry_id ?? action.intent,
      detail: {required_role: requiredRole, validator_role: validator.role},
    });
    throw new Error(
      `[action_engine] Rôle insuffisant pour valider : '${requiredRole}' requis.`,
    );
  }

  const nextStatus: Action['status'] = decision.decision === 'approved' ? 'approved' : 'rejected';
  const now = Date.now();
  getDb()
    .prepare(
      `UPDATE actions
          SET status = ?, validator_id = ?, validation_note = ?, updated_at = ?
        WHERE id = ?`,
    )
    .run(nextStatus, validator.id, decision.note ?? null, now, actionId);

  audit({
    event_type: 'validation',
    user_id: validator.id,
    action_id: actionId,
    scope: action.registry_id ?? action.intent,
    detail: {decision: decision.decision, note: decision.note ?? null, required_role: requiredRole},
  });

  return reloadAction(actionId);
}

// ───────────────────────── Garde stale / hard-stop borné ─────────────────────────

function findOpenSensitiveActionsForExpiry(
  actor: AuthUser,
  request: ExpireActionsRequest,
): Action[] {
  if (request.scope === 'project' && !request.project_id) {
    throw new Error('[action_engine] project_id_required_for_project_scope');
  }
  if (request.project_id && !hasProjectAccess(actor, request.project_id)) {
    throw new Error('[action_engine] action_expiry_scope_denied');
  }

  const rows = getDb()
    .prepare(
      `SELECT * FROM actions
        WHERE status IN ('pending_validation', 'approved')
        ORDER BY created_at ASC`,
    )
    .all() as ActionRow[];

  return rows
    .filter((row) => {
      if (request.scope === 'mine' && row.user_id !== actor.id) return false;
      if (request.scope === 'project' && row.project_id !== request.project_id) return false;
      if (request.room_id && row.room_id !== request.room_id) return false;
      return canReadAction(actor, row);
    })
    .map(toActionDTO)
    .filter(isSensitiveForExpiry);
}

/** Prévisualise les actions qui deviendraient stale, sans aucune écriture. */
export function previewOpenSensitiveActionsExpiry(
  actor: AuthUser,
  input: ExpireActionsRequest,
): PreviewActionsExpiryResponse {
  const request = ExpireActionsRequestSchema.parse(input);
  const candidates = findOpenSensitiveActionsForExpiry(actor, request);
  return PreviewActionsExpiryResponseSchema.parse({
    candidate_count: candidates.length,
    candidate_action_ids: candidates.map((action) => action.id),
    candidates: candidates.map((action) => ({
      id: action.id,
      intent: action.intent,
      object_type: action.object_type,
      status: action.status,
      risk_level: action.risk_level,
    })),
    reason: request.reason,
    scope_ref: request.scope === 'project' ? `project:${request.project_id}` : `user:${actor.id}`,
    audit_trace: ['action_expiry_preview_v1', 'read_only', 'no_status_change', 'no_execute'],
  });
}

/**
 * Rend obsolètes des actions sensibles déjà ouvertes dans un scope contrôlé.
 *
 * Ce n'est pas un auto-cancel destructif : on ne supprime rien, on ne touche pas aux actions
 * terminées/en cours, on trace l'obsolescence et `executeAction` refusera naturellement `stale`.
 */
export function expireOpenSensitiveActions(
  actor: AuthUser,
  input: ExpireActionsRequest,
): ExpireActionsResponse {
  const request = ExpireActionsRequestSchema.parse(input);
  const candidates = findOpenSensitiveActionsForExpiry(actor, request);

  const now = Date.now();
  const update = getDb().prepare(
    `UPDATE actions
        SET status = 'stale', error = ?, updated_at = ?
      WHERE id = ? AND status IN ('pending_validation', 'approved')`,
  );
  const reason = `stale:${request.reason}`;

  for (const action of candidates) {
    update.run(request.note ? `${reason}:${request.note}` : reason, now, action.id);
    audit({
      event_type: 'action_stale',
      user_id: actor.id,
      action_id: action.id,
      scope: action.registry_id ?? action.intent,
      detail: {
        reason: request.reason,
        note: request.note ?? null,
        previous_status: action.status,
        scope_ref: request.scope === 'project' ? `project:${request.project_id}` : `user:${actor.id}`,
      },
    });
  }

  return ExpireActionsResponseSchema.parse({
    expired_count: candidates.length,
    expired_action_ids: candidates.map((action) => action.id),
    reason: request.reason,
    scope_ref: request.scope === 'project' ? `project:${request.project_id}` : `user:${actor.id}`,
    audit_trace: ['action_expiry_guard_v1', 'sensitive_open_actions_only', 'no_delete', 'no_execute'],
  });
}

/**
 * Rend stale uniquement les actions explicitement sélectionnées après prévisualisation.
 *
 * La sélection est atomique : si une seule action est devenue inéligible, inaccessible ou
 * extérieure au scope, aucune action n'est modifiée. Cela évite qu'un écran périmé applique
 * silencieusement un hard-stop partiel ou trop large.
 */
export function expireSelectedSensitiveActions(
  actor: AuthUser,
  input: ExpireSelectedActionsRequest,
): ExpireActionsResponse {
  const request = ExpireSelectedActionsRequestSchema.parse(input);
  const eligibleById = new Map(
    findOpenSensitiveActionsForExpiry(actor, request).map((action) => [action.id, action]),
  );
  const ineligibleIds = request.action_ids.filter((id) => !eligibleById.has(id));
  if (ineligibleIds.length > 0) {
    throw new Error(`[action_engine] selected_actions_not_eligible:${ineligibleIds.join(',')}`);
  }

  const selected = request.action_ids.map((id) => eligibleById.get(id) as Action);
  const now = Date.now();
  const reason = `stale:${request.reason}`;
  const scopeRef = request.scope === 'project' ? `project:${request.project_id}` : `user:${actor.id}`;
  const db = getDb();
  const update = db.prepare(
    `UPDATE actions
        SET status = 'stale', error = ?, updated_at = ?
      WHERE id = ? AND status IN ('pending_validation', 'approved')`,
  );

  db.transaction(() => {
    for (const action of selected) {
      const result = update.run(request.note ? `${reason}:${request.note}` : reason, now, action.id);
      if (result.changes !== 1) {
        throw new Error(`[action_engine] selected_action_changed:${action.id}`);
      }
      audit({
        event_type: 'action_stale',
        user_id: actor.id,
        action_id: action.id,
        scope: action.registry_id ?? action.intent,
        detail: {
          reason: request.reason,
          note: request.note ?? null,
          previous_status: action.status,
          scope_ref: scopeRef,
          selection_mode: 'explicit',
        },
      });
    }
  })();

  return ExpireActionsResponseSchema.parse({
    expired_count: selected.length,
    expired_action_ids: selected.map((action) => action.id),
    reason: request.reason,
    scope_ref: scopeRef,
    audit_trace: [
      'action_expiry_selected_v1',
      'explicit_selection_only',
      'all_or_nothing',
      'no_delete',
      'no_execute',
    ],
  });
}

// ───────────────────────── Étape 4 — Exécution ─────────────────────────

/**
 * Exécute une action APPROUVÉE. Invariant non négociable : REFUSE tout status ≠ 'approved'
 * (une action sensible non validée ne peut donc jamais s'exécuter). Résultat mocké pour le MVP.
 */
export function executeAction(user: AuthUser, actionId: string): Action {
  const action = getAction(actionId);
  if (!action) throw new Error(`[action_engine] Action introuvable : ${actionId}`);
  if (action.user_id !== user.id && action.validator_id !== user.id) {
    throw new Error('[action_engine] action_access_denied');
  }

  if (action.status !== 'approved') {
    audit({
      event_type: 'execute_refused',
      user_id: user.id,
      action_id: actionId,
      scope: action.registry_id ?? action.intent,
      detail: {status: action.status, reason: 'status != approved'},
    });
    throw new Error(
      `[action_engine] Exécution refusée : action ${actionId} en status '${action.status}' (status 'approved' obligatoire).`,
    );
  }

  const now = Date.now();
  // Marque l'entrée en exécution (trace de l'état transitoire).
  getDb()
    .prepare("UPDATE actions SET status = 'executing', updated_at = ? WHERE id = ?")
    .run(now, actionId);
  audit({
    event_type: 'execute_start',
    user_id: user.id,
    action_id: actionId,
    scope: action.registry_id ?? action.intent,
  });

  // Dispatcher : une action sans exécuteur réel échoue explicitement.
  let result: Record<string, unknown>;
  try {
    const executor = action.registry_id ? ACTION_EXECUTORS[action.registry_id] : undefined;
    if (!executor) throw new Error('not_implemented');
    result = executor(user, action);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const failedAt = Date.now();
    getDb()
      .prepare("UPDATE actions SET status = 'failed', error = ?, updated_at = ? WHERE id = ?")
      .run(errMsg, failedAt, actionId);
    audit({
      event_type: 'execute_refused',
      user_id: user.id,
      action_id: actionId,
      scope: action.registry_id ?? action.intent,
      detail: {reason: errMsg},
    });
    return reloadAction(actionId);
  }

  const done = Date.now();
  getDb()
    .prepare("UPDATE actions SET status = 'completed', result_json = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(result), done, actionId);

  audit({
    event_type: 'execute_completed',
    user_id: user.id,
    action_id: actionId,
    scope: action.registry_id ?? action.intent,
    detail: {result},
  });

  return reloadAction(actionId);
}
