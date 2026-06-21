# R2.6 — Édition sûre des champs professeur

## Diagnostic

La première surface R2.3 utilisait un même brouillon local pour toutes les fiches affichées. Une
édition sur plusieurs assignments pouvait donc réutiliser la mauvaise valeur ou enregistrer un
champ vide à la place d'une valeur professeur existante.

## Contrat correctif

- un brouillon d'édition distinct par fiche ;
- initialisation depuis les champs professeur persistés ;
- conservation des champs non édités et des verrous existants ;
- ajout explicite du verrou `evaluation_mode` lors de l'enregistrement ;
- aucune mutation avant clic professeur.

## Limites

Correction frontend privée uniquement. Aucun changement de permission, note, publication, job,
provider, donnée live ou contrat de synchronisation.

## Succès

Modifier la fiche A ne change pas le formulaire de la fiche B et enregistrer une fiche conserve
ses autres champs et verrous.
