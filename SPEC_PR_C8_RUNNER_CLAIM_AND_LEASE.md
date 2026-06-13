# SPEC — PR-C8 Claim et lease internes des runners

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO PUBLIC ROUTE / 2026-06-13`

## Objectif

Empêcher deux runners de consommer le même job et rendre l'attribution observable sans ajouter de
broker externe.

```text
queued
-> claimNextJob(runner_id, types)
-> running + runner_id + lease
-> extendJobLease si traitement long
-> updateJobProgress
-> markJobNeedsReview | completeJob | failJob avec le même runner_id
```

## Colonnes jobs

- `runner_id` : runner actuellement détenteur du job ;
- `claimed_at` : date de prise en charge ;
- `lease_expires_at` : expiration du bail d'exécution.

Ces colonnes sont nullable et ajoutées en migration idempotente par `ALTER TABLE` si absentes.

## API interne

### `claimNextJob(runner_id, types, lease_ms?, now?)`

- exige un `runner_id` non vide ;
- exige au moins un type de job valide ;
- prend le plus ancien job `queued` du type demandé ;
- peut reprendre un job `running` uniquement si `lease_expires_at` est expiré ;
- passe le job en `running` ;
- écrit `runner_id`, `claimed_at`, `lease_expires_at` ;
- trace via event existant `job_started` avec détail `claim: true`.

### `extendJobLease(job_id, runner_id, lease_ms?, now?)`

- exige que le job soit `running` ;
- exige le même `runner_id` ;
- refuse un lease expiré ;
- prolonge `lease_expires_at` ;
- trace via event existant `job_progress` avec détail `lease_extended: true`.

## Couplage avec PR-C7

Les transitions suivantes acceptent maintenant un `runner_id` optionnel :

- `updateJobProgress(job_id, progress, runner_id?)` ;
- `markJobNeedsReview(job_id, result, review_reason, runner_id?)` ;
- `completeJob(job_id, result, runner_id?)` ;
- `failJob(job_id, error, detail?, runner_id?)`.

Si `runner_id` est fourni, il doit correspondre au détenteur du lease actif. Les tests existants
restent compatibles pour les appels internes historiques, mais les futurs runners doivent fournir
leur `runner_id`.

## Protections

- aucune route publique ;
- pas d'event type nouveau, pour rester compatible avec les anciennes contraintes SQLite ;
- pas d'écriture directe table par runner ;
- lease maximum borné à une heure ;
- retry nettoie `runner_id`, `claimed_at` et `lease_expires_at` ;
- finalisation/cancel nettoie `lease_expires_at`.

## Tests verrouillés

- claim du plus ancien job ;
- runner concurrent ne reprend pas un lease actif ;
- reprise possible après expiration ;
- extension refusée au mauvais runner ;
- progress/finalisation refusés au mauvais runner ;
- finalisation nettoie l'expiration du lease.
