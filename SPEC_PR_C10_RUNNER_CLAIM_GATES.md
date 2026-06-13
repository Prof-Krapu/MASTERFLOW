# SPEC — PR-C10 Gates de claim runner

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO PUBLIC ROUTE / 2026-06-13`

## Objectif

Empêcher un runner inconnu, arrêté, stale ou incompatible de prendre un job. PR-C10 ferme la
boucle PR-C8/PR-C9 : le heartbeat n'est plus seulement observable, il devient obligatoire avant
claim.

```text
recordRunnerHeartbeat(status=online, job_types=[...])
-> claimNextJob(runner_id, requested_types)
-> validation runner registered + online + fresh + compatible
-> claim ou refus explicite
```

## Règles

`claimNextJob` refuse désormais :

- `runner_not_registered` : aucun heartbeat connu ;
- `runner_not_online` : statut `draining` ou `offline` ;
- `runner_heartbeat_stale` : dernier heartbeat trop ancien ;
- `runner_job_type_not_allowed` : type demandé absent du heartbeat ;
- `runner_job_types_invalid` : heartbeat corrompu côté BDD.

Un runner qui demande plusieurs types doit les avoir tous déclarés. Cela évite qu'un runner
spécialisé OCR claim accidentellement un export ou une correction.

## Invariants

- aucune route publique ;
- aucune permission utilisateur déduite du runner ;
- heartbeat requis avant travail ;
- `draining` reste visible mais ne claim pas ;
- reprise d'un job expiré reste possible, mais uniquement par un runner heartbeat online et
  compatible ;
- finalisation PR-C7 conserve le contrôle du même `runner_id`.

## Tests verrouillés

- claim avec runners heartbeat online ;
- refus runner inconnu ;
- refus runner draining ;
- refus heartbeat stale ;
- refus type non déclaré ;
- compatibilité des leases et finalisations existantes.
