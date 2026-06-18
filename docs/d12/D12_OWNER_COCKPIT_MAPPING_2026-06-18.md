# D12 Owner Cockpit Mapping — 2026-06-18

Status: `MAPPING_PATCH_NON_RUNTIME`

This document maps the D12 Drive canon owner dashboard contract against the current GitHub runtime.

It does not claim full autonomy runtime exists. It defines the safe next slice after the read-only
`JobObservability` panel.

## Sync baseline

```yaml
github_main: 17f0a47
drive_sources:
  - 03_DOMAINS/D12_AUTONOMY_OBSERVABILITY_DEPLOYMENT/DOMAIN_CARD.md
  - 05_UI_RUNTIME_CONTRACTS/D12_OBSERVABILITY_DASHBOARD_CONTRACT.md
```

## D12 canon intent

D12 observes, groups, suggests and routes. It does not execute sensitive changes.

Canonical rails:

```txt
rebuild_state
deployment_bridge
validation_inbox
opportunity_radar
implementation_gap_tracker
cleanup_and_archive_safety
```

## Current GitHub support

| D12 rail/object | GitHub status | Evidence | Interpretation |
|---|---|---|---|
| Jobs/runners state | partial implemented | `/jobs`, `jobs.ts`, `JobObservability` | Read-only job status is visible to admin/owner. |
| Workflow diagnostics | implemented admin read | `/diagnostics/workflows`, `workflow_observability.ts` | Aggregates exist: completion, failure, blockers, validation events. |
| Token usage | implemented admin read | `/diagnostics/token-usage` | Useful for cost/task monitoring. |
| Validation queue health | partial | `/validation-inbox`, `validation_inbox_items` | Action-based inbox exists; cross-domain objects pending. |
| Deployment bridge status | documentation only | `docs/canon-sync/...`, Drive inbox/snapshot | No runtime object yet, but trace is now visible in Git. |
| Opportunity radar | absent runtime | Drive workbench only | Product/canon object exists, not backend runtime. |
| Implementation gap tracker | documentation only | mapping docs and SUIVI | No table/API yet. |
| Findings/autonomy runs | absent | no `autonomy_runs`/`findings` tables | D12 Step 1 runtime not implemented. |
| Missed trigger detection | absent | no trigger detector/service | Must be added later as read-only findings first. |
| Owner next safe action | partial/manual | JobObservability next text, docs queue | Needs aggregation into one cockpit strip. |

## Current useful endpoints

- `GET /api/v1/jobs`
- `GET /api/v1/jobs/:id`
- `GET /api/v1/jobs/:id/events`
- `GET /api/v1/validation-inbox`
- `GET /api/v1/diagnostics/workflows`
- `GET /api/v1/diagnostics/token-usage`
- `GET /api/v1/diagnostics/inventory`

## First safe D12 slice

### Slice name

```txt
Owner Next Safe Action Cockpit
```

### Purpose

Give MALEX/admin a small cockpit that answers:

```txt
What is blocked?
What needs review?
What changed in canon/GitHub?
What is the next safe action?
What should not be touched yet?
```

### Input sources

- validation inbox count/status;
- job statuses: queued/running/needs_review/failed;
- workflow diagnostics blockers;
- canon-sync handoff docs;
- runtime queue docs;
- SUIVI/inbox status, initially as documentation not API.

### Output

A read-only admin/owner panel with:

- `next_safe_action`;
- `open_validation_count`;
- `jobs_need_review_count`;
- `failed_jobs_count`;
- `known_runtime_gaps`;
- `blocked_sensitive_actions`;
- `latest_canon_sync_ref`;
- `recommended_queue_order`.

## Forbidden for first slice

- no auto-fix;
- no provider run;
- no commit/push/deploy trigger;
- no Drive write from runtime;
- no automatic canon lock;
- no external message/send;
- no permission change.

## Implementation queue

### Now

1. Add owner cockpit read-model in frontend using existing endpoints.
   - Status: `ready_for_spec`
   - Risk: low
   - No backend mutation.

2. Add “known gaps” static strip from Git docs.
   - Status: `ready_for_spec`
   - Risk: low
   - Can start as static hardcoded strings in the frontend or imported constants.

3. Add Validation Inbox health summary next to JobObservability.
   - Status: `ready_for_spec`
   - Risk: low

### Next

4. Backend read endpoint for owner cockpit aggregation.
   - Possible endpoint: `GET /api/v1/diagnostics/owner-cockpit`
   - Status: `needs_backend_spec`
   - Risk: medium

5. Finding object design.
   - Possible tables: `autonomy_runs`, `autonomy_findings`, `improvement_candidates`
   - Status: `future_spec`
   - Risk: medium/high

6. Missed trigger logging.
   - Status: `future_spec`
   - Risk: high
   - Must remain observation-only.

## Missed trigger examples to track later

- user asks “no generation”, but generation flow starts;
- user asks for feedback V2, but prior feedback is not loaded;
- user asks for recommendation letter, but privacy/export gates do not appear;
- user asks for grade defense, but evidence/rubric/grade status is not requested;
- user expects canon sync, but no deployment bridge trace is created.

## Canon status recommendation

```yaml
D12_jobs_visibility: partial_implemented
D12_workflow_diagnostics: implemented_admin_read
D12_owner_cockpit: not_implemented
D12_findings_runtime: absent
D12_missed_trigger_detection: absent
D12_deployment_bridge_runtime_object: absent
D12_next_safe_action: recommended_first_slice
```

## Next safe action

Implement or spec a small owner cockpit summary that combines:

```txt
Validation Inbox health + JobObservability + workflow blockers + canon-sync ref + queue order
```

Keep it read-only until D12 finding/decision objects are explicitly designed.
