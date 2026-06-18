# D08 Locked Manifest-First Sequence — 2026-06-18

Status: `LOCKED_SEQUENCE_NON_RUNTIME_REFRESHED_POST_PR5`

This document keeps D08 useful without opening unsafe visual generation.

## Canon baseline

D08 must be:

```txt
manifest-first before provider-first
```

Generated visual output is always a candidate until reviewed.

Canon Drive source checked: `05_UI_RUNTIME_CONTRACTS/D08_VISUAL_MANIFEST_RUNTIME_CONTRACT.md`.

Canonical D08 flow:

```txt
visual_intent
-> room_context_card
-> visual_manifest
-> reference_status_board
-> da_resolution
-> output_readiness
-> action_ready_preflight
-> provider_handoff_candidate
-> generated_asset_candidate
-> post_generation_da_report
-> validation_inbox
-> candidate_delta_or_no_canonization
```

This GitHub document is a lock, not a runtime greenlight.

## Current GitHub evidence

| Capability | Status | Evidence | Interpretation |
|---|---|---|---|
| `asset_manifest` schema template domain | present | `schema_templates`, shared schema domain | Manifest concepts can be represented. |
| `asset_prepare` job type | present | `jobs.ts`, `JobTypeSchema` | Generic asset job exists. |
| image runner | scaffolded | `apps/backend/src/runners/image_runner.ts` | Runner path exists but must remain gated. |
| `image_generation` task profile | present | task model profiles | Routing support exists, not a product greenlight. |
| visual personas config | partial | `personas.visual_config_json` | Visual hints only, not canon asset runtime. |
| generated asset persistence | absent | no generated asset table found | Cannot claim asset lifecycle. |
| immutable generation context | absent | no context snapshot table found | Cannot safely review/canonize generated outputs. |
| asset routes | future/absent | registry mentions `/assets`, no router found | No active D08 surface. |
| storage for generated files | absent | storage refs only | Provider outputs cannot be safely persisted as assets yet. |
| Validation Inbox review for D08 | absent/indirect | generic `asset` mapping only | D08 review contract is not implemented. |
| post-generation DA report | absent | no D08 report object found | Generated output cannot be audited as canon candidate yet. |

## Locked rule

Do not expose generation as an active product feature until all are true:

```txt
visual_manifest persisted
reference statuses persisted
immutable generation context persisted
private storage exists
generated asset candidate lifecycle exists
review through Validation Inbox exists
post-generation DA report exists
```

## Safe sequence

### Step 1 — manifest-only read model

Allow a user/admin to prepare:

- intent;
- canon entity refs;
- output family;
- reference statuses;
- semantic fit expectations;
- continuity vector;
- output readiness.

No provider call.

Status: `recommended_first_D08_slice`

### Step 2 — output family registry

Add product vocabulary for:

- visual_retake;
- visual_diagnostic;
- event_spread;
- badge_reward;
- medal_reward;
- trophy_reward;
- generated_asset_candidate.

Status: `needs_product_validation`

### Step 3 — manufacturing readiness strip

For badge/medal/trophy:

- safe zone;
- frame;
- topper;
- attachment points;
- layers;
- engraving/cut constraints;
- readable size.

Status: `candidate_locked`

### Step 4 — generated asset candidate lifecycle

Only after storage/context snapshots exist.

Status: `blocked_by_storage_and_review_model`

### Step 5 — provider handoff

Only after Action Ready + Validation Inbox + storage + review.

Status: `blocked`

## Current queue decision

This low-risk queue may do only:

- audit/spec updates;
- manifest/readiness vocabulary;
- read-only mapping;
- queue/ledger entries.

It may not do:

- provider call;
- ComfyUI/OpenRouter image generation;
- generated asset persistence;
- public export;
- canonization of an image;
- badge/medal/trophy manufacturing runtime.

## User-feedback candidates routed here

- `CONTINUITY_VECTOR`
- `SEMANTIC_FIT_GATE`
- `BADGE_OUTPUT_SYSTEM`
- `MANUFACTURING_READINESS_STRIP`

These are candidates, not canon locks.

## What not to do

- Do not treat beautiful image output as canon.
- Do not expose a “generate” button before manifest/action-ready gates.
- Do not store provider output as truth without provenance.
- Do not let factories bypass D08 review.
- Do not merge badge/manufacturing logic into generic image generation.

## Canon status recommendation

```yaml
D08_product_contract: ready
D08_manifest_first_sequence: ready_for_spec
D08_manifest_read_model: next_safe_artifact
D08_provider_runtime: locked
D08_generated_asset_runtime: absent
D08_storage: absent
D08_review_via_validation_inbox: pending
D08_post_generation_da_report: absent
D08_badge_output_system: candidate_locked
```

## Next safe action

Do not implement generation.

If D08 is touched next, produce `D08_MANIFEST_READ_MODEL_SPEC` before code.

That spec must define the read-only manifest fields, reference status board, Action Ready gates,
Validation Inbox handoff shape and the exact reasons generation remains blocked.
