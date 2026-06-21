# Clôture publiée R2 — D05 sujet vers D06 fiche de correction

## Preuve GitHub

| Tranche | PR | Merge `main` | Statut |
|---|---:|---|---|
| R2.1 sujet privé versionné — backend | #95 | `130bfea` | publié |
| R2.1 Teaching sujets | #96 | `ee3fbd8` | publié |
| R2.2 assignment scoped — backend | #97 | `e38c204` | publié |
| R2.2 Teaching assignment | #98 | `9e09427` | publié |
| R2.3 fiche autosynchronisée | #99 | `2335ffa` | publié |
| R2.4 paramètres sujet→fiche | #100 | `4f04c0a` | publié |
| R2.5 diff de fiche | #101 | `977e870` | publié |
| R2.6 édition professeur isolée | #102 | `4f99268` | publié |

`main`, `origin/main` et l'API GitHub pointent sur `4f99268c046c5d8290dad4d54a69c55d604f2073`
au moment de cette clôture. Cet état est GitHub publié, pas une preuve d'instance live.

## Chaîne réellement disponible

```txt
sujet privé versionné et validé
  → assignment cohorte avec snapshot immuable
  → fiche de correction brouillon automatique
  → paramètres pédagogiques dérivés
  → diff explicite lors d'une nouvelle version
  → revue et validation professeur
```

## Invariants maintenus

- sujet ≠ fiche finale ; fiche brouillon ≠ note ; synchronisation ≠ publication ;
- les champs/verrous professeur ne sont jamais écrasés ;
- le diff est informatif, sans validation automatique ;
- aucune copie, note, score, job, runner, provider, export ou publication n'est ouvert par R2.

## Écart restant

R1.5 demeure fermé : exécuter une pré-correction toucherait des données étudiantes et nécessite une
décision séparée sur provider, consentement et runtime live. La prochaine vague sûre est donc D08
manifest-first ou un audit D07, jamais le runner de correction.
