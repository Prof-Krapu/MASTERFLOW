# SPEC — PR-C9 Heartbeats internes des runners

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO PUBLIC ROUTE / 2026-06-13`

## Objectif

Rendre les runners techniques observables avant activation réelle : identité, famille, types de
jobs acceptés, statut, job actif et fraîcheur du dernier ping.

```text
runner démarre
-> recordRunnerHeartbeat
-> claimNextJob si online/frais/compatible
-> updateJobProgress + extendJobLease
-> heartbeat régulier avec active_job_id
-> draining/offline avant arrêt
```

## Table `runner_heartbeats`

- `runner_id` : identifiant stable du runner ;
- `runner_family` : famille technique (`ocr_multimodal`, `export`, `correction`, etc.) ;
- `job_types_json` : types de jobs acceptés ;
- `status` : `online`, `draining`, `offline` ;
- `active_job_id` : job en cours si connu ;
- `version` : version runner ;
- `host_ref` : référence infra sobre, sans secret ;
- `lease_ms` : durée de lease annoncée ;
- `last_seen_at` : timestamp du heartbeat ;
- `updated_at` : timestamp d'écriture serveur.

## API interne

### `recordRunnerHeartbeat(input)`

Upsert le heartbeat d'un runner et audite une ligne sobre :

- runner id ;
- status ;
- active job id ;
- job types.

Le host, les secrets et les contenus métier ne sont pas copiés dans l'audit.

### `listRunnerHeartbeats()`

Liste interne complète pour supervision backend/admin future.

### `listClaimableRunnerHeartbeats(job_type, now?, stale_ms?)`

Retourne uniquement les runners :

- `online` ;
- vus récemment ;
- compatibles avec le type de job demandé.

`draining` reste visible mais ne doit pas prendre de nouveaux jobs. `offline` sert aux arrêts
propres ou maintenance.

## Protections

- aucune route publique ;
- heartbeat interne seulement ;
- refus des payloads contenant des libellés de secrets ;
- active job réel si renseigné ;
- aucun token, host secret, contenu OCR, feedback, export ou résultat métier dans l'audit.

## Couplage avec PR-C8

Le scheduler runner côté Vincent doit :

1. envoyer un heartbeat `online` ;
2. vérifier qu'il est claimable ;
3. appeler `claimNextJob` ;
4. continuer les heartbeats avec `active_job_id` ;
5. prolonger le lease pendant les traitements longs ;
6. passer `draining`, puis `offline`, avant arrêt volontaire.

## Tests verrouillés

- upsert heartbeat ;
- filtrage online/frais/job type ;
- exclusion stale/draining/mauvais type ;
- refus des secrets ;
- colonnes BDD présentes ;
- audit sobre.
