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
- runner backend via services internes uniquement :
  `updateJobProgress`, `markJobNeedsReview`, `completeJob`, `failJob` ;
- pas d'ecriture directe dans `jobs` / `job_events`.
- consommation runner via `claimNextJob` puis lease actif ; pas de polling SQL direct.
- heartbeat runner interne obligatoire avant claim réel.

## Lifecycle runner interne

```text
queued -> running -> needs_review
queued -> running -> completed
queued -> running -> failed -> queued via retry
```

`needs_review` est la sortie normale des traitements sensibles : OCR, correction, export,
generation d'asset ou toute action contenant des donnees privees. `completed` est reserve aux
jobs sans review humaine supplementaire ou aux futures etapes explicitement validees ailleurs.

## Claim / lease

Les runners prennent un job avec :

```text
claimNextJob(runner_id, types)
```

Le service ajoute `runner_id`, `claimed_at` et `lease_expires_at`. Un job `running` ne peut être
repris que si son lease est expiré. Les traitements longs prolongent le bail avec
`extendJobLease`. Les transitions de progression/finalisation doivent fournir le même
`runner_id`.

`claimNextJob` exige aussi un heartbeat récent, `online` et compatible avec tous les types
demandés. Un runner `draining`, `offline`, inconnu, stale ou non déclaré pour le type demandé
ne peut pas prendre de job.

La famille technique du runner doit aussi correspondre au type demandé :

```text
ocr_prepare        -> ocr_multimodal
correction_prepare -> correction
export_prepare     -> export
asset_prepare      -> asset
rag_reindex        -> rag
resource_revoke    -> resource
```

Un claim multi-type qui mélange plusieurs familles est refusé tant qu'aucun orchestrateur
multi-famille explicite n'existe.

## Heartbeats runners

Les runners déclarent leur identité et leur santé avec :

```text
recordRunnerHeartbeat(...)
```

Statuts :

```text
online | draining | offline
```

Seuls les runners `online`, frais et compatibles avec le type de job sont considérés claimables.
`draining` reste visible mais ne prend pas de nouveau job. Les heartbeats ne contiennent aucun
secret ni contenu métier.

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
