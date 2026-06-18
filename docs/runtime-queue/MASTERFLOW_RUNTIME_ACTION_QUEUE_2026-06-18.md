# MasterFlow Runtime Action Queue — 2026-06-18

Status: `ACTIVE_RUNTIME_QUEUE`

Source of truth reminder:

- Drive MasterFlow = product canon.
- GitHub = deployment/runtime truth.
- This queue is an operational bridge, not a canon override.

## Current baseline

```yaml
pr6_payload_sha: 4e0cfbb
validation_inbox: partial_implemented_action_and_d06_feedback_draft_slice
d06_feedback_inbox_projection: merged_owner_only_feedback_draft
job_observability: partial_frontend_read_only_slice
owner_cockpit: merged_read_only_slice
teaching_readiness: merged_read_only_slice_teacher_godmode
guided_subject_read: merged_scoped_read_slice
drive_bridge_refresh: recorded
vincent_dependency: closed_not_blocking
```

## Queue order

| Order | Workstream | Status | Why now | Next output |
|---:|---|---|---|---|
| 1 | D06 export preview audit | active_safe | Logical next D06 step after feedback approval; audit/spec only. | `docs/d06/D06_EXPORT_PREVIEW_INBOX_AUDIT_2026-06-18.md` |
| 2 | D05-D06 vertical recipe | safe_queue | Prove the pedagogical chain without new mutations. | `docs/d05-d06/D05_D06_RUNTIME_RECIPE_2026-06-18.md` |
| 3 | D12 owner cockpit gap audit | safe_queue | MALEX needs to stop working blind. | `docs/d12/D12_OWNER_COCKPIT_GAP_AUDIT_2026-06-18.md` |
| 4 | Process activation audit | safe_queue | Runtime must trigger the right process without MALEX as hidden orchestrator. | `docs/process-activation/PROCESS_ACTIVATION_AUDIT_2026-06-18.md` |
| 5 | User feedback intake 2026-06-18 | safe_queue | Prevent feedback audits from becoming a second archive chaos. | `docs/user-feedback/USER_FEEDBACK_INTAKE_2026-06-18.md` |
| 6 | D08 visual/DA safety prep | locked_spec_only | High-risk if generation opens before storage/provenance/review gates. | `docs/d08/D08_LOCKED_MANIFEST_FIRST_SEQUENCE_2026-06-18.md` |

## Active constraints

- No destructive action.
- No direct Drive archive mutation.
- Commit/push is authorized by MALEX for low-risk queue/spec/audit batches in this run.
- No merge/deploy/runtime mutation without explicit MALEX validation.
- No D08 provider/live generation until storage, provenance, manifest and validation gates are confirmed.
- No new parallel validation queue: new review objects must target the shared Validation Inbox progressively.

## Open risks

1. Treating `partial` frontend/backend slices as complete product systems.
2. Leaving Drive updates invisible to GitHub.
3. Letting user feedback become canon without classification.
4. Creating domain-specific queues instead of feeding the shared Validation Inbox.
5. Treating Vincent as a blocking dependency after his handoff is closed.

## Immediate next action

Run the low-risk queue: audit/spec/ledger only, commit and push progressively.

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
status: merged_main
local_implementation: deployed_on_main
verification:
  backend_targeted: 16/16
  backend_full: 299/299
  backend_typescript: ok
  frontend_typescript: ok
  frontend_build: ok
```
