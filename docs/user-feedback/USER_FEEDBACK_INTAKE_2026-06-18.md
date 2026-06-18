# User Feedback Intake — 2026-06-18

Status: `PRE_CANON_INTAKE`

This file classifies user-feedback audit signals from MALEX conversations.

Source authority:

```txt
conversation audits = candidate evidence, not canon by default
```

## Sources reviewed

- `MASTERFLOW_USER_FEEDBACK_AUDIT_ALL_CONVERSATIONS_2026-06-18.md`
- `MASTERFLOW_DA_USER_FEEDBACK_AUDIT_2026-06-18.md`
- `MASTERFLOW_FEEDBACK_RECO_STRUCTURES_AUDIT_2026-06-18.md`
- `MASTERFLOW_BADGE_OUTPUT_SYSTEM_AUDIT_2026-06-18.md`

## Intake summary

The main product signal is not “more features”.

It is:

```txt
MALEX constantly pilots deltas, gates, validation scope, continuity and output families.
MasterFlow must make that control visible and enforceable instead of relying on MALEX as hidden orchestrator.
```

## Classified candidates

| Candidate | Type | Domains | Route | Status | Why |
|---|---|---|---|---|---|
| `DELTA_CONTROL_LAYER` | control primitive | D03, D05, D06, D08, D11 | process activation | candidate | MALEX often says “more/less/keep this/don’t change the rest”. |
| `ACCEPTANCE_SCOPE` | validation primitive | cross-domain | Validation Inbox / Output Readiness | candidate | “Perfect” may mean tone/direction/version, not canon lock. |
| `FAILURE_TO_RULE_BACKFLOW` | D12/backflow primitive | D11, D12 | opportunity radar / findings | candidate | Errors are useful rule signals. |
| `FAST_PREVIEW_STRICT_FINALIZATION` | operating rule | cross-domain | canon reinforcement | already aligned / reinforce | Preview fast, canon/export/deploy slow. |
| `HARD_STOP_ACTION_PRIORITY` | control gate | D03, D08, D11, D12 | process activation | high-priority candidate | Stop/reset/no-generation must override generation/action queues. |
| `RESET_GRANULARITY` | control primitive | D03, D08, D11 | process activation | candidate | Reset can mean scene, brief, output family, session, reference, etc. |
| `CONTINUITY_VECTOR` | context primitive | D03, D08, D09, D11 | D08/D11 prep | candidate | “Same style but change subject” needs structured continuity. |
| `SEMANTIC_FIT_GATE` | visual/narrative gate | D08, D09 | D08 manifest-first | candidate | An image can be beautiful but semantically wrong. |
| `FEEDBACK_OUTPUT_FAMILY_REGISTRY` | D06 output grammar | D06, D05 | D05-D06 vertical | high-priority candidate | Feedback, reco, defense, jury, appreciation are different families. |
| `FEEDBACK_ORIGIN_STATUS` | source truth primitive | D06 | D05-D06 vertical | high-priority candidate | Original/oral/generated/reconstructed/validated must be explicit. |
| `FEEDBACK_EVOLUTION_CHAIN` | longitudinal feedback | D06, D12 | future D06 spec | candidate | V1→V2 feedback needs prior evidence and delta. |
| `EVALUATION_DEFENSE_REPORT` | high-stakes output | D06 | validation locked | candidate | Grade justification requires evidence/rubric/grade status. |
| `RECOMMENDATION_LETTER_FRAME` | high-privacy output | D06/D10 | validation locked | candidate | External-send and privacy gates required. |
| `BADGE_OUTPUT_SYSTEM` | output family | D08, D10, D11 | D08 manifest-first / later | candidate locked | Badge is fabricable narrative system, not just image. |
| `MANUFACTURING_READINESS_STRIP` | output readiness | D08, D10 | D08 later | candidate locked | Fabrication needs safe zones, layers, attachment, material constraints. |

## Recommended routes

### Route now

Feed into Process Activation / D12:

- `HARD_STOP_ACTION_PRIORITY`
- `RESET_GRANULARITY`
- `DELTA_CONTROL_LAYER`
- `ACCEPTANCE_SCOPE`
- `FAILURE_TO_RULE_BACKFLOW`

Why: these reduce hidden orchestration by MALEX.

### Route D05-D06

Feed into the D05-D06 vertical:

- `FEEDBACK_OUTPUT_FAMILY_REGISTRY`
- `FEEDBACK_ORIGIN_STATUS`
- `FEEDBACK_EVOLUTION_CHAIN`
- `EVALUATION_DEFENSE_REPORT`
- `RECOMMENDATION_LETTER_FRAME`

Why: these are strongly aligned with correction, feedback and validation.

### Route D08 later

Keep locked until D08 manifest/storage/review exists:

- `CONTINUITY_VECTOR`
- `SEMANTIC_FIT_GATE`
- `BADGE_OUTPUT_SYSTEM`
- `MANUFACTURING_READINESS_STRIP`

Why: high risk of opening generation/DA before gates are ready.

## Not canon yet

None of these candidates should be treated as canon-locked from this file alone.

Promotion path:

```txt
candidate -> simulation or mapping -> opportunity/decision queue -> MALEX validation -> canon/update/runtime spec
```

## Immediate implementation candidates

### Candidate A — process control strip

Show:

- current process candidate;
- locked deltas;
- stop/reset/no-generation status;
- next safe action.

Status: `recommended_first`

### Candidate B — feedback family selector

Before D06 output, ask/select:

- actionable feedback;
- grade appreciation;
- evaluation defense;
- recommendation letter;
- jury framing;
- class summary.

Status: `recommended_after_D05_D06_panel`

### Candidate C — D08 manifest-only badge schema

Write schema/spec only, no generation.

Status: `locked_until_D08_manifest_sequence`

## Next safe action

Start with `Process Control Strip` as read-only UI/state vocabulary.

Do not implement generation, send/export, or canon promotion from these feedback candidates yet.
