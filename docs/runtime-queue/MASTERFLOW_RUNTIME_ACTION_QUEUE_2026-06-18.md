# MasterFlow Runtime Action Queue — 2026-06-18

Status: `ACTIVE_RUNTIME_QUEUE`

Source of truth reminder:

- Drive MasterFlow = product canon.
- GitHub = deployment/runtime truth.
- This queue is an operational bridge, not a canon override.

## Current baseline

```yaml
github_main: c2a4ea3
validation_inbox: partial_implemented_action_based_slice
d06_feedback_inbox_projection: local_implemented_pending_publication
job_observability: partial_frontend_read_only_slice
owner_cockpit: merged_read_only_slice
teaching_readiness: merged_read_only_slice_teacher_godmode
guided_subject_read: merged_scoped_read_slice
drive_bridge_refresh: recorded
```

## Queue order

| Order | Workstream | Status | Why now | Next output |
|---:|---|---|---|---|
| 1 | D05-D06 vertical mapping | mapped | First useful pedagogical proof; closest to real usage. | `docs/d05-d06/D05_D06_VERTICAL_MAPPING_2026-06-18.md` |
| 2 | D12 owner cockpit mapping | mapped | MALEX needs to stop working blind. | `docs/d12/D12_OWNER_COCKPIT_MAPPING_2026-06-18.md` |
| 3 | Process activation audit | mapped | Runtime must trigger the right process without MALEX as hidden orchestrator. | `docs/process-activation/PROCESS_ACTIVATION_AUDIT_2026-06-18.md` |
| 4 | User feedback intake 2026-06-18 | mapped | Prevent feedback audits from becoming a second archive chaos. | `docs/user-feedback/USER_FEEDBACK_INTAKE_2026-06-18.md` |
| 5 | D08 visual/DA safety prep | mapped_locked | High-risk if generation opens before storage/provenance/review gates. | `docs/d08/D08_LOCKED_MANIFEST_FIRST_SEQUENCE_2026-06-18.md` |

## Active constraints

- No destructive action.
- No direct Drive archive mutation.
- No commit/push/deploy without explicit MALEX validation.
- No D08 provider/live generation until storage, provenance, manifest and validation gates are confirmed.
- No new parallel validation queue: new review objects must target the shared Validation Inbox progressively.

## Open risks

1. Treating `partial` frontend/backend slices as complete product systems.
2. Leaving Drive updates invisible to GitHub/Vincent.
3. Letting user feedback become canon without classification.
4. Creating domain-specific queues instead of feeding the shared Validation Inbox.
5. Overloading Vincent with broad Drive questions instead of precise evidence requests.

## Immediate next action

Validate commit/push/PR for the local `feedback_draft only` D06 projection.

Local contract status:

```yaml
contract: docs/d06/D06_VALIDATION_INBOX_PROJECTION_CONTRACT_2026-06-18.md
first_source_kind: feedback_draft
decision_authority: reviewFeedbackDraft
decision_scope: owner_teacher_only
decisions:
  - approve
  - reject
excluded_first_slice:
  - pre_correction_run
  - calibration_review
  - correction_export_preview
  - student_send
status: pending_product_validation
local_implementation: ready_pending_publication
verification:
  backend_targeted: 16/16
  backend_full: 299/299
  backend_typescript: ok
  frontend_typescript: ok
  frontend_build: ok
```
