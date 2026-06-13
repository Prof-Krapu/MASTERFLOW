# SPEC — PR-C0 Dépréciation non destructive de Corrector

Statut : `IMPLEMENTED / HISTORICAL READ COMPATIBLE / 2026-06-13`

## Décision

`corrector-001` n'est plus un persona sélectionnable.

Les capacités de correction restent destinées au Corrector Runtime, aux rubriques, aux jobs,
aux contrôles qualité et à la validation professeur. Cette migration retire uniquement
l'ancienne confusion entre persona, méthode, moteur et autorité de notation.

## Comportement livré

- la rangée `corrector-001` reste en base avec `status=deprecated` ;
- le seed migre aussi les bases déjà existantes ;
- les listes de personas disponibles ne renvoient que `status=active` ;
- le détail historique de Corrector reste lisible ;
- un nouveau blend ne peut plus utiliser Corrector comme primaire ou secondaire ;
- l'activation directe retourne `persona_deprecated` ;
- les anciens blends restent relisibles avec leur attribution historique ;
- les permissions déclarent explicitement :
  - `can_be_primary=false` ;
  - `can_blend=false` ;
  - `can_lend_method=false` ;
  - `grants_permissions=false` ;
  - `scoring_authority=false` ;
  - `historical_read_only=true`.

## Invariants

- aucune suppression physique ;
- aucune rupture de clé étrangère ;
- aucune feature OCR, scoring, feedback, calibration ou export supprimée ;
- aucune autorité de notation déduite d'un persona ;
- aucune méthode historique ne devient une permission ;
- le professeur reste l'autorité sur la décision finale.

## Suite

Un futur `corrector_method_profile` peut reprendre les heuristiques utiles après audit, comme
profil de méthode versionné et non autoritaire. Il ne doit pas réactiver le persona déprécié.

PR-C1 peut maintenant poser rubriques, profils institutionnels, batches et manifests sans
dépendre d'un persona Corrector.
