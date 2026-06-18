# MasterFlow Runtime Action Queue — 2026-06-18

Status: `ACTIVE_RUNTIME_QUEUE`

Source of truth reminder:

- Drive MasterFlow = product canon.
- GitHub = deployment/runtime truth.
- This queue is an operational bridge, not a canon override.

## Current baseline

```yaml
github_main: 0970dc4
validation_inbox: partial_implemented_action_based_slice
job_observability: partial_frontend_read_only_slice
owner_cockpit: merged_read_only_slice
teaching_readiness: local_read_only_slice_runtime_verified_teacher_godmode
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

Review and publish the runtime-verified Teaching slice after explicit commit/push validation.

Local implementation status:

```yaml
teaching_readiness_component: apps/frontend/src/teaching-readiness.tsx
mounted_in: apps/frontend/src/App.tsx when activeMode is teaching
uses_existing_endpoints:
  - GET /api/v1/context/current
  - GET /api/v1/resources
  - GET /api/v1/jobs
mutation: none
checks:
  - npm run lint:frontend OK
  - npm run build:frontend OK
entry_scope:
  - teacher
  - godmode
  - student and admin remain excluded
verification:
  - role unit test OK
  - godmode browser smoke OK
  - responsive 390 px no horizontal overflow
status: pending_commit_push_validation
```
