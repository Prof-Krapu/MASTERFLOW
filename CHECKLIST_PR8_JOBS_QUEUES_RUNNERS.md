# CHECKLIST PR-8 — Jobs / Queues / Runners

Statut : `BACKEND CHECKLIST / 2026-06-13`

## Intention

Encadrer toutes les operations longues ou couteuses sans exposer directement les runners a l'UI.

## Tables / migrations

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
started_at nullable
completed_at nullable
cancelled_at nullable
```

### `job_events`

```text
id
job_id
event_type
detail_json
created_at
```

## Status jobs

```text
queued | running | needs_review | completed | failed | cancelled | expired
```

## Types initiaux allowlist

```text
rag_reindex
resource_revoke
export_prepare
asset_prepare
ocr_prepare
correction_prepare
```

Les types `*_prepare` ne doivent pas promettre que la verticale complete est livree.

## Contrats partages

Exposer ou ajouter :

- `Job`
- `JobEvent`
- `JobStatus`
- `JobType`
- `JobProgress`
- `CreateJobRequest` si creation exposee cote API ;
- `RetryJobRequest`
- `CancelJobRequest`

## Routes minimales

```text
GET /api/v1/jobs
GET /api/v1/jobs/:id
POST /api/v1/jobs/:id/cancel
POST /api/v1/jobs/:id/retry
```

Creation de job :

- soit route interne service-only ;
- soit `POST /api/v1/jobs` gatee par type et permission ;
- soit routes metier qui creent un job apres preflight.

Ne pas laisser une creation generique contourner les gates.

## Permissions et gates

- owner/admin : liste/detail jobs autorises ;
- non-owner : refuse sans fuite ;
- cancel : owner/admin si statut annulable ;
- retry : owner/admin si statut retryable et type autorise ;
- job sensible : preflight obligatoire ;
- job critique : validation humaine selon `POLITIQUE_VALIDATION_GRADUEE.md` ;
- diagnostics globaux : admin/godmode seulement.

## Regles runtime

- `progress` entre 0 et 100 ;
- `progress` monotone sauf reset explicite sur retry ;
- chaque changement de statut cree un `job_event` ;
- payloads sans secrets ;
- resultats rattaches a owner/scope ;
- erreurs lisibles mais pas bavardes ;
- retry cree un nouvel event et preserve l'historique.

## Tests minimum

- owner voit ses jobs ;
- non-owner ne voit pas job ni metadata ;
- cancel d'un job `running` autorise ;
- cancel d'un job `completed` refuse ;
- retry d'un job `failed` autorise si type retryable ;
- progress ne recule pas ;
- job sensible sans preflight refuse ;
- job event emis sur status change ;
- payload secret pattern refuse ou scrubbe ;
- result hors scope inaccessible.

## Refus immediat

- runner appele directement depuis UI ;
- job sans owner/scope ;
- payload contenant secret ;
- endpoint generique creant n'importe quel job ;
- progress arbitraire qui recule ;
- retry qui ecrase l'historique ;
- diagnostic visible teacher/student.
