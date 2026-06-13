# SPEC — PR-C2 Ingestion OCR et Jobs Shell

Statut : `FOUNDATION IMPLEMENTED / RUNNER NOT CONNECTED / 2026-06-13`

## Objectif

Encadrer les futures opérations OCR longues sans exposer le runner à l'UI et sans stocker de
fichier ou secret dans un payload de job.

```text
permission
-> adapter autorisé
-> preflight référencé
-> manifest ou consentement selon usage
-> job ocr_prepare
-> events/progress
-> futur runner interne
-> future review
```

## Création

La création d'un job OCR est uniquement disponible via le service interne
`createOcrPrepareJob`. Il n'existe aucun `POST /jobs`.

Deux adapters sont acceptés :

### Copie pédagogique

```text
ocr-submission-v1
preflight_ref obligatoire
pre_correction manifest obligatoire
teacher minimum
```

### Référence morphologique

```text
morphological-reference-v1
preflight_ref obligatoire
consent_ref obligatoire
owner = utilisateur concerné sauf supervision admin
```

Le payload contient seulement des références `storage://`, jamais les octets du document.

## Jobs

Statuts :

```text
queued | running | needs_review | completed | failed | cancelled | expired
```

Règles :

- owner et scope obligatoires ;
- type allowlisté ;
- payload rejeté si motif de secret manifeste ;
- progression entière entre 0 et 100 ;
- progression monotone, sauf reset explicite lors d'un retry ;
- cancel réservé aux états `queued`, `running`, `needs_review` ;
- retry réservé à `failed` ;
- historique des events conservé ;
- owner voit ses jobs ; admin/godmode supervise ; non-owner reçoit 404 anti-énumération.

## Routes

```text
GET  /api/v1/jobs
GET  /api/v1/jobs/:id
GET  /api/v1/jobs/:id/events
POST /api/v1/jobs/:id/cancel
POST /api/v1/jobs/:id/retry
```

Ces routes suivent et pilotent le cycle de vie. Elles ne créent pas un job et n'appellent aucun
runner.

## État réel

- contrats partagés : livrés ;
- tables `jobs` / `job_events` : livrées ;
- service `ocr_prepare` : livré ;
- lecture/cancel/retry : livrés ;
- runner OCR multimodal : non branché ;
- upload/storage privé : non livré ;
- extraction/identification : non livrée ;
- websocket progress : non livré.

Un job `queued` signifie « intention vérifiée en attente », jamais « OCR disponible ».

## Suite Vincent

Le runner issu de ses projets doit :

1. consommer uniquement un job `ocr_prepare` autorisé ;
2. charger la source privée via `source_ref` ;
3. publier une progression monotone ;
4. produire une sortie candidate conforme à l'adapter ;
5. passer en `needs_review` avant toute promotion ;
6. ne jamais écrire note finale, canon avatar ou donnée publique.
