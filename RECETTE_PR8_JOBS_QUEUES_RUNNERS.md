# RECETTE — PR-8 Jobs / Queues / Runners

Statut : `ACCEPTANCE RECIPE / 2026-06-13`

## Objectif

Verifier que MasterFlow peut suivre, annuler et relancer des operations longues sans bypasser
permissions, scopes, preflight ou validation.

## Scenarios

### J1 — Liste owner

Un owner liste ses jobs.

Attendu :

- seuls ses jobs ou jobs dans ses scopes autorises apparaissent ;
- chaque job contient type, status, progress, timestamps utiles.

### J2 — Non-owner bloque

Un non-owner tente de lire un job.

Attendu :

- 403 ou 404 anti-enumeration ;
- aucune metadata payload/result/error ne fuite.

### J3 — Cancel running

Un owner annule un job `running` annulable.

Attendu :

- status `cancelled` ;
- `cancelled_at` renseigne ;
- event `job_cancelled` emis.

### J4 — Cancel impossible

Un owner tente d'annuler un job `completed`.

Attendu :

- refus lisible ;
- status inchange ;
- event de refus si la politique d'audit le prevoit.

### J5 — Retry failed

Un owner relance un job `failed` retryable.

Attendu :

- nouveau passage `queued` ou nouveau job lie ;
- historique conserve ;
- event `job_retried` emis.

### J6 — Progress monotone

Un runner publie plusieurs updates.

Attendu :

- progress augmente ou reste stable ;
- baisse refusee sauf retry/reset explicite ;
- `updated_at` change.

### J7 — Preflight sensible

Un job `export_prepare` ou equivalent sensible est cree sans preflight.

Attendu :

- refus ;
- aucun job executable cree.

### J8 — Payload sans secret

Un payload contient token, cle privee ou credential manifeste.

Attendu :

- creation refusee ou payload scrubbe selon policy ;
- aucun secret stocke en clair.

### J9 — Result scope

Un resultat de job est rattache a un owner/scope.

Attendu :

- owner autorise peut lire ;
- non-owner bloque ;
- aucun lien public implicite.

## Anti-cas

La PR est refusee si :

- l'UI peut appeler un runner brut ;
- un job n'a pas d'owner/scope ;
- un type non allowlist passe ;
- un job sensible s'execute sans preflight ;
- retry efface l'historique ;
- les logs stockent des secrets ;
- les diagnostics globaux sont visibles hors admin/godmode.
