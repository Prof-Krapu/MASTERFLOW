# R2.5 — Diff lisible de fiche de correction

## Intention

Quand une fiche est synchronisée vers une nouvelle version du sujet, montrer au professeur les
champs dérivés qui ont réellement changé avant sa validation.

## Source canon

- D06 `Correction Sheet Autosync` : divergence majeure → `needs_teacher_review`.
- D06 `UI / Experience` : `criteria diff widget` et `subject sheet sync badge`.

## Contrat

- comparer la fiche courante à la version précédente du même assignment ;
- exposer uniquement les noms des champs dérivés différents ;
- ne modifier aucun champ professeur, statut ou décision ;
- laisser la validation entièrement au professeur.

## Exclusions

Pas de qualification automatique de gravité, pas d'acceptation automatique, pas de note, de
publication, de job, de provider ou de migration live.

## Succès

Une modification de mission apparaît comme `mission`; une fiche initiale annonce zéro divergence.
Risque faible : calcul read-only sur snapshots privés existants.
