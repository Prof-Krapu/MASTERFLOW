# SPEC — PR-C11 Gates famille/type runner

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO PUBLIC ROUTE / 2026-06-13`

## Objectif

Empêcher un runner de claim un type de job compatible en apparence mais incohérent avec sa
famille technique.

PR-C10 impose un heartbeat valide. PR-C11 ajoute la cohérence :

```text
runner_family + job_types déclarés
-> claimNextJob
-> vérification job_type -> runner_family attendue
-> claim ou refus
```

## Mapping actuel

| Job type | Runner family attendue |
|---|---|
| `ocr_prepare` | `ocr_multimodal` |
| `correction_prepare` | `correction` |
| `export_prepare` | `export` |
| `asset_prepare` | `asset` |
| `rag_reindex` | `rag` |
| `resource_revoke` | `resource` |

Un runner qui demande plusieurs types doit rester dans une seule famille. Les runners
multi-familles devront passer par un orchestrateur explicite dans une future couche, pas par un
heartbeat ambigu.

## Erreur ajoutée

- `runner_family_not_allowed` : la famille du heartbeat ne correspond pas au type demandé, ou
  les types demandés mélangent plusieurs familles.

## Invariants

- aucune route publique ;
- aucun droit utilisateur déduit du runner ;
- `job_types` ne suffit pas : la famille compte aussi ;
- OCR reste aligné avec les adapters `runner_family = ocr_multimodal` ;
- correction/export ne peuvent pas être absorbés par un runner générique non déclaré.

## Tests verrouillés

- les claims asset exigent un runner family `asset` ;
- un runner `ocr_multimodal` qui déclare `asset_prepare` est refusé ;
- les gates PR-C10 restent actifs : inconnu, draining, stale, mauvais type.
