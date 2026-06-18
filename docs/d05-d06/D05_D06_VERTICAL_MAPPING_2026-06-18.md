# D05-D06 Vertical Mapping — 2026-06-18

Status: `MAPPING_PATCH_NON_RUNTIME`

This document maps the Drive canon D05-D06 pedagogical/correction vertical against the current
GitHub runtime.

It does not implement a new correction app. It turns the canon contract into a bounded runtime
queue.

## Sync baseline

```yaml
github_main: 17f0a47
previous_runtime_anchor: 489b00a
drive_sources:
  - 05_UI_RUNTIME_CONTRACTS/D05_D06_VERTICAL_UI_RUNTIME_CONTRACT.md
  - 05_UI_RUNTIME_CONTRACTS/D05_D06_VERTICAL_UI_STATE_AND_ACTION_REGISTRY.json
  - 03_DOMAINS/D05_PEDAGOGY_SUBJECTS_CDC/DOMAIN_CARD.md
  - 03_DOMAINS/D06_CORRECTION_FEEDBACK_EVALUATION/DOMAIN_CARD.md
```

## Product contract

Target workflow:

```txt
Room Context Card
-> Guided Subject
-> Source Truth Strip
-> Correction Sheet Draft
-> Evidence Snapshot
-> Pre-Correction Manifest
-> Validation Inbox
-> Student-Safe Feedback
-> Output Readiness Console
```

The UI must feel like a working pedagogical room, not a technical dashboard.

## Current GitHub support

| Canon surface | GitHub status | Evidence | Interpretation |
|---|---|---|---|
| Room Context Card | partial | `apps/backend/src/routers/context.ts`, `rooms.ts`, `room_checkpoints.ts`, `runtime_loadout.ts` | Runtime context exists, but no D05-D06 composed room card yet. |
| Guided Subject | implemented foundation | `guided_runtime.ts`, `schema_templates.ts`, shared guide/session schemas | Private guided runtime can support subject/CDC workflows. |
| Source Truth Strip | partial | `resources.ts`, `resource_truth.ts`, `rag.ts`, `context_compiler.ts` | Validated resources/RAG exist; no D05-specific strip component. |
| Correction Sheet Draft | backend foundation | correction tables, rubric schemas, `pre_correction.ts` | Data model/services exist; no dedicated route/surface. |
| Evidence Snapshot | backend foundation | `evidence_events`, `pre_correction_runs`, `storage://` refs | Evidence is modeled; file storage remains absent. |
| Pre-Correction Manifest | backend foundation | `pre_correction_manifests`, `recordPreCorrectionDraft` | Internal service validates manifest/run integrity. |
| Validation Inbox | partial implemented | `validation_inbox_items`, `/validation-inbox` | Action-based slice exists; D06 objects are not automatically projected yet. |
| Student-Safe Feedback | backend foundation | `feedback_exports.ts`, feedback schemas/tests | Feedback drafts/export previews are modeled and gated. |
| Output Readiness Console | absent/partial | validation status fields, JobObservability | Readiness exists as scattered signals, not one D05-D06 console. |
| Job Status Compact Strip | partial implemented | `/jobs`, `JobObservability` | Read-only jobs view exists; not yet embedded into D05-D06 flow. |

## Current endpoint families usable now

- `/api/v1/context`
- `/api/v1/rooms`
- `/api/v1/resources`
- `/api/v1/rag`
- `/api/v1/guides`
- `/api/v1/guided-sessions`
- `/api/v1/schema-templates`
- `/api/v1/jobs`
- `/api/v1/validation-inbox`
- `/api/v1/actions`

## Important gap

There is currently no exposed `/api/v1/correction` or `/api/v1/feedback` route family.

Correction/feedback foundations are real, but mostly backend-internal:

- `apps/backend/src/services/pre_correction.ts`
- `apps/backend/src/services/feedback_exports.ts`
- correction storage tables in `apps/backend/src/db/schema.ts`
- service-level tests proving gates, ownership and validation behavior

This means the next D05-D06 product slice should not pretend the whole correction room exists.

## Recommended first slice

Build a read-only/low-risk D05-D06 room mapping before adding mutations.

### Slice name

```txt
D05-D06 Teaching Room Readiness Panel
```

### Purpose

Show a teacher:

- active room/project scope;
- active guided subject/session state;
- source truth readiness;
- correction foundation availability;
- jobs requiring review;
- validation inbox items;
- missing capabilities.

### Not included

- no final grading;
- no public/student send;
- no file upload promise;
- no automatic correction;
- no D08 deep visual judgment;
- no parallel validation queue.

## Implementation queue

### Now

1. Create a D05-D06 frontend panel inside the existing Teaching mode.
   - Status: `ready_for_spec`
   - Risk: low
   - Uses existing endpoints only.

2. Add a compact “missing capability” strip.
   - Must show: file storage absent, correction routes absent, D06 object inbox projection pending.
   - Status: `ready_for_spec`
   - Risk: low

3. Reuse `JobObservability` logic as a compact strip, not raw logs.
   - Status: `partial_existing`
   - Risk: low

### Next

4. Add read-only correction foundation diagnostics.
   - Requires backend route design.
   - Status: `needs_backend_spec`
   - Risk: medium

5. Project feedback/pre-correction objects into Validation Inbox.
   - Status: `needs_backend_spec`
   - Risk: medium/high
   - Constraint: must reuse shared `validation_inbox_items`, not create D06 queue.

6. Add correction/feedback route family.
   - Status: `needs_Vincent_or_backend_handoff`
   - Risk: medium/high

### Later

7. File upload/storage integration.
   - Status: `blocked_by_storage`
   - Risk: high

8. Student-safe feedback export/send.
   - Status: `validation_locked`
   - Risk: high

## Vincent handoff candidates

Only send to Vincent after MALEX validation:

1. Should D06 expose a dedicated `/correction` route family, or should first reads go through
   diagnostics/admin-only routes?
2. What is the minimum safe projection from `feedback_drafts` / `correction_export_previews` into
   `validation_inbox_items`?
3. Should `correction_prepare` jobs create review items automatically, or should the runner output
   remain `needs_review` until a teacher opens the review panel?

## Canon status recommendation

```yaml
D05_guided_subject: implemented_foundation
D06_correction_feedback: backend_foundation_with_gates
D05_D06_vertical_ui: not_implemented
D05_D06_readiness_panel: recommended_first_slice
validation_inbox_for_D06_objects: pending
storage_for_submissions: absent
student_visible_export: blocked_until_validation_route_and_storage
```

## Next safe action

Create a small Teaching mode panel that reads existing runtime state and makes gaps visible.

Do not build mutation-heavy correction flows until the D06 backend route/projection decision is made.
