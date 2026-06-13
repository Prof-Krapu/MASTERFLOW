# SPEC — PR-C4 Calibration et contrôle qualité

Statut : `FOUNDATION IMPLEMENTED / INTERNAL ONLY / REVIEW REQUIRED / 2026-06-13`

## Objectif

Observer la cohérence d'une cohorte de pré-corrections et préparer une relecture ciblée sans
modifier les scores brouillons, forcer une moyenne ou créer une note finale.

```text
scores brouillons PR-C3
-> statistiques sur l'échelle institutionnelle
-> position par rapport à la bande attendue
-> delta diagnostic borné vers le bord de bande
-> détection des seuils protégés potentiellement franchis
-> échantillon de contrôle qualité
-> review professeur obligatoire
```

## Sources canon

- `04_ENGINES/CORRECTOR_QUALITY_CONTROL_AND_SAMPLE_REVIEW_SYSTEM.md` ;
- `04_ENGINES/CORRECTOR_RUNTIME_AND_FEEDBACK_ENGINE.md` ;
- `04_ENGINES/BATCH_CORRECTION_AND_REVIEW_PIPELINE_SYSTEM.md` ;
- `DECISION_ABSORPTION_CORRECTOR_ET_CALIBRATION_INSTITUTIONNELLE.md`.

## Diagnostic

`CohortCalibrationReview` conserve :

- nombre de brouillons observés ;
- échelle et bande institutionnelles versionnées ;
- version de la méthode statistique ;
- moyenne, médiane, minimum, maximum et écart-type des scores bruts ;
- position `insufficient_data`, `below`, `within` ou `above expected band` ;
- delta diagnostic candidat, borné par `max_global_delta` ;
- nombre de copies qui franchiraient un seuil protégé ;
- alertes et références vers l'échantillon de review.

Moins de trois brouillons produit `insufficient_data` et aucun delta.

Le delta ne vise que le bord le plus proche de la bande, jamais son centre. Il n'est appliqué à
aucun score et son statut reste `review_required`.

## Échantillonnage

`QualityReviewItem` priorise sans profilage durable :

- brouillon le plus haut ;
- brouillon le plus faible ;
- proximité d'un seuil protégé ;
- écart statistique ;
- confiance moyenne faible.

Un item référence une submission et un run privés. Il ne contient ni nom d'étudiant, ni
étiquette de niveau durable, ni verdict.

## Permissions et audit

- création et lecture : teacher owner, admin/godmode en supervision ;
- aucune route publique ;
- aucune donnée individuelle dans l'audit ;
- profil institutionnel validé et scope cohérent obligatoires ;
- taille d'échantillon bornée entre 3 et 20.

## Hors scope

- application du delta ;
- note finale ;
- validation automatique d'une cohorte ;
- feedback étudiant ;
- export ;
- règle spécifique à une discipline ou un sujet ;
- UI.

## Suite

PR-C5 pourra préparer feedbacks et exports à partir de décisions professeur distinctes. Elle ne
devra jamais interpréter ce diagnostic comme une validation des scores.
