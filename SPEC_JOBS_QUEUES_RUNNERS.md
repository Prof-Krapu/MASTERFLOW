# SPEC — Jobs / Queues / Runners

Statut : `FOUNDATION SPEC / 2026-06-13`

## Objectif

Encadrer les operations longues : RAG indexing, exports, assets, OCR, correction, imports,
generation.

## Objets

### `jobs`

```text
id
type
status
owner_id
scope_type
scope_id
risk_level
payload_json
result_json nullable
error nullable
progress
created_at
updated_at
```

Status :

```text
queued | running | needs_review | completed | failed | cancelled | expired
```

### `job_events`

```text
id
job_id
event_type
detail_json
created_at
```

## Regles

- job sensible cree apres preflight ;
- job critique exige validation ;
- cancel/retry traces ;
- logs sobres ;
- resultats rattaches owner/scope ;
- runner externe jamais direct depuis UI.

## Endpoints PR-1

| Endpoint | Permission | Effet |
|---|---|---|
| `GET /jobs` | owner/admin | liste |
| `GET /jobs/:id` | owner/admin | detail |
| `POST /jobs/:id/cancel` | owner/admin | cancel |
| `POST /jobs/:id/retry` | owner/admin | retry si autorise |

## Tests minimum

- owner voit ses jobs ;
- non-owner refuse ;
- cancel running ;
- retry failed ;
- progress monotone ;
- audit events.

