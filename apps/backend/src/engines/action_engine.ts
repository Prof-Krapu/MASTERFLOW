import type {Action, CreateAction, PreflightResult, RiskLevel, ValidationDecision} from '@masterflow/shared';
import {getDb} from '../db/schema.ts';
import type {ActionRow, Role} from '../db/schema.ts';
import {uuid} from '../lib/uuid.ts';
import {audit} from '../lib/audit.ts';
import type {AuthUser} from '../middleware/auth.ts';
import {getRegistryEntry, riskLevelFor, isSensitive} from './action_registry.ts';
import {checkPermission, validatorRoleFor, hasRole} from './permission_runtime.ts';
import {ACTION_EXECUTORS} from './executors.ts';

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

/** Liste les actions en attente de validation humaine (inbox de validation). */
export function listPending(): Action[] {
  const rows = getDb()
    .prepare("SELECT * FROM actions WHERE status = 'pending_validation' ORDER BY created_at ASC")
    .all() as ActionRow[];
  return rows.map(toActionDTO);
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
         (id, registry_id, intent, object_type, status, user_id, room_id, engine,
          risk_level, payload_json, preflight_json, validator_id, validation_note,
          result_json, error, created_at, updated_at)
       VALUES
         (@id, @registry_id, @intent, @object_type, 'draft', @user_id, @room_id, @engine,
          @risk_level, @payload_json, NULL, NULL, NULL, NULL, NULL, @created_at, @updated_at)`,
    )
    .run({
      id,
      registry_id: body.registry_id ?? null,
      intent: body.intent,
      object_type: body.object_type,
      user_id: user.id,
      room_id: body.room_id ?? null,
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

  const entry = action.registry_id ? getRegistryEntry(action.registry_id) : null;
  const perm = checkPermission(user, entry);
  const risk = effectiveRisk(action);

  // Sensibilité = validation humaine requise (registre) OU permission refusée écarte tout.
  const sensitive = entry ? isSensitive(entry) : false;
  const requiresValidation = perm.allowed && sensitive;
  const validatorRole = requiresValidation ? validatorRoleFor(entry) : null;

  const warnings: string[] = [];
  if (!perm.allowed && perm.reason) warnings.push(perm.reason);

  const preflight: PreflightResult = {
    permission_check: perm.allowed ? 'passed' : 'failed',
    context_locks: [],
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
  if (!perm.allowed) {
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
      perm.allowed ? null : (perm.reason ?? 'permission_denied'),
      now,
      actionId,
    );

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

// ───────────────────────── Étape 4 — Exécution ─────────────────────────

/**
 * Exécute une action APPROUVÉE. Invariant non négociable : REFUSE tout status ≠ 'approved'
 * (une action sensible non validée ne peut donc jamais s'exécuter). Résultat mocké pour le MVP.
 */
export function executeAction(user: AuthUser, actionId: string): Action {
  const action = getAction(actionId);
  if (!action) throw new Error(`[action_engine] Action introuvable : ${actionId}`);

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

  // Dispatcher : exécuteurs réels par registry_id ; défaut = résultat mocké MVP.
  let result: Record<string, unknown>;
  try {
    const executor = action.registry_id ? ACTION_EXECUTORS[action.registry_id] : undefined;
    if (executor) {
      result = executor(user, action);
    } else {
      result = {
        ok: true,
        executed_at: now,
        intent: action.intent,
        object_type: action.object_type,
        note: 'résultat simulé (MVP — pas de runner réel)',
      };
    }
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
