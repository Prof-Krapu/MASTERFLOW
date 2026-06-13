# HANDOFF VINCENT — PR-2/PR-3 Capability Registry + Status Taxonomy

Statut : `BACKEND WORK PACKAGE / 2026-06-13`

## Objectif

Preparer les deux PRs qui suivent `autonomy_step1_shell` :

1. `capability_registry_shell`
2. `status_taxonomy`

But produit : empecher MasterFlow d'afficher, annoncer ou activer une feature qui n'existe pas
vraiment dans le runtime.

## Ordre conseille

### PR-2 — Capability Registry shell

Livrer :

- table/seed `capabilities` ;
- schemas shared ;
- endpoints read-only ;
- diagnostics admin+ ;
- mapping minimal des actions existantes ;
- tests permission/UI status.

### PR-3 — Status Taxonomy

Livrer :

- enums partages ;
- mapping canon/runtime/UI ;
- migration ou seed update ;
- validation qu'un `runtime_live` exige endpoint + test + recette ;
- tests de mapping.

## Interdits

- pas d'activation massive de features ;
- pas de statut `live` sans endpoint reel ;
- pas de bouton UI actionable sans capability live ;
- pas de refactor global ;
- pas de changement de permissions non demande ;
- pas de suppression des statuts legacy sans mapping.

## Documents de reference

- `SPEC_CAPABILITY_REGISTRY.md`
- `SPEC_STATUS_TAXONOMY.md`
- `RECETTE_CAPABILITY_STATUS.md`
- `MATRICE_FEATURES_VS_FONDATIONS_MASTERFLOW.md`

## Sortie attendue

Soit :

```text
diff exact PR-2
diff exact PR-3
ordre confirme ou corrige
risques
tests
```

Soit deux branches courtes, une par PR.

