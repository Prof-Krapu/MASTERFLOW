# SPEC — Observabilite workflow

Statut : `FOUNDATION SPEC / 2026-06-13`

## Objectif

Observer les workflows MasterFlow, pas seulement les tokens.

## Evenements a tracer

```text
workflow_started
workflow_step_completed
workflow_blocked
workflow_failed
workflow_completed
validation_requested
validation_approved
validation_rejected
job_queued
job_failed
resource_missing
permission_denied
```

## Dimensions

```text
workflow_type
capability_id
owner_id
project_id nullable
room_id nullable
duration_ms
cost_eur nullable
tokens nullable
status
blocker_category nullable
```

## Metrics utiles

- cout par workflow ;
- latence p50/p95 ;
- taux completion ;
- points de friction ;
- validations demandees/refusees ;
- erreurs par capability ;
- jobs bloques ;
- usage par role.

## Endpoints PR-1

| Endpoint | Permission | Effet |
|---|---|---|
| `GET /diagnostics/workflows` | admin+ | agrégats |
| `GET /diagnostics/workflows/:id` | admin+ | detail trace |

## Tests minimum

- admin only ;
- agregats stables ;
- pas de contenu personnel brut ;
- cout nullable ;
- filtres par periode/capability.

