# HANDOFF VINCENT — PR-8 Jobs / Queues / Runners

Statut : `HANDOFF BACKEND / 2026-06-13`

## Objectif

Livrer le shell jobs qui encadre les operations longues MasterFlow : RAG indexing, exports,
assets, OCR, correction, imports et generation.

Le but n'est pas de brancher tous les runners. Le but est de fournir une base observable,
annulable, scopee et auditable.

## Reference

- `SPEC_JOBS_QUEUES_RUNNERS.md`
- `POLITIQUE_VALIDATION_GRADUEE.md`
- `SPEC_PROJECT_SCOPE_OWNERSHIP.md`
- `SPEC_STATUS_TAXONOMY.md`
- `HANDOFF_VINCENT_PR7_RAG_PERMISSIONNE.md`

## Perimetre PR-8

Livrer uniquement :

- table `jobs` ;
- table `job_events` ;
- statuts jobs partages ;
- routes lecture/cancel/retry ;
- progress monotone ;
- rattachement owner/scope ;
- audit cancel/retry ;
- premier connecteur interne pour reindex RAG si PR-7 existe.

Ne pas livrer encore :

- worker externe complexe ;
- scheduler distribue ;
- generation assets complete ;
- OCR/correction complete ;
- exports publics ;
- runner appele directement par l'UI sans gate.

## Regle cle

L'UI ne lance jamais un runner brut. Elle cree ou suit une intention gatee :

```text
permission_check
preflight si sensible
validation si necessaire
job cree
runner interne execute
events/progress publies
resultat rattache owner/scope
```

## Types de jobs initiaux

Commencer par une allowlist courte :

```text
rag_reindex
resource_revoke
export_prepare
asset_prepare
ocr_prepare
correction_prepare
```

Les types non implementes restent absents ou `future` dans le registry.

## Acceptation

La PR est acceptee si les tests prouvent :

- owner voit ses jobs ;
- non-owner bloque ;
- cancel fonctionne et trace ;
- retry fonctionne seulement si autorise ;
- progress ne recule pas ;
- job sensible exige les gates prevus ;
- les resultats ne fuitent pas hors scope.

La PR est refusee si elle transforme les jobs en bouton magique : lancer, oublier, et decouvrir
apres coup ce que le systeme a fait.
