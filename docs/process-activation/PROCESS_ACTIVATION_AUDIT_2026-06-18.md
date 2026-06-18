# Process Activation Audit — 2026-06-18

Status: `AUDIT_PATCH_NON_RUNTIME_UPDATED_POST_PR5`

> Mise à jour 2026-06-18 : Vincent n'est plus une dépendance bloquante. Ce document sert maintenant
> de queue MALEX/Codex pour les specs/audits safe. La PR #5 (`bb61e4f`) a ajouté la projection
> D06 `feedback_draft` dans la Validation Inbox, ce qui améliore le rail de validation mais ne
> crée toujours pas de routeur général d'intention/process.

This document answers the deployment handoff question:

```txt
Does the runtime know which MasterFlow process should activate from user intent?
```

Short answer:

```txt
partially, but mostly through explicit UI/actions/context parameters — not yet through a robust
intent-to-process activation layer.
```

## Canon source

Drive handoff:

```txt
90_WORKBENCH/DEPLOYMENT_HANDOFF/GITHUB_DEPLOYMENT_HANDOFF_PROCESS_ACTIVATION_CONTEXT_LOADOUT_2026-06-18.md
```

Core audit axes:

1. process activation;
2. progressive context loading / RAG / loadout;
3. persistence and redeployment of distilled information;
4. validation / output readiness / action gates;
5. missed-trigger observability.

## Current GitHub evidence

| Capability | Status | Evidence | Interpretation |
|---|---|---|---|
| Action registry | implemented declarative | `apps/backend/src/engines/action_registry.ts` | Knows action metadata, risk, validation, status. |
| Action lifecycle | implemented | `apps/backend/src/engines/action_engine.ts` | Draft/preflight/validation/execution lifecycle exists. |
| Validation Inbox | partial+ | `apps/backend/src/services/validation_inbox.ts` | Actions + D06 `feedback_draft` existent ; autres objets D06-D12 pending. |
| Permission gates | implemented | `permission_runtime.ts`, auth middleware | Backend decides authority; LLM does not. |
| Runtime loadout | partial | `runtime_loadout.ts`, `context_compiler.ts` | Determines available actions/personas/modes from room/context. |
| Context compiler | partial | `context_compiler.ts` | Builds bounded context from room/project/checkpoint/RAG/memory. |
| Domain/process inference | absent/weak | no intent router found | No robust D05/D06/D08/D11/D12 classifier. |
| Missed trigger logging | absent | no finding/missed-trigger service | D12 cannot yet observe failures to activate a process. |
| Hard stop/no generation state | absent | no dedicated action priority layer | “Stop/reset/no generation” is not first-class runtime state. |
| Action expiry after context change | absent | no action invalidation layer found | Existing actions do not appear to expire when context changes. |

## What exists today

### 1. Explicit action flow

The system can handle explicit actions safely:

```txt
createAction -> preflightAction -> pending_validation/approved -> validateAction -> executeAction
```

This is strong for safety.

It does not solve process activation by itself. It assumes the system/user/UI already knows which
action to create.

### 2. Context and loadout

The context compiler can load:

- user;
- project;
- room;
- room instance;
- latest room checkpoint;
- validated inventory/resource/RAG context depending on purpose and tier;
- active memory cards;
- user runtime loadout.

Current cap:

```txt
MAX_RUNTIME_TIER = T2
```

This is safe, but not yet the full canon ladder:

```txt
T1 active scope
T2 local context
T3 linked context
T4 canon references
T5 archive deep search
```

### 3. Some keyword/purpose activation

Inventory context activates if the purpose/room/mode matches inventory-like signals.

This is useful but narrow. It is not yet a general domain process router.

## Main gap

There is no central runtime layer like:

```txt
user intent
-> process candidates
-> required context tier
-> output family
-> validation/readiness gates
-> next safe action
-> missed-trigger finding if not activated
```

Without this, MALEX still acts as the hidden orchestrator:

- naming the right domain;
- deciding when to stop generation;
- deciding when a result is candidate vs canon;
- deciding when prior feedback/context must be loaded;
- deciding when gates should appear.

## Required first object

Introduce a read-only/spec-first object:

```yaml
process_activation_candidate:
  candidate_id:
  source: user_intent | ui_mode | action | job | validation_item | workflow_event
  detected_domains:
  output_family:
  required_context_tier:
  required_gates:
  next_safe_action:
  blocked_actions:
  confidence:
  source_refs:
  status: candidate | accepted | rejected | missed_trigger
```

This object should start as diagnostics/read-model, not as autonomous execution.

## Candidate process map

| User signal | Expected process | Required gates | Current status |
|---|---|---|---|
| “corrige / feedback / note / appréciation” | D05-D06 correction | source truth, teacher validation, output readiness | feedback validation now projected, no activation router |
| “feedback V2 / améliore le retour” | D06 feedback evolution | prior feedback lookup, evidence delta, teacher validation | absent as explicit family |
| “lettre de reco” | D06 recommendation letter | high privacy, external-send gate, evidence status | absent as explicit process |
| “génère / retake / DA / image” | D08 visual manifest | manifest, no-generation review, validation, storage | provider/runtime locked |
| “devis / budget / prix” | D10 private quote | price source, quote validation, send gate | future |
| “mets dans le canon” | canon candidate / Validation Inbox | source truth, owner validation | partial |
| “stop / reset / attends / ne génère pas” | hard stop / control state | priority interruption, action invalidation | absent |
| “ça a échoué, transforme en règle” | D12 missed trigger / backflow | finding, opportunity route, no auto-fix | absent |

## Recommended implementation sequence

### Step 1 — process activation read-model spec

Read-only contract that shows:

- current mode;
- likely process candidates;
- missing gates;
- next safe action;
- blocked actions.

Status: `ready_for_spec_no_code`

### Step 2 — output family registry

Start with a static registry for families:

- correction_feedback;
- recommendation_letter;
- grade_defense;
- visual_manifest;
- quote_draft;
- canon_delta;
- factory_backflow;
- no_generation_review.

Status: `needs_product_validation_before_code`

### Step 3 — missed trigger finding

Record when an expected process was not activated.

Status: `future_D12_spec`

### Step 4 — action expiry

Invalidate pending risky actions when room/context changes materially.

Status: `future_backend_spec`

## What not to do yet

- Do not let an LLM autonomously choose and execute a process.
- Do not open D08 generation just because an image intent is detected.
- Do not make “process activation” a hidden prompt-only behavior.
- Do not turn every user phrase into a backend action.

## Canon status recommendation

```yaml
action_lifecycle: implemented
runtime_loadout: partial_implemented
context_compiler: partial_implemented_T2_capped
general_process_activation: absent
missed_trigger_observability: absent
hard_stop_control_state: absent
action_expiry_after_context_change: absent
recommended_next_slice: read_only_process_activation_panel
```

## Next safe action

Define the process activation read-model before implementation:

```txt
intent -> candidate process -> required gates -> next safe action -> blocked actions
```

This should feed D12 owner cockpit and the shared Validation Inbox, not create a new autonomous
execution path.

## Queue result

```yaml
next_artifact: PROCESS_ACTIVATION_READ_MODEL_SPEC
risk_now: low
code_now: false
commit_push_allowed: true
merge_required_before_runtime: true
```
