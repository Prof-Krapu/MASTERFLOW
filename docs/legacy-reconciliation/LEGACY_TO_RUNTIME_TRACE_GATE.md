# Gate de traçabilité Legacy → Canon → Runtime

## But

Empêcher qu’une idée legacy classée soit oubliée, ou qu’un runtime soit ajouté hors du canon.

## Obligatoire avant chaque nouvelle vague produit

La tranche doit citer dans son contrat :

1. la source canon Drive ;
2. une ou plusieurs preuves legacy/arbitrage, ou la mention explicite `aucune preuve legacy requise` ;
3. le statut legacy : `absorbed`, `canon_ready`, `reduced`, `restore_candidate` ou `blocked` ;
4. l’écart GitHub exact ;
5. ce que la tranche ne promeut pas.

## Règle de décision

- `canon_ready` et `restore_candidate` peuvent devenir une tranche runtime seulement après contrat explicite ;
- `reduced` reste sous son owner consolidé, jamais recréé comme application parallèle ;
- `blocked` ne peut pas être lu, importé ni activé sans droit/scope confirmé ;
- `absorbed` exige une preuve GitHub, pas une simple affirmation locale.

## Receipt obligatoire après merge

La clôture doit mettre à jour : `SUIVI.md`, matrice Canon→GitHub, deployment ledger et, si utile,
le Coverage Ledger. Elle doit distinguer publié GitHub et live vérifié.
