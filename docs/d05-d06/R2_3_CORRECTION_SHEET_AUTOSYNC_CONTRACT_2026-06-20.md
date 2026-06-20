# R2.3 — Contrat fiche de correction autosynchronisée

## Intention produit

Créer avec chaque assignment une fiche de correction brouillon immédiatement exploitable par le
professeur, sans confondre sujet, fiche finale, note ou publication.

## Source canon

- `03_DOMAINS/D06_CORRECTION_FEEDBACK_EVALUATION/DOMAIN_CARD.md`, section `Correction Sheet Autosync`.
- Invariants : `SUJET != FICHE FINALE`, `FICHE_BROUILLON != NOTE`, `SYNC != PUBLICATION`,
  `VALIDATION_PROF > AUTOMATION`.

## Ce qui change

- l'assignment crée automatiquement une fiche V1 depuis son snapshot de sujet ;
- les champs dérivés sont traçables et les champs professeur sont séparés ;
- une synchronisation vers une nouvelle version validée crée une nouvelle fiche append-only ;
- les champs professeur et leurs verrous sont conservés ;
- toute divergence synchronisée passe en `needs_teacher_review` ;
- la validation finale de la fiche reste une action professeur explicite.

## Ce qui ne change pas

- l'assignment historique et son snapshot ne sont pas mutés ;
- aucune note, copie, correction automatique, publication, export, job ou provider n'est créé ;
- aucune migration de données live n'est exécutée.

## Critère de succès

Un professeur peut constater la fiche V1, verrouiller ses champs, synchroniser vers un sujet V2,
retrouver ses champs inchangés, puis valider la fiche après revue. Un autre owner ne peut pas la lire.

## Risque et décision

- Risque de dérive : faible, tant que la fiche reste privée et sans score.
- Validation nécessaire : non pour code/tests privés selon le contrat marathon ; oui avant migration
  live, publication étudiante ou génération de note.
