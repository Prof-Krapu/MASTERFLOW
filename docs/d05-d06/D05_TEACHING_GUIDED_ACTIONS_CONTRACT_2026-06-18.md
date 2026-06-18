# D05 Teaching Guided Actions Contract — 2026-06-18

Status: `IMPLEMENTED_LOCALLY_BOUNDED_D05`

## Intention produit

Permettre au professeur de conduire un sujet guidé structuré depuis Teaching sans transformer
Teaching en chat générique ni déclencher un processus D06.

## Canon

- `05_UI_RUNTIME_CONTRACTS/D05_D06_VERTICAL_UI_RUNTIME_CONTRACT.md`
- `08_ROADMAP/FIRST_VERTICAL_PRODUCT_PROOF_D05_D06.md`
- `08_ROADMAP/D05_D06_UI_RUNTIME_MAPPING_NEXT_STEPS.md`

## Périmètre autorisé

```txt
guide validé
-> consentement visible
-> session privée Room/projet
-> question structurée
-> contribution tracée
-> progression / manques / contradictions
-> fin de session sans effet externe
```

## Hors périmètre

- création ou édition de guide ;
- invitation/participation élève depuis Teaching ;
- correction, feedback, note ou appréciation ;
- upload, export ou envoi étudiant ;
- génération LLM automatique ;
- publication ou écriture canon.

## Critère de succès

Un professeur peut démarrer un guide validé, répondre question par question et terminer le record
structuré. Chaque permission, consentement et validation de schéma reste contrôlé par le backend
Guided Runtime existant.

## Recette

- vraie session projet : 0 → 100 % → `completed` ;
- aucun feedback draft, export preview ou job créé ;
- aucune session active orpheline ;
- audit final `external_effects: []` ;
- backend 302/302, TypeScript backend/frontend, build Vite et responsive 390 px OK.
