# SPEC — PR-C7 Lifecycle interne des runners jobs

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / NO PUBLIC ROUTE / 2026-06-13`

## Objectif

Donner aux runners backend une fin de cycle contrôlée pour les jobs déjà créés par les services
internes, sans exposer de mutation HTTP et sans écriture directe dans les tables.

```text
queued
-> running via updateJobProgress
-> needs_review | completed | failed via API interne runner-only
```

## API interne

### `updateJobProgress(job_id, progress)`

- démarre le job si nécessaire ;
- impose une progression monotone ;
- refuse tout job non `queued/running`.

### `markJobNeedsReview(job_id, result, review_reason)`

- réservé aux sorties devant être relues humainement ;
- accepte seulement un job `queued/running` ;
- force `progress = 100` ;
- écrit `result_json` ;
- trace `job_needs_review` ;
- audit sobre par refs.

### `completeJob(job_id, result)`

- clôture seulement les traitements sans review humaine supplémentaire ;
- accepte seulement un job `queued/running` ;
- force `progress = 100` ;
- écrit `result_json` ;
- trace `job_completed`.

### `failJob(job_id, error, detail?)`

- clôture en erreur lisible ;
- accepte seulement un job `queued/running` ;
- trace `job_failed` ;
- conserve l'historique pour `retry`.

## Protections

- aucune route publique ;
- pas de création de job libre ;
- pas d'écriture directe table par runner ;
- payloads/resultats/details refusés si clé ou libellé de secret ;
- cancel/retry restent dans le service existant ;
- `cancelled`, `completed`, `failed`, `needs_review` ne sont pas finalisables à nouveau.

## Règle correction/export

- `ocr_prepare`, `correction_prepare`, `export_prepare` sensibles doivent préférer
  `markJobNeedsReview` ;
- `completed` est réservé aux jobs réellement non sensibles ou aux futures étapes internes dont
  la validation humaine a déjà été traitée ailleurs ;
- `export_prepare` ne publie jamais : il produit un artefact privé à reviewer.

## Tests verrouillés

- progression vers `needs_review` ;
- completion interne ;
- failed puis retry ;
- refus après cancel ;
- refus des secrets dans result/error/detail ;
- events sobres et ordonnés.
